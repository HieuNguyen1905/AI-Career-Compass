import asyncio
import hashlib
import json
import logging
import os
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator, Iterable, Optional, Sequence

from openai import AsyncOpenAI

from agents.career_scope import (
    LLMScopeDecision,
    SafetyDetectionResult,
    SafetyResult,
    ScopeDetectionResult,
    ScopeResult,
    classify_safety as classify_career_safety,
    classify_scope_rules,
    detect_safety as detect_career_safety,
    normalize_message,
    resolve_career_entities,
)
from agents.prompts.system_prompts import (
    CAREER_ADVISOR_SYSTEM_PROMPT,
    CAREER_SCOPE_CLASSIFIER_PROMPT,
    UNIVERSITY_WEB_SEARCH_PROMPT,
    UNIVERSITY_LOOKUP_TOOL_PROMPT,
)
from agents.tools.university_lookup_tool import UniversityLookupTool
from agents.tools.university_web_retriever import (
    UniversityEvidenceVerifier,
    UniversityWebRetriever,
    env_bool,
)


logger = logging.getLogger(__name__)

CRISIS_MESSAGE = (
    "Mình chỉ hỗ trợ trong phạm vi hướng nghiệp, học tập và khám phá năng lực, nên không thể tư vấn việc này. "
    "Nếu em đang cảm thấy bế tắc, áp lực nặng hoặc gặp nguy hiểm, hãy nói chuyện ngay với một người lớn đáng tin cậy "
    "như cha mẹ, thầy cô hoặc cố vấn tâm lý của trường. Trường hợp khẩn cấp cần can thiệp ngay: gọi 113 hoặc 115."
)

HARMFUL_REQUEST_MESSAGE = (
    "Mình không thể hỗ trợ các yêu cầu có thể gây hại, vi phạm pháp luật hoặc làm tổn thương người khác. "
    "Nếu em đang tò mò về một chủ đề nhạy cảm vì mục tiêu học tập hay nghề nghiệp, hãy hỏi theo hướng an toàn hơn, "
    "ví dụ như đạo đức nghề nghiệp, an toàn số, phòng tránh rủi ro hoặc kỹ năng bảo vệ bản thân."
)

OUT_OF_SCOPE_MESSAGE = (
    "Mình chỉ hỗ trợ các câu hỏi về hướng nghiệp, học tập, chọn ngành, chọn trường, "
    "điểm chuẩn, học phí và lộ trình phát triển nghề. Câu hỏi này nằm ngoài phạm vi "
    "của AI Career Coach nên mình sẽ không phân tích thêm.\n\n"
    "Em có thể hỏi mình về ngành nghề phù hợp, trường nên cân nhắc, môn học cần chuẩn bị "
    "hoặc kế hoạch học tập."
)


@dataclass
class AdvisorPreparation:
    early_response: str | None = None
    resolved_careers: list = field(default_factory=list)
    inferred_intent: str | None = None
    resolved_topics: list[str] = field(default_factory=list)
    safety: SafetyDetectionResult | None = None
    rule_scope: ScopeDetectionResult | None = None
    llm_scope: LLMScopeDecision | None = None

    @property
    def should_continue(self) -> bool:
        return self.early_response is None


