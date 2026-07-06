from fastapi import APIRouter, HTTPException, Response, Depends
from models.schemas import LoginRequest, RegisterRequest, MockUser, Role, UserStatus
from db.database import get_user_by_email, create_user, verify_password, hash_password
from core.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login")
def login(req: LoginRequest):
    user = get_user_by_email(req.email)
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Tài khoản không tồn tại hoặc đã bị khóa.")
    
    if not verify_password(req.password, user.passwordHash):
        raise HTTPException(status_code=400, detail="Email hoặc mật khẩu không đúng.")
    
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register")
def register(req: RegisterRequest):
    email = req.email.lower()
    user = create_user(
        email=email,
        name=req.name,
        password_hash=hash_password(req.password),
        role=Role.STUDENT,
        grade_level=req.gradeLevel
    )
    if not user:
        raise HTTPException(status_code=400, detail="Không tạo được tài khoản.")
        
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}

from core.deps import get_current_user

@router.get("/me")
def get_me(current_user: MockUser = Depends(get_current_user)):
    return current_user
