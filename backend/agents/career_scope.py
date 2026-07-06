import re
import unicodedata
from dataclasses import dataclass
from enum import Enum
from functools import lru_cache
from typing import Iterable, Literal, Sequence

from pydantic import BaseModel, ConfigDict, Field

from agents.catalogs.career_scope_catalog import (
    CAREER_ALIASES,
    DEFAULT_CAREER_TITLES,
    DYNAMIC_CAREER_TITLES,
    GENERAL_CAREER_SIGNALS,
)


class CareerMatchSource(str, Enum):
    CANONICAL = "canonical"
    ALIAS = "alias"
    DYNAMIC_CATALOG = "dynamic_catalog"
    RECOMMENDED_CAREERS = "recommended_careers"
    HISTORY = "history"


class SafetyResult(str, Enum):
    SAFE = "safe"
    CRISIS = "crisis"
    HARMFUL = "harmful"


class ScopeResult(str, Enum):
    IN_SCOPE = "in_scope"
    UNCERTAIN = "uncertain"
    CLEARLY_OUT_OF_SCOPE = "clearly_out_of_scope"


class ResolvedCareer(BaseModel):
    canonical_title: str
    matched_text: str
    source: CareerMatchSource
    confidence: float = Field(default=1.0, ge=0, le=1)


class SafetyDetectionResult(BaseModel):
    result: SafetyResult
    matched_signals: list[str] = Field(default_factory=list)


class ScopeDetectionResult(BaseModel):
    result: ScopeResult
    matched_signals: list[str] = Field(default_factory=list)
    resolved_careers: list[ResolvedCareer] = Field(default_factory=list)


class LLMScopeDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scope: Literal["in_scope", "out_of_scope"]
    intent: Literal[
        "career_info",
        "career_compare",
        "university_select",
        "admission_score",
        "learning_roadmap",
        "cv_interview",
        "self_discovery",
        "small_talk",
        "unknown",
    ]
    confidence: float = Field(ge=0, le=1)
    resolved_topics: list[str] = Field(default_factory=list)


@dataclass(frozen=True)
class _CareerCatalog:
    default_titles: tuple[str, ...]
    dynamic_titles: tuple[str, ...]
    recommended_titles: tuple[str, ...]
    normalized_default_titles: dict[str, str]
    normalized_dynamic_titles: dict[str, str]
    normalized_recommended_titles: dict[str, str]

    @property
    def known_title_norms(self) -> set[str]:
        return (
            set(self.normalized_default_titles)
            | set(self.normalized_dynamic_titles)
            | set(self.normalized_recommended_titles)
        )


@dataclass(frozen=True)
class _Candidate:
    career: ResolvedCareer
    start: int
    order: int
    priority: int


CRISIS_SIGNALS = [
    "tự tử",
    "tự sát",
    "kết liễu",
    "tự làm hại",
    "tự thương",
    "không muốn sống",
    "muốn chết",
    "kết thúc tất cả",
]

HARMFUL_REQUEST_SIGNALS = [
    "hack",
    "lừa đảo",
    "bạo lực",
    "ma túy",
    "cá cược",
    "cá độ",
    "vũ khí",
    "chế tạo bom",
    "đánh nhau",
]

CAREER_COMPARISON_SIGNALS = [
    "so sánh nghề",
    "so sánh ngành",
    "so sánh hướng",
    "so sánh lựa chọn",
    "so sánh 2 nghề",
    "so sánh hai nghề",
    "so sánh 2 ngành",
    "so sánh hai ngành",
    "2 nghề được gợi ý",
    "hai nghề được gợi ý",
    "2 ngành được gợi ý",
    "hai ngành được gợi ý",
    "được gợi ý cao nhất",
    "gợi ý cao nhất",
    "nghề phù hợp nhất",
    "ngành phù hợp nhất",
    "top nghề",
    "top ngành",
]

COMPARISON_WORDS = [
    "so sánh",
    "khác nhau",
    "giống nhau",
    "hơn kém",
    "ưu nhược",
    "tốt hơn",
    "phù hợp hơn",
    "nên chọn cái nào",
    "nên chọn hướng nào",
    "nên chọn nghề nào",
    "nên chọn ngành nào",
    "cái nào hợp hơn",
]

