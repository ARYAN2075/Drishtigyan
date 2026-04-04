import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Sparkles, Save, Check, Plus, Settings2, Clock, Users, BookOpen,
  Trash2, GripVertical, ChevronDown, ListChecks, Loader2, Search, X
} from 'lucide-react';
import client from '@/api/client';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const stagger = { animate: { transition: { staggerChildren: 0.1 } } };
const itemFadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

const FALLBACK_TOPICS = ['Algebra', 'Calculus', 'Statistics', 'Graphs', 'Trigonometry'];

export default function CreateQuiz() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('Algebra');
  const [difficulty, setDifficulty] = useState('Medium');
  const [timeLimit, setTimeLimit] = useState(20);
  const [topics, setTopics] = useState<{ id: number; name: string }[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected questions for the quiz
  const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);

  // Bank questions picker
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [bankSearch, setBankSearch] = useState('');
  const [loadingBank, setLoadingBank] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // AI Generate state
  const [isGenerating, setIsGenerating] = useState(false);
  const [numAiQ, setNumAiQ] = useState(5);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    client.get('/api/questions/topics')
      .then(res => {
        setTopics(res.data || []);
        setError('');
        if (res.data?.length && !res.data.find((t: any) => t.name === topic)) {
          setTopic(res.data[0].name);
        }
      })
      .catch(() => {
        setTopics([]);
        setError('Failed to load topics');
      })
      .finally(() => setTopicsLoading(false));
  }, []);

  const topicNames = topics.length > 0 ? topics.map(t => t.name) : FALLBACK_TOPICS;
  const getTopicId = (name: string) => topics.find(t => t.name === name)?.id ?? 1;

  // Load bank questions when picker opens
  useEffect(() => {
    if (!pickerOpen) return;
    setLoadingBank(true);
    client.get('/api/questions', { params: { topic: topic !== 'All' ? topic : undefined } })
      .then(res => setBankQuestions(res.data.questions || []))
      .catch(() => setError('Failed to load question bank'))
      .finally(() => setLoadingBank(false));
  }, [pickerOpen, topic]);

  const toggleQuestion = (q: any) => {
    setSelectedQuestions(prev => {
      const exists = prev.find(x => x.id === q.id);
      return exists ? prev.filter(x => x.id !== q.id) : [...prev, q];
    });
  };

  const removeQuestion = (id: number) => setSelectedQuestions(prev => prev.filter(q => q.id !== id));

  const generateWithAI = async () => {
    setIsGenerating(true);
    try {
      const topicId = getTopicId(topic);
      const generated: any[] = [];
      for (let i = 0; i < numAiQ; i++) {
        const res = await client.post('/api/questions/generate-ai', { topic_id: topicId, difficulty });
        if (res.data?.text) {
          generated.push({ id: `ai-${i}-${Date.now()}`, text: res.data.text, topic, difficulty, options: res.data.options, correct_index: res.data.correct_index, isAI: true });
        }
      }
      setSelectedQuestions(prev => [...prev, ...generated]);
      if (!title) setTitle(`${topic} ${difficulty} Quiz`);
    } catch (e) {
      console.error('AI Generation failed', e);
      setError('AI generation failed. Check if the Gemini API key is set.');
    } finally {
      setIsGenerating(false);
    }
  };

  const publishQuiz = async () => {
    if (selectedQuestions.length === 0) {
      setError('Add at least one question before publishing');
      return;
    }
    if (!title.trim()) {
      setError('Enter a quiz title');
      return;
    }

    setIsSaving(true);
    try {
      setError('');
      // First: persist AI-generated questions if any
      const realQuestionIds: number[] = [];
      for (const q of selectedQuestions) {
        if (typeof q.id === 'number') {
          realQuestionIds.push(q.id);
        } else if (q.isAI) {
          // Save the AI question to the bank
          const res = await client.post('/api/questions', {
            text: q.text,
            options: q.options || ['A', 'B', 'C', 'D'],
            correct_index: q.correct_index ?? 0,
            topic_id: getTopicId(q.topic),
            difficulty: q.difficulty || 'Medium',
          });
          realQuestionIds.push(res.data.id);
        }
      }

      const payload = {
        title,
        description,
        topic_id: getTopicId(topic),
        difficulty,
        time_limit_minutes: timeLimit,
        question_ids: realQuestionIds,
      };

      const res = await client.post('/api/quizzes/', payload);
      alert(`Quiz "${res.data.title}" published!`);
      navigate('/teacher/quizzes');
    } catch (e) {
      console.error('Publish failed', e);
      setError('Failed to publish quiz');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredBank = bankQuestions.filter(q =>
    !bankSearch || q.text.toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <motion.div initial="initial" animate="animate" variants={stagger} className="max-w-7xl mx-auto pb-12 font-satoshi">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-[#0F1629] p-6 rounded-2xl border border-white/5 shadow-lg">
        <div>
          <h1 className="text-2xl font-clash font-semibold text-white mb-1">Create Assessment</h1>
          <p className="text-sm text-slate-400">Design a quiz or generate one with AI.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => navigate(-1)}>Cancel</Button>
          <Button variant="outline" className="gap-2 bg-[#0A0E1A] border-white/10 text-slate-300" disabled title="Coming soon">
            <Save className="w-4 h-4" /> Save Draft
          </Button>
          <Button onClick={publishQuiz} disabled={isSaving || selectedQuestions.length === 0} className="gap-2 bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Publish
          </Button>
        </div>
      </div>
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">

        {/* LEFT: Details + Questions */}
        <motion.div variants={itemFadeIn} className="lg:col-span-2 space-y-6">

          {/* Assessment Details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Assessment Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Quiz Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="E.g. Midterm Algebra Review"
                  className="w-full bg-[#0A0E1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Short description of this quiz..."
                  className="w-full bg-[#0A0E1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none" />
              </div>
            </div>
          </Card>

          {/* Questions List */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Questions</h3>
                <p className="text-sm text-slate-400">{selectedQuestions.length} questions added</p>
              </div>
              <Button variant="outline" className="gap-2 bg-[#0A0E1A] border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500"
                onClick={() => setPickerOpen(true)}>
                <Plus className="w-4 h-4" /> Add from Bank
              </Button>
            </div>

            <div className="space-y-3">
              {selectedQuestions.length === 0 && !isGenerating && (
                <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl text-slate-500">
                  No questions yet. Use "Generate with AI" or "Add from Bank".
                </div>
              )}
              {selectedQuestions.map((q, i) => (
                <div key={q.id ?? i} className="group bg-[#0A0E1A] border border-white/5 rounded-xl p-4 flex items-start gap-4 hover:border-indigo-500/30 transition-colors">
                  <div className="pt-1 cursor-grab opacity-50">
                    <GripVertical className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[#0F1629] border border-white/5 flex items-center justify-center shrink-0">
                    <ListChecks className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-500">Q{i + 1}</span>
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-[#0F1629] border-white/10 text-slate-300">
                        {q.difficulty || 'Medium'}
                      </Badge>
                      {q.isAI && (
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-indigo-500/10 border-indigo-500/30 text-indigo-400">
                          AI
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-200 font-medium line-clamp-2">{q.text}</p>
                  </div>
                  <button onClick={() => removeQuestion(q.id ?? i)} className="p-1.5 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* RIGHT: Settings Sidebar */}
        <motion.div variants={itemFadeIn}>
          <div className="sticky top-24 space-y-6">

            {/* AI Generate Card */}
            <Card className="bg-gradient-to-br from-indigo-900/40 to-[#0F1629] border-indigo-500/30 p-6 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <Sparkles className="w-8 h-8 text-indigo-400 mb-4 relative z-10" />
              <h3 className="text-xl font-clash font-semibold text-white mb-2 relative z-10">AI Auto-Generate</h3>
              <p className="text-sm text-indigo-200/70 mb-4 relative z-10">Generate questions instantly based on topic and difficulty.</p>
              <div className="space-y-3 mb-4 relative z-10">
                <select value={topic} onChange={e => setTopic(e.target.value)}
                  className="w-full bg-[#0A0E1A]/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                  {topicNames.map(t => <option key={t}>{t}</option>)}
                </select>
                {topicsLoading && <p className="text-xs text-slate-500 mt-1">Loading topics...</p>}
                <div className="flex gap-2">
                  <input type="number" value={numAiQ} onChange={e => setNumAiQ(parseInt(e.target.value) || 1)} min={1} max={10}
                    className="w-20 bg-[#0A0E1A]/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                    className="flex-1 bg-[#0A0E1A]/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option>Easy</option><option>Medium</option><option>Hard</option>
                  </select>
                </div>
              </div>
              <Button onClick={generateWithAI} disabled={isGenerating}
                className="w-full relative z-10 shadow-lg shadow-indigo-500/25 bg-white text-indigo-900 hover:bg-slate-100">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {isGenerating ? 'Generating...' : 'Generate with AI'}
              </Button>
            </Card>

            {/* Settings Card */}
            <Card className="p-6">
              <h3 className="font-semibold text-white mb-4">Quiz Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Target Audience
                  </label>
                  <Button variant="outline" className="w-full justify-between bg-[#0A0E1A] border-white/10 text-slate-300 font-normal">
                    Grade 10-A <ChevronDown className="w-4 h-4 text-slate-500" />
                  </Button>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Time Limit (minutes)
                  </label>
                  <input type="number" value={timeLimit} onChange={e => setTimeLimit(parseInt(e.target.value) || 15)} min={5} max={120}
                    className="w-full bg-[#0A0E1A] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Topic
                  </label>
                  <Badge variant="outline" className="bg-[#0F1629] border-white/10 text-slate-300">{topic}</Badge>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-dashed border-white/20 bg-transparent flex items-center justify-between group hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Advanced Options</h4>
                  <p className="text-xs text-slate-400">Grading rules, randomization...</p>
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-slate-500" />
            </Card>
          </div>
        </motion.div>
      </div>

      {/* QUESTION BANK PICKER MODAL */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPickerOpen(false)} />
          <div className="relative bg-[#0F1629] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center gap-3">
              <h2 className="text-lg font-clash font-semibold text-white flex-1">Select from Question Bank</h2>
              <button onClick={() => setPickerOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search questions..." value={bankSearch}
                  onChange={e => setBankSearch(e.target.value)}
                  className="w-full bg-[#0A0E1A] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingBank ? (
                <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto" /></div>
              ) : filteredBank.map(q => {
                const isSelected = selectedQuestions.some(s => s.id === q.id);
                return (
                  <div key={q.id}
                    onClick={() => toggleQuestion(q)}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3",
                      isSelected ? "border-indigo-500 bg-indigo-500/10" : "border-white/5 hover:bg-white/5 hover:border-white/15"
                    )}
                  >
                    <div className={cn("w-5 h-5 rounded border-2 mt-0.5 shrink-0 flex items-center justify-center",
                      isSelected ? "bg-indigo-500 border-indigo-500" : "border-white/20")}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium line-clamp-2">{q.text}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] bg-[#0A0E1A] border-white/10 text-slate-400">{q.topic}</Badge>
                        <Badge variant="outline" className="text-[10px] bg-[#0A0E1A] border-white/10 text-slate-400">{q.difficulty}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-white/10 flex justify-between items-center">
              <p className="text-sm text-slate-400">{selectedQuestions.length} selected</p>
              <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={() => setPickerOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
