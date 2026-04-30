import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { getSupabaseClient } from '../lib/supabase-client';
import { useAuth } from './AuthContext';
import { Shield, Users, BookOpen, Activity, Trash2, Edit, AlertCircle, ChevronLeft, Search, Download, Plus, X, Sparkles, BrainCircuit, Target, Settings, Eye, Server, RefreshCw, AlertTriangle, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const supabase = getSupabaseClient();
const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'quizzes' | 'attempts' | 'add_quiz' | 'settings'>('overview');

  const [stats, setStats] = useState({ users: 0, quizzes: 0, attempts: 0, activeUsers: 0 });
  const [usersList, setUsersList] = useState<any[]>([]);
  const [quizzesList, setQuizzesList] = useState<any[]>([]);
  const [attemptsList, setAttemptsList] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [insights, setInsights] = useState<{ hardestQuiz: any, topUser: any }>({ hardestQuiz: null, topUser: null });
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Feature: User Profile Modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Search & Filter states
  const [searchUser, setSearchUser] = useState('');
  const [searchQuiz, setSearchQuiz] = useState('');
  const [searchAttempt, setSearchAttempt] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // Feature: Quick Filters

  // Add/Edit Quiz states
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [newQuiz, setNewQuiz] = useState({
    title: '', description: '', category: '', difficulty: 'Facile',
    questions: [{ question_text: '', options: ['', '', '', ''], correct_answer: 0 }]
  });
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);

  // Feature: System Health
  const [sysHealth, setSysHealth] = useState({ db: 'checking', api: 'checking' });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    const adminEmails = import.meta.env.VITE_ADMIN_EMAILS || '';
    const emailsList = adminEmails.split(',').map((e: string) => e.trim().toLowerCase());
    if (emailsList.includes(user.email.toLowerCase())) {
      setIsAuthorized(true);
      fetchData();
      checkSystemHealth();
    } else {
      setIsAuthorized(false);
      setLoading(false);
    }
  }, [user]);

  const checkSystemHealth = async () => {
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      setSysHealth(prev => ({ ...prev, db: error ? 'down' : 'up' }));
    } catch { setSysHealth(prev => ({ ...prev, db: 'down' })); }

    if (import.meta.env.VITE_GEMINI_API_KEY) {
      setSysHealth(prev => ({ ...prev, api: 'up' }));
    } else {
      setSysHealth(prev => ({ ...prev, api: 'down' }));
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, qRes, aRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('quizzes').select('id', { count: 'exact', head: true }),
        supabase.from('quiz_attempts').select('id', { count: 'exact', head: true })
      ]);

      const { data: usersData } = await supabase.from('users').select('*').order('total_score', { ascending: false });
      const { data: quizzesData } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false });
      const { data: attemptsData } = await supabase.from('quiz_attempts').select(`*, users(name, email), quizzes(title)`).order('created_at', { ascending: false }).limit(300);

      if (usersData) setUsersList(usersData);
      if (quizzesData) {
        setQuizzesList(quizzesData);
        // Feature: Category Distribution Pie Chart
        const catCounts = quizzesData.reduce((acc, q) => { acc[q.category] = (acc[q.category] || 0) + 1; return acc; }, {} as Record<string, number>);
        setCategoryData(Object.entries(catCounts).map(([name, value]) => ({ name, value })));
      }

      if (attemptsData && usersData) {
        setAttemptsList(attemptsData);

        // Active Users metric (users with attempts)
        const activeIds = new Set(attemptsData.map(a => a.user_id));
        setStats({ users: uRes.count || 0, quizzes: qRes.count || 0, attempts: aRes.count || 0, activeUsers: activeIds.size });

        const countsByDate: Record<string, number> = {};
        attemptsData.forEach(a => {
          const date = new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          countsByDate[date] = (countsByDate[date] || 0) + 1;
        });
        setChartData(Object.entries(countsByDate).map(([date, count]) => ({ date, count })).reverse());

        const quizStats = attemptsData.reduce((acc, curr) => {
          if (!acc[curr.quiz_id]) acc[curr.quiz_id] = { totalScore: 0, maxScore: 0, title: curr.quizzes?.title, attempts: 0 };
          acc[curr.quiz_id].totalScore += curr.score;
          acc[curr.quiz_id].maxScore += curr.total_questions;
          acc[curr.quiz_id].attempts += 1;
          return acc;
        }, {} as Record<string, any>);

        let hardest = null; let lowestAvg = 100;
        Object.values(quizStats).forEach((q: any) => {
          const avg = (q.totalScore / q.maxScore) * 100;
          if (avg < lowestAvg && q.attempts >= 2) { lowestAvg = avg; hardest = { title: q.title, avg: Math.round(avg) }; }
        });
        setInsights({ hardestQuiz: hardest, topUser: usersData[0] || null });
      }
    } catch (error) { toast.error('Failed to load admin data'); } finally { setLoading(false); }
  };

  // Feature: Danger Zone Actions
  const resetLeaderboard = async () => {
    if (!confirm('DANGER: This will permanently set all user scores to 0. Are you absolutely sure?')) return;
    const { error } = await supabase.from('users').update({ total_score: 0, quizzes_taken: 0 }).neq('id', '0'); // update all
    if (error) toast.error('Failed to reset leaderboard'); else { toast.success('Leaderboard reset to zero.'); fetchData(); }
  };

  const clearAllAttempts = async () => {
    if (!confirm('DANGER: This will permanently delete ALL quiz attempt history across the entire platform. Proceed?')) return;
    const { error } = await supabase.from('quiz_attempts').delete().neq('id', '0');
    if (error) toast.error('Failed to clear attempts'); else { toast.success('All attempts deleted.'); fetchData(); }
  };

  const deleteQuiz = async (id: string) => {
    if (!confirm('Delete this quiz and all its questions?')) return;
    await supabase.from('quizzes').delete().eq('id', id);
    toast.success('Quiz deleted'); fetchData();
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    await supabase.from('users').delete().eq('id', id);
    toast.success('User deleted'); fetchData();
  };

  // Feature: Export functions
  const exportCSV = (type: 'attempts' | 'users' | 'quizzes') => {
    let headers = ""; let rows = ""; let filename = "";
    if (type === 'attempts') {
      headers = "User Email,Quiz Title,Score,Total Questions,Date\n";
      rows = attemptsList.map(a => `"${a.users?.email || ''}","${a.quizzes?.title || ''}",${a.score},${a.total_questions},"${new Date(a.created_at).toISOString()}"`).join("\n");
      filename = "attempts_export.csv";
    } else if (type === 'users') {
      headers = "ID,Name,Email,Total Score,Quizzes Taken\n";
      rows = usersList.map(u => `"${u.id}","${u.name || ''}","${u.email}",${u.total_score},${u.quizzes_taken}`).join("\n");
      filename = "users_export.csv";
    } else if (type === 'quizzes') {
      headers = "ID,Title,Category,Difficulty\n";
      rows = quizzesList.map(q => `"${q.id}","${q.title}","${q.category}","${q.difficulty}"`).join("\n");
      filename = "quizzes_export.csv";
    }
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  };

  // Feature: Edit Quiz Flow
  const startEditingQuiz = async (quiz: any) => {
    setLoading(true);
    const { data: questions } = await supabase.from('questions').select('*').eq('quiz_id', quiz.id).order('order_index', { ascending: true });
    setNewQuiz({
      title: quiz.title, description: quiz.description || '', category: quiz.category, difficulty: quiz.difficulty,
      questions: questions?.length ? questions : [{ question_text: '', options: ['', '', '', ''], correct_answer: 0 }]
    });
    setEditingQuizId(quiz.id);
    setActiveTab('add_quiz');
    setLoading(false);
  };

  const generateQuizWithAI = async () => {
    if (!aiPrompt) return toast.error("Please enter a topic for the AI.");
    setGeneratingAI(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API Key missing in environment.");
      const promptText = `Generate a high-quality educational quiz about: "${aiPrompt}". Return ONLY valid JSON structured exactly like this: { "title": "...", "description": "...", "category": "...", "difficulty": "Moyen", "questions": [ { "question_text": "...", "options": ["...", "...", "...", "..."], "correct_answer": 0 } ] }. Generate exactly 5 questions. No markdown blocks.`;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: promptText }] }], generationConfig: { responseMimeType: 'application/json' } })
      });
      if (!res.ok) throw new Error("API request failed");
      const data = await res.json();
      let parsed;
      try {
        const text = data.candidates[0].content.parts[0].text;
        parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
      } catch (e) { throw new Error("AI returned malformed JSON"); }

      setNewQuiz({ title: parsed.title || '', description: parsed.description || '', category: parsed.category || '', difficulty: parsed.difficulty || 'Moyen', questions: parsed.questions || [] });
      toast.success("AI generated the quiz! Review and save.");
      setAiPrompt('');
    } catch (e: any) { toast.error(e.message || "AI Generation failed."); } finally { setGeneratingAI(false); }
  };

  const saveNewQuiz = async () => {
    if (!newQuiz.title || !newQuiz.category) return toast.error('Title and Category are required');
    setSavingQuiz(true);
    try {
      let quizId = editingQuizId;

      if (editingQuizId) {
        // Update existing quiz
        await supabase.from('quizzes').update({ title: newQuiz.title, description: newQuiz.description, category: newQuiz.category, difficulty: newQuiz.difficulty }).eq('id', editingQuizId);
        // Wipe old questions and insert new ones
        await supabase.from('questions').delete().eq('quiz_id', editingQuizId);
      } else {
        // Insert new quiz
        const { data: qData, error: qErr } = await supabase.from('quizzes').insert({ title: newQuiz.title, description: newQuiz.description, category: newQuiz.category, difficulty: newQuiz.difficulty }).select().single();
        if (qErr) throw qErr;
        quizId = qData.id;
      }

      const questionsToInsert = newQuiz.questions.map((q, i) => ({
        quiz_id: quizId, question_text: q.question_text, options: q.options, correct_answer: q.correct_answer, order_index: i
      }));
      const { error: qsErr } = await supabase.from('questions').insert(questionsToInsert);
      if (qsErr) throw qsErr;

      toast.success(editingQuizId ? 'Quiz updated successfully!' : 'Quiz created successfully!');
      setNewQuiz({ title: '', description: '', category: '', difficulty: 'Facile', questions: [{ question_text: '', options: ['', '', '', ''], correct_answer: 0 }] });
      setEditingQuizId(null);
      setActiveTab('quizzes'); fetchData();
    } catch (err: any) { toast.error(err.message || 'Failed to save quiz'); } finally { setSavingQuiz(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  if (isAuthorized === false) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6"><AlertCircle className="w-10 h-10 text-red-500" /></div>
        <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
        <p className="text-zinc-400 mb-8 max-w-md mx-auto">You do not have permission to view the admin panel. Your email (<span className="text-white font-medium">{user?.email}</span>) must be explicitly authorized.</p>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-left max-w-lg mx-auto mb-8"><code className="block bg-black/50 p-3 rounded text-xs text-green-400 font-mono border border-zinc-800">VITE_ADMIN_EMAILS={user?.email}</code></div>
        <Link to="/"><Button variant="outline" className="border-zinc-700 hover:bg-white/5"><ChevronLeft className="w-4 h-4 mr-2" /> Return to Home</Button></Link>
      </div>
    );
  }

  // Filters
  const filteredUsers = usersList.filter(u => (u.name || '').toLowerCase().includes(searchUser.toLowerCase()) || (u.email || '').toLowerCase().includes(searchUser.toLowerCase()));
  const filteredQuizzes = quizzesList.filter(q => (q.title || '').toLowerCase().includes(searchQuiz.toLowerCase()) && (!selectedCategory || q.category === selectedCategory));
  const filteredAttempts = attemptsList.filter(a => (a.users?.name || '').toLowerCase().includes(searchAttempt.toLowerCase()) || (a.quizzes?.title || '').toLowerCase().includes(searchAttempt.toLowerCase()));
  const uniqueCategories = Array.from(new Set(quizzesList.map(q => q.category)));

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center text-red-500 shadow-lg shadow-red-500/20"><Shield className="w-6 h-6" /></div>
        <div><h1 className="text-3xl font-bold text-white tracking-tight">Admin Control Panel</h1><p className="text-zinc-400 text-sm">Manage users, quizzes, and view platform statistics</p></div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-2 shrink-0">
          {[{ id: 'overview', label: 'Overview', icon: Activity }, { id: 'users', label: 'Users', icon: Users }, { id: 'quizzes', label: 'Quizzes', icon: BookOpen }, { id: 'attempts', label: 'Recent Attempts', icon: Shield }, { id: 'settings', label: 'Settings', icon: Settings }].map((tab) => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); if (tab.id !== 'add_quiz') setEditingQuizId(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === tab.id ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-transparent'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
          <div className="h-px bg-zinc-800 my-4" />
          <button onClick={() => { setNewQuiz({ title: '', description: '', category: '', difficulty: 'Facile', questions: [{ question_text: '', options: ['', '', '', ''], correct_answer: 0 }] }); setEditingQuizId(null); setActiveTab('add_quiz'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'add_quiz' && !editingQuizId ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-transparent'}`}>
            <Plus className="w-4 h-4" />Create New Quiz
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 overflow-hidden min-h-[600px]">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-xl font-semibold text-white mb-4">Platform Overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl"><div className="flex items-center gap-3 text-blue-400 mb-2"><Users className="w-5 h-5" /><span className="font-medium">Total Users</span></div><p className="text-4xl font-bold text-white">{stats.users}</p></div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl"><div className="flex items-center gap-3 text-emerald-400 mb-2"><Activity className="w-5 h-5" /><span className="font-medium">Active Users</span></div><p className="text-4xl font-bold text-white">{stats.activeUsers}</p></div>
                <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl"><div className="flex items-center gap-3 text-green-400 mb-2"><BookOpen className="w-5 h-5" /><span className="font-medium">Total Quizzes</span></div><p className="text-4xl font-bold text-white">{stats.quizzes}</p></div>
                <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-2xl"><div className="flex items-center gap-3 text-orange-400 mb-2"><Target className="w-5 h-5" /><span className="font-medium">Total Attempts</span></div><p className="text-4xl font-bold text-white">{stats.attempts}</p></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6">
                  <h3 className="text-lg font-medium text-white mb-6">Recent Activity (Attempts per Day)</h3>
                  <div className="h-64 w-full">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} /><XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} /><YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} /><Tooltip cursor={{ fill: '#27272a' }} contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5', borderRadius: '8px' }} /><Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Attempts" /></BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-zinc-500 text-center pt-24">No attempt data yet.</p>}
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6">
                  <h3 className="text-lg font-medium text-white mb-6">Quiz Categories</h3>
                  <div className="h-64 w-full flex items-center justify-center">
                    {categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={categoryData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5', borderRadius: '8px' }} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <p className="text-zinc-500">No categories yet.</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center"><Target className="w-6 h-6 text-red-400" /></div>
                  <div><p className="text-sm text-zinc-400 mb-1">Hardest Quiz</p>
                    {insights.hardestQuiz ? <div><p className="text-lg font-bold text-white">{insights.hardestQuiz.title}</p><p className="text-xs text-red-400">Average Score: {insights.hardestQuiz.avg}%</p></div> : <p className="text-sm text-zinc-500">Not enough data</p>}</div>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center"><BrainCircuit className="w-6 h-6 text-yellow-400" /></div>
                  <div><p className="text-sm text-zinc-400 mb-1">Top Performer</p>
                    {insights.topUser ? <div><p className="text-lg font-bold text-white">{insights.topUser.name || insights.topUser.email}</p><p className="text-xs text-yellow-400">{insights.topUser.total_score} Total Points</p></div> : <p className="text-sm text-zinc-500">Not enough data</p>}</div>
                </div>
              </div>
            </div>
          )}

          {/* USERS */}
          {activeTab === 'users' && (
            <div className="flex flex-col h-full animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h2 className="text-xl font-semibold text-white">Manage Users</h2>
                <div className="flex gap-2">
                  <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" /><input type="text" placeholder="Search users..." value={searchUser} onChange={(e) => setSearchUser(e.target.value)} className="w-full sm:w-64 bg-zinc-800/50 border border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary" /></div>
                  <Button variant="outline" onClick={() => exportCSV('users')} className="border-zinc-700 hover:bg-white/5 whitespace-nowrap"><Download className="w-4 h-4 mr-2" /> Export</Button>
                </div>
              </div>
              <div className="overflow-auto max-h-[600px] border border-zinc-800 rounded-xl relative">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-zinc-400 bg-zinc-800/80 uppercase sticky top-0 backdrop-blur-sm z-10">
                    <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Quizzes</th><th className="px-4 py-3">Score</th><th className="px-4 py-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-4 py-3 font-medium text-zinc-200">{u.name || 'N/A'}</td><td className="px-4 py-3 text-zinc-400">{u.email}</td><td className="px-4 py-3 text-zinc-400">{u.quizzes_taken}</td><td className="px-4 py-3 text-primary font-mono">{u.total_score} pts</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedUser(u)} className="text-blue-400 hover:bg-blue-400/10 hover:text-blue-300"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteUser(u.id)} className="text-red-400 hover:bg-red-400/10 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">No users found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* QUIZZES */}
          {activeTab === 'quizzes' && (
            <div className="flex flex-col h-full animate-in fade-in duration-300">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
                <h2 className="text-xl font-semibold text-white">Manage Quizzes</h2>
                <div className="flex flex-wrap gap-2">
                  <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" /><input type="text" placeholder="Search quizzes..." value={searchQuiz} onChange={(e) => setSearchQuiz(e.target.value)} className="w-full sm:w-48 bg-zinc-800/50 border border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary" /></div>

                  {/* Category Quick Filters */}
                  <div className="relative">
                    <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <select value={selectedCategory || ''} onChange={(e) => setSelectedCategory(e.target.value || null)} className="w-full sm:w-36 bg-zinc-800/50 border border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none appearance-none">
                      <option value="">All Categories</option>
                      {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <Button variant="outline" onClick={() => exportCSV('quizzes')} className="border-zinc-700 hover:bg-white/5"><Download className="w-4 h-4" /></Button>
                  <Button onClick={() => { setNewQuiz({ title: '', description: '', category: '', difficulty: 'Facile', questions: [{ question_text: '', options: ['', '', '', ''], correct_answer: 0 }] }); setEditingQuizId(null); setActiveTab('add_quiz'); }} className="bg-primary hover:bg-primary/90 text-white shadow-lg"><Plus className="w-4 h-4 mr-1" /> New</Button>
                </div>
              </div>
              <div className="overflow-auto max-h-[600px] border border-zinc-800 rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-zinc-400 bg-zinc-800/80 uppercase sticky top-0 backdrop-blur-sm z-10">
                    <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Difficulty</th><th className="px-4 py-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {filteredQuizzes.map((q) => (
                      <tr key={q.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-4 py-3 font-medium text-zinc-200">{q.title}</td><td className="px-4 py-3"><span className="px-2 py-1 rounded bg-zinc-800 text-xs text-zinc-300 border border-zinc-700">{q.category}</span></td><td className="px-4 py-3 text-zinc-400">{q.difficulty}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => startEditingQuiz(q)} className="text-blue-400 hover:bg-blue-400/10 hover:text-blue-300"><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteQuiz(q.id)} className="text-red-400 hover:bg-red-400/10 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
                        </td>
                      </tr>
                    ))}
                    {filteredQuizzes.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500">No quizzes found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ATTEMPTS */}
          {activeTab === 'attempts' && (
            <div className="flex flex-col h-full animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h2 className="text-xl font-semibold text-white">Recent Attempts</h2>
                <div className="flex gap-2">
                  <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" /><input type="text" placeholder="Search user or quiz..." value={searchAttempt} onChange={(e) => setSearchAttempt(e.target.value)} className="w-full sm:w-64 bg-zinc-800/50 border border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary" /></div>
                  <Button variant="outline" onClick={() => exportCSV('attempts')} className="border-zinc-700 hover:bg-white/5"><Download className="w-4 h-4 mr-2" /> Export</Button>
                </div>
              </div>
              <div className="overflow-auto max-h-[600px] border border-zinc-800 rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-zinc-400 bg-zinc-800/80 uppercase sticky top-0 backdrop-blur-sm z-10">
                    <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Quiz</th><th className="px-4 py-3">Score</th><th className="px-4 py-3 text-right">Date</th></tr>
                  </thead>
                  <tbody>
                    {filteredAttempts.map((a) => (
                      <tr key={a.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-4 py-3 font-medium text-zinc-200">{a.users?.name || a.users?.email}</td><td className="px-4 py-3 text-zinc-400">{a.quizzes?.title}</td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${(a.score / a.total_questions) >= 0.5 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{a.score} / {a.total_questions}</span></td>
                        <td className="px-4 py-3 text-right text-zinc-500">{new Date(a.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                    {filteredAttempts.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500">No recent attempts.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ADD/EDIT QUIZ */}
          {activeTab === 'add_quiz' && (
            <div className="max-w-3xl mx-auto pb-12 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">{editingQuizId ? 'Edit Quiz' : 'Create New Quiz'}</h2>
                <Button variant="outline" size="sm" onClick={() => { setActiveTab('quizzes'); setEditingQuizId(null); }} className="border-zinc-700"><ChevronLeft className="w-4 h-4 mr-1" /> Cancel</Button>
              </div>

              {!editingQuizId && (
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 p-6 rounded-2xl mb-8 relative overflow-hidden shadow-inner">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><BrainCircuit className="w-24 h-24" /></div>
                  <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400"><Sparkles className="w-5 h-5" /></div>
                    <div><h3 className="text-white font-medium">AI Magic Generator</h3><p className="text-xs text-purple-300">Generate a full 5-question quiz instantly with Gemini AI.</p></div>
                  </div>
                  <div className="flex gap-3 relative z-10">
                    <input type="text" className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-purple-500 rounded-lg px-3 py-2 text-white" placeholder="e.g. History of Rome, Advanced Python, Space Exploration..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && generateQuizWithAI()} />
                    <Button onClick={generateQuizWithAI} disabled={generatingAI} className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 whitespace-nowrap">
                      {generatingAI ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />} Auto-Generate
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-6 bg-zinc-800/30 p-6 rounded-2xl border border-zinc-700/50 shadow-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="block text-xs font-medium text-zinc-400 mb-1">Quiz Title</label><input type="text" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary" value={newQuiz.title} onChange={e => setNewQuiz({ ...newQuiz, title: e.target.value })} /></div>
                  <div className="col-span-2"><label className="block text-xs font-medium text-zinc-400 mb-1">Description</label><textarea className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white h-20 focus:border-primary" value={newQuiz.description} onChange={e => setNewQuiz({ ...newQuiz, description: e.target.value })} /></div>
                  <div><label className="block text-xs font-medium text-zinc-400 mb-1">Category</label><input type="text" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary" value={newQuiz.category} onChange={e => setNewQuiz({ ...newQuiz, category: e.target.value })} /></div>
                  <div><label className="block text-xs font-medium text-zinc-400 mb-1">Difficulty</label><select className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary" value={newQuiz.difficulty} onChange={e => setNewQuiz({ ...newQuiz, difficulty: e.target.value })}><option value="Facile">Facile</option><option value="Moyen">Moyen</option><option value="Difficile">Difficile</option></select></div>
                </div>

                <div className="h-px bg-zinc-700 my-6" />
                <h3 className="font-semibold text-white mb-4">Questions ({newQuiz.questions.length})</h3>

                {newQuiz.questions.map((q, qIndex) => (
                  <div key={qIndex} className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 mb-4 relative shadow-sm group">
                    <button onClick={() => { const qs = [...newQuiz.questions]; qs.splice(qIndex, 1); setNewQuiz({ ...newQuiz, questions: qs }); }} className="absolute top-4 right-4 text-zinc-600 hover:text-red-400 transition-colors"><X className="w-4 h-4" /></button>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">Question {qIndex + 1}</label>
                    <input type="text" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white mb-4 focus:border-primary" value={q.question_text} onChange={e => { const qs = [...newQuiz.questions]; qs[qIndex].question_text = e.target.value; setNewQuiz({ ...newQuiz, questions: qs }); }} placeholder="Enter the question..." />
                    <div className="space-y-2">
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-3">
                          <input type="radio" name={`q-${qIndex}-correct`} checked={q.correct_answer === oIndex} onChange={() => { const qs = [...newQuiz.questions]; qs[qIndex].correct_answer = oIndex; setNewQuiz({ ...newQuiz, questions: qs }); }} className="w-4 h-4 text-primary bg-zinc-800 border-zinc-700 focus:ring-primary cursor-pointer" />
                          <input type="text" className={`flex-1 bg-zinc-800 border rounded-lg px-3 py-2 text-sm focus:border-primary ${q.correct_answer === oIndex ? 'border-primary/50 text-white bg-primary/5' : 'border-zinc-700 text-zinc-300'}`} value={opt} onChange={e => { const qs = [...newQuiz.questions]; qs[qIndex].options[oIndex] = e.target.value; setNewQuiz({ ...newQuiz, questions: qs }); }} placeholder={`Option ${oIndex + 1}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <Button variant="outline" className="w-full border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 py-6" onClick={() => setNewQuiz({ ...newQuiz, questions: [...newQuiz.questions, { question_text: '', options: ['', '', '', ''], correct_answer: 0 }] })}><Plus className="w-4 h-4 mr-2" /> Add Another Question</Button>
                <div className="pt-6"><Button onClick={saveNewQuiz} disabled={savingQuiz} className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 text-lg shadow-lg shadow-primary/20">{savingQuiz ? 'Saving...' : (editingQuizId ? 'Update Quiz' : 'Save & Publish Quiz')}</Button></div>
              </div>
            </div>
          )}

          {/* SETTINGS (Danger Zone & Health) */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold text-white mb-6">System Settings</h2>

              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-medium text-white flex items-center gap-2"><Server className="w-5 h-5 text-blue-400" /> System Health</h3><Button variant="ghost" size="sm" onClick={checkSystemHealth}><RefreshCw className="w-4 h-4 text-zinc-400" /></Button></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4 flex items-center justify-between">
                    <div><p className="text-sm text-zinc-400 mb-1">Database (Supabase)</p><div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${sysHealth.db === 'up' ? 'bg-green-500' : sysHealth.db === 'down' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
                      <span className="text-white font-medium capitalize">{sysHealth.db}</span>
                    </div></div>
                  </div>
                  <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4 flex items-center justify-between">
                    <div><p className="text-sm text-zinc-400 mb-1">AI Service (Gemini)</p><div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${sysHealth.api === 'up' ? 'bg-green-500' : sysHealth.api === 'down' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
                      <span className="text-white font-medium capitalize">{sysHealth.api}</span>
                    </div></div>
                  </div>
                </div>
              </div>

              <div className="border border-red-500/20 bg-red-500/5 rounded-2xl p-6">
                <h3 className="text-lg font-medium text-red-400 flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5" /> Danger Zone</h3>
                <p className="text-sm text-zinc-400 mb-6">Destructive actions that cannot be undone. Proceed with extreme caution.</p>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-black/20 border border-red-500/10 rounded-xl gap-4">
                    <div><p className="text-white font-medium">Reset Leaderboards</p><p className="text-xs text-zinc-500">Sets all user scores and "quizzes taken" counts back to zero.</p></div>
                    <Button onClick={resetLeaderboard} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 whitespace-nowrap">Reset Scores</Button>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-black/20 border border-red-500/10 rounded-xl gap-4">
                    <div><p className="text-white font-medium">Clear All Attempts</p><p className="text-xs text-zinc-500">Deletes the entire quiz attempt history log permanently.</p></div>
                    <Button onClick={clearAllAttempts} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 whitespace-nowrap">Delete Attempts</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feature: User Profile Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shadow-md">
                  {(selectedUser.name || selectedUser.email).charAt(0).toUpperCase()}
                </div>
                <div><h3 className="text-lg font-bold text-white">{selectedUser.name || 'Anonymous User'}</h3><p className="text-xs text-zinc-400">{selectedUser.email}</p></div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-800/50 rounded-xl p-4 text-center border border-zinc-700/50"><p className="text-sm text-zinc-400 mb-1">Total Score</p><p className="text-3xl font-mono font-bold text-primary">{selectedUser.total_score}</p></div>
                <div className="bg-zinc-800/50 rounded-xl p-4 text-center border border-zinc-700/50"><p className="text-sm text-zinc-400 mb-1">Quizzes Taken</p><p className="text-3xl font-mono font-bold text-white">{selectedUser.quizzes_taken}</p></div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Recent Activity</h4>
                <div className="space-y-2 max-h-60 overflow-auto pr-2">
                  {attemptsList.filter(a => a.user_id === selectedUser.id).slice(0, 5).map(a => (
                    <div key={a.id} className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                      <div><p className="text-sm text-white font-medium truncate max-w-[200px]">{a.quizzes?.title}</p><p className="text-xs text-zinc-500">{new Date(a.created_at).toLocaleDateString()}</p></div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${(a.score / a.total_questions) >= 0.5 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{a.score}/{a.total_questions}</span>
                    </div>
                  ))}
                  {attemptsList.filter(a => a.user_id === selectedUser.id).length === 0 && <p className="text-sm text-zinc-500 text-center py-4">No quiz attempts yet.</p>}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 text-right">
              <Button onClick={() => setSelectedUser(null)} variant="outline" className="border-zinc-700 hover:bg-white/5">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
