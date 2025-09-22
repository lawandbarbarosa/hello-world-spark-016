import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const GmailCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    handleGmailCallback();
  }, []);

  const handleGmailCallback = async () => {
    try {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(`Gmail authorization failed: ${error}`);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage('Missing authorization code or state parameter');
        return;
      }

      // Parse the state to get sender email
      let senderEmail: string;
      try {
        const stateData = JSON.parse(decodeURIComponent(state));
        senderEmail = stateData.senderEmail;
      } catch (e) {
        setStatus('error');
        setMessage('Invalid state parameter');
        return;
      }

      // Exchange code for refresh token
      const tokenResponse = await fetch('/api/gmail-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirectUri: `${window.location.origin}/gmail-callback`
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const tokenData = await tokenResponse.json();
      
      // Save the refresh token to the sender account
      const { error: updateError } = await supabase.rpc('enable_gmail_sync', {
        sender_email_param: senderEmail,
        refresh_token_param: tokenData.refresh_token,
        client_id_param: process.env.REACT_APP_GMAIL_CLIENT_ID || '',
        client_secret_param: process.env.REACT_APP_GMAIL_CLIENT_SECRET || ''
      });

      if (updateError) {
        throw updateError;
      }

      setStatus('success');
      setMessage(`Gmail sync has been successfully enabled for ${senderEmail}`);
      
      toast({
        title: "Gmail Sync Enabled",
        description: `Gmail sync is now active for ${senderEmail}`,
      });

    } catch (error: any) {
      console.error('Gmail callback error:', error);
      setStatus('error');
      setMessage(error.message || 'An unexpected error occurred');
      
      toast({
        title: "Gmail Sync Failed",
        description: error.message || 'Failed to enable Gmail sync',
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    window.close();
  };

  const handleGoToSettings = () => {
    navigate('/settings');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Gmail Authorization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Processing Gmail authorization...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle className="w-8 h-8 mx-auto text-green-500" />
              <p className="text-green-600 font-medium">Success!</p>
              <p className="text-sm text-muted-foreground">{message}</p>
              <div className="space-y-2">
                <Button onClick={handleGoToSettings} className="w-full">
                  Go to Settings
                </Button>
                <Button variant="outline" onClick={handleClose} className="w-full">
                  Close Window
                </Button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <XCircle className="w-8 h-8 mx-auto text-red-500" />
              <p className="text-red-600 font-medium">Error</p>
              <p className="text-sm text-muted-foreground">{message}</p>
              <div className="space-y-2">
                <Button onClick={handleGoToSettings} className="w-full">
                  Go to Settings
                </Button>
                <Button variant="outline" onClick={handleClose} className="w-full">
                  Close Window
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GmailCallback;
