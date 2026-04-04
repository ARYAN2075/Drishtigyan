from sqlalchemy.orm import Session
import math
from ..models import StudentConceptMastery, Question, Topic

def update_irt_theta(student_id: int, topic_id: int, is_correct: bool, question_difficulty_b: float, db: Session):
    record = db.query(StudentConceptMastery).filter(
        StudentConceptMastery.student_id == student_id,
        StudentConceptMastery.topic_id == topic_id
    ).first()
    
    if not record:
        record = StudentConceptMastery(
            student_id=student_id,
            topic_id=topic_id,
        )
        db.add(record)
    
    current_theta = record.theta
    
    p = 1.0 / (1.0 + math.exp(-(current_theta - question_difficulty_b)))
    
    if is_correct:
        new_theta = current_theta + 0.2 * (1.0 - p)
    else:
        new_theta = current_theta - 0.2 * p
        
    # Clamp to [-4.0, 4.0]
    record.theta = max(-4.0, min(4.0, new_theta))
    
    db.flush()

def recalculate_question_difficulty(question_id: int, db: Session):
    pass
    # Optional logic for adaptive questioning (Out of Scope for minimal implementation)
