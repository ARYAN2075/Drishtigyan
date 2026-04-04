import { useEffect, useState } from 'react';
import client from '@/api/client';

const STATUS_STYLE = {
  mastered: { fill: '#10b98122', stroke: '#10b981', text: '#10b981', label: 'Mastered' },
  progressing: { fill: '#f59e0b22', stroke: '#f59e0b', text: '#f59e0b', label: 'Progressing' },
  struggling: { fill: '#ef444422', stroke: '#ef4444', text: '#ef4444', label: 'Struggling' },
  not_started: { fill: '#94a3b822', stroke: '#94a3b8', text: '#94a3b8', label: 'Not Started' },
};

function computeLayout(nodes: any[], width: number, height: number) {
  const n = nodes.length;
  if (n === 0) return [];
  const subjects = [...new Set(nodes.map((n) => n.subject))];
  const centerX = width / 2;
  const centerY = height / 2;
  const subjectRadius = Math.min(width, height) * 0.32;

  return nodes.map((node) => {
    const subjectIndex = subjects.indexOf(node.subject);
    const subjectAngle = (subjectIndex / subjects.length) * 2 * Math.PI - Math.PI / 2;
    const subjectCX = centerX + subjectRadius * Math.cos(subjectAngle);
    const subjectCY = centerY + subjectRadius * Math.sin(subjectAngle);

    const nodesInSubject = nodes.filter((nn) => nn.subject === node.subject);
    const indexInSubject = nodesInSubject.indexOf(node);
    const total = nodesInSubject.length;
    const spreadRadius = 60;
    const spreadAngle = total > 1 ? (indexInSubject / total) * 2 * Math.PI : 0;

    return {
      ...node,
      x: subjectCX + spreadRadius * Math.cos(spreadAngle),
      y: subjectCY + spreadRadius * Math.sin(spreadAngle),
    };
  });
}

