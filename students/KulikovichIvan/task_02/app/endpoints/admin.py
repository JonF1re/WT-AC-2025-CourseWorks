from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas, auth, models
from ..database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/quizzes", response_model=schemas.QuizResponse)
def create_quiz(
    quiz: schemas.QuizCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_admin_user)
):
    try:
        created_quiz = crud.create_quiz(db=db, quiz=quiz, creator_id=current_user.id)
        
        # Calculate questions count and total points
        questions_count = len(quiz.questions)
        total_points = sum(q.points for q in quiz.questions)
        
        return schemas.QuizResponse(
            id=created_quiz.id,
            title=created_quiz.title,
            description=created_quiz.description,
            time_limit_minutes=created_quiz.time_limit_minutes,
            creator_id=created_quiz.creator_id,
            is_active=created_quiz.is_active,
            created_at=created_quiz.created_at,
            questions_count=questions_count,
            total_points=total_points
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/quizzes/{quiz_id}", response_model=schemas.QuizResponse)
def update_quiz(
    quiz_id: int,
    quiz_update: schemas.QuizUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_admin_user)
):
    updated_quiz = crud.update_quiz(db, quiz_id=quiz_id, quiz_update=quiz_update)
    if not updated_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    questions_count = len(updated_quiz.questions) if updated_quiz.questions else 0
    total_points = sum(q.points for q in updated_quiz.questions) if updated_quiz.questions else 0
    
    return schemas.QuizResponse(
        id=updated_quiz.id,
        title=updated_quiz.title,
        description=updated_quiz.description,
        time_limit_minutes=updated_quiz.time_limit_minutes,
        creator_id=updated_quiz.creator_id,
        is_active=updated_quiz.is_active,
        created_at=updated_quiz.created_at,
        questions_count=questions_count,
        total_points=total_points
    )

@router.delete("/quizzes/{quiz_id}")
def delete_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_admin_user)
):
    success = crud.delete_quiz(db, quiz_id=quiz_id)
    if not success:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    return {"message": "Quiz deleted successfully"}

@router.get("/stats", response_model=schemas.UserStats)
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_admin_user)
):
    return crud.get_admin_stats(db)

@router.get("/users", response_model=List[schemas.UserResponse])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_admin_user)
):
    users = crud.get_users(db, skip=skip, limit=limit)
    return users