CAREER_REFERENCE_WORDS = [
    "2 nghề",
    "hai nghề",
    "nghề nào",
    "nghề này",
    "nghề đó",
    "nghề trên",
    "nghề thứ nhất",
    "nghề thứ hai",
    "ngành thứ nhất",
    "ngành thứ hai",
    "nghề được gợi ý",
    "nghề phù hợp",
    "ngành",
    "hướng",
    "lựa chọn",
    "được gợi ý",
    "gợi ý",
    "cao nhất",
    "phù hợp nhất",
    "top 2",
    "top hai",
    "thứ nhất",
    "thứ hai",
]

STUDY_SIGNALS = [
    "cách học",
    "kế hoạch học",
    "tự học",
    "ôn thi",
    "học tốt",
    "học yếu",
    "môn học",
    "nên học gì",
    "cần học gì",
    "học gì",
    "học môn",
    "giỏi toán",
    "học toán",
    "môn toán",
    "học tiếng anh",
    "em thích toán",
    "em thích văn",
    "em thích lý",
    "em thích hóa",
    "em thích sinh",
    "em thích tin",
    "học y",
    "y khoa",
]

DIRECT_ANSWER_SIGNALS = [
    "giải bài",
    "giải giúp",
    "bài toán",
    "đáp án",
    "bằng bao nhiêu",
    "kết quả là",
    "nặng hơn",
    "nhẹ hơn",
    "ai là",
    "là ai",
    "ở đâu",
    "mấy giờ",
    "thời tiết",
    "pm2.5",
    "kể chuyện",
    "kể chuyện cười",
    "viết code",
    "trang react",
    "api fastapi",
    "quản lý sản phẩm",
    "debug",
    "dịch câu",
    "dịch đoạn",
    "dịch đoạn văn",
    "nấu món",
    "nấu phở",
    "công thức nấu",
    "tỷ số",
    "trận bóng",
    "bóng đá",
    "xem phim",
    "bài hát",
]

IMPLEMENTATION_REQUEST_SIGNALS = [
    "api fastapi",
    "trang react",
    "react hoàn chỉnh",
    "viết cho tôi một api",
    "viết cho tôi api",
    "viết cho tôi trang",
    "tạo cho tôi trang",
    "làm cho tôi trang",
    "viết cho tôi app",
]

SMALL_TALK_SIGNALS = [
    "chào",
    "hello",
    "hi",
    "bạn là ai",
    "bạn làm được gì",
    "giúp được gì",
]

SHORT_ALIASES = {"ba", "da", "pm", "qa", "hr", "se", "ai", "ml", "ui", "ux"}

SHORT_ALIAS_CONTEXT_SIGNALS = [
    "nghề",
    "vị trí",
    "làm",
    "học",
    "intern",
    "internship",
    "career",
    "junior",
    "senior",
    "ứng tuyển",
    "lộ trình",
    "trở thành",
    "kỹ năng",
    "công việc",
    "tìm hiểu",
    "ngành",
]

SHORT_ALIAS_NEGATIVE_CONTEXT = {
    "ba": ["ba em", "ba mẹ", "ba của em", "ba mình", "ba tôi"],
    "da": ["bài toán", "đáp án", "đề bài", "da của bài toán", "da cua bai toan"],
    "pm": ["pm2.5", "pm 2.5", "bụi mịn"],
    "ai": ["ai là", "là ai"],
}

RECOMMENDED_TOP_TWO_REFERENCES = [
    "top 2 nghề",
    "top hai nghề",
    "2 nghề được gợi ý",
    "hai nghề được gợi ý",
    "hai nghề được gợi ý cao nhất",
    "2 nghề được gợi ý cao nhất",
    "hai ngành được gợi ý",
    "2 ngành được gợi ý",
    "hai nghề phù hợp nhất",
]

RECOMMENDED_TOP_ONE_REFERENCES = [
    "nghề phù hợp nhất",
    "ngành phù hợp nhất",
    "nghề được gợi ý cao nhất",
    "ngành được gợi ý cao nhất",
    "top 1 nghề",
    "top một nghề",
]

