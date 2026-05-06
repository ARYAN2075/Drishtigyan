from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
import json
import os

import models
import auth

from database import get_db
from services.spaced_repetition import get_practice_queue

# Map Weak topics to Video resources
VIDEO_MAP = {
  "Calculus": [
    {"title":"Essence of Calculus","url":"https://www.youtube.com/watch?v=WUvTyaaNkzM","thumbnail":"https://img.youtube.com/vi/WUvTyaaNkzM/mqdefault.jpg","channel":"3Blue1Brown","duration":"17:04"},
    {"title":"Derivatives Explained","url":"https://www.youtube.com/watch?v=rAof9Ld5sOg","thumbnail":"https://img.youtube.com/vi/rAof9Ld5sOg/mqdefault.jpg","channel":"Khan Academy","duration":"9:42"}
  ],
  "Algebra": [
    {"title":"Algebra Basics","url":"https://www.youtube.com/watch?v=MHeirBPOI6w","thumbnail":"https://img.youtube.com/vi/MHeirBPOI6w/mqdefault.jpg","channel":"Khan Academy","duration":"8:15"}
  ],
  "Graphs": [
    {"title":"Graphing Linear Equations","url":"https://www.youtube.com/watch?v=MXV65i9g1Xg","thumbnail":"https://img.youtube.com/vi/MXV65i9g1Xg/mqdefault.jpg","channel":"Khan Academy","duration":"10:22"}
  ],
  "Trigonometry": [
    {"title":"Trigonometry Full Course","url":"https://www.youtube.com/watch?v=PUB0TaZ7bhA","thumbnail":"https://img.youtube.com/vi/PUB0TaZ7bhA/mqdefault.jpg","channel":"freeCodeCamp","duration":"6:33:39"}
  ],
  "Statistics": [
    {"title":"Statistics Fundamentals","url":"https://www.youtube.com/watch?v=xxpc-HPKN28","thumbnail":"https://img.youtube.com/vi/xxpc-HPKN28/mqdefault.jpg","channel":"StatQuest","duration":"15:04"}
  ],
  "Basic Mathematics": [
    {"title":"Basic Math for Beginners","url":"https://www.youtube.com/watch?v=ZK3O402wf1c","thumbnail":"https://img.youtube.com/vi/ZK3O402wf1c/mqdefault.jpg","channel":"Khan Academy","duration":"12:09"}
  ],
  "Coordinate Geometry": [
    {"title":"Coordinate Geometry Basics","url":"https://www.youtube.com/watch?v=Z9B6h9e2m1c","thumbnail":"https://img.youtube.com/vi/Z9B6h9e2m1c/mqdefault.jpg","channel":"Math Antics","duration":"9:34"}
  ],
  "Probability": [
    {"title":"Probability Basics","url":"https://www.youtube.com/watch?v=KzfWUEJjG18","thumbnail":"https://img.youtube.com/vi/KzfWUEJjG18/mqdefault.jpg","channel":"Khan Academy","duration":"10:32"}
  ],
  "Geometry": [
    {"title":"Geometry Fundamentals","url":"https://www.youtube.com/watch?v=E9b4F7m1vY8","thumbnail":"https://img.youtube.com/vi/E9b4F7m1vY8/mqdefault.jpg","channel":"Khan Academy","duration":"11:20"}
  ]
}

router = APIRouter()

CACHE_TTL_SECONDS = 20
_STUDENT_DASH_CACHE = {}

def _get_student_dash_cache(student_id: int):
    entry = _STUDENT_DASH_CACHE.get(student_id)
    if not entry:
        return None
    ts, data = entry
    if (datetime.now() - ts).total_seconds() > CACHE_TTL_SECONDS:
        return None
    return data

def _set_student_dash_cache(student_id: int, data):
    _STUDENT_DASH_CACHE[student_id] = (datetime.now(), data)

