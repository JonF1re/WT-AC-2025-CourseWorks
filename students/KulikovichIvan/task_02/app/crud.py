from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime
import models
import schemas
from auth import get_password_hash


def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def create_quiz(db: Session, quiz: schemas.QuizCreate, creator_id: int):
    db_quiz = models.Quiz(
        title=quiz.title,
        description=quiz.description,
        time_limit_minutes=quiz.time_limit_minutes,
        creator_id=creator_id
    )
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)
    
    for q_idx, question_data in enumerate(quiz.questions):
        db_question = models.Question(
            quiz_id=db_quiz.id,
            text=question_data.text,
            explanation=question_data.explanation,
            points=question_data.points,
            order_index=q_idx
        )
        db.add(db_question)
        db.commit()
        db.refresh(db_question)
        
        for o_idx, option_data in enumerate(question_data.options):
            db_option = models.Option(
                question_id=db_question.id,
                text=option_data.text,
                is_correct=option_data.is_correct,
                order_index=o_idx
            )
            db.add(db_option)
    
    db.commit()
    return db_quiz

def get_quiz(db: Session, quiz_id: int):
    return db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()

def get_quizzes(db: Session, skip: int = 0, limit: int = 100, active_only: bool = True):
    query = db.query(models.Quiz)
    if active_only:
        query = query.filter(models.Quiz.is_active == True)
    return query.offset(skip).limit(limit).all()


def start_quiz_attempt(db: Session, user_id: int, quiz_id: int):
    db_attempt = models.QuizAttempt(
        user_id=user_id,
        quiz_id=quiz_id
    )
    db.add(db_attempt)
    db.commit()
    db.refresh(db_attempt)
    return db_attempt

def submit_quiz_attempt(db: Session, attempt_id: int, user_id: int, answers: List[schemas.AnswerSubmission]):
    db_attempt = db.query(models.QuizAttempt).filter(
        and_(
            models.QuizAttempt.id == attempt_id,
            models.QuizAttempt.user_id == user_id,
            models.QuizAttempt.is_completed == False
        )
    ).first()
    
    if not db_attempt:
        raise ValueError("Attempt not found or already completed")
    
    quiz = get_quiz(db, db_attempt.quiz_id)
    time_limit = quiz.time_limit_minutes * 60
    time_spent = (datetime.utcnow() - db_attempt.started_at).total_seconds()
    
    total_points = 0
    max_points = 0
    
    questions = db.query(models.Question).filter(models.Question.quiz_id == quiz.id).all()
    
    for question in questions:
        max_points += question.points
        
        user_answer = next((a for a in answers if a.question_id == question.id), None)
        
        if user_answer:
            option = db.query(models.Option).filter(
                and_(
                    models.Option.id == user_answer.option_id,
                    models.Option.question_id == question.id
                )
            ).first()
            
            is_correct = option.is_correct if option else False
            points_earned = question.points if is_correct else 0
            total_points += points_earned
            
            db_answer = models.AttemptAnswer(
                attempt_id=attempt_id,
                question_id=question.id,
                option_id=user_answer.option_id if option else None,
                is_correct=is_correct,
                points_earned=points_earned
            )
            db.add(db_answer)
        else:
            db_answer = models.AttemptAnswer(
                attempt_id=attempt_id,
                question_id=question.id,
                option_id=None,
                is_correct=False,
                points_earned=0
            )
            db.add(db_answer)
    
    db_attempt.finished_at = datetime.utcnow()
    db_attempt.time_spent_seconds = int(time_spent)
    db_attempt.total_points = total_points
    db_attempt.max_points = max_points
    db_attempt.is_completed = True
    
    db.commit()
    db.refresh(db_attempt)
    return db_attempt

def get_user_attempts(db: Session, user_id: int):
    return db.query(models.QuizAttempt).filter(
        models.QuizAttempt.user_id == user_id
    ).order_by(models.QuizAttempt.started_at.desc()).all()

def get_attempt_by_id(db: Session, attempt_id: int, user_id: Optional[int] = None):
    query = db.query(models.QuizAttempt).filter(models.QuizAttempt.id == attempt_id)
    if user_id:
        query = query.filter(models.QuizAttempt.user_id == user_id)
    return query.first()


