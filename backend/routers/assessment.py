from fastapi import APIRouter, Depends, HTTPException
from starlette.concurrency import run_in_threadpool

from core.career_match_explanations import (
    build_guest_career_matches_with_explanations,
    ensure_career_match_explanations,
)
from models.schemas import AssessmentSubmitRequest, MockUser
from db.database import (
    build_profile_from_assessment,
    build_transient_profile_from_assessment,
    get_profile_by_user_id,
    update_user,
)
from core.deps import get_current_user

router = APIRouter(prefix="/assessment", tags=["assessment"])


def _validated_answers(raw_answers: dict[str, int]) -> dict[str, int]:
    valid_answers = {}
    for key, value in raw_answers.items():
        try:
            score = int(value)
            valid_answers[key] = max(1, min(5, score))
        except (ValueError, TypeError):
            valid_answers[key] = 3
    return valid_answers


@router.post("/guest/submit")
async def submit_guest_assessment(req: AssessmentSubmitRequest):
    valid_answers = _validated_answers(req.answers)
    profile = await run_in_threadpool(
        build_transient_profile_from_assessment,
        grade_level=req.gradeLevel,
        goals=req.goals,
        constraints=req.constraints,
        answers=valid_answers,
        gender=req.gender,
    )
    matches = await build_guest_career_matches_with_explanations(profile, limit=5)
    if not matches:
        raise HTTPException(
            status_code=503,
            detail="AI chưa tạo xong giải thích nghề nghiệp cho Top 5. Vui lòng thử lại sau ít phút.",
        )

    return {"message": "Success", "profile": profile, "matches": matches}


@router.post("/submit")
async def submit_assessment(
    req: AssessmentSubmitRequest,
    current_user: MockUser = Depends(get_current_user),
):
    user_updates = {}
    if req.name != current_user.name:
        user_updates["name"] = req.name
    if req.gender != current_user.gender:
        user_updates["gender"] = req.gender
    if req.gradeLevel != current_user.gradeLevel:
        user_updates["gradeLevel"] = req.gradeLevel

    if user_updates:
        await run_in_threadpool(update_user, current_user.id, user_updates)

    # Validate answers (min 1, max 5)
    valid_answers = _validated_answers(req.answers)

    existing = await run_in_threadpool(get_profile_by_user_id, current_user.id)
    if (
        existing
        and not user_updates
        and existing.gradeLevel == req.gradeLevel
        and existing.goals == req.goals
        and existing.constraints == req.constraints
        and existing.assessmentCompleted
        and existing.assessmentAnswers == valid_answers
    ):
        profile = existing
    else:
        profile = await run_in_threadpool(
            build_profile_from_assessment,
            user_id=current_user.id,
            grade_level=req.gradeLevel,
            goals=req.goals,
            constraints=req.constraints,
            answers=valid_answers,
        )

    explanations_ready = await ensure_career_match_explanations(current_user.id, profile, limit=5)
    if not explanations_ready:
        raise HTTPException(
            status_code=503,
            detail="AI chưa tạo xong giải thích nghề nghiệp cho Top 5. Vui lòng thử lại sau ít phút.",
        )

    return {"message": "Success", "profile": profile}
