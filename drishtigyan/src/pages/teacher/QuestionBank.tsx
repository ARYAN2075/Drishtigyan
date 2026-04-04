import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Search, Plus, Trash2, ListChecks, Sparkles, X, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import client from '@/api/client';

const stagger = { animate: { transition: { staggerChildren: 0.1 } } };
const itemFadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

const FALLBACK_TOPICS = ['Algebra', 'Calculus', 'Statistics', 'Graphs', 'Trigonometry'];

interface NewQuestion {
  text: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  options: { A: string; B: string; C: string; D: string };
  correct: 'A' | 'B' | 'C' | 'D';
}

const blank: NewQuestion = {
  text: '', topic: 'Algebra', difficulty: 'Medium',
  options: { A: '', B: '', C: '', D: '' }, correct: 'A',
};

export default function QuestionBank() {
  const [activeTopic, setActiveTopic] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<{ id: number; name: string }[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newQ, setNewQ] = useState<NewQuestion>(blank);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  
  useEffect(() => {
    client.get('/api/questions/topics')
      .then(res => {
        setTopics(res.data || []);
        if (res.data?.length && !res.data.find((t: any) => t.name === newQ.topic)) {
          setNewQ(prev => ({ ...prev, topic: res.data[0].name }));
        }
      })
      .catch(() => setTopics([]))
      .finally(() => setTopicsLoading(false));
  }, []);

  const topicNames = topics.length > 0 ? topics.map(t => t.name) : FALLBACK_TOPICS;
  const topicOptions = ['All', ...topicNames];
  const getTopicId = (name: string) => topics.find(t => t.name === name)?.id ?? 1;

  const fetchQuestions = async () => {
    try {
      setError('');
      setLoading(true);
      const params: any = {};
      if (activeTopic !== 'All') params.topic = activeTopic;
      if (searchTerm) params.search = searchTerm;
      const res = await client.get('/api/questions', { params });
      setQuestions(res.data.questions || []);
    } catch (err) {
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchQuestions(), 250);
    return () => clearTimeout(t);
  }, [activeTopic, searchTerm]);

  useEffect(() => {
    if (activeTopic !== 'All' && !topicNames.includes(activeTopic)) {
      setActiveTopic('All');
    }
  }, [topicNames, activeTopic]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this question?')) return;
    await client.delete(`/api/questions/${id}`);
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      const topicId = getTopicId(newQ.topic);
      const res = await client.post('/api/questions/generate-ai', { topic_id: topicId, difficulty: newQ.difficulty });
      const d = res.data;
      setNewQ(prev => ({
        ...prev,
        text: d.text || '',
        options: {
          A: d.options?.[0] || '',
          B: d.options?.[1] || '',
          C: d.options?.[2] || '',
          D: d.options?.[3] || '',
        },
        correct: (['A', 'B', 'C', 'D'][d.correct_index ?? 0] as 'A' | 'B' | 'C' | 'D'),
      }));
    } catch (e) {
      console.error('AI generate failed', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!newQ.text.trim()) return;
    setIsSaving(true);
    try {
      const payload = {
        text: newQ.text,
        options: [newQ.options.A, newQ.options.B, newQ.options.C, newQ.options.D],
        correct_index: ['A', 'B', 'C', 'D'].indexOf(newQ.correct),
        topic_id: getTopicId(newQ.topic),
        difficulty: newQ.difficulty,
      };
      const res = await client.post('/api/questions', payload);
      // Optimistic: add to list immediately
      const added = { ...res.data, topic: newQ.topic };
      setQuestions(prev => [added, ...prev]);
      setSavedFeedback(true);
      setTimeout(() => {
        setSavedFeedback(false);
        setIsModalOpen(false);
        setNewQ(blank);
      }, 800);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredQuestions = questions;

  return (
    <motion.div initial="initial" animate="animate" variants={stagger} className="max-w-7xl mx-auto space-y-6 pb-12 font-satoshi">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4">
        <motion.div variants={itemFadeIn}>
          <h1 className="text-3xl font-clash font-semibold text-white mb-2">Question Bank</h1>
          <p className="text-slate-400">Manage, edit, and organize all assessment items.</p>
        </motion.div>
        <motion.div variants={itemFadeIn} className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-[#0F1629] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 w-full md:w-64"
            />
          </div>
          <Button
            className="gap-2 bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25"
            onClick={() => { setNewQ(blank); setIsModalOpen(true); }}
          >
            <Plus className="w-4 h-4 text-white" /> Add Question
          </Button>
        </motion.div>
      </div>

      {/* TOPIC FILTER */}
      <motion.div variants={itemFadeIn} className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {topicsLoading ? (
          <span className="text-xs text-slate-500">Loading topics...</span>
        ) : topicOptions.map(topic => (
          <button
            key={topic}
            onClick={() => setActiveTopic(topic)}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
              activeTopic === topic
                ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                : "bg-transparent text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            {topic}
          </button>
        ))}
      </motion.div>

      {/* QUESTION TABLE */}
      <motion.div variants={itemFadeIn}>
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}
        <Card className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0A0E1A]/50 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
                <th className="px-6 py-4 w-12"><ListChecks className="w-4 h-4 text-indigo-400" /></th>
                <th className="px-6 py-4 w-1/2">Question</th>
                <th className="px-6 py-4">Topic</th>
                <th className="px-6 py-4 text-center">Difficulty</th>
                <th className="px-6 py-4 text-center">Usage</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">No questions found.</td>
                </tr>
              ) : filteredQuestions.map((q, i) => {
                const diffVar = q.difficulty === 'Easy' ? 'success' : q.difficulty === 'Medium' ? 'warning' : 'critical';
                return (
                  <motion.tr
                    key={q.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * Math.min(i, 10) }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-[#0A0E1A] border border-white/5 flex items-center justify-center">
                        <ListChecks className="w-4 h-4 text-indigo-400" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-white line-clamp-2">{q.text}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="bg-[#0A0E1A] border-white/10 text-slate-300">{q.topic}</Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={diffVar as BadgeVariant}>{q.difficulty}</Badge>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-mono text-slate-400">
                      {q.total_attempts || 0}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleDelete(q.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          <div className="p-4 border-t border-white/5 text-center text-sm text-slate-500">
            {filteredQuestions.length} questions
          </div>
        </Card>
      </motion.div>

      {/* ADD QUESTION MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-[#0F1629] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <h2 className="text-xl font-clash font-semibold text-white">Add Question</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  {/* Topic + Difficulty + AI Generate */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Topic</label>
                      <select
                        value={newQ.topic}
                        onChange={e => setNewQ(p => ({ ...p, topic: e.target.value }))}
                        className="w-full bg-[#0A0E1A] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        {topicNames.map(t => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Difficulty</label>
                      <select
                        value={newQ.difficulty}
                        onChange={e => setNewQ(p => ({ ...p, difficulty: e.target.value as any }))}
                        className="w-full bg-[#0A0E1A] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option>Easy</option><option>Medium</option><option>Hard</option>
                      </select>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500"
                    onClick={handleAIGenerate}
                    disabled={isGenerating}
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isGenerating ? 'Generating with AI...' : '✨ AI Generate Question'}
                  </Button>

                  {/* Question text */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Question Text</label>
                    <textarea
                      rows={3}
                      value={newQ.text}
                      onChange={e => setNewQ(p => ({ ...p, text: e.target.value }))}
                      placeholder="Enter question text..."
                      className="w-full bg-[#0A0E1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  {/* Options */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Answer Options</label>
                    <div className="space-y-2">
                      {(['A', 'B', 'C', 'D'] as const).map(letter => (
                        <div key={letter} className="flex items-center gap-3">
                          <button
                            onClick={() => setNewQ(p => ({ ...p, correct: letter }))}
                            className={cn(
                              "w-8 h-8 rounded-full text-sm font-bold shrink-0 border-2 transition-colors",
                              newQ.correct === letter
                                ? "bg-indigo-500 border-indigo-500 text-white"
                                : "border-white/20 text-slate-400 hover:border-indigo-500/50"
                            )}
                            title={`Mark ${letter} as correct`}
                          >
                            {letter}
                          </button>
                          <input
                            type="text"
                            value={newQ.options[letter]}
                            onChange={e => setNewQ(p => ({ ...p, options: { ...p.options, [letter]: e.target.value } }))}
                            placeholder={`Option ${letter}`}
                            className="flex-1 bg-[#0A0E1A] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                          />
                          {newQ.correct === letter && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Click a letter to mark it as the correct answer.</p>
                  </div>
                </div>

                <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button
                    className={cn("gap-2", savedFeedback ? "bg-emerald-500 hover:bg-emerald-400" : "bg-indigo-600 hover:bg-indigo-500")}
                    onClick={handleSave}
                    disabled={isSaving || !newQ.text.trim()}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> :
                     savedFeedback ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {savedFeedback ? 'Saved!' : isSaving ? 'Saving...' : 'Save Question'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
