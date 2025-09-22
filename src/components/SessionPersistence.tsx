import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { sessionDebugger } from '@/utils/sessionDebugger';

interface SessionPersistenceProps {
  children: React.ReactNode;
}

export function SessionPersistence({ children }: SessionPersistenceProps) {
  const { user, session, loading } = useAuth();
  const [sessionRestored, setSessionRestored] = useState(false);

  useEffect(() => {
    const checkSessionPersistence = async () => {
      if (loading) return;

      sessionDebugger.log('Checking session persistence...', {
        hasUser: !!user,
        hasSession: !!session,
        userEmail: user?.email
      });

      // If we have a user and session, mark as restored
      if (user && session) {
        setSessionRestored(true);
        sessionDebugger.log('Session successfully restored');
        return;
      }

      // If no user but we're not loading, try to restore session
      if (!user && !loading) {
        sessionDebugger.log('No user found, attempting session restoration...');
        
        try {
          // Try to get session again
          const { data: { session: restoredSession }, error } = await supabase.auth.getSession();
          
          if (error) {
            sessionDebugger.error('Error restoring session:', error);
          } else if (restoredSession) {
            sessionDebugger.log('Session restored successfully', {
              userEmail: restoredSession.user?.email
            });
            setSessionRestored(true);
          } else {
            sessionDebugger.log('No session to restore');
            setSessionRestored(true); // Allow app to continue
          }
        } catch (error) {
          sessionDebugger.error('Error during session restoration:', error);
          setSessionRestored(true); // Allow app to continue
        }
      }
    };

    checkSessionPersistence();
  }, [user, session, loading]);

  // Show loading while checking session persistence
  if (!sessionRestored && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Restoring session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
