import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Badge, TopicBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Search, Sparkles, Loader2 } from 'lucide-react';
import client from '@/api/client';
import { cn } from '@/lib/utils';
import { showToast } from '@/utils/toast';

const stagger = { animate: { transition: { staggerChildren: 0.08 } } };
const itemFadeIn = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

export default function StudentPerformance() {
  const navigate = useNavigate();
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    client.get('/api/teacher/students')
      .then(res => {
        setAllStudents(res.data);
        setSelectedStudent(res.data?.[0] || null);
      })
      .catch(() => {
        setError('Failed to load students');
        showToast.error('Failed to load students');
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm) return allStudents;
    const q = searchTerm.toLowerCase();
    return allStudents.filter(s =>
      s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [allStudents, searchTerm]);

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setAiInsight('');
    if (!student.topic_proficiency) {
      try {
        const res = await client.get(`/api/teacher/students/${student.id}`);
        setSelectedStudent(res.data);
      } catch {
        showToast.error('Failed to load student details');
      }
    }
  };

  const handleGenerateInsight = async () => {
    if (!selectedStudent) return;
    setIsGenerating(true);
    try {
      const res = await client.post(`/api/teacher/students/${selectedStudent.id}/ai-insight`);
      setAiInsight(res.data.insight);
    } catch {
      setAiInsight('Failed to generate insight.');
    } finally {
      setIsGenerating(false);
    }
  };

  const riskVariant = (risk: string) => {
    if (risk === 'At Risk') return 'critical';
    if (risk === 'Needs Watch') return 'warning';
    return 'success';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <motion.div initial="initial" animate="animate" variants={stagger} className="max-w-7xl mx-auto space-y-6 pb-12 font-satoshi">
      <motion.div variants={itemFadeIn} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-clash font-semibold text-white mb-2">Students</h1>
          <p className="text-slate-400">Track progress, risk levels, and generate AI insights.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-[#0F1629] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 w-full md:w-64"
          />
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div variants={itemFadeIn} className="lg:col-span-2">
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}
          <Card className="overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0A0E1A]/50 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Quizzes</th>
                  <th className="px-6 py-4">Avg Score</th>
                  <th className="px-6 py-4">Weak Topics</th>
                  <th className="px-6 py-4">Risk</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-sm">
                      No students found.
                    </td>
                  </tr>
                ) : filtered.map((student: any, i: number) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * Math.min(i, 10) }}
                    className={cn(
                      "hover:bg-white/[0.02] transition-colors cursor-pointer",
                      selectedStudent?.id === student.id && "bg-white/[0.02]"
                    )}
                    onClick={() => { handleSelectStudent(student); }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {student.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white whitespace-nowrap">{student.name}</p>
                          <p className="text-xs text-slate-400">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{student.quizzes_done}</td>
                    <td className="px-6 py-4 font-mono text-white">{student.avg_score}%</td>
                    <td className="px-6 py-4 text-slate-300">
                      {student.weak_topics?.length ?? student.weak_topics_count ?? 0}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={riskVariant(student.risk_level)}>{student.risk_level}</Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/teacher/students/${student.id}/report`); }}
                      >
                        View Report
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </Card>
        </motion.div>

        <motion.div variants={itemFadeIn}>
          <Card className="p-6 h-full">
            <h3 className="text-lg font-clash font-semibold text-white mb-4">AI Insight</h3>
            {selectedStudent ? (
              <>
                <div className="mb-4">
                  <p className="text-sm text-slate-400">Selected Student</p>
                  <p className="text-white font-semibold">{selectedStudent.name}</p>
                  <p className="text-xs text-slate-500">{selectedStudent.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-[#0A0E1A] border border-white/10 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Avg Score</p>
                    <p className="text-lg font-mono text-white">{selectedStudent.avg_score}%</p>
                  </div>
                  <div className="bg-[#0A0E1A] border border-white/10 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Quizzes</p>
                    <p className="text-lg font-mono text-white">{selectedStudent.quizzes_done}</p>
                  </div>
                </div>

                <Button className="gap-2 w-full" onClick={handleGenerateInsight} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isGenerating ? 'Generating...' : 'Generate Insight'}
                </Button>

                <AnimatePresence>
                  {aiInsight && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mt-5 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
                    >
                      <p className="text-xs font-semibold text-indigo-300 uppercase tracking-widest mb-2">Insight</p>
                      <p className="text-sm text-slate-200">{aiInsight}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-6 pt-6 border-t border-white/5">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Topic Mastery</h4>
                  {(selectedStudent.topic_proficiency || []).length === 0 ? (
                    <p className="text-xs text-slate-500">No topic data available.</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedStudent.topic_proficiency.map((topic: any, idx: number) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-200">{topic.topic}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-mono text-slate-400">{topic.mastery}%</span>
                              <TopicBadge status={topic.mastery >= 75 ? 'strong' : topic.mastery >= 50 ? 'moderate' : 'weak'} />
                            </div>
                          </div>
                          <ProgressBar value={topic.mastery} color={topic.mastery >= 75 ? 'strong' : topic.mastery >= 50 ? 'moderate' : 'weak'} size="sm" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-slate-400 text-sm">Select a student to generate insights.</p>
            )}
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
