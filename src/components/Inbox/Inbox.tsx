import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { 
  Mail, 
  Calendar, 
  User, 
  ChevronDown, 
  ChevronRight,
  Send,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  Inbox as InboxIcon
} from "lucide-react";

interface SentEmail {
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

const Inbox = () => {
  const { user } = useAuth();
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchSentEmails();
    }
  }, [user]);

  const fetchSentEmails = async () => {
    try {
      setLoading(true);

      const { data: emailSends, error } = await supabase
        .from('email_sends')
        .select(`
          *,
          campaigns!inner(name, description, user_id),
          contacts(email, first_name, last_name),
          email_sequences(subject, body, step_number),
          sender_accounts(email)
        `)
        .eq('campaigns.user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sent emails:', error);
        toast({
          title: "Error",
          description: "Failed to fetch sent emails",
          variant: "destructive",
        });
        return;
      }

      // Transform the data to match our interface
      const transformedEmails: SentEmail[] = (emailSends || []).map(email => ({
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

      setSentEmails(transformedEmails);

    } catch (error) {
      console.error('Error fetching sent emails:', error);
      toast({
        title: "Error",
        description: "Failed to load sent emails",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEmailExpansion = (emailId: string) => {
    const newExpanded = new Set(expandedEmails);
    if (newExpanded.has(emailId)) {
      newExpanded.delete(emailId);
    } else {
      newExpanded.add(emailId);
    }
    setExpandedEmails(newExpanded);
  };

  const getStatusIcon = (status: string, sentAt: string | null, openedAt: string | null) => {
    if (status === 'failed') {
      return <XCircle className="w-4 h-4 text-destructive" />;
    }
    if (status === 'sent') {
      if (openedAt) {
        return <Eye className="w-4 h-4 text-success" />;
      }
      return <CheckCircle className="w-4 h-4 text-primary" />;
    }
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  const getStatusBadge = (status: string, sentAt: string | null, openedAt: string | null) => {
    if (status === 'failed') {
      return <Badge variant="destructive">Failed</Badge>;
    }
    if (status === 'sent') {
      if (openedAt) {
        return <Badge className="bg-success text-success-foreground">Opened</Badge>;
      }
      return <Badge className="bg-primary text-primary-foreground">Sent</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const personalizeContent = (content: string, contact: SentEmail['contact']) => {
    return content
      .replace(/\{\{firstName\}\}/g, contact.first_name || "")
      .replace(/\{\{lastName\}\}/g, contact.last_name || "")
      .replace(/\{\{email\}\}/g, contact.email);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inbox</h1>
          <p className="text-muted-foreground mt-1">
            View all sent emails and their delivery status
          </p>
        </div>
        <Button 
          onClick={fetchSentEmails} 
          variant="outline" 
          size="sm"
          disabled={loading}
        >
          <Mail className="w-4 h-4 mr-2" />
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <InboxIcon className="w-5 h-5 text-primary" />
            Sent Emails ({sentEmails.length})
          </CardTitle>
          <CardDescription>
            All emails sent from your campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading sent emails...</p>
            </div>
          ) : sentEmails.length > 0 ? (
            <div className="space-y-2">
              {sentEmails.map((email) => (
                <Collapsible
                  key={email.id}
                  open={expandedEmails.has(email.id)}
                  onOpenChange={() => toggleEmailExpansion(email.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-gradient-card hover:bg-accent/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        {getStatusIcon(email.status, email.sent_at, email.opened_at)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-foreground truncate">
                              {personalizeContent(email.email_sequence.subject, email.contact)}
                            </h4>
                            {getStatusBadge(email.status, email.sent_at, email.opened_at)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {email.contact.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {email.campaign.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {email.sent_at 
                                ? new Date(email.sent_at).toLocaleString()
                                : new Date(email.created_at).toLocaleString()
                              }
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {expandedEmails.has(email.id) ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4">
                    <div className="mt-4 space-y-4 bg-background/50 rounded-lg p-4 border">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>From:</strong> {email.sender_account.email}
                        </div>
                        <div>
                          <strong>To:</strong> {email.contact.email}
                        </div>
                        <div>
                          <strong>Campaign:</strong> {email.campaign.name}
                        </div>
                        <div>
                          <strong>Step:</strong> {email.email_sequence.step_number}
                        </div>
                        {email.opened_at && (
                          <div>
                            <strong>Opened:</strong> {new Date(email.opened_at).toLocaleString()}
                          </div>
                        )}
                        {email.clicked_at && (
                          <div>
                            <strong>Clicked:</strong> {new Date(email.clicked_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                      
                      <div className="border-t pt-4">
                        <strong className="text-sm">Subject:</strong>
                        <p className="mt-1 font-medium">{personalizeContent(email.email_sequence.subject, email.contact)}</p>
                      </div>
                      
                      <div className="border-t pt-4">
                        <strong className="text-sm">Message:</strong>
                        <div 
                          className="mt-2 prose prose-sm max-w-none text-foreground"
                          dangerouslySetInnerHTML={{ 
                            __html: personalizeContent(email.email_sequence.body, email.contact).replace(/\n/g, '<br>') 
                          }}
                        />
                      </div>

                      {email.error_message && (
                        <div className="border-t pt-4">
                          <strong className="text-sm text-destructive">Error:</strong>
                          <p className="mt-1 text-sm text-destructive">{email.error_message}</p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <InboxIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No emails sent yet</h3>
              <p className="text-muted-foreground">
                Launch your first campaign to see sent emails here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Inbox;