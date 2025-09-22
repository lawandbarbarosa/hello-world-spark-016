import * as React from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sessionDebugger } from '@/utils/sessionDebugger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    let mounted = true;

    // Enable session debugging
    sessionDebugger.enableDebug();
    sessionDebugger.log('Initializing authentication...');
    sessionDebugger.checkLocalStorage();

    // First, check for existing session
    const initializeAuth = async () => {
      try {
        sessionDebugger.log('Getting existing session...');
        
        // Try to get session with retry logic
        let session = null;
        let error = null;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          const result = await supabase.auth.getSession();
          session = result.data.session;
          error = result.error;
          
          if (!error && session) {
            sessionDebugger.log(`Session retrieved on attempt ${attempt}`);
            break;
          }
          
          if (attempt < 3) {
            sessionDebugger.log(`Session retrieval attempt ${attempt} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 100 * attempt));
          }
        }
        
        if (error) {
          sessionDebugger.error('Error getting session after retries:', error);
        } else {
          sessionDebugger.log('Session retrieved:', {
            hasSession: !!session,
            userEmail: session?.user?.email,
            expiresAt: session?.expires_at,
            isValid: session ? new Date(session.expires_at * 1000) > new Date() : false
          });
        }
        
        // Validate session if it exists
        if (session && new Date(session.expires_at * 1000) <= new Date()) {
          sessionDebugger.log('Session expired, clearing...');
          session = null;
        }
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          sessionDebugger.log('Auth state initialized', {
            hasUser: !!session?.user,
            userEmail: session?.user?.email
          });
        }
      } catch (error) {
        sessionDebugger.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Initialize auth state
    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        sessionDebugger.log('Auth state changed:', {
          event,
          userEmail: session?.user?.email,
          hasSession: !!session,
          isValid: session ? new Date(session.expires_at * 1000) > new Date() : false
        });
        
        // Handle different auth events
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          sessionDebugger.log('User signed in or token refreshed');
          sessionDebugger.checkLocalStorage();
        } else if (event === 'SIGNED_OUT') {
          sessionDebugger.log('User signed out');
          sessionDebugger.clearAllAuthData();
        }
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      sessionDebugger.log('Auth cleanup completed');
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: fullName ? { full_name: fullName } : undefined
      }
    });
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Signup Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Check your email",
        description: "We sent you a confirmation link to complete your signup.",
      });
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    sessionDebugger.log('Starting sign in process...', { email });
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      sessionDebugger.error('Sign in failed:', error);
      toast({
        variant: "destructive",
        title: "Login Error", 
        description: error.message,
      });
    } else {
      sessionDebugger.log('Sign in successful');
      sessionDebugger.checkLocalStorage();
    }
    
    return { error };
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Google Login Error",
        description: error.message,
      });
    }
    
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Logout Error",
        description: error.message,
      });
    }
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}