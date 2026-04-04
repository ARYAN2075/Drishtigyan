import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import client from '@/api/client';

function MasteryRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : score >= 30 ? '#f97316' : '#ef4444';

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1A2340" strokeWidth={10} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#F1F5F9"
        fontSize={size / 5}
        fontWeight="900"
        style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%' }}
      >
        {score}%
      </text>
    </svg>
  );
}

function GapCard({ gap, index }: { gap: any; index: number }) {
  const isCritical = gap.gap_severity === 'critical';
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 border transition-all hover:shadow-lg ${
        isCritical
          ? 'bg-danger/10 border-danger/40'
          : 'bg-warning/10 border-warning/40'
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div
        className={`absolute top-4 right-4 text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${
          isCritical ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning'
        }`}
      >
        {gap.gap_severity}
      </div>

      <div className="flex items-center gap-4">
        <MasteryRing score={gap.mastery_score} size={80} />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-text-primary text-base">{gap.topic_name}</h3>
          <p className="text-xs text-text-muted mt-0.5">{gap.subject}</p>
          <div className="flex gap-3 mt-2 text-xs text-text-secondary">
            <span>✍️ {gap.total_questions_attempted} attempts</span>
            <span>✅ {gap.accuracy}% accuracy</span>
          </div>
          <div className="mt-3 w-full bg-bg-hover rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-1000 ${
                isCritical ? 'bg-danger' : 'bg-warning'
              }`}
              style={{ width: `${gap.mastery_score}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StrengthCard({ strength, index }: { strength: any; index: number }) {
  return (
    <div
      className="bg-success/10 border border-success/30 rounded-2xl p-4 hover:shadow-md transition-all"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-success rounded-xl flex items-center justify-center text-white font-black">
            {Math.round(strength.mastery_score / 10) >= 8 ? '🌟' : '⭐'}
          </div>
          <div>
            <p className="font-bold text-text-primary text-sm">{strength.topic_name}</p>
            <p className="text-xs text-text-muted">{strength.subject}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-success">{strength.mastery_score}%</div>
          <div className="text-xs text-success/80 font-semibold uppercase">{strength.strength_level}</div>
        </div>
      </div>
    </div>
  );
}

export default function LearningGapReport() {
  const [report, setReport] = useState<any>(null);
  const [aiRecs, setAiRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      client.get('/api/student/gap-report'),
      client.get('/api/ai/gap-recommendations').catch(() => ({ data: { recommendations: [] } })),
    ])
      .then(([rRes, aiRes]) => {
        setReport(rRes.data);
        setAiRecs(aiRes.data.recommendations || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-10 h-10 border-4 border-primary-mid border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!report || (!report.gaps?.length && !report.strengths?.length)) {
    return (
      <div className="max-w-lg mx-auto p-10 text-center">
        <div className="w-20 h-20 bg-primary-mid/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">📊</span>
        </div>
        <h2 className="text-xl font-black text-text-primary">No Data Yet</h2>
        <p className="text-text-secondary mt-2 text-sm">
          {report?.message || 'Complete some quizzes first to see your gap analysis!'}
        </p>
        <a
          href="/student/quizzes"
          className="inline-block mt-5 px-6 py-3 bg-primary-mid text-white rounded-xl font-bold hover:brightness-110"
        >
          Take a Quiz →
        </a>
      </div>
    );
  }

  const overviewData = [...(report.gaps || []), ...(report.strengths || [])]
    .map((t: any) => ({
      name: t.topic_name.length > 13 ? `${t.topic_name.slice(0, 13)}…` : t.topic_name,
      score: t.mastery_score,
      full_name: t.topic_name,
    }))
    .sort((a, b) => a.score - b.score);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-text-primary">📊 Learning Gap Report</h1>
        <p className="text-sm text-text-secondary mt-0.5">DrashtiGyan • Personalized Analysis</p>
      </div>

      <div className="relative overflow-hidden bg-gradient-to-br from-primary-mid via-violet-600 to-purple-700 rounded-3xl p-8 text-white">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-white/10 rounded-full" />

        <div className="relative flex items-center gap-8 flex-wrap">
          <div className="relative">
            <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={70} cy={70} r={55} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={12} />
              <circle
                cx={70}
                cy={70}
                r={55}
                fill="none"
                stroke="#fff"
                strokeWidth={12}
                strokeDasharray={2 * Math.PI * 55}
                strokeDashoffset={2 * Math.PI * 55 * (1 - report.overall_health / 100)}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black">{report.overall_health}%</span>
              <span className="text-white/70 text-xs font-medium">Health</span>
            </div>
          </div>

          <div className="flex-1 space-y-4 min-w-[200px]">
            <div>
              <h2 className="text-2xl font-black leading-tight">Overall Learning Health</h2>
              <p className="text-white/70 text-sm mt-1">Based on all your quiz performance</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Topics Studied', value: report.total_topics_studied },
                { label: 'Critical Gaps', value: report.critical_gaps_count },
                { label: 'Strengths', value: report.strengths?.length || 0 },
              ].map((s) => (
                <div key={s.label} className="bg-white/15 rounded-2xl p-3 text-center">
                  <div className="text-xl font-black">{s.value}</div>
                  <div className="text-white/70 text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-bg-surface rounded-2xl p-6 border border-border-subtle">
        <h3 className="font-bold text-text-primary mb-5">📈 All Topics at a Glance</h3>
        <ResponsiveContainer width="100%" height={Math.max(180, overviewData.length * 32)}>
          <BarChart data={overviewData} layout="vertical" margin={{ left: 10 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: any) => `${v}%`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
            <Tooltip
              formatter={(v: any) => [`${v}%`, 'Mastery']}
              labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.full_name || ''}
              contentStyle={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
            />
            <Bar dataKey="score" radius={[0, 8, 8, 0]} barSize={22}>
              {overviewData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.score < 30
                      ? '#ef4444'
                      : entry.score < 50
                      ? '#f97316'
                      : entry.score < 70
                      ? '#f59e0b'
                      : '#10b981'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-text-muted">
          {[
            { color: 'bg-danger', label: 'Critical (<30%)' },
            { color: 'bg-warning', label: 'Weak (30–50%)' },
            { color: 'bg-yellow-500', label: 'Average (50–70%)' },
            { color: 'bg-success', label: 'Strong (70%+)' },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full ${l.color}`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {report.gaps?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-danger/20 rounded-xl flex items-center justify-center">🔴</div>
            <h2 className="text-lg font-black text-text-primary">
              Learning Gaps{' '}
              <span className="ml-2 text-sm font-normal text-text-muted">
                ({report.gaps.length} topic{report.gaps.length > 1 ? 's' : ''} need attention)
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.gaps.map((gap: any, i: number) => (
              <GapCard key={gap.topic_id} gap={gap} index={i} />
            ))}
          </div>
        </div>
      )}

      {aiRecs.length > 0 && (
        <div className="bg-primary-mid/10 rounded-2xl p-6 border border-primary-mid/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-primary-mid rounded-xl flex items-center justify-center text-lg">
              🤖
            </div>
            <div>
              <h3 className="font-black text-text-primary">AI Study Plan</h3>
              <p className="text-xs text-text-muted">Personalized by DrashtiGyan AI</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiRecs.map((rec: any, i: number) => (
              <div key={i} className="bg-bg-surface rounded-xl p-4 border border-border-subtle hover:shadow-sm transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-text-primary text-sm">{rec.topic_name}</span>
                  <span className="text-xs bg-primary-mid/15 text-primary-mid px-2 py-0.5 rounded-full font-medium">
                    {rec.technique}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{rec.recommendation}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-text-muted">
                  <span>⏱</span>
                  <span>{rec.study_time_minutes} min recommended</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.strengths?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-success/20 rounded-xl flex items-center justify-center">🟢</div>
            <h2 className="text-lg font-black text-text-primary">Your Strengths</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.strengths.map((s: any, i: number) => (
              <StrengthCard key={s.topic_id} strength={s} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
