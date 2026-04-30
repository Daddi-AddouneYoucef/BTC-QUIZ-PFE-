/**
 * AiCorrection — Rich per-question pedagogical correction display
 *
 * Renders the structured PedagogicalFeedback returned by /ai-feedback:
 *  • An encouraging overall message
 *  • Per-wrong-answer accordion with explanation / misconception / tip
 *  • A targeted study recommendation
 */

import { useState } from 'react';
import {
  Brain, ChevronDown, ChevronUp, CheckCircle2, XCircle,
  Lightbulb, AlertTriangle, BookOpen, Sparkles, RefreshCw,
} from 'lucide-react';
import { Button } from './ui/button';

// ─── Types (mirror server ai-service.tsx) ────────────────────────────────────

interface QuestionAnalysis {
  questionIndex: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  misconception: string;
  tip: string;
}

export interface PedagogicalFeedback {
  overallMessage: string;
  studyRecommendation: string;
  analyses: QuestionAnalysis[];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AnalysisCard({ item, index }: { item: QuestionAnalysis; index: number }) {
  const [open, setOpen] = useState(index === 0); // first card open by default

  return (
    <div className="border border-red-500/20 bg-red-500/3 rounded-xl overflow-hidden">
      {/* Header (always visible) */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-red-500/5 transition-colors"
      >
        <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div className="flex-grow min-w-0">
          <p className="text-sm font-semibold text-zinc-200 leading-snug line-clamp-2">{item.question}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs">
            <span className="flex items-center gap-1 text-red-400">
              <XCircle className="w-3 h-3" />
              Votre réponse : <em className="not-italic font-medium ml-1">{item.userAnswer}</em>
            </span>
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle2 className="w-3 h-3" />
              Réponse correcte : <em className="not-italic font-medium ml-1">{item.correctAnswer}</em>
            </span>
          </div>
        </div>
        <span className="shrink-0 text-zinc-500 mt-0.5">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {/* Expanded correction */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-red-500/10">
          {/* Explanation */}
          {item.explanation && (
            <div className="pt-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-blue-500/15 flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Explication</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed pl-8">{item.explanation}</p>
            </div>
          )}

          {/* Misconception */}
          {item.misconception && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-amber-500/15 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Malentendu fréquent</span>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed pl-8">{item.misconception}</p>
            </div>
          )}

          {/* Tip */}
          {item.tip && (
            <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide block mb-1">Conseil</span>
                  <p className="text-sm text-zinc-300 leading-relaxed">{item.tip}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

export function AiCorrectionSkeleton() {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5 text-primary/40 animate-spin" />
        </div>
        <div className="space-y-1.5 flex-grow">
          <div className="h-4 bg-zinc-700/60 rounded w-48" />
          <div className="h-3 bg-zinc-700/40 rounded w-64" />
        </div>
      </div>
      <div className="space-y-2.5">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-zinc-700/30 rounded-xl" style={{ opacity: 1 - i * 0.2 }} />
        ))}
      </div>
      <p className="text-xs text-zinc-500 mt-3 text-center flex items-center justify-center gap-2">
        <RefreshCw className="w-3 h-3 animate-spin" />
        Le professeur IA analyse vos réponses…
      </p>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

export function AiCorrectionError({ onRetry, message }: { onRetry?: () => void, message?: string }) {
  return (
    <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-5 h-5 text-zinc-500" />
        <span className="text-sm font-semibold text-zinc-400">Correction IA non disponible</span>
      </div>
      <p className="text-xs text-zinc-500 mb-3">
        {message ? (
          <span className="text-red-400 break-all">{message}</span>
        ) : (
          <>Le service IA est inaccessible. Vérifiez que le secret <code className="text-zinc-400">GEMINI_API_KEY</code> est bien configuré et que l'edge function est déployée.</>
        )}
      </p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}
          className="border-zinc-600 hover:bg-white/5 text-zinc-400 text-xs">
          <RefreshCw className="w-3 h-3 mr-1.5" /> Réessayer
        </Button>
      )}
    </div>
  );
}

// ─── Quota exceeded state ─────────────────────────────────────────────────────

export function AiCorrectionQuotaError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="bg-amber-500/5 border border-amber-500/25 rounded-2xl p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-300">Quota Gemini dépassé</p>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
            La limite de requêtes de l'API Gemini a été atteinte.
            Réessayez dans quelques instants ou vérifiez votre quota sur <span className="text-amber-400">aistudio.google.com</span>.
          </p>
        </div>
      </div>
      <div className="bg-zinc-800/60 border border-zinc-700/40 rounded-xl p-3 mb-3 text-xs text-zinc-400 space-y-1">
        <p>• Réessayez dans quelques minutes — la limite se renouvelle (souvent par minute ou journée).</p>
        <p>• Pour vérifier votre utilisation, visitez <span className="text-amber-400">aistudio.google.com</span>.</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}
          className="border-amber-600/40 hover:bg-amber-500/10 text-amber-400 text-xs">
          <RefreshCw className="w-3 h-3 mr-1.5" /> Réessayer maintenant
        </Button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AiCorrectionProps {
  feedback: PedagogicalFeedback;
  onRetry?: () => void;
}

export function AiCorrection({ feedback, onRetry }: AiCorrectionProps) {
  const wrongCount = feedback.analyses.length;

  return (
    <div className="bg-zinc-900/80 border border-primary/25 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-primary/15 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Correction du Professeur IA</p>
            <p className="text-xs text-zinc-500">
              {wrongCount === 0
                ? 'Toutes les réponses sont correctes'
                : `${wrongCount} réponse${wrongCount > 1 ? 's' : ''} analysée${wrongCount > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <Sparkles className="w-4 h-4 text-primary/60" />
      </div>

      <div className="p-5 space-y-4">
        {/* Overall message */}
        {feedback.overallMessage && (
          <div className="flex items-start gap-3 bg-white/3 rounded-xl p-4 border border-white/5">
            <div className="text-2xl shrink-0">💬</div>
            <p className="text-sm text-zinc-200 leading-relaxed italic">{feedback.overallMessage}</p>
          </div>
        )}

        {/* Per-question analyses */}
        {feedback.analyses.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Analyse question par question
            </p>
            {feedback.analyses.map((item, i) => (
              <AnalysisCard key={item.questionIndex} item={item} index={i} />
            ))}
          </div>
        )}

        {/* Perfect score */}
        {feedback.analyses.length === 0 && (
          <div className="flex items-center gap-3 bg-green-500/5 border border-green-500/20 rounded-xl p-4">
            <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />
            <p className="text-sm text-zinc-300">Aucune erreur — vous maîtrisez parfaitement ce sujet !</p>
          </div>
        )}

        {/* Study recommendation */}
        {feedback.studyRecommendation && (
          <div className="border-t border-zinc-700/50 pt-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">
                  Recommandation d'étude
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed">{feedback.studyRecommendation}</p>
              </div>
            </div>
          </div>
        )}

        {onRetry && (
          <Button size="sm" variant="ghost" onClick={onRetry}
            className="w-full text-zinc-500 hover:text-zinc-300 text-xs">
            <RefreshCw className="w-3 h-3 mr-1.5" /> Régénérer la correction
          </Button>
        )}
      </div>
    </div>
  );
}