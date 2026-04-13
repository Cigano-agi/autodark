import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userName: string;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let initialSessionResolved = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        initialSessionResolved = true;
        if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
          // Clear any stale tokens from localStorage
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('sb-')) localStorage.removeItem(key);
          });
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!initialSessionResolved) {
        // PERSIST EMERGENCY BYPASS
        if (!session && localStorage.getItem('autodark_bypass_auth') === 'true') {
          const email = localStorage.getItem('autodark_bypass_email') || 'Sf.prod.sf3@gmail.com';
          const userId = email === 'brufab222@gmail.com' ? '7c567a5a-1445-4d34-a3bc-f3e4d4738c25' : '2a3563eb-3ef1-4b88-b141-60734c7c651c';
          
          const mockUser = { 
            id: userId, 
            email: email,
            user_metadata: { full_name: 'Master User' }
          } as User;
          setSession({ user: mockUser } as Session);
          setUser(mockUser);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    // TEST LOGIN BYPASS (Requested)
    if (email === 'test@autodark.com' && password === '123456') {
      console.log('[AutoDark] Test login accepted');
      const mockUser = { id: '2a3563eb-3ef1-4b88-b141-60734c7c651c', email, user_metadata: { full_name: 'Conta de Teste' } } as User;
      setUser(mockUser);
      setSession({ user: mockUser } as Session);
      localStorage.setItem('autodark_bypass_auth', 'true');
      localStorage.setItem('autodark_bypass_email', email);
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    // EMERGENCY BYPASS: If email is not confirmed but it's a master user, force local session
    if (error?.message?.includes('Email not confirmed') && (email === 'Sf.prod.sf3@gmail.com' || email === 'brufab222@gmail.com')) {
      console.warn('[AutoDark] Master user bypass: forcing local session for unconfirmed email');
      
      const userId = email === 'brufab222@gmail.com' ? '7c567a5a-1445-4d34-a3bc-f3e4d4738c25' : '2a3563eb-3ef1-4b88-b141-60734c7c651c';
      
      const mockUser = { 
        id: userId, 
        email: email,
        user_metadata: { full_name: 'Master User' }
      } as User;
      
      setUser(mockUser);
      setSession({ user: mockUser } as Session);
      localStorage.setItem('autodark_bypass_auth', 'true');
      localStorage.setItem('autodark_bypass_email', email);
      return { error: null };
    }
    
    return { error: error as Error | null };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('autodark_bypass_auth');
    localStorage.removeItem('autodark_bypass_email');
    setUser(null);
    setSession(null);
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        userName,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
