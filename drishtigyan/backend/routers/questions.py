from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import json

import models, auth, schemas
from database import get_db
from services.gemini_service import generate_question

router = APIRouter()

@router.get("/topics")
def list_topics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    topics = db.query(models.Topic).order_by(models.Topic.name.asc()).all()
    return [{"id": t.id, "name": t.name, "subject": t.subject} for t in topics]

@router.get("/")
def list_questions(
    topic: Optional[str] = None, 
    difficulty: Optional[str] = None, 
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_teacher)
):
    query = db.query(models.Question).filter(models.Question.is_active == True)
    
    if topic:
        t = db.query(models.Topic).filter(models.Topic.name == topic).first()
        if t: query = query.filter(models.Question.topic_id == t.id)
    if difficulty and difficulty != "All":
        query = query.filter(models.Question.difficulty == difficulty)
    if search:
        query = query.filter(models.Question.text.ilike(f"%{search}%"))
        
    questions = query.all()
    out = []
    
    for q in questions:
        t = db.query(models.Topic).filter(models.Topic.id == q.topic_id).first()
        try:
            opts = json.loads(q.options)
        except:
            opts = eval(q.options) if q.options else []
            
        corr_opt = opts[q.correct_index] if 0 <= q.correct_index < len(opts) else ""
        
        responses = db.query(models.Response).filter(models.Response.question_id == q.id).all()
        corr_rate = sum(1 for r in responses if r.is_correct) / max(1, len(responses))
        
        out.append({
            "id": q.id,
            "text": q.text,
            "options": opts,
            "correct_index": q.correct_index,
            "correct_option": corr_opt,
            "topic": t.name if t else "Unknown",
            "topic_id": q.topic_id,
            "difficulty": q.difficulty,
            "created_at": q.created_at.isoformat() if q.created_at else None,
            "total_attempts": len(responses),
            "correct_rate": round(corr_rate, 2)
        })
        
    return {
        "questions": out,
        "total": len(out),
        "page": 1
    }

@router.post("/", response_model=schemas.QuestionOut)
def add_question(question: schemas.QuestionCreate, current_user: models.User = Depends(auth.get_current_teacher), db: Session = Depends(get_db)):
    new_q = models.Question(
        text=question.text,
        options=json.dumps(question.options),
        correct_index=question.correct_index,
        topic_id=question.topic_id,
        difficulty=question.difficulty,
        created_by=current_user.id
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)
    
    t = db.query(models.Topic).filter(models.Topic.id == new_q.topic_id).first()
    
    return schemas.QuestionOut(
        id=new_q.id,
        text=new_q.text,
        options=question.options,
        correct_index=new_q.correct_index,
        topic_id=new_q.topic_id,
        difficulty=new_q.difficulty,
        topic=t.name if t else "Unknown",
        created_at=new_q.created_at
    )

from pydantic import BaseModel
class GenerateQuestionReq(BaseModel):
    topic_id: int
    difficulty: str

@router.post("/generate-ai")
def generate_ai_question(req: GenerateQuestionReq, current_user: models.User = Depends(auth.get_current_teacher), db: Session = Depends(get_db)):
    topic = db.query(models.Topic).filter(models.Topic.id == req.topic_id).first()
    if not topic: raise HTTPException(404, "Topic not found")
        
    existing = db.query(models.Question).filter(models.Question.topic_id == req.topic_id).order_by(models.Question.created_at.desc()).limit(3).all()
    existing_texts = [q.text for q in existing]
    
    return generate_question(topic.name, req.difficulty, existing_texts)

@router.put("/{question_id}")
def update_question(question_id: int, q_in: schemas.QuestionCreate, current_user: models.User = Depends(auth.get_current_teacher), db: Session = Depends(get_db)):
    q = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not q: raise HTTPException(404, "Question not found")
        
    q.text = q_in.text
    q.options = json.dumps(q_in.options)
    q.correct_index = q_in.correct_index
    q.difficulty = q_in.difficulty
    q.topic_id = q_in.topic_id
    
    db.commit()
    return {"status": "ok"}

@router.delete("/{question_id}")
def delete_question(question_id: int, current_user: models.User = Depends(auth.get_current_teacher), db: Session = Depends(get_db)):
    q = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not q: raise HTTPException(404, "Question not found")
        
    q.is_active = False # Soft delete
    db.commit()
    return {"status": "deleted"}
