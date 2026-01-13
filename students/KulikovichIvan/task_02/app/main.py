from fastapi import FastAPI, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta
import logging
from contextlib import asynccontextmanager
from typing import List, Optional
import uvicorn
import json

from database import engine, Base, get_db
import models
import schemas
import crud
from auth import (
    get_current_user, 
    get_current_active_user, 
    get_current_admin_user,
    create_access_token,
    verify_password,
    get_password_hash,
    security
)

import question_banks, achievements, export, certificates
from websocket import router as websocket_router, ConnectionManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

websocket_manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = next(get_db())
    try:
        admin_user = db.query(models.User).filter(
            models.User.email == "admin@quiz.com"
        ).first()
        
        if not admin_user:
            admin_user = models.User(
                email="admin@quiz.com",
                username="admin",
                full_name="Administrator",
                hashed_password=get_password_hash("admin123"),
                role=models.UserRole.ADMIN
            )
            db.add(admin_user)
            db.commit()
            logger.info("Default admin user created")
                
    except Exception as e:
        logger.error(f"Error during startup: {e}")
    finally:
        db.close()
    
    logger.info("Application startup complete")
    yield
    logger.info("Application shutdown")

app = FastAPI(
    title="Quiz Platform API",
    description="API for educational quiz platform 'Проверим быстро'",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500", "http://localhost:8000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    app.include_router(question_banks.router)
    app.include_router(achievements.router)
    app.include_router(export.router)
    app.include_router(certificates.router)
    app.include_router(websocket_router)
    logger.info("Bonus feature routers registered successfully")
except Exception as e:
    logger.warning(f"Some bonus feature routers not available: {e}")

@app.websocket("/ws/quiz/{quiz_id}")
async def websocket_quiz_progress(websocket: WebSocket, quiz_id: int):
    await websocket_manager.connect(websocket, f"quiz_{quiz_id}")
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "progress_update":
                await websocket_manager.broadcast({
                    "type": "progress_update",
                    "user_id": message.get("user_id"),
                    "quiz_id": quiz_id,
                    "progress": message.get("progress"),
                    "timestamp": datetime.now().isoformat()
                }, f"quiz_{quiz_id}")
    
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, f"quiz_{quiz_id}")

@app.post("/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    return crud.create_user(db=db, user=user)

@app.post("/login", response_model=schemas.Token)
def login_user(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=user_data.email)
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return schemas.Token(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at
        )
    )

@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    return current_user

