from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import crud, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

@router.get("/", response_model=List[schemas.QuizResponse])
def read_quizzes(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = Query(True, description="Show only active quizzes"),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    quizzes = crud.get_quizzes(db, skip=skip, limit=limit, active_only=active_only)
    
    result = []
    for quiz in quizzes:
        
        questions_count = len(quiz.questions) if quiz.questions else 0
        total_points = sum(q.points for q in quiz.questions) if quiz.questions else 0
        
        result.append(schemas.QuizResponse(
            id=quiz.id,
            title=quiz.title,
            description=quiz.description,
            time_limit_minutes=quiz.time_limit_minutes,
            creator_id=quiz.creator_id,
            is_active=quiz.is_active,
            created_at=quiz.created_at,
            questions_count=questions_count,
            total_points=total_points
        ))
    
    return result

@router.get("/{quiz_id}", response_model=schemas.QuizDetailResponse)
def read_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    quiz = crud.get_quiz_with_questions(db, quiz_id=quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    if not quiz.is_active and current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Quiz is not active")
    
    questions = []
    for question in quiz.questions:
        options = [schemas.OptionResponse(
            id=opt.id,
            text=opt.text,
            is_correct=opt.is_correct if current_user.role == schemas.UserRole.ADMIN else None,
            order_index=opt.order_index
        ) for opt in question.options]
        
        questions.append(schemas.QuestionResponse(
            id=question.id,
            text=question.text,
            explanation=question.explanation,
            points=question.points,
            order_index=question.order_index,
            options=options
        ))
    
    return schemas.QuizDetailResponse(
        id=quiz.id,
        title=quiz.title,
        description=quiz.description,
        time_limit_minutes=quiz.time_limit_minutes,
        creator_id=quiz.creator_id,
        is_active=quiz.is_active,
        created_at=quiz.created_at,
        questions_count=len(questions),
        total_points=sum(q.points for q in questions),
        questions=questions
    )

@router.get("/{quiz_id}/stats")
def get_quiz_stats(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    stats = crud.get_quiz_stats(db, quiz_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    return stats