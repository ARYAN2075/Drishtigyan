import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';

// Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';

// Student Pages
import StudentDashboard from '@/pages/student/Dashboard';
import QuizLibrary from '@/pages/student/QuizLibrary';
import QuizAttempt from '@/pages/student/QuizAttempt';
import QuizResults from '@/pages/student/QuizResults';
import TopicAnalysis from '@/pages/student/TopicAnalysis';
import RecommendedPractice from '@/pages/student/RecommendedPractice';
import KnowledgeMap from '@/pages/student/KnowledgeMap';

// Teacher Pages
import TeacherDashboard from '@/pages/teacher/Dashboard';
import ClassAnalytics from '@/pages/teacher/ClassAnalytics';
import StudentPerformance from '@/pages/teacher/StudentPerformance';
import StudentReport from '@/pages/teacher/StudentReport';
import QuestionBank from '@/pages/teacher/QuestionBank';
import CreateQuiz from '@/pages/teacher/CreateQuiz';
import TeacherTopicAnalysis from '@/pages/teacher/TopicAnalysis';
import LearningHeatmap from '@/pages/teacher/LearningHeatmap';
import MyQuizzes from '@/pages/teacher/MyQuizzes';

// Layouts
import { StudentLayout, TeacherLayout } from '@/components/layout/RoleLayouts';

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Student Routes */}
        <Route element={<StudentLayout />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/quizzes" element={<QuizLibrary />} />
          <Route path="/student/quiz/:id/results" element={<QuizResults />} />
          <Route path="/student/gaps" element={<TopicAnalysis />} />
          <Route path="/student/practice" element={<RecommendedPractice />} />
          <Route path="/student/knowledge-map" element={<KnowledgeMap />} />
        </Route>
        
        {/* Quiz Attempt is full screen, no sidebar */}
        <Route path="/student/quiz/:id" element={<QuizAttempt />} />
        
        {/* Teacher Student Report is full screen, no sidebar */}
        <Route path="/teacher/students/:id/report" element={<StudentReport />} />

        {/* Teacher Routes */}
        <Route element={<TeacherLayout />}>
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/analytics" element={<ClassAnalytics />} />
          <Route path="/teacher/topic-analysis/:topicId" element={<TeacherTopicAnalysis />} />
          <Route path="/teacher/heatmap" element={<LearningHeatmap />} />
          <Route path="/teacher/students" element={<StudentPerformance />} />
          <Route path="/teacher/questions" element={<QuestionBank />} />
          <Route path="/teacher/create-quiz" element={<CreateQuiz />} />
          <Route path="/teacher/quizzes" element={<MyQuizzes />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const fetchMe = useAuthStore((state) => state.fetchMe);

  useEffect(() => {
    if (localStorage.getItem('access_token')) fetchMe();
  }, [fetchMe]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0A0E1A] text-slate-200 font-satoshi">
        <AnimatedRoutes />
      </div>
    </BrowserRouter>
  );
}

export default App;