HISTORY_FIRST_REFERENCES = [
    "nghề thứ nhất",
    "nghề thứ 1",
    "ngành thứ nhất",
    "ngành thứ 1",
    "hướng thứ nhất",
    "hướng thứ 1",
    "lựa chọn thứ nhất",
]

HISTORY_SECOND_REFERENCES = [
    "nghề thứ hai",
    "nghề thứ 2",
    "ngành thứ hai",
    "ngành thứ 2",
    "hướng thứ hai",
    "hướng thứ 2",
    "lựa chọn thứ hai",
    "cái thứ hai",
]

HISTORY_BOTH_REFERENCES = [
    "hai nghề trên",
    "2 nghề trên",
    "hai ngành trên",
    "2 ngành trên",
    "hai hướng trên",
    "2 hướng trên",
    "hai nghề đó",
    "2 nghề đó",
]

HISTORY_LAST_REFERENCES = [
    "nghề đó",
    "nghề trên",
    "nghề này",
    "ngành đó",
    "ngành trên",
    "ngành này",
    "hướng đó",
    "hướng trên",
    "hướng này",
    "lựa chọn đó",
]

SOURCE_PRIORITY = {
    CareerMatchSource.HISTORY: 0,
    CareerMatchSource.DYNAMIC_CATALOG: 1,
    CareerMatchSource.RECOMMENDED_CAREERS: 2,
    CareerMatchSource.ALIAS: 3,
    CareerMatchSource.CANONICAL: 4,
}


def normalize_phrase(text: str) -> str:
    text = (text or "").replace("Đ", "D").replace("đ", "d").lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return " ".join(text.split())


def normalize_alias(text: str) -> str:
    return normalize_phrase(text)


def normalize_message(message: str) -> str:
    return normalize_phrase(message)


def _phrase_regex(normalized_phrase: str) -> re.Pattern[str] | None:
    phrase = normalize_phrase(normalized_phrase)
    if not phrase:
        return None
    body = r"\s+".join(re.escape(part) for part in phrase.split(" "))
    return re.compile(rf"(?<![a-z0-9]){body}(?![a-z0-9])")


def find_phrase_spans(
    normalized_message: str,
    normalized_phrase: str,
) -> list[tuple[int, int]]:
    pattern = _phrase_regex(normalized_phrase)
    if pattern is None:
        return []
    return [(match.start(), match.end()) for match in pattern.finditer(normalized_message)]


def contains_phrase(
    normalized_message: str,
    normalized_phrase: str,
) -> bool:
    return bool(find_phrase_spans(normalized_message, normalized_phrase))


def _iter_titles(items: Iterable | None) -> list[str]:
    titles: list[str] = []
    for item in items or []:
        title = None
        if isinstance(item, str):
            title = item
        elif isinstance(item, dict):
            title = item.get("title") or item.get("canonical_title")
        else:
            title = getattr(item, "title", None) or getattr(item, "canonical_title", None)
        if title:
            titles.append(str(title))
    return titles


def _dedupe_titles(titles: Iterable[str]) -> tuple[str, ...]:
    seen: set[str] = set()
    result: list[str] = []
    for title in titles:
        normalized = normalize_phrase(title)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        result.append(title)
    return tuple(result)


def _build_catalog(
    career_titles: Iterable[str] | None = None,
    matches: Sequence | None = None,
) -> _CareerCatalog:
    default_titles = _dedupe_titles(DEFAULT_CAREER_TITLES)
    dynamic_titles = _dedupe_titles(
        list(_iter_titles(career_titles)) + list(DYNAMIC_CAREER_TITLES)
    )
    recommended_titles = _dedupe_titles(_iter_titles(matches))

    return _CareerCatalog(
        default_titles=default_titles,
        dynamic_titles=dynamic_titles,
        recommended_titles=recommended_titles,
        normalized_default_titles={normalize_phrase(title): title for title in default_titles},
        normalized_dynamic_titles={normalize_phrase(title): title for title in dynamic_titles},
        normalized_recommended_titles={normalize_phrase(title): title for title in recommended_titles},
    )


