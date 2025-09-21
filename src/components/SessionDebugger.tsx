import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { sessionDebugger } from '@/utils/sessionDebugger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SessionDebugger: React.FC = () => {
  const { user, session, loading } = useAuth();

  const handleCheckStorage = () => {
    sessionDebugger.checkLocalStorage();
    sessionDebugger.checkSessionStorage();
  };

  const handleClearAuthData = () => {
    sessionDebugger.clearAllAuthData();
    window.location.reload();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Session Debugger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>User:</strong> {user ? user.email : 'None'}
          </div>
          <div>
            <strong>Session:</strong> {session ? 'Active' : 'None'}
          </div>
          <div>
            <strong>Expires:</strong> {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A'}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleCheckStorage} variant="outline">
            Check Storage
          </Button>
          <Button onClick={handleClearAuthData} variant="destructive">
            Clear Auth Data
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>Open browser console to see detailed session logs.</p>
          <p>Use "Check Storage" to see what's stored in localStorage.</p>
          <p>Use "Clear Auth Data" to reset authentication state.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionDebugger;
