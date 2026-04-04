import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';
import { Filter, ChevronDown, Clock, ClipboardList, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const itemFadeScale = { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } };

import client from '@/api/client';

const FALLBACK_TOPICS = ['Algebra', 'Calculus', 'Statistics', 'Graphs', 'Trigonometry'];

export default function QuizLibrary() {
  const [activeTopic, setActiveTopic] = useState('All Topics');
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    client.get('/api/questions/topics')
      .then(res => setTopics((res.data || []).map((t: any) => t.name)))
      .catch(() => setTopics([]))
      .finally(() => setTopicsLoading(false));
  }, []);

  const topicOptions = ['All Topics', ...(topics.length ? topics : FALLBACK_TOPICS)];

  useEffect(() => {
    let url = '/api/quizzes/';
    if (activeTopic !== 'All Topics') {
      url += `?topic=${activeTopic}`;
    }
    setLoading(true);
    setError('');
    client.get(url)
      .then(res => setQuizzes(res.data))
      .catch(() => setError('Failed to load quizzes'))
      .finally(() => setLoading(false));
  }, [activeTopic]);

  useEffect(() => {
    if (activeTopic !== 'All Topics' && !topicOptions.includes(activeTopic)) {
      setActiveTopic('All Topics');
    }
  }, [topicOptions, activeTopic]);

  return (
    <motion.div initial="initial" animate="animate" variants={stagger} className="max-w-7xl mx-auto space-y-8">
      
      {/* 4.1 PAGE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <motion.h1 className="text-3xl font-clash font-semibold text-white mb-2" variants={itemFadeScale}>Quiz Library</motion.h1>
          <motion.p className="text-slate-400" variants={itemFadeScale}>Personalized assessments to pinpoint your AI learning gaps.</motion.p>
        </div>
        <motion.div className="flex gap-3" variants={itemFadeScale}>
          <Button variant="outline" className="gap-2 bg-[#0F1629] border-white/10" disabled title="Coming soon">
            <Filter className="w-4 h-4" /> Filter
          </Button>
          <Button variant="outline" className="gap-2 bg-[#0F1629] border-white/10" disabled title="Coming soon">
            Sort: Popular <ChevronDown className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>

      {/* 4.2 TOPIC FILTER PILLS */}
      <motion.div variants={itemFadeScale} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {topicsLoading ? (
          <span className="text-xs text-slate-500">Loading topics...</span>
        ) : topicOptions.map(topic => (
          <button
            key={topic}
            onClick={() => setActiveTopic(topic)}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors border",
              activeTopic === topic 
                ? "bg-indigo-500 border-indigo-500 text-white" 
                : "bg-[#0F1629] border-white/10 text-slate-300 hover:bg-white/5"
            )}
          >
            {topic}
          </button>
        ))}
      </motion.div>

      {/* 4.3 QUIZ CARDS GRID */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <p className="text-slate-400">Loading quizzes...</p>
          </div>
        ) : (
          <>
          {quizzes.map((quiz) => {
          const diffVar = quiz.difficulty === 'Easy' ? 'success' : quiz.difficulty === 'Medium' ? 'warning' : 'critical';
          const bg = 'from-slate-800 to-slate-900'; // Or dynamically assign based on topic
          return (
            <motion.div key={quiz.id} variants={itemFadeScale}>
              <Card className="h-full flex flex-col hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300 group">
                <div className={cn("h-40 relative rounded-t-2xl overflow-hidden bg-gradient-to-br", bg)}>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  <Badge variant="outline" className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-md border-white/20 text-white font-semibold tracking-wider text-[10px]">
                    {quiz.topic?.toUpperCase() || 'GENERAL'}
                  </Badge>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <h3 className="font-semibold text-white leading-tight">{quiz.title}</h3>
                    <Badge variant={diffVar as BadgeVariant} className="text-[10px] shrink-0">{quiz.difficulty}</Badge>
                  </div>
                  <p className="text-sm text-slate-400 mb-6 flex-1 line-clamp-2">{quiz.description}</p>
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-400 mb-6">
                    <span className="flex items-center gap-1.5"><ClipboardList className="w-4 h-4" /> {quiz.question_count} Qs</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {quiz.time_limit_minutes} Min</span>
                  </div>
                  <Link to={`/student/quiz/${quiz.id}`} className="block">
                    <Button className="w-full gap-2 group-hover:shadow-indigo-500/25">
                      Start Quiz <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          );
        })}
          </>
        )}
        {!loading && quizzes.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-slate-400">No quizzes match this filter.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
