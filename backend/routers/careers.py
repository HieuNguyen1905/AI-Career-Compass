from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from starlette.concurrency import run_in_threadpool

from core.career_engine import has_completed_current_assessment
from core.career_match_explanations import (
    build_career_matches,
    build_guest_career_matches_with_explanations,
    read_cached_explanations_or_schedule,
)
from core.deps import get_current_user
from db.database import get_career_by_id, get_profile_by_user_id, list_careers
from models.schemas import GuestCareerMatchesRequest, MockUser

router = APIRouter(prefix="/careers", tags=["careers"])


@router.get("/")
def get_careers():
    return list_careers()


@router.post("/guest/matches")
async def get_guest_matches(req: GuestCareerMatchesRequest):
    if not has_completed_current_assessment(req.profile):
        raise HTTPException(
            status_code=403,
            detail="Vui lòng hoàn thành đầy đủ bài đánh giá hiện tại trước khi xem gợi ý nghề nghiệp.",
        )

    matches = await build_guest_career_matches_with_explanations(req.profile, limit=req.limit)
    if not matches:
        raise HTTPException(
            status_code=503,
            detail="AI chưa tạo xong giải thích nghề nghiệp cho Top 5. Vui lòng thử lại sau ít phút.",
        )
    return matches


@router.get("/matches")
async def get_matches(
    background_tasks: BackgroundTasks,
    explain: bool = Query(True),
    limit: int = Query(5, ge=1, le=10),
    current_user: MockUser = Depends(get_current_user),
):
    # Nguồn xếp hạng duy nhất: tính ở backend rồi frontend hiển thị (tránh trùng lặp logic).
    profile = await run_in_threadpool(get_profile_by_user_id, current_user.id)
    if not has_completed_current_assessment(profile):
        raise HTTPException(
            status_code=403,
            detail="Vui lòng hoàn thành đầy đủ bài đánh giá hiện tại trước khi xem gợi ý nghề nghiệp.",
        )

    safe_limit = max(1, min(10, limit))
    matches = await build_career_matches(profile, safe_limit)

    if not explain:
        return matches

    return await read_cached_explanations_or_schedule(
        current_user.id,
        profile,
        matches,
        background_tasks,
    )


@router.get("/{career_id}")
def get_career(career_id: str):
    career = get_career_by_id(career_id)
    if not career:
        raise HTTPException(status_code=404, detail="Career not found")
    return career
