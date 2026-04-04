from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import json

from .. import models, auth
from ..database import get_db
from ..services.gemini_service import generate_ai_insight_for_student, generate_intervention_plan

router = APIRouter()

CACHE_TTL_SECONDS = 30
_CACHE = {
    "teacher_dashboard": {"ts": None, "data": None},
    "teacher_analytics": {"ts": None, "data": None},
}

def _get_cache(key: str):
    entry = _CACHE.get(key)
    if not entry or not entry["data"] or not entry["ts"]:
        return None
    if (datetime.now() - entry["ts"]).total_seconds() > CACHE_TTL_SECONDS:
        return None
    return entry["data"]

def _set_cache(key: str, data):
    _CACHE[key] = {"ts": datetime.now(), "data": data}

@router.get("/dashboard")
def get_dashboard(current_user: models.User = Depends(auth.get_current_teacher), db: Session = Depends(get_db)):
    cached = _get_cache("teacher_dashboard")
    if cached:
        return cached

    students = db.query(models.User).filter(models.User.role == "student").all()
    
    total_students = len(students)
    quizzes_created = db.query(models.Quiz).filter(models.Quiz.created_by == current_user.id).count()
    
    attempts = db.query(models.QuizAttempt).filter(models.QuizAttempt.is_complete == True).all()
    avg_class_score = sum([a.score_pct or 0.0 for a in attempts]) / max(1, len(attempts))
    
    all_mastery = db.query(models.StudentConceptMastery).all()
    topic_struggle_counts = {} # topic_id -> counts
    student_risks = set()
    
    for m in all_mastery:
        if m.mastery_score < 0.5:
            topic_struggle_counts[m.topic_id] = topic_struggle_counts.get(m.topic_id, 0) + 1
            if m.mastery_score < 0.35:
                student_risks.add(m.student_id)
                
    students_at_risk = len(student_risks)
    
    topic_difficulty = []
    most_struggling_topics = []
    for t_id, count in sorted(topic_struggle_counts.items(), key=lambda x: str(x[1]), reverse=True):
        topic = db.query(models.Topic).filter(models.Topic.id == t_id).first()
        if not topic: continue
            
        struggle_pct = int((count / max(1, total_students)) * 100)
        topic_difficulty.append({
            "topic": topic.name,
            "struggling_pct": struggle_pct
        })
        
        root_cause_topic = None
        from ..models import TopicDependency, StudentConceptMastery
        dependencies = db.query(TopicDependency).filter(TopicDependency.topic_id == t_id).all()
        for dep in dependencies:
            prereq = db.query(models.Topic).filter(models.Topic.id == dep.prerequisite_id).first()
            if prereq:
                # Check how many struggling students also struggle with prereq
                prereq_struggle = db.query(StudentConceptMastery).filter(
                    StudentConceptMastery.topic_id == prereq.id,
                    StudentConceptMastery.student_id.in_([m.student_id for m in all_mastery if m.topic_id == t_id and m.mastery_score < 0.5]),
                    StudentConceptMastery.mastery_score < 0.6
                ).count()
                
                # If majority of struggling students fail prereq
                if prereq_struggle > (count / 2):
                    root_cause_topic = prereq.name
                    break

        most_struggling_topics.append({
            "topic": topic.name,
            "struggling_students": count,
            "avg": sum([m.mastery_score for m in all_mastery if m.topic_id == t_id]) / max(1, count) * 100,
            "root_cause_topic": root_cause_topic
        })
        
    class_performance_trend = [
        {"date": "Week 1", "avg": 62},
        {"date": "Week 2", "avg": 65},
        {"date": "Week 3", "avg": 68},
        {"date": "Week 4", "avg": round(avg_class_score)}
    ]
    
    recent_activity = []
    for a in sorted(attempts, key=lambda x: str(x.submitted_at), reverse=True)[:5]:
        student = db.query(models.User).filter(models.User.id == a.student_id).first()
        quiz = db.query(models.Quiz).filter(models.Quiz.id == a.quiz_id).first()
        recent_activity.append({
            "text": f"{student.name if student else 'Student'} completed {quiz.title if quiz else 'Quiz'} — Score: {round(a.score_pct or 0.0)}%",
            "time": a.submitted_at.strftime("%b %d, %H:%M") if a.submitted_at else "",
            "type": "quiz_complete"
        })

    result = {
        "total_students": total_students,
        "avg_class_score": round(avg_class_score, 1),
        "students_at_risk": students_at_risk,
        "quizzes_created": quizzes_created,
        "class_performance_trend": class_performance_trend,
        "topic_difficulty": topic_difficulty[:5],
        "most_struggling_topics": most_struggling_topics[:3],
        "recent_activity": recent_activity
    }
    _set_cache("teacher_dashboard", result)
    return result

