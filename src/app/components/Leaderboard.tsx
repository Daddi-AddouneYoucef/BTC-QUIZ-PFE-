import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Button } from './ui/button';
import { Trophy, Medal, Star, RefreshCw, LogIn, Crown } from 'lucide-react';
import { useAuth } from './AuthContext';
import { getSupabaseClient } from '../lib/supabase-client';

interface LeaderboardEntry {
  rank: number;
  name: string;
  email: string;
  quizzesTaken: number;
  totalScore: number;
  averageScore: number;
}

const supabase = getSupabaseClient();

const PODIUM_CONFIG = [
  { pos: 2, height: 'h-20', color: 'from-slate-400/20 to-slate-500/10', border: 'border-slate-400/30', icon: <Medal className="w-6 h-6 text-slate-300" />, label: '2nd', labelColor: 'text-slate-300' },
  { pos: 1, height: 'h-32', color: 'from-yellow-400/20 to-yellow-500/10', border: 'border-yellow-400/40', icon: <Crown className="w-7 h-7 text-yellow-400" />, label: '1st', labelColor: 'text-yellow-400' },
  { pos: 3, height: 'h-14', color: 'from-amber-600/20 to-amber-700/10', border: 'border-amber-600/30', icon: <Trophy className="w-5 h-5 text-amber-500" />, label: '3rd', labelColor: 'text-amber-500' },
];

