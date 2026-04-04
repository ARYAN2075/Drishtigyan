import { useEffect, useState } from 'react';
import client from '@/api/client';

function HeatCell({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return (
      <div className="h-12 rounded-xl bg-bg-hover flex items-center justify-center text-xs text-text-muted font-medium">
        —
      </div>
    );
  }
  const style =
    score < 35
      ? { bg: 'bg-danger/20', border: 'border-danger/40', text: 'text-danger' }
      : score < 55
      ? { bg: 'bg-warning/20', border: 'border-warning/40', text: 'text-warning' }
      : score < 70
      ? { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-400' }
      : score < 85
      ? { bg: 'bg-primary-mid/20', border: 'border-primary-mid/40', text: 'text-primary-mid' }
      : { bg: 'bg-success/20', border: 'border-success/40', text: 'text-success' };

  return (
    <div
      className={`h-12 rounded-xl border ${style.bg} ${style.border} flex flex-col items-center justify-center cursor-default transition-all hover:scale-105 hover:shadow-md`}
    >
      <span className={`text-sm font-black ${style.text}`}>{score}%</span>
    </div>
  );
}

export default function LearningHeatmap() {
  const [data, setData] = useState<any>(null);
  const [weeks, setWeeks] = useState(5);
  const [loading, setLoading] = useState(true);
  const [hoveredTopic, setHoveredTopic] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    client
      .get(`/api/teacher/learning-heatmap?weeks=${weeks}`)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [weeks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-10 h-10 border-4 border-primary-mid border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return null;
  const { heatmap, total_students } = data;

  const weekLabels = heatmap[0]?.weeks.map((_: any, i: number) => `Week ${i + 1}`) || [];
  const colAverages = weekLabels.map((_: any, wi: number) => {
    const scores = heatmap
      .map((row: any) => row.weeks[wi]?.avg_score)
      .filter((s: any) => s !== null && s !== undefined);
    return scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null;
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-text-primary">🔥 Classroom Learning Heatmap</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            DrashtiGyan • {total_students} students • Average mastery per topic per week
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted font-medium">Show:</span>
          {[3, 5, 8].map((w) => (
            <button
              key={w}
              onClick={() => setWeeks(w)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                weeks === w ? 'bg-primary-mid text-white' : 'bg-bg-surface text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {w} weeks
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5 text-xs font-semibold">
        {[
          { bg: 'bg-danger/20', border: 'border-danger/40', text: 'text-danger', label: 'Critical (<35%)' },
          { bg: 'bg-warning/20', border: 'border-warning/40', text: 'text-warning', label: 'Weak (35–55%)' },
          { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-400', label: 'Average (55–70%)' },
          { bg: 'bg-primary-mid/20', border: 'border-primary-mid/40', text: 'text-primary-mid', label: 'Good (70–85%)' },
          { bg: 'bg-success/20', border: 'border-success/40', text: 'text-success', label: 'Strong (85%+)' },
        ].map((l) => (
          <div key={l.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${l.bg} ${l.border} ${l.text}`}>
            <div className={`w-2 h-2 rounded-full ${l.bg.replace('/20', '')}`} />
            {l.label}
          </div>
        ))}
      </div>

      <div className="bg-bg-surface rounded-2xl shadow-sm border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="bg-bg-elevated p-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider border-b border-r border-border-subtle min-w-[140px]">
                  Topic / Subject
                </th>
                {weekLabels.map((label: string, i: number) => (
                  <th
                    key={i}
                    className="bg-bg-elevated p-4 text-center text-xs font-bold text-text-muted uppercase tracking-wider border-b border-border-subtle min-w-[100px]"
                  >
                    {label}
                  </th>
                ))}
                <th className="bg-bg-elevated p-4 text-center text-xs font-bold text-text-muted uppercase tracking-wider border-b border-l border-border-subtle min-w-[90px]">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {heatmap.map((row: any) => {
                const validScores = row.weeks
                  .map((w: any) => w.avg_score)
                  .filter((s: any) => s !== null && s !== undefined);
                const first = validScores[0] ?? null;
                const last = validScores[validScores.length - 1] ?? null;
                const trend = first !== null && last !== null ? Math.round(last - first) : null;
                return (
                  <tr
                    key={row.topic_id}
                    className={`border-b border-border-subtle hover:bg-bg-hover/30 transition ${
                      hoveredTopic === row.topic_id ? 'bg-bg-hover/40' : ''
                    }`}
                    onMouseEnter={() => setHoveredTopic(row.topic_id)}
                    onMouseLeave={() => setHoveredTopic(null)}
                  >
                    <td className="p-4 border-r border-border-subtle">
                      <div>
                        <p className="font-bold text-text-primary text-sm">{row.topic_name}</p>
                        <p className="text-xs text-text-muted mt-0.5">{row.subject}</p>
                      </div>
                    </td>
                    {row.weeks.map((week: any, wi: number) => (
                      <td key={wi} className="p-2">
                        <HeatCell score={week.avg_score} />
                      </td>
                    ))}
                    <td className="p-4 border-l border-border-subtle text-center">
                      {trend !== null ? (
                        <span
                          className={`text-sm font-black flex items-center justify-center gap-1 ${
                            trend > 0 ? 'text-success' : trend < 0 ? 'text-danger' : 'text-text-muted'
                          }`}
                        >
                          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}
                          {Math.abs(trend)}%
                        </span>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-bg-elevated">
                <td className="p-4 text-xs font-bold text-text-muted border-r border-border-subtle uppercase">
                  Class Average
                </td>
                {colAverages.map((avg: any, i: number) => (
                  <td key={i} className="p-2">
                    <div
                      className={`h-10 rounded-xl flex items-center justify-center text-sm font-black ${
                        avg === null
                          ? 'text-text-muted'
                          : avg < 50
                          ? 'bg-danger/20 text-danger'
                          : avg < 70
                          ? 'bg-warning/20 text-warning'
                          : 'bg-success/20 text-success'
                      }`}
                    >
                      {avg !== null ? `${avg}%` : '—'}
                    </div>
                  </td>
                ))}
                <td className="p-4 border-l border-border-subtle" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {(() => {
          const critical = heatmap.filter((row: any) => row.weeks.some((w: any) => w.avg_score !== null && w.avg_score < 40));
          const improving = heatmap.filter((row: any) => {
            const scores = row.weeks.map((w: any) => w.avg_score).filter((s: any) => s !== null);
            return scores.length >= 2 && scores[scores.length - 1] > scores[0];
          });
          const strong = heatmap.filter((row: any) => row.weeks.every((w: any) => w.avg_score === null || w.avg_score >= 70));
          return [
            { icon: '🚨', label: 'Critical Topics', value: critical.length, names: critical.map((r: any) => r.topic_name).slice(0, 3).join(', '), color: 'bg-danger/10 border-danger/30' },
            { icon: '📈', label: 'Improving Topics', value: improving.length, names: improving.map((r: any) => r.topic_name).slice(0, 3).join(', '), color: 'bg-primary-mid/10 border-primary-mid/30' },
            { icon: '✅', label: 'Strong Topics', value: strong.length, names: strong.map((r: any) => r.topic_name).slice(0, 3).join(', '), color: 'bg-success/10 border-success/30' },
          ].map((card) => (
            <div key={card.label} className={`${card.color} rounded-2xl p-4 border`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{card.icon}</span>
                <span className="font-black text-text-primary text-xl">{card.value}</span>
                <span className="text-sm font-semibold text-text-secondary">{card.label}</span>
              </div>
              {card.names && <p className="text-xs text-text-muted mt-1 line-clamp-1">{card.names}</p>}
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