@router.get("/analytics")
def get_analytics(class_filter: Optional[str] = None, subject: Optional[str] = None, current_user: models.User = Depends(auth.get_current_teacher), db: Session = Depends(get_db)):
    cached = _get_cache("teacher_analytics")
    if cached:
        return cached

    attempts = db.query(models.QuizAttempt).filter(models.QuizAttempt.is_complete == True).all()
    class_avg_accuracy = sum([a.score_pct or 0.0 for a in attempts]) / max(1, len(attempts))
    quizzes_analyzed = len(attempts)
    
    topics = db.query(models.Topic).all()
    chart_data = []
    topic_table = []
    
    total_students = db.query(models.User).filter(models.User.role == "student").count()
    most_weak_topic = "None"
    most_weak_topic_id = None
    max_weak = 0
    
    for t in topics:
        mastery = db.query(models.StudentConceptMastery).filter(models.StudentConceptMastery.topic_id == t.id).all()
        if not mastery: continue
        
        strong = sum(1 for m in mastery if m.mastery_score >= 0.75)
        moderate = sum(1 for m in mastery if 0.5 <= m.mastery_score < 0.75)
        struggling = sum(1 for m in mastery if m.mastery_score < 0.5)
        
        avg_acc = int((sum(m.mastery_score for m in mastery) / len(mastery)) * 100)
        
        if struggling > max_weak:
            max_weak = struggling
            most_weak_topic = t.name
            most_weak_topic_id = t.id
            
        chart_data.append({
            "topic": t.name,
            "topic_id": t.id,
            "strong": strong,
            "moderate": moderate,
            "struggling": struggling,
            "total": len(mastery),
            "avg_accuracy": avg_acc
        })
        
        status = 'strong' if avg_acc > 75 else 'weak' if avg_acc < 50 else 'moderate'
        
        topic_table.append({
            "topic": t.name,
            "topic_id": t.id,
            "total_students": len(mastery),
            "struggling_count": struggling,
            "moderate_count": moderate,
            "strong_count": strong,
            "avg_accuracy": avg_acc,
            "status": status,
            "has_intervention": False
        })

    result = {
        "class_avg_accuracy": round(class_avg_accuracy),
        "most_weak_topic": most_weak_topic,
        "most_weak_topic_id": most_weak_topic_id,
        "quizzes_analyzed": quizzes_analyzed,
        "chart_data": chart_data,
        "topic_table": topic_table
    }
    _set_cache("teacher_analytics", result)
    return result