class AdvisorAgent:
    def __init__(self):
        self._model = None
        self._api_key = None
        self.university_lookup_tool = UniversityLookupTool()
        self.university_web_retriever = UniversityWebRetriever()
        self.university_evidence_verifier = UniversityEvidenceVerifier()

    @property
    def model(self):
        if self._model is None:
            self._model = os.getenv("OPENAI_MODEL", os.getenv("DEFAULT_MODEL", "gpt-4o-mini"))
        return self._model

    @property
    def web_search_model(self):
        return os.getenv("OPENAI_WEB_SEARCH_MODEL", "gpt-5-search-api")

    @property
    def web_search_enabled(self) -> bool:
        return os.getenv("OPENAI_WEB_SEARCH_ENABLED", "true").lower() not in ("0", "false", "no")

    @property
    def university_crawl_enabled(self) -> bool:
        return env_bool("UNIVERSITY_CRAWL_ENABLED", True)

    @property
    def api_key(self):
        if self._api_key is None:
            self._api_key = os.getenv("OPENAI_API_KEY", "")
        return self._api_key or None

    @property
    def temperature(self) -> float:
        try:
            return float(os.getenv("OPENAI_TEMPERATURE", "0.4"))
        except ValueError:
            return 0.4

    @property
    def max_tokens(self) -> int:
        try:
            return int(os.getenv("OPENAI_MAX_TOKENS", "1200"))
        except ValueError:
            return 1200

    @property
    def scope_mode(self) -> str:
        mode = os.getenv("CAREER_SCOPE_MODE", "hybrid").strip().lower()
        if mode not in {"strict", "hybrid", "off"}:
            return "hybrid"
        return mode

    @property
    def scope_model(self) -> str:
        return os.getenv("OPENAI_SCOPE_MODEL", "gpt-4o")

    @property
    def scope_confidence_threshold(self) -> float:
        try:
            threshold = float(os.getenv("OPENAI_SCOPE_CONFIDENCE_THRESHOLD", "0.85"))
        except ValueError:
            return 0.85
        return min(1.0, max(0.0, threshold))

    def _resolved_career_to_dict(self, career) -> dict:
        if hasattr(career, "model_dump"):
            data = career.model_dump()
        else:
            data = career.dict()
        source = data.get("source")
        if hasattr(source, "value"):
            data["source"] = source.value
        return data

    def _context_value(self, source, key: str, default=None):
        if source is None:
            return default
        if isinstance(source, dict):
            value = source.get(key, default)
        else:
            value = getattr(source, key, default)
        return default if value is None else value

    def _assessment_score_meaning(self, score: int) -> str:
        return {
            1: "very_low",
            2: "low",
            3: "neutral",
            4: "high",
            5: "very_high",
        }.get(score, "unknown")

    def _question_weight_signals(self, question) -> list[dict[str, Any]]:
        signals: list[dict[str, Any]] = []
        weights = question.weights.model_dump(exclude_none=True)
        for field_name in ("favoriteSubjects", "interests", "strengths", "values", "riasec"):
            values = weights.get(field_name) or []
            if values:
                signals.append({"type": field_name, "values": values[:6]})
        return signals

    def _build_assessment_context(self, profile) -> dict:
        answers = self._context_value(profile, "assessmentAnswers", {}) or {}
        if not isinstance(answers, dict):
            answers = {}

        safe_answers: dict[str, int] = {}
        for question_id, raw_score in answers.items():
            try:
                score = int(raw_score)
            except (TypeError, ValueError):
                continue
            if 1 <= score <= 5:
                safe_answers[str(question_id)] = score

        answer_details: list[dict[str, Any]] = []
        if safe_answers:
            from db.assessment_questions import assessment_questions

            for question in assessment_questions:
                score = safe_answers.get(question.id)
                if score is None:
                    continue
                answer_details.append(
                    {
                        "questionId": question.id,
                        "step": question.step,
                        "prompt": question.prompt,
                        "score": score,
                        "scoreMeaning": self._assessment_score_meaning(score),
                        "signals": self._question_weight_signals(question),
                    }
                )

        return {
            "completed": bool(self._context_value(profile, "assessmentCompleted", False)),
            "answerCount": len(safe_answers),
            "answerScale": {
                "1": "very unlike the student",
                "2": "unlike the student",
                "3": "neutral or not enough signal",
                "4": "like the student",
                "5": "very like the student",
            },
            "highSignals": [item for item in answer_details if item["score"] >= 4],
            "lowSignals": [item for item in answer_details if item["score"] <= 2],
            "answerDetails": answer_details,
        }

    def _build_profile_context(self, profile, user_context: Optional[dict] = None) -> dict | None:
        if not profile:
            return None

        grade_level = self._context_value(user_context, "gradeLevel") or self._context_value(profile, "gradeLevel")
        gender = self._context_value(user_context, "gender") or self._context_value(profile, "gender")

        return {
            "gradeLevel": grade_level,
            "gender": gender,
            "interests": self._context_value(profile, "interests", []),
            "strengths": self._context_value(profile, "strengths", []),
            "favoriteSubjects": self._context_value(profile, "favoriteSubjects", []),
            "values": self._context_value(profile, "values", []),
            "riasec": self._context_value(profile, "riasec", []),
            "goals": self._context_value(profile, "goals", ""),
            "constraints": self._context_value(profile, "constraints", ""),
            "assessmentCompleted": bool(self._context_value(profile, "assessmentCompleted", False)),
            "assessment": self._build_assessment_context(profile),
        }

    def build_context(
        self,
        profile,
        matches,
        message: str = "",
        history: Optional[list] = None,
        resolved_careers: Optional[list] = None,
        user_context: Optional[dict] = None,
        conversation_state: Optional[dict[str, Any]] = None,
    ):
        if resolved_careers is None:
            resolved_careers = self.resolve_career_entities(
                message,
                matches=matches,
                history=history,
            )
        context = {
            "profile": self._build_profile_context(profile, user_context),
            "recommendedCareers": [
                {
                    "title": match["title"],
                    "cluster": match["cluster"],
                    "score": match["score"],
                    "reasons": match["reasons"],
                    "subjects": match["subjects"],
                    "jobSkills": match["jobSkills"],
                    "majors": match["majors"],
                    "activities": match["activities"],
                    "jobTasks": match["jobTasks"],
                }
                for match in matches[:5]
            ],
            "resolvedCareers": [
                self._resolved_career_to_dict(career)
                for career in resolved_careers
            ],
        }
        university_lookup = self.university_lookup_tool.lookup(
            message,
            context,
            history,
            conversation_state=conversation_state,
        )
        if university_lookup:
            context["universityLookup"] = university_lookup
            context["conversationState"] = university_lookup.get("conversationState")
        return context

    def _normalize_message(self, message: str) -> str:
        return normalize_message(message)

    def detect_scope(
        self,
        message: str,
        career_titles: Iterable[str] | None = None,
        matches: Sequence | None = None,
        history: Optional[list] = None,
    ) -> ScopeDetectionResult:
        return classify_scope_rules(
            message,
            career_titles=career_titles,
            matches=matches,
            history=history,
        )

    def classify_scope(
        self,
        message: str,
        career_titles: Iterable[str] | None = None,
        matches: Sequence | None = None,
        history: Optional[list] = None,
    ) -> ScopeResult:
        return classify_scope_rules(
            message,
            career_titles=career_titles,
            matches=matches,
            history=history,
        ).result

    def detect_safety(self, message: str) -> SafetyDetectionResult:
        return detect_career_safety(message)

    def classify_safety(self, message: str) -> SafetyResult:
        return classify_career_safety(message)

    def resolve_career_entities(
        self,
        message: str,
        career_titles: Iterable[str] | None = None,
        matches: Sequence | None = None,
        history: Optional[list] = None,
    ):
        return resolve_career_entities(
            message,
            career_titles=career_titles,
            matches=matches,
            history=history,
        )

    def quick_guardrail_response(
        self,
        message: str,
        career_titles: Iterable[str] | None = None,
        matches: Sequence | None = None,
        history: Optional[list] = None,
        safety_result: SafetyDetectionResult | None = None,
        scope_result: ScopeDetectionResult | None = None,
    ) -> str | None:
        safety = safety_result or self.detect_safety(message)
        if safety.result == SafetyResult.CRISIS:
            return CRISIS_MESSAGE
        if safety.result == SafetyResult.HARMFUL:
            return HARMFUL_REQUEST_MESSAGE

        scope = scope_result or self.detect_scope(
            message,
            career_titles=career_titles,
            matches=matches,
            history=history,
        )
        if scope.result == ScopeResult.CLEARLY_OUT_OF_SCOPE:
            return OUT_OF_SCOPE_MESSAGE
        return None

    def is_off_topic(
        self,
        message: str,
        career_titles: Iterable[str] | None = None,
        matches: Sequence | None = None,
        history: Optional[list] = None,
    ) -> bool:
        if self.classify_safety(message) != SafetyResult.SAFE:
            return True
        return self.classify_scope(
            message,
            career_titles=career_titles,
            matches=matches,
            history=history,
        ) == ScopeResult.CLEARLY_OUT_OF_SCOPE

    def fallback_answer(self, context, note: str = None) -> str:
        if context.get("universityLookup", {}).get("isRelevant"):
            prefix = f"{note}\n\n" if note else ""
            return prefix + self.university_lookup_tool.format_fallback(context["universityLookup"])

        top_careers = context["recommendedCareers"][:3]
        prefix = f"{note}\n\n" if note else ""
        profile_context = context.get("profile") or {}
        profile_facts = []
        if profile_context.get("gradeLevel"):
            profile_facts.append(f"lớp {profile_context['gradeLevel']}")
        if profile_context.get("gender"):
            profile_facts.append(f"giới tính: {profile_context['gender']}")
        if profile_context.get("goals"):
            profile_facts.append(f"mục tiêu: {profile_context['goals']}")
        if profile_context.get("constraints"):
            profile_facts.append(f"bối cảnh cần cân nhắc: {profile_context['constraints']}")

        if not top_careers:
            return (
                f"{prefix}Mình cần thêm kết quả assessment để gợi ý sát hơn. "
                "Bước tiếp theo nên là làm assessment ngắn, ghi lại môn học em thích, kỹ năng em tự tin "
                "và điều em không muốn trong môi trường làm việc."
            )

        lines = [
            f"{prefix}Dựa trên hồ sơ hiện tại, em có thể khám phá 2-3 hướng trước, không cần chọn một đáp án duy nhất:\n"
        ]
        if profile_facts:
            lines.append("Mình đang bám vào: " + "; ".join(profile_facts[:4]) + ".")
        for i, career in enumerate(top_careers):
            reasons_text = " ".join(career["reasons"][:2])
            lines.append(f"{i + 1}. {career['title']} ({career['score']}%): {reasons_text}")

        first = top_careers[0]
        activity_1 = first["activities"][0] if first["activities"] else "Phỏng vấn một người đang làm trong lĩnh vực em quan tâm."
        activity_2 = first["activities"][1] if len(first["activities"]) > 1 else "Làm một sản phẩm nhỏ liên quan trong 1 tuần."

        lines.append(f"\nHoạt động kiểm chứng nhỏ:\n1. {activity_1}\n2. {activity_2}\n")
        lines.append(
            "Gợi ý này chỉ để tham khảo. Em nên ghi lại điều mình thích/không thích sau mỗi hoạt động "
            "và trao đổi với giáo viên, phụ huynh hoặc cố vấn khi cần."
        )
        return "\n".join(lines)

    def _build_messages(self, message: str, context: dict, history: Optional[list] = None) -> list:
        messages = [
            {"role": "system", "content": CAREER_ADVISOR_SYSTEM_PROMPT},
            {"role": "system", "content": UNIVERSITY_LOOKUP_TOOL_PROMPT},
            {
                "role": "system",
                "content": (
                    "Grounding rules: treat the JSON context as the source of truth for this student. "
                    "When profile.gradeLevel, profile.gender, profile.goals, profile.constraints, "
                    "profile.assessment.answerDetails or recommendedCareers are present, anchor the answer "
                    "to those concrete fields. Avoid generic, aspirational advice. Do not invent assessment "
                    "results, match scores, admission data, salary, or certainty. If the context is missing "
                    "information needed for a specific recommendation, ask at most two clear follow-up questions."
                ),
            },
            {
                "role": "system",
                "content": "Ngữ cảnh hồ sơ và gợi ý nghề của học sinh (JSON):\n"
                + json.dumps(context, ensure_ascii=False),
            },
        ]

        for turn in history or []:
            role = getattr(turn, "role", None) or (turn.get("role") if isinstance(turn, dict) else None)
            content = getattr(turn, "content", None) or (turn.get("content") if isinstance(turn, dict) else None)
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": message})
        return messages

    def _should_use_live_university_lookup(self, context: dict) -> bool:
        lookup = context.get("universityLookup")
        if not lookup or not self.web_search_enabled:
            return False
        return bool(lookup.get("queryUnderstanding", {}).get("needsLiveSearch"))

    async def _generate_university_web_response(
        self,
        client: AsyncOpenAI,
        message: str,
        context: dict,
        history: Optional[list] = None,
    ) -> str | None:
        lookup = context.get("universityLookup")
        if not lookup:
            return None

        search_input = self.university_lookup_tool.build_web_search_input(
            message,
            context,
            lookup,
            history,
        )
        search_context = self._parse_university_search_context(search_input)
        retrieval = await self._retrieve_university_evidence(search_context)
        if retrieval is not None and self.university_evidence_verifier.requires_verified_data(search_context):
            if not self.university_evidence_verifier.has_verified_evidence(retrieval):
                return self.university_evidence_verifier.format_no_verified_data(search_context, retrieval)

        if retrieval is not None:
            search_input = self._format_university_search_input(
                self.university_evidence_verifier.enrich_prompt_input(search_context, retrieval)
            )

        try:
            response = await client.chat.completions.create(
                model=self.web_search_model,
                messages=[
                    {
                        "role": "system",
                        "content": "\n\n".join(
                            [
                                CAREER_ADVISOR_SYSTEM_PROMPT,
                                UNIVERSITY_WEB_SEARCH_PROMPT,
                            ]
                        ),
                    },
                    {"role": "user", "content": search_input},
                ],
                max_completion_tokens=self.max_tokens,
            )
            answer = (response.choices[0].message.content or "").strip()
            if not answer:
                return None
            answer = self.university_lookup_tool.append_sources(answer, response)
            answer = self.university_evidence_verifier.finalize_answer(
                answer,
                retrieval,
                require_verified_data=self.university_evidence_verifier.requires_verified_data(search_context),
            )
            return answer
        except Exception as exc:
            print("University web search failed", exc)
            return None

    async def _generate_university_crawler_response(
        self,
        message: str,
        context: dict,
        history: Optional[list] = None,
    ) -> str | None:
        lookup = context.get("universityLookup")
        if not lookup:
            return None

        search_input = self.university_lookup_tool.build_web_search_input(
            message,
            context,
            lookup,
            history,
        )
        search_context = self._parse_university_search_context(search_input)
        retrieval = await self._retrieve_university_evidence(search_context)
        return self.university_evidence_verifier.format_evidence_answer(search_context, retrieval)

    async def _retrieve_university_evidence(
        self,
        search_context: dict[str, Any],
    ) -> dict[str, Any] | None:
        if not self.university_crawl_enabled:
            return None
        try:
            return await asyncio.to_thread(self.university_web_retriever.retrieve, search_context)
        except Exception as exc:
            print("University crawler failed", exc)
            return {
                "retrievedAt": None,
                "queriesUsed": search_context.get("genericSearchQueries", [])[:3],
                "sources": [],
                "evidence": [],
                "verifiedEvidence": [],
                "warnings": [str(exc)],
            }

    def _parse_university_search_context(self, search_input: str) -> dict[str, Any]:
        try:
            return json.loads(search_input.split("\n\n", 1)[1])
        except (IndexError, json.JSONDecodeError):
            return {"currentQuestion": search_input}

    def _format_university_search_input(self, search_context: dict[str, Any]) -> str:
        search_context = self._trim_university_search_context(search_context)
        return (
            "Hãy tra cứu web để trả lời câu hỏi tuyển sinh sau. "
            "Ưu tiên evidence đã crawl được, nguồn chính thức và trích dẫn nguồn trong câu trả lời.\n\n"
            + json.dumps(search_context, ensure_ascii=False, indent=2)
        )

    def _trim_university_search_context(self, search_context: dict[str, Any]) -> dict[str, Any]:
        compact = dict(search_context)
        compact["genericSearchQueries"] = (compact.get("genericSearchQueries") or [])[:3]
        compact["suggestedOfficialSearchQueries"] = (compact.get("suggestedOfficialSearchQueries") or [])[:2]
        compact["recentConversation"] = []
        evidence = compact.get("crawlerEvidence")
        if isinstance(evidence, dict):
            evidence["sources"] = (evidence.get("sources") or [])[:3]
            evidence["verifiedEvidence"] = (evidence.get("verifiedEvidence") or [])[:2]
            evidence["evidence"] = (evidence.get("evidence") or [])[:1]
            evidence["queriesUsed"] = (evidence.get("queriesUsed") or [])[:2]
        if len(json.dumps(compact, ensure_ascii=False)) <= 6000:
            return compact
        if isinstance(evidence, dict):
            evidence["sources"] = (evidence.get("sources") or [])[:2]
            evidence["verifiedEvidence"] = self._thin_university_evidence(
                (evidence.get("verifiedEvidence") or [])[:1]
            )
            evidence["evidence"] = []
        compact["mustSatisfyFilters"] = (compact.get("mustSatisfyFilters") or [])[:2]
        return compact

    def _thin_university_evidence(self, evidence: list[dict[str, Any]]) -> list[dict[str, Any]]:
        thinned: list[dict[str, Any]] = []
        for item in evidence:
            thinned.append(
                {
                    "title": item.get("title"),
                    "url": item.get("url"),
                    "domain": item.get("domain"),
                    "isOfficial": item.get("isOfficial"),
                    "matchedTargetTerms": item.get("matchedTargetTerms", [])[:3],
                    "scoreCandidates": item.get("scoreCandidates", [])[:1],
                    "tuitionCandidates": item.get("tuitionCandidates", [])[:1],
                    "scoreFilterSatisfied": item.get("scoreFilterSatisfied"),
                }
            )
        return thinned

    def _message_hash(self, message: str) -> str:
        normalized = normalize_message(message)
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]

    def _history_for_scope(self, history: Optional[list] = None) -> list[dict[str, str]]:
        result: list[dict[str, str]] = []
        for turn in (history or [])[-6:]:
            role = getattr(turn, "role", None) or (turn.get("role") if isinstance(turn, dict) else None)
            content = getattr(turn, "content", None) or (turn.get("content") if isinstance(turn, dict) else None)
            if role in ("user", "assistant") and content:
                result.append({"role": role, "content": str(content)[:500]})
        return result

    def _match_title(self, match) -> str | None:
        if isinstance(match, dict):
            title = match.get("title")
        else:
            title = getattr(match, "title", None)
        return str(title) if title else None

    def _build_scope_classifier_payload(
        self,
        message: str,
        matches,
        history: Optional[list],
        resolved_careers: list,
    ) -> dict:
        recommended_titles = [
            title
            for title in (self._match_title(match) for match in (matches or [])[:5])
            if title
        ]
        return {
            "current_message": message[:2000],
            "recent_history": self._history_for_scope(history),
            "recommended_careers": recommended_titles,
            "resolved_careers": [
                self._resolved_career_to_dict(career)
                for career in resolved_careers
            ],
        }

    async def _request_llm_scope_decision(
        self,
        client: AsyncOpenAI,
        payload: dict,
    ) -> LLMScopeDecision:
        response_schema = LLMScopeDecision.model_json_schema()
        response_schema["required"] = ["scope", "intent", "confidence", "resolved_topics"]
        response = await client.chat.completions.create(
            model=self.scope_model,
            temperature=0,
            max_tokens=300,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "career_scope_decision",
                    "strict": True,
                    "schema": response_schema,
                },
            },
            messages=[
                {"role": "system", "content": CAREER_SCOPE_CLASSIFIER_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(payload, ensure_ascii=False),
                },
            ],
            timeout=10,
        )
        content = (response.choices[0].message.content or "").strip()
        return LLMScopeDecision.model_validate_json(content)

    async def classify_scope_with_llm(
        self,
        message: str,
        matches,
        history: Optional[list],
        resolved_careers: list,
    ) -> LLMScopeDecision | None:
        if not self.api_key:
            return None

        payload = self._build_scope_classifier_payload(
            message=message,
            matches=matches,
            history=history,
            resolved_careers=resolved_careers,
        )
        try:
            client = AsyncOpenAI(api_key=self.api_key)
            return await self._request_llm_scope_decision(client, payload)
        except Exception as exc:
            logger.warning(
                "career_scope_classifier_failed %s",
                {
                    "model": self.scope_model,
                    "message_hash": self._message_hash(message),
                    "error": exc.__class__.__name__,
                },
            )
            return None

    def _log_scope_decision(
        self,
        message: str,
        rule_scope: ScopeDetectionResult | None,
        llm_scope: LLMScopeDecision | None,
        final_scope: str,
        safety: SafetyDetectionResult,
    ) -> None:
        logger.info(
            "career_scope_decision %s",
            {
                "safety": safety.result.value,
                "rule_scope": rule_scope.result.value if rule_scope else None,
                "llm_scope": llm_scope.scope if llm_scope else None,
                "confidence": llm_scope.confidence if llm_scope else None,
                "final_scope": final_scope,
                "model": self.scope_model if llm_scope else None,
                "mode": self.scope_mode,
                "message_hash": self._message_hash(message),
            },
        )

    async def prepare_advisor_request(
        self,
        message: str,
        profile,
        matches,
        history: Optional[list] = None,
        career_titles: Iterable[str] | None = None,
        scope_message: str | None = None,
    ) -> AdvisorPreparation:
        safety = self.detect_safety(message)
        if safety.result == SafetyResult.CRISIS:
            self._log_scope_decision(message, None, None, SafetyResult.CRISIS.value, safety)
            return AdvisorPreparation(
                early_response=CRISIS_MESSAGE,
                safety=safety,
            )
        if safety.result == SafetyResult.HARMFUL:
            self._log_scope_decision(message, None, None, SafetyResult.HARMFUL.value, safety)
            return AdvisorPreparation(
                early_response=HARMFUL_REQUEST_MESSAGE,
                safety=safety,
            )

        scope_message = scope_message or message
        rule_scope = self.detect_scope(
            scope_message,
            career_titles=career_titles,
            matches=matches,
            history=history,
        )

        if self.scope_mode == "off":
            self._log_scope_decision(message, rule_scope, None, "scope_off_continue", safety)
            return AdvisorPreparation(
                resolved_careers=rule_scope.resolved_careers,
                safety=safety,
                rule_scope=rule_scope,
            )

        if rule_scope.result == ScopeResult.IN_SCOPE:
            self._log_scope_decision(message, rule_scope, None, ScopeResult.IN_SCOPE.value, safety)
            return AdvisorPreparation(
                resolved_careers=rule_scope.resolved_careers,
                safety=safety,
                rule_scope=rule_scope,
            )

        if rule_scope.result == ScopeResult.CLEARLY_OUT_OF_SCOPE:
            self._log_scope_decision(
                message,
                rule_scope,
                None,
                ScopeResult.CLEARLY_OUT_OF_SCOPE.value,
                safety,
            )
            return AdvisorPreparation(
                early_response=OUT_OF_SCOPE_MESSAGE,
                resolved_careers=rule_scope.resolved_careers,
                safety=safety,
                rule_scope=rule_scope,
            )

        if self.scope_mode == "strict":
            self._log_scope_decision(message, rule_scope, None, "uncertain_continue", safety)
            return AdvisorPreparation(
                resolved_careers=rule_scope.resolved_careers,
                safety=safety,
                rule_scope=rule_scope,
            )

        llm_scope = await self.classify_scope_with_llm(
            message=scope_message,
            matches=matches,
            history=history,
            resolved_careers=rule_scope.resolved_careers,
        )
        if (
            llm_scope is not None
            and llm_scope.scope == "out_of_scope"
            and llm_scope.confidence >= self.scope_confidence_threshold
        ):
            self._log_scope_decision(message, rule_scope, llm_scope, "llm_out_of_scope", safety)
            return AdvisorPreparation(
                early_response=OUT_OF_SCOPE_MESSAGE,
                resolved_careers=rule_scope.resolved_careers,
                safety=safety,
                rule_scope=rule_scope,
                llm_scope=llm_scope,
            )

        final_scope = "llm_in_scope" if llm_scope and llm_scope.scope == "in_scope" else "uncertain_continue"
        self._log_scope_decision(message, rule_scope, llm_scope, final_scope, safety)
        return AdvisorPreparation(
            resolved_careers=rule_scope.resolved_careers,
            inferred_intent=llm_scope.intent if llm_scope else None,
            resolved_topics=llm_scope.resolved_topics if llm_scope else [],
            safety=safety,
            rule_scope=rule_scope,
            llm_scope=llm_scope,
        )

    def _add_scope_context(self, context: dict, preparation: AdvisorPreparation) -> None:
        if preparation.inferred_intent or preparation.resolved_topics:
            context["scopeClassifier"] = {
                "inferredIntent": preparation.inferred_intent,
                "resolvedTopics": preparation.resolved_topics,
            }

    async def generate_response(
        self,
        message: str,
        profile,
        matches,
        history: Optional[list] = None,
        career_titles: Iterable[str] | None = None,
        user_context: Optional[dict] = None,
    ) -> str:
        conversation_state = self.university_lookup_tool.build_conversation_state(message, history)
        scope_message = conversation_state.get("rewrittenQuestion") or message
        preparation = await self.prepare_advisor_request(
            message,
            profile,
            matches,
            history,
            career_titles=career_titles,
            scope_message=scope_message,
        )
        if preparation.early_response:
            return preparation.early_response

        context = self.build_context(
            profile,
            matches,
            message,
            history,
            resolved_careers=preparation.resolved_careers,
            user_context=user_context,
            conversation_state=conversation_state,
        )
        self._add_scope_context(context, preparation)
        if not self.api_key:
            if self._should_use_live_university_lookup(context):
                crawler_answer = await self._generate_university_crawler_response(
                    message, context, history
                )
                if crawler_answer:
                    return crawler_answer
            return self.fallback_answer(
                context,
                "OPENAI_API_KEY chưa được cấu hình nên hệ thống đang trả lời bằng logic demo.",
            )

        try:
            client = AsyncOpenAI(api_key=self.api_key)
            if self._should_use_live_university_lookup(context):
                web_answer = await self._generate_university_web_response(
                    client, message, context, history
                )
                if web_answer:
                    return web_answer

            response = await client.chat.completions.create(
                model=self.model,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                messages=self._build_messages(message, context, history),
            )
            return response.choices[0].message.content or self.fallback_answer(context)
        except Exception as exc:
            print("OpenAI advisor request failed", exc)
            return self.fallback_answer(
                context,
                "Không gọi được OpenAI API. Hãy kiểm tra OPENAI_API_KEY, OPENAI_MODEL, quota và restart server local.",
            )

    async def generate_response_stream(
        self,
        message: str,
        profile,
        matches,
        history: Optional[list] = None,
        career_titles: Iterable[str] | None = None,
        user_context: Optional[dict] = None,
    ) -> AsyncGenerator[str, None]:
        conversation_state = self.university_lookup_tool.build_conversation_state(message, history)
        scope_message = conversation_state.get("rewrittenQuestion") or message
        preparation = await self.prepare_advisor_request(
            message,
            profile,
            matches,
            history,
            career_titles=career_titles,
            scope_message=scope_message,
        )
        if preparation.early_response:
            yield preparation.early_response
            return

        context = self.build_context(
            profile,
            matches,
            message,
            history,
            resolved_careers=preparation.resolved_careers,
            user_context=user_context,
            conversation_state=conversation_state,
        )
        self._add_scope_context(context, preparation)
        if not self.api_key:
            if self._should_use_live_university_lookup(context):
                crawler_answer = await self._generate_university_crawler_response(
                    message, context, history
                )
                if crawler_answer:
                    yield crawler_answer
                    return
            yield self.fallback_answer(
                context,
                "OPENAI_API_KEY chưa được cấu hình nên hệ thống đang trả lời bằng logic demo.",
            )
            return

        try:
            client = AsyncOpenAI(api_key=self.api_key)
            if self._should_use_live_university_lookup(context):
                web_answer = await self._generate_university_web_response(
                    client, message, context, history
                )
                if web_answer:
                    yield web_answer
                    return

            stream = await client.chat.completions.create(
                model=self.model,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                messages=self._build_messages(message, context, history),
                stream=True,
            )
            produced = False
            async for chunk in stream:
                if not chunk.choices:
                    continue
                piece = getattr(chunk.choices[0].delta, "content", None)
                if piece:
                    produced = True
                    yield piece
            if not produced:
                yield self.fallback_answer(context)
        except Exception as exc:
            print("OpenAI advisor stream failed", exc)
            yield self.fallback_answer(
                context,
                "Không gọi được OpenAI API. Hãy kiểm tra OPENAI_API_KEY, OPENAI_MODEL, quota và restart server local.",
            )
