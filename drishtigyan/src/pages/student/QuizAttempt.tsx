import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BarChart2, Clock, CheckCircle2, Circle, Lightbulb, ArrowLeft, ArrowRight, ClipboardCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import client from '@/api/client';

export default function QuizAttempt() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<any>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);

  // answers: {question_id -> selected_index}
  const [answers, setAnswers] = useState<Record<number, number>>({});
  // time per question: {question_id -> total seconds}
  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({});
  const questionStartRef = useRef<number>(Date.now());

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submitCalledRef = useRef(false);

  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Keep latest state in refs for use inside interval callbacks
  const quizRef = useRef<any>(null);
  const answersRef = useRef<Record<number, number>>({});
  const questionTimesRef = useRef<Record<number, number>>({});
  const currentIdxRef = useRef(0);
  const attemptIdRef = useRef<number | null>(null);
  const timeLeftRef = useRef<number | null>(null);

  useEffect(() => { quizRef.current = quiz; }, [quiz]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { questionTimesRef.current = questionTimes; }, [questionTimes]);
  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);
  useEffect(() => { attemptIdRef.current = attemptId; }, [attemptId]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  // On mount: fetch quiz + start attempt  
  useEffect(() => {
    const init = async () => {
      try {
        const quizRes = await client.get(`/api/quizzes/${id}`);
        setQuiz(quizRes.data);
        quizRef.current = quizRes.data;
        setTimeLeft(quizRes.data.time_limit_minutes * 60);

        const startRes = await client.post(`/api/quizzes/${id}/start`);
        setAttemptId(startRes.data.attempt_id);
        attemptIdRef.current = startRes.data.attempt_id;
        questionStartRef.current = Date.now();
      } catch (e) {
        console.error('Failed to init quiz', e);
        setError('Failed to load quiz. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  // Start countdown timer once timeLeft is set (only once)
  useEffect(() => {
    if (timeLeft === null) return;
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          // Auto-submit on time up
          if (!submitCalledRef.current) {
            submitCalledRef.current = true;
            performSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft !== null]); // runs once when timeLeft first set

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const recordCurrentTime = () => {
    const q = quizRef.current?.questions?.[currentIdxRef.current];
    if (!q) return;
    const spent = Math.round((Date.now() - questionStartRef.current) / 1000);
    questionTimesRef.current = {
      ...questionTimesRef.current,
      [q.id]: (questionTimesRef.current[q.id] || 0) + spent
    };
    setQuestionTimes({ ...questionTimesRef.current });
    questionStartRef.current = Date.now();
  };

  const handleNext = () => {
    recordCurrentTime();
    if (quiz && currentIdx < quiz.questions.length - 1) {
      setDirection(1);
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      currentIdxRef.current = nextIdx;
    }
  };

  const handlePrev = () => {
    recordCurrentTime();
    if (currentIdx > 0) {
      setDirection(-1);
      const prevIdx = currentIdx - 1;
      setCurrentIdx(prevIdx);
      currentIdxRef.current = prevIdx;
    }
  };

  const performSubmit = async () => {
    if (submitting) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);

    recordCurrentTime();

    const currentQuiz = quizRef.current;
    const currentAnswers = answersRef.current;
    const currentTimes = questionTimesRef.current;
    const currentAttemptId = attemptIdRef.current;
    const currentTimeLeft = timeLeftRef.current ?? 0;

    const answersArray = currentQuiz.questions.map((q: any) => ({
      question_id: q.id,
      selected_index: currentAnswers[q.id] !== undefined ? currentAnswers[q.id] : -1,
      time_taken_seconds: currentTimes[q.id] || 0,
    }));

    const totalTime = currentQuiz.time_limit_minutes * 60 - currentTimeLeft;

    try {
      const res = await client.post(`/api/quizzes/${id}/submit`, {
        attempt_id: currentAttemptId,
        answers: answersArray,
        total_time_seconds: totalTime,
      });
      navigate(`/student/quiz/${id}/results?attempt=${currentAttemptId}`, {
        state: { result: res.data }
      });
    } catch (e: any) {
      console.error('Submit failed', e);
      setError('Submit failed. Please try again.');
      setSubmitting(false);
      submitCalledRef.current = false;
    }
  };

  const handleSubmit = () => {
    if (submitCalledRef.current) return;
    submitCalledRef.current = true;
    performSubmit();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }
  if (!quiz) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">{error || 'Quiz not available.'}</p>
          <Button variant="outline" onClick={() => navigate('/student/quizzes')}>Back to Quizzes</Button>
        </div>
      </div>
    );
  }
  if (!quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">This quiz has no questions yet.</p>
          <Button variant="outline" onClick={() => navigate('/student/quizzes')}>Back to Quizzes</Button>
        </div>
      </div>
    );
  }

  const currentQ = quiz.questions[currentIdx];
  const isLastQuestion = currentIdx === quiz.questions.length - 1;
  const getProgress = () => ((currentIdx + 1) / quiz.questions.length) * 100;
  const isUrgent = (timeLeft ?? 0) < 120;
  const selectedOpt = answers[currentQ?.id] ?? null;

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.3 } },
    exit: (dir: number) => ({ x: dir < 0 ? 50 : -50, opacity: 0, transition: { duration: 0.2 } }),
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-slate-200 flex flex-col font-satoshi overflow-x-hidden">
      
      {/* HEADER BAR */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-[#0F1629]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white leading-tight">{quiz.title}</h1>
            <p className="text-[10px] text-slate-400">{quiz.topic} · {quiz.difficulty}</p>
          </div>
        </div>
        {error && (
          <div className="hidden md:block text-xs text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full">
            {error}
          </div>
        )}

        <div className="flex items-center gap-4">
          <motion.div
            animate={isUrgent ? { scale: [1, 1.05, 1], borderColor: ['rgba(239,68,68,0.2)', 'rgba(239,68,68,0.8)', 'rgba(239,68,68,0.2)'] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-mono font-medium",
              isUrgent ? "border-red-500 text-red-500 bg-red-500/10" : "border-indigo-500/30 text-indigo-400 bg-indigo-500/5"
            )}
          >
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft ?? 0)} REMAINING
          </motion.div>
        </div>
      </header>

      {/* PROGRESS */}
      <div className="max-w-4xl mx-auto w-full px-6 py-6">
        <div className="flex justify-between items-end mb-3">
          <span className="font-semibold text-white text-lg">
            Question <span className="text-indigo-400">{currentIdx + 1}</span> of {quiz.questions.length}
          </span>
          <span className="text-indigo-400 text-sm font-medium">{Math.round(getProgress())}% Complete</span>
        </div>
        <ProgressBar value={getProgress()} />
      </div>

      {/* QUESTION AREA */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 pb-28 overflow-hidden">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentIdx}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="flex flex-col gap-6"
          >
            {/* Question card */}
            <Card className="p-8">
              <Badge className="mb-6 bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3 py-1 text-xs uppercase tracking-wider">
                TOPIC: {currentQ?.topic}
              </Badge>
              <h2 className="text-2xl md:text-3xl font-clash font-semibold text-white leading-relaxed">
                {currentQ?.text}
              </h2>
            </Card>

            {/* Options */}
            <div className="space-y-4">
              {currentQ?.options.map((optText: string, idx: number) => {
                const isSelected = selectedOpt === idx;
                return (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: idx }))}
                    className={cn(
                      "p-5 rounded-2xl border cursor-pointer transition-all flex items-start gap-4",
                      isSelected
                        ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
                        : "border-white/10 bg-[#0F1629] hover:bg-white/5 hover:border-white/20"
                    )}
                  >
                    <div className="mt-1 flex-shrink-0">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={cn("text-lg font-medium", isSelected ? "text-white" : "text-slate-300")}>
                        {String.fromCharCode(65 + idx)}. {optText}
                      </p>
                    </div>
                    {isSelected && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="shrink-0 text-indigo-400 mt-1">
                        <CheckCircle2 className="w-6 h-6" />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Hint card */}
            <Card className="p-5 border-dashed border-white/20 bg-transparent flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                <Lightbulb className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-1">Quick tip</h4>
                <p className="text-sm text-slate-400">Read the question carefully before selecting. You can go back and change your answer.</p>
              </div>
            </Card>

          </motion.div>
        </AnimatePresence>
      </main>

      {/* BOTTOM NAVIGATION */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#0A0E1A]/90 backdrop-blur-md border-t border-white/5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={handlePrev}
            disabled={currentIdx === 0 || submitting}
          >
            <ArrowLeft className="w-4 h-4" /> Previous
          </Button>

          {/* Question dot indicators */}
          <div className="hidden md:flex gap-1.5">
            {quiz.questions.map((_: any, i: number) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  i === currentIdx ? "bg-indigo-500" :
                  answers[quiz.questions[i].id] !== undefined ? "bg-indigo-500/40" : "bg-white/15"
                )}
              />
            ))}
          </div>

          <div className="flex gap-4">
            {!isLastQuestion ? (
              <Button
                className="gap-2 bg-indigo-600 hover:bg-indigo-500 h-12 px-8 shadow-none"
                onClick={handleNext}
                disabled={submitting}
              >
                Next Question <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                className="gap-2 h-12 px-8 bg-amber-500 hover:bg-amber-400 text-black font-bold"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ClipboardCheck className="w-5 h-5" />}
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
