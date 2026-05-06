from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List

from models import QuizAttempt, Response, Question, StudentConceptMastery, Topic, TopicDependency
from services.irt_engine import update_irt_theta
from services.spaced_repetition import schedule_review
from services.risk_scorer import calculate_risk_score

def analyze_quiz_attempt(attempt_id: int, db: Session):
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt:
        return []

    responses = db.query(Response).filter(Response.attempt_id == attempt_id).all()
    
    for resp in responses:
        question = db.query(Question).filter(Question.id == resp.question_id).first()
        if not question or not question.topic_id:
            continue
            
        topic_id = question.topic_id
        is_correct = resp.is_correct
        
        # 1. Update Mastery
        update_mastery(attempt.student_id, topic_id, is_correct, db)
        
        # 2. Update IRT Theta
        update_irt_theta(attempt.student_id, topic_id, is_correct, question.difficulty_b, db)
        
        # 3. Schedule next review (Spaced Repetition)
        schedule_review(attempt.student_id, topic_id, is_correct, db)
        
    db.commit()
    
    # 4. Update overall risk score
    calculate_risk_score(attempt.student_id, db)
    
    return get_gaps(attempt.student_id, db)

def update_mastery(student_id: int, topic_id: int, is_correct: bool, db: Session):
    record = db.query(StudentConceptMastery).filter(
        StudentConceptMastery.student_id == student_id,
        StudentConceptMastery.topic_id == topic_id
    ).first()
    
    if not record:
        record = StudentConceptMastery(
            student_id=student_id,
            topic_id=topic_id,
            mastery_score=0.5,
            theta=0.0,
            total_attempts=0,
            correct_count=0
        )
        db.add(record)
    
    current_mastery = record.mastery_score
    if is_correct:
        new_mastery = current_mastery + 0.3 * (1.0 - current_mastery)
        record.correct_count += 1
    else:
        new_mastery = current_mastery * 0.75
        
    # Clamp to [0.05, 0.98]
    record.mastery_score = max(0.05, min(0.98, new_mastery))
    record.total_attempts += 1
    record.last_attempted = datetime.now(timezone.utc)
    
    db.flush()

def get_gaps(student_id: int, db: Session) -> List[dict]:
    weak_records = db.query(StudentConceptMastery).filter(
        StudentConceptMastery.student_id == student_id,
        StudentConceptMastery.mastery_score < 0.6
    ).all()
    
    gaps = []
    for record in weak_records:
        topic = db.query(Topic).filter(Topic.id == record.topic_id).first()
        if not topic: continue
            
        m_score = record.mastery_score
        status = 'moderate'
        if m_score < 0.35:
            status = 'critical'
        elif m_score < 0.5:
            status = 'weak'

        root_cause_topic = None
        root_cause_topic_id = None
        root_cause_explanation = None

        # Check for root cause
        dependencies = db.query(TopicDependency).filter(TopicDependency.topic_id == topic.id).all()
        for dep in dependencies:
            prereq = db.query(Topic).filter(Topic.id == dep.prerequisite_id).first()
            if prereq:
                prereq_mastery = db.query(StudentConceptMastery).filter(
                    StudentConceptMastery.student_id == student_id,
                    StudentConceptMastery.topic_id == prereq.id
                ).first()
                if not prereq_mastery or prereq_mastery.mastery_score < 0.6:
                    root_cause_topic = prereq.name
                    root_cause_topic_id = prereq.id
                    root_cause_explanation = f"Your difficulty with {topic.name} may be caused by gaps in {prereq.name} understanding."
                    break

        if not root_cause_topic and dependencies:
            root_cause_explanation = "Concept application issue. You have strong prerequisites."
            
        gaps.append({
            "topic_id": topic.id,
            "topic": topic.name,
            "mastery_score": m_score,
            "status": status,
            "root_cause_topic": root_cause_topic,
            "root_cause_topic_id": root_cause_topic_id,
            "root_cause_explanation": root_cause_explanation
        })
    return gaps
