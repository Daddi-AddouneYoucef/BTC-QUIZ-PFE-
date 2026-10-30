import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from './AuthContext';
import { Eye, EyeOff, UserPlus, Check, X, Zap, Trophy, Brain, BarChart2, Mail } from 'lucide-react';

const PERKS = [
  { icon: Trophy, text: 'Compete on the global leaderboard' },
  { icon: Brain, text: 'Get AI-powered feedback on mistakes' },
  { icon: BarChart2, text: 'Track your performance over time' },
];

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const passwordOk = password.length >= 6;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const result = await signUp(email, password, name);
      if (result.needsConfirmation) setNeedsConfirmation(true);
      else navigate('/quizzes');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };


  if (needsConfirmation) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12 bg-zinc-900">
        <div className="w-full max-w-sm text-center">
          <div className="w-18 h-18 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 p-4">
            <Mail className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Check your inbox</h1>
          <p className="text-zinc-400 mb-1 text-sm">
            We sent a confirmation link to
          </p>
          <p className="font-semibold text-white mb-8 text-sm">{email}</p>
          <p className="text-xs text-zinc-600 mb-8">
            Click the link to activate your account, then sign in.<br />
            To skip confirmation, disable <span className="text-zinc-400">Email Confirmations</span> in<br />
            Supabase → Authentication → Providers → Email.
          </p>
          <Link to="/login">
            <Button className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold h-12 rounded-xl">
              Go to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">

      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-primary/20 via-zinc-900 to-zinc-900 border-r border-zinc-800 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">Quiz<span className="text-primary">Master</span></span>
          </Link>
        </div>

        <div className="relative space-y-6">
          <div>
            <h2 className="text-3xl font-black text-white mb-3">Join for free!</h2>
            <p className="text-zinc-400">Start your learning journey today with full access to all quizzes.</p>
          </div>
          <div className="space-y-4">
            {PERKS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-zinc-300">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-zinc-600">© 2026 QuizMaster. Built with React & Supabase.</p>
      </div>


      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-zinc-900">
        <div className="w-full max-w-sm">

          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold">Quiz<span className="text-primary">Master</span></span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-1.5">Create account</h1>
            <p className="text-zinc-400 text-sm">Join thousands of learners today — it's free</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/5 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-zinc-400">Full Name</Label>
              <Input id="name" type="text" placeholder="John Doe" value={name}
                onChange={e => setName(e.target.value)} required autoComplete="name"
                className="h-12 bg-zinc-800/80 border-zinc-700 focus:border-primary rounded-xl text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-zinc-400">Email address</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} required autoComplete="email"
                className="h-12 bg-zinc-800/80 border-zinc-700 focus:border-primary rounded-xl text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-zinc-400">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Min. 6 characters"
                  value={password} onChange={e => setPassword(e.target.value)} required
                  autoComplete="new-password"
                  className="h-12 bg-zinc-800/80 border-zinc-700 focus:border-primary rounded-xl pr-11 text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <p className={`text-xs flex items-center gap-1.5 ${passwordOk ? 'text-green-400' : 'text-zinc-500'}`}>
                  {passwordOk ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  At least 6 characters
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-zinc-400">Confirm Password</Label>
              <div className="relative">
                <Input id="confirm" type={showConfirm ? 'text' : 'password'} placeholder="Repeat your password"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                  autoComplete="new-password"
                  className={`h-12 bg-zinc-800/80 border-zinc-700 focus:border-primary rounded-xl pr-11 text-sm ${
                    passwordsMatch ? 'border-green-500/50' : passwordsMismatch ? 'border-red-500/50' : ''
                  }`} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p className={`text-xs flex items-center gap-1.5 ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                  {passwordsMatch ? <><Check className="w-3 h-3" />Passwords match</> : <><X className="w-3 h-3" />Passwords don't match</>}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold text-base rounded-xl mt-2" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Create Account
                </span>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-zinc-500 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
