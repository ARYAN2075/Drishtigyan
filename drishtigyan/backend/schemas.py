from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

# Auth Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# Topic Schemas
class TopicBase(BaseModel):
    name: str
    subject: str = "Mathematics"
    description: Optional[str] = None
    parent_id: Optional[int] = None

class TopicOut(TopicBase):
    id: int

    class Config:
        from_attributes = True

# Question Schemas
class QuestionBase(BaseModel):
    text: str
    options: List[str]
    correct_index: int
    topic_id: int
    difficulty: str = "Medium"

class QuestionCreate(QuestionBase):
    pass

class QuestionOut(QuestionBase):
    id: int
    topic: Optional[str] = None # Will map from topic name
    created_at: datetime
    
    class Config:
        from_attributes = True

class QuestionOutStudent(BaseModel):
    id: int
    text: str
    options: List[str]
    topic: str
    difficulty: str
    order_position: int

    class Config:
        from_attributes = True

# Quiz Schemas
class QuizBase(BaseModel):
    title: str
    description: Optional[str] = None
    topic_id: Optional[int] = None
    difficulty: str = "Medium"
    time_limit_minutes: int = 15

class QuizCreate(QuizBase):
    question_ids: List[int]

class QuizOut(QuizBase):
    id: int
    topic: Optional[str] = None
    question_count: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class QuizDetailOut(QuizOut):
    questions: List[QuestionOutStudent] = []

# Quiz Attempt & Submit
class AnswerSubmit(BaseModel):
    question_id: int
    selected_index: int
    time_taken_seconds: int

class QuizSubmitReq(BaseModel):
    attempt_id: int
    answers: List[AnswerSubmit]
    total_time_seconds: int

# Responses
class PerQuestionResult(BaseModel):
    question_id: int
    question_text: str
    selected_index: int
    correct_index: int
    is_correct: bool
    selected_option: str
    correct_option: str
    all_options: List[str]
    time_taken_seconds: int
    topic: str

class GapDetected(BaseModel):
    topic: str
    topic_id: Optional[int] = None
    mastery_score: float
    status: str
    root_cause_topic: Optional[str] = None
    root_cause_topic_id: Optional[int] = None
    root_cause_explanation: Optional[str] = None

class QuizSubmitRes(BaseModel):
    attempt_id: int
    score_pct: float
    correct_count: int
    total_questions: int
    time_taken_seconds: int
    time_formatted: str
    gaps_detected: List[GapDetected]
    per_question_results: List[PerQuestionResult]
