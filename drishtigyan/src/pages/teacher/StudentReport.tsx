import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Mail, Search, Bell, ArrowLeft, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { LineChartCard } from '@/components/charts/LineChartCard';
import { showToast } from '@/utils/toast';
import { cn } from '@/lib/utils';
import client from '@/api/client';
import useAuthStore from '@/store/authStore';
import { DrashtiGyanLogo } from '@/components/branding/DrashtiGyanLogo';

const getAssessmentStatus = (score: number) => {
  if (score >= 88) return { label: 'EXCELLENT', color: 'text-success' };
  if (score >= 70) return { label: 'GOOD', color: 'text-warning' };
  return { label: 'NEEDS REVIEW', color: 'text-danger' };
};

const masteryToColor = (pct: number) => {
  if (pct >= 75) return 'strong';
  if (pct >= 50) return 'moderate';
  return 'weak';
};

const masteryToTextColor = (pct: number) => {
  if (pct >= 75) return 'text-success';
  if (pct >= 50) return 'text-warning';
  return 'text-danger';
};

export default function StudentReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<number | null>(null);
  const [attemptDetail, setAttemptDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    client.get(`/api/teacher/students/${id}`)
      .then(res => setStudent(res.data))
      .catch(() => {
        showToast.error('Failed to load student data');
        navigate('/teacher/students');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const res = await client.get(`/api/teacher/students/${id}/report-pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${student?.name?.replace(/\s+/g, '_') || 'student'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast.success('Report downloaded!');
    } catch {
      showToast.error('Download failed');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleGenerateInsight = async () => {
    setLoadingInsight(true);
    try {
      const res = await client.post(`/api/teacher/students/${id}/ai-insight`);
      setAiInsight(res.data.insight);
    } catch {
      showToast.error('Could not generate insight');
    } finally {
      setLoadingInsight(false);
    }
  };

  const handleContactParent = () => {
    if (!student?.email) return;
    window.location.href = `mailto:${student.email}?subject=Student%20Progress%20Update`;
  };

  const handleViewAttempt = async (attemptId: number) => {
    setLoadingDetail(true);
    setSelectedAttempt(attemptId);
    try {
      const res = await client.get(`/api/teacher/students/${id}/attempts/${attemptId}`);
      setAttemptDetail(res.data);
    } catch {
      showToast.error('Could not load quiz detail');
    } finally {
      setLoadingDetail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary-mid border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-secondary text-sm">Loading student report...</p>
        </div>
      </div>
    );
  }

  if (!student || student.error) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center gap-4">
        <p className="text-text-secondary">Student not found.</p>
        <Button onClick={() => navigate('/teacher/students')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Students
        </Button>
      </div>
    );
  }

  const trendData = (student.trend || []).map((item: any, i: number) => ({
    label: item.quiz || `Q${i + 1}`,
    score: Math.round(item.score || 0),
  }));

  const recentAttempts = student.recent_attempts || [];
  const strongTopics = student.strong_topics || [];
  const weakTopics = student.weak_topics || [];
  const topicProficiency = (student.topic_proficiency || []).sort((a: any, b: any) => b.mastery - a.mastery);

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border-subtle bg-bg-base/80 backdrop-blur-md px-6 py-3 lg:px-10">
        <div className="flex items-center gap-8">
          <button onClick={() => navigate('/teacher/dashboard')} className="flex items-center gap-2.5 group">
            <DrashtiGyanLogo size="sm" />
          </button>

          <nav className="hidden md:flex items-center gap-6">
            {[
              { label: 'Dashboard', path: '/teacher/dashboard' },
              { label: 'Students', path: '/teacher/students' },
              { label: 'Reports', path: null },
              { label: 'Curriculum', path: null },
            ].map(({ label, path }) => (
              <button
                key={label}
                onClick={() => path && navigate(path)}
                className={cn(
                  'text-sm font-medium transition-colors',
                  label === 'Students'
                    ? 'text-primary-mid border-b-2 border-primary-mid pb-1'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              className="pl-9 pr-4 py-2 rounded-xl border border-border-default bg-bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-mid w-52 transition-all"
              placeholder="Search students..."
            />
          </div>
          <button className="p-2 text-text-secondary hover:bg-bg-hover rounded-full transition-colors relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger ring-2 ring-bg-base" />
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-mid to-indigo-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {(user?.name || 'T').charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 lg:px-10 max-w-7xl mx-auto w-full">
        <button
          onClick={() => navigate('/teacher/students')}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary text-sm font-medium mb-6 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Students
        </button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8 p-6 bg-bg-surface rounded-[var(--radius-card)] border border-border-subtle shadow-card"
        >
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="relative shrink-0">
              <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-primary-mid/20 bg-bg-elevated flex items-center justify-center">
                <span className="text-4xl font-bold text-white bg-gradient-to-br from-primary-mid to-indigo-400 w-full h-full flex items-center justify-center">
                  {student.name?.charAt(0)?.toUpperCase() || 'S'}
                </span>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-success text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-bg-base">
                ACTIVE
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-3xl font-heading font-bold text-text-primary">{student.name}</h1>
                  <p className="text-text-muted font-medium mt-1 text-sm">
                    Grade 10 - Mathematics - Student ID: #{String(student.id).padStart(5, '0')}
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <Button variant="secondary" onClick={handleDownloadPDF} disabled={downloadingPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    {downloadingPDF ? 'Downloading...' : 'Full Report'}
                  </Button>
                  <Button variant="primary" onClick={handleContactParent}>
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Parent
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-bg-elevated rounded-xl border border-border-subtle">
                  <p className="text-xs uppercase tracking-wider text-text-muted font-bold mb-2">Average Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-bold text-text-primary">{student.avg_score ?? '--'}%</span>
                    <span className={cn('text-xs font-bold font-mono', student.avg_score >= 70 ? 'text-success' : 'text-danger')}>
                      {student.avg_score >= 70 ? 'UP' : 'DOWN'} {Math.abs(((student.avg_score || 0) - 75)).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-bg-elevated rounded-xl border border-border-subtle">
                  <p className="text-xs uppercase tracking-wider text-text-muted font-bold mb-2">Strong Topics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {strongTopics.length > 0
                      ? strongTopics.slice(0, 3).map((t: string, i: number) => (
                          <span key={i} className="bg-success/15 text-success px-2 py-0.5 rounded text-xs font-semibold uppercase border border-success/20">
                            {t}
                          </span>
                        ))
                      : <span className="text-text-muted text-sm">None yet</span>
                    }
                  </div>
                </div>

                <div className="p-4 bg-bg-elevated rounded-xl border border-border-subtle">
                  <p className="text-xs uppercase tracking-wider text-text-muted font-bold mb-2">Weak Topics & Causes</p>
                  <div className="flex flex-col gap-2">
                    {weakTopics.length > 0
                      ? weakTopics.slice(0, 3).map((t: string, i: number) => {
                          const topicData = student.topic_mastery?.find((tm: any) => tm.topic === t);
                          return (
                            <div key={i} className="flex flex-col gap-1">
                              <span className="bg-warning/15 text-warning px-2 py-0.5 rounded text-xs font-semibold uppercase border border-warning/20 w-fit">
                                {t}
                              </span>
                              {topicData?.root_cause_topic && (
                                <span className="text-[10px] text-orange-400 font-medium ml-2">
                                  Cause: {topicData.root_cause_topic}
                                </span>
                              )}
                            </div>
                          );
                        })
                      : <span className="text-success text-sm font-medium">No weak topics</span>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {aiInsight && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-primary-mid/10 border border-primary-mid/20 flex items-start gap-3"
          >
            <Sparkles className="h-5 w-5 text-primary-mid shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary leading-relaxed">{aiInsight}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-heading font-semibold text-text-primary">Score Trend Over Time</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateInsight}
                  disabled={loadingInsight}
                  className="text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary-mid" />
                  {loadingInsight ? 'Analyzing...' : 'AI Insight'}
                </Button>
                <select className="bg-bg-elevated border border-border-default rounded-lg text-xs font-medium py-1.5 pl-2 pr-6 text-text-secondary focus:ring-primary-mid focus:outline-none cursor-pointer">
                  <option>Last 6 Months</option>
                  <option>Last Year</option>
                </select>
              </div>
            </div>

            {trendData.length > 0 ? (
              <div className="h-56 w-full">
                <LineChartCard
                  title=""
                  data={trendData}
                  xKey="label"
                  yKey="score"
                  className="border-0 shadow-none bg-transparent p-0 h-full"
                />
              </div>
            ) : (
              <div className="h-56 flex items-end gap-2 px-2 relative">
                <div className="absolute inset-x-2 bottom-8 h-px bg-border-subtle" />
                {['JAN','FEB','MAR','APR','MAY','JUN'].map((month, i) => {
                  const heights = [40, 55, 65, 60, 80, 90];
                  const opacities = ['bg-primary-mid/20','bg-primary-mid/30','bg-primary-mid/40','bg-primary-mid/60','bg-primary-mid/80','bg-primary-mid'];
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-0">
                      <div
                        className={cn('w-full rounded-t-lg transition-all', opacities[i])}
                        style={{ height: `${heights[i]}%` }}
                      />
                      <span className={cn('text-[10px] mt-2 font-bold', i === 5 ? 'text-primary-mid' : 'text-text-muted')}>
                        {month}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-heading font-semibold text-text-primary mb-6">Topic Proficiency</h3>
            {topicProficiency.length > 0 ? (
              <div className="space-y-5">
                {topicProficiency.map((item: any, idx: number) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.07 }}
                    className="space-y-1.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-tight text-text-muted">
                        {item.topic}
                      </span>
                      <span className={cn('text-xs font-bold font-mono', masteryToTextColor(item.mastery))}>
                        {item.mastery}%
                      </span>
                    </div>
                    <ProgressBar value={item.mastery} color={masteryToColor(item.mastery)} size="sm" />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {[
                  { topic: 'Algebra', pct: 82 },
                  { topic: 'Calculus', pct: 35 },
                  { topic: 'Statistics', pct: 65 },
                  { topic: 'Graphs', pct: 38 },
                  { topic: 'Trigonometry', pct: 55 },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-xs font-bold uppercase tracking-tight text-text-muted">{item.topic}</span>
                      <span className={cn('text-xs font-bold font-mono', masteryToTextColor(item.pct))}>{item.pct}%</span>
                    </div>
                    <ProgressBar value={item.pct} color={masteryToColor(item.pct)} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-heading font-semibold text-text-primary">Recent Assessment Performance</h3>
            <button
              className="text-primary-mid text-sm font-bold hover:underline transition-colors"
              onClick={() => navigate('/teacher/students')}
            >
              View All History
            </button>
          </div>

          {recentAttempts.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-sm">No assessments completed yet</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {recentAttempts.map((attempt: any) => {
                const grade =
                  attempt.score_pct >= 90 ? 'A+' : attempt.score_pct >= 80 ? 'A' : attempt.score_pct >= 70 ? 'B' : attempt.score_pct >= 60 ? 'C' : attempt.score_pct >= 50 ? 'D' : 'F';
                const gradeColor =
                  attempt.score_pct >= 70 ? 'text-success' : attempt.score_pct >= 50 ? 'text-warning' : 'text-danger';
                return (
                  <div
                    key={attempt.attempt_id}
                    className="group bg-bg-elevated rounded-2xl border border-border-subtle p-4 hover:shadow-md hover:border-primary-mid/40 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text-primary text-sm truncate">{attempt.quiz_title}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {attempt.submitted_at
                            ? new Date(attempt.submitted_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : ''}
                          {attempt.time_taken_seconds ? ` • ${Math.round(attempt.time_taken_seconds / 60)} min` : ''}
                        </p>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <div className={`text-2xl font-black ${gradeColor}`}>{grade}</div>
                        <div className="text-xs text-text-secondary font-medium">{Math.round(attempt.score_pct)}%</div>
                      </div>
                    </div>

                    <div className="mt-3 w-full bg-bg-hover rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          attempt.score_pct >= 70 ? 'bg-success' : attempt.score_pct >= 50 ? 'bg-warning' : 'bg-danger'
                        }`}
                        style={{ width: `${Math.round(attempt.score_pct)}%` }}
                      />
                    </div>

                    <button
                      onClick={() => handleViewAttempt(attempt.attempt_id)}
                      disabled={loadingDetail && selectedAttempt === attempt.attempt_id}
                      className="mt-3 w-full py-2 text-xs font-semibold text-primary-mid bg-primary-mid/10 hover:bg-primary-mid/20 rounded-xl transition flex items-center justify-center gap-1.5 group-hover:bg-primary-mid/20"
                    >
                      {loadingDetail && selectedAttempt === attempt.attempt_id ? (
                        <>
                          <div className="animate-spin w-3 h-3 border-2 border-primary-mid border-t-transparent rounded-full" />
                          Loading...
                        </>
                      ) : (
                        <>📊 View Full Report</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {attemptDetail && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setAttemptDetail(null)}
          >
            <div
              className="bg-bg-surface rounded-3xl w-full max-w-2xl max-h-[88vh] overflow-hidden shadow-2xl border border-border-subtle"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-primary-mid to-violet-600 p-6 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Quiz Report</p>
                    <h2 className="text-xl font-black">{attemptDetail.quiz_title}</h2>
                    <p className="text-white/70 text-sm mt-0.5">
                      {attemptDetail.topic_name} • {attemptDetail.topic_subject}
                    </p>
                  </div>
                  <button onClick={() => setAttemptDetail(null)} className="text-white/70 hover:text-white text-2xl leading-none">
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-3 mt-5">
                  {[
                    { label: 'Score', value: `${Math.round(attemptDetail.score_pct)}%` },
                    { label: 'Grade', value: attemptDetail.grade },
                    { label: 'Correct', value: `${attemptDetail.correct_count}/${attemptDetail.total_questions}` },
                    { label: 'Time', value: `${Math.round((attemptDetail.time_taken_seconds || 0) / 60)}m` },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/15 rounded-xl p-3 text-center">
                      <div className="text-xl font-black">{s.value}</div>
                      <div className="text-white/70 text-xs mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-y-auto max-h-[50vh] p-5 space-y-3">
                <h3 className="font-bold text-text-primary text-sm mb-3">
                  Question-wise Review ({attemptDetail.responses.length} questions)
                </h3>
                {attemptDetail.responses.map((r: any, i: number) => (
                  <div
                    key={i}
                    className={`p-4 rounded-2xl border ${
                      r.is_correct ? 'bg-success/10 border-success/30' : 'bg-danger/10 border-danger/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 font-bold ${
                          r.is_correct ? 'bg-success text-white' : 'bg-danger text-white'
                        }`}
                      >
                        {r.is_correct ? '✓' : '✗'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text-primary text-sm leading-snug">
                          Q{i + 1}. {r.question_text}
                        </p>

                        <div className="grid grid-cols-2 gap-1.5 mt-2">
                          {(r.options || []).map((opt: string, oi: number) => (
                            <div
                              key={oi}
                              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${
                                oi === r.correct_index
                                  ? 'bg-success/20 text-success border border-success/30'
                                  : oi === r.selected_index && !r.is_correct
                                  ? 'bg-danger/20 text-danger border border-danger/30'
                                  : 'bg-bg-base text-text-secondary'
                              }`}
                            >
                              <span className="font-bold mr-1">{String.fromCharCode(65 + oi)}.</span>
                              {opt}
                              {oi === r.correct_index && ' ✓'}
                              {oi === r.selected_index && !r.is_correct && ' ✗'}
                            </div>
                          ))}
                        </div>

                        {!r.is_correct && (
                          <div className="mt-2 text-xs text-text-muted flex items-center gap-3">
                            <span className="text-danger font-medium">
                              Your answer: {r.selected_answer || '—'}
                            </span>
                            <span className="text-success font-medium">
                              Correct: {r.correct_answer || '—'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border-subtle">
                <button
                  onClick={() => setAttemptDetail(null)}
                  className="w-full py-3 bg-primary-mid text-white rounded-xl font-bold hover:brightness-110"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-auto py-8 px-6 border-t border-border-subtle bg-bg-surface text-center">
        <p className="text-text-muted text-sm">
          © 2024 DrashtiGyan. All student data is encrypted and secure.
        </p>
        <div className="flex justify-center gap-6 mt-3">
          {['Privacy Policy', 'Terms of Service', 'Support'].map(link => (
            <a key={link} href="#"
              className="text-xs font-medium text-text-muted hover:text-primary-mid transition-colors">
              {link}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
