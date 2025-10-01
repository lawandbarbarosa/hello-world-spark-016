import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
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

interface FailedEmail {
  id: string;
  campaign_id: string;
  contact_id: string;
  sequence_id: string;
  sender_account_id: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  // Related data
  campaign: {
    name: string;
    description: string;
  };
  contact: {
    email: string;
    first_name: string;
    last_name: string;
    replied_at: string | null;
  };
  email_sequence: {
    subject: string;
    body: string;
    step_number: number;
  };
  sender_account: {
    email: string;
  };
}

const Spam = () => {
  const { user } = useAuth();
  const [failedEmails, setFailedEmails] = useState<FailedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentFailures, setRecentFailures] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchFailedEmails();
      fetchRecentFailures();
    }
  }, [user]);

  const fetchFailedEmails = async () => {
    try {
      setLoading(true);

      const { data: emailSends, error } = await supabase
        .from('email_sends')
        .select(`
          *,
          campaigns!inner(name, description, user_id),
          contacts(email, first_name, last_name, replied_at),
          email_sequences(subject, body, step_number),
          sender_accounts(email)
        `)
        .eq('campaigns.user_id', user?.id)
        .eq('status', 'failed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching failed emails:', error);
        toast({
          title: "Error",
          description: "Failed to fetch failed emails",
          variant: "destructive",
        });
        return;
      }

      // Transform the data to match our interface
      const transformedEmails: FailedEmail[] = (emailSends || []).map(email => ({
        id: email.id,
        campaign_id: email.campaign_id,
        contact_id: email.contact_id,
        sequence_id: email.sequence_id,
        sender_account_id: email.sender_account_id,
        sent_at: email.sent_at,
        opened_at: email.opened_at,
        clicked_at: email.clicked_at,
        status: email.status,
        error_message: email.error_message,
        created_at: email.created_at,
        campaign: {
          name: email.campaigns?.name || 'Unknown Campaign',
          description: email.campaigns?.description || '',
        },
        contact: {
          email: email.contacts?.email || 'Unknown Contact',
          first_name: email.contacts?.first_name || '',
          last_name: email.contacts?.last_name || '',
          replied_at: email.contacts?.replied_at || null,
        },
        email_sequence: {
          subject: email.email_sequences?.subject || 'No Subject',
          body: email.email_sequences?.body || 'No Content',
          step_number: email.email_sequences?.step_number || 1,
        },
        sender_account: {
          email: email.sender_accounts?.email || 'Unknown Sender',
        },
      }));

      setFailedEmails(transformedEmails);

    } catch (error) {
      console.error('Error fetching failed emails:', error);
      toast({
        title: "Error",
        description: "Failed to load failed emails",
        variant: "destructive",
      });
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
        .from('email_sends')
        .delete()
        .eq('id', emailId);

      if (error) {
        console.error('Error deleting failed email:', error);
        toast({
          title: "Error",
          description: "Failed to delete email",
          variant: "destructive",
        });
        return;
      }

      setFailedEmails(prev => prev.filter(email => email.id !== emailId));
      toast({
        title: "Success",
        description: "Failed email deleted permanently",
      });
    } catch (error) {
      console.error('Error deleting failed email:', error);
      toast({
        title: "Error",
        description: "Failed to delete email",
        variant: "destructive",
      });
    }
  };

  const handleClearAllFailed = async () => {
    try {
      const { error } = await supabase
        .from('email_sends')
        .delete()
        .eq('status', 'failed')
        .in('campaign_id', failedEmails.map(email => email.campaign_id));

      if (error) {
        console.error('Error clearing failed emails:', error);
        toast({
          title: "Error",
          description: "Failed to clear failed emails",
          variant: "destructive",
        });
        return;
      }

      setFailedEmails([]);
      toast({
        title: "Success",
        description: "All failed emails cleared",
      });
    } catch (error) {
      console.error('Error clearing failed emails:', error);
      toast({
        title: "Error",
        description: "Failed to clear failed emails",
        variant: "destructive",
      });
    }
  };

  const personalizeContent = (content: string, contact: FailedEmail['contact']) => {
    // Get company name from email domain if available
    const emailDomain = contact.email.split('@')[1];
    const companyFromEmail = emailDomain ? emailDomain.split('.')[0] : "Company";
    
    return content
      .replace(/\{\{firstName\}\}/g, contact.first_name || "")
      .replace(/\{\{lastName\}\}/g, contact.last_name || "")
      .replace(/\{\{email\}\}/g, contact.email)
      .replace(/\{\{companyName\}\}/g, contact.first_name || companyFromEmail)
      .replace(/\{\{Company Name\}\}/g, contact.first_name || companyFromEmail)
      .replace(/\{\{leadCity\}\}/g, "your area")
      .replace(/\{\{Lead City\}\}/g, "your area")
      .replace(/\{\{company\}\}/g, contact.first_name || companyFromEmail)
      .replace(/\{\{name\}\}/g, contact.first_name || contact.email.split('@')[0])
      .replace(/\{\{fullName\}\}/g, `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || contact.email.split('@')[0])
      .replace(/\{\{Full Name\}\}/g, `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || contact.email.split('@')[0])
      .replace(/\{\{First Name\}\}/g, contact.first_name || "")
      .replace(/\{\{Last Name\}\}/g, contact.last_name || "")
      .replace(/\{\{Industry\}\}/g, "your industry")
      .replace(/\{\{industry\}\}/g, "your industry")
      .replace(/\{\{Company\}\}/g, contact.first_name || companyFromEmail)
      .replace(/\{\{company\}\}/g, contact.first_name || companyFromEmail);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-red-500" />
          <h1 className="text-3xl font-bold text-foreground">Failed Emails</h1>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading failed emails...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-red-500" />
          <h1 className="text-3xl font-bold text-foreground">Failed Emails</h1>
          <Badge variant="destructive" className="ml-2">
            {failedEmails.length} failed
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
              onClick={handleClearAllFailed}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Failed
            </Button>
          )}
        </div>
      </div>

      {failedEmails.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No failed emails</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Great! All your emails have been sent successfully. Failed emails will appear here if any delivery issues occur.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {failedEmails.map((email) => (
            <Card key={email.id} className="border-red-200 dark:border-red-900">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <Badge variant="destructive">
                        Failed
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">
                      {personalizeContent(email.email_sequence.subject, email.contact)}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {email.contact.first_name && email.contact.last_name 
                          ? `${email.contact.first_name} ${email.contact.last_name}` 
                          : email.contact.email
                        }
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {email.contact.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(email.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {email.campaign.name}
                      </span>
                    </CardDescription>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetryEmail(email.id)}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Retry
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteFailed(email.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    {personalizeContent(email.email_sequence.body, email.contact).length > 200 
                      ? `${personalizeContent(email.email_sequence.body, email.contact).substring(0, 200)}...` 
                      : personalizeContent(email.email_sequence.body, email.contact)
                    }
                  </p>
                </div>
                
                {email.error_message && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium text-red-800">Error Details:</span>
                    </div>
                    <p className="text-sm text-red-700">{email.error_message}</p>
                  </div>
                )}
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