@router.get("/dashboard")
def get_dashboard(current_user: models.User = Depends(auth.get_current_student), db: Session = Depends(get_db)):
    cached = _get_student_dash_cache(current_user.id)
    if cached:
        return cached

    attempts = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.student_id == current_user.id,
        models.QuizAttempt.is_complete == True
    ).order_by(models.QuizAttempt.submitted_at.desc()).all()
    
    attempted_quiz_ids = {a.quiz_id for a in attempts}
    total_quizzes = len(attempted_quiz_ids)
    avg_score = sum([a.score_pct for a in attempts]) / max(1, len(attempts)) if attempts else 0.0
    
    weak_records = db.query(models.StudentConceptMastery).filter(
        models.StudentConceptMastery.student_id == current_user.id,
        models.StudentConceptMastery.mastery_score < 0.6
    ).all()
    
    focus_areas = []
    recommended_videos = []
    
    for r in weak_records:
        topic = db.query(models.Topic).filter(models.Topic.id == r.topic_id).first()
        if not topic: continue
        
        status = 'moderate'
        if r.mastery_score < 0.35: status = 'critical'
        elif r.mastery_score < 0.5: status = 'weak'
            
        root_cause_topic = None
        root_cause_topic_id = None
        root_cause_explanation = None

        # Check for root cause
        from models import TopicDependency
        dependencies = db.query(TopicDependency).filter(TopicDependency.topic_id == topic.id).all()
        for dep in dependencies:
            prereq = db.query(models.Topic).filter(models.Topic.id == dep.prerequisite_id).first()
            if prereq:
                prereq_mastery = db.query(models.StudentConceptMastery).filter(
                    models.StudentConceptMastery.student_id == current_user.id,
                    models.StudentConceptMastery.topic_id == prereq.id
                ).first()
                if not prereq_mastery or prereq_mastery.mastery_score < 0.6:
                    root_cause_topic = prereq.name
                    root_cause_topic_id = prereq.id
                    root_cause_explanation = f"Your difficulty with {topic.name} may be caused by gaps in {prereq.name} understanding."
                    break

        if not root_cause_topic and dependencies:
            root_cause_explanation = "Concept application issue. You have strong prerequisites."

        focus_areas.append({
            "topic": topic.name,
            "topic_id": topic.id,
            "mastery_score": round(r.mastery_score, 2),
            "status": status,
            "root_cause_topic": root_cause_topic,
            "root_cause_topic_id": root_cause_topic_id,
            "root_cause_explanation": root_cause_explanation
        })
        
        # Pull up to 1 video for this weak topic
        if topic.name in VIDEO_MAP:
            vid = VIDEO_MAP[topic.name][0].copy()
            vid["topic"] = topic.name
            recommended_videos.append(vid)
            
    # Remove duplicates from recommended videos just in case
    # Taking top limit
    recommended_videos = recommended_videos[:3]
            
    recent_quizzes = []
    for a in attempts[:5]:
        quiz = db.query(models.Quiz).filter(models.Quiz.id == a.quiz_id).first()
        topic = db.query(models.Topic).filter(models.Topic.id == quiz.topic_id).first() if quiz else None
        
        recent_quizzes.append({
            "id": quiz.id if quiz else 0,
            "name": quiz.title if quiz else "Unknown",
            "topic": topic.name if topic else "Unknown",
            "score": round(a.score_pct or 0.0),
            "status": "Pass" if (a.score_pct or 0) >= 60 else "Review",
            "date": a.submitted_at.strftime("%b %d, %Y") if a.submitted_at else "",
            "attempt_id": a.id
        })
        
    score_trend = []
    for a in reversed(attempts[-10:]):
        quiz = db.query(models.Quiz).filter(models.Quiz.id == a.quiz_id).first()
        score_trend.append({
            "quiz": quiz.title[:10] + "..." if quiz else "Quiz",
            "score": round(a.score_pct or 0.0)
        })

    result = {
        "total_quizzes": total_quizzes,
        "avg_score": round(avg_score, 1),
        "weak_topics_count": len(weak_records),
        "available_quizzes": max(0, db.query(models.Quiz).count() - total_quizzes),
        "score_trend": score_trend,
        "focus_areas": focus_areas,
        "recommended_videos": recommended_videos,
        "recent_quizzes": recent_quizzes
    }
    _set_student_dash_cache(current_user.id, result)
    return result

