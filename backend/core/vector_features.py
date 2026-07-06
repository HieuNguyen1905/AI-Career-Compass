import math
import re
import unicodedata
from typing import Any


FEATURE_KEYS = [
    "R",
    "I",
    "A",
    "S",
    "E",
    "C",
    "QuantitativeReasoning",
    "VerbalCommunication",
    "ScientificThinking",
    "SocialUnderstanding",
    "TechnologyAffinity",
    "AnalyticalProblemSolving",
    "Independence",
    "Collaboration",
    "Leadership",
    "Creativity",
]

FEATURE_DISPLAY_NAMES = {
    "R": "Realistic - thực tế/kỹ thuật",
    "I": "Investigative - tìm hiểu/phân tích",
    "A": "Artistic - sáng tạo/nghệ thuật",
    "S": "Social - hỗ trợ/con người",
    "E": "Enterprising - dẫn dắt/kinh doanh",
    "C": "Conventional - cấu trúc/quy trình",
    "QuantitativeReasoning": "tư duy định lượng",
    "VerbalCommunication": "giao tiếp ngôn ngữ",
    "ScientificThinking": "tư duy khoa học",
    "SocialUnderstanding": "thấu hiểu xã hội",
    "TechnologyAffinity": "mức độ phù hợp với công nghệ",
    "AnalyticalProblemSolving": "giải quyết vấn đề phân tích",
    "Independence": "tính độc lập",
    "Collaboration": "hợp tác",
    "Leadership": "lãnh đạo",
    "Creativity": "sáng tạo",
}

# Each feature has exactly two assessment questions.
FEATURE_QUESTION_IDS = {
    "R": ("q_r_hands_on", "q_r_tools_build"),
    "I": ("q_i_research", "q_i_patterns"),
    "A": ("q_a_visual_expression", "q_a_original_ideas"),
    "S": ("q_s_support", "q_s_teach"),
    "E": ("q_e_persuade", "q_e_initiate"),
    "C": ("q_c_structure", "q_c_detail"),
    "QuantitativeReasoning": ("q_quant_numbers", "q_quant_models"),
    "VerbalCommunication": ("q_verbal_explain", "q_verbal_write"),
    "ScientificThinking": ("q_science_experiment", "q_science_evidence"),
    "SocialUnderstanding": ("q_social_empathy", "q_social_context"),
    "TechnologyAffinity": ("q_tech_tools", "q_tech_automation"),
    "AnalyticalProblemSolving": ("q_analytical_breakdown", "q_analytical_compare"),
    "Independence": ("q_independent_plan", "q_independent_deepwork"),
    "Collaboration": ("q_collab_team", "q_collab_feedback"),
    "Leadership": ("q_leadership_coordinate", "q_leadership_decide"),
    "Creativity": ("q_creativity_many_ideas", "q_creativity_prototype"),
}

QUESTION_FEATURE_MAP = {
    question_id: feature
    for feature, question_ids in FEATURE_QUESTION_IDS.items()
    for question_id in question_ids
}
REQUIRED_QUESTION_IDS = tuple(QUESTION_FEATURE_MAP)

VECTOR_VERSION = "career-matrix-16-centered-v1"


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.strip().lower())
    normalized = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    return normalized.replace("đ", "d")


def slugify(value: str) -> str:
    normalized = normalize_text(value)
    slug = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return slug or "career"


def clamp_likert(value: Any) -> float:
    try:
        score = float(value)
    except (TypeError, ValueError):
        score = 3.0
    return max(1.0, min(5.0, score))


def centered_feature_score(value: Any) -> float:
    # Excel and assessment both use 1..5. Centering keeps dislikes as negative signal.
    return (clamp_likert(value) - 3.0) / 2.0


def build_student_feature_vector(answers: dict[str, int] | None) -> list[float] | None:
    if not answers:
        return None

    vector = [
        sum(centered_feature_score(answers.get(question_id, 3)) for question_id in FEATURE_QUESTION_IDS[feature])
        / len(FEATURE_QUESTION_IDS[feature])
        for feature in FEATURE_KEYS
    ]
    if vector_norm(vector) == 0:
        return None
    return vector


def has_complete_assessment_answers(answers: dict[str, int] | None) -> bool:
    if not answers:
        return False

    for question_id in REQUIRED_QUESTION_IDS:
        if question_id not in answers:
            return False
        try:
            score = int(answers[question_id])
        except (TypeError, ValueError):
            return False
        if score < 1 or score > 5:
            return False
    return True


def vector_norm(vector: list[float]) -> float:
    return math.sqrt(sum(value * value for value in vector))


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if len(left) != len(right) or not left:
        return 0.0
    denominator = vector_norm(left) * vector_norm(right)
    if denominator == 0:
        return 0.0
    return sum(a * b for a, b in zip(left, right)) / denominator


def similarity_percent(similarity: float) -> int:
    return max(0, min(100, round(max(0.0, similarity) * 100)))


def parse_pgvector(value: Any) -> list[float] | None:
    if value is None:
        return None
    if isinstance(value, list):
        vector = [float(item) for item in value]
    else:
        text = str(value).strip()
        if not text:
            return None
        text = text.strip("[]")
        vector = [float(item.strip()) for item in text.split(",") if item.strip()]
    return vector if len(vector) == len(FEATURE_KEYS) else None


def format_pgvector(vector: list[float]) -> str:
    if len(vector) != len(FEATURE_KEYS):
        raise ValueError(f"Expected {len(FEATURE_KEYS)} feature values, got {len(vector)}.")
    return "[" + ",".join(f"{value:.6f}" for value in vector) + "]"


def top_feature_alignments(student_vector: list[float], career_vector: list[float], limit: int = 3) -> list[str]:
    scored = []
    for feature, student_value, career_value in zip(FEATURE_KEYS, student_vector, career_vector):
        product = student_value * career_value
        if product <= 0:
            continue
        scored.append((product, feature, student_value, career_value))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [FEATURE_DISPLAY_NAMES[feature] for _, feature, _, _ in scored[:limit]]