const RANK_STYLES: Record<number, { row: string; num: string; bar: string }> = {
  1: { row: 'border-yellow-500/20 bg-yellow-500/5 hover:border-yellow-500/40', num: 'text-yellow-400', bar: 'bg-yellow-400' },
  2: { row: 'border-slate-400/20 bg-slate-400/5 hover:border-slate-400/40', num: 'text-slate-300', bar: 'bg-slate-400' },
  3: { row: 'border-amber-600/20 bg-amber-600/5 hover:border-amber-600/40', num: 'text-amber-500', bar: 'bg-amber-500' },
};

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => { fetchLeaderboard(); }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('get_leaderboard', { limit_count: 10 });

      if (!rpcErr && data) {
        setLeaderboard(data.map((e: any) => ({
          rank: Number(e.rank),
          name: e.name,
          email: e.email,
          quizzesTaken: e.quizzes_taken,
          totalScore: e.total_score,
          averageScore: Number(e.average_score),
        })));
        return;
      }


      const { data: users, error: uErr } = await supabase
        .from('users').select('id, name, email, quizzes_taken, total_score')
        .gt('quizzes_taken', 0).order('total_score', { ascending: false }).limit(10);

      if (uErr) throw uErr;

      setLeaderboard((users || []).map((u: any, i: number) => ({
        rank: i + 1, name: u.name, email: u.email,
        quizzesTaken: u.quizzes_taken, totalScore: u.total_score,
        averageScore: u.quizzes_taken > 0 ? Math.round((u.total_score / u.quizzes_taken) * 100) / 100 : 0,
      })));
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const top3 = leaderboard.filter(e => e.rank <= 3);
  const rest = leaderboard.filter(e => e.rank > 3);
  const maxScore = leaderboard[0]?.totalScore || 1;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="text-zinc-400">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">

      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium mb-6">
          <Star className="w-3.5 h-3.5" /> Hall of Fame
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 tracking-tight">
          Leader<span className="text-primary">board</span>
        </h1>
        <p className="text-zinc-400">Top performers ranked by total score</p>
      </div>

      {error && (
        <div className="max-w-md mx-auto bg-red-500/5 border border-red-500/20 rounded-2xl p-5 mb-8">
          <p className="text-red-400 font-medium mb-2">Failed to load leaderboard</p>
          <p className="text-sm text-zinc-400 mb-3">{error}</p>
          <Button size="sm" onClick={fetchLeaderboard} className="bg-primary hover:bg-primary/90">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      )}

      {!error && leaderboard.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Trophy className="w-10 h-10 text-zinc-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No rankings yet</h3>
          <p className="text-zinc-500 mb-6">Be the first to complete a quiz and claim the top spot!</p>
          {user ? (
            <Link to="/quizzes"><Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">Start a Quiz</Button></Link>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/signup"><Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">Create Account</Button></Link>
              <Link to="/login"><Button variant="outline" className="border-zinc-700 hover:bg-white/5 text-zinc-300"><LogIn className="w-4 h-4 mr-2" />Sign In</Button></Link>
            </div>
          )}
        </div>
      )}

      {!error && leaderboard.length > 0 && (
        <>

          {top3.length >= 2 && (
            <div className="mb-10">
              <div className="flex items-end justify-center gap-3 sm:gap-5 mb-0">
                {PODIUM_CONFIG.map(({ pos, height, color, border, icon, label, labelColor }) => {
                  const entry = top3.find(e => e.rank === pos);
                  if (!entry) return <div key={pos} className="w-24 sm:w-32" />;
                  return (
                    <div key={pos} className="flex flex-col items-center gap-3 w-24 sm:w-32">

                      <div className="relative">
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${color} border-2 ${border} flex items-center justify-center text-xl font-black text-white shadow-lg`}>
                          {getInitials(entry.name)}
                        </div>
                        <div className="absolute -top-2 -right-1">{icon}</div>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-white text-sm truncate max-w-full">{entry.name.split(' ')[0]}</p>
                        <p className={`text-xs font-black ${labelColor}`}>{entry.totalScore} pts</p>
                      </div>

                      <div className={`w-full ${height} rounded-t-xl bg-gradient-to-b ${color} border ${border} flex items-center justify-center`}>
                        <span className={`text-2xl font-black ${labelColor}`}>{label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="h-4 bg-gradient-to-b from-zinc-700/50 to-zinc-800 border border-zinc-700/50 border-t-0 rounded-b-xl mx-0" />
            </div>
          )}


          <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl overflow-hidden mb-8">

            <div className="px-5 py-3 border-b border-zinc-700/50 flex items-center gap-4 text-xs text-zinc-500 font-medium">
              <span className="w-8 text-center">Rank</span>
              <span className="flex-grow">Player</span>
              <span className="hidden sm:block w-24 text-right">Quizzes</span>
              <span className="hidden sm:block w-24 text-right">Avg/Quiz</span>
              <span className="w-24 text-right">Total</span>
            </div>

            <div className="divide-y divide-zinc-700/30">
              {leaderboard.map((entry) => {
                const style = RANK_STYLES[entry.rank] || { row: 'border-transparent hover:border-zinc-700/50', num: 'text-zinc-400', bar: 'bg-primary' };
                const isMe = user?.email === entry.email;

                return (
                  <div key={entry.rank}
                    className={`flex items-center gap-4 px-5 py-4 border-l-2 transition-all ${style.row} ${isMe ? 'ring-1 ring-primary/20' : ''}`}>

                    <div className="w-8 text-center">
                      {entry.rank <= 3 ? (
                        entry.rank === 1 ? <Crown className={`w-5 h-5 mx-auto ${style.num}`} /> :
                        entry.rank === 2 ? <Medal className={`w-5 h-5 mx-auto ${style.num}`} /> :
                        <Trophy className={`w-4 h-4 mx-auto ${style.num}`} />
                      ) : (
                        <span className={`text-sm font-bold ${style.num}`}>{entry.rank}</span>
                      )}
                    </div>


                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                          {getInitials(entry.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm truncate">{entry.name}</span>
                            {isMe && <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full font-bold shrink-0">You</span>}
                          </div>

                          <div className="hidden sm:block mt-1.5 w-32 h-1 bg-zinc-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${Math.round((entry.totalScore / maxScore) * 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <span className="hidden sm:block text-xs text-zinc-500 w-24 text-right">{entry.quizzesTaken} quizzes</span>
                    <span className="hidden sm:block text-xs text-zinc-500 w-24 text-right">{entry.averageScore} avg</span>

                    <div className={`text-xl font-black w-24 text-right ${entry.rank <= 3 ? style.num : 'text-primary'}`}>
                      {entry.totalScore}
                      <span className="text-xs font-normal text-zinc-500 ml-1">pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button variant="ghost" size="sm" onClick={fetchLeaderboard} className="text-zinc-500 hover:text-zinc-200">
              <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
            </Button>

            {!user && (
              <div className="flex-grow bg-primary/5 border border-primary/20 rounded-xl px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-300">Want to compete? <span className="text-primary font-medium">Create an account.</span></p>
                <div className="flex gap-2">
                  <Link to="/signup"><Button size="sm" className="bg-primary hover:bg-primary/90 font-semibold">Sign Up</Button></Link>
                  <Link to="/login"><Button size="sm" variant="outline" className="border-zinc-700 hover:bg-white/5 text-zinc-300">Login</Button></Link>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
