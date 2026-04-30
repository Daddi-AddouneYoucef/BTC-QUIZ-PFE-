import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  CheckCircle, XCircle, Trophy, ChevronLeft, ChevronRight,
  RefreshCw, BarChart2, Clock, Keyboard,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { getSupabaseClient } from '../lib/supabase-client';
import { toast } from 'sonner';
import {
  AiCorrection, AiCorrectionSkeleton, AiCorrectionError,
  AiCorrectionQuotaError,
  type PedagogicalFeedback,
} from './AiCorrection';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  questions: Question[];
}

const supabase = getSupabaseClient();
const TIMER_SECONDS = 60;

type AiState = 'idle' | 'loading' | 'success' | 'error' | 'quota_exceeded';

export default function QuizTake() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Quiz state
  const [quiz, setQuiz]                       = useState<Quiz | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);

  // Submission
  const [submitting, setSubmitting]     = useState(false);
  const [showResults, setShowResults]   = useState(false);
  const [score, setScore]               = useState(0);
  const [savedAttemptId, setSavedAttemptId] = useState<string | null>(null);

  // Timer
  const [timeLeft, setTimeLeft]       = useState(TIMER_SECONDS);
  const [timerActive, setTimerActive] = useState(false);

  // AI correction
  const [aiFeedback, setAiFeedback] = useState<PedagogicalFeedback | null>(null);
  const [aiState, setAiState]       = useState<AiState>('idle');
  const [aiErrorMsg, setAiErrorMsg] = useState<string>('');

  // UI
  const [showShortcuts, setShowShortcuts] = useState(false);

  // ─── Load quiz ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchQuiz();
  }, [id, user]);

  const fetchQuiz = async () => {
    try {
      const { data: quizData, error: quizErr } = await supabase
        .from('quizzes').select('*').eq('id', id).single();
      if (quizErr || !quizData) throw new Error('Quiz introuvable');

      const { data: questionsData, error: qErr } = await supabase
        .from('questions').select('*').eq('quiz_id', id).order('order_index', { ascending: true });
      if (qErr) throw qErr;

      const formattedQuestions: Question[] = (questionsData || []).map((q: any) => ({
        question:      q.question_text,
        options:       q.options,
        correctAnswer: q.correct_answer,
      }));

      setQuiz({ ...quizData, questions: formattedQuestions });
      setSelectedAnswers(new Array(formattedQuestions.length).fill(-1));
      setTimerActive(true);
    } catch (err: any) {
      setError(err.message || 'Échec du chargement du quiz');
    } finally {
      setLoading(false);
    }
  };

  // ─── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerActive || showResults) return;
    if (timeLeft <= 0) { handleNextOrAdvance(); return; }
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, timerActive, showResults]);

  useEffect(() => { setTimeLeft(TIMER_SECONDS); }, [currentQuestion]);

  // Ref to always hold the latest handleSubmit to avoid stale closures in timer
  const handleSubmitRef = useRef<() => void>(() => {});
  useEffect(() => { handleSubmitRef.current = handleSubmit; });

  const handleNextOrAdvance = useCallback(() => {
    if (!quiz) return;
    if (currentQuestion < quiz.questions.length - 1) setCurrentQuestion(c => c + 1);
    else handleSubmitRef.current();
  }, [currentQuestion, quiz]);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    if (!quiz || showResults) return;
    const handler = (e: KeyboardEvent) => {
      if (['1','2','3','4'].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        if (idx < quiz.questions[currentQuestion].options.length) handleAnswerSelect(idx);
      }
      if (e.key === 'ArrowRight' && selectedAnswers[currentQuestion] !== -1)
        if (currentQuestion < quiz.questions.length - 1) setCurrentQuestion(c => c + 1);
      if (e.key === 'ArrowLeft' && currentQuestion > 0)
        setCurrentQuestion(c => c - 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [quiz, currentQuestion, selectedAnswers, showResults]);

  // ─── Select answer ─────────────────────────────────────────────────────────
  const handleAnswerSelect = (answerIndex: number) => {
    const next = [...selectedAnswers];
    next[currentQuestion] = answerIndex;
    setSelectedAnswers(next);
  };

  // ─── Submit quiz ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!quiz) return;
    setTimerActive(false);

    let correct = 0;
    quiz.questions.forEach((q, i) => { if (selectedAnswers[i] === q.correctAnswer) correct++; });
    setScore(correct);
    setShowResults(true);
    setSubmitting(true);

    try {
      // 0. Ensure the user profile row exists (required by FK constraint on quiz_attempts)
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', user!.id)
        .single();

      if (!existingProfile) {
        console.log('[Submit] No profile row — creating one before insert');
        const { error: profileErr } = await supabase.from('users').insert({
          id:            user!.id,
          email:         user!.email,
          name:          user!.user_metadata?.name || user!.email.split('@')[0],
          quizzes_taken: 0,
          total_score:   0,
        });
        if (profileErr) {
          console.error('[Submit] Profile creation error:', profileErr);
        }
      }

      // 1. Save the quiz attempt
      const { data: attempt, error: insertErr } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id:         user!.id,
          quiz_id:         quiz.id,
          score:           correct,
          total_questions: quiz.questions.length,
          answers:         selectedAnswers,
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error('[Submit] Save error:', insertErr);
        toast.error('Impossible de sauvegarder le résultat');
        // Still fetch AI feedback so the user isn't totally blocked, but it won't persist
        requestAiFeedback(null, quiz, selectedAnswers, correct);
      } else {
        const pct = Math.round((correct / quiz.questions.length) * 100);
        if (pct === 100) toast.success('🎉 Score parfait ! Incroyable !');
        else if (pct >= 80) toast.success('Excellent travail ! Résultat sauvegardé.');
        else toast.success('Résultat sauvegardé !');
        if (attempt?.id) {
          setSavedAttemptId(attempt.id);
          console.log('[Submit] Attempt saved:', attempt.id);
          // Launch AI feedback ONLY after DB save succeeds, passing the fresh attempt ID
          requestAiFeedback(attempt.id, quiz, selectedAnswers, correct);
        } else {
          requestAiFeedback(null, quiz, selectedAnswers, correct);
        }
      }
    } catch (err) {
      console.error('[Submit] Unexpected exception:', err);
      requestAiFeedback(null, quiz, selectedAnswers, correct);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Request AI correction ─────────────────────────────────────────────────
  const requestAiFeedback = async (
    attemptId: string | null,
    currentQuiz: Quiz,
    answers: number[],
    finalScore: number,
  ) => {
    setAiState('loading');
    setAiFeedback(null);
    setAiErrorMsg('');
    try {
      // Key comes from .env (VITE_GEMINI_API_KEY) — restart dev server if missing
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        console.error('[AI] VITE_GEMINI_API_KEY not set — please restart the dev server');
        setAiErrorMsg('VITE_GEMINI_API_KEY is not set in environment.');
        setAiState('error');
        return;
      }

      // Build wrong-answer list
      const wrongAnswers = currentQuiz.questions
        .map((q, i) => ({
          questionIndex: i,
          question:      q.question,
          userAnswer:    answers[i] !== undefined ? (q.options[answers[i]] ?? 'Pas de réponse') : 'Pas de réponse',
          correctAnswer: q.options[q.correctAnswer],
          isCorrect:     answers[i] === q.correctAnswer,
        }))
        .filter(w => !w.isCorrect);

      // Perfect score
      if (wrongAnswers.length === 0) {
        setAiFeedback({
          overallMessage: '🎉 Score parfait ! Vous maîtrisez parfaitement ce sujet. Votre compréhension est exemplaire !',
          studyRecommendation: 'Continuez sur cette lancée et explorez des concepts plus avancés.',
          analyses: [],
        });
        setAiState('success');
        return;
      }

      const pct = Math.round((finalScore / currentQuiz.questions.length) * 100);
      const wrongList = wrongAnswers
        .map((w, i) =>
          `Question ${i + 1} (index ${w.questionIndex}):\n` +
          `  Énoncé: ${w.question}\n` +
          `  Réponse étudiant: ${w.userAnswer}\n` +
          `  Réponse correcte: ${w.correctAnswer}`,
        ).join('\n\n');

      const prompt = `Tu es un professeur pédagogue expert. Analyse les erreurs et fournis des corrections en français.

Quiz: "${currentQuiz.title}" — Score: ${finalScore}/${currentQuiz.questions.length} (${pct}%)

Réponses incorrectes:
${wrongList}

Réponds UNIQUEMENT avec ce JSON valide (aucun texte avant ou après, aucun markdown):
{"overallMessage":"...","studyRecommendation":"...","analyses":[{"questionIndex":0,"explanation":"...","misconception":"...","tip":"..."}]}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
              temperature: 0.3, 
              maxOutputTokens: 2048,
              responseMimeType: "application/json"
            },
          }),
        },
      );

      console.log('[AI] Gemini status:', res.status);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('[AI] Gemini error:', errData);
        const errStr = JSON.stringify(errData);
        if (res.status === 429 || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('quota')) {
          setAiState('quota_exceeded');
        } else {
          setAiErrorMsg(`API Error ${res.status}: ${errStr}`);
          setAiState('error');
        }
        return;
      }

      const data = await res.json();
      const rawText: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) { 
        setAiErrorMsg(`No text content in response. Raw data: ${JSON.stringify(data).slice(0, 300)}`);
        setAiState('error'); 
        return; 
      }

      // Extract JSON from the response
      let parsed: any;
      try { 
        // Try to find the JSON object if there's surrounding text, even though responseMimeType is set
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : rawText;
        parsed = JSON.parse(jsonStr); 
      }
      catch (parseErr: any) { 
        console.error('[AI] JSON parse error, raw:', rawText.slice(0, 300)); 
        setAiErrorMsg(`JSON parse error: ${parseErr?.message}. Raw: ${rawText.slice(0, 200)}`);
        setAiState('error'); 
        return; 
      }

      // Merge AI analyses with question data
      const aiMap: Record<number, any> = {};
      for (const a of parsed.analyses ?? []) aiMap[a.questionIndex] = a;

      const fullAnalyses = wrongAnswers.map(wa => {
        const ai = aiMap[wa.questionIndex] ?? {};
        return {
          questionIndex: wa.questionIndex,
          question:      wa.question,
          userAnswer:    wa.userAnswer,
          correctAnswer: wa.correctAnswer,
          isCorrect:     false,
          explanation:   ai.explanation   ?? 'Explication non disponible.',
          misconception: ai.misconception ?? '',
          tip:           ai.tip           ?? '',
        };
      });

      const feedback = {
        overallMessage:      parsed.overallMessage      ?? '',
        studyRecommendation: parsed.studyRecommendation ?? '',
        analyses:            fullAnalyses,
      };

      setAiFeedback(feedback);
      setAiState('success');

      // Persist feedback to DB non-blocking
      if (attemptId) {
        supabase.from('quiz_attempts')
          .update({ ai_feedback: JSON.stringify(feedback) })
          .eq('id', attemptId)
          .then(({ error }) => { if (error) console.warn('[AI] DB persist failed:', error.message); });
      }

    } catch (err: any) {
      console.error('[AI] Exception:', err);
      setAiErrorMsg(`Exception: ${err?.message || 'Unknown error'}`);
      setAiState('error');
    }
  };

  const retryAiFeedback = () => {
    if (!quiz) return;
    requestAiFeedback(savedAttemptId, quiz, selectedAnswers, score);
  };

  // ─── Computed ─────────────────────────────────────────────────────────────
  const timerColor = timeLeft > 20 ? 'text-green-400' : timeLeft > 10 ? 'text-amber-400' : 'text-red-400';
  const timerBg    = timeLeft > 20 ? 'bg-green-400'   : timeLeft > 10 ? 'bg-amber-400'   : 'bg-red-400';

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="text-zinc-400">Chargement du quiz…</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !quiz) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="max-w-md mx-auto bg-red-500/5 border border-red-500/20 rounded-2xl p-6 text-center">
          <p className="text-red-400 font-medium mb-2">{error || 'Quiz introuvable'}</p>
          <Button onClick={() => navigate('/quizzes')} variant="outline" className="mt-4 border-zinc-700">
            <ChevronLeft className="w-4 h-4 mr-1" /> Retour aux Quizzes
          </Button>
        </div>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────
  if (showResults) {
    const pct  = Math.round((score / quiz.questions.length) * 100);
    const tier = pct === 100 ? 'perfect' : pct >= 80 ? 'great' : pct >= 60 ? 'good' : 'low';
    const tierConfig = {
      perfect: { label: '🎉 Score parfait !',        color: 'text-yellow-400', bg: 'from-yellow-500/15 to-transparent', bar: 'bg-yellow-400' },
      great:   { label: '🔥 Excellent travail !',    color: 'text-green-400',  bg: 'from-green-500/15 to-transparent',  bar: 'bg-green-400'  },
      good:    { label: '👍 Bon travail !',           color: 'text-blue-400',   bg: 'from-blue-500/15 to-transparent',   bar: 'bg-blue-400'   },
      low:     { label: '📚 Continuez à pratiquer',  color: 'text-amber-400',  bg: 'from-amber-500/15 to-transparent',  bar: 'bg-amber-400'  },
    }[tier];

    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-5">

        {/* ── Score hero ── */}
        <div className={`relative rounded-3xl overflow-hidden border border-zinc-700/50 bg-gradient-to-b ${tierConfig.bg} bg-zinc-800/40`}>
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="p-8 text-center">
            <div className="text-5xl mb-3">{pct === 100 ? '🏆' : pct >= 80 ? '🥇' : pct >= 60 ? '🥈' : '📖'}</div>
            <h1 className="text-2xl font-bold text-white mb-1">{tierConfig.label}</h1>
            <p className="text-zinc-400 text-sm mb-8">{quiz.title}</p>
            <div className={`text-8xl font-black mb-2 tabular-nums ${tierConfig.color}`}>{pct}%</div>
            <p className="text-zinc-400 mb-6">{score} sur {quiz.questions.length} correctes</p>
            <div className="max-w-sm mx-auto">
              <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                <span>Score</span><span>{score}/{quiz.questions.length}</span>
              </div>
              <div className="w-full h-3 bg-zinc-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${tierConfig.bar}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── AI Correction ── */}
        {aiState === 'loading' && <AiCorrectionSkeleton />}
        {aiState === 'success' && aiFeedback && (
          <AiCorrection feedback={aiFeedback} onRetry={retryAiFeedback} />
        )}
        {aiState === 'error' && <AiCorrectionError onRetry={retryAiFeedback} message={aiErrorMsg} />}
        {aiState === 'quota_exceeded' && <AiCorrectionQuotaError onRetry={retryAiFeedback} />}

        {/* ── Question review ── */}
        <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-700/50 flex items-center justify-between">
            <h2 className="font-semibold text-white">Récapitulatif des réponses</h2>
            <span className="text-xs text-zinc-500">{quiz.questions.length} questions</span>
          </div>
          <div className="divide-y divide-zinc-700/30">
            {quiz.questions.map((q, i) => {
              const correct = selectedAnswers[i] === q.correctAnswer;
              return (
                <div key={i} className={`px-5 py-4 ${correct ? 'bg-green-500/3' : 'bg-red-500/3'}`}>
                  <div className="flex items-start gap-3">
                    {correct
                      ? <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                      : <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
                    <div className="flex-grow">
                      <p className="text-sm font-medium text-zinc-200 mb-2 leading-relaxed">{q.question}</p>
                      <div className="space-y-0.5 text-xs">
                        <p className={correct ? 'text-green-400' : 'text-red-400'}>
                          Votre réponse : {q.options[selectedAnswers[i]] ?? <em>Non répondu</em>}
                        </p>
                        {!correct && (
                          <p className="text-green-400">Réponse correcte : {q.options[q.correctAnswer]}</p>
                        )}
                      </div>
                    </div>
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${correct ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                      {correct ? '+1' : '0'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {submitting && (
          <p className="text-sm text-zinc-500 text-center flex items-center justify-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sauvegarde en cours…
          </p>
        )}

        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Button onClick={() => navigate('/quizzes')} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-semibold px-8">
            Plus de Quizzes
          </Button>
          <Button variant="outline" className="border-zinc-700 hover:bg-white/5 text-zinc-300" onClick={() => navigate('/results')}>
            <BarChart2 className="w-4 h-4 mr-2" /> Tous mes résultats
          </Button>
        </div>
      </div>
    );
  }

  // ── Quiz taking ──────────────────────────────────────────────────────────
  const q            = quiz.questions[currentQuestion];
  const answeredCount = selectedAnswers.filter(a => a !== -1).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Back */}
      <button onClick={() => navigate('/quizzes')}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour aux Quizzes
      </button>

      {/* Header bar */}
      <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">{quiz.category}</Badge>
            <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-600">{quiz.difficulty}</Badge>
          </div>
          <div className={`flex items-center gap-2 font-mono font-bold text-lg ${timerColor}`}>
            <Clock className="w-4 h-4" />
            {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Question {currentQuestion + 1} / {quiz.questions.length}</span>
            <span>{answeredCount}/{quiz.questions.length} répondues</span>
          </div>
          <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }} />
          </div>
          <div className="h-1 bg-zinc-700/50 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${timerBg}`}
              style={{ width: `${(timeLeft / TIMER_SECONDS) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl p-6 mb-4">
        <h2 className="text-xl font-bold text-white mb-6 leading-relaxed">{q.question}</h2>
        <div className="space-y-3">
          {q.options.map((option, idx) => {
            const isSelected = selectedAnswers[currentQuestion] === idx;
            return (
              <button key={idx} onClick={() => handleAnswerSelect(idx)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                    : 'border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600 hover:bg-zinc-700/30'
                }`}>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                  isSelected ? 'bg-primary text-white' : 'bg-zinc-700/70 text-zinc-400'
                }`}>{idx + 1}</span>
                <span className={`text-sm font-medium leading-relaxed ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                  {option}
                </span>
                {isSelected && <CheckCircle className="w-5 h-5 text-primary ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" className="border-zinc-700 hover:bg-white/5 text-zinc-300"
          onClick={() => setCurrentQuestion(c => c - 1)} disabled={currentQuestion === 0}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
        </Button>

        {/* Dot navigator */}
        <div className="hidden sm:flex items-center gap-1.5">
          {quiz.questions.map((_, i) => (
            <button key={i} onClick={() => setCurrentQuestion(i)}
              className={`transition-all rounded-full ${
                i === currentQuestion
                  ? 'w-5 h-2.5 bg-primary'
                  : selectedAnswers[i] !== -1
                  ? 'w-2.5 h-2.5 bg-primary/50'
                  : 'w-2.5 h-2.5 bg-zinc-700 hover:bg-zinc-500'
              }`} />
          ))}
        </div>

        {currentQuestion === quiz.questions.length - 1 ? (
          <Button onClick={handleSubmit}
            disabled={selectedAnswers.includes(-1) || submitting}
            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-semibold">
            {submitting
              ? <><RefreshCw className="w-4 h-4 animate-spin mr-1.5" />Envoi…</>
              : <>Terminer <Trophy className="w-4 h-4 ml-1.5" /></>}
          </Button>
        ) : (
          <Button onClick={() => setCurrentQuestion(c => c + 1)} className="bg-zinc-700 hover:bg-zinc-600 text-white">
            Suivant <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Keyboard hint */}
      <div className="mt-4 flex justify-center">
        <button onClick={() => setShowShortcuts(!showShortcuts)}
          className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          <Keyboard className="w-3.5 h-3.5" /> Raccourcis clavier
        </button>
      </div>

      {showShortcuts && (
        <div className="mt-2 bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4 text-xs text-zinc-500">
          <div className="grid grid-cols-2 gap-2">
            {[['1 – 4', 'Sélectionner réponse'], ['→', 'Question suivante'], ['←', 'Question précédente']].map(([key, desc]) => (
              <div key={key} className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-300 font-mono">{key}</kbd>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedAnswers.includes(-1) && currentQuestion === quiz.questions.length - 1 && (
        <p className="text-xs text-amber-400 text-center mt-3">
          {selectedAnswers.filter(a => a === -1).length} question(s) sans réponse
        </p>
      )}
    </div>
  );
}