@router.get("/gaps")
def get_gaps(current_user: models.User = Depends(auth.get_current_student), db: Session = Depends(get_db)):
    records = db.query(models.StudentConceptMastery).filter(models.StudentConceptMastery.student_id == current_user.id).all()
    
    summary = {"strong": 0, "moderate": 0, "weak": 0, "critical": 0}
    chart_data = []
    topics = []
    
    for r in records:
        topic = db.query(models.Topic).filter(models.Topic.id == r.topic_id).first()
        if not topic: continue
            
        m = r.mastery_score
        status = 'strong'
        if m < 0.35:
            status = 'critical'
            summary['critical'] += 1
        elif m < 0.5:
            status = 'weak'
            summary['weak'] += 1
        elif m < 0.75:
            status = 'moderate'
            summary['moderate'] += 1
        else:
            summary['strong'] += 1
            
        acc = int((r.correct_count / max(1, r.total_attempts)) * 100)
            
        chart_data.append({
            "topic": topic.name,
            "accuracy": acc,
            "mastery_score": m,
            "status": status
        })
        
        topics.append({
            "topic_id": topic.id,
            "topic": topic.name,
            "total_attempts": r.total_attempts,
            "correct": r.correct_count,
            "accuracy": acc,
            "mastery_score": round(m, 2),
            "theta": round(r.theta, 2),
            "status": status,
            "last_attempted": r.last_attempted.strftime("%Y-%m-%d") if r.last_attempted else "Never",
            "next_review_date": r.next_review_date.strftime("%Y-%m-%d") if r.next_review_date else "",
            "interval_days": r.interval_days
        })
        
    return {
        "summary": summary,
        "chart_data": chart_data,
        "topics": topics
    }

@router.get("/gaps/download-pdf")
def download_gap_pdf(current_user: models.User = Depends(auth.get_current_student), db: Session = Depends(get_db)):
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    
    filename = f"/tmp/gap_report_{current_user.name.replace(' ', '_')}.pdf"
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, f"Learning Gap Report: {current_user.name}")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 80, f"Date: {datetime.now().strftime('%Y-%m-%d')}")
    
    c.drawString(50, height - 120, "Weak Topics / Gaps Detected:")
    
    records = db.query(models.StudentConceptMastery).filter(
        models.StudentConceptMastery.student_id == current_user.id,
        models.StudentConceptMastery.mastery_score < 0.6
    ).all()
    
    y = height - 150
    for r in records:
        topic = db.query(models.Topic).filter(models.Topic.id == r.topic_id).first()
        status = 'critical' if r.mastery_score < 0.35 else 'weak' if r.mastery_score < 0.5 else 'moderate'
        c.drawString(70, y, f"- {topic.name if topic else 'Unknown'}: {int(r.mastery_score*100)}% Mastery ({status.upper()})")
        y -= 25
        
    c.drawString(50, y - 30, "Action Plan:")
    c.drawString(70, y - 55, "1. Review recommended videos on the student dashboard.")
    c.drawString(70, y - 80, "2. Prioritize practice exercises for 'Critical' topics.")
    c.drawString(70, y - 105, "3. Take smaller quizzes targeting these specific concepts.")
    
    c.save()
    
    return FileResponse(filename, filename=f"gap_report_{current_user.name.replace(' ', '_')}.pdf")

