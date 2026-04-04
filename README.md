# DrashtiGyan

DrashtiGyan is an AI-powered learning gap detection and student performance analytics platform built for both students and teachers. It analyzes quiz performance to identify weak concepts, tracks topic-wise mastery, and delivers personalized academic support through AI-generated explanations, study plans, and practice recommendations. For teachers, it provides real-time class analytics, topic insights, at-risk student detection, learning heatmaps, and intervention tools to improve classroom outcomes.

## Key Features

### Student Features
- Secure student login and dashboard
- Quiz-based learning gap detection
- Topic mastery tracking and knowledge map visualization
- AI-generated explanations for incorrect answers
- Personalized study plans and recommended practice
- Performance trends and recent quiz history

### Teacher Features
- Teacher dashboard with class-level analytics
- Topic-wise gap analysis and learning heatmaps
- At-risk student identification
- Student performance reports
- Question bank and quiz creation tools
- AI-assisted intervention planning

### AI Capabilities
- Detects weak concepts from quiz results
- Explains likely misconceptions behind wrong answers
- Generates personalized study plans
- Suggests classroom interventions for teachers
- Supports adaptive academic insights using Gemini AI

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- State Management: Zustand, React Query
- Visualization: Recharts, Framer Motion
- Backend: FastAPI, SQLAlchemy, Pydantic
- Database: SQLite
- AI Integration: Gemini AI
- Utilities: Axios, jsPDF, ReportLab

## Project Structure

- `src/` - Frontend application
- `backend/` - FastAPI backend
- `backend/routers/` - API routes
- `backend/services/` - AI, analytics, and gap detection logic
- `backend/learning_gap.db` - SQLite database
- `.env` - Frontend environment variables
- `backend/.env` - Backend environment variables

## Local Setup

### Prerequisites
- Node.js
- Python 3.13
- npm

### Install Dependencies
```powershell
cd "C:\Users\aryan\OneDrive\Desktop\drishtigyan 2\drishtigyan"
npm.cmd install
py -3.13 -m venv backend\win_venv313
py -3.13 -m pip --python backend\win_venv313\Scripts\python.exe install -r backend\requirements.txt
