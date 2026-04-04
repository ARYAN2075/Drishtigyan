import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Users, Star, AlertTriangle, Hash, Grid, Code, Eye, ChevronRight, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import client from '@/api/client';
const stagger = { animate: { transition: { staggerChildren: 0.1 } } };
const itemFadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };


export default function TeacherDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    client.get('/api/teacher/dashboard')
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    client.get('/api/teacher/students')
      .then(res => setStudents(res.data))
      .catch(() => {})
      .finally(() => setStudentsLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-400">{error || 'No dashboard data available.'}</p>
      </div>
    );
  }

  const atRiskStudents = students
    .slice()
    .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
    .filter((s) => (s.risk_score ?? 0) >= 0.3)
    .slice(0, 5);

  return (
    <motion.div initial="initial" animate="animate" variants={stagger} className="max-w-7xl mx-auto space-y-6 pb-12 font-satoshi">
      
      {/* HEADER IS HANDLED BY TOPBAR, BUT WE CAN ADD SOME PAGE SPECIFIC HEADER ELEMENTS IF NEEDED HERE */}
      
      {/* 9.1 STATS CARDS ROW */}
      <div className="grid md:grid-cols-3 gap-6">
        <motion.div variants={itemFadeIn}>
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-emerald-400 text-sm font-medium bg-emerald-500/10 px-2 py-1 rounded-md">+4% ↑</span>
            </div>
            <p className="text-slate-400 text-sm font-medium mb-1 relative z-10">Total Students</p>
            <h3 className="text-3xl font-mono font-bold text-white"><AnimatedCounter to={data.total_students} /></h3>
          </Card>
        </motion.div>

        <motion.div variants={itemFadeIn}>
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Star className="w-6 h-6" />
              </div>
              <span className="text-emerald-400 text-sm font-medium bg-emerald-500/10 px-2 py-1 rounded-md">+2.5% ↑</span>
            </div>
            <p className="text-slate-400 text-sm font-medium mb-1">Average Class Score</p>
            <h3 className="text-3xl font-mono font-bold text-white"><AnimatedCounter to={Math.round(data.avg_class_score)} suffix="%" /></h3>
          </Card>
        </motion.div>

        <motion.div variants={itemFadeIn}>
          <Card className="p-6 border-red-500/50 bg-red-900/10 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <span className="text-red-400 text-sm font-medium bg-red-500/10 px-2 py-1 rounded-md">Requires Attention</span>
            </div>
            <p className="text-red-300 text-sm font-medium mb-1">Students At Risk</p>
            <h3 className="text-3xl font-mono font-bold text-red-400"><AnimatedCounter to={data.students_at_risk} /></h3>
          </Card>
        </motion.div>
      </div>

      {/* 9.2 TWO-COLUMN CHARTS ROW */}
      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* LEFT COMPONENT */}
        <motion.div variants={itemFadeIn}>
          <Card className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-end mb-6">
              <h3 className="text-lg font-clash font-semibold text-white">Class Performance over Time</h3>
              <Link to="/teacher/analytics" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">Full Report</Link>
            </div>
            <div className="flex-1 min-h-[250px] -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.class_performance_trend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="teacherColorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F1629', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#818cf8' }}
                  />
                  <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                  <Area type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#teacherColorValue)" activeDot={{ r: 6, fill: '#6366f1', stroke: '#0F1629', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* RIGHT COMPONENT */}
        <motion.div variants={itemFadeIn}>
          <Card className="p-6 h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-clash font-semibold text-white">Average Accuracy by Topic</h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full bg-indigo-500" /> Accuracy
              </div>
            </div>
            
            <div className="space-y-5">
              {(data.most_struggling_topics || []).map((row: any, i: number) => {
                const val = Math.round(row.avg ?? 0);
                const color = val < 50 ? 'bg-red-500' : val < 75 ? 'bg-amber-500' : 'bg-indigo-500';
                return (
                  <div key={i} className="flex flex-col gap-2 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="w-32 truncate text-sm font-medium text-slate-300" title={row.topic}>{row.topic}</div>
                      <div className="flex-1">
                        <ProgressBar value={val} colorClass={color} className="h-2" />
                      </div>
                      <div className="w-8 text-right text-sm font-mono text-white">{val}%</div>
                    </div>
                    {row.root_cause_topic && (
                      <div className="flex items-center gap-1.5 text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded w-fit mt-1">
                        <AlertTriangle className="w-3 h-3" />
                        Root Cause: {row.root_cause_topic}
                      </div>
                    )}
                  </div>
                );
              })}
              {(data.most_struggling_topics || []).length === 0 && (
                <p className="text-slate-400 text-sm">No topic accuracy data available yet.</p>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* 9.3 IDENTIFIED LEARNING GAPS */}
      <motion.div variants={itemFadeIn} className="pt-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-clash font-semibold text-white mb-1">Identified Learning Gaps</h2>
            <p className="text-slate-400 text-sm">Topics where student performance is currently below threshold</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {(data.topic_difficulty || []).map((gap: any, i: number) => {
            const Icon = i % 3 === 0 ? Hash : i % 3 === 1 ? Grid : Code;
            const pct = gap.struggling_pct ?? 0;
            const severity = pct >= 60 ? 'Critical' : pct >= 40 ? 'Moderate' : 'Low';
            const colorClass = severity === 'Critical' ? 'text-red-500' : severity === 'Moderate' ? 'text-amber-500' : 'text-emerald-400';
            const bgClass = severity === 'Critical' ? 'bg-red-500' : severity === 'Moderate' ? 'bg-amber-500' : 'bg-emerald-500';
            const hoverBorder = severity === 'Critical' ? 'hover:border-red-500/30' : severity === 'Moderate' ? 'hover:border-amber-500/30' : 'hover:border-emerald-500/30';
            return (
              <Card key={i} className={`p-5 bg-[#0F1629] border border-white/5 ${hoverBorder} transition-colors`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 rounded-xl ${bgClass} text-white flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Severity</div>
                    <div className={`text-lg font-bold ${colorClass} leading-none`}>{severity}</div>
                  </div>
                </div>
                <h3 className="font-semibold text-white mb-4 line-clamp-1">{gap.topic}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{pct}% of students struggling</span>
                </div>
              </Card>
            );
          })}
          {(data.topic_difficulty || []).length === 0 && (
             <div className="col-span-full text-slate-400 text-sm py-8 text-center bg-[#0F1629] rounded-xl border border-white/5">
                No common learning gaps identified. Great job class!
             </div>
          )}
        </div>
      </motion.div>

      {/* 9.4 RECENT STUDENT PERFORMANCE TABLE */}
      <motion.div variants={itemFadeIn}>
        <Card className="overflow-hidden bg-[#0A0E1A]">
          <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-xl font-clash font-semibold text-white">Students to Watch (At Risk)</h3>
            <Link to="/teacher/students" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View All Students <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0F1629] text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Risk Score</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {studentsLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
                    </td>
                  </tr>
                ) : atRiskStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400 text-sm">
                      No at-risk students identified.
                    </td>
                  </tr>
                ) : atRiskStudents.map((student: any, i: number) => {
                  const score = student.risk_score ?? 0;
                  const scorePct = score <= 1 ? Math.round(score * 100) : Math.round(score);
                  const scoreClass = score >= 0.6 ? 'text-red-400' : score >= 0.3 ? 'text-amber-400' : 'text-emerald-400';
                  return (
                    <motion.tr 
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {student.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-white whitespace-nowrap">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">{student.email}</td>
                      <td className="px-6 py-4">
                        <span className={`${scoreClass} font-bold`}>{scorePct}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link to={`/teacher/students/${student.id}/report`} className="inline-block p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

    </motion.div>
  );
}
