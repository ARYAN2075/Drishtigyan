import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Clock, X, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import client from '@/api/client';

const stagger = { animate: { transition: { staggerChildren: 0.1 } } };
const itemFadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export default function ClassAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [interventionModal, setInterventionModal] = useState(false);
  const [interventionPlan, setInterventionPlan] = useState<any>(null);
  const [loadingIntervention, setLoadingIntervention] = useState(false);

  useEffect(() => {
    client.get('/api/teacher/analytics')
      .then(res => setAnalytics(res.data))
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  const chartData = (analytics?.chart_data || []).map((t: any) => ({
    topic: t.topic,
    accuracy: t.avg_accuracy,
    struggling: t.struggling,
    topic_id: t.topic_id,
  }));

  const handleIntervention = async (topicName: string, topicId?: number) => {
    const resolvedId = topicId || 1;
    setLoadingIntervention(true);
    try {
      const res = await client.post('/api/teacher/intervention', { topic_name: topicName, topic_id: resolvedId });
      setInterventionPlan(res.data);
      setInterventionModal(true);
    } catch (e) {
      console.error('Failed to generate plan', e);
    } finally {
      setLoadingIntervention(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const res = await client.get('/api/teacher/analytics/export-pdf', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `class_analytics_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }
  if (error || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-400">{error || 'No analytics data available.'}</p>
      </div>
    );
  }

  return (
    <motion.div initial="initial" animate="animate" variants={stagger} className="max-w-7xl mx-auto space-y-6 pb-12 font-satoshi">
      <motion.div variants={itemFadeIn} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-clash font-semibold text-white mb-2">Class Learning Gap Analytics</h1>
          <p className="text-slate-400 max-w-2xl">Identify performance outliers and curriculum focus areas for Grade 10.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleExportPDF} className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white">
            <Download className="w-4 h-4" /> Export PDF
          </Button>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div variants={itemFadeIn}>
          <Card className="p-6 text-center">
            <p className="text-sm text-slate-400 font-medium mb-1">Class Avg</p>
            <p className="text-4xl font-mono font-bold text-white">{analytics.class_avg_accuracy}%</p>
          </Card>
        </motion.div>
        <motion.div variants={itemFadeIn}>
          <Card className="p-6 text-center border-red-500/30 bg-red-500/5">
            <p className="text-sm text-slate-400 font-medium mb-1">Most Weak Topic</p>
            <p className="text-2xl font-clash font-semibold text-red-400">{analytics.most_weak_topic || '--'}</p>
          </Card>
        </motion.div>
        <motion.div variants={itemFadeIn}>
          <Card className="p-6 text-center">
            <p className="text-sm text-slate-400 font-medium mb-1">Topics Tracked</p>
            <p className="text-4xl font-mono font-bold text-white">{analytics.topic_table?.length ?? '--'}</p>
          </Card>
        </motion.div>
      </div>

      {analytics.most_weak_topic && analytics.most_weak_topic !== 'None' && (
        <motion.div variants={itemFadeIn}>
          <Card className="bg-red-500/5 border-red-500/30 p-6">
            <h3 className="text-lg font-clash font-semibold text-white mb-1">{analytics.most_weak_topic} - Gap Detected</h3>
            <p className="text-slate-400 mb-4">
              {analytics.topic_table?.find((t: any) => t.topic === analytics.most_weak_topic)?.struggling_count || 0} students are struggling.
            </p>
            <Button onClick={() => handleIntervention(analytics.most_weak_topic, analytics.most_weak_topic_id)} disabled={loadingIntervention}>
              {loadingIntervention ? 'Generating...' : 'Create Intervention Plan'}
            </Button>
          </Card>
        </motion.div>
      )}

      <motion.div variants={itemFadeIn}>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-clash font-semibold text-white">Class Accuracy by Topic</h3>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ backgroundColor: '#0F1629', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <XAxis dataKey="topic" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <Bar dataKey="accuracy" name="Avg Accuracy %" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28} />
                <Bar dataKey="struggling" name="Struggling Count" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={28} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemFadeIn}>
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h3 className="text-xl font-clash font-semibold text-white">Topic Performance Detail</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0A0E1A]/50 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
                  <th className="px-6 py-4">Topic</th>
                  <th className="px-6 py-4">Struggling</th>
                  <th className="px-6 py-4">Avg Accuracy</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(analytics.topic_table || []).map((row: any, i: number) => {
                  const badge = row.status === 'strong' ? 'success' : row.status === 'weak' ? 'critical' : 'warning';
                  return (
                    <motion.tr
                      key={row.topic}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * Math.min(i, 10) }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-white">{row.topic}</td>
                      <td className="px-6 py-4 text-slate-300">{row.struggling_count}/{row.total_students}</td>
                      <td className="px-6 py-4 font-mono text-slate-200">{row.avg_accuracy}%</td>
                      <td className="px-6 py-4"><Badge variant={badge as any}>{row.status.toUpperCase()}</Badge></td>
                      <td className="px-6 py-4">
                        <button
                          className="text-xs text-indigo-400 hover:underline"
                          onClick={() => handleIntervention(row.topic, row.topic_id)}
                        >
                          Create Intervention
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      <AnimatePresence>
        {interventionModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setInterventionModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-[#0F1629] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <h2 className="text-xl font-clash font-semibold text-white">{interventionPlan?.lesson_title || 'Intervention Plan'}</h2>
                  <button onClick={() => setInterventionModal(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4 text-sm text-slate-300">
                  {!interventionPlan && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating plan...
                    </div>
                  )}
                  {interventionPlan && (
                    <>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>{interventionPlan.duration_minutes} minutes</span>
                      </div>
                      {interventionPlan.target_misconceptions?.length > 0 && (
                        <div>
                          <p className="font-medium text-white mb-1">Target Misconceptions:</p>
                          {interventionPlan.target_misconceptions.map((m: string, i: number) => (
                            <p key={i} className="text-slate-400">- {m}</p>
                          ))}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-white mb-2">Activities:</p>
                        {interventionPlan.activities?.map((act: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg border border-white/10 mb-2 bg-[#0A0E1A]">
                            <div className="flex justify-between items-start">
                              <span className="font-medium text-white">{act.name}</span>
                              <span className="text-slate-500 text-xs">{act.duration_min} min</span>
                            </div>
                            <p className="text-slate-400 mt-1">{act.description}</p>
                            {act.materials && <p className="text-slate-500 mt-1 text-xs">Materials: {act.materials}</p>}
                          </div>
                        ))}
                      </div>
                      {interventionPlan.assessment_checkpoint && (
                        <div className="p-3 rounded-lg border border-white/10 bg-[#0A0E1A]">
                          <p className="font-medium text-white mb-1">Assessment Checkpoint</p>
                          <p className="text-slate-400">{interventionPlan.assessment_checkpoint}</p>
                        </div>
                      )}
                      {interventionPlan.success_criteria && (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                          <p className="font-medium text-emerald-400 text-xs uppercase mb-1">Success Criteria</p>
                          <p className="text-slate-300">{interventionPlan.success_criteria}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
