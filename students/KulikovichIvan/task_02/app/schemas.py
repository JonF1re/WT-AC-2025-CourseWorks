from pydantic import BaseModel, EmailStr, validator, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Quiz schemas
class OptionBase(BaseModel):
    text: str
    is_correct: bool = False

class OptionCreate(OptionBase):
    pass

class OptionResponse(OptionBase):
    id: int
    is_correct: Optional[bool] = None  # Изменено на Optional для пользователей
    
    model_config = ConfigDict(from_attributes=True)

class QuestionBase(BaseModel):
    text: str
    explanation: Optional[str] = None
    points: int = Field(1, ge=1, le=10)

class QuestionCreate(QuestionBase):
    options: List[OptionCreate]

class QuestionResponse(QuestionBase):
    id: int
    options: List[OptionResponse]
    
    model_config = ConfigDict(from_attributes=True)

class QuizBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    time_limit_minutes: int = Field(5, ge=1, le=60)

class QuizCreate(QuizBase):
    questions: List[QuestionCreate]

class QuizResponse(QuizBase):
    id: int
    creator_id: int
    is_active: bool
    created_at: datetime
    questions_count: int
    total_points: int
    
    model_config = ConfigDict(from_attributes=True)

class QuizDetailResponse(QuizResponse):
    questions: List[QuestionResponse]

# Attempt schemas
class AnswerSubmission(BaseModel):
    question_id: int
    option_id: int

class QuizStart(BaseModel):
    quiz_id: int

class AttemptCreate(BaseModel):
    answers: List[AnswerSubmission]

class AttemptAnswerResponse(BaseModel):
    id: int
    question_id: int
    option_id: Optional[int]
    is_correct: bool
    points_earned: int
    
    model_config = ConfigDict(from_attributes=True)

class QuizAttemptResponse(BaseModel):
    id: int
    user_id: int
    quiz_id: int
    started_at: datetime
    finished_at: Optional[datetime]
    time_spent_seconds: Optional[int]
    total_points: int
    max_points: int
    is_completed: bool
    
    model_config = ConfigDict(from_attributes=True)

# Добавляем новые схемы для бонусных функций

# Банки вопросов
class QuestionBankBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    is_public: bool = False
    randomize_questions: bool = False
    randomize_options: bool = False
    questions_per_quiz: int = Field(10, ge=1, le=100)

class QuestionBankCreate(QuestionBankBase):
    pass

class QuestionBankResponse(QuestionBankBase):
    id: int
    creator_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class QuizFromBankCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    time_limit_minutes: int = Field(5, ge=1, le=60)
    is_active: bool = True

# Достижения
class AchievementType(str, Enum):
    QUIZ_COMPLETED = "quiz_completed"
    PERFECT_SCORE = "perfect_score"
    FAST_COMPLETION = "fast_completion"
    STREAK = "streak"
    MASTER = "master"
    COLLECTOR = "collector"

class AchievementBase(BaseModel):
    name: str
    description: str
    type: AchievementType
    icon: Optional[str] = None
    points_required: int = 0
    quizzes_required: int = 0
    perfect_scores_required: int = 0
    time_limit_seconds: Optional[int] = None
    streak_days_required: int = 0

class AchievementResponse(AchievementBase):
    id: int
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)

class UserAchievementResponse(BaseModel):
    id: int
    user_id: int
    achievement_id: int
    earned_at: datetime
    progress: int = 0
    achievement: AchievementResponse
    
    model_config = ConfigDict(from_attributes=True)

class ExportRequest(BaseModel):
    format: str = Field("json", pattern="^(json|csv|excel)$")
    quiz_id: Optional[int] = None
    user_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class CertificateBase(BaseModel):
    user_id: int
    attempt_id: int
    quiz_title: str
    score_percentage: float
    issued_at: datetime

class CertificateResponse(CertificateBase):
    id: int
    certificate_id: str
    download_url: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class CertificateGenerateRequest(BaseModel):
    attempt_id: int
    template: Optional[str] = "default"

class LeaderboardEntry(BaseModel):
    user_id: int
    username: str
    total_points: int
    completed_quizzes: int
    achievements_count: int
    rank: int
    
    model_config = ConfigDict(from_attributes=True)

class WebSocketMessage(BaseModel):
    type: str
    data: Dict[str, Any] = {}
    timestamp: datetime = Field(default_factory=datetime.now)

class UserStatsResponse(BaseModel):
    total_attempts: int
    avg_score: float
    total_quizzes: int
    best_score: float
    achievements_count: int
    total_points: int
    streak_days: int
    
    model_config = ConfigDict(from_attributes=True)

class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_attempts: int
    avg_score: float
    total_quizzes: int
    active_quizzes: int
    
    model_config = ConfigDict(from_attributes=True)