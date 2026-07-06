from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class Role(str, Enum):
    ADMIN = "ADMIN"
    STUDENT = "STUDENT"

class UserStatus(str, Enum):
    ACTIVE = "ACTIVE"
    DISABLED = "DISABLED"

class MockUser(BaseModel):
    id: str
    email: str
    name: str
    passwordHash: str
    role: Role
    status: UserStatus
    gradeLevel: Optional[str] = None
    gender: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

class CareerProfile(BaseModel):
    id: str
    userId: str
    gradeLevel: str
    gender: Optional[str] = None
    interests: List[str]
    strengths: List[str]
    favoriteSubjects: List[str]
    values: List[str]
    riasec: List[str]
    goals: str
    constraints: str
    assessmentCompleted: bool
    assessmentAnswers: Dict[str, int]
    createdAt: datetime
    updatedAt: datetime

class CareerPath(BaseModel):
    id: str
    title: str
    cluster: str
    summary: str
    subjects: List[str]
    jobSkills: List[str]
    majors: List[str]
    activities: List[str]
    jobTasks: List[str]
    onetCode: Optional[str] = None
    featureVector: Optional[List[float]] = None
    featureVectorVersion: Optional[str] = None
    featureVectorUpdatedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime

class MutableCareerInput(BaseModel):
    title: str
    cluster: str
    summary: str
    subjects: List[str]
    jobSkills: List[str]
    majors: List[str]
    activities: List[str]
    jobTasks: List[str]

class Weights(BaseModel):
    favoriteSubjects: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    strengths: Optional[List[str]] = None
    values: Optional[List[str]] = None
    riasec: Optional[List[str]] = None

class AssessmentQuestion(BaseModel):
    id: str
    step: str # "subjects" | "interests" | "skills" | "values"
    prompt: str
    weights: Weights

class Message(BaseModel):
    role: str # "user" | "assistant"
    content: str
    createdAt: datetime

class Conversation(BaseModel):
    id: str
    userId: str
    title: str
    messages: List[Message]
    createdAt: datetime

# API Request/Response Schemas

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    gradeLevel: str

class AssessmentSubmitRequest(BaseModel):
    name: str
    gender: str = Field(..., min_length=1)
    gradeLevel: str
    goals: str = Field(..., min_length=5)
    constraints: str = Field(..., min_length=1)
    answers: Dict[str, int]

class AdvisorChatRequest(BaseModel):
    message: str
    conversationId: Optional[str] = None

class AdvisorHistoryMessage(BaseModel):
    role: str
    content: str

class GuestAdvisorChatRequest(AdvisorChatRequest):
    profile: Optional[CareerProfile] = None
    history: List[AdvisorHistoryMessage] = Field(default_factory=list)

class AdvisorChatResponse(BaseModel):
    answer: str
    conversationId: str

class GuestCareerMatchesRequest(BaseModel):
    profile: CareerProfile
    limit: int = Field(5, ge=1, le=10)

class ConversationSummary(BaseModel):
    id: str
    title: str
    createdAt: datetime
    updatedAt: datetime
    lastMessage: str = ""

class ConversationDetail(BaseModel):
    id: str
    title: str
    createdAt: datetime
    messages: List[Message]
