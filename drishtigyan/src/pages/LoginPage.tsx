import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { DrashtiGyanLogo } from '@/components/branding/DrashtiGyanLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('student@demo.com');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const role = await login(email.trim(), password);
      navigate(role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-bg-base text-text-primary overflow-hidden font-satoshi">
      
      {/* LEFT PANEL (55%) */}
      <motion.div 
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden lg:flex w-[55%] flex-col relative p-12 justify-center items-center text-center bg-gradient-to-br from-bg-elevated via-bg-surface to-primary-mid/60"
      >
        <Link to="/" className="absolute top-8 left-8 flex items-center gap-2">
          <DrashtiGyanLogo size="sm" />
        </Link>

        <div className="max-w-md relative z-10 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-8 border border-white/20 shadow-2xl"
          >
            <span className="text-2xl font-black text-white">DG</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-4xl md:text-5xl font-clash font-semibold text-white leading-tight mb-6"
          >
            Drashti<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Gyan</span> <br/>
            <span className="text-white">ज्ञान की नई दृष्टि</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-text-secondary text-lg mb-12"
          >
            AI ki shakti se har student ki learning gaps detect karo aur personalized learning paths banao.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: [0, -8, 0] }}
            transition={{ opacity: { delay: 0.5, duration: 0.8 }, y: { repeat: Infinity, duration: 5, ease: "easeInOut" } }}
            className="w-full max-w-sm"
          >
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 shadow-2xl">
               <div className="flex items-end justify-between gap-2 h-32 mb-4">
                 {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                   <div key={i} className="w-full bg-indigo-500/20 rounded-t-sm relative group">
                     <motion.div 
                       initial={{ height: 0 }}
                       animate={{ height: `${h}%` }}
                       transition={{ delay: 0.8 + (i * 0.1), duration: 0.8, ease: "easeOut" }}
                       className="absolute bottom-0 w-full bg-gradient-to-t from-indigo-600 to-cyan-400 rounded-t-sm opacity-80 group-hover:opacity-100 transition-opacity"
                     />
                   </div>
                 ))}
               </div>
               <div className="h-2 w-1/3 bg-white/20 rounded-full mx-auto" />
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* RIGHT PANEL (45%) */}
      <motion.div 
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        className="w-full lg:w-[45%] flex flex-col justify-center items-center p-8 lg:p-16 relative"
      >
        <div className="w-full max-w-sm relative">
          
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-clash font-semibold text-text-primary mb-2">Welcome Back</h2>
            <p className="text-text-secondary">Please enter your credentials to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Email Address</label>
              <motion.div 
                animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="relative group"
              >
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary-mid transition-colors" />
                <input 
                  type="email" 
                  placeholder="name@school.edu" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-11 pr-4 bg-bg-surface border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid transition-all"
                />
              </motion.div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-text-secondary">Password</label>
                <a href="#" className="text-xs font-medium text-primary-mid hover:text-primary-mid/80">Forgot password?</a>
              </div>
              <motion.div 
                animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="relative group"
              >
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary-mid transition-colors" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-11 pr-11 bg-bg-surface border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid transition-all"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </motion.div>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </motion.div>
                ) : (
                  <motion.span
                    key="text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Sign In
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
            
            <div className="pt-4 border-t border-border-slate-800/50 mt-6">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3 opacity-70">Quick Demo Access</p>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => { setEmail('student@demo.com'); setPassword('demo123'); }}
                  className="flex flex-col items-start p-3 rounded-xl border border-border-default bg-bg-surface/50 hover:border-primary-mid hover:bg-primary-mid/5 transition-all text-left group"
                >
                  <span className="text-xs font-bold text-text-primary group-hover:text-primary-mid transition-colors">Student Demo</span>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[10px] text-text-muted leading-tight">student@demo.com</p>
                    <p className="text-[10px] text-text-muted leading-tight">Pass: demo123</p>
                  </div>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => { setEmail('teacher@demo.com'); setPassword('demo123'); }}
                  className="flex flex-col items-start p-3 rounded-xl border border-border-default bg-bg-surface/50 hover:border-primary-mid hover:bg-primary-mid/5 transition-all text-left group"
                >
                  <span className="text-xs font-bold text-text-primary group-hover:text-primary-mid transition-colors">Teacher Demo</span>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[10px] text-text-muted leading-tight">teacher@demo.com</p>
                    <p className="text-[10px] text-text-muted leading-tight">Pass: demo123</p>
                  </div>
                </motion.button>
              </div>
            </div>
            
            {error && (
              <p className="text-sm text-danger text-center font-medium">{error}</p>
            )}
          </form>

          <p className="text-center text-sm text-text-muted mt-8">
            Don't have an account yet?{' '}
            <Link to="/register" className="text-primary-mid font-medium hover:text-primary-mid/80">
              Create an account
            </Link>
          </p>

          <div className="absolute -bottom-24 left-0 right-0 text-center text-xs text-text-muted flex justify-center gap-4">
            <a href="#" className="hover:text-text-secondary">Privacy Policy</a>
            <span>|</span>
            <a href="#" className="hover:text-text-secondary">Terms of Service</a>
            <span>|</span>
            <a href="#" className="hover:text-text-secondary">Support</a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
