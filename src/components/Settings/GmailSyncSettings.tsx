import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Settings, CheckCircle, XCircle, ExternalLink, Info } from "lucide-react";

interface SenderAccount {
  id: string;
  email: string;
  provider: string;
  gmail_sync_enabled: boolean;
  gmail_refresh_token?: string;
}

const GmailSyncSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [senderAccounts, setSenderAccounts] = useState<SenderAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSenderAccounts();
    }
  }, [user]);

  const fetchSenderAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sender_accounts')
        .select('id, email, provider, gmail_sync_enabled, gmail_refresh_token')
        .eq('user_id', user?.id)
        .order('email');

      if (error) {
        console.error('Error fetching sender accounts:', error);
        // If columns don't exist yet, fetch without Gmail fields
        if (error.message?.includes('gmail_sync_enabled')) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('sender_accounts')
            .select('id, email, provider')
            .eq('user_id', user?.id)
            .order('email');

          if (fallbackError) {
            throw fallbackError;
          }

          // Map fallback data to include Gmail fields as false/null
          const mappedData = (fallbackData || []).map(account => ({
            ...account,
            gmail_sync_enabled: false,
            gmail_refresh_token: null
          }));
          
          setSenderAccounts(mappedData);
          return;
        }
        
        toast({
          title: "Error",
          description: "Failed to fetch sender accounts",
          variant: "destructive",
        });
        return;
      }

      setSenderAccounts((data || []) as any);
    } catch (error) {
      console.error('Error fetching sender accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load sender accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGmailAuth = async (senderEmail: string) => {
    try {
      setUpdating(senderEmail);

      const redirectUri = `${window.location.origin}/gmail-callback`;
      const { data, error } = await supabase.functions.invoke('gmail-auth-url', {
        body: { senderEmail, redirectUri },
      });

      if (error || !data?.authUrl) {
        throw new Error(error?.message || 'Failed to generate Gmail auth URL');
      }

      window.open(data.authUrl, '_blank');

      toast({
        title: 'Gmail Authorization',
        description: 'Please complete the Gmail authorization in the new window',
      });
    } catch (error) {
      console.error('Error initiating Gmail auth:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate Gmail authorization',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const toggleGmailSync = async (senderEmail: string, enabled: boolean) => {
    try {
      setUpdating(senderEmail);
      
      if (enabled) {
        // Enable Gmail sync - need to authenticate first
        await handleGmailAuth(senderEmail);
      } else {
        // Disable Gmail sync
        const account = senderAccounts.find(acc => acc.email === senderEmail);
        if (!account) {
          throw new Error('Account not found');
        }

        const { error } = await supabase.rpc('disable_gmail_sync' as any, {
          sender_account_id_param: account.id,
          user_id_param: user?.id
        }) as { error: any };

        if (error) {
          // If function doesn't exist yet, just update the database directly
          if (error.message?.includes('function') && error.message?.includes('does not exist')) {
            const { error: updateError } = await supabase
              .from('sender_accounts')
              .update({ 
                gmail_sync_enabled: false,
                gmail_refresh_token: null,
                gmail_client_id: null,
                gmail_client_secret: null
              })
              .eq('email', senderEmail);

            if (updateError) {
              throw updateError;
            }
          } else {
            throw error;
          }
        }

        toast({
          title: "Gmail Sync Disabled",
          description: `Gmail sync has been disabled for ${senderEmail}`,
        });

        // Refresh the list
        await fetchSenderAccounts();
      }
    } catch (error) {
      console.error('Error toggling Gmail sync:', error);
      toast({
        title: "Error",
        description: "Failed to update Gmail sync settings",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const getSyncStatus = (account: SenderAccount) => {
    if (account.gmail_sync_enabled && account.gmail_refresh_token) {
      return { status: 'enabled', color: 'green', text: 'Enabled' };
    } else if (account.gmail_sync_enabled && !account.gmail_refresh_token) {
      return { status: 'pending', color: 'yellow', text: 'Pending Auth' };
    } else {
      return { status: 'disabled', color: 'gray', text: 'Disabled' };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Gmail Sync Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading sender accounts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Gmail Sync Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Enable Gmail sync to automatically save sent emails to your Gmail "Sent" folder. 
              This requires Gmail authorization for each sender account.
            </AlertDescription>
          </Alert>

          {senderAccounts.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No sender accounts found</p>
              <p className="text-sm text-muted-foreground">
                Add sender accounts in the Campaigns section first
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {senderAccounts.map((account) => {
                const syncStatus = getSyncStatus(account);
                return (
                  <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{account.email}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {account.provider} • {syncStatus.text}
                        </p>
                      </div>
                      <Badge variant={syncStatus.color === 'green' ? 'default' : 'secondary'}>
                        {syncStatus.text}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={account.gmail_sync_enabled}
                        onCheckedChange={(enabled) => toggleGmailSync(account.email, enabled)}
                        disabled={updating === account.email}
                      />
                      {updating === account.email && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Enable Gmail Sync</p>
                <p className="text-sm text-muted-foreground">
                  Toggle the switch next to your sender account to enable Gmail sync
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Authorize Gmail Access</p>
                <p className="text-sm text-muted-foreground">
                  Complete the Gmail authorization process in the popup window
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Start Sending</p>
                <p className="text-sm text-muted-foreground">
                  All emails sent from this account will now appear in your Gmail "Sent" folder
                </p>
              </div>
            </div>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Gmail sync requires OAuth2 authorization. 
              You'll need to set up Gmail API credentials in your environment variables.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default GmailSyncSettings;
