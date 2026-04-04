import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ClipboardList, Star, AlertCircle, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import client from '@/api/client';
import { useNavigate, Link } from 'react-router-dom';

const stagger = { animate: { transition: { staggerChildren: 0.08 } } };
const itemFadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = () => {
    setLoading(true);
    setError('');
    client.get('/api/student/dashboard')
      .then(res => setDashData(res.data))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-slate-400 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchDashboard}>Retry</Button>
        </div>
      </div>
    );
  }
  if (!dashData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-400">No dashboard data available.</p>
      </div>
    );
  }

  const focusAreas = dashData.focus_areas || [];
  const recommendedVideos = dashData.recommended_videos || [];
  const scoreTrend = dashData.score_trend || [];
  const recentQuizzes = dashData.recent_quizzes || [];

  return (
    <motion.div 
      initial="initial" animate="animate" variants={stagger}
      className="max-w-7xl mx-auto space-y-6"
    >
      {/* 3.1 STATS CARDS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={itemFadeIn}>
          <Card className="p-6 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                <ClipboardList className="w-6 h-6" />
              </div>
              <span className="text-emerald-400 text-sm font-medium bg-emerald-500/10 px-2 py-1 rounded-md">+2.4% ↑</span>
            </div>
            <p className="text-slate-400 text-sm font-medium mb-1">Total Quizzes Attempted</p>
            <h3 className="text-3xl font-mono font-bold text-white"><AnimatedCounter to={dashData.total_quizzes} /></h3>
          </Card>
        </motion.div>

        <motion.div variants={itemFadeIn}>
          <Card className="p-6 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
                <Star className="w-6 h-6" />
              </div>
            </div>
            <p className="text-slate-400 text-sm font-medium mb-1">Average Score</p>
            <h3 className="text-3xl font-mono font-bold text-white"><AnimatedCounter to={dashData.avg_score} suffix="%" /></h3>
          </Card>
        </motion.div>

        <motion.div variants={itemFadeIn}>
          <Card className="p-6 relative overflow-hidden group border-indigo-500/30">
            <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none" />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
            <p className="text-slate-400 text-sm font-medium mb-1 relative z-10">Weak Topics Count</p>
            <h3 className="text-3xl font-mono font-bold text-indigo-400 relative z-10"><AnimatedCounter to={dashData.weak_topics_count} /></h3>
          </Card>
        </motion.div>
      </div>

      {/* 3.2 PERFORMANCE TREND & FOCUS AREAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemFadeIn} className="lg:col-span-2">
          <Card className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-clash font-semibold text-white">Performance Trend</h3>
                <p className="text-sm text-slate-400">Student progress over last 30 days</p>
              </div>
              <button className="flex items-center gap-2 text-sm text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-colors">
                Last 30 Days <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-[250px] -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scoreTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F1629', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#818cf8' }}
                  />
                  <XAxis dataKey="quiz" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" activeDot={{ r: 6, fill: '#6366f1', stroke: '#0F1629', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemFadeIn}>
          <Card className="p-6 h-full flex flex-col">
            <h3 className="text-lg font-clash font-semibold text-white mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-indigo-400" /> Focus Areas
            </h3>
            
            <div className="space-y-6 flex-1">
              {focusAreas.map((area: any, idx: number) => (
                <div key={idx} className="bg-bg-elevated p-4 rounded-xl border border-white/5 relative">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-medium text-white text-lg">{area.topic}</span>
                    <Badge variant={area.status === 'critical' ? 'critical' : 'warning'}>
                      {area.status.toUpperCase()} GAP
                    </Badge>
                  </div>
                  <ProgressBar 
                    value={area.mastery_score * 100} 
                    colorClass={area.status === 'critical' ? 'bg-red-500' : 'bg-amber-500'} 
                    className="mb-3" 
                  />
                  
                  {area.root_cause_topic ? (
                    <div className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-orange-400" />
                        <span className="text-sm font-semibold text-orange-400">Root Cause: {area.root_cause_topic}</span>
                      </div>
                      <p className="text-xs text-slate-300 ml-6">{area.root_cause_explanation}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">Mastery: {Math.round(area.mastery_score * 100)}%</p>
                  )}
                </div>
              ))}
              {focusAreas.length === 0 && (
                <p className="text-slate-400 text-sm">No weak areas identified yet. Keep up the good work!</p>
              )}
            </div>

            <Button variant="outline" className="w-full mt-6" onClick={() => navigate('/student/gaps')}>View Full Report</Button>
          </Card>
        </motion.div>
      </div>

      {/* 3.3 RECOMMENDED LESSONS */}
      <motion.div variants={itemFadeIn} className="pt-4">
        <div className="flex justify-between items-end mb-6">
          <h3 className="text-xl font-clash font-semibold text-white">Recommended Lessons</h3>
          <Link to="/student/practice" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            See All Lessons <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendedVideos.map((video: any, idx: number) => (
            <a
              key={idx}
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-3 rounded-xl border border-white/10 
                         bg-[#0F1629] hover:border-indigo-500/50 hover:bg-white/5 
                         transition-all group cursor-pointer"
            >
              <div className="relative w-28 h-20 rounded-lg overflow-hidden shrink-0">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/api/placeholder/120/80'; }}
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center 
                                opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-500 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-200 text-sm group-hover:text-indigo-400 
                              transition-colors line-clamp-2">{video.title}</p>
                <p className="text-xs text-slate-400 mt-1">{video.channel} · {video.duration}</p>
                <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs 
                                 font-medium bg-indigo-500/10 text-indigo-400">
                  {video.topic}
                </span>
              </div>
            </a>
          ))}
          {recommendedVideos.length === 0 && (
            <p className="text-slate-400 text-sm">Complete quizzes to get personalized recommendations.</p>
          )}
        </div>
      </motion.div>

      {/* 3.4 RECENT ACTIVITY */}
      <motion.div variants={itemFadeIn} className="pt-2">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-xl font-clash font-semibold text-white">Recent Activity</h3>
        </div>
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-white/5">
            {recentQuizzes.length === 0 ? (
              <div className="p-6 text-sm text-slate-400">No recent quiz activity yet.</div>
            ) : (
              recentQuizzes.map((q: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                  <div>
                    <p className="text-white font-medium">{q.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{q.topic} • {q.date}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={q.status === 'Pass' ? 'success' : 'warning'}>{q.status}</Badge>
                    <span className="text-sm font-mono text-white">{q.score}%</span>
                    {q.attempt_id && (
                      <Link to={`/student/quiz/${q.id}/results?attempt=${q.attempt_id}`} className="text-indigo-400 text-sm hover:underline">
                        Review
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