@router.get("/practice-queue")
def get_student_practice_queue(current_user: models.User = Depends(auth.get_current_student), db: Session = Depends(get_db)):
    queue = get_practice_queue(current_user.id, db)
    
    # Dummy stats calculation
    records = db.query(models.StudentConceptMastery).filter(models.StudentConceptMastery.student_id == current_user.id).all()
    mastery_points = sum([int(r.mastery_score * 1000) for r in records])
    
    attempts = db.query(models.QuizAttempt).filter(models.QuizAttempt.student_id == current_user.id).all()
    time_sum = sum([a.time_taken_seconds or 0 for a in attempts])
    
    return {
        "stats": {
            "gap_closure_rate": 68,
            "practice_time_hours": round(time_sum / 3600, 1),
            "mastery_points": mastery_points
        },
        "queue": queue,
        "ai_explanation": f"Based on your recent quizzes, you have {len(queue)} topics pending review to maximize recall."
    }

@router.get("/recommended-practice")
def get_recommended_practice(current_user: models.User = Depends(auth.get_current_student), db: Session = Depends(get_db)):
    queue = get_practice_queue(current_user.id, db)
    recommendations = []

    for item in queue:
        topic = db.query(models.Topic).filter(models.Topic.id == item["topic_id"]).first()
        mastery_pct = int(item["mastery_score"] * 100)
        priority = "low"
        if item["priority"] == "DUE TODAY":
            priority = "high"
        elif item["priority"] == "DUE SOON":
            priority = "medium"

        record = db.query(models.StudentConceptMastery).filter(
            models.StudentConceptMastery.student_id == current_user.id,
            models.StudentConceptMastery.topic_id == item["topic_id"]
        ).first()
        days_since = None
        if record and record.last_attempted:
            days_since = (datetime.now() - record.last_attempted).days

        estimated_time = max(10, int((1 - item["mastery_score"]) * 30) + 10)
        difficulty_label = "Easy" if mastery_pct >= 70 else "Medium" if mastery_pct >= 50 else "Hard"

        recommendations.append({
            "topic_id": item["topic_id"],
            "topic_name": item["topic"],
            "subject": topic.subject if topic else "General",
            "priority": priority,
            "mastery_score": mastery_pct,
            "estimated_time": f"{estimated_time} min",
            "difficulty_label": difficulty_label,
            "days_since_practice": days_since,
            "action": "Revise core concepts and attempt a focused quiz to improve mastery.",
            "quiz_id": item.get("related_quiz_id")
        })

    return {
        "recommendations": recommendations
    }

@router.get("/gap-report")
def get_gap_report(current_user: models.User = Depends(auth.get_current_student), db: Session = Depends(get_db)):
    records = db.query(models.StudentConceptMastery).filter(
        models.StudentConceptMastery.student_id == current_user.id
    ).all()

    if not records:
        return {"message": "Complete some quizzes to generate your gap report.", "gaps": [], "strengths": []}

    gaps = []
    strengths = []
    mastery_scores = []
    critical_count = 0

    for r in records:
        topic = db.query(models.Topic).filter(models.Topic.id == r.topic_id).first()
        if not topic:
            continue
        mastery_pct = round(r.mastery_score * 100, 1)
        mastery_scores.append(mastery_pct)
        accuracy = int((r.correct_count / max(1, r.total_attempts)) * 100)

        if mastery_pct < 70:
            gap_severity = "critical" if mastery_pct < 35 else "weak"
            if gap_severity == "critical":
                critical_count += 1
            gaps.append({
                "topic_id": topic.id,
                "topic_name": topic.name,
                "subject": topic.subject,
                "mastery_score": mastery_pct,
                "gap_severity": gap_severity,
                "total_questions_attempted": r.total_attempts,
                "accuracy": accuracy
            })
        else:
            strength_level = "excellent" if mastery_pct >= 85 else "strong"
            strengths.append({
                "topic_id": topic.id,
                "topic_name": topic.name,
                "subject": topic.subject,
                "mastery_score": mastery_pct,
                "strength_level": strength_level
            })

    overall_health = round(sum(mastery_scores) / max(1, len(mastery_scores)), 1) if mastery_scores else 0

    return {
        "overall_health": overall_health,
        "total_topics_studied": len(records),
        "critical_gaps_count": critical_count,
        "gaps": sorted(gaps, key=lambda x: x["mastery_score"]),
        "strengths": sorted(strengths, key=lambda x: x["mastery_score"], reverse=True)
    }

