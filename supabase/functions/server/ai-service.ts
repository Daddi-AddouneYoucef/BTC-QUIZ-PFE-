/**
 * AI Service — Pedagogical feedback powered by Google Gemini API
 */

export interface QuestionAnalysis {
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

export interface FeedbackResult {
  feedback: PedagogicalFeedback | null;
  error: string | null;
  quotaExceeded?: boolean;
  retryAfterSeconds?: number;
}

interface QuestionInput {
  question: string;
  options: string[];
  correctAnswer: number;
}

const GEMINI_MODEL = 'gemini-2.0-flash';

// ─── Build prompt ────────────────────────────────────────────────────────────
function buildPrompt(
  wrongAnswers: Array<{
    questionIndex: number;
    question: string;
    userAnswer: string;
    correctAnswer: string;
  }>,
  score: number,
  total: number,
  quizTitle: string,
): string {
  const pct       = Math.round((score / total) * 100);
  const wrongList = wrongAnswers
    .map(
      (w, i) =>
        `Question ${i + 1} (index ${w.questionIndex}) :\n` +
        `  - Énoncé : ${w.question}\n` +
        `  - Réponse de l'étudiant : ${w.userAnswer}\n` +
        `  - Réponse correcte : ${w.correctAnswer}`,
    )
    .join('\n\n');

  return `Tu es un professeur pédagogue expert. Analyse les erreurs d'un étudiant et fournis des corrections détaillées en français.

Quiz : "${quizTitle}" — Score : ${score}/${total} (${pct} %)

Réponses incorrectes :
${wrongList}

Réponds UNIQUEMENT avec un JSON valide respectant ce format exact (sans markdown, sans texte avant ou après) :
{
  "overallMessage": "Message d'encouragement personnalisé (2-3 phrases)",
  "studyRecommendation": "Ce que l'étudiant devrait réviser (2-3 phrases)",
  "analyses": [
    {
      "questionIndex": <index_original_de_la_question>,
      "explanation": "Explication complète de la réponse correcte",
      "misconception": "Malentendu probable de l'étudiant",
      "tip": "Conseil pratique pour maîtriser ce concept"
    }
  ]
}`;
}

// ─── Strip markdown code fences ──────────────────────────────────────────────
function extractJson(raw: string): string {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) return match[1].trim();
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1) return raw.slice(start, end + 1);
  return raw.trim();
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function generatePedagogicalFeedback(
  questions: QuestionInput[],
  answers: number[],
  score: number,
  geminiApiKey: string,
  quizTitle = 'Quiz',
): Promise<FeedbackResult> {
  try {
    // 1. Identify wrong answers
    const wrongAnswers = questions
      .map((q, i) => ({
        questionIndex: i,
        question:      q.question,
        userAnswer:    answers[i] !== undefined ? (q.options[answers[i]] ?? 'Pas de réponse') : 'Pas de réponse',
        correctAnswer: q.options[q.correctAnswer],
        isCorrect:     answers[i] === q.correctAnswer,
      }))
      .filter((item) => !item.isCorrect);

    // 2. Perfect score — no API call needed
    if (wrongAnswers.length === 0) {
      return {
        feedback: {
          overallMessage:
            '🎉 Score parfait ! Vous maîtrisez parfaitement ce sujet. ' +
            'Votre compréhension est exemplaire — continuez sur cette lancée !',
          studyRecommendation:
            'Votre maîtrise est excellente. Tentez des quiz de niveau supérieur ' +
            'ou explorez des concepts plus avancés pour continuer à progresser.',
          analyses: [],
        },
        error: null,
      };
    }

    // 3. Build prompt
    const prompt = buildPrompt(wrongAnswers, score, questions.length, quizTitle);
    console.log(`[AI Service] Calling Gemini API (${GEMINI_MODEL}) for ${wrongAnswers.length} wrong answer(s)`);

    // 4. Call Gemini generateContent API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`;

    const doFetch = () =>
      fetch(geminiUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature:     0.4,
            maxOutputTokens: 2048,
          },
        }),
      });

    let response = await doFetch();

    // Handle 429 — rate limit
    if (response.status === 429) {
      const retryBody     = await response.json().catch(() => ({}));
      const retryAfterHdr = response.headers.get('retry-after');
      const retrySeconds  = retryAfterHdr ? parseFloat(retryAfterHdr) : 60;

      if (retrySeconds <= 15) {
        console.log(`[AI Service] 429 — retrying after ${retrySeconds}s`);
        await new Promise((resolve) => setTimeout(resolve, (retrySeconds + 1) * 1000));
        response = await doFetch();
      } else {
        const reason = `Gemini API 429: ${JSON.stringify(retryBody)}`;
        console.log(`[AI Service] Quota exceeded, retry delay ${retrySeconds}s — not retrying`);
        return { feedback: null, error: reason, quotaExceeded: true, retryAfterSeconds: retrySeconds };
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      const reason  = `Gemini API ${response.status}: ${errText}`;
      console.log(`[AI Service] ${reason}`);
      // Detect resource-exhausted quota errors
      if (response.status === 429 || errText.includes('RESOURCE_EXHAUSTED') || errText.includes('quota')) {
        return { feedback: null, error: reason, quotaExceeded: true, retryAfterSeconds: 60 };
      }
      return { feedback: null, error: reason };
    }

    // 5. Parse Gemini response
    const data = await response.json();
    console.log(`[AI Service] Raw response (truncated): ${JSON.stringify(data).slice(0, 500)}`);

    // Gemini response shape: data.candidates[0].content.parts[0].text
    const rawText: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      const reason = `Empty content from Gemini API. Full response: ${JSON.stringify(data).slice(0, 400)}`;
      console.log(`[AI Service] ${reason}`);
      return { feedback: null, error: reason };
    }

    // 6. Parse JSON
    const jsonString = extractJson(rawText);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseErr) {
      const reason = `JSON parse failed: ${parseErr}. Raw (first 300 chars): ${rawText.slice(0, 300)}`;
      console.log(`[AI Service] ${reason}`);
      return { feedback: null, error: reason };
    }

    // 7. Merge AI analysis with question data
    const analysesMap: Record<number, any> = {};
    for (const a of parsed.analyses ?? []) {
      analysesMap[a.questionIndex] = a;
    }

    const fullAnalyses: QuestionAnalysis[] = wrongAnswers.map((wa) => {
      const ai = analysesMap[wa.questionIndex] ?? {};
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

    console.log(`[AI Service] Feedback generated — ${fullAnalyses.length} analyses`);
    return {
      feedback: {
        overallMessage:      parsed.overallMessage      ?? '',
        studyRecommendation: parsed.studyRecommendation ?? '',
        analyses:            fullAnalyses,
      },
      error: null,
    };
  } catch (err) {
    const reason = `Exception in generatePedagogicalFeedback: ${err}`;
    console.log(`[AI Service] ${reason}`);
    return { feedback: null, error: reason };
  }
}
