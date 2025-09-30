import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { 
  Star, 
  Mail, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Archive,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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

const InboxList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [starredEmails, setStarredEmails] = useState<Set<string>>(new Set());

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

  const handleEmailClick = (emailId: string) => {
    navigate(`/inbox/${emailId}`);
  };

  const handleSelectEmail = (emailId: string, checked: boolean) => {
    const newSelected = new Set(selectedEmails);
    if (checked) {
      newSelected.add(emailId);
    } else {
      newSelected.delete(emailId);
    }
    setSelectedEmails(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmails(new Set(sentEmails.map(email => email.id)));
    } else {
      setSelectedEmails(new Set());
    }
  };

  const handleStarEmail = (emailId: string) => {
    const newStarred = new Set(starredEmails);
    if (newStarred.has(emailId)) {
      newStarred.delete(emailId);
    } else {
      newStarred.add(emailId);
    }
    setStarredEmails(newStarred);
  };

  const getStatusIcon = (status: string, sentAt: string | null, openedAt: string | null) => {
    if (status === 'failed') {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (status === 'sent') {
      if (openedAt) {
        return <Eye className="w-4 h-4 text-green-500" />;
      }
      return <CheckCircle className="w-4 h-4 text-blue-500" />;
    }
    return <Clock className="w-4 h-4 text-gray-500" />;
  };

  const getStatusBadge = (status: string, sentAt: string | null, openedAt: string | null) => {
    if (status === 'failed') {
      return <Badge variant="destructive" className="text-xs">Failed</Badge>;
    }
    if (status === 'sent') {
      if (openedAt) {
        return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Opened</Badge>;
      }
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Sent</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Pending</Badge>;
  };

  const personalizeContent = (content: string, contact: SentEmail['contact']) => {
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
      // Handle case variations and additional common variables
      .replace(/\{\{First Name\}\}/g, contact.first_name || "")
      .replace(/\{\{Last Name\}\}/g, contact.last_name || "")
      .replace(/\{\{Industry\}\}/g, "your industry")
      .replace(/\{\{industry\}\}/g, "your industry")
      .replace(/\{\{Company\}\}/g, contact.first_name || companyFromEmail)
      .replace(/\{\{company\}\}/g, contact.first_name || companyFromEmail);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return "Today";
    } else if (diffDays === 2) {
      return "Yesterday";
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Inbox</h1>
            <p className="text-muted-foreground mt-1">
              View all sent emails in a Gmail-like interface
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading emails...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inbox</h1>
          <p className="text-muted-foreground mt-1">
            View all sent emails in a Gmail-like interface
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={fetchSentEmails} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {sentEmails.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            {/* Header with select all */}
            <div className="flex items-center gap-4 p-4 border-b bg-muted/30">
              <Checkbox
                checked={selectedEmails.size === sentEmails.length && sentEmails.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedEmails.size > 0 ? `${selectedEmails.size} selected` : `${sentEmails.length} emails`}
              </span>
              {selectedEmails.size > 0 && (
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" size="sm">
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>

            {/* Email List */}
            <div className="divide-y">
              {sentEmails.map((email) => (
                <div
                  key={email.id}
                  className={`flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                    selectedEmails.has(email.id) ? 'bg-muted/30' : ''
                  }`}
                  onClick={() => handleEmailClick(email.id)}
                >
                  {/* Checkbox */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedEmails.has(email.id)}
                      onCheckedChange={(checked) => handleSelectEmail(email.id, checked as boolean)}
                    />
                  </div>

                  {/* Star */}
                  <div onClick={(e) => {
                    e.stopPropagation();
                    handleStarEmail(email.id);
                  }}>
                    <Star 
                      className={`w-4 h-4 cursor-pointer ${
                        starredEmails.has(email.id) 
                          ? 'text-yellow-500 fill-current' 
                          : 'text-gray-400 hover:text-yellow-500'
                      }`} 
                    />
                  </div>

                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {getStatusIcon(email.status, email.sent_at, email.opened_at)}
                  </div>

                  {/* Email Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">
                        {email.contact.first_name && email.contact.last_name 
                          ? `${email.contact.first_name} ${email.contact.last_name}`
                          : email.contact.email
                        }
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({email.contact.email})
                      </span>
                      {getStatusBadge(email.status, email.sent_at, email.opened_at)}
                      {email.contact.replied_at && (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                          Replied
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm font-medium text-foreground mb-1">
                      {personalizeContent(email.email_sequence.subject, email.contact)}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {truncateText(personalizeContent(email.email_sequence.body, email.contact).replace(/<[^>]*>/g, ''))}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Campaign: {email.campaign.name}</span>
                      <span>Step {email.email_sequence.step_number}</span>
                      <span>From: {email.sender_account.email}</span>
                    </div>
                  </div>

                  {/* Date and Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(email.sent_at || email.created_at)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Mail className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No emails sent yet</h3>
            <p className="text-muted-foreground mb-6">
              Launch your first campaign to see sent emails here
            </p>
            <Button onClick={() => navigate('/campaigns')}>
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InboxList;
