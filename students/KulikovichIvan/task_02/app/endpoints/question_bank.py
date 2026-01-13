from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base
from sqlalchemy import DateTime, func

# таблица связи вопросов с банками
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
    tags = Column(String(500))  # JSON строка с тегами
    is_public = Column(Boolean, default=False)
    creator_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    creator = relationship("User", back_populates="question_banks")
    questions = relationship("Question", secondary=question_bank_association, back_populates="banks")
    
    randomize_questions = Column(Boolean, default=False)
    randomize_options = Column(Boolean, default=False)
    questions_per_quiz = Column(Integer, default=10)  # скок вопросов брать из банка