@router.get("/quiz-detail/{attempt_id}")
def get_quiz_attempt_detail(
    attempt_id: int,
    current_user: models.User = Depends(auth.get_current_student),
    db: Session = Depends(get_db)
):
    attempt = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.id == attempt_id,
        models.QuizAttempt.student_id == current_user.id,
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
            "time_spent": r.time_taken_seconds,
            "difficulty": q.difficulty
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

@router.get("/knowledge-map")
def get_knowledge_map(current_user: models.User = Depends(auth.get_current_student), db: Session = Depends(get_db)):
    student_id = current_user.id
    mastery_records = db.query(models.StudentConceptMastery).filter(
        models.StudentConceptMastery.student_id == student_id
    ).all()

    if not mastery_records:
        return {"nodes": [], "edges": [], "message": "Complete quizzes to build your Knowledge Map!"}

    nodes = []
    for record in mastery_records:
        topic = db.query(models.Topic).filter(models.Topic.id == record.topic_id).first()
        if not topic:
            continue
        mastery_pct = round(record.mastery_score * 100, 1)
        nodes.append({
            "id": str(topic.id),
            "label": topic.name,
            "subject": topic.subject,
            "mastery": mastery_pct,
            "attempts": record.total_attempts,
            "difficulty": 3,
            "status": (
                "mastered" if mastery_pct >= 75 else
                "progressing" if mastery_pct >= 50 else
                "struggling" if mastery_pct >= 25 else "not_started"
            ),
            "size": max(30, min(70, int(mastery_pct * 0.6 + 20)))
        })

    edges = []
    
    from models import TopicDependency
    # Real dependencies based on database
    all_deps = db.query(TopicDependency).all()
    dep_set = set()
    for dep in all_deps:
        # Check if both nodes exist in the subset of mastery_records to draw an edge
        dep_set.add((str(dep.prerequisite_id), str(dep.topic_id)))

    # Fallback to fully connected subject graph if no real dependencies for these nodes
    if all_deps:
        for prereq_id, topic_id in dep_set:
            # Check if both are in nodes list
            if any(n["id"] == prereq_id for n in nodes) and any(n["id"] == topic_id for n in nodes):
                prereq_node = next(n for n in nodes if n["id"] == prereq_id)
                topic_node = next(n for n in nodes if n["id"] == topic_id)
                edges.append({
                    "source": prereq_id,
                    "target": topic_id,
                    "subject": prereq_node["subject"],
                    "strength": 2
                })
    else:
        subject_topics: dict = {}
        for node in nodes:
            subject_topics.setdefault(node["subject"], []).append(node["id"])

        for subject, ids in subject_topics.items():
            for i in range(len(ids)):
                for j in range(i + 1, len(ids)):
                    edges.append({
                        "source": ids[i],
                        "target": ids[j],
                        "subject": subject,
                        "strength": 1
                    })

    avg_mastery = sum(r.mastery_score for r in mastery_records) / len(mastery_records) * 100
    mastered_count = len([n for n in nodes if n["status"] == "mastered"])
    struggling_count = len([n for n in nodes if n["status"] in ["struggling", "not_started"]])

    return {
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "total_topics": len(nodes),
            "mastered": mastered_count,
            "progressing": len([n for n in nodes if n["status"] == "progressing"]),
            "struggling": struggling_count,
            "average_mastery": round(avg_mastery, 1)
        }
    }
