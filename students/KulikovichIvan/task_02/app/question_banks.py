from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from auth import get_current_user, get_current_admin_user
import schemas
import crud

router = APIRouter(prefix="/question-banks", tags=["question-banks"])

@router.post("/", response_model=schemas.QuestionResponse)
def create_question_bank(
    bank: schemas.QuestionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Создание банка вопросов"""
    return crud.create_question_bank(db, bank, current_user.id)

@router.get("/", response_model=List[schemas.QuestionResponse])
def get_question_banks(
    category: Optional[str] = None,
    tag: Optional[str] = None,
    is_public: bool = Query(True),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получение списка банков вопросов"""
    return crud.get_question_banks(
        db, 
        user_id=current_user.id,
        category=category,
        tag=tag,
        is_public=is_public,
        skip=skip,
        limit=limit
    )

@router.post("/{bank_id}/questions/{question_id}")
def add_question_to_bank(
    bank_id: int,
    question_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Добавление вопроса в банк"""
    return crud.add_question_to_bank(db, bank_id, question_id, current_user.id)

@router.post("/{bank_id}/generate-quiz")
def generate_quiz_from_bank(
    bank_id: int,
    quiz_data: schemas.QuizFromBankCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin_user)
):
    """Генерация квиза из банка вопросов"""
    return crud.generate_quiz_from_bank(db, bank_id, quiz_data, current_user.id)