@lru_cache(maxsize=1)
def _normalized_alias_items() -> tuple[tuple[str, str, str], ...]:
    aliases: dict[str, tuple[str, str]] = {}
    for alias, canonical in CAREER_ALIASES.items():
        normalized = normalize_alias(alias)
        if normalized and normalized not in aliases:
            aliases[normalized] = (alias, canonical)
    return tuple(
        (normalized, display, canonical)
        for normalized, (display, canonical) in sorted(
            aliases.items(),
            key=lambda item: (-len(item[0]), item[0]),
        )
    )


@lru_cache(maxsize=1)
def _normalized_alias_map() -> dict[str, str]:
    return {
        normalized: canonical
        for normalized, _, canonical in _normalized_alias_items()
    }


def _canonical_is_known(canonical_title: str, catalog: _CareerCatalog) -> bool:
    return normalize_phrase(canonical_title) in catalog.known_title_norms


def _canonical_for_title(title: str, catalog: _CareerCatalog) -> str:
    normalized = normalize_phrase(title)
    alias_canonical = _normalized_alias_map().get(normalized)
    if alias_canonical and _canonical_is_known(alias_canonical, catalog):
        return alias_canonical
    if normalized in catalog.normalized_default_titles:
        return catalog.normalized_default_titles[normalized]
    if normalized in catalog.normalized_dynamic_titles:
        return catalog.normalized_dynamic_titles[normalized]
    if normalized in catalog.normalized_recommended_titles:
        return catalog.normalized_recommended_titles[normalized]
    return title


def _canonical_norms_for_titles(
    titles: Iterable[str],
    catalog: _CareerCatalog,
) -> set[str]:
    return {normalize_phrase(_canonical_for_title(title, catalog)) for title in titles}


def _display_match_from_message(
    message: str,
    span: tuple[int, int],
    fallback: str,
) -> str:
    stripped = message.strip()
    normalized_stripped = normalize_message(stripped)
    start, end = span
    if len(normalized_stripped) == len(stripped) and 0 <= start <= end <= len(stripped):
        return stripped[start:end]
    return fallback


def _token_spans(normalized_message: str) -> list[tuple[str, int, int]]:
    return [
        (match.group(0), match.start(), match.end())
        for match in re.finditer(r"[a-z0-9]+(?:[./-][a-z0-9]+)*", normalized_message)
    ]


def _window_for_span(
    normalized_message: str,
    span: tuple[int, int],
    radius: int = 5,
) -> str:
    tokens = _token_spans(normalized_message)
    if not tokens:
        return ""
    start, end = span
    alias_indexes = [
        index
        for index, (_, token_start, token_end) in enumerate(tokens)
        if token_start >= start and token_end <= end
    ]
    if not alias_indexes:
        alias_indexes = [
            index
            for index, (_, token_start, token_end) in enumerate(tokens)
            if token_start <= start < token_end
        ]
    if not alias_indexes:
        return ""
    first = max(0, alias_indexes[0] - radius)
    last = min(len(tokens), alias_indexes[-1] + radius + 1)
    return " ".join(token for token, _, _ in tokens[first:last])


def _has_uppercase_short_alias(message: str, alias: str) -> bool:
    if not alias.isalpha():
        return False
    pattern = re.compile(rf"(?<![A-Za-z0-9]){re.escape(alias.upper())}(?![A-Za-z0-9])")
    return bool(pattern.search(message))


def _short_alias_allowed(
    message: str,
    normalized_message: str,
    alias: str,
    span: tuple[int, int],
    canonical_title: str,
    recommended_career_norms: set[str],
    history_career_norms: set[str],
) -> bool:
    if alias not in SHORT_ALIASES:
        return True

    window = _window_for_span(normalized_message, span)
    for negative in SHORT_ALIAS_NEGATIVE_CONTEXT.get(alias, []):
        if contains_phrase(window, normalize_phrase(negative)):
            return False

    canonical_norm = normalize_phrase(canonical_title)
    if canonical_norm in recommended_career_norms or canonical_norm in history_career_norms:
        return True
    if any(contains_phrase(window, normalize_phrase(signal)) for signal in SHORT_ALIAS_CONTEXT_SIGNALS):
        return True
    return _has_uppercase_short_alias(message, alias)


