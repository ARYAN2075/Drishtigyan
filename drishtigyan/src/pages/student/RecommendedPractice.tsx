import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '@/api/client';

const SUBJECT_EMOJI: Record<string, string> = {
  Mathematics: '🔢',
  Science: '🔬',
  English: '📝',
  Physics: '⚡',
  Chemistry: '🧪',
  Biology: '🌿',
  History: '📜',
  Geography: '🌍',
  default: '📚',
};

const PRIORITY_CONFIG = {
  high: { gradient: 'from-red-500 to-rose-600', badge: 'bg-red-500/20 text-red-300', label: 'Urgent', icon: '🔥' },
  medium: { gradient: 'from-amber-500 to-orange-500', badge: 'bg-amber-500/20 text-amber-300', label: 'Practice', icon: '⚡' },
  low: { gradient: 'from-teal-500 to-emerald-600', badge: 'bg-emerald-500/20 text-emerald-300', label: 'Review', icon: '📖' },
};

function PracticeCard({ item, index }: { item: any; index: number }) {
  const priority = (item.priority as keyof typeof PRIORITY_CONFIG) || 'medium';
  const cfg = PRIORITY_CONFIG[priority];
  const emoji = SUBJECT_EMOJI[item.subject] || SUBJECT_EMOJI.default;

  return (
    <div
      className="group bg-bg-surface rounded-2xl shadow-sm border border-border-subtle overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={`bg-gradient-to-r ${cfg.gradient} p-5 relative overflow-hidden`}>
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
        <div className="absolute -bottom-6 -left-4 w-16 h-16 bg-white/10 rounded-full" />
        <div className="relative flex items-start justify-between">
          <div>
            <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white mb-2">
              {cfg.icon} {cfg.label}
            </span>
            <h3 className="text-white font-black text-base leading-tight">{item.topic_name}</h3>
            <p className="text-white/70 text-xs mt-1">{item.subject}</p>
          </div>
          <span className="text-4xl opacity-90">{emoji}</span>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-4">
          <div className="flex justify-between text-xs text-text-muted mb-1.5">
            <span className="font-medium">Current Mastery</span>
            <span
              className={`font-black ${
                item.mastery_score < 40 ? 'text-danger' : item.mastery_score < 65 ? 'text-warning' : 'text-success'
              }`}
            >
              {item.mastery_score}%
            </span>
          </div>
          <div className="w-full bg-bg-hover rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full bg-gradient-to-r ${cfg.gradient} transition-all duration-1000`}
              style={{ width: `${item.mastery_score}%` }}
            />
          </div>
          <div className="relative mt-0.5">
            <div className="absolute right-[25%] flex flex-col items-center">
              <div className="w-0.5 h-2 bg-border-default" />
              <span className="text-[10px] text-text-muted">Target</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs bg-bg-base text-text-secondary px-2.5 py-1 rounded-full">⏱ {item.estimated_time}</span>
          <span className="text-xs bg-bg-base text-text-secondary px-2.5 py-1 rounded-full">
            {item.difficulty_label}
          </span>
          {item.days_since_practice !== null && item.days_since_practice !== undefined && (
            <span
              className={`text-xs px-2.5 py-1 rounded-full ${
                item.days_since_practice > 5 ? 'bg-danger/20 text-danger' : 'bg-bg-base text-text-secondary'
              }`}
            >
              {item.days_since_practice === 0 ? '✅ Practiced today' : `🕐 ${item.days_since_practice}d ago`}
            </span>
          )}
        </div>

        <p className="text-xs text-text-muted mb-4 leading-relaxed">{item.action}</p>

        {item.quiz_id ? (
          <Link
            to={`/student/quiz/${item.quiz_id}`}
            className={`block w-full text-center py-3 font-bold text-sm text-white bg-gradient-to-r ${cfg.gradient} rounded-xl hover:opacity-90 transition-opacity shadow-sm`}
          >
            Start Practice →
          </Link>
        ) : (
          <button
            disabled
            className="w-full py-3 bg-bg-base text-text-muted rounded-xl font-semibold text-sm cursor-not-allowed"
          >
            No Quiz Available
          </button>
        )}
      </div>
    </div>
  );
}

export default function RecommendedPractice() {
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get('/api/student/recommended-practice')
      .then((r) => setData(r.data))
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

  const allRecs = data?.recommendations || [];
  const filtered = filter === 'all' ? allRecs : allRecs.filter((r: any) => r.priority === filter);

  if (allRecs.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-12 text-center">
        <div className="w-20 h-20 bg-success/10 rounded-3xl flex items-center justify-center mx-auto mb-4 text-4xl">
          🎉
        </div>
        <h2 className="text-xl font-black text-text-primary">All Caught Up!</h2>
        <p className="text-text-secondary mt-2 text-sm">
          No urgent practice needed. Keep taking quizzes to maintain your streak!
        </p>
      </div>
    );
  }

  const highCount = allRecs.filter((r: any) => r.priority === 'high').length;
  const medCount = allRecs.filter((r: any) => r.priority === 'medium').length;
  const lowCount = allRecs.filter((r: any) => r.priority === 'low').length;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-text-primary">🎯 Practice Recommendations</h1>
        <p className="text-text-secondary text-sm mt-0.5">DrashtiGyan AI • {allRecs.length} topics need attention</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { key: 'high', count: highCount, label: 'Urgent', color: 'bg-danger/10 border-danger/30', text: 'text-danger', icon: '🔥' },
          { key: 'medium', count: medCount, label: 'Practice', color: 'bg-warning/10 border-warning/30', text: 'text-warning', icon: '⚡' },
          { key: 'low', count: lowCount, label: 'Review', color: 'bg-success/10 border-success/30', text: 'text-success', icon: '📖' },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(filter === (s.key as any) ? 'all' : (s.key as any))}
            className={`p-4 rounded-2xl border-2 text-center transition-all ${s.color} ${
              filter === s.key ? 'ring-2 ring-offset-2 ring-primary-mid scale-[1.02]' : 'hover:scale-[1.01]'
            }`}
          >
            <div className="text-2xl">{s.icon}</div>
            <div className={`text-2xl font-black ${s.text}`}>{s.count}</div>
            <div className="text-xs text-text-muted font-medium">{s.label}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((item: any, i: number) => (
          <PracticeCard key={item.topic_id} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}
