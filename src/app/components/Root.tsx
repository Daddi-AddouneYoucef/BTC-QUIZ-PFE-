import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { AuthProvider, useAuth } from './AuthContext';
import { Button } from './ui/button';
import { LogOut, User, Trophy, Menu, X, BookOpen, BarChart2, Home, Zap, Shield } from 'lucide-react';
import { Toaster } from 'sonner';

function Navigation() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);


  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    try { await signOut(); navigate('/'); } catch (e) { console.error(e); }
  };

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const initials = (name?: string, email?: string) => {
    const str = name || email || 'U';
    return str.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const navItems = [
    { to: '/quizzes', label: 'Quizzes', icon: BookOpen },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const authNavItems = [
    { to: '/results', label: 'My Results', icon: BarChart2 },
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/admin', label: 'Admin', icon: Shield },
  ];

  return (
    <>
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-zinc-900/80 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/20'
          : 'bg-zinc-900/60 backdrop-blur-md border-b border-white/5'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">

            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-all">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                Quiz<span className="text-primary">Master</span>
              </span>
            </Link>


            <div className="hidden md:flex items-center gap-1">
              {navItems.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(to)
                      ? 'bg-primary/15 text-primary'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                  }`}>
                  <Icon className="w-4 h-4" />{label}
                </Link>
              ))}

              {user && authNavItems.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(to)
                      ? 'bg-primary/15 text-primary'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                  }`}>
                  <Icon className="w-4 h-4" />{label}
                </Link>
              ))}

              <div className="w-px h-5 bg-zinc-700 mx-2" />

              {user ? (
                <div className="flex items-center gap-2">
                  <Link to="/profile"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all group cursor-pointer">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-white shadow-md">
                      {initials(user.user_metadata?.name, user.email)}
                    </div>
                    <span className="text-sm text-zinc-300 max-w-[100px] truncate group-hover:text-white transition-colors">
                      {user.user_metadata?.name || user.email}
                    </span>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}
                    className="text-zinc-500 hover:text-zinc-200 hover:bg-white/5 gap-1.5">
                    <LogOut className="w-3.5 h-3.5" /> Sign out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100 hover:bg-white/5">
                      Sign in
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 font-semibold">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>


            <button
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-all"
              onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>


        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 bg-zinc-900/95 backdrop-blur-xl">
            <div className="px-4 py-3 space-y-1">
              <Link to="/"
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive('/') ? 'bg-primary/15 text-primary' : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                }`}>
                <Home className="w-4 h-4" /> Home
              </Link>
              {navItems.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive(to) ? 'bg-primary/15 text-primary' : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                  }`}>
                  <Icon className="w-4 h-4" />{label}
                </Link>
              ))}

              {user && (
                <>
                  {authNavItems.map(({ to, label, icon: Icon }) => (
                    <Link key={to} to={to}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive(to) ? 'bg-primary/15 text-primary' : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                      }`}>
                      <Icon className="w-4 h-4" />{label}
                    </Link>
                  ))}
                  <div className="pt-3 mt-2 border-t border-white/5">
                    <div className="flex items-center gap-3 px-3 py-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-white">
                        {initials(user.user_metadata?.name, user.email)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200 truncate max-w-[180px]">
                          {user.user_metadata?.name || 'User'}
                        </p>
                        <p className="text-xs text-zinc-500 truncate max-w-[180px]">{user.email}</p>
                      </div>
                    </div>
                    <button onClick={handleSignOut}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </>
              )}

              {!user && (
                <div className="pt-3 mt-2 border-t border-white/5 space-y-2">
                  <Link to="/login">
                    <Button variant="outline" className="w-full border-zinc-700 hover:bg-white/5">Sign In</Button>
                  </Link>
                  <Link to="/signup">
                    <Button className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">Get Started Free</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

export default function Root() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main>
          <Outlet />
        </main>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#27272a',
              border: '1px solid #3f3f46',
              color: '#fafafa',
            },
          }}
        />
      </div>
    </AuthProvider>
  );
}
