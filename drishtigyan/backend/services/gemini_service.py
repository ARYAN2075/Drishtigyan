import google.generativeai as genai
import json
import os
import re

genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
try:
    model = genai.GenerativeModel('gemini-2.0-flash')
except Exception:
    model = None

def clean_json_response(text: str) -> str:
    """Helper to extract JSON from marked down text block."""
    try:
        match = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL)
        if match:
            return match.group(1)
        return text
    except Exception:
        return text

def explain_gap(topic_name: str, wrong_answer: str, correct_answer: str, question_text: str, student_name: str) -> dict:
    fallback = {
      "explanation": f"You evaluated {topic_name} incorrectly by choosing {wrong_answer} instead of {correct_answer}.",
      "common_mistake": f"A common mistake in {topic_name} is misunderstanding the core principles involved in the problem.",
      "fix_steps": ["Review the topic fundamentals.", "Practice 5 related problems.", "Watch a tutorial video on the subject."],
      "example": f"For example, solving a similar {topic_name} problem correctly requires following the standard rules.",
      "estimated_fix_time": "1-2 hours of focused practice"
    }
    
    if not model or not os.getenv("GEMINI_API_KEY"):
        return fallback

    prompt = (
        f"Student {student_name} answered '{wrong_answer}' for: '{question_text}'. "
        f"The correct answer was '{correct_answer}' on topic '{topic_name}'. "
        f"Explain WHY they likely got this wrong, give the common misconception, "
        f"3 fix steps, and a worked example. Return ONLY valid JSON matching this exact schema:\n"
        f"{{\n"
        f'  "explanation": "why student got it wrong",\n'
        f'  "common_mistake": "typical misconception for this concept",\n'
        f'  "fix_steps": ["step1", "step2", "step3"],\n'
        f'  "example": "worked example showing correct approach",\n'
        f'  "estimated_fix_time": "2-3 hours of focused practice"\n'
        f"}}"
    )
    
    try:
        response = model.generate_content(prompt)
        text = clean_json_response(response.text)
        return json.loads(text)
    except Exception as e:
        print(f"Gemini API Error (explain_gap): {e}")
        return fallback

def generate_study_plan(student_name: str, weak_topics: list, available_days: int = 7) -> dict:
    topics_str = ", ".join([t['name'] for t in weak_topics]) if weak_topics else "General Math"
    primary_topic = weak_topics[0]['name'] if weak_topics else "General Math"
    
    fallback = {
      "plan_title": f"7-Day Study Plan for {student_name}",
      "daily_plans": [
        {
          "day": 1,
          "focus_topic": primary_topic,
          "activities": ["Review textbook chapter on the topic.", "Solve 10 practice problems."],
          "estimated_time_minutes": 45,
          "goal": f"Establish basic fluency in {primary_topic}"
        }
      ],
      "predicted_improvement": "+10-15% on next quiz"
    }

    if not model or not os.getenv("GEMINI_API_KEY"):
        return fallback

    prompt = (
        f"Create a 7-day study plan for {student_name} who is struggling with: {topics_str}. "
        f"Return ONLY valid JSON matching this exact schema:\n"
        f"{{\n"
        f'  "plan_title": "7-Day Study Plan for {student_name}",\n'
        f'  "daily_plans": [\n'
        f'    {{\n'
        f'      "day": 1,\n'
        f'      "focus_topic": "Topic Name",\n'
        f'      "activities": ["activity1", "activity2"],\n'
        f'      "estimated_time_minutes": 45,\n'
        f'      "goal": "what student should be able to do after"\n'
        f'    }}\n'
        f'  ],\n'
        f'  "predicted_improvement": "+15-20% on next quiz"\n'
        f"}}"
    )

    try:
        response = model.generate_content(prompt)
        text = clean_json_response(response.text)
        return json.loads(text)
    except Exception as e:
        print(f"Gemini API Error (study_plan): {e}")
        return fallback

