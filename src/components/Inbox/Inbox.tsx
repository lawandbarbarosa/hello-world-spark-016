import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import ComposeEmail from "./ComposeEmail";
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
  Inbox as InboxIcon,
  Users,
  Reply,
  Edit3,
  Plus
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

interface ContactGroup {
  contactEmail: string;
  contactName: string;
  emails: SentEmail[];
  totalSent: number;
  totalOpened: number;
  totalFailed: number;
  latestSent: string | null;
  campaigns: string[];
  hasReplied: boolean;
  repliedAt: string | null;
}

const Inbox = () => {
  const { user } = useAuth();
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState<{
    recipient?: string;
    subject?: string;
    body?: string;
  }>({});

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
          contacts(email, first_name, last_name, replied_at),
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

      setSentEmails(transformedEmails);

      // Group emails by contact
      const groupedByContact = transformedEmails.reduce((groups: Record<string, ContactGroup>, email) => {
        const contactEmail = email.contact.email;
        
        if (!groups[contactEmail]) {
          groups[contactEmail] = {
            contactEmail,
            contactName: `${email.contact.first_name} ${email.contact.last_name}`.trim() || email.contact.email,
            emails: [],
            totalSent: 0,
            totalOpened: 0,
            totalFailed: 0,
            latestSent: null,
            campaigns: [],
            hasReplied: !!email.contact.replied_at,
            repliedAt: email.contact.replied_at,
          };
        } else {
          // Update reply status if any email shows a reply
          if (email.contact.replied_at && !groups[contactEmail].hasReplied) {
            groups[contactEmail].hasReplied = true;
            groups[contactEmail].repliedAt = email.contact.replied_at;
          }
        }

        groups[contactEmail].emails.push(email);
        
        // Update statistics
        if (email.status === 'sent') {
          groups[contactEmail].totalSent++;
        }
        if (email.status === 'failed') {
          groups[contactEmail].totalFailed++;
        }
        if (email.opened_at) {
          groups[contactEmail].totalOpened++;
        }
        
        // Update latest sent date
        if (email.sent_at && (!groups[contactEmail].latestSent || email.sent_at > groups[contactEmail].latestSent)) {
          groups[contactEmail].latestSent = email.sent_at;
        }
        
        // Add campaign if not already included
        if (!groups[contactEmail].campaigns.includes(email.campaign.name)) {
          groups[contactEmail].campaigns.push(email.campaign.name);
        }

        return groups;
      }, {});

      // Convert to array and sort by latest sent date
      const contactGroupsArray = Object.values(groupedByContact).sort((a, b) => {
        if (!a.latestSent && !b.latestSent) return 0;
        if (!a.latestSent) return 1;
        if (!b.latestSent) return -1;
        return new Date(b.latestSent).getTime() - new Date(a.latestSent).getTime();
      });

      setContactGroups(contactGroupsArray);

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
        return <Badge className="bg-success text-success-foreground">
          <Eye className="w-3 h-3 mr-1" />
          Opened
        </Badge>;
      }
      return <Badge className="bg-primary text-primary-foreground">
        <CheckCircle className="w-3 h-3 mr-1" />
        Sent
      </Badge>;
    }
    return <Badge variant="secondary">
      <Clock className="w-3 h-3 mr-1" />
      Pending
    </Badge>;
  };

  const personalizeContent = (content: string, contact: SentEmail['contact']) => {
    return content
      .replace(/\{\{firstName\}\}/g, contact.first_name || "")
      .replace(/\{\{lastName\}\}/g, contact.last_name || "")
      .replace(/\{\{email\}\}/g, contact.email);
  };

  const handleComposeEmail = (recipient?: string, subject?: string, body?: string) => {
    setComposeData({ recipient, subject, body });
    setShowCompose(true);
  };

  const handleEmailSent = () => {
    // Refresh the inbox data after sending an email
    fetchSentEmails();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inbox</h1>
          <p className="text-muted-foreground mt-1">
            View all sent emails organized by prospect/receiver
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => handleComposeEmail()}
            className="bg-primary hover:bg-primary/90"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Compose
          </Button>
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
      </div>

      {loading ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading sent emails...</p>
          </CardContent>
        </Card>
      ) : sentEmails.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              Contacts ({contactGroups.length})
            </h2>
          </div>
          
          {contactGroups.map((group) => (
            <Card key={group.contactEmail} className="shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="w-6 h-6 text-primary" />
                    <div>
                      <CardTitle className="text-lg">
                        {group.contactName}
                      </CardTitle>
                      <CardDescription>
                        {group.contactEmail}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{group.totalSent}</div>
                      <div className="text-xs text-muted-foreground">Sent</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">{group.totalOpened}</div>
                      <div className="text-xs text-muted-foreground">Opened</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-destructive">{group.totalFailed}</div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                    {group.hasReplied && (
                      <div className="text-center">
                        <div className="flex items-center justify-center">
                          <Reply className="w-6 h-6 text-warning" />
                        </div>
                        <div className="text-xs text-warning font-medium">Replied!</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Campaigns: {group.campaigns.join(', ')}
                  </span>
                  {group.latestSent && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Last sent: {new Date(group.latestSent).toLocaleDateString()}
                    </span>
                  )}
                  {group.hasReplied && group.repliedAt && (
                    <span className="flex items-center gap-1 text-warning">
                      <Reply className="w-3 h-3" />
                      Replied: {new Date(group.repliedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Email History ({group.emails.length})
                  </h4>
                  {group.emails.map((email) => (
                    <Collapsible
                      key={email.id}
                      open={expandedEmails.has(email.id)}
                      onOpenChange={() => toggleEmailExpansion(email.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-background hover:bg-accent/50 cursor-pointer transition-colors">
                          <div className="flex items-center gap-3 flex-1">
                            {getStatusIcon(email.status, email.sent_at, email.opened_at)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-medium text-foreground truncate">
                                  {personalizeContent(email.email_sequence.subject, email.contact)}
                                </h5>
                                {getStatusBadge(email.status, email.sent_at, email.opened_at)}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {email.campaign.name} - Step {email.email_sequence.step_number}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {email.sent_at 
                                    ? new Date(email.sent_at).toLocaleDateString()
                                    : new Date(email.created_at).toLocaleDateString()
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
                      <CollapsibleContent className="px-3 pb-3">
                        <div className="mt-3 space-y-3 bg-background/50 rounded-lg p-4 border">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <strong>From:</strong> {email.sender_account.email}
                            </div>
                            <div>
                              <strong>Campaign:</strong> {email.campaign.name}
                            </div>
                            {email.opened_at && (
                              <div>
                                <strong>Opened:</strong> {new Date(email.opened_at).toLocaleString()}
                                <Badge className="ml-2 bg-success text-success-foreground text-xs">
                                  <Eye className="w-3 h-3 mr-1" />
                                  Opened!
                                </Badge>
                              </div>
                            )}
                            {email.clicked_at && (
                              <div>
                                <strong>Clicked:</strong> {new Date(email.clicked_at).toLocaleString()}
                              </div>
                            )}
                          </div>
                          
                          <div className="border-t pt-3">
                            <strong className="text-sm">Subject:</strong>
                            <p className="mt-1 font-medium">{personalizeContent(email.email_sequence.subject, email.contact)}</p>
                          </div>
                          
                          <div className="border-t pt-3">
                            <strong className="text-sm">Message:</strong>
                            <div 
                              className="mt-2 prose prose-sm max-w-none text-foreground"
                              dangerouslySetInnerHTML={{ 
                                __html: personalizeContent(email.email_sequence.body, email.contact).replace(/\n/g, '<br>') 
                              }}
                            />
                            <div className="mt-3 flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleComposeEmail(
                                  email.contact.email,
                                  `Re: ${email.email_sequence.subject}`,
                                  `\n\n--- Original Message ---\nFrom: ${email.sender_account.email}\nTo: ${email.contact.email}\nSubject: ${email.email_sequence.subject}\n\n${email.email_sequence.body}`
                                )}
                              >
                                <Reply className="w-3 h-3 mr-1" />
                                Reply
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleComposeEmail(email.contact.email)}
                              >
                                <Edit3 className="w-3 h-3 mr-1" />
                                New Email
                              </Button>
                            </div>
                          </div>

                          {email.error_message && (
                            <div className="border-t pt-3">
                              <strong className="text-sm text-destructive">Error:</strong>
                              <p className="mt-1 text-sm text-destructive">{email.error_message}</p>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <InboxIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No emails sent yet</h3>
            <p className="text-muted-foreground">
              Launch your first campaign to see sent emails here
            </p>
          </CardContent>
        </Card>
      )}

      {/* Compose Email Modal */}
      {showCompose && (
        <ComposeEmail
          onClose={() => {
            setShowCompose(false);
            setComposeData({});
          }}
          onEmailSent={handleEmailSent}
          initialRecipient={composeData.recipient}
          initialSubject={composeData.subject}
          initialBody={composeData.body}
        />
      )}
    </div>
  );
};

export default Inbox;