@router.get("/analytics/export-pdf")
def export_class_analytics_pdf(current_user: models.User = Depends(auth.get_current_teacher), db: Session = Depends(get_db)):
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    
    filename = f"/tmp/class_analytics_{datetime.now().strftime('%Y%m%d')}.pdf"
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    c.setFont("Helvetica-Bold", 18)
    c.drawString(50, height - 50, "Class Analytics Report")
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 80, f"Generated on: {datetime.now().strftime('%B %d, %Y')}")
    
    students = db.query(models.User).filter(models.User.role == "student").count()
    attempts = db.query(models.QuizAttempt).filter(models.QuizAttempt.is_complete == True).count()
    
    y = height - 120
    c.drawString(50, y, f"Total Students Enrolled: {students}")
    c.drawString(50, y - 25, f"Total Quizzes Completed: {attempts}")
    
    y -= 70
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "Topics Overview")
    c.setFont("Helvetica", 12)
    
    topics = db.query(models.Topic).all()
    y -= 30
    for t in topics:
        mastery = db.query(models.StudentConceptMastery).filter(models.StudentConceptMastery.topic_id == t.id).all()
        if not mastery: continue
        
        avg = int((sum(m.mastery_score for m in mastery) / len(mastery)) * 100)
        c.drawString(70, y, f"- {t.name}: {avg}% Average Accuracy")
        y -= 25
        if y < 100:
            c.showPage()
            y = height - 50

    c.save()
    
    return FileResponse(filename, filename=f"class_analytics_{datetime.now().strftime('%Y-%m-%d')}.pdf")

@router.get("/students")
def get_students(current_user: models.User = Depends(auth.get_current_teacher), db: Session = Depends(get_db)):
    students = db.query(models.User).filter(models.User.role == "student").all()
    
    result = []
    for s in students:
        attempts = db.query(models.QuizAttempt).filter(models.QuizAttempt.student_id == s.id, models.QuizAttempt.is_complete == True).all()
        avg = sum([a.score_pct for a in attempts]) / max(1, len(attempts)) if attempts else 0
        weak = db.query(models.StudentConceptMastery).filter(models.StudentConceptMastery.student_id == s.id, models.StudentConceptMastery.mastery_score < 0.5).count()
        
        # Calculate risk Score
        from ..services.risk_scorer import calculate_risk_score
        risk_score = calculate_risk_score(s.id, db)
        
        risk_level = "On Track"
        if risk_score >= 0.6: risk_level = "At Risk"
        elif risk_score >= 0.3: risk_level = "Needs Watch"
        
        last_active = max([a.submitted_at for a in attempts] + [datetime.min]) if attempts else None
        
        result.append({
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "quizzes_done": len(attempts),
            "avg_score": round(avg),
            "weak_topics_count": weak,
            "risk_score": round(risk_score, 2),
            "risk_level": risk_level,
            "last_active": last_active.strftime("%Y-%m-%d") if last_active != datetime.min else "Never"
        })
    return result

