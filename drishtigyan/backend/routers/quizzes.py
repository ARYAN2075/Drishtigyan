from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from .. import models, auth, schemas
from ..database import get_db
from ..services.gap_detection import analyze_quiz_attempt

router = APIRouter()

@router.get("/", response_model=List[schemas.QuizOut])
def list_quizzes(
    topic: Optional[str] = None, 
    difficulty: Optional[str] = None, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    query = db.query(models.Quiz).filter(models.Quiz.is_published == True)
    
    if topic:
        t = db.query(models.Topic).filter(models.Topic.name == topic).first()
        if t: query = query.filter(models.Quiz.topic_id == t.id)
    if difficulty:
        query = query.filter(models.Quiz.difficulty == difficulty)
        
    quizzes = query.all()
    out = []
    for q in quizzes:
        t = db.query(models.Topic).filter(models.Topic.id == q.topic_id).first()
        qc = db.query(models.QuizQuestion).filter(models.QuizQuestion.quiz_id == q.id).count()
        out.append(schemas.QuizOut(
            id=q.id,
            title=q.title,
            description=q.description,
            topic_id=q.topic_id,
            difficulty=q.difficulty,
            time_limit_minutes=q.time_limit_minutes,
            topic=t.name if t else None,
            question_count=qc,
            created_at=q.created_at
        ))
    return out

@router.post("/", response_model=schemas.QuizOut)
def create_quiz(quiz: schemas.QuizCreate, current_user: models.User = Depends(auth.get_current_teacher), db: Session = Depends(get_db)):
    new_quiz = models.Quiz(
        title=quiz.title,
        description=quiz.description,
        topic_id=quiz.topic_id,
        difficulty=quiz.difficulty,
        time_limit_minutes=quiz.time_limit_minutes,
        created_by=current_user.id
    )
    db.add(new_quiz)
    db.commit()
    db.refresh(new_quiz)
    
    for idx, qid in enumerate(quiz.question_ids):
        qq = models.QuizQuestion(
            quiz_id=new_quiz.id,
            question_id=qid,
            order_position=idx
        )
        db.add(qq)
    db.commit()
    
    t = db.query(models.Topic).filter(models.Topic.id == new_quiz.topic_id).first()
    
    return schemas.QuizOut(
        id=new_quiz.id,
        title=new_quiz.title,
        description=new_quiz.description,
        topic_id=new_quiz.topic_id,
        difficulty=new_quiz.difficulty,
        time_limit_minutes=new_quiz.time_limit_minutes,
        topic=t.name if t else None,
        question_count=len(quiz.question_ids),
        created_at=new_quiz.created_at
    )

@router.get("/{quiz_id}", response_model=schemas.QuizDetailOut)
def get_quiz(quiz_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not quiz: raise HTTPException(404, "Quiz not found")
        
    t = db.query(models.Topic).filter(models.Topic.id == quiz.topic_id).first()
    qqs = db.query(models.QuizQuestion).filter(models.QuizQuestion.quiz_id == quiz.id).order_by(models.QuizQuestion.order_position).all()
    
    questions = []
    for qq in qqs:
        q = db.query(models.Question).filter(models.Question.id == qq.question_id).first()
        qt = db.query(models.Topic).filter(models.Topic.id == q.topic_id).first()
        # Parse options safely
        import json
        try:
            opts = json.loads(q.options)
        except:
            opts = eval(q.options) if q.options else []
            
        questions.append(schemas.QuestionOutStudent(
            id=q.id,
            text=q.text,
            options=opts,
            topic=qt.name if qt else "Unknown",
            difficulty=q.difficulty,
            order_position=qq.order_position
        ))
        
    return schemas.QuizDetailOut(
        id=quiz.id,
        title=quiz.title,
        description=quiz.description,
        topic_id=quiz.topic_id,
        difficulty=quiz.difficulty,
        time_limit_minutes=quiz.time_limit_minutes,
        topic=t.name if t else None,
        question_count=len(questions),
        created_at=quiz.created_at,
        questions=questions
    )

@router.post("/{quiz_id}/start")
def start_quiz(quiz_id: int, current_user: models.User = Depends(auth.get_current_student), db: Session = Depends(get_db)):
    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not quiz: raise HTTPException(404, "Quiz not found")
        
    attempt = models.QuizAttempt(
        student_id=current_user.id,
        quiz_id=quiz_id,
        total_questions=db.query(models.QuizQuestion).filter(models.QuizQuestion.quiz_id == quiz_id).count()
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    
    return {"attempt_id": attempt.id, "started_at": attempt.started_at}

@router.post("/{quiz_id}/submit", response_model=schemas.QuizSubmitRes)
def submit_quiz(quiz_id: int, req: schemas.QuizSubmitReq, current_user: models.User = Depends(auth.get_current_student), db: Session = Depends(get_db)):
    attempt = db.query(models.QuizAttempt).filter(models.QuizAttempt.id == req.attempt_id).first()
    if not attempt or attempt.student_id != current_user.id:
        raise HTTPException(status_code=404, detail="Attempt not found or unauthorized")
        
    if attempt.is_complete:
        # Return existing result idempotently
        return get_quiz_result(quiz_id, attempt.id, current_user, db)

    correct_count = 0
    per_q = []
    
    for ans in req.answers:
        q = db.query(models.Question).filter(models.Question.id == ans.question_id).first()
        if not q: continue
            
        is_correct = (ans.selected_index == q.correct_index)
        if is_correct: correct_count += 1
            
        resp = models.Response(
            attempt_id=attempt.id,
            question_id=q.id,
            selected_index=ans.selected_index,
            is_correct=is_correct,
            time_taken_seconds=ans.time_taken_seconds
        )
        db.add(resp)
        
        import json
        try:
            opts = json.loads(q.options)
        except:
            opts = eval(q.options) if q.options else []
            
        selected_text = opts[ans.selected_index] if 0 <= ans.selected_index < len(opts) else "Unanswered"
        correct_text = opts[q.correct_index] if 0 <= q.correct_index < len(opts) else "Unknown"
        # Re-check is_correct here in case selected_index was -1 (unanswered)
        is_correct = (ans.selected_index == q.correct_index) and ans.selected_index >= 0
        
        qt = db.query(models.Topic).filter(models.Topic.id == q.topic_id).first()

        per_q.append(schemas.PerQuestionResult(
            question_id=q.id,
            question_text=q.text,
            selected_index=ans.selected_index,
            correct_index=q.correct_index,
            is_correct=is_correct,
            selected_option=selected_text,
            correct_option=correct_text,
            all_options=opts,
            time_taken_seconds=ans.time_taken_seconds,
            topic=qt.name if qt else "Unknown"
        ))
        
    attempt.is_complete = True
    attempt.submitted_at = datetime.now()
    attempt.correct_count = correct_count
    
    # Safe guard
    total = attempt.total_questions or len(req.answers)
    attempt.score_pct = (correct_count / max(1, total)) * 100.0
    attempt.time_taken_seconds = req.total_time_seconds
    db.commit()
    
    # ML analyze triggers
    gaps = analyze_quiz_attempt(attempt.id, db)
    
    minutes = req.total_time_seconds // 60
    seconds = req.total_time_seconds % 60
    
    return schemas.QuizSubmitRes(
        attempt_id=attempt.id,
        score_pct=attempt.score_pct,
        correct_count=correct_count,
        total_questions=total,
        time_taken_seconds=req.total_time_seconds,
        time_formatted=f"{minutes:02d}:{seconds:02d}",
        gaps_detected=gaps,
        per_question_results=per_q
    )

@router.get("/{quiz_id}/attempt/{attempt_id}/result", response_model=schemas.QuizSubmitRes)
def get_quiz_result(quiz_id: int, attempt_id: int, current_user: models.User = Depends(auth.get_current_student), db: Session = Depends(get_db)):
    attempt = db.query(models.QuizAttempt).filter(models.QuizAttempt.id == attempt_id).first()
    if not attempt or not attempt.is_complete: raise HTTPException(404, "Attempt not found or not complete")
        
    responses = db.query(models.Response).filter(models.Response.attempt_id == attempt.id).all()
    
    per_q = []
    for r in responses:
        q = db.query(models.Question).filter(models.Question.id == r.question_id).first()
        if not q: continue
        import json
        try: opts = json.loads(q.options)
        except: opts = eval(q.options) if q.options else []
            
        selected_text = opts[r.selected_index] if 0 <= r.selected_index < len(opts) else "Unanswered"
        correct_text = opts[q.correct_index] if 0 <= q.correct_index < len(opts) else "Unknown"
        qt = db.query(models.Topic).filter(models.Topic.id == q.topic_id).first()

        per_q.append(schemas.PerQuestionResult(
            question_id=q.id,
            question_text=q.text,
            selected_index=r.selected_index,
            correct_index=q.correct_index,
            is_correct=r.is_correct,
            selected_option=selected_text,
            correct_option=correct_text,
            all_options=opts,
            time_taken_seconds=r.time_taken_seconds,
            topic=qt.name if qt else "Unknown"
        ))
        
    gaps = []
    weak = db.query(models.StudentConceptMastery).filter(models.StudentConceptMastery.student_id == current_user.id, models.StudentConceptMastery.mastery_score < 0.6).all()
    for w in weak:
        t = db.query(models.Topic).filter(models.Topic.id == w.topic_id).first()
        status = 'critical' if w.mastery_score < 0.35 else 'weak' if w.mastery_score < 0.5 else 'moderate'
        gaps.append({"topic": t.name if t else "Unknown", "mastery_score": w.mastery_score, "status": status})
        
    minutes = (attempt.time_taken_seconds or 0) // 60
    seconds = (attempt.time_taken_seconds or 0) % 60
    
    return schemas.QuizSubmitRes(
        attempt_id=attempt.id,
        score_pct=attempt.score_pct or 0.0,
        correct_count=attempt.correct_count or 0,
        total_questions=attempt.total_questions or 10,
        time_taken_seconds=attempt.time_taken_seconds or 0,
        time_formatted=f"{minutes:02d}:{seconds:02d}",
        gaps_detected=gaps,
        per_question_results=per_q
    )
