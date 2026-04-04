from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import List

from ..models import StudentConceptMastery, Topic, Quiz

def schedule_review(student_id: int, topic_id: int, is_correct: bool, db: Session):
    record = db.query(StudentConceptMastery).filter(
        StudentConceptMastery.student_id == student_id,
        StudentConceptMastery.topic_id == topic_id
    ).first()
    
    if not record:
        return
    
    if is_correct:
        record.interval_days = min(30, record.interval_days * 2)
        record.next_review_date = datetime.now(timezone.utc) + timedelta(days=record.interval_days)
    else:
        record.interval_days = 1
        record.next_review_date = datetime.now(timezone.utc) + timedelta(days=1)
        
    db.flush()

def get_practice_queue(student_id: int, db: Session) -> List[dict]:
    now = datetime.now(timezone.utc)
    
    records = db.query(StudentConceptMastery).filter(
        StudentConceptMastery.student_id == student_id,
        (StudentConceptMastery.next_review_date <= now) | (StudentConceptMastery.next_review_date == None),
        StudentConceptMastery.mastery_score < 0.85
    ).order_by(StudentConceptMastery.mastery_score.asc()).all()
    
    queue = []
    for record in records:
        topic = db.query(Topic).filter(Topic.id == record.topic_id).first()
        if not topic: continue
            
        priority = "UPCOMING"
        if record.next_review_date:
            days_diff = (record.next_review_date - now).days
            if days_diff <= 0:
                priority = "DUE TODAY"
            elif days_diff <= 2:
                priority = "DUE SOON"
                
        status = 'moderate'
        m_score = record.mastery_score
        if m_score < 0.35:
            status = 'critical'
        elif m_score < 0.5:
            status = 'weak'
            
        progress_pct = int(m_score * 100)
        
        related_quiz = db.query(Quiz).filter(Quiz.topic_id == topic.id).first()
        related_quiz_id = related_quiz.id if related_quiz else None

        queue.append({
            "topic_id": topic.id,
            "topic": topic.name,
            "mastery_score": m_score,
            "interval_days": record.interval_days,
            "next_review_date": record.next_review_date.isoformat() if record.next_review_date else None,
            "status": status,
            "priority": priority,
            "progress_pct": progress_pct,
            "related_quiz_id": related_quiz_id
        })
        
    return queue
