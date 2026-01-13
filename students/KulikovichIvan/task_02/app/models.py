from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base

class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True)
    full_name = Column(String(200))
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    attempts = relationship("QuizAttempt", back_populates="user")
    created_quizzes = relationship("Quiz", back_populates="creator")
    question_banks = relationship("QuestionBank", back_populates="creator")
    achievements = relationship("UserAchievement", back_populates="user")

class Quiz(Base):
    __tablename__ = "quizzes"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    creator_id = Column(Integer, ForeignKey("users.id"))
    time_limit_minutes = Column(Integer, default=5)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    creator = relationship("User", back_populates="created_quizzes")
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="quiz")

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    text = Column(Text, nullable=False)
    explanation = Column(Text)
    points = Column(Integer, default=1)
    order_index = Column(Integer, default=0)
    
    quiz = relationship("Quiz", back_populates="questions")
    options = relationship("Option", back_populates="question", cascade="all, delete-orphan")
    banks = relationship("QuestionBank", secondary="question_bank_association", back_populates="questions")

class Option(Base):
    __tablename__ = "options"
    
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    text = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False)
    order_index = Column(Integer, default=0)
    
    question = relationship("Question", back_populates="options")
    attempt_answers = relationship("AttemptAnswer", back_populates="selected_option")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True))
    time_spent_seconds = Column(Integer)
    total_points = Column(Integer, default=0)
    max_points = Column(Integer, default=0)
    is_completed = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="attempts")
    quiz = relationship("Quiz", back_populates="attempts")
    answers = relationship("AttemptAnswer", back_populates="attempt", cascade="all, delete-orphan")

class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"
    
    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("quiz_attempts.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    option_id = Column(Integer, ForeignKey("options.id"))
    is_correct = Column(Boolean, default=False)
    points_earned = Column(Integer, default=0)
    answered_at = Column(DateTime(timezone=True), server_default=func.now())
    
    attempt = relationship("QuizAttempt", back_populates="answers")
    selected_option = relationship("Option", back_populates="attempt_answers")


question_bank_association = Table(
    'question_bank_association',
    Base.metadata,
    Column('question_id', Integer, ForeignKey('questions.id'), primary_key=True),
    Column('question_bank_id', Integer, ForeignKey('question_banks.id'), primary_key=True)
)

class QuestionBank(Base):
    __tablename__ = "question_banks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    tags = Column(String(500))
    is_public = Column(Boolean, default=False)
    creator_id = Column(Integer, ForeignKey("users.id"))
    randomize_questions = Column(Boolean, default=False)
    randomize_options = Column(Boolean, default=False)
    questions_per_quiz = Column(Integer, default=10)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    creator = relationship("User", back_populates="question_banks")
    questions = relationship("Question", secondary=question_bank_association, back_populates="banks")

class AchievementType(str, enum.Enum):
    QUIZ_COMPLETED = "quiz_completed"
    PERFECT_SCORE = "perfect_score"
    FAST_COMPLETION = "fast_completion"
    STREAK = "streak"
    MASTER = "master"
    COLLECTOR = "collector"

class Achievement(Base):
    __tablename__ = "achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    type = Column(Enum(AchievementType))
    icon = Column(String(200))
    points_required = Column(Integer, default=0)
    quizzes_required = Column(Integer, default=0)
    perfect_scores_required = Column(Integer, default=0)
    time_limit_seconds = Column(Integer)
    streak_days_required = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

class UserAchievement(Base):
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)
    earned_at = Column(DateTime(timezone=True), server_default=func.now())
    progress = Column(Integer, default=0)
    
    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement")

class Certificate(Base):
    __tablename__ = "certificates"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    attempt_id = Column(Integer, ForeignKey("quiz_attempts.id"), nullable=False)
    certificate_id = Column(String(100), unique=True, index=True)
    quiz_title = Column(String(200))
    score_percentage = Column(Float)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    download_url = Column(String(500))
    
    user = relationship("User")
    attempt = relationship("QuizAttempt")