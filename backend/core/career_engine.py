import unicodedata
from typing import Any, Dict, List, Optional

from core.vector_features import (
    build_student_feature_vector,
    cosine_similarity,
    has_complete_assessment_answers,
    similarity_percent,
)
from models.schemas import CareerPath, CareerProfile


DIMENSION_WEIGHTS = {
    "subjects": 0.45,
    "jobSkills": 0.35,
    "majors": 0.20,
}

_QUESTION_FIELDS = {
    "subjects": "favoriteSubjects",
    "interests": "interests",
    "skills": "strengths",
    "values": "values",
}


def normalize(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.strip().lower())
    normalized = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    return normalized.replace("đ", "d").replace("Ä‘", "d")


def _cosine(student_weights: Dict[str, float], career_tags: List[str]) -> float:
    if not student_weights or not career_tags:
        return 0.0
    career_set = {normalize(tag) for tag in career_tags}
    dot = sum(weight for tag, weight in student_weights.items() if tag in career_set)
    norm_student = sum(weight * weight for weight in student_weights.values()) ** 0.5
    norm_career = len(career_set) ** 0.5
    if norm_student == 0 or norm_career == 0:
        return 0.0
    return dot / (norm_student * norm_career)


def _build_student_profile(profile: CareerProfile) -> Optional[Dict[str, Any]]:
    answers = profile.assessmentAnswers or {}
    if not answers:
        return None

    from db.assessment_questions import assessment_questions

    buckets: Dict[str, Dict[str, float]] = {key: {} for key in _QUESTION_FIELDS}
    for question in assessment_questions:
        weight = answers.get(question.id, 3) - 3
        if weight == 0:
            continue
        for bucket_key, field in _QUESTION_FIELDS.items():
            tags = getattr(question.weights, field) or []
            bucket = buckets[bucket_key]
            for tag in tags:
                key = normalize(tag)
                bucket[key] = bucket.get(key, 0.0) + weight

    return buckets


def _liked_overlap(student_map: Dict[str, float], career_tags: List[str]) -> List[str]:
    return [tag for tag in career_tags if student_map.get(normalize(tag), 0.0) > 0]


def _build_reasons(student: Dict[str, Any], career: CareerPath) -> List[str]:
    subjects = _liked_overlap(student["subjects"], career.subjects)
    job_skills = _liked_overlap(student["skills"], career.jobSkills)
    majors = _liked_overlap({**student["interests"], **student["values"]}, career.majors)

    return [
        f"Khớp môn học em hứng thú: {', '.join(subjects[:4])}."
        if subjects
        else "Môn học liên quan chưa khớp mạnh, có thể thử một hoạt động nhỏ để kiểm chứng.",
        f"Khớp {len(job_skills)} kỹ năng em tự đánh giá tốt: {', '.join(job_skills[:4])}."
        if job_skills
        else "Cần thêm dữ liệu về kỹ năng để gợi ý chắc hơn.",
        f"Ngành học liên quan có điểm giao với sở thích/giá trị: {', '.join(majors[:3])}."
        if majors
        else "Nên xem danh sách ngành học liên quan và thử một hoạt động trải nghiệm.",
    ]


def build_student_vector(profile: CareerProfile | None) -> list[float] | None:
    return build_student_feature_vector(profile.assessmentAnswers) if profile else None


def has_completed_current_assessment(profile: CareerProfile | None) -> bool:
    return bool(
        profile
        and profile.assessmentCompleted
        and has_complete_assessment_answers(profile.assessmentAnswers)
        and build_student_vector(profile)
    )


def _build_vector_reasons(student_vector: list[float], career: CareerPath, score: int) -> list[str]:
    if score >= 75:
        main_reason = "Nhiều câu trả lời của em cho thấy nghề này là một hướng rất đáng để tìm hiểu sâu hơn."
    elif score >= 55:
        main_reason = "Hồ sơ của em có một số điểm gần với nghề này, nên đây là lựa chọn phù hợp để khám phá thêm."
    else:
        main_reason = "Nghề này có một vài điểm liên quan đến hồ sơ của em, nhưng em nên xem như một gợi ý mở để tham khảo."

    return [
        f"Mức độ phù hợp gợi ý: {score}%.",
        main_reason,
        "Em nên xem chi tiết nghề, môn học liên quan và thử một hoạt động nhỏ trước khi quyết định.",
    ]

def _make_vector_match(
    student_vector: list[float],
    career: CareerPath,
    similarity: float | None = None,
) -> Dict[str, Any] | None:
    career_vector = career.featureVector
    if not career_vector:
        return None

    if similarity is None:
        similarity = cosine_similarity(student_vector, career_vector)
    score = similarity_percent(similarity)

    return {
        **career.model_dump(),
        "score": score,
        "reasons": _build_vector_reasons(student_vector, career, score),
    }


def get_career_matches_from_ranked(
    profile: CareerProfile | None,
    ranked_careers: list[tuple[CareerPath, float]],
    limit: int = 5,
) -> List[Dict[str, Any]]:
    student_vector = build_student_vector(profile)
    if not student_vector:
        return [
            {
                **career.model_dump(),
                "score": 50,
                "reasons": ["Cần làm assessment để cá nhân hoá điểm phù hợp và lý do gợi ý."],
            }
            for career, _ in ranked_careers[:limit]
        ]

    matches = [
        match
        for career, similarity in ranked_careers
        if (match := _make_vector_match(student_vector, career, similarity)) is not None
    ]
    return matches[:limit]


def get_career_matches(
    profile: CareerProfile | None,
    careers: List[CareerPath],
    limit: int = 5,
) -> List[Dict[str, Any]]:
    student_vector = build_student_vector(profile)
    if student_vector:
        vector_matches = [
            match
            for career in careers
            if (match := _make_vector_match(student_vector, career)) is not None
        ]
        if vector_matches:
            return sorted(vector_matches, key=lambda x: (-x["score"], x["title"]))[:limit]

    student = _build_student_profile(profile) if profile else None
    if not student:
        baseline = [
            {
                **career.model_dump(),
                "score": 50,
                "reasons": ["Cần làm assessment để cá nhân hoá điểm phù hợp và lý do gợi ý."],
            }
            for career in careers
        ]
        return sorted(baseline, key=lambda x: x["title"])[:limit]

    matches = []
    for career in careers:
        subject_fit = max(0.0, _cosine(student["subjects"], career.subjects))
        skill_fit = max(0.0, _cosine(student["skills"], career.jobSkills))
        major_fit = max(0.0, _cosine({**student["interests"], **student["values"]}, career.majors))

        combined = (
            DIMENSION_WEIGHTS["subjects"] * subject_fit
            + DIMENSION_WEIGHTS["jobSkills"] * skill_fit
            + DIMENSION_WEIGHTS["majors"] * major_fit
        )
        score = max(0, min(100, round(combined * 100)))

        matches.append(
            {
                **career.model_dump(),
                "score": score,
                "reasons": _build_reasons(student, career),
            }
        )

    return sorted(matches, key=lambda x: (-x["score"], x["title"]))[:limit]