def get_question_banks(db: Session, user_id: int = None, category: str = None, 
                      tag: str = None, is_public: bool = True, skip: int = 0, 
                      limit: int = 100):
    """Получение списка банков вопросов"""
    query = db.query(models.QuestionBank)
    
    if user_id:
        query = query.filter(models.QuestionBank.creator_id == user_id)
    
    if category:
        query = query.filter(models.QuestionBank.category == category)
    
    if tag:
        query = query.filter(models.QuestionBank.tags.contains(tag))
    
    if is_public:
        query = query.filter(models.QuestionBank.is_public == True)
    
    return query.offset(skip).limit(limit).all()

def create_question_bank(db: Session, bank: schemas.QuestionBankCreate, creator_id: int):
    """Создание банка вопросов"""
    db_bank = models.QuestionBank(
        name=bank.name,
        description=bank.description,
        category=bank.category,
        tags=bank.tags,
        is_public=bank.is_public,
        randomize_questions=bank.randomize_questions,
        randomize_options=bank.randomize_options,
        questions_per_quiz=bank.questions_per_quiz,
        creator_id=creator_id
    )
    db.add(db_bank)
    db.commit()
    db.refresh(db_bank)
    return db_bank

def add_question_to_bank(db: Session, bank_id: int, question_id: int, user_id: int):
    """Добавление вопроса в банк"""
    bank = db.query(models.QuestionBank).filter(
        models.QuestionBank.id == bank_id,
        models.QuestionBank.creator_id == user_id
    ).first()
    
    if not bank:
        raise ValueError("Bank not found or access denied")
    
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise ValueError("Question not found")
    
    if question not in bank.questions:
        bank.questions.append(question)
        db.commit()
    
    return bank


def get_user_achievements(db: Session, user_id: int):
    """Получение достижений пользователя"""
    return db.query(models.UserAchievement).filter(
        models.UserAchievement.user_id == user_id
    ).all()

def get_all_achievements(db: Session):
    """Получение всех доступных достижений"""
    return db.query(models.Achievement).filter(
        models.Achievement.is_active == True
    ).all()

def get_achievement_leaderboard(db: Session, limit: int = 20):
    """Таблица лидеров по достижениям"""
    # Простая реализация - можно улучшить
    return db.query(models.User).order_by(
        db.query(models.UserAchievement).filter(
            models.UserAchievement.user_id == models.User.id
        ).count().desc()
    ).limit(limit).all()


def get_attempts_for_export(db: Session, quiz_id: int = None, user_id: int = None,
                           start_date: datetime = None, end_date: datetime = None):
    """Получение попыток для экспорта"""
    query = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.is_completed == True
    )
    
    if quiz_id:
        query = query.filter(models.QuizAttempt.quiz_id == quiz_id)
    
    if user_id:
        query = query.filter(models.QuizAttempt.user_id == user_id)
    
    if start_date:
        query = query.filter(models.QuizAttempt.started_at >= start_date)
    
    if end_date:
        query = query.filter(models.QuizAttempt.started_at <= end_date)
    
    return query.order_by(models.QuizAttempt.started_at.desc()).all()


def create_certificate(db: Session, user_id: int, attempt_id: int, certificate_id: str,
                      quiz_title: str, score_percentage: float):
    """Создание сертификата"""
    certificate = models.Certificate(
        user_id=user_id,
        attempt_id=attempt_id,
        certificate_id=certificate_id,
        quiz_title=quiz_title,
        score_percentage=score_percentage
    )
    db.add(certificate)
    db.commit()
    db.refresh(certificate)
    return certificate

def get_user_certificates(db: Session, user_id: int):
    """Получение сертификатов пользователя"""
    return db.query(models.Certificate).filter(
        models.Certificate.user_id == user_id
    ).order_by(models.Certificate.issued_at.desc()).all()

def get_certificate_by_id(db: Session, certificate_id: str):
    """Получение сертификата по ID"""
    return db.query(models.Certificate).filter(
        models.Certificate.certificate_id == certificate_id
    ).first()