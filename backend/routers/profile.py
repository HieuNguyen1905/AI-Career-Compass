from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from models.schemas import MockUser
from db.database import get_profile_by_user_id, update_user, upsert_profile
from core.deps import get_current_user

router = APIRouter(prefix="/profile", tags=["profile"])

class UpdateProfileRequest(BaseModel):
    name: str
    gender: Optional[str] = None
    gradeLevel: Optional[str] = None
    goals: Optional[str] = None
    constraints: Optional[str] = None

@router.get("/")
def get_my_profile(current_user: MockUser = Depends(get_current_user)):
    profile = get_profile_by_user_id(current_user.id)
    return profile

@router.post("/")
def update_my_profile(req: UpdateProfileRequest, current_user: MockUser = Depends(get_current_user)):
    existing = get_profile_by_user_id(current_user.id)

    next_grade_level = req.gradeLevel if req.gradeLevel is not None else (existing.gradeLevel if existing else current_user.gradeLevel)
    user_updates = {}
    if req.name != current_user.name:
        user_updates["name"] = req.name
    if req.gender != current_user.gender:
        user_updates["gender"] = req.gender
    if next_grade_level != current_user.gradeLevel:
        user_updates["gradeLevel"] = next_grade_level

    if user_updates:
        update_user(current_user.id, user_updates)

    profile_payload = {
        "gradeLevel": next_grade_level if next_grade_level is not None else "",
        "interests": existing.interests if existing else [],
        "strengths": existing.strengths if existing else [],
        "favoriteSubjects": existing.favoriteSubjects if existing else [],
        "values": existing.values if existing else [],
        "riasec": existing.riasec if existing else [],
        "goals": req.goals if req.goals is not None else (existing.goals if existing else ""),
        "constraints": req.constraints if req.constraints is not None else (existing.constraints if existing else ""),
        "assessmentCompleted": existing.assessmentCompleted if existing else False,
        "assessmentAnswers": existing.assessmentAnswers if existing else {}
    }

    if (
        existing
        and not user_updates
        and profile_payload["gradeLevel"] == existing.gradeLevel
        and profile_payload["goals"] == existing.goals
        and profile_payload["constraints"] == existing.constraints
    ):
        return {"message": "Success"}

    upsert_profile(current_user.id, profile_payload)

    return {"message": "Success"}
