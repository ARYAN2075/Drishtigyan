import json
import random
from datetime import datetime, timedelta, timezone

from backend.database import SessionLocal, engine, Base
from backend import models, auth


def seed_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing data for idempotency
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()

    random.seed(42)

    print("Seeding Users...")
    student_profiles = [
        {"name": "Rahul Sharma", "email": "student@demo.com", "profile": "mixed"},
        {"name": "Priya Patel", "email": "student2@demo.com", "profile": "top"},
        {"name": "Amit Kumar", "email": "student3@demo.com", "profile": "at_risk"},
        {"name": "Neha Verma", "email": "student4@demo.com", "profile": "average"},
        {"name": "Arjun Mehta", "email": "student5@demo.com", "profile": "average"},
        {"name": "Sneha Iyer", "email": "student6@demo.com", "profile": "average"},
        {"name": "Kabir Singh", "email": "student7@demo.com", "profile": "average"},
        {"name": "Anaya Rao", "email": "student8@demo.com", "profile": "average"},
        {"name": "Vihaan Kapoor", "email": "student9@demo.com", "profile": "average"},
        {"name": "Ishita Nair", "email": "student10@demo.com", "profile": "average"},
        {"name": "Rohan Das", "email": "student11@demo.com", "profile": "average"},
        {"name": "Meera Joshi", "email": "student12@demo.com", "profile": "average"},
    ]
    users_data = [
        models.User(
            name=s["name"],
            email=s["email"],
            password_hash=auth.get_password_hash("demo123"),
            role="student"
        )
        for s in student_profiles
    ]
    users_data.append(
        models.User(
            name="Ms. Sarah Jenkins",
            email="teacher@demo.com",
            password_hash=auth.get_password_hash("demo123"),
            role="teacher"
        )
    )
    db.bulk_save_objects(users_data)
    db.commit()

    teacher = db.query(models.User).filter_by(email="teacher@demo.com").first()
    students = db.query(models.User).filter_by(role="student").all()
    student_map = {s.email: s for s in students}

    print("Seeding Topics...")
    topic_names = [
        "Algebra", "Calculus", "Statistics", "Graphs", "Trigonometry",
        "Probability", "Geometry", "Basic Mathematics", "Coordinate Geometry"
    ]
    topics_obj = [models.Topic(name=n, subject="Mathematics") for n in topic_names]
    db.bulk_save_objects(topics_obj)
    db.commit()

    tm = {t.name: t for t in db.query(models.Topic).all()}

    print("Seeding Topic Dependencies (Knowledge Map)...")
    dependencies = [
        ("Graphs", "Linear Equations"),
        ("Coordinate Geometry", "Graphs"),
        ("Trigonometry", "Angles"),
        ("Calculus", "Functions"),
        ("Calculus", "Algebra"),
        ("Probability", "Basic Mathematics"),
        ("Statistics", "Basic Mathematics"),
        ("Geometry", "Basic Mathematics")
    ]
    
    # We might need to make sure Linear Equations, Angles, Functions exist first.
    # Let's add them to topics if they are missing
    extra_topics = ["Linear Equations", "Angles", "Functions"]
    for extra in extra_topics:
        if extra not in tm:
            new_t = models.Topic(name=extra, subject="Mathematics")
            db.add(new_t)
            db.commit()
            db.refresh(new_t)
            tm[extra] = new_t

    deps_obj = []
    for topic, prereq in dependencies:
        if topic in tm and prereq in tm:
            deps_obj.append(models.TopicDependency(topic_id=tm[topic].id, prerequisite_id=tm[prereq].id))
    
    db.bulk_save_objects(deps_obj)
    db.commit()

    print("Seeding Questions... (28 questions)")
    questions_data = [
        # Algebra
        ("Solve for x: 2x + 5 = 15", ["x = 5", "x = 10", "x = 2", "x = 7"], 0, "Algebra", "Easy"),
        ("Factorize: x² - 9", ["(x - 3)(x + 3)", "(x - 9)(x + 1)", "(x - 3)²", "(x + 3)²"], 0, "Algebra", "Medium"),
        ("If f(x) = 3x - 2, what is f(4)?", ["10", "12", "14", "8"], 0, "Algebra", "Medium"),
        ("Simplify: (x + 2)(x - 5)", ["x² - 3x - 10", "x² + 7x - 10", "x² - 7x + 10", "x² + 3x - 10"], 0, "Algebra", "Easy"),

        # Calculus
        ("Find the derivative of f(x) = x²", ["x", "2x", "x²", "x/2"], 1, "Calculus", "Medium"),
        ("Integrate: ∫ 2x dx", ["x² + C", "x + C", "2x² + C", "None of these"], 0, "Calculus", "Medium"),
        ("What is the derivative of sin(x)?", ["cos(x)", "-cos(x)", "-sin(x)", "sin(x)"], 0, "Calculus", "Hard"),
        ("Find the limit: lim(x→0) sin(x)/x", ["0", "1", "∞", "undefined"], 1, "Calculus", "Hard"),

        # Statistics
        ("What is the probability of rolling a 6 on a fair die?", ["1/2", "1/6", "1/3", "1/4"], 1, "Statistics", "Easy"),
        ("The mean of 3, 7, 8, 10, 12 is:", ["8", "9", "10", "7.5"], 0, "Statistics", "Medium"),
        ("Which measure is least affected by outliers?", ["Mean", "Mode", "Median", "Range"], 2, "Statistics", "Medium"),
        ("Standard deviation measures:", ["Central tendency", "Variability", "Skewness", "Median"], 1, "Statistics", "Medium"),

        # Graphs
        ("What is the slope of y = 3x + 4?", ["3", "4", "-3", "1/3"], 0, "Graphs", "Easy"),
        ("Which point lies on the line y = 2x - 1?", ["(1, 1)", "(2, 3)", "(3, 5)", "(0, -1)"], 3, "Graphs", "Medium"),
        ("What is the y-intercept of 4x + 2y = 8?", ["2", "4", "8", "-2"], 1, "Graphs", "Hard"),
        ("The line x = 5 is:", ["Horizontal", "Vertical", "Diagonal", "Parabola"], 1, "Graphs", "Easy"),

        # Trigonometry
        ("What is sin(30°)?", ["√3/2", "1/2", "1", "√2/2"], 1, "Trigonometry", "Medium"),
        ("What is the value of cos(0°)?", ["0", "1", "-1", "∞"], 1, "Trigonometry", "Hard"),
        ("tan(45°) equals:", ["0", "1", "√3", "2"], 1, "Trigonometry", "Easy"),

        # Probability
        ("What is the probability of flipping heads?", ["1/3", "1/2", "1/4", "2/3"], 1, "Probability", "Easy"),
        ("Probability of getting an even number on a die:", ["1/6", "1/3", "1/2", "2/3"], 2, "Probability", "Easy"),

        # Geometry
        ("Sum of interior angles of a triangle is:", ["90°", "180°", "270°", "360°"], 1, "Geometry", "Easy"),
        ("Area of a circle is:", ["πr²", "2πr", "πd", "r²"], 0, "Geometry", "Medium"),

        # Basic Mathematics
        ("12 ÷ 3 equals:", ["2", "3", "4", "6"], 2, "Basic Mathematics", "Easy"),
        ("7 × 8 equals:", ["54", "56", "48", "64"], 1, "Basic Mathematics", "Easy"),

        # Coordinate Geometry
        ("Distance between (0,0) and (3,4) is:", ["5", "7", "4", "3"], 0, "Coordinate Geometry", "Medium"),
        ("Midpoint of (2,2) and (6,6) is:", ["(2,6)", "(4,4)", "(6,2)", "(8,8)"], 1, "Coordinate Geometry", "Medium"),
    ]

    q_objs = []
    for qd in questions_data:
        q = models.Question(
            text=qd[0],
            options=json.dumps(qd[1]),
            correct_index=qd[2],
            topic_id=tm[qd[3]].id,
            difficulty=qd[4],
            created_by=teacher.id
        )
        q_objs.append(q)
    db.bulk_save_objects(q_objs)
    db.commit()

    topic_questions = {name: db.query(models.Question).filter_by(topic_id=tm[name].id).all() for name in tm.keys()}

    print("Seeding Quizzes...")
    quiz_defs = [
        ("Algebra Quiz", "Algebra", 15, "Medium"),
        ("Graph Plotting Quiz", "Graphs", 15, "Medium"),
        ("Trigonometry Quiz", "Trigonometry", 15, "Medium"),
        ("Basic Mathematics Quiz", "Basic Mathematics", 12, "Easy"),
        ("Coordinate Geometry Quiz", "Coordinate Geometry", 15, "Medium"),
        ("Calculus Basics", "Calculus", 20, "Hard"),
        ("Statistics 101", "Statistics", 15, "Medium"),
    ]

    quizzes = []
    for title, topic_name, time_limit, difficulty in quiz_defs:
        q = models.Quiz(
            title=title,
            description=f"{topic_name} assessment to reinforce core concepts.",
            topic_id=tm[topic_name].id,
            created_by=teacher.id,
            time_limit_minutes=time_limit,
            difficulty=difficulty
        )
        db.add(q)
        quizzes.append((q, topic_name))
    db.commit()

    for quiz, topic_name in quizzes:
        for i, q in enumerate(topic_questions[topic_name]):
            db.add(models.QuizQuestion(quiz_id=quiz.id, question_id=q.id, order_position=i))
    db.commit()

    now = datetime.now(timezone.utc)

    print("Seeding Mastery Records...")
    def mastery_range(profile: str):
        if profile == "top":
            return (0.75, 0.95)
        if profile == "at_risk":
            return (0.2, 0.45)
        if profile == "mixed":
            return (0.3, 0.85)
        return (0.45, 0.75)

    overrides = {
        "student@demo.com": {"Algebra": 0.82, "Calculus": 0.35, "Statistics": 0.65, "Graphs": 0.38, "Trigonometry": 0.7},
        "student2@demo.com": {"Algebra": 0.92, "Calculus": 0.88, "Statistics": 0.9, "Graphs": 0.85, "Trigonometry": 0.87},
        "student3@demo.com": {"Algebra": 0.28, "Calculus": 0.22, "Statistics": 0.3, "Graphs": 0.25, "Trigonometry": 0.2},
    }

    mastery_map = {}
    for profile in student_profiles:
        student = student_map[profile["email"]]
        mastery_map[student.id] = {}
        low, high = mastery_range(profile["profile"])
        for topic_name in topic_names:
            score = overrides.get(profile["email"], {}).get(topic_name, random.uniform(low, high))
            mastery_map[student.id][tm[topic_name].id] = score
            db.add(models.StudentConceptMastery(
                student_id=student.id,
                topic_id=tm[topic_name].id,
                mastery_score=round(score, 2),
                theta=round((score - 0.5) * 2, 2),
                interval_days=max(1, int(score * 10)),
                next_review_date=now + timedelta(days=random.randint(1, 6)),
                total_attempts=random.randint(3, 12),
                correct_count=random.randint(1, 10)
            ))
    db.commit()

    print("Seeding Quiz Attempts and Responses...")
    quiz_list = [q for q, _ in quizzes]
    for profile in student_profiles:
        student = student_map[profile["email"]]
        selected = random.sample(quiz_list, k=min(4, len(quiz_list)))
        for i, quiz in enumerate(selected):
            topic_id = quiz.topic_id
            topic_name = db.query(models.Topic).filter_by(id=topic_id).first().name
            mastery_score = mastery_map[student.id][topic_id]
            total_q = len(topic_questions[topic_name])
            score_pct = max(10, min(100, round(mastery_score * 100 + random.uniform(-12, 12))))
            correct_count = max(0, min(total_q, round(score_pct / 100 * total_q)))
            submitted_at = now - timedelta(days=random.randint(1, 30))
            attempt = models.QuizAttempt(
                student_id=student.id,
                quiz_id=quiz.id,
                score_pct=score_pct,
                total_questions=total_q,
                correct_count=correct_count,
                is_complete=True,
                started_at=submitted_at - timedelta(seconds=random.randint(120, 480)),
                submitted_at=submitted_at,
                time_taken_seconds=random.randint(120, 480)
            )
            db.add(attempt)
            db.flush()

            # Responses for analytics
            for q in topic_questions[topic_name]:
                opts = json.loads(q.options) if q.options else []
                is_correct = random.random() < mastery_score
                if is_correct:
                    selected_index = q.correct_index
                else:
                    if len(opts) > 1:
                        selected_index = (q.correct_index + random.randint(1, len(opts) - 1)) % len(opts)
                    else:
                        selected_index = q.correct_index
                db.add(models.Response(
                    attempt_id=attempt.id,
                    question_id=q.id,
                    selected_index=selected_index,
                    is_correct=is_correct,
                    time_taken_seconds=random.randint(10, 40)
                ))
        db.commit()

    print("\n✅ Database seeded successfully!")
    print("   Teacher:  teacher@demo.com / demo123")
    print("   Student:  student@demo.com / demo123")
    print("   Student2: student2@demo.com / demo123")
    print("   At-Risk:  student3@demo.com / demo123")
    db.close()


if __name__ == "__main__":
    seed_db()
