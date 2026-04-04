from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from .. import models, auth
from ..database import get_db
from ..services.gemini_service import explain_gap, generate_study_plan

router = APIRouter()

class ExplainGapReq(BaseModel):
    topic_name: str
    question_text: str
    wrong_answer: str
    correct_answer: str

@router.post("/explain-gap")
def api_explain_gap(req: ExplainGapReq, current_user: models.User = Depends(auth.get_current_student)):
    return explain_gap(
        topic_name=req.topic_name,
        question_text=req.question_text,
        wrong_answer=req.wrong_answer,
        correct_answer=req.correct_answer,
        student_name=current_user.name
    )

class StudyPlanReq(BaseModel):
    student_id: int

@router.post("/study-plan")
def api_study_plan(req: StudyPlanReq, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Both student and teacher can request this
    weak_records = db.query(models.StudentConceptMastery).filter(
        models.StudentConceptMastery.student_id == req.student_id,
        models.StudentConceptMastery.mastery_score < 0.6
    ).all()
    
    weak_topics = []
    for r in weak_records:
        topic = db.query(models.Topic).filter(models.Topic.id == r.topic_id).first()
        if topic:
            weak_topics.append({
                "name": topic.name,
                "mastery_score": r.mastery_score,
                "theta": r.theta
            })
            
    student = db.query(models.User).filter(models.User.id == req.student_id).first()
    student_name = student.name if student else "Student"
    
    return generate_study_plan(student_name, weak_topics)

@router.get("/gap-recommendations")
def gap_recommendations(current_user: models.User = Depends(auth.get_current_student), db: Session = Depends(get_db)):
    records = db.query(models.StudentConceptMastery).filter(
        models.StudentConceptMastery.student_id == current_user.id,
        models.StudentConceptMastery.mastery_score < 0.7
    ).order_by(models.StudentConceptMastery.mastery_score.asc()).limit(6).all()

    recommendations = []
    for r in records:
        topic = db.query(models.Topic).filter(models.Topic.id == r.topic_id).first()
        if not topic:
            continue
        mastery_pct = round(r.mastery_score * 100, 1)
        technique = "Active Recall" if mastery_pct < 50 else "Spaced Review"
        recommendations.append({
            "topic_name": topic.name,
            "technique": technique,
            "recommendation": f"Revise {topic.name} fundamentals and solve 8-10 targeted problems.",
            "study_time_minutes": 25 if mastery_pct < 50 else 20
        })

    return {"recommendations": recommendations}
