from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from models.schemas import MockUser, Role, UserStatus, MutableCareerInput
from db.database import (
    create_career,
    create_user,
    delete_career,
    delete_user,
    hash_password,
    list_careers,
    list_profiles,
    list_users,
    update_career,
    update_user,
)
from core.career_engine import get_career_matches, has_completed_current_assessment
from core.deps import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

def require_admin(user: MockUser = Depends(get_current_user)):
    if user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


class AdminCreateUserRequest(BaseModel):
    name: str
    email: str
    password: str
    role: Role
    gradeLevel: str | None = None


class AdminUpdateUserRequest(BaseModel):
    role: Role
    status: UserStatus
    gradeLevel: str | None = None

@router.get("/users")
def get_users(admin: MockUser = Depends(require_admin)):
    return list_users()


@router.post("/users")
def add_user(req: AdminCreateUserRequest, admin: MockUser = Depends(require_admin)):
    email = req.email.strip().lower()
    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        raise HTTPException(status_code=400, detail="Invalid email")

    user = create_user(
        email=email,
        name=req.name,
        password_hash=hash_password(req.password),
        role=req.role,
        grade_level=req.gradeLevel,
    )
    if not user:
        raise HTTPException(status_code=400, detail="Email already exists")
    return user


@router.put("/users/{user_id}")
def edit_user(user_id: str, req: AdminUpdateUserRequest, admin: MockUser = Depends(require_admin)):
    user = update_user(
        user_id,
        {
            "role": req.role,
            "status": req.status,
            "gradeLevel": req.gradeLevel,
        },
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.delete("/users/{user_id}")
def remove_user(user_id: str, admin: MockUser = Depends(require_admin)):
    delete_user(user_id)
    return {"message": "Success"}


@router.get("/profiles")
def get_profiles(admin: MockUser = Depends(require_admin)):
    return list_profiles()


@router.get("/top-clusters")
def get_top_clusters(admin: MockUser = Depends(require_admin)):
    careers = list_careers()
    counts: dict[str, int] = {}
    for profile in list_profiles():
        if not has_completed_current_assessment(profile):
            continue
        matches = get_career_matches(profile, careers)
        if not matches:
            continue
        cluster = matches[0]["cluster"]
        counts[cluster] = counts.get(cluster, 0) + 1
    return counts

@router.get("/careers")
def get_careers(admin: MockUser = Depends(require_admin)):
    return list_careers()

@router.post("/careers")
def add_career(req: MutableCareerInput, admin: MockUser = Depends(require_admin)):
    return create_career(req.model_dump())

@router.put("/careers/{career_id}")
def edit_career(career_id: str, req: MutableCareerInput, admin: MockUser = Depends(require_admin)):
    career = update_career(career_id, req.model_dump())
    if not career:
        raise HTTPException(status_code=404, detail="Career not found")
    return career

@router.delete("/careers/{career_id}")
def remove_career(career_id: str, admin: MockUser = Depends(require_admin)):
    delete_career(career_id)
    return {"message": "Success"}
