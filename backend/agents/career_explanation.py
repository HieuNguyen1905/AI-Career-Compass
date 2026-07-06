import hashlib
import json
import os
import time
from typing import Any

from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from core.vector_features import (
    FEATURE_DISPLAY_NAMES,
    FEATURE_KEYS,
    QUESTION_FEATURE_MAP,
)
from db.assessment_questions import assessment_questions
from models.schemas import CareerProfile
from agents.prompts.system_prompts import CAREER_EXPLANATION_SYSTEM_PROMPT


class ExplanationReason(BaseModel):
    text: str = Field(description="Một lý do phù hợp ngắn gọn bằng tiếng Việt.")
    evidenceQuestionIds: list[str] = Field(
        description="Các questionId trực tiếp hỗ trợ cho lý do này."
    )


class CareerExplanation(BaseModel):
    careerId: str
    reasons: list[ExplanationReason]


class CareerExplanationBatch(BaseModel):
    explanations: list[CareerExplanation]


class CareerExplanationAgent:
    """Viết lý do cá nhân hóa cho Top 5 mà không can thiệp vào ranking."""

    _CACHE_TTL_SECONDS = 30 * 60
    _CACHE_MAX_ENTRIES = 128

    def __init__(self) -> None:
        self._cache: dict[str, tuple[float, dict[str, list[dict[str, Any]]]]] = {}

    @property
    def model(self) -> str:
        return os.getenv(
            "CAREER_EXPLANATION_MODEL",
            os.getenv("OPENAI_MODEL", os.getenv("DEFAULT_MODEL", "gpt-4o-mini")),
        )

    @property
    def api_key(self) -> str | None:
        return os.getenv("OPENAI_API_KEY") or None

    @property
    def timeout(self) -> float:
        try:
            return max(3.0, float(os.getenv("CAREER_EXPLANATION_TIMEOUT", "30")))
        except ValueError:
            return 30.0

    def _assessment_payload(self, profile: CareerProfile) -> list[dict[str, Any]]:
        answers = profile.assessmentAnswers or {}
        payload = []

        for question in assessment_questions:
            feature = QUESTION_FEATURE_MAP.get(question.id)
            payload.append(
                {
                    "questionId": question.id,
                    "section": question.step,
                    "question": question.prompt,
                    "answer": answers.get(question.id, 3),
                    "feature": feature,
                    "featureLabel": FEATURE_DISPLAY_NAMES.get(feature or "", feature),
                }
            )

        return payload

    def _career_payload(self, matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
        careers = []

        for rank, match in enumerate(matches, start=1):
            feature_vector = match.get("featureVector") or []
            feature_profile = [
                {
                    "feature": feature,
                    "label": FEATURE_DISPLAY_NAMES[feature],
                    "importance": round(float(value), 3),
                }
                for feature, value in zip(FEATURE_KEYS, feature_vector)
                if float(value) != 0
            ]

            careers.append(
                {
                    "careerId": str(match["id"]),
                    "rank": rank,
                    "title": match.get("title", ""),
                    "score": match.get("score", 0),
                    "summary": match.get("summary", ""),
                    "subjects": match.get("subjects", []),
                    "skills": match.get("skills", []),
                    "interests": match.get("interests", []),
                    "values": match.get("values", []),
                    "riasec": match.get("riasec", []),
                    "tasks": match.get("tasks", []),
                    "majors": match.get("majors", []),
                    "featureProfile": feature_profile,
                }
            )

        return careers

    def _request_payload(
        self,
        profile: CareerProfile,
        matches: list[dict[str, Any]],
    ) -> dict[str, Any]:
        return {
            "studentContext": {
                "gradeLevel": profile.gradeLevel,
                "goals": profile.goals,
                "constraints": profile.constraints,
            },
            "answerScale": {
                "1": "Hoàn toàn không đồng ý",
                "2": "Không đồng ý",
                "3": "Trung lập",
                "4": "Đồng ý",
                "5": "Hoàn toàn đồng ý",
            },
            "assessment": self._assessment_payload(profile),
            "careers": self._career_payload(matches),
        }

    def _cache_key(self, payload: dict[str, Any]) -> str:
        serialized = json.dumps(
            payload,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        return hashlib.sha256(
            f"career-explanation-v2:{self.model}:{serialized}".encode("utf-8")
        ).hexdigest()

    def _get_cached(self, key: str) -> dict[str, list[dict[str, Any]]] | None:
        cached = self._cache.get(key)
        if not cached:
            return None
        created_at, value = cached
        if time.monotonic() - created_at > self._CACHE_TTL_SECONDS:
            self._cache.pop(key, None)
            return None
        return value

    def _set_cached(self, key: str, value: dict[str, list[dict[str, Any]]]) -> None:
        if len(self._cache) >= self._CACHE_MAX_ENTRIES:
            oldest_key = min(self._cache, key=lambda item: self._cache[item][0])
            self._cache.pop(oldest_key, None)
        self._cache[key] = (time.monotonic(), value)

    def _validate_explanations(
        self,
        parsed: CareerExplanationBatch,
        payload: dict[str, Any],
    ) -> dict[str, list[dict[str, Any]]]:
        valid_career_ids = {career["careerId"] for career in payload["careers"]}
        valid_question_ids = {
            question["questionId"] for question in payload["assessment"]
        }
        validated: dict[str, list[dict[str, Any]]] = {}

        for explanation in parsed.explanations:
            if explanation.careerId not in valid_career_ids:
                continue

            reasons: list[dict[str, Any]] = []
            for reason in explanation.reasons:
                text = reason.text.strip()
                evidence_ids = list(
                    dict.fromkeys(
                        question_id
                        for question_id in reason.evidenceQuestionIds
                        if question_id in valid_question_ids
                    )
                )[:3]
                if text and evidence_ids:
                    reasons.append(
                        {
                            "text": text,
                            "evidenceQuestionIds": evidence_ids,
                        }
                    )

            if len(reasons) == 3:
                validated[explanation.careerId] = reasons

        if set(validated) != valid_career_ids:
            return {}
        return validated

    async def explain_matches(
        self,
        profile: CareerProfile,
        matches: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        explanations = await self.generate_explanations(profile, matches)
        if not explanations:
            return matches

        enriched_matches = []
        for match in matches:
            career_id = str(match["id"])
            reason_objects = explanations.get(career_id)
            if not reason_objects:
                enriched_matches.append(match)
                continue

            enriched_matches.append(
                {
                    **match,
                    "reasons": [reason["text"] for reason in reason_objects],
                    "reasonEvidence": reason_objects,
                    "explanationSource": "ai",
                }
            )

        return enriched_matches

    async def generate_explanations(
        self,
        profile: CareerProfile,
        matches: list[dict[str, Any]],
    ) -> dict[str, list[dict[str, Any]]] | None:
        if not self.api_key or not matches:
            return None

        payload = self._request_payload(profile, matches)
        cache_key = self._cache_key(payload)
        explanations = self._get_cached(cache_key)

        if explanations is None:
            try:
                client = AsyncOpenAI(
                    api_key=self.api_key,
                    timeout=self.timeout,
                    max_retries=0,
                )
                completion = await client.beta.chat.completions.parse(
                    model=self.model,
                    temperature=0.2,
                    max_completion_tokens=800,
                    messages=[
                        {
                            "role": "developer",
                            "content": CAREER_EXPLANATION_SYSTEM_PROMPT,
                        },
                        {
                            "role": "user",
                            "content": json.dumps(payload, ensure_ascii=False),
                        },
                    ],
                    response_format=CareerExplanationBatch,
                )
                parsed = completion.choices[0].message.parsed
                if parsed is None:
                    return None
                explanations = self._validate_explanations(parsed, payload)
                if not explanations:
                    return None
                self._set_cached(cache_key, explanations)
            except Exception as exc:
                print(f"Career explanation request failed: {exc}")
                return None

        return explanations