@router.get("/students/{student_id}")
def get_student_detail(student_id: int, current_user: models.User = Depends(auth.get_current_teacher), db: Session = Depends(get_db)):
    s = db.query(models.User).filter(models.User.id == student_id, models.User.role == "student").first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
        
    attempts = db.query(models.QuizAttempt).filter(models.QuizAttempt.student_id == s.id, models.QuizAttempt.is_complete == True).order_by(models.QuizAttempt.submitted_at.desc()).all()
    avg = sum([a.score_pct for a in attempts]) / max(1, len(attempts)) if attempts else 0
    
    mastery = db.query(models.StudentConceptMastery).filter(models.StudentConceptMastery.student_id == s.id).all()
    
    strong_topics = []
    weak_topics = []
    topic_mastery = []
    
    for m in mastery:
        topic = db.query(models.Topic).filter(models.Topic.id == m.topic_id).first()
        if not topic: continue
            
        status = 'strong' if m.mastery_score >= 0.75 else 'weak' if m.mastery_score >= 0.5 else 'critical'
        if m.mastery_score >= 0.6: strong_topics.append(topic.name)
        else: weak_topics.append(topic.name)
            
        topic_mastery.append({
            "topic": topic.name,
            "mastery_score": m.mastery_score,
            "accuracy": int((m.correct_count / max(1, m.total_attempts)) * 100),
            "status": status
        })
        
    from ..services.risk_scorer import calculate_risk_score
    risk_score = calculate_risk_score(s.id, db)
    risk_level = "On Track"
    if risk_score >= 0.6: risk_level = "At Risk"
    elif risk_score >= 0.3: risk_level = "Needs Watch"
        
    score_trend = []
    for a in list(reversed(attempts))[-5:]:
        score_trend.append({
            "date": a.submitted_at.strftime("%b %d") if a.submitted_at else "Unknown",
            "score": round(a.score_pct or 0)
        })
        
    recent_assessments = []
    for a in attempts[:5]:
        quiz = db.query(models.Quiz).filter(models.Quiz.id == a.quiz_id).first()
        topic = db.query(models.Topic).filter(models.Topic.id == quiz.topic_id).first() if quiz else None
        recent_assessments.append({
            "id": quiz.id if quiz else 0,
            "quiz_name": quiz.title if quiz else "Unknown",
            "date": a.submitted_at.strftime("%b %d") if a.submitted_at else "Unknown",
            "topic": topic.name if topic else "Unknown",
            "score": round(a.score_pct or 0),
            "total": 100,
            "status": "Excellent" if (a.score_pct or 0) > 80 else "Needs Work",
            "attempt_id": a.id
        })

    recent_attempts = []
    for a in attempts[:5]:
        quiz = db.query(models.Quiz).filter(models.Quiz.id == a.quiz_id).first()
        topic = db.query(models.Topic).filter(models.Topic.id == quiz.topic_id).first() if quiz else None
        recent_attempts.append({
            "quiz_title": quiz.title if quiz else f"Quiz {a.quiz_id}",
            "quiz_type": "Assessment",
            "topic": topic.name if topic else "General",
            "quiz_id": a.quiz_id,
            "score_pct": round(a.score_pct or 0, 1),
            "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
            "attempt_id": a.id,
            "time_taken_seconds": a.time_taken_seconds
        })

    last_active = attempts[0].submitted_at if attempts else None

    trend = [{"quiz": t["date"], "score": t["score"]} for t in score_trend]
    topic_proficiency = [
        {
            "topic": t["topic"],
            "mastery": int((t["mastery_score"] or 0) * 100)
        } for t in topic_mastery
    ]

    return {
        "id": s.id,
        "name": s.name,
        "email": s.email,
        "avg_score": round(avg),
        "risk_level": risk_level,
        "weak_topics": weak_topics,
        "strong_topics": strong_topics,
        "trend": trend,
        "topic_proficiency": topic_proficiency,
        "total_quizzes": len(attempts),
        "recent_attempts": recent_attempts,
        "student": {
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "last_active": last_active.strftime("%b %d, %Y") if last_active else "Never"
        },
        "stats": {
            "avg_score": round(avg),
            "strong_topics": strong_topics,
            "weak_topics": weak_topics,
            "risk_level": risk_level,
            "risk_score": round(risk_score, 2),
            "total_quizzes": len(attempts)
        },
        "score_trend": score_trend,
        "topic_mastery": topic_mastery,
        "recent_assessments": recent_assessments
    }

@router.post("/students/{student_id}/ai-insight")
def get_ai_insight(student_id: int, current_user: models.User = Depends(auth.get_current_teacher), db: Session = Depends(get_db)):
    s = db.query(models.User).filter(models.User.id == student_id).first()
    if not s: raise HTTPException(404, "Student not found")
        
    from ..services.risk_scorer import calculate_risk_score
    risk_score = calculate_risk_score(s.id, db)
    risk_level = "On Track"
    if risk_score >= 0.6: risk_level = "At Risk"
    elif risk_score >= 0.3: risk_level = "Needs Watch"
        
    attempts = db.query(models.QuizAttempt).filter(models.QuizAttempt.student_id == s.id, models.QuizAttempt.is_complete == True).all()
    avg = sum([a.score_pct for a in attempts]) / max(1, len(attempts)) if attempts else 0
    
    mastery = db.query(models.StudentConceptMastery).filter(models.StudentConceptMastery.student_id == s.id, models.StudentConceptMastery.mastery_score < 0.5).all()
    weak_topics = []
    for m in mastery:
        topic = db.query(models.Topic).filter(models.Topic.id == m.topic_id).first()
        if topic: weak_topics.append(topic.name)
            
    recent_trend = "stable"
    if len(attempts) >= 2:
        if attempts[0].score_pct > attempts[1].score_pct: recent_trend = "improving"
        elif attempts[0].score_pct < attempts[1].score_pct: recent_trend = "declining"
            
    return generate_ai_insight_for_student(s.name, round(avg), risk_level, weak_topics, recent_trend)

