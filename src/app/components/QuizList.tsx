import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { BookOpen, Clock, Search, RefreshCw, Filter, X, Zap, LogIn, ChevronRight } from 'lucide-react';
import { useAuth } from './AuthContext';
import { getSupabaseClient } from '../lib/supabase-client';

interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  question_count?: number;
}

const supabase = getSupabaseClient();

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  advanced: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const CATEGORY_COLORS: Record<string, string> = {
  JavaScript: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'Web Development': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  React: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

export default function QuizList() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeDifficulty, setActiveDifficulty] = useState('All');
  const { user } = useAuth();

  useEffect(() => { fetchQuizzes(); }, []);

  const fetchQuizzes = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: quizzesData, error: qErr } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false });
      if (qErr) throw qErr;

      const { data: questionCounts } = await supabase.from('questions').select('quiz_id');
      const counts: Record<string, number> = {};
      questionCounts?.forEach((q: { quiz_id: string }) => {
        counts[q.quiz_id] = (counts[q.quiz_id] || 0) + 1;
      });

      setQuizzes((quizzesData || []).map((q: any) => ({ ...q, question_count: counts[q.id] || 0 })));
    } catch (err: any) {
      setError(err.message || 'Failed to load quizzes.');
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => ['All', ...Array.from(new Set(quizzes.map(q => q.category)))], [quizzes]);
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  const filtered = useMemo(() => {
    return quizzes.filter(q => {
      const matchSearch = search === '' ||
        q.title.toLowerCase().includes(search.toLowerCase()) ||
        q.description?.toLowerCase().includes(search.toLowerCase()) ||
        q.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === 'All' || q.category === activeCategory;
      const matchDiff = activeDifficulty === 'All' || q.difficulty.toLowerCase() === activeDifficulty.toLowerCase();
      return matchSearch && matchCat && matchDiff;
    });
  }, [quizzes, search, activeCategory, activeDifficulty]);

  const clearFilters = () => { setSearch(''); setActiveCategory('All'); setActiveDifficulty('All'); };
  const hasFilters = search || activeCategory !== 'All' || activeDifficulty !== 'All';

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="text-zinc-400">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="max-w-lg mx-auto bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
          <h3 className="font-semibold text-red-400 mb-2">Failed to load quizzes</h3>
          <p className="text-sm text-zinc-400 mb-4">{error}</p>
          <Button size="sm" onClick={fetchQuizzes} className="bg-primary hover:bg-primary/90">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 tracking-tight">
          Available <span className="text-primary">Quizzes</span>
        </h1>
        <p className="text-zinc-400 text-lg">
          {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} available — pick one and start learning
        </p>
      </div>

      {/* Guest banner */}
      {!user && quizzes.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-4 bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4">
          <div className="flex-grow">
            <p className="text-sm text-zinc-300">
              <span className="font-semibold text-primary">Sign in required</span> to take quizzes and save your results.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link to="/login"><Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-white/5 text-xs">Login</Button></Link>
            <Link to="/signup"><Button size="sm" className="bg-primary hover:bg-primary/90 text-xs font-semibold">Sign Up Free</Button></Link>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search quizzes by name or topic..."
            className="pl-11 pr-11 h-12 bg-zinc-800/80 border-zinc-700 focus:border-primary rounded-xl text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 text-sm text-zinc-500">
            <Filter className="w-3.5 h-3.5" /> Category:
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activeCategory === cat
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                    : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                }`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-zinc-700 hidden sm:block" />

          <div className="flex items-center gap-1.5 text-sm text-zinc-500">
            <Zap className="w-3.5 h-3.5" /> Difficulty:
          </div>
          <div className="flex flex-wrap gap-2">
            {difficulties.map(diff => (
              <button key={diff} onClick={() => setActiveDifficulty(diff)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activeDifficulty === diff
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                    : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                }`}>
                {diff}
              </button>
            ))}
          </div>

          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-primary transition-colors ml-auto">
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      {hasFilters && (
        <p className="text-sm text-zinc-500 mb-5">
          Showing {filtered.length} of {quizzes.length} quizzes
        </p>
      )}

      {/* Empty states */}
      {quizzes.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <BookOpen className="w-10 h-10 text-zinc-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No quizzes yet</h3>
          <p className="text-zinc-500 max-w-sm mx-auto text-sm">
            Run the <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-xs text-primary">002_seed_data.sql</code> migration in the Supabase SQL Editor to add quizzes.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No results found</h3>
          <p className="text-zinc-500 text-sm mb-4">Try adjusting your search or filters.</p>
          <Button size="sm" variant="outline" onClick={clearFilters} className="border-zinc-700 hover:bg-white/5">
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((quiz) => (
            <div key={quiz.id}
              className="group relative bg-zinc-800/40 border border-zinc-700/50 rounded-2xl overflow-hidden hover:border-primary/40 hover:bg-zinc-800/60 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5 flex flex-col">
              {/* Top accent line */}
              <div className="h-0.5 bg-gradient-to-r from-primary/50 via-primary/20 to-transparent" />

              <div className="p-6 flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <Badge variant="outline"
                    className={`text-xs ${CATEGORY_COLORS[quiz.category] || 'bg-zinc-700/50 text-zinc-400 border-zinc-600'}`}>
                    {quiz.category}
                  </Badge>
                  <Badge variant="outline"
                    className={`text-xs ${DIFFICULTY_COLORS[quiz.difficulty?.toLowerCase()] || 'bg-zinc-700/50 text-zinc-400 border-zinc-600'}`}>
                    {quiz.difficulty}
                  </Badge>
                </div>

                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors leading-snug">
                  {quiz.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2 mb-4">{quiz.description}</p>

                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {quiz.question_count ?? '—'} questions
                  </span>
                  <span>~{(quiz.question_count ?? 5) * 2} min</span>
                </div>
              </div>

              <div className="px-6 pb-6">
                {user ? (
                  <Link to={`/quiz/${quiz.id}`}>
                    <Button className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/10 font-semibold group/btn">
                      Start Quiz <ChevronRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/login">
                    <Button variant="outline" className="w-full border-zinc-700 hover:bg-white/5 text-zinc-300">
                      <LogIn className="w-4 h-4 mr-2" /> Sign in to Start
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