export default function KnowledgeMap() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [filter, setFilter] = useState<string>('all');

  const W = 700;
  const H = 420;

  useEffect(() => {
    client
      .get('/api/student/knowledge-map')
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

  if (!data || data.nodes.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-12 text-center">
        <div className="text-6xl mb-4">🗺️</div>
        <h2 className="text-xl font-black text-text-primary">Knowledge Map Empty</h2>
        <p className="text-text-secondary mt-2 text-sm">
          {data?.message || 'Complete some quizzes to build your personal knowledge map!'}
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

  const { nodes, edges, stats } = data;
  const positioned = computeLayout(nodes, W, H);
  const posMap: Record<string, { x: number; y: number }> = {};
  positioned.forEach((n) => {
    posMap[n.id] = { x: n.x, y: n.y };
  });

  const filteredNodes = filter === 'all' ? positioned : positioned.filter((n) => n.status === filter);
  const filteredIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = edges.filter((e: any) => filteredIds.has(e.source) && filteredIds.has(e.target));

  const subjects = [...new Set(nodes.map((n: any) => n.subject))];
  const SUBJECT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#06b6d4', '#a855f7'];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-text-primary">🗺️ Knowledge Map</h1>
        <p className="text-text-secondary text-sm mt-0.5">DrashtiGyan — Your concept mastery graph</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Topics', value: stats.total_topics, emoji: '📚' },
          { label: 'Mastered', value: stats.mastered, emoji: '🏆' },
          { label: 'Progressing', value: stats.progressing, emoji: '📈' },
          { label: 'Avg Mastery', value: `${stats.average_mastery}%`, emoji: '🎯' },
        ].map((s) => (
          <div key={s.label} className="bg-bg-surface rounded-2xl p-4 shadow-sm border border-border-subtle text-center">
            <div className="text-xl mb-1">{s.emoji}</div>
            <div className="text-2xl font-black text-text-primary">{s.value}</div>
            <div className="text-xs text-text-muted font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All Topics' },
          { key: 'mastered', label: '🏆 Mastered' },
          { key: 'progressing', label: '📈 Progressing' },
          { key: 'struggling', label: '⚠️ Struggling' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filter === tab.key
                ? 'bg-primary-mid text-white shadow-md'
                : 'bg-bg-surface border border-border-subtle text-text-secondary hover:border-primary-mid/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-bg-surface rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm font-bold text-text-secondary">
            {filteredNodes.length} topics shown • Click a node to see details
          </p>
          <div className="flex flex-wrap gap-3">
            {subjects.map((subj: any, i: number) => (
              <span key={subj} className="flex items-center gap-1.5 text-xs text-text-muted">
                <span className="w-3 h-3 rounded-full" style={{ background: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }} />
                {subj}
              </span>
            ))}
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 360 }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="rgba(99,102,241,0.5)" />
            </marker>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {filteredEdges.map((edge: any, i: number) => {
            const s = posMap[edge.source];
            const t = posMap[edge.target];
            if (!s || !t) return null;
            return (
              <line
                key={i}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="rgba(99,102,241,0.4)"
                strokeWidth="2"
                strokeDasharray="4,4"
                markerEnd="url(#arrowhead)"
                opacity={0.8}
              />
            );
          })}

          {filteredNodes.map((node: any) => {
            const style = STATUS_STYLE[node.status as keyof typeof STATUS_STYLE];
            const subjectIdx = subjects.indexOf(node.subject);
            const subjectColor = SUBJECT_COLORS[subjectIdx % SUBJECT_COLORS.length];
            const isSelected = selectedNode?.id === node.id;
            const r = node.size / 2;
            return (
              <g key={node.id} className="cursor-pointer transition-transform hover:scale-105" onClick={() => setSelectedNode(isSelected ? null : node)}>
                {isSelected && (
                  <circle cx={node.x} cy={node.y} r={r + 8} fill="none" stroke={subjectColor} strokeWidth="3" opacity={0.4} />
                )}
                {node.is_root_cause && (
                  <circle cx={node.x} cy={node.y} r={r + 4} fill="none" stroke="#f97316" strokeWidth="2" filter="url(#glow)" opacity={0.8} />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth="2"
                  style={{ filter: isSelected ? `drop-shadow(0 0 8px ${style.stroke}80)` : undefined }}
                />
                <text x={node.x} y={node.y - 3} textAnchor="middle" fontSize={r > 28 ? 11 : 9} fontWeight="900" fill={style.text}>
                  {node.mastery}%
                </text>
                <text x={node.x} y={node.y + r + 13} textAnchor="middle" fontSize={9} fontWeight="600" fill="#94A3B8">
                  {node.label.length > 10 ? `${node.label.slice(0, 10)}…` : node.label}
                </text>
                <circle cx={node.x + r - 4} cy={node.y - r + 4} r={4} fill={subjectColor} />
              </g>
            );
          })}
        </svg>
      </div>

      {selectedNode && (
        <div className="bg-bg-surface rounded-2xl border border-primary-mid/30 shadow-lg p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full border"
                  style={{
                    background: STATUS_STYLE[selectedNode.status as keyof typeof STATUS_STYLE].fill,
                    borderColor: STATUS_STYLE[selectedNode.status as keyof typeof STATUS_STYLE].stroke,
                    color: STATUS_STYLE[selectedNode.status as keyof typeof STATUS_STYLE].text,
                  }}
                >
                  {STATUS_STYLE[selectedNode.status as keyof typeof STATUS_STYLE].label}
                </span>
                <span className="text-xs text-text-muted">{selectedNode.subject}</span>
              </div>
              <h3 className="text-xl font-black text-text-primary">{selectedNode.label}</h3>
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-text-muted hover:text-text-secondary text-xl leading-none">
              ✕
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            {[
              { label: 'Mastery', value: `${selectedNode.mastery}%` },
              { label: 'Attempts', value: selectedNode.attempts },
              { label: 'Difficulty', value: '⭐'.repeat(selectedNode.difficulty) },
            ].map((s) => (
              <div key={s.label} className="bg-bg-base rounded-xl p-3 text-center border border-border-subtle">
                <div className="text-xl font-black text-text-primary">{s.value}</div>
                <div className="text-xs text-text-muted mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs text-text-muted mb-1.5">
              <span>Mastery Progress</span>
              <span className="font-bold">{selectedNode.mastery}% / 100%</span>
            </div>
            <div className="w-full bg-bg-hover rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-700"
                style={{
                  width: `${selectedNode.mastery}%`,
                  background: selectedNode.mastery >= 75 ? '#10b981' : selectedNode.mastery >= 50 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
          </div>

          {selectedNode.status !== 'mastered' && (
            <a
              href="/student/quizzes"
              className="mt-4 block w-full text-center py-2.5 bg-primary-mid text-white rounded-xl font-bold text-sm hover:brightness-110"
            >
              Practice This Topic →
            </a>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(STATUS_STYLE).map(([key, style]) => (
          <div
            key={key}
            className="rounded-xl p-3 border text-center text-xs font-semibold"
            style={{ background: style.fill, borderColor: style.stroke, color: style.text }}
          >
            {style.label}
          </div>
        ))}
      </div>
    </div>
  );
}
