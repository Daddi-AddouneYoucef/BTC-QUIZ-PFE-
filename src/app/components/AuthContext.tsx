import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSupabaseClient } from '../lib/supabase-client';

interface User {
  id: string;
  email: string;
  user_metadata: {
    name: string;
  };
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const supabase = getSupabaseClient();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        setAccessToken(data.session.access_token);
        setUser(data.session.user as User);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAccessToken(session.access_token);
        setUser(session.user as User);
      } else {
        setUser(null);
        setAccessToken(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string): Promise<{ needsConfirmation: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) throw error;

    // If session is available immediately (email confirmation disabled), create profile
    if (data.session?.user) {
      try {
        await supabase.from('users').upsert({
          id: data.session.user.id,
          email,
          name,
          quizzes_taken: 0,
          total_score: 0,
        });
      } catch (profileErr) {
        console.error('Profile creation error (non-fatal):', profileErr);
      }
      return { needsConfirmation: false };
    }

    // No session = email confirmation required
    return { needsConfirmation: true };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Ensure profile exists after sign-in
    if (data.session?.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.session.user.id)
        .single();

      if (!profile) {
        try {
          await supabase.from('users').insert({
            id: data.session.user.id,
            email: data.session.user.email || email,
            name: data.session.user.user_metadata?.name || email.split('@')[0],
            quizzes_taken: 0,
            total_score: 0,
          });
        } catch (profileErr) {
          console.error('Profile auto-create error (non-fatal):', profileErr);
        }
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, signIn, signUp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