from pydantic import BaseModel
class InterventionReq(BaseModel):
    topic_name: str
    topic_id: int

@router.post("/intervention")
def create_intervention(req: InterventionReq, current_user: models.User = Depends(auth.get_current_teacher), db: Session = Depends(get_db)):
    # Calculate struggling pct
    students = db.query(models.User).filter(models.User.role == "student").count()
    mastery = db.query(models.StudentConceptMastery).filter(models.StudentConceptMastery.topic_id == req.topic_id, models.StudentConceptMastery.mastery_score < 0.5).count()
    struggling_pct = (mastery / max(1, students)) * 100
    
    # Fake common wrong answers for now
    common = ["Option B", "Used addition instead of multiplication"]
    
    return generate_intervention_plan(req.topic_name, round(struggling_pct), common)

@router.get("/students/{student_id}/report-pdf")
def download_student_report_pdf(student_id: int, current_user: models.User = Depends(auth.get_current_teacher), db: Session = Depends(get_db)):
    s = db.query(models.User).filter(models.User.id == student_id, models.User.role == "student").first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")

    attempts = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.student_id == s.id,
        models.QuizAttempt.is_complete == True
    ).all()
    avg = sum([a.score_pct for a in attempts]) / max(1, len(attempts)) if attempts else 0

    mastery = db.query(models.StudentConceptMastery).filter(models.StudentConceptMastery.student_id == s.id).all()
    strong_topics = []
    weak_topics = []
    for m in mastery:
        topic = db.query(models.Topic).filter(models.Topic.id == m.topic_id).first()
        if not topic:
            continue
        if m.mastery_score >= 0.6:
            strong_topics.append(topic.name)
        else:
            weak_topics.append(topic.name)

    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas

    filename = f"/tmp/student_report_{s.name.replace(' ', '_')}.pdf"
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter

    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, f"Student Report: {s.name}")

    c.setFont("Helvetica", 12)
    c.drawString(50, height - 80, f"Email: {s.email}")
    c.drawString(50, height - 100, f"Average Score: {round(avg)}%")
    c.drawString(50, height - 120, f"Total Quizzes: {len(attempts)}")

    y = height - 160
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Strong Topics:")
    c.setFont("Helvetica", 12)
    y -= 20
    if strong_topics:
        for t in strong_topics[:10]:
            c.drawString(70, y, f"- {t}")
            y -= 18
    else:
        c.drawString(70, y, "- None")
        y -= 18

    y -= 10
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Weak Topics:")
    c.setFont("Helvetica", 12)
    y -= 20
    if weak_topics:
        for t in weak_topics[:10]:
            c.drawString(70, y, f"- {t}")
            y -= 18
    else:
        c.drawString(70, y, "- None")
        y -= 18

    c.save()
    return FileResponse(filename, filename=f"student_report_{s.name.replace(' ', '_')}.pdf")

