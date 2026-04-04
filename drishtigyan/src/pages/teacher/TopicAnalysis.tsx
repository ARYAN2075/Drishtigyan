import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import client from '@/api/client';

export default function TopicAnalysis() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      client.get(`/api/teacher/topic-analysis/${topicId}`),
      client.get('/api/questions/topics'),
    ])
      .then(([analysisRes, topicsRes]) => {
        setData(analysisRes.data);
        setTopics(topicsRes.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [topicId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-10 h-10 border-4 border-primary-mid border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return <div className="text-center text-text-muted mt-10">Topic not found.</div>;

  const { topic, summary, mastery_distribution, question_stats, student_mastery } = data;

  const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
    mastered: { color: 'text-success', bg: 'bg-success/15', label: 'Mastered' },
    progressing: { color: 'text-warning', bg: 'bg-warning/15', label: 'Progressing' },
    struggling: { color: 'text-orange-400', bg: 'bg-orange-500/15', label: 'Struggling' },
    at_risk: { color: 'text-danger', bg: 'bg-danger/15', label: 'At Risk' },
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
            <Link to="/teacher/dashboard" className="hover:text-primary-mid">
              Dashboard
            </Link>
            <span>›</span>
            <span className="text-text-secondary font-medium">Topic Analysis</span>
          </div>
          <h1 className="text-2xl font-black text-text-primary">{topic.name}</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {topic.subject} • Difficulty {'⭐'.repeat(topic.difficulty)}
          </p>
        </div>
        <select
          value={topicId}
          onChange={(e) => navigate(`/teacher/topic-analysis/${e.target.value}`)}
          className="border border-border-default rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-primary-mid focus:outline-none bg-bg-surface text-text-primary"
        >
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Students', value: summary.total_students, icon: '👥' },
          { label: 'Avg Mastery', value: `${summary.average_mastery}%`, icon: '🎯' },
          { label: 'Questions', value: summary.total_questions, icon: '❓' },
          { label: 'Mastered', value: summary.mastered_count, icon: '🏆' },
          { label: 'Need Help', value: summary.struggling_count, icon: '⚠️' },
        ].map((card) => (
          <div key={card.label} className="bg-bg-surface rounded-2xl p-4 shadow-sm border border-border-subtle text-center">
            <div className="text-2xl mb-1">{card.icon}</div>
            <div className="text-2xl font-black text-text-primary">{card.value}</div>
            <div className="text-xs text-text-muted font-medium mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-surface rounded-2xl p-5 shadow-sm border border-border-subtle">
          <h3 className="font-bold text-text-primary mb-4">🥧 Mastery Distribution</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="55%" height={180}>
              <PieChart>
                <Pie
                  data={mastery_distribution.filter((d: any) => d.count > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="count"
                  nameKey="label"
                >
                  {mastery_distribution
                    .filter((d: any) => d.count > 0)
                    .map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [v + ' students', n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {mastery_distribution.map((d: any) => (
                <div key={d.range} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                    <span className="text-xs text-text-muted">{d.label}</span>
                  </div>
                  <span className="text-xs font-bold text-text-primary">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-bg-surface rounded-2xl p-5 shadow-sm border border-border-subtle">
          <h3 className="font-bold text-text-primary mb-4">❓ Question Accuracy</h3>
          {question_stats.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={question_stats} layout="vertical">
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="id" tick={{ fontSize: 10 }} width={30} tickFormatter={(v: any) => `Q${v}`} />
                <Tooltip formatter={(v: any) => [`${v}%`, 'Accuracy']} labelFormatter={(l: any) => `Question ${l}`} />
                <Bar dataKey="accuracy" radius={[0, 6, 6, 0]}>
                  {question_stats.map((q: any, i: number) => (
                    <Cell
                      key={i}
                      fill={q.accuracy < 40 ? '#ef4444' : q.accuracy < 65 ? '#f59e0b' : '#10b981'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-text-muted text-sm">No attempt data yet</div>
          )}
        </div>
      </div>

      {question_stats.filter((q: any) => q.accuracy < 60 && q.total_attempts > 0).length > 0 && (
        <div className="bg-danger/10 border border-danger/30 rounded-2xl p-5">
          <h3 className="font-bold text-danger mb-3">🚨 Questions Needing Attention (&lt;60% accuracy)</h3>
          <div className="space-y-2">
            {question_stats
              .filter((q: any) => q.accuracy < 60 && q.total_attempts > 0)
              .slice(0, 5)
              .map((q: any) => (
                <div key={q.id} className="flex items-center justify-between bg-bg-surface rounded-xl px-4 py-3 border border-border-subtle">
                  <p className="text-sm text-text-primary flex-1 mr-4">{q.text}</p>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-text-muted">{q.total_attempts} attempts</span>
                    <span className={`text-sm font-black ${q.accuracy < 40 ? 'text-danger' : 'text-warning'}`}>{q.accuracy}%</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="bg-bg-surface rounded-2xl shadow-sm border border-border-subtle overflow-hidden">
        <div className="p-5 border-b border-border-subtle">
          <h3 className="font-bold text-text-primary">👥 Student Mastery Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-elevated text-xs text-text-muted uppercase">
                <th className="text-left p-4">Student</th>
                <th className="text-center p-4">Mastery</th>
                <th className="text-center p-4">Attempts</th>
                <th className="text-center p-4">Last Practiced</th>
                <th className="text-center p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {student_mastery.map((s: any) => {
                const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.progressing;
                return (
                  <tr key={s.student_id} className="hover:bg-bg-hover/30">
                    <td className="p-4 font-semibold text-sm text-text-primary">{s.student_name}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-bg-hover rounded-full h-2 min-w-[80px]">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${s.mastery_score}%`,
                              background:
                                s.mastery_score >= 75
                                  ? '#10b981'
                                  : s.mastery_score >= 50
                                  ? '#f59e0b'
                                  : s.mastery_score >= 25
                                  ? '#f97316'
                                  : '#ef4444',
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold text-text-primary w-10 text-right">{s.mastery_score}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-center text-sm text-text-secondary">{s.attempts}</td>
                    <td className="p-4 text-center text-xs text-text-muted">
                      {s.last_practiced ? new Date(s.last_practiced).toLocaleDateString('en-IN') : 'Never'}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {student_mastery.length === 0 && (
            <div className="text-center py-12 text-text-muted text-sm">No students have practiced this topic yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
