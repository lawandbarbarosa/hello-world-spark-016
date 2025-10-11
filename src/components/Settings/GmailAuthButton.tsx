import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { 
  Mail, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ExternalLink,
  Loader2
} from "lucide-react";

interface GmailAuthButtonProps {
  senderEmail: string;
  senderId: string;
  isAuthenticated: boolean;
  onAuthSuccess: () => void;
}

const GmailAuthButton = ({ 
  senderEmail, 
  senderId, 
  isAuthenticated, 
  onAuthSuccess 
}: GmailAuthButtonProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGmailAuth = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to authenticate Gmail accounts",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get the Gmail auth URL
      const redirectUri = `${window.location.origin}/gmail-callback`;
      
      const { data: authData, error: authError } = await supabase.functions.invoke('gmail-auth-url', {
        body: {
          senderEmail,
          redirectUri
        }
      });

      if (authError || !authData?.authUrl) {
        console.error('Error getting Gmail auth URL:', authError);
        toast({
          title: "Gmail Authentication Error",
          description: "Failed to get Gmail authentication URL. Please check your Gmail API configuration.",
          variant: "destructive",
        });
        return;
      }

      // Store the sender ID in session storage for the callback
      sessionStorage.setItem('gmail_auth_sender_id', senderId);
      sessionStorage.setItem('gmail_auth_sender_email', senderEmail);

      // Redirect to Gmail OAuth
      window.location.href = authData.authUrl;

    } catch (error) {
      console.error('Error initiating Gmail authentication:', error);
      toast({
        title: "Authentication Error",
        description: "An error occurred while setting up Gmail authentication",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!confirm('Are you sure you want to disconnect Gmail sync for this account?')) {
      return;
    }

    setIsLoading(true);

    try {
      // Call the database function to disable Gmail sync
      const { error } = await supabase.rpc('disable_gmail_sync', {
        sender_account_id_param: senderId,
        user_id_param: user?.id
      });

      if (error) {
        console.error('Error disabling Gmail sync:', error);
        toast({
          title: "Error",
          description: "Failed to disconnect Gmail sync",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Gmail Sync Disconnected",
        description: `Gmail sync has been disabled for ${senderEmail}`,
      });

      onAuthSuccess();

    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      toast({
        title: "Error",
        description: "An error occurred while disconnecting Gmail sync",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          <span className="font-medium">{senderEmail}</span>
          <Badge variant={isAuthenticated ? "default" : "secondary"} className={isAuthenticated ? "bg-green-500" : ""}>
            {isAuthenticated ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 mr-1" />
                Not Connected
              </>
            )}
          </Badge>
        </div>
        
        <div className="flex gap-2">
          {isAuthenticated ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnectGmail}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <XCircle className="w-3 h-3 mr-1" />
              )}
              Disconnect
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGmailAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <ExternalLink className="w-3 h-3 mr-1" />
              )}
              Connect Gmail
            </Button>
          )}
        </div>
      </div>

      {!isAuthenticated && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Gmail sync not enabled.</strong> Connect your Gmail account to automatically sync sent emails to your Gmail Sent folder.
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              You'll be redirected to Google to authorize access to your Gmail account.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {isAuthenticated && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Gmail sync enabled.</strong> Emails sent from this account will automatically appear in your Gmail Sent folder.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default GmailAuthButton;
