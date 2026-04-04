import { useEffect, useState } from 'react';
import { useSearchParams, useParams, useNavigate, useLocation } from 'react-router-dom';
import client from '@/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import {
  PieChart as PieChartIcon, AlertTriangle, AlertCircle,
  Zap, CheckSquare, CheckCircle2, XCircle, ChevronDown,
  ClipboardList, Clock, Sparkles, Loader2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const stagger = { animate: { transition: { staggerChildren: 0.1 } } };
const itemFadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export default function QuizResults() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Try to get result from navigation state first (passed from QuizAttempt after submit)
  const [result, setResult] = useState<any>(location.state?.result || null);
  const [loading, setLoading] = useState(!result);
  const [ringProgress, setRingProgress] = useState(0);
  const [error, setError] = useState('');

  // Review all answers section
  const [reviewOpen, setReviewOpen] = useState(false);
  const [explanations, setExplanations] = useState<Record<number, any>>({});
  const [explaining, setExplaining] = useState<number | null>(null);

  const attemptId = searchParams.get('attempt');

  // If no result from state: fetch from API
  useEffect(() => {
    if (!result && id && attemptId) {
      client.get(`/api/quizzes/${id}/attempt/${attemptId}/result`)
        .then(res => {
          setResult(res.data);
          setTimeout(() => setRingProgress(res.data.score_pct), 500);
        })
        .catch(() => setError('Failed to load quiz result'))
        .finally(() => setLoading(false));
    } else if (!result && !attemptId) {
      setError('Missing attempt id for result');
      setLoading(false);
    } else if (result) {
      setTimeout(() => setRingProgress(result.score_pct), 500);
    }
  }, []);

  const handleExplainGap = async (item: any) => {
    setExplaining(item.question_id);
    try {
      const res = await client.post('/api/ai/explain-gap', {
        topic_name: item.topic,
        question_text: item.question_text,
        wrong_answer: item.selected_option || 'Not answered',
        correct_answer: item.correct_option,
      });
      setExplanations(prev => ({ ...prev, [item.question_id]: res.data }));
    } catch (e) {
      console.error(e);
    } finally {
      setExplaining(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }
  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-slate-400 mb-4">{error || 'No result found.'}</p>
          <Button variant="outline" onClick={() => navigate('/student/quizzes')}>Back to Quizzes</Button>
        </div>
      </div>
    );
  }

  const pieData = [
    { name: 'Correct', value: ringProgress },
    { name: 'Incorrect', value: 100 - ringProgress },
  ];
  const COLORS = ['#6366F1', '#1e293b'];
  const gaps = result.gaps_detected || [];
  const perQuestion = result.per_question_results || [];

  return (
    <motion.div initial="initial" animate="animate" variants={stagger} className="max-w-6xl mx-auto space-y-8 pb-12 font-satoshi">

      {/* SCORE HERO */}
      <motion.div variants={itemFadeIn}>
        <div className="w-full rounded-3xl bg-gradient-to-br from-[#1E1B4B] to-[#2D1B69] p-8 md:p-12 text-center shadow-xl shadow-indigo-900/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
          <div className="relative z-10">
            <div className="flex justify-center gap-3 mb-6 text-2xl">
              {result.score_pct >= 80 ? '🎉 🌟 ✨' : result.score_pct >= 50 ? '👍 📚 💡' : '💪 🔄 📖'}
            </div>
            <h1 className="text-7xl md:text-8xl font-clash font-bold text-white mb-2">
              <AnimatedCounter to={result.score_pct} suffix="%" />
            </h1>
            <h2 className="text-2xl font-bold text-white mb-4">
              {result.score_pct >= 80 ? 'Excellent Work! 🎉' : result.score_pct >= 50 ? 'Good Effort! 👍' : 'Keep Practicing! 💪'}
            </h2>
            <p className="text-indigo-200/80 max-w-xl mx-auto mb-10 text-lg">
              You've completed the assessment. Review your answers and gaps below to improve.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="bg-[#0A0A1F]/60 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
                <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider">SCORE:</span>
                <span className="text-white font-medium">{result.correct_count} / {result.total_questions}</span>
              </div>
              <div className="bg-[#0A0A1F]/60 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
                <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider">ACCURACY:</span>
                <span className="text-white font-medium">{Math.round(result.score_pct)}%</span>
              </div>
              <div className="bg-[#0A0A1F]/60 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
                <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider">TIME:</span>
                <span className="text-white font-medium">{result.time_formatted}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* PIE CHART + GAPS */}
      <div className="grid md:grid-cols-5 gap-8">
        <motion.div variants={itemFadeIn} className="md:col-span-2">
          <Card className="p-6 h-full flex flex-col">
            <h3 className="text-lg font-clash font-semibold text-white mb-6 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-indigo-400" /> Performance Overview
            </h3>
            <div className="flex-1 relative min-h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={90}
                    startAngle={90} endAngle={-270} dataKey="value" stroke="none"
                    animationDuration={1500} animationEasing="ease-out">
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-3xl font-clash font-bold text-white">
                  {result.correct_count}<span className="text-xl text-slate-500">/{result.total_questions}</span>
                </span>
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mt-1">CORRECT</span>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-3 h-3 rounded-full bg-indigo-500" /> Correct ({result.correct_count})
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700" /> Incorrect ({result.total_questions - result.correct_count})
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemFadeIn} className="md:col-span-3">
          <Card className="p-6 h-full bg-[#0F1629]">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg font-clash font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-indigo-400" /> Learning Gaps Detected
              </h3>
              <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                {gaps.length} TOPICS FOUND
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {gaps.map((gap: any, idx: number) => {
                const colorClass = gap.status === 'critical' ? 'bg-red-500 text-red-400' :
                  gap.status === 'weak' ? 'bg-amber-500 text-amber-400' : 'bg-blue-500 text-blue-400';
                const borderHover = gap.status === 'critical' ? 'hover:border-red-500/30' :
                  gap.status === 'weak' ? 'hover:border-amber-500/30' : 'hover:border-blue-500/30';
                return (
                  <Card key={idx} className={`p-4 bg-[#151B2E] border-white/5 border ${borderHover} transition-colors`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-white">{gap.topic}</h4>
                      {gap.status === 'critical' ? <AlertCircle className="w-4 h-4 text-red-500 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                    </div>
                    <div className="flex justify-between text-xs mb-1 mt-4">
                      <span className="text-slate-500 font-medium">Proficiency</span>
                      <span className={`font-bold ${colorClass.split(' ')[1]}`}>{Math.round(gap.mastery_score * 100)}%</span>
                    </div>
                    <ProgressBar value={gap.mastery_score * 100} colorClass={colorClass.split(' ')[0]} className="h-1" />
                  </Card>
                );
              })}
              {gaps.length === 0 && (
                <p className="text-slate-400 text-sm col-span-full py-4 text-center">No major gaps detected — great work!</p>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* REVIEW ALL ANSWERS — Collapsible */}
      <motion.div variants={itemFadeIn}>
        <Card className="overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 hover:bg-white/[0.02] transition-colors"
            onClick={() => setReviewOpen(!reviewOpen)}
          >
            <h3 className="text-lg font-clash font-semibold text-white flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-indigo-400" />
              Review All Answers ({perQuestion.length} Questions)
            </h3>
            <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${reviewOpen ? 'rotate-180' : ''}`} />
          </div>

          <AnimatePresence>
            {reviewOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 space-y-4 border-t border-white/5 pt-4">
                  {perQuestion.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border-l-4 ${item.is_correct
                        ? 'border-l-emerald-500 bg-emerald-500/5 border border-emerald-500/20'
                        : 'border-l-red-500 bg-red-500/5 border border-red-500/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {item.is_correct
                          ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                          : <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                        }
                        <div className="flex-1">
                          <p className="font-medium text-white mb-3">
                            Q{idx + 1}. {item.question_text}
                          </p>

                          {/* All 4 options */}
                          <div className="space-y-2 mb-3">
                            {(item.all_options || []).map((opt: string, optIdx: number) => (
                              <div
                                key={optIdx}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${optIdx === item.correct_index
                                  ? 'bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/30'
                                  : optIdx === item.selected_index && !item.is_correct
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                    : 'text-slate-400'
                                }`}
                              >
                                <span className="font-mono w-5 shrink-0">{String.fromCharCode(65 + optIdx)}.</span>
                                <span className="flex-1">{opt}</span>
                                {optIdx === item.correct_index && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                                {optIdx === item.selected_index && !item.is_correct && <XCircle className="h-4 w-4 shrink-0" />}
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {item.time_taken_seconds}s
                            </span>
                            <span>Topic: {item.topic}</span>
                            {!item.is_correct && (
                              <button
                                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                                onClick={() => handleExplainGap(item)}
                                disabled={explaining === item.question_id}
                              >
                                {explaining === item.question_id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Sparkles className="h-3 w-3" />
                                }
                                {explaining === item.question_id ? 'Explaining...' : 'Explain this'}
                              </button>
                            )}
                          </div>

                          {/* AI Explanation */}
                          {explanations[item.question_id] && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-3 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20"
                            >
                              <p className="text-sm font-semibold text-indigo-400 mb-2 flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4" /> AI Explanation
                              </p>
                              <p className="text-sm text-slate-300 mb-2">{explanations[item.question_id].explanation}</p>
                              <p className="text-xs text-slate-400 mb-2">
                                <strong className="text-slate-300">Common mistake:</strong>{' '}
                                {explanations[item.question_id].common_mistake}
                              </p>
                              {explanations[item.question_id].fix_steps?.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-semibold text-slate-400 mb-1">Fix this in {explanations[item.question_id].estimated_fix_time}:</p>
                                  <ul className="space-y-1">
                                    {explanations[item.question_id].fix_steps.map((step: string, si: number) => (
                                      <li key={si} className="text-xs text-slate-400 flex items-start gap-1.5">
                                        <span className="text-indigo-400 font-bold shrink-0">{si + 1}.</span> {step}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* NEXT STEPS */}
      <motion.div variants={itemFadeIn}>
        <Card className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-[#0F1629] to-[#151B2E]">
          <div>
            <h3 className="text-xl font-clash font-semibold text-white mb-2">Next Steps</h3>
            <p className="text-slate-400">Accelerate your learning by targeting your weak spots now.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" className="gap-2 shadow-indigo-500/20" onClick={() => navigate('/student/practice')}>
              <Zap className="w-4 h-4 text-yellow-300" fill="currentColor" /> Start Practice
            </Button>
            <Button variant="ghost" className="bg-[#1E293B] text-white hover:bg-[#334155] border-none" onClick={() => navigate('/student/quizzes')}>
              Take Another Quiz
            </Button>
            <Button variant="ghost" className="bg-[#1E293B] text-white hover:bg-[#334155] border-none" onClick={() => navigate('/student/dashboard')}>
              <CheckSquare className="w-4 h-4 mr-2" /> Dashboard
            </Button>
          </div>
        </Card>
      </motion.div>

    </motion.div>
  );
}
