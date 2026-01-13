from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db
from auth import get_current_user
import schemas

router = APIRouter(prefix="/achievements", tags=["achievements"])

@router.get("/my", response_model=List[schemas.UserAchievementResponse])
def get_my_achievements(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получение достижений текущего пользователя"""

    return []

@router.get("/available", response_model=List[schemas.AchievementResponse])
def get_available_achievements(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получение всех доступных достижений"""

    return [
        schemas.AchievementResponse(
            id=1,
            name="Новичок",
            description="Пройдите свой первый квиз",
            type=schemas.AchievementType.QUIZ_COMPLETED,
            quizzes_required=1,
            is_active=True
        ),
        schemas.AchievementResponse(
            id=2,
            name="Перфекционист",
            description="Получите 100% в квизе",
            type=schemas.AchievementType.PERFECT_SCORE,
            perfect_scores_required=1,
            is_active=True
        )
    ]

@router.get("/leaderboard", response_model=List[schemas.LeaderboardEntry])
def get_achievements_leaderboard(
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Таблица лидеров по достижениям"""
 
    return [
        schemas.LeaderboardEntry(
            user_id=current_user.id,
            username=current_user.username,
            total_points=100,
            completed_quizzes=5,
            achievements_count=2,
            rank=1
        )
    ]