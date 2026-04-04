import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Loader2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DrashtiGyanLogo } from '@/components/branding/DrashtiGyanLogo';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userRole = await register(name.trim(), email.trim(), password, role);
      navigate(userRole === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base text-text-primary px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-bg-surface border border-border-subtle rounded-3xl p-8 shadow-2xl"
      >
        <div className="flex items-center justify-center mb-6">
          <DrashtiGyanLogo size="default" />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-heading font-bold text-text-primary">Create your account</h1>
          <p className="text-text-secondary text-sm mt-1">ज्ञान की नई दृष्टि — start learning smarter</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Full Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-bg-base border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="email"
              placeholder="Email Address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-bg-base border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-bg-base border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(['student', 'teacher'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`h-11 rounded-xl border text-sm font-semibold transition ${
                  role === r
                    ? 'bg-primary-mid/15 border-primary-mid text-primary-mid'
                    : 'bg-bg-base border-border-default text-text-secondary hover:text-text-primary'
                }`}
              >
                {r === 'student' ? 'Student' : 'Teacher'}
              </button>
            ))}
          </div>

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Loader2 className="w-5 h-5 animate-spin" />
                </motion.span>
              ) : (
                <motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <UserCheck className="w-4 h-4 mr-1.5" />
                  Create Account
                </motion.span>
              )}
            </AnimatePresence>
          </Button>

          {error && <p className="text-sm text-danger text-center font-medium">{error}</p>}
        </form>

        <p className="text-center text-sm text-text-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-mid font-medium hover:text-primary-mid/80">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
