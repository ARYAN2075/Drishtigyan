import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DrashtiGyanLogo } from '@/components/branding/DrashtiGyanLogo';
import { Card } from '@/components/ui/Card';

function FloatingParticles() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    size: Math.random() * 6 + 3,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 8 + 5,
    delay: Math.random() * 4,
    opacity: Math.random() * 0.35 + 0.1,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-primary-mid"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: p.opacity,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          from { transform: translateY(0px) rotate(0deg); }
          to   { transform: translateY(-30px) rotate(180deg); }
        }
      `}</style>
    </div>
  );
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const step = target / 60;
          const timer = setInterval(() => {
            start = Math.min(start + step, target);
            setCount(Math.floor(start));
            if (start >= target) clearInterval(timer);
          }, 20);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="group bg-bg-surface rounded-3xl p-6 border border-border-subtle hover:border-primary-mid/50 hover:shadow-2xl hover:shadow-primary-mid/10 hover:-translate-y-1 transition-all duration-300">
      <div className="w-14 h-14 bg-gradient-to-br from-primary-mid to-violet-600 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-lg shadow-primary-mid/30 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-lg font-heading font-bold text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeWord, setActiveWord] = useState(0);
  const words = ['सीखो', 'समझो', 'आगे बढ़ो'];

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 100);
    const interval = setInterval(() => {
      setActiveWord((w) => (w + 1) % words.length);
    }, 2000);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, []);

  const features = [
    {
      icon: '🧠',
      title: 'AI Gap Detection',
      desc: 'Gemini AI har student ka weak point dhundhta hai aur personalized study plan banata hai.',
    },
    {
      icon: '📊',
      title: 'Smart Analytics',
      desc: 'Real-time performance charts, mastery tracking, aur progress trends ek jagah.',
    },
    {
      icon: '🔥',
      title: 'Learning Heatmap',
      desc: 'Dekho kaun se topics mein class sabse zyada struggle karti hai — heatmap se instantly.',
    },
    {
      icon: '🗺️',
      title: 'Knowledge Map',
      desc: 'Student ka concept mastery graph — visual web se samjho kahan connections missing hain.',
    },
    {
      icon: '🎯',
      title: 'Personalized Practice',
      desc: 'AI recommend karta hai exact quiz jo tumhare weak topics improve kare fastest.',
    },
    {
      icon: '👩‍🏫',
      title: 'Teacher Dashboard',
      desc: 'Poore class ka ek nazar mein analysis — at-risk students identify karo turat.',
    },
  ];

  return (
    <div className="min-h-screen bg-bg-base text-text-primary overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-base/80 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <DrashtiGyanLogo size="default" />
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-text-secondary hover:text-text-primary transition">
              Login
            </Link>
            <Link
              to="/register"
              className="text-sm font-bold px-5 py-2.5 bg-gradient-to-r from-primary-mid to-violet-600 text-white rounded-xl shadow-lg shadow-primary-mid/30 hover:opacity-90 transition"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-24">
        <FloatingParticles />
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div
            className={`inline-flex items-center gap-2 bg-primary-mid/10 text-primary-mid px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-primary-mid/20 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="w-2 h-2 bg-primary-mid rounded-full animate-pulse" />
            AI-Powered Learning Gap Detection
          </div>

          <h1
            className={`text-5xl md:text-7xl font-heading font-black leading-tight tracking-tighter mb-4 transition-all duration-700 delay-100 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            Drashti
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-mid via-violet-500 to-purple-500">
              Gyan
            </span>
          </h1>

          <div
            className={`text-2xl md:text-3xl font-bold text-text-secondary mb-4 transition-all duration-700 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <span
              className="inline-block mr-2 text-transparent bg-clip-text bg-gradient-to-r from-primary-mid to-violet-400"
              style={{ minWidth: '120px', display: 'inline-block' }}
            >
              {words[activeWord]}
            </span>
            — <span className="text-text-muted">हर दिन, हर कदम</span>
          </div>

          <p
            className={`text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            AI ki shakti se har student ki learning gaps detect karo. Personalized study plan,
            smart analytics aur real-time progress tracking — sab ek jagah.
          </p>

          <div
            className={`flex items-center justify-center gap-4 flex-wrap transition-all duration-700 delay-400 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <Link
              to="/register"
              className="group px-8 py-4 bg-gradient-to-r from-primary-mid to-violet-600 text-white font-bold text-base rounded-2xl shadow-xl shadow-primary-mid/30 hover:shadow-2xl hover:shadow-primary-mid/40 hover:scale-105 transition-all duration-300"
            >
              अभी शुरू करें — Free!
              <span className="ml-2 group-hover:translate-x-1 inline-block transition-transform">→</span>
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 bg-bg-surface text-text-primary font-bold text-base rounded-2xl border border-border-default hover:border-primary-mid transition-all"
            >
              Login करें
            </Link>
          </div>

          <div
            className={`flex items-center justify-center gap-6 mt-10 text-sm text-text-muted transition-all duration-700 delay-500 ${
              isVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {['✅ Free to use', '🔒 Secure', '🤖 Gemini AI powered', '📱 Works on all devices'].map((b) => (
              <span key={b} className="hidden sm:block">
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-gradient-to-r from-primary-mid via-violet-600 to-purple-700 text-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { target: 1200, suffix: '+', label: 'Students Helped' },
              { target: 95, suffix: '%', label: 'Score Improvement' },
              { target: 50, suffix: '+', label: 'Topics Covered' },
              { target: 3000, suffix: '+', label: 'Quizzes Taken' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl font-black mb-1">
                  <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                </div>
                <p className="text-white/70 text-sm font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-heading font-black text-text-primary mb-3">
              क्यों चुनें{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-mid to-violet-600">
                DrashtiGyan
              </span>
              ?
            </h2>
            <p className="text-text-secondary text-base max-w-xl mx-auto">
              Ek platform jo teacher aur student dono ki zaroorat samjhe
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <FeatureCard key={i} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* Heatmap preview */}
      <section className="py-20 px-6 bg-bg-surface">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block bg-warning/10 text-warning text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wide">
              🔥 Exclusive Feature
            </span>
            <h2 className="text-3xl font-black text-text-primary mb-4">
              Classroom Learning
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-warning to-danger">
                Heatmap
              </span>
            </h2>
            <p className="text-text-secondary leading-relaxed mb-6">
              Teacher ek nazar mein dekh sakta hai ki poori class mein kaunse topics sabse zyada
              struggle ho rahe hain. Color-coded heatmap instantly weak areas highlight karta hai.
            </p>
            <ul className="space-y-3 text-sm text-text-secondary">
              {[
                '🔴 Red = Critical gaps in class',
                '🟡 Yellow = Needs more teaching time',
                '🟢 Green = Class has mastered this topic',
                '📅 Week-by-week progress tracking',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Card className="p-6 border-border-subtle bg-bg-base">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
              Class Heatmap Preview
            </p>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'auto repeat(5, 1fr)' }}>
              <div className="text-xs text-text-muted col-span-1 self-end pb-1">Topic</div>
              {['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'].map((w) => (
                <div key={w} className="text-xs text-text-muted text-center pb-1">
                  {w}
                </div>
              ))}
              {[
                { name: 'Algebra', scores: [22, 38, 51, 65, 72] },
                { name: 'Probability', scores: [45, 44, 52, 58, 70] },
                { name: 'Cell Bio', scores: [60, 68, 75, 80, 88] },
                { name: 'Newton', scores: [18, 25, 30, 42, 55] },
                { name: 'Chemistry', scores: [35, 40, 55, 60, 65] },
              ].map((row) => (
                <>
                  <div key={`${row.name}-label`} className="text-xs font-medium text-text-secondary pr-2 py-1">
                    {row.name}
                  </div>
                  {row.scores.map((score, i) => (
                    <div
                      key={`${row.name}-${i}`}
                      className="rounded-lg h-9 flex items-center justify-center text-xs font-bold transition-all hover:scale-105"
                      style={{
                        background:
                          score < 35
                            ? 'rgba(239,68,68,0.15)'
                            : score < 55
                            ? 'rgba(245,158,11,0.15)'
                            : score < 70
                            ? 'rgba(234,179,8,0.15)'
                            : 'rgba(16,185,129,0.15)',
                        color:
                          score < 35
                            ? '#ef4444'
                            : score < 55
                            ? '#f59e0b'
                            : score < 70
                            ? '#eab308'
                            : '#10b981',
                        border:
                          score < 35
                            ? '1px solid rgba(239,68,68,0.4)'
                            : score < 55
                            ? '1px solid rgba(245,158,11,0.4)'
                            : score < 70
                            ? '1px solid rgba(234,179,8,0.4)'
                            : '1px solid rgba(16,185,129,0.4)',
                      }}
                    >
                      {score}%
                    </div>
                  ))}
                </>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* Knowledge map preview */}
      <section className="py-20 px-6 bg-bg-base">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <Card className="p-4 border-border-subtle bg-bg-surface">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
              Knowledge Map Preview
            </p>
            <svg viewBox="0 0 340 180" className="w-full h-full">
              {[
                [170, 90, 80, 50],
                [170, 90, 260, 50],
                [170, 90, 80, 130],
                [170, 90, 260, 130],
                [80, 50, 30, 90],
                [260, 50, 310, 90],
              ].map(([x1, y1, x2, y2], i) => (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(129,140,248,0.5)"
                  strokeWidth="1.5"
                  strokeDasharray="4,3"
                />
              ))}
              {[
                { x: 170, y: 90, r: 28, label: 'Algebra', score: 72, color: '#6366f1' },
                { x: 80, y: 50, r: 20, label: 'Linear Eq', score: 58, color: '#f59e0b' },
                { x: 260, y: 50, r: 20, label: 'Quadratic', score: 45, color: '#ef4444' },
                { x: 80, y: 130, r: 20, label: 'Probability', score: 80, color: '#10b981' },
                { x: 260, y: 130, r: 20, label: 'Statistics', score: 65, color: '#f59e0b' },
                { x: 30, y: 90, r: 14, label: 'Sets', score: 90, color: '#10b981' },
                { x: 310, y: 90, r: 14, label: 'Graphs', score: 30, color: '#ef4444' },
              ].map((node, i) => (
                <g key={i}>
                  <circle cx={node.x} cy={node.y} r={node.r} fill={`${node.color}22`} stroke={node.color} strokeWidth="2" />
                  <text
                    x={node.x}
                    y={node.y - 2}
                    textAnchor="middle"
                    fontSize={node.r > 20 ? 8 : 6}
                    fontWeight="bold"
                    fill={node.color}
                  >
                    {node.label}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + 8}
                    textAnchor="middle"
                    fontSize={node.r > 20 ? 9 : 7}
                    fontWeight="900"
                    fill={node.color}
                  >
                    {node.score}%
                  </text>
                </g>
              ))}
            </svg>
          </Card>

          <div>
            <span className="inline-block bg-primary-mid/10 text-primary-mid text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wide">
              🗺️ Very Cool Feature
            </span>
            <h2 className="text-3xl font-black text-text-primary mb-4">
              Student Knowledge
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-primary-mid">
                Map
              </span>
            </h2>
            <p className="text-text-secondary leading-relaxed mb-6">
              Sirf numbers nahi — ek visual web jisme student dekh sakta hai ki kaunse concepts
              connected hain aur kaun si links missing hain. Ek nazar mein poora picture!
            </p>
            <ul className="space-y-3 text-sm text-text-secondary">
              {[
                '🟢 Green nodes = Mastered concepts',
                '🔴 Red nodes = Needs immediate attention',
                '🔗 Lines = Concept dependencies',
                '📍 Central node = Core topic being studied',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 text-center bg-gradient-to-br from-primary-mid via-violet-700 to-purple-800 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 40%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative max-w-2xl mx-auto">
          <h2 className="text-4xl font-black text-white mb-4">आज ही शुरू करें!</h2>
          <p className="text-white/70 text-lg mb-8">
            DrashtiGyan ke saath apni padhai ki नई दृष्टि पाओ। Free register karo aur apna first
            quiz abhi lo!
          </p>
          <Link
            to="/register"
            className="inline-block px-10 py-5 bg-white text-primary-mid font-black text-lg rounded-2xl shadow-2xl hover:scale-105 transition-transform duration-300"
          >
            🚀 अभी Register करें — बिल्कुल Free!
          </Link>
          <p className="text-white/70 text-sm mt-4">No credit card required • Setup in 2 minutes</p>
        </div>
      </section>

      <footer className="bg-bg-surface text-text-muted py-8 px-6 text-center border-t border-border-subtle">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 bg-gradient-to-br from-primary-mid to-violet-600 rounded-lg flex items-center justify-center text-white text-xs font-black">
            DG
          </div>
          <span className="text-text-primary font-black text-sm">DrashtiGyan</span>
        </div>
        <p className="text-xs">ज्ञान की नई दृष्टि — AI Learning Gap Detection System</p>
      </footer>
    </div>
  );
}