@app.get("/users/me/stats")
def get_my_stats(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    attempts = crud.get_user_attempts(db, current_user.id)
    total_attempts = len(attempts)
    
    if total_attempts == 0:
        return {
            "total_attempts": 0,
            "avg_score": 0,
            "total_quizzes": 0,
            "best_score": 0
        }
    
    total_score = sum(a.total_points for a in attempts)
    max_total = sum(a.max_points for a in attempts)
    
    if max_total > 0:
        avg_score = (total_score / max_total * 100)
    else:
        avg_score = 0
    
    unique_quizzes = len(set(a.quiz_id for a in attempts))
    
    best_scores = []
    for a in attempts:
        if a.max_points > 0:
            score_percent = (a.total_points / a.max_points * 100)
            best_scores.append(score_percent)
    
    best_score = max(best_scores) if best_scores else 0
    
    return {
        "total_attempts": total_attempts,
        "avg_score": round(avg_score, 2),
        "total_quizzes": unique_quizzes,
        "best_score": round(best_score, 2)
    }

@app.get("/questions/{question_id}", response_model=schemas.QuestionResponse)
def read_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    quiz = crud.get_quiz(db, question.quiz_id)
    if not quiz.is_active and current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Quiz is not active")
    
    options = [schemas.OptionResponse(
        id=opt.id,
        text=opt.text,
        is_correct=opt.is_correct if current_user.role == schemas.UserRole.ADMIN else None,
        order_index=opt.order_index
    ) for opt in question.options]
    
    return schemas.QuestionResponse(
        id=question.id,
        text=question.text,
        explanation=question.explanation,
        points=question.points,
        order_index=question.order_index,
        options=options
    )

@app.get("/options/{option_id}", response_model=schemas.OptionResponse)
def read_option(
    option_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    option = db.query(models.Option).filter(models.Option.id == option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")
    
    question = db.query(models.Question).filter(models.Question.id == option.question_id).first()
    quiz = crud.get_quiz(db, question.quiz_id)
    
    if not quiz.is_active and current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Quiz is not active")
    
    return schemas.OptionResponse(
        id=option.id,
        text=option.text,
        is_correct=option.is_correct if current_user.role == schemas.UserRole.ADMIN else None,
        order_index=option.order_index
    )

@app.get("/results/{attempt_id}", response_model=schemas.QuizAttemptResponse)
def get_attempt_results(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    attempt = crud.get_attempt_by_id(db, attempt_id=attempt_id, user_id=current_user.id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    return attempt

@app.get("/users/me/attempts", response_model=List[schemas.QuizAttemptResponse])
def get_my_attempts(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return crud.get_user_attempts(db, user_id=current_user.id)

@app.get("/quizzes", response_model=List[schemas.QuizResponse])
def read_quizzes(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = Query(True, description="Show only active quizzes"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
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

@app.post("/attempts/{attempt_id}/validate-time")
def validate_attempt_time(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    attempt = crud.get_attempt_by_id(db, attempt_id=attempt_id, user_id=current_user.id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    if attempt.is_completed:
        raise HTTPException(status_code=400, detail="Attempt already completed")
    
    quiz = crud.get_quiz(db, attempt.quiz_id)
    time_limit = quiz.time_limit_minutes * 60
    time_spent = (datetime.utcnow() - attempt.started_at).total_seconds()
    
    return {
        "time_spent": int(time_spent),
        "time_limit": time_limit,
        "remaining_time": max(0, time_limit - int(time_spent)),
        "is_expired": time_spent > time_limit
    }

@app.get("/quizzes/{quiz_id}/stats")
def get_quiz_stats(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    quiz = crud.get_quiz(db, quiz_id=quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    attempts = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.quiz_id == quiz_id,
        models.QuizAttempt.is_completed == True
    ).all()
    
    if not attempts:
        return {
            "total_attempts": 0,
            "avg_score": 0,
            "completion_rate": 0
        }
    
    total_attempts = len(attempts)
    avg_score = sum(a.total_points / a.max_points * 100 for a in attempts if a.max_points > 0) / total_attempts
    
    return {
        "total_attempts": total_attempts,
        "avg_score": round(avg_score, 2),
        "best_score": round(max((a.total_points / a.max_points * 100) for a in attempts if a.max_points > 0), 2),
        "worst_score": round(min((a.total_points / a.max_points * 100) for a in attempts if a.max_points > 0), 2)
    }

@app.get("/quizzes/{quiz_id}", response_model=schemas.QuizDetailResponse)
def read_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    quiz = crud.get_quiz(db, quiz_id=quiz_id)
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

@app.post("/attempts/start", response_model=schemas.QuizAttemptResponse)
def start_quiz_attempt(
    quiz_start: schemas.QuizStart,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    quiz = crud.get_quiz(db, quiz_id=quiz_start.quiz_id)
    if not quiz or not quiz.is_active:
        raise HTTPException(status_code=404, detail="Quiz not found or not active")
    
    active_attempts = db.query(models.QuizAttempt).filter(
        and_(
            models.QuizAttempt.user_id == current_user.id,
            models.QuizAttempt.quiz_id == quiz_start.quiz_id,
            models.QuizAttempt.is_completed == False
        )
    ).all()
    
    if active_attempts:
        return active_attempts[0]
    
    attempt = crud.start_quiz_attempt(db, user_id=current_user.id, quiz_id=quiz_start.quiz_id)
    return attempt

@app.post("/attempts/{attempt_id}/submit", response_model=schemas.QuizAttemptResponse)
def submit_quiz_attempt(
    attempt_id: int,
    answers: schemas.AttemptCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    try:
        attempt = crud.submit_quiz_attempt(
            db, 
            attempt_id=attempt_id, 
            user_id=current_user.id, 
            answers=answers.answers
        )
        return attempt
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/attempts/{attempt_id}", response_model=schemas.QuizAttemptResponse)
def get_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    attempt = crud.get_attempt_by_id(db, attempt_id=attempt_id, user_id=current_user.id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    return attempt

@app.post("/admin/quizzes", response_model=schemas.QuizResponse)
def create_quiz(
    quiz: schemas.QuizCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    try:
        created_quiz = crud.create_quiz(db=db, quiz=quiz, creator_id=current_user.id)
        
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
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/admin/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    total_users = db.query(models.User).count()
    active_users = db.query(models.User).filter(models.User.is_active == True).count()
    total_attempts = db.query(models.QuizAttempt).count()
    
    completed_attempts = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.is_completed == True
    ).all()
    
    if completed_attempts:
        total_score = sum(a.total_points for a in completed_attempts)
        max_total = sum(a.max_points for a in completed_attempts)
        avg_score = (total_score / max_total * 100) if max_total > 0 else 0
    else:
        avg_score = 0
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_attempts": total_attempts,
        "avg_score": round(avg_score, 2)
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "service": "quiz-platform",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat(),
        "features": {
            "achievements": True,
            "question_banks": True,
            "export": True,
            "websocket": True,
            "certificates": True
        }
    }

@app.get("/protected-test")
async def protected_test(current_user: models.User = Depends(get_current_user)):
    return {
        "message": f"Hello {current_user.email}!",
        "role": current_user.role.value
    }

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )