from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from models import QuizAttempt, Response, StudentConceptMastery

def calculate_risk_score(student_id: int, db: Session) -> float:
    # Get all attempts sorted by most recent first
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == student_id,
        QuizAttempt.is_complete == True
    ).order_by(QuizAttempt.submitted_at.desc()).all()
    
    # Factor 1: Score Decline (0.4)
    score_decline = 0.0
    if len(attempts) >= 3:
        recent_avg = sum([a.score_pct or 0.0 for a in attempts[:3]]) / 3.0
        if len(attempts) >= 6:
            previous_avg = sum([a.score_pct or 0.0 for a in attempts[3:6]]) / 3.0
            score_decline = max(0.0, (previous_avg - recent_avg) / 100.0)
            
    # Factor 2: Gap Count (0.3)
    gap_count = db.query(StudentConceptMastery).filter(
        StudentConceptMastery.student_id == student_id,
        StudentConceptMastery.mastery_score < 0.5
    ).count()
    normalized_gaps = min(gap_count / 5.0, 1.0)
    
    # Factor 3: Frequency Drop (0.2)
    now = datetime.now(timezone.utc)
    this_week_count = 0
    last_week_count = 0
    
    for a in attempts:
        if not a.submitted_at: continue
        # Normalize to UTC before offset-naive comparison
        submitted_at = a.submitted_at
        if submitted_at.tzinfo is None:
             submitted_at = submitted_at.replace(tzinfo=timezone.utc)
        
        days_diff = (now - submitted_at).days
        if 0 <= days_diff <= 7:
            this_week_count += 1
        elif 8 <= days_diff <= 14:
            last_week_count += 1
                
    drop = 0.0
    if last_week_count > 0:
        drop = max(0.0, (last_week_count - this_week_count) / last_week_count)
        
    # Factor 4: Timing Anomaly (0.1)
    anomaly = 0.0
    if attempts:
        recent_attempt = attempts[0]
        responses = db.query(Response).filter(Response.attempt_id == recent_attempt.id).all()
        if responses:
            avg_time = sum([r.time_taken_seconds for r in responses]) / len(responses)
            if avg_time < 5 or avg_time > 120:
                anomaly = 0.8
                
    risk_score = 0.4 * score_decline + 0.3 * normalized_gaps + 0.2 * drop + 0.1 * anomaly
    risk_score = min(1.0, max(0.0, risk_score))
    
    # Save the risk score would typically be on the user, but we will return it for on-the-fly calc
    return risk_score