@router.get("/topic-analysis/{topic_id}")
def get_topic_analysis(
    topic_id: int,
    current_user: models.User = Depends(auth.get_current_teacher),
    db: Session = Depends(get_db)
):
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    questions = db.query(models.Question).filter(models.Question.topic_id == topic_id).all()
    mastery_records = db.query(models.StudentConceptMastery).filter(models.StudentConceptMastery.topic_id == topic_id).all()

    question_stats = []
    for q in questions:
        responses = db.query(models.Response).filter(models.Response.question_id == q.id).all()
        total = len(responses)
        correct = sum(1 for r in responses if r.is_correct)
        question_stats.append({
            "id": q.id,
            "text": q.text[:70] + "…" if len(q.text) > 70 else q.text,
            "difficulty": q.difficulty,
            "total_attempts": total,
            "correct": correct,
            "accuracy": round((correct / total) * 100, 1) if total > 0 else 0,
        })

    buckets = {"0-25": 0, "25-50": 0, "50-75": 0, "75-100": 0}
    for r in mastery_records:
        s = r.mastery_score * 100
        if s < 25:
            buckets["0-25"] += 1
        elif s < 50:
            buckets["25-50"] += 1
        elif s < 75:
            buckets["50-75"] += 1
        else:
            buckets["75-100"] += 1

    student_mastery = []
    for record in mastery_records:
        student = db.query(models.User).filter(models.User.id == record.student_id).first()
        if student:
            student_mastery.append({
                "student_id": record.student_id,
                "student_name": student.name,
                "mastery_score": round(record.mastery_score * 100, 1),
                "attempts": record.total_attempts,
                "last_practiced": record.last_attempted.isoformat() if record.last_attempted else None,
                "status": (
                    "mastered" if record.mastery_score >= 0.75 else
                    "progressing" if record.mastery_score >= 0.5 else
                    "struggling" if record.mastery_score >= 0.25 else "at_risk"
                )
            })

    avg_mastery = (
        sum(r.mastery_score for r in mastery_records) / len(mastery_records) * 100
        if mastery_records else 0
    )

    return {
        "topic": {
            "id": topic.id,
            "name": topic.name,
            "subject": topic.subject,
            "difficulty": 3
        },
        "summary": {
            "total_students": len(mastery_records),
            "average_mastery": round(avg_mastery, 1),
            "total_questions": len(questions),
            "mastered_count": buckets["75-100"],
            "struggling_count": buckets["0-25"] + buckets["25-50"],
        },
        "mastery_distribution": [
            {"range": "0–25%", "count": buckets["0-25"], "label": "At Risk", "color": "#ef4444"},
            {"range": "25–50%", "count": buckets["25-50"], "label": "Struggling", "color": "#f97316"},
            {"range": "50–75%", "count": buckets["50-75"], "label": "Progressing", "color": "#f59e0b"},
            {"range": "75–100%", "count": buckets["75-100"], "label": "Mastered", "color": "#10b981"},
        ],
        "question_stats": sorted(question_stats, key=lambda x: x["accuracy"]),
        "student_mastery": sorted(student_mastery, key=lambda x: x["mastery_score"]),
    }

@router.get("/learning-heatmap")
def get_learning_heatmap(
    weeks: int = 5,
    current_user: models.User = Depends(auth.get_current_teacher),
    db: Session = Depends(get_db)
):
    topics = db.query(models.Topic).order_by(models.Topic.subject, models.Topic.name).limit(10).all()
    all_students = db.query(models.User).filter(models.User.role == "student").all()
    student_ids = [s.id for s in all_students]

    now = datetime.utcnow()
    heatmap_data = []

    for topic in topics:
        row = {
            "topic_id": topic.id,
            "topic_name": topic.name,
            "subject": topic.subject,
            "weeks": []
        }

        for week_back in range(weeks - 1, -1, -1):
            week_start = now - timedelta(weeks=week_back + 1)
            week_end = now - timedelta(weeks=week_back)

            week_attempts = db.query(models.QuizAttempt).join(
                models.Quiz, models.QuizAttempt.quiz_id == models.Quiz.id
            ).filter(
                models.Quiz.topic_id == topic.id,
                models.QuizAttempt.student_id.in_(student_ids),
                models.QuizAttempt.is_complete == True,
                models.QuizAttempt.submitted_at >= week_start,
                models.QuizAttempt.submitted_at < week_end
            ).all()

            if week_attempts:
                avg_score = sum(a.score_pct or 0 for a in week_attempts) / len(week_attempts)
            else:
                records = db.query(models.StudentConceptMastery).filter(
                    models.StudentConceptMastery.topic_id == topic.id,
                    models.StudentConceptMastery.student_id.in_(student_ids),
                ).all()
                avg_score = (
                    sum(r.mastery_score * 100 for r in records) / len(records)
                    if records else None
                )

            week_label = (now - timedelta(weeks=week_back)).strftime("W%U")
            row["weeks"].append({
                "week_label": week_label,
                "week_number": weeks - week_back,
                "avg_score": round(avg_score, 1) if avg_score is not None else None,
                "sample_size": len(week_attempts)
            })

        heatmap_data.append(row)

    return {
        "heatmap": heatmap_data,
        "week_count": weeks,
        "total_students": len(student_ids),
        "total_topics": len(topics),
    }

