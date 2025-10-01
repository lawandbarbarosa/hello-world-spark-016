import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Shield,
  Mail,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Clock,
  Users,
  XCircle,
  RefreshCw,
  Eye,
  User,
  CheckCircle,
  Info
} from "lucide-react";

interface SpamEmail {
  id: string;
  subject: string;
  sender_email: string;
  content: string;
  received_at: string;
  campaign_id?: string;
}

const Spam = () => {
  const { user } = useAuth();
  const [spamEmails, setSpamEmails] = useState<SpamEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentFailures, setRecentFailures] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchFailedEmails();
      fetchRecentFailures();
    }
  }, [user]);

  const fetchSpamEmails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('spam_emails')
        .select('*')
        .order('received_at', { ascending: false });

      if (error) {
        console.error('Error fetching spam emails:', error);
        toast.error('Failed to fetch spam emails');
        return;
      }

      setSpamEmails(data || []);
    } catch (error) {
      console.error('Error fetching spam emails:', error);
      toast.error('Failed to fetch spam emails');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentFailures = async () => {
    try {
      // Try to get recent failures using the database function
      const { data: recentFailures, error: failuresError } = await supabase
        .rpc('get_recent_failures_by_category' as any, {
          user_id_param: user?.id,
          limit_count: 10
        }) as { data: any, error: any };

      if (failuresError) {
        console.log('Using basic recent failures (advanced functions not available)');
        // Fall back to basic recent failures from email_sends
        const { data: emailSends, error } = await supabase
          .from('email_sends')
          .select(`
            id,
            status,
            error_message,
            created_at,
            contacts!inner(email),
            campaigns!inner(name)
          `)
          .eq('campaigns.user_id', user?.id)
          .eq('status', 'failed')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching recent failures:', error);
          return;
        }

        const basicFailures = emailSends?.map(email => ({
          id: email.id,
          contact_email: email.contacts?.email || 'Unknown',
          campaign_name: email.campaigns?.name || 'Unknown Campaign',
          status: email.status,
          failure_category: null,
          failure_reason: null,
          bounce_type: null,
          rejection_reason: null,
          error_message: email.error_message || 'Unknown error',
          created_at: email.created_at
        })) || [];

        setRecentFailures(basicFailures);
        return;
      }

      setRecentFailures(recentFailures || []);
    } catch (error) {
      console.error('Error fetching recent failures:', error);
      setRecentFailures([]);
    }
  };

  const getFailureCategoryColor = (category: string | null) => {
    switch (category) {
      case 'invalid_address': return 'text-red-600';
      case 'bounced': return 'text-orange-600';
      case 'rejected': return 'text-yellow-600';
      case 'blocked': return 'text-purple-600';
      case 'spam': return 'text-pink-600';
      case 'rate_limited': return 'text-blue-600';
      case 'authentication': return 'text-indigo-600';
      case 'network': return 'text-gray-600';
      case 'domain_issue': return 'text-teal-600';
      case 'content_filtered': return 'text-amber-600';
      default: return 'text-gray-500';
    }
  };

  const getFailureCategoryIcon = (category: string | null) => {
    switch (category) {
      case 'invalid_address': return '📧';
      case 'bounced': return '↩️';
      case 'rejected': return '❌';
      case 'blocked': return '🚫';
      case 'spam': return '📮';
      case 'rate_limited': return '⏱️';
      case 'authentication': return '🔐';
      case 'network': return '🌐';
      case 'domain_issue': return '🏠';
      case 'content_filtered': return '🔍';
      default: return '❓';
    }
  };

  const handleRetryEmail = async (emailId: string) => {
    try {
      // Update the email status to pending for retry
      const { error } = await supabase
        .from('email_sends')
        .update({ 
          status: 'pending',
          error_message: null,
          created_at: new Date().toISOString()
        })
        .eq('id', emailId);

      if (error) {
        console.error('Error retrying email:', error);
        toast({
          title: "Error",
          description: "Failed to retry email",
          variant: "destructive",
        });
        return;
      }

      // Remove from failed emails list
      setFailedEmails(prev => prev.filter(email => email.id !== emailId));
      toast({
        title: "Success",
        description: "Email queued for retry",
      });
    } catch (error) {
      console.error('Error retrying email:', error);
      toast({
        title: "Error",
        description: "Failed to retry email",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFailed = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('spam_emails')
        .delete()
        .eq('id', emailId);

      if (error) {
        console.error('Error deleting spam:', error);
        toast.error('Failed to delete spam email');
        return;
      }

      setSpamEmails(prev => prev.filter(email => email.id !== emailId));
      toast.success('Spam email deleted permanently');
    } catch (error) {
      console.error('Error deleting spam:', error);
      toast.error('Failed to delete spam email');
    }
  };

  const handleRestoreEmail = async (emailId: string) => {
    try {
      // In a real implementation, this would move the email back to the main inbox
      // For now, we'll just delete it from spam
      const { error } = await supabase
        .from('spam_emails')
        .delete()
        .eq('id', emailId);

      if (error) {
        console.error('Error restoring email:', error);
        toast.error('Failed to restore email');
        return;
      }

      setSpamEmails(prev => prev.filter(email => email.id !== emailId));
      toast.success('Email restored to inbox');
    } catch (error) {
      console.error('Error restoring email:', error);
      toast.error('Failed to restore email');
    }
  };

  const handleClearAllSpam = async () => {
    try {
      const { error } = await supabase
        .from('spam_emails')
        .delete()
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error clearing spam:', error);
        toast.error('Failed to clear spam emails');
        return;
      }

      setSpamEmails([]);
      toast.success('All spam emails cleared');
    } catch (error) {
      console.error('Error clearing spam:', error);
      toast.error('Failed to clear spam emails');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-foreground">Spam</h1>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading spam emails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-foreground">Spam</h1>
          <Badge variant="secondary" className="ml-2">
            {spamEmails.length} emails
          </Badge>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              fetchFailedEmails();
              fetchRecentFailures();
            }}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {failedEmails.length > 0 && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleClearAllSpam}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Spam
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={async () => {
              try {
                const { createSampleSpamEmails } = await import('@/utils/spamUtils');
                await createSampleSpamEmails();
                await fetchSpamEmails();
                toast.success('Sample spam emails added');
              } catch (error) {
                console.error('Error adding sample emails:', error);
                toast.error('Failed to add sample emails');
              }
            }}
          >
            <Mail className="w-4 h-4 mr-2" />
            Add Sample Emails
          </Button>
        </div>
      </div>

      {spamEmails.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No spam emails</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Your spam folder is clean! Suspicious emails will appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {spamEmails.map((email) => (
            <Card key={email.id} className="border-orange-200 dark:border-orange-900">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        Spam
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{email.subject}</CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {email.sender_email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(email.received_at).toLocaleDateString()}
                      </span>
                    </CardDescription>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreEmail(email.id)}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Restore
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteSpam(email.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    {email.content.length > 200 
                      ? `${email.content.substring(0, 200)}...` 
                      : email.content
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Failures Section */}
      {recentFailures.length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Recent Failures ({recentFailures.length})
            </CardTitle>
            <CardDescription>
              Latest email delivery failures and their error messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentFailures.map((failure) => (
                <div 
                  key={failure.id}
                  className="p-4 border border-destructive/20 rounded-lg bg-destructive/5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{getFailureCategoryIcon(failure.failure_category)}</span>
                        <span className="font-medium text-foreground">{failure.contact_email}</span>
                        <Badge variant="outline" className="text-xs">
                          {failure.campaign_name}
                        </Badge>
                        {failure.failure_category && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getFailureCategoryColor(failure.failure_category)}`}
                          >
                            {failure.failure_category.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(failure.created_at).toLocaleString()}
                        </span>
                      </div>
                      {failure.failure_reason && (
                        <div className="text-sm text-foreground bg-muted/50 p-2 rounded border mb-2">
                          <strong>Reason:</strong> {failure.failure_reason}
                        </div>
                      )}
                      {failure.error_message && (
                        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded border">
                          <strong>Technical Error:</strong> {failure.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Spam;