def generate_intervention_plan(topic_name: str, struggling_pct: float, common_wrong_answers: list) -> dict:
    fallback = {
      "lesson_title": f"Targeted Intervention: {topic_name}",
      "duration_minutes": 20,
      "target_misconceptions": ["General misunderstanding of rules", "Applying the wrong formula"],
      "activities": [
        {"name": "Warm-up Review", "duration_min": 5, "description": "Review core concepts together.", "materials": "Whiteboard"},
        {"name": "Guided Practice", "duration_min": 10, "description": "Work through 3 examples.", "materials": "Worksheet"},
        {"name": "Independent Check", "duration_min": 5, "description": "Students solve 1 problem alone.", "materials": "Paper"}
      ],
      "assessment_checkpoint": "Quick 2-question exit ticket",
      "success_criteria": "80% of class can correctly solve standard problem."
    }

    if not model or not os.getenv("GEMINI_API_KEY"):
        return fallback
        
    prompt = (
        f"Generate a targeted classroom intervention lesson plan for '{topic_name}' because {struggling_pct}% "
        f"of students are struggling. Common wrong answers include: {', '.join(common_wrong_answers)}. "
        f"Return ONLY valid JSON matching this exact schema:\n"
        f"{{\n"
        f'  "lesson_title": "Targeted Intervention: {topic_name}",\n'
        f'  "duration_minutes": 20,\n'
        f'  "target_misconceptions": ["misconception1", "misconception2"],\n'
        f'  "activities": [\n'
        f'    {{"name": "activity name", "duration_min": 5, "description": "...", "materials": "..."}}\n'
        f'  ],\n'
        f'  "assessment_checkpoint": "quick 3-question check at end",\n'
        f'  "success_criteria": "what class should achieve"\n'
        f"}}"
    )

    try:
        response = model.generate_content(prompt)
        text = clean_json_response(response.text)
        return json.loads(text)
    except Exception as e:
        print(f"Gemini API Error (intervention): {e}")
        return fallback

def generate_question(topic_name: str, difficulty: str, existing_questions: list) -> dict:
    fallback = {
      "text": f"What is a fundamental component of {topic_name}?",
      "options": ["Component A", "Component B", "Component C", "Component D"],
      "correct_index": 0,
      "explanation": "Component A is the basic building block.",
      "topic": f"{topic_name}",
      "difficulty": f"{difficulty}"
    }

    if not model or not os.getenv("GEMINI_API_KEY"):
        return fallback
        
    prompt = (
        f"Generate a unique {difficulty} multiple-choice question for topic '{topic_name}'. "
        f"Avoid similarity to these: {existing_questions[:3]}. "
        f"Return ONLY valid JSON matching this exact schema:\n"
        f"{{\n"
        f'  "text": "question text",\n'
        f'  "options": ["option A", "option B", "option C", "option D"],\n'
        f'  "correct_index": 0,\n'
        f'  "explanation": "why this is the correct answer",\n'
        f'  "topic": "{topic_name}",\n'
        f'  "difficulty": "{difficulty}"\n'
        f"}}"
    )

    try:
        response = model.generate_content(prompt)
        text = clean_json_response(response.text)
        return json.loads(text)
    except Exception as e:
        print(f"Gemini API Error (generate_question): {e}")
        return fallback

def generate_ai_insight_for_student(student_name: str, avg_score: float, risk_level: str, weak_topics: list, recent_trend: str) -> dict:
    topics_str = ", ".join(weak_topics) if weak_topics else "None"
    
    fallback = {
      "insight": f"{student_name} is currently performing with an average of {avg_score}%. They are having trouble with {topics_str}. Their recent trend is {recent_trend}.",
      "recommendations": ["Assign extra practice", "Schedule 1-on-1 review"],
      "risk_summary": f"Risk level is {risk_level}."
    }

    if not model or not os.getenv("GEMINI_API_KEY"):
        return fallback
        
    prompt = (
        f"Write a 3-4 sentence actionable insight for a teacher about student '{student_name}'. "
        f"Avg score: {avg_score}%, Risk: {risk_level}, Weak topics: {topics_str}, Trend: {recent_trend}. "
        f"Return ONLY valid JSON matching this exact schema:\n"
        f"{{\n"
        f'  "insight": "The 3-4 sentence actionable insight...",\n'
        f'  "recommendations": ["Recommendation 1", "Recommendation 2"],\n'
        f'  "risk_summary": "Short 1 sentence summary of their risk"\n'
        f"}}"
    )

    try:
        response = model.generate_content(prompt)
        text = clean_json_response(response.text)
        return json.loads(text)
    except Exception as e:
        print(f"Gemini API Error (student_insight): {e}")
        return fallback