@router.get("/students/{student_id}/attempts/{attempt_id}")
def get_student_attempt_detail(
    student_id: int,
    attempt_id: int,
    current_user: models.User = Depends(auth.get_current_teacher),
    db: Session = Depends(get_db)
):
    attempt = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.id == attempt_id,
        models.QuizAttempt.student_id == student_id,
        models.QuizAttempt.is_complete == True
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    quiz = db.query(models.Quiz).filter(models.Quiz.id == attempt.quiz_id).first()
    topic = db.query(models.Topic).filter(models.Topic.id == quiz.topic_id).first() if quiz else None

    responses = db.query(models.Response).filter(models.Response.attempt_id == attempt_id).all()
    response_details = []
    for r in responses:
        q = db.query(models.Question).filter(models.Question.id == r.question_id).first()
        if not q:
            continue
        try:
            opts = json.loads(q.options)
        except Exception:
            opts = eval(q.options) if q.options else []
        selected_text = opts[r.selected_index] if 0 <= (r.selected_index or -1) < len(opts) else "Unanswered"
        correct_text = opts[q.correct_index] if 0 <= q.correct_index < len(opts) else "Unknown"
        response_details.append({
            "question_id": r.question_id,
            "question_text": q.text,
            "options": opts,
            "selected_index": r.selected_index,
            "correct_index": q.correct_index,
            "selected_answer": selected_text,
            "correct_answer": correct_text,
            "is_correct": r.is_correct,
            "time_taken_seconds": r.time_taken_seconds
        })

    correct = sum(1 for r in responses if r.is_correct)
    total = len(responses)
    score_pct = round(attempt.score_pct or 0.0, 1)

    return {
        "attempt_id": attempt.id,
        "quiz_id": attempt.quiz_id,
        "quiz_title": quiz.title if quiz else "Unknown Quiz",
        "topic_name": topic.name if topic else "Unknown",
        "topic_subject": topic.subject if topic else "",
        "score_pct": score_pct,
        "correct_count": correct,
        "total_questions": total,
        "time_taken_seconds": attempt.time_taken_seconds or 0,
        "completed_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
        "responses": response_details,
        "grade": (
            "A+" if score_pct >= 90 else "A" if score_pct >= 80 else
            "B" if score_pct >= 70 else "C" if score_pct >= 60 else
            "D" if score_pct >= 50 else "F"
        )
    }

@router.get("/quizzes")
def get_teacher_quizzes(current_user: models.User = Depends(auth.get_current_teacher), db: Session = Depends(get_db)):
    quizzes = db.query(models.Quiz).filter(models.Quiz.created_by == current_user.id).order_by(models.Quiz.created_at.desc()).all()
    out = []
    for q in quizzes:
        topic = db.query(models.Topic).filter(models.Topic.id == q.topic_id).first()
        count = db.query(models.QuizQuestion).filter(models.QuizQuestion.quiz_id == q.id).count()
        out.append({
            "id": q.id,
            "title": q.title,
            "topic": topic.name if topic else "Unknown",
            "question_count": count,
            "is_published": q.is_published,
            "created_at": q.created_at.isoformat() if q.created_at else None
        })
    return out

class PublishReq(BaseModel):
    is_published: bool

@router.patch("/quizzes/{quiz_id}/publish")
def publish_quiz(
    quiz_id: int,
    req: PublishReq,
    current_user: models.User = Depends(auth.get_current_teacher),
    db: Session = Depends(get_db)
):
    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id, models.Quiz.created_by == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    quiz.is_published = req.is_published
    db.commit()
    return {"id": quiz.id, "is_published": quiz.is_published}
