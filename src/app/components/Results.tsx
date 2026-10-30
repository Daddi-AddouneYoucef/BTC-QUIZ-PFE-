import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Trophy, TrendingUp, Calendar, RefreshCw, BookOpen, ChevronDown, ChevronUp, Target, Award, BarChart2, Brain } from 'lucide-react';
import { useAuth } from './AuthContext';
import { getSupabaseClient } from '../lib/supabase-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { AiCorrection, type PedagogicalFeedback } from './AiCorrection';

interface Result {
  id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  ai_feedback?: string;
}

const supabase = getSupabaseClient();

function ScoreBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-green-400' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="w-full h-1.5 bg-zinc-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const scoreColor = (pct: number) => pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400';
const scoreBadge = (pct: number) =>
  pct >= 80 ? 'bg-green-500/10 text-green-400 border-green-500/30'
  : pct >= 60 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
  : 'bg-red-500/10 text-red-400 border-red-500/30';

const formatQuizTitle = (id: string) => id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
const formatDate = (ts: string) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const formatFullDate = (ts: string) => new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });


function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-xs shadow-xl">
      <p className="text-zinc-400 mb-1">{label}</p>
      <p className="font-bold text-white">{payload[0].value}%</p>
    </div>
  );
}

export default function Results() {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedFeedback, setExpandedFeedback] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchResults();
  }, [user]);

  const fetchResults = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('quiz_attempts').select('*').eq('user_id', user.id).order('completed_at', { ascending: false });
      if (err) throw err;
      setResults(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const toggleFeedback = (id: string) =>
    setExpandedFeedback(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const stats = (() => {
    if (!results.length) return { average: 0, total: 0, best: 0, recent: 0 };
    const pcts = results.map(r => Math.round((r.score / r.total_questions) * 100));
    return {
      total: results.length,
      average: Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length),
      best: Math.max(...pcts),
      recent: pcts[0] ?? 0,
    };
  })();



  const chartData = [...results].reverse().slice(-10).map((r, i) => ({
    label: `#${i + 1}`,
    name:  formatDate(r.completed_at),
    score: Math.round((r.score / r.total_questions) * 100),
  }));

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="text-zinc-400">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="max-w-md mx-auto bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
          <p className="text-red-400 font-medium mb-2">Failed to load results</p>
          <p className="text-sm text-zinc-400 mb-4">{error}</p>
          <Button size="sm" onClick={fetchResults} className="bg-primary hover:bg-primary/90">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 tracking-tight">
            My <span className="text-primary">Results</span>
          </h1>
          <p className="text-zinc-400">Track your quiz performance over time</p>
        </div>
        {results.length > 0 && (
          <Button variant="ghost" size="sm" onClick={fetchResults} className="text-zinc-500 hover:text-zinc-200">
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Trophy className="w-10 h-10 text-zinc-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No results yet</h3>
          <p className="text-zinc-500 mb-6">Take your first quiz to start tracking your progress!</p>
          <Link to="/quizzes">
            <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-semibold">
              <BookOpen className="w-4 h-4 mr-2" /> Browse Quizzes
            </Button>
          </Link>
        </div>
      ) : (
        <>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Trophy, label: 'Total Taken', value: stats.total, suffix: 'quizzes', color: 'text-primary' },
              { icon: TrendingUp, label: 'Average Score', value: `${stats.average}%`, suffix: 'overall', color: scoreColor(stats.average) },
              { icon: Award, label: 'Best Score', value: `${stats.best}%`, suffix: 'personal best', color: 'text-yellow-400' },
              { icon: Target, label: 'Latest Score', value: `${stats.recent}%`, suffix: 'most recent', color: scoreColor(stats.recent) },
            ].map(({ icon: Icon, label, value, suffix, color }) => (
              <div key={label} className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-zinc-500 font-medium">{label}</p>
                  <Icon className="w-4 h-4 text-zinc-600" />
                </div>
                <div className={`text-2xl font-black ${color}`}>{value}</div>
                <p className="text-xs text-zinc-600 mt-1">{suffix}</p>
              </div>
            ))}
          </div>


          {chartData.length > 1 && (
            <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-2 mb-6">
                <BarChart2 className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-white">Score History</h2>
                <span className="text-xs text-zinc-500 ml-auto">Last {chartData.length} attempts</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={32} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(249,115,22,0.05)', radius: 6 }} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={`bar-cell-${entry.label}-${i}`}
                        fill={entry.score >= 80 ? '#4ade80' : entry.score >= 60 ? '#fbbf24' : '#f87171'}
                        opacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}


          <h2 className="text-xl font-bold text-white mb-4">Quiz History</h2>
          <div className="space-y-3">
            {results.map((result) => {
              const pct = Math.round((result.score / result.total_questions) * 100);
              const expanded = expandedFeedback.has(result.id);
              return (
                <div key={result.id}
                  className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl overflow-hidden hover:border-zinc-600/50 transition-all">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-grow min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-bold text-white truncate">{formatQuizTitle(result.quiz_id)}</h3>
                          <Badge variant="outline" className={`text-xs ${scoreBadge(pct)}`}>
                            {pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : 'Needs Work'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <Calendar className="w-3 h-3" />
                          {formatFullDate(result.completed_at)}
                          <span>·</span>
                          <span>{result.score}/{result.total_questions} correct</span>
                        </div>
                      </div>
                      <div className={`text-3xl font-black shrink-0 tabular-nums ${scoreColor(pct)}`}>{pct}%</div>
                    </div>
                    <ScoreBar pct={pct} />

                    {result.ai_feedback && (
                      <div className="mt-3">
                        <button onClick={() => toggleFeedback(result.id)}
                          className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors">
                          <Brain className="w-3.5 h-3.5" />
                          Correction IA
                          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        {expanded && (() => {
                          const parsed = parseAiFeedback(result.ai_feedback);
                          if (!parsed) return null;
                          if (typeof parsed === 'object') {
                            return (
                              <div className="mt-3">
                                <AiCorrection feedback={parsed as PedagogicalFeedback} />
                              </div>
                            );
                          }

                          return (
                            <div className="mt-2 p-4 bg-primary/5 border border-primary/15 rounded-xl">
                              <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed">{parsed}</p>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <Link to="/quizzes">
              <Button variant="outline" className="border-zinc-700 hover:bg-white/5 text-zinc-300">
                <BookOpen className="w-4 h-4 mr-2" /> Take More Quizzes
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}


function parseAiFeedback(raw: string | null | undefined): PedagogicalFeedback | string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed === 'object' && 'analyses' in parsed) {
      return parsed as PedagogicalFeedback;
    }

    return raw;
  } catch {

    return raw;
  }
}