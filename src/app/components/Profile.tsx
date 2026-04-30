import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { User, Mail, Calendar, Trophy, Target, Award, Edit2, Check, X, RefreshCw, BookOpen, BarChart2, LogOut } from 'lucide-react';
import { useAuth } from './AuthContext';
import { getSupabaseClient } from '../lib/supabase-client';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  created_at: string;
  quizzes_taken: number;
  total_score: number;
}

const supabase = getSupabaseClient();

function StatRing({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#3f3f46" strokeWidth="6" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white">{value}</span>
        </div>
      </div>
      <span className="text-xs text-zinc-500 text-center">{label}</span>
    </div>
  );
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [updating, setUpdating] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchErr } = await supabase.from('users').select('*').eq('id', user.id).single();

      if (fetchErr?.code === 'PGRST116') {
        // Profile doesn't exist — create it
        const newProfile = {
          id: user.id, email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          quizzes_taken: 0, total_score: 0,
        };
        const { data: created, error: cErr } = await supabase.from('users').insert(newProfile).select().single();
        if (cErr) throw cErr;
        setProfile(created); setName(created.name);
      } else if (fetchErr) {
        throw fetchErr;
      } else {
        setProfile(data); setName(data.name);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setUpdating(true);
    try {
      const { data, error: updateErr } = await supabase
        .from('users').update({ name: name.trim() }).eq('id', user.id).select().single();
      if (updateErr) throw updateErr;
      setProfile(data); setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    try { await signOut(); navigate('/'); toast.success('Signed out successfully'); }
    catch (e) { console.error(e); }
  };

  const getInitials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const formatDate = (ts: string) => new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const avgScore = profile && profile.quizzes_taken > 0
    ? Math.round((profile.total_score / profile.quizzes_taken) * 10) / 10 : 0;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="text-zinc-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="max-w-md mx-auto bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
          <p className="text-red-400 font-medium mb-2">Failed to load profile</p>
          <p className="text-sm text-zinc-400 mb-4">{error}</p>
          <Button size="sm" onClick={fetchProfile} className="bg-primary hover:bg-primary/90">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 tracking-tight">
            My <span className="text-primary">Profile</span>
          </h1>
          <p className="text-zinc-400">Manage your account and track your journey</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Profile card */}
        <div className="lg:col-span-1 space-y-4">
          {/* Avatar + Info */}
          <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl p-6">
            {/* Avatar */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-primary/20">
                  {getInitials(profile.name)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-zinc-800 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>

              {!isEditing ? (
                <>
                  <h2 className="text-xl font-bold text-white mb-0.5">{profile.name}</h2>
                  <p className="text-sm text-zinc-500 mb-2 truncate max-w-full">{profile.email}</p>
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">Active Member</Badge>
                </>
              ) : (
                <form onSubmit={handleUpdate} className="w-full">
                  <div className="mb-3">
                    <Label htmlFor="name" className="text-xs text-zinc-500">Display Name</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)}
                      className="mt-1 bg-zinc-700/50 border-zinc-600 text-center font-semibold" required />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="flex-1 bg-primary hover:bg-primary/90" disabled={updating}>
                      {updating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" />Save</>}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="flex-1 text-zinc-400 hover:text-zinc-200"
                      onClick={() => { setIsEditing(false); setName(profile.name); }}>
                      <X className="w-3.5 h-3.5 mr-1" /> Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {!isEditing && (
              <Button variant="outline" size="sm" className="w-full border-zinc-700 hover:bg-white/5 text-zinc-300"
                onClick={() => setIsEditing(true)}>
                <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
              </Button>
            )}
          </div>

          {/* Account Info */}
          <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Account</h3>
            {[
              { icon: User, label: 'Name', value: profile.name },
              { icon: Mail, label: 'Email', value: profile.email },
              { icon: Calendar, label: 'Joined', value: formatDate(profile.created_at) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-zinc-700/50 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">{label}</p>
                  <p className="text-sm text-zinc-200 font-medium truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Sign out */}
          <Button variant="ghost" onClick={handleSignOut}
            className="w-full border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 rounded-xl">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>

        {/* Right: Stats */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats overview */}
          <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-white">Performance Overview</h3>
              <Trophy className="w-5 h-5 text-primary" />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-zinc-700/30 rounded-xl">
                <div className="text-3xl font-black text-primary mb-1">{profile.quizzes_taken}</div>
                <div className="text-xs text-zinc-500">Quizzes Taken</div>
              </div>
              <div className="text-center p-4 bg-zinc-700/30 rounded-xl">
                <div className="text-3xl font-black text-yellow-400 mb-1">{profile.total_score}</div>
                <div className="text-xs text-zinc-500">Total Points</div>
              </div>
              <div className="text-center p-4 bg-zinc-700/30 rounded-xl">
                <div className="text-3xl font-black text-green-400 mb-1">{avgScore}</div>
                <div className="text-xs text-zinc-500">Avg / Quiz</div>
              </div>
            </div>

            {/* Rings */}
            {profile.quizzes_taken > 0 && (
              <div className="border-t border-zinc-700/50 pt-5">
                <p className="text-xs text-zinc-500 mb-4 font-medium uppercase tracking-wider">Progress Rings</p>
                <div className="flex justify-around">
                  <StatRing value={profile.quizzes_taken} max={20} label="Quizzes (max 20)" color="#f97316" />
                  <StatRing value={profile.total_score} max={200} label="Points (max 200)" color="#facc15" />
                  <StatRing value={Math.round(avgScore)} max={10} label="Avg Score (max 10)" color="#4ade80" />
                </div>
              </div>
            )}
          </div>

          {/* Achievements */}
          <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Award className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-white">Achievements</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { icon: '🎯', label: 'First Quiz', desc: 'Complete your first quiz', unlocked: profile.quizzes_taken >= 1 },
                { icon: '🔥', label: 'Streak Starter', desc: 'Take 5 quizzes', unlocked: profile.quizzes_taken >= 5 },
                { icon: '🏆', label: 'Quiz Veteran', desc: 'Take 10 quizzes', unlocked: profile.quizzes_taken >= 10 },
                { icon: '⭐', label: 'Point Collector', desc: 'Earn 50 points', unlocked: profile.total_score >= 50 },
                { icon: '💎', label: 'High Scorer', desc: 'Earn 100 points', unlocked: profile.total_score >= 100 },
                { icon: '👑', label: 'Quiz Master', desc: 'Earn 200 points', unlocked: profile.total_score >= 200 },
              ].map(({ icon, label, desc, unlocked }) => (
                <div key={label}
                  className={`p-4 rounded-xl border transition-all ${
                    unlocked
                      ? 'bg-primary/5 border-primary/20 hover:border-primary/40'
                      : 'bg-zinc-700/20 border-zinc-700/30 opacity-50'
                  }`}>
                  <div className="text-2xl mb-2">{unlocked ? icon : '🔒'}</div>
                  <p className={`text-xs font-bold mb-0.5 ${unlocked ? 'text-white' : 'text-zinc-500'}`}>{label}</p>
                  <p className="text-xs text-zinc-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link to="/quizzes">
              <Button variant="outline" className="w-full border-zinc-700 hover:bg-white/5 text-zinc-300 h-11">
                <BookOpen className="w-4 h-4 mr-2" /> Browse Quizzes
              </Button>
            </Link>
            <Link to="/results">
              <Button variant="outline" className="w-full border-zinc-700 hover:bg-white/5 text-zinc-300 h-11">
                <BarChart2 className="w-4 h-4 mr-2" /> View Results
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
