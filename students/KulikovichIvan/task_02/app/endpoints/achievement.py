from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from database import Base
from sqlalchemy import DateTime, func


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
    icon = Column(String(200))  # URL иконки
    points_required = Column(Integer, default=0)
    quizzes_required = Column(Integer, default=0)
    perfect_scores_required = Column(Integer, default=0)
    time_limit_seconds = Column(Integer)  # Для быстрого прохождения
    streak_days_required = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

class UserAchievement(Base):
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)
    earned_at = Column(DateTime(timezone=True), server_default=func.now())
    progress = Column(Integer, default=0)  # Текущий прогресс (для многоуровневых)
    
    # Связи
    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement")