from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # 'student' or 'teacher'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    questions_created = relationship("Question", back_populates="creator")
    quizzes_created = relationship("Quiz", back_populates="creator")
    quiz_attempts = relationship("QuizAttempt", back_populates="student")
    mastery_records = relationship("StudentConceptMastery", back_populates="student")
    notifications = relationship("Notification", back_populates="user")

class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    subject = Column(String(100), default="Mathematics")
    description = Column(String(500))
    parent_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    
    questions = relationship("Question", back_populates="topic")
    quizzes = relationship("Quiz", back_populates="topic")
    mastery_records = relationship("StudentConceptMastery", back_populates="topic")

    prerequisites = relationship("TopicDependency", foreign_keys="[TopicDependency.topic_id]", back_populates="topic")
    dependents = relationship("TopicDependency", foreign_keys="[TopicDependency.prerequisite_id]", back_populates="prerequisite")

class TopicDependency(Base):
    __tablename__ = "topic_dependencies"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"))
    prerequisite_id = Column(Integer, ForeignKey("topics.id"))
    
    topic = relationship("Topic", foreign_keys=[topic_id], back_populates="prerequisites")
    prerequisite = relationship("Topic", foreign_keys=[prerequisite_id], back_populates="dependents")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String(1000), nullable=False)
    options = Column(String(2000), nullable=False)  # JSON string: ["opt1","opt2","opt3","opt4"]
    correct_index = Column(Integer, nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"))
    difficulty = Column(String(20), default="Medium")
    difficulty_b = Column(Float, default=0.0)
    discrimination_a = Column(Float, default=1.0)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

    creator = relationship("User", back_populates="questions_created")
    topic = relationship("Topic", back_populates="questions")
    quiz_associations = relationship("QuizQuestion", back_populates="question")
    responses = relationship("Response", back_populates="question")

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(String(500))
    topic_id = Column(Integer, ForeignKey("topics.id"))
    difficulty = Column(String(20), default="Medium")
    time_limit_minutes = Column(Integer, default=15)
    is_published = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", back_populates="quizzes_created")
    topic = relationship("Topic", back_populates="quizzes")
    quiz_questions = relationship("QuizQuestion", back_populates="quiz")
    attempts = relationship("QuizAttempt", back_populates="quiz")

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    order_position = Column(Integer, default=0)

    quiz = relationship("Quiz", back_populates="quiz_questions")
    question = relationship("Question", back_populates="quiz_associations")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    score_pct = Column(Float, nullable=True)
    total_questions = Column(Integer)
    correct_count = Column(Integer, default=0)
    is_complete = Column(Boolean, default=False)
    time_taken_seconds = Column(Integer, nullable=True)

    student = relationship("User", back_populates="quiz_attempts")
    quiz = relationship("Quiz", back_populates="attempts")
    responses = relationship("Response", back_populates="attempt")


class Response(Base):
    __tablename__ = "responses"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("quiz_attempts.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    selected_index = Column(Integer, nullable=True)
    is_correct = Column(Boolean, nullable=False)
    time_taken_seconds = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    attempt = relationship("QuizAttempt", back_populates="responses")
    question = relationship("Question", back_populates="responses")


class StudentConceptMastery(Base):
    __tablename__ = "student_concept_mastery"
    __table_args__ = (UniqueConstraint('student_id', 'topic_id', name='_student_topic_uc'),)

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    topic_id = Column(Integer, ForeignKey("topics.id"))
    mastery_score = Column(Float, default=0.5)
    theta = Column(Float, default=0.0)
    next_review_date = Column(DateTime(timezone=True), nullable=True)
    interval_days = Column(Integer, default=1)
    last_attempted = Column(DateTime(timezone=True), nullable=True)
    total_attempts = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)

    student = relationship("User", back_populates="mastery_records")
    topic = relationship("Topic", back_populates="mastery_records")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(String(500))
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    type = Column(String(50))

    user = relationship("User", back_populates="notifications")
