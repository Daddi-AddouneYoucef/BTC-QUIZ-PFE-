import { Link } from 'react-router';
import { Button } from './ui/button';
import { Trophy, BookOpen, Award, Users, ArrowRight, Brain, BarChart2, Zap, CheckCircle, Code, Globe, Layers } from 'lucide-react';
import { useAuth } from './AuthContext';

const FEATURES = [
  { icon: BookOpen, title: 'Diverse Topics', description: 'JavaScript, Web Development, React, and more — new categories added regularly.', color: 'from-blue-500/20 to-blue-600/10', iconColor: 'text-blue-400', border: 'border-blue-500/20' },
  { icon: Brain, title: 'AI Feedback', description: 'Get personalized explanations powered by Gemini AI after every quiz attempt.', color: 'from-primary/20 to-primary/5', iconColor: 'text-primary', border: 'border-primary/20' },
  { icon: BarChart2, title: 'Progress Tracking', description: 'Visualize your improvement with detailed charts and performance history.', color: 'from-green-500/20 to-green-600/10', iconColor: 'text-green-400', border: 'border-green-500/20' },
  { icon: Trophy, title: 'Leaderboard', description: 'Compete globally and see where you rank among all quiz takers.', color: 'from-yellow-500/20 to-yellow-600/10', iconColor: 'text-yellow-400', border: 'border-yellow-500/20' },
  { icon: Award, title: 'Difficulty Levels', description: 'From Beginner to Advanced — always find the right challenge for your level.', color: 'from-purple-500/20 to-purple-600/10', iconColor: 'text-purple-400', border: 'border-purple-500/20' },
  { icon: Zap, title: 'Instant Results', description: 'See your score, review answers, and get AI feedback right after submitting.', color: 'from-orange-500/20 to-orange-600/10', iconColor: 'text-orange-400', border: 'border-orange-500/20' },
];

const CATEGORIES = [
  { icon: Code, label: 'JavaScript', description: 'Core JS concepts & ES6+', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  { icon: Globe, label: 'Web Development', description: 'HTML, CSS, HTTP & more', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { icon: Layers, label: 'React', description: 'Hooks, state, components', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
];

const STEPS = [
  { number: '01', title: 'Create an account', description: 'Sign up in seconds — no credit card required.' },
  { number: '02', title: 'Pick a quiz', description: 'Browse categories, filter by difficulty, start quizzing.' },
  { number: '03', title: 'Get AI feedback', description: 'Review results and get personalized explanations for mistakes.' },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] overflow-hidden">


      <section className="relative py-28 sm:py-36 overflow-hidden">

        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800" />

        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />


        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
            <Zap className="w-3.5 h-3.5" />
            AI-Powered Quiz Platform
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-6 tracking-tight leading-[1.05]">
            Master any topic,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-400 to-amber-400">
              one quiz at a time
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Test your knowledge across JavaScript, React, Web Development and more.
            Get instant AI feedback on your mistakes and climb the leaderboard.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {user ? (
              <>
                <Link to="/quizzes">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/30 font-bold px-8 h-12 text-base">
                    Browse Quizzes <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/leaderboard">
                  <Button size="lg" variant="outline" className="border-zinc-700 hover:bg-white/5 text-zinc-300 h-12 px-8 text-base">
                    Leaderboard <Trophy className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/signup">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/30 font-bold px-8 h-12 text-base">
                    Start for Free <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/quizzes">
                  <Button size="lg" variant="outline" className="border-zinc-700 hover:bg-white/5 text-zinc-300 h-12 px-8 text-base">
                    <BookOpen className="w-5 h-5 mr-2" /> Browse Quizzes
                  </Button>
                </Link>
              </>
            )}
          </div>


          <div className="mt-12 flex flex-wrap justify-center items-center gap-6 text-sm text-zinc-500">
            {['No credit card required', 'Free to use', 'AI-powered feedback'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />{t}
              </span>
            ))}
          </div>
        </div>
      </section>


      <div className="border-y border-zinc-800 bg-zinc-900/80">
        <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-3 divide-x divide-zinc-800">
          {[
            { value: '3+', label: 'Categories' },
            { value: '15+', label: 'Questions' },
            { value: 'AI', label: 'Feedback Engine' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center px-6">
              <div className="text-3xl font-black text-primary mb-1">{value}</div>
              <div className="text-sm text-zinc-500">{label}</div>
            </div>
          ))}
        </div>
      </div>


      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Quiz Topics</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Browse by Category</h2>
          <p className="text-zinc-400 max-w-lg mx-auto">Pick a subject you want to master and get started instantly.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5 mb-8">
          {CATEGORIES.map(({ icon: Icon, label, description, color }) => (
            <Link key={label} to="/quizzes"
              className="group relative p-6 rounded-2xl border bg-card hover:border-primary/40 hover:bg-card/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
              <div className={`inline-flex p-3 rounded-xl border mb-4 ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-primary transition-colors">{label}</h3>
              <p className="text-sm text-zinc-500">{description}</p>
              <ArrowRight className="absolute bottom-5 right-5 w-4 h-4 text-zinc-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link to="/quizzes">
            <Button variant="outline" className="border-zinc-700 hover:bg-white/5 text-zinc-300">
              View all quizzes <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>


      <section className="py-20 bg-zinc-900/50 border-y border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Simple Process</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">How it works</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 relative">

            <div className="hidden sm:block absolute top-8 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

            {STEPS.map(({ number, title, description }) => (
              <div key={number} className="text-center relative">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
                  <span className="text-2xl font-black text-primary">{number}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Everything you need</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Why QuizMaster?</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            A complete learning platform designed to help you improve through practice and intelligent feedback.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, description, color, iconColor, border }) => (
            <div key={title}
              className={`group p-6 rounded-2xl border bg-gradient-to-br ${color} ${border} hover:border-opacity-60 transition-all hover:-translate-y-0.5 hover:shadow-lg`}>
              <div className={`w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>


      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-orange-500/5 to-amber-500/10" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          {user ? (
            <>
              <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to continue?</h2>
              <p className="text-zinc-400 mb-8 text-lg">Pick up where you left off or try a new quiz to sharpen your skills.</p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/quizzes">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-xl shadow-primary/30 font-bold px-8">
                    <BookOpen className="w-5 h-5 mr-2" /> Browse Quizzes
                  </Button>
                </Link>
                <Link to="/results">
                  <Button size="lg" variant="outline" className="border-zinc-700 hover:bg-white/5 text-zinc-300 px-8">
                    <BarChart2 className="w-5 h-5 mr-2" /> My Results
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to test your knowledge?
              </h2>
              <p className="text-zinc-400 mb-8 text-lg">
                Join now and start taking quizzes — completely free.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/signup">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-xl shadow-primary/30 font-bold px-10">
                    Create Free Account <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/quizzes">
                  <Button size="lg" variant="outline" className="border-zinc-700 hover:bg-white/5 text-zinc-300 px-8">
                    <BookOpen className="w-5 h-5 mr-2" /> View Quizzes
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>


      <footer className="border-t border-zinc-800 bg-zinc-900/80 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-zinc-300">Quiz<span className="text-primary">Master</span></span>
          </div>
          <p className="text-xs text-zinc-600">Built with React, Supabase & Gemini AI</p>
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <Link to="/quizzes" className="hover:text-zinc-400 transition-colors">Quizzes</Link>
            <Link to="/leaderboard" className="hover:text-zinc-400 transition-colors">Leaderboard</Link>
            <Link to="/signup" className="hover:text-zinc-400 transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