def _make_candidate(
    canonical_title: str,
    matched_text: str,
    source: CareerMatchSource,
    confidence: float,
    start: int,
    order: int,
) -> _Candidate:
    return _Candidate(
        career=ResolvedCareer(
            canonical_title=canonical_title,
            matched_text=matched_text,
            source=source,
            confidence=confidence,
        ),
        start=start,
        order=order,
        priority=SOURCE_PRIORITY[source],
    )


def _dedupe_candidates(candidates: list[_Candidate]) -> list[ResolvedCareer]:
    ordered = sorted(candidates, key=lambda item: (item.start, item.order, item.priority))
    seen: set[str] = set()
    result: list[ResolvedCareer] = []
    for item in ordered:
        canonical_norm = normalize_phrase(item.career.canonical_title)
        if canonical_norm in seen:
            continue
        seen.add(canonical_norm)
        result.append(item.career)
    return result


def _history_messages(history: Sequence | None) -> list[str]:
    messages: list[str] = []
    for turn in history or []:
        content = None
        if isinstance(turn, dict):
            content = turn.get("content")
        else:
            content = getattr(turn, "content", None)
        if content:
            messages.append(str(content))
    return messages


def _resolve_history_careers(
    history: Sequence | None,
    catalog: _CareerCatalog,
    matches: Sequence | None,
) -> list[ResolvedCareer]:
    careers: list[ResolvedCareer] = []
    dynamic_titles = catalog.dynamic_titles + catalog.recommended_titles
    for content in _history_messages(history)[-8:]:
        careers.extend(
            resolve_career_entities(
                content,
                career_titles=dynamic_titles,
                matches=matches,
                history=None,
                include_history=False,
            )
        )
    return _dedupe_candidates(
        [
            _make_candidate(
                career.canonical_title,
                career.matched_text,
                career.source,
                career.confidence,
                index,
                index,
            )
            for index, career in enumerate(careers)
        ]
    )


def _reference_span(
    normalized_message: str,
    phrases: Iterable[str],
) -> tuple[int, int, str] | None:
    for phrase in phrases:
        normalized_phrase = normalize_phrase(phrase)
        spans = find_phrase_spans(normalized_message, normalized_phrase)
        if spans:
            return spans[0][0], spans[0][1], phrase
    return None


def _resolve_recommended_references(
    message: str,
    normalized_message: str,
    catalog: _CareerCatalog,
    order_offset: int,
) -> list[_Candidate]:
    recommended_titles = list(catalog.recommended_titles)
    if not recommended_titles:
        return []

    reference = _reference_span(normalized_message, RECOMMENDED_TOP_TWO_REFERENCES)
    if reference:
        start, end, phrase = reference
        return [
            _make_candidate(
                _canonical_for_title(title, catalog),
                _display_match_from_message(message, (start, end), phrase),
                CareerMatchSource.RECOMMENDED_CAREERS,
                0.84,
                10_000 + index,
                order_offset + index,
            )
            for index, title in enumerate(recommended_titles[:2])
        ]

    reference = _reference_span(normalized_message, RECOMMENDED_TOP_ONE_REFERENCES)
    if reference:
        start, end, phrase = reference
        return [
            _make_candidate(
                _canonical_for_title(recommended_titles[0], catalog),
                _display_match_from_message(message, (start, end), phrase),
                CareerMatchSource.RECOMMENDED_CAREERS,
                0.86,
                10_000,
                order_offset,
            )
        ]
    return []


