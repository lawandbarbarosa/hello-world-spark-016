import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Mail, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ExternalLink,
  RefreshCw
} from "lucide-react";

interface GmailSyncStatusProps {
  className?: string;
}

const GmailSyncStatus = ({ className }: GmailSyncStatusProps) => {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<{
    enabled: boolean;
    configured: boolean;
    recentErrors: number;
    totalEmails: number;
    syncedEmails: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkSyncStatus();
    }
  }, [user]);

  const checkSyncStatus = async () => {
    try {
      setLoading(true);

      // Get sender accounts with Gmail sync status
      const { data: senderAccounts, error: senderError } = await supabase
        .from('sender_accounts')
        .select('id, email, gmail_sync_enabled, gmail_refresh_token')
        .eq('user_id', user.id);

      if (senderError) {
        console.error('Error fetching sender accounts:', senderError);
        return;
      }

      // Get recent email sends to check sync status
      const { data: recentEmails, error: emailError } = await supabase
        .from('email_sends')
        .select('id, gmail_synced, gmail_sync_error, created_at')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .order('created_at', { ascending: false })
        .limit(100);

      if (emailError) {
        console.error('Error fetching recent emails:', emailError);
        return;
      }

      // Calculate sync statistics
      const enabledAccounts = senderAccounts?.filter(account => 
        account.gmail_sync_enabled && account.gmail_refresh_token
      ) || [];

      const totalEmails = recentEmails?.length || 0;
      const syncedEmails = recentEmails?.filter(email => email.gmail_synced).length || 0;
      const recentErrors = recentEmails?.filter(email => email.gmail_sync_error).length || 0;

      setSyncStatus({
        enabled: enabledAccounts.length > 0,
        configured: senderAccounts?.some(account => account.gmail_sync_enabled) || false,
        recentErrors,
        totalEmails,
        syncedEmails
      });

    } catch (error) {
      console.error('Error checking Gmail sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Checking Gmail sync status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!syncStatus) {
    return null;
  }

  const getStatusBadge = () => {
    if (!syncStatus.configured) {
      return <Badge variant="secondary">Not Configured</Badge>;
    }
    if (!syncStatus.enabled) {
      return <Badge variant="destructive">Not Enabled</Badge>;
    }
    if (syncStatus.recentErrors > 0) {
      return <Badge variant="destructive">Has Errors</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">Working</Badge>;
  };

  const getStatusIcon = () => {
    if (!syncStatus.configured) {
      return <XCircle className="w-5 h-5 text-muted-foreground" />;
    }
    if (!syncStatus.enabled) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
    if (syncStatus.recentErrors > 0) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Gmail Sent Folder Sync
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Status of email synchronization to Gmail Sent folders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <div className="font-medium">
              {!syncStatus.configured && "Gmail sync not configured"}
              {syncStatus.configured && !syncStatus.enabled && "Gmail sync disabled"}
              {syncStatus.enabled && syncStatus.recentErrors === 0 && "Gmail sync working properly"}
              {syncStatus.enabled && syncStatus.recentErrors > 0 && "Gmail sync has issues"}
            </div>
            <div className="text-sm text-muted-foreground">
              {!syncStatus.configured && "Emails will not appear in Gmail Sent folders"}
              {syncStatus.configured && !syncStatus.enabled && "Configure Gmail authentication to enable sync"}
              {syncStatus.enabled && syncStatus.recentErrors === 0 && "Emails are being synced to Gmail Sent folders"}
              {syncStatus.enabled && syncStatus.recentErrors > 0 && `${syncStatus.recentErrors} recent sync errors`}
            </div>
          </div>
        </div>

        {syncStatus.totalEmails > 0 && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{syncStatus.totalEmails}</div>
              <div className="text-xs text-muted-foreground">Total Emails</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">{syncStatus.syncedEmails}</div>
              <div className="text-xs text-muted-foreground">Synced</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">{syncStatus.recentErrors}</div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
          </div>
        )}

        {!syncStatus.configured && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Gmail sync is not configured. Your emails will still be sent successfully, but they won't appear in your Gmail Sent folder.
              <br />
              <Button variant="link" className="p-0 h-auto text-primary" asChild>
                <a href="/settings" className="inline-flex items-center gap-1">
                  Configure Gmail sync in Settings
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {syncStatus.configured && !syncStatus.enabled && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Gmail sync is configured but not enabled for your sender accounts. Check your sender account settings to enable Gmail authentication.
            </AlertDescription>
          </Alert>
        )}

        {syncStatus.enabled && syncStatus.recentErrors > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Gmail sync is experiencing issues. Check your Gmail API credentials and sender account authentication.
              Recent errors may include expired tokens or insufficient permissions.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={checkSyncStatus}>
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh Status
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/settings">
              <Mail className="w-3 h-3 mr-1" />
              Gmail Settings
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GmailSyncStatus;
