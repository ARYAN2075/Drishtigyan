import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { Grid, HelpCircle, BarChart, TrendingUp, BookOpen, Settings, Map, Flame, ListChecks } from 'lucide-react';
import { BarChart2 } from 'lucide-react';

export function StudentLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const navItems = [
    { icon: Grid, label: 'Dashboard', path: '/student/dashboard' },
    { icon: HelpCircle, label: 'Quizzes', path: '/student/quizzes' },
    { icon: BarChart, label: 'Gap Report', path: '/student/gaps' },
    { icon: TrendingUp, label: 'Practice', path: '/student/practice' },
    { icon: Map, label: 'Knowledge Map', path: '/student/knowledge-map' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <DashboardLayout
      userRole="student"
      userName={user?.name || 'Student'}
      userEmail={user?.email}
      userSubtitle="Student Account"
      logoTitle="DrashtiGyan"
      logoSubtitle="à¤œà¥à¤žà¤¾à¤¨ à¤•à¥€ à¤¨à¤ˆ à¤¦à¥ƒà¤·à¥à¤Ÿà¤¿"
      LogoIcon={<BarChart2 className="w-5 h-5" />}
      navItems={navItems}
      onLogout={handleLogout}
    />
  );
}

export function TeacherLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const navItems = [
    { icon: Grid, label: 'Dashboard', path: '/teacher/dashboard' },
    { icon: BookOpen, label: 'Classroom', path: '/teacher/students' },
    { icon: BarChart, label: 'Topic Analysis', path: '/teacher/topic-analysis/1' },
    { icon: Flame, label: 'Learning Heatmap', path: '/teacher/heatmap' },
    { icon: HelpCircle, label: 'Question Bank', path: '/teacher/questions' },
    { icon: Settings, label: 'Create Quiz', path: '/teacher/create-quiz' },
    { icon: ListChecks, label: 'My Quizzes', path: '/teacher/quizzes' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <DashboardLayout
      userRole="teacher"
      userName={user?.name || 'Teacher'}
      userEmail={user?.email}
      userSubtitle="Teacher Account"
      logoTitle="DrashtiGyan"
      logoSubtitle="Teacher Portal"
      LogoIcon={<BarChart2 className="w-5 h-5" />}
      navItems={navItems}
      onLogout={handleLogout}
    />
  );
}