def _resolve_history_references(
    message: str,
    normalized_message: str,
    history_careers: list[ResolvedCareer],
    order_offset: int,
) -> list[_Candidate]:
    if not history_careers:
        return []

    reference = _reference_span(normalized_message, HISTORY_BOTH_REFERENCES)
    if reference:
        start, end, phrase = reference
        return [
            _make_candidate(
                career.canonical_title,
                _display_match_from_message(message, (start, end), phrase),
                CareerMatchSource.HISTORY,
                0.78,
                11_000 + index,
                order_offset + index,
            )
            for index, career in enumerate(history_careers[:2])
        ]

    for phrases, index in (
        (HISTORY_FIRST_REFERENCES, 0),
        (HISTORY_SECOND_REFERENCES, 1),
    ):
        reference = _reference_span(normalized_message, phrases)
        if reference and len(history_careers) > index:
            start, end, phrase = reference
            return [
                _make_candidate(
                    history_careers[index].canonical_title,
                    _display_match_from_message(message, (start, end), phrase),
                    CareerMatchSource.HISTORY,
                    0.82,
                    11_000 + index,
                    order_offset,
                )
            ]

    reference = _reference_span(normalized_message, HISTORY_LAST_REFERENCES)
    if reference:
        start, end, phrase = reference
        career = history_careers[-1]
        return [
            _make_candidate(
                career.canonical_title,
                _display_match_from_message(message, (start, end), phrase),
                CareerMatchSource.HISTORY,
                0.76,
                11_000,
                order_offset,
            )
        ]
    return []


def resolve_career_entities(
    message: str,
    career_titles: Iterable[str] | None = None,
    matches: Sequence | None = None,
    history: Sequence | None = None,
    include_history: bool = True,
) -> list[ResolvedCareer]:
    normalized_message = normalize_message(message)
    if not normalized_message:
        return []

    catalog = _build_catalog(career_titles, matches)
    history_careers = (
        _resolve_history_careers(history, catalog, matches)
        if include_history and history
        else []
    )
    history_career_norms = {normalize_phrase(career.canonical_title) for career in history_careers}
    recommended_career_norms = _canonical_norms_for_titles(catalog.recommended_titles, catalog)
    alias_norms = set(_normalized_alias_map())
    candidates: list[_Candidate] = []
    order = 0

    for source, titles in (
        (CareerMatchSource.DYNAMIC_CATALOG, catalog.dynamic_titles),
        (CareerMatchSource.RECOMMENDED_CAREERS, catalog.recommended_titles),
    ):
        for title in titles:
            title_norm = normalize_phrase(title)
            for span in find_phrase_spans(normalized_message, title_norm):
                candidates.append(
                    _make_candidate(
                        _canonical_for_title(title, catalog),
                        _display_match_from_message(message, span, title),
                        source,
                        0.9 if source == CareerMatchSource.RECOMMENDED_CAREERS else 0.88,
                        span[0],
                        order,
                    )
                )
                order += 1

    for alias_norm, alias_display, canonical_title in _normalized_alias_items():
        if not _canonical_is_known(canonical_title, catalog):
            continue
        spans = find_phrase_spans(normalized_message, alias_norm)
        for span in spans:
            if not _short_alias_allowed(
                message,
                normalized_message,
                alias_norm,
                span,
                canonical_title,
                recommended_career_norms,
                history_career_norms,
            ):
                continue
            candidates.append(
                _make_candidate(
                    canonical_title,
                    _display_match_from_message(message, span, alias_display),
                    CareerMatchSource.ALIAS,
                    0.92 if alias_norm in SHORT_ALIASES else 0.96,
                    span[0],
                    order,
                )
            )
            order += 1

    for title in catalog.default_titles:
        title_norm = normalize_phrase(title)
        if title_norm in alias_norms:
            continue
        for span in find_phrase_spans(normalized_message, title_norm):
            candidates.append(
                _make_candidate(
                    title,
                    _display_match_from_message(message, span, title),
                    CareerMatchSource.CANONICAL,
                    1.0,
                    span[0],
                    order,
                )
            )
            order += 1

    candidates.extend(
        _resolve_recommended_references(message, normalized_message, catalog, order + 1_000)
    )
    candidates.extend(
        _resolve_history_references(
            message,
            normalized_message,
            history_careers,
            order + 2_000,
        )
    )
    return _dedupe_candidates(candidates)


def _matching_signals(
    normalized_message: str,
    signals: Iterable[str],
) -> list[str]:
    return [
        signal
        for signal in signals
        if contains_phrase(normalized_message, normalize_phrase(signal))
    ]


def detect_safety(message: str) -> SafetyDetectionResult:
    normalized_message = normalize_message(message)
    if not normalized_message:
        return SafetyDetectionResult(result=SafetyResult.SAFE)

    crisis_matches = _matching_signals(normalized_message, CRISIS_SIGNALS)
    if crisis_matches:
        return SafetyDetectionResult(
            result=SafetyResult.CRISIS,
            matched_signals=crisis_matches,
        )

    harmful_matches = _matching_signals(normalized_message, HARMFUL_REQUEST_SIGNALS)
    if harmful_matches:
        return SafetyDetectionResult(
            result=SafetyResult.HARMFUL,
            matched_signals=harmful_matches,
        )

    return SafetyDetectionResult(result=SafetyResult.SAFE)


def classify_safety(message: str) -> SafetyResult:
    return detect_safety(message).result


def classify_scope_rules(
    message: str,
    career_titles: Iterable[str] | None = None,
    matches: Sequence | None = None,
    history: Sequence | None = None,
) -> ScopeDetectionResult:
    normalized_message = normalize_message(message)
    if not normalized_message:
        return ScopeDetectionResult(result=ScopeResult.CLEARLY_OUT_OF_SCOPE)

    resolved_careers = resolve_career_entities(
        message,
        career_titles=career_titles,
        matches=matches,
        history=history,
    )
    general_matches = _matching_signals(normalized_message, GENERAL_CAREER_SIGNALS)
    comparison_matches = _matching_signals(normalized_message, CAREER_COMPARISON_SIGNALS)
    comparison_word_matches = _matching_signals(normalized_message, COMPARISON_WORDS)
    reference_matches = _matching_signals(normalized_message, CAREER_REFERENCE_WORDS)
    study_matches = _matching_signals(normalized_message, STUDY_SIGNALS)
    direct_answer_matches = _matching_signals(normalized_message, DIRECT_ANSWER_SIGNALS)
    implementation_matches = _matching_signals(normalized_message, IMPLEMENTATION_REQUEST_SIGNALS)
    small_talk_matches = _matching_signals(normalized_message, SMALL_TALK_SIGNALS)

    has_career_comparison = bool(comparison_matches) or (
        bool(comparison_word_matches)
        and (bool(reference_matches) or bool(resolved_careers))
    )
    career_or_study_signals = (
        general_matches
        + comparison_matches
        + comparison_word_matches
        + reference_matches
        + study_matches
    )

    if implementation_matches and not career_or_study_signals:
        return ScopeDetectionResult(
            result=ScopeResult.CLEARLY_OUT_OF_SCOPE,
            matched_signals=implementation_matches,
            resolved_careers=resolved_careers,
        )

    if direct_answer_matches and not career_or_study_signals and not resolved_careers:
        return ScopeDetectionResult(
            result=ScopeResult.CLEARLY_OUT_OF_SCOPE,
            matched_signals=direct_answer_matches,
            resolved_careers=resolved_careers,
        )

    if career_or_study_signals or has_career_comparison or resolved_careers:
        return ScopeDetectionResult(
            result=ScopeResult.IN_SCOPE,
            matched_signals=career_or_study_signals,
            resolved_careers=resolved_careers,
        )

    if small_talk_matches:
        return ScopeDetectionResult(
            result=ScopeResult.IN_SCOPE,
            matched_signals=small_talk_matches,
            resolved_careers=resolved_careers,
        )

    return ScopeDetectionResult(
        result=ScopeResult.UNCERTAIN,
        resolved_careers=resolved_careers,
    )


def detect_scope(
    message: str,
    career_titles: Iterable[str] | None = None,
    matches: Sequence | None = None,
    history: Sequence | None = None,
) -> ScopeDetectionResult:
    return classify_scope_rules(
        message,
        career_titles=career_titles,
        matches=matches,
        history=history,
    )


def classify_scope(
    message: str,
    career_titles: Iterable[str] | None = None,
    matches: Sequence | None = None,
    history: Sequence | None = None,
) -> ScopeResult:
    return classify_scope_rules(
        message,
        career_titles=career_titles,
        matches=matches,
        history=history,
    ).result
