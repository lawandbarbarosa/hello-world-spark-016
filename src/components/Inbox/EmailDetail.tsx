import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft,
  Star, 
  Mail, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle,
  Reply,
  Forward,
  Archive,
  Trash2,
  Calendar,
  User,
  Send,
  AlertCircle
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

const EmailDetail = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { emailId } = useParams<{ emailId: string }>();
  const [email, setEmail] = useState<SentEmail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starred, setStarred] = useState(false);

  useEffect(() => {
    if (user && emailId) {
      fetchEmailDetails();
    }
  }, [user, emailId]);

  const fetchEmailDetails = async () => {
    try {
      setLoading(true);

      const { data: emailSend, error } = await supabase
        .from('email_sends')
        .select(`
          *,
          campaigns!inner(name, description, user_id),
          contacts(email, first_name, last_name, replied_at),
          email_sequences(subject, body, step_number),
          sender_accounts(email)
        `)
        .eq('id', emailId)
        .eq('campaigns.user_id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching email details:', error);
        toast({
          title: "Error",
          description: "Failed to fetch email details",
          variant: "destructive",
        });
        navigate('/inbox');
        return;
      }

      if (!emailSend) {
        toast({
          title: "Error",
          description: "Email not found",
          variant: "destructive",
        });
        navigate('/inbox');
        return;
      }

      // Transform the data to match our interface
      const transformedEmail: SentEmail = {
        id: emailSend.id,
        campaign_id: emailSend.campaign_id,
        contact_id: emailSend.contact_id,
        sequence_id: emailSend.sequence_id,
        sender_account_id: emailSend.sender_account_id,
        sent_at: emailSend.sent_at,
        opened_at: emailSend.opened_at,
        clicked_at: emailSend.clicked_at,
        status: emailSend.status,
        error_message: emailSend.error_message,
        created_at: emailSend.created_at,
        campaign: {
          name: emailSend.campaigns?.name || 'Unknown Campaign',
          description: emailSend.campaigns?.description || '',
        },
        contact: {
          email: emailSend.contacts?.email || 'Unknown Contact',
          first_name: emailSend.contacts?.first_name || '',
          last_name: emailSend.contacts?.last_name || '',
          replied_at: emailSend.contacts?.replied_at || null,
        },
        email_sequence: {
          subject: emailSend.email_sequences?.subject || 'No Subject',
          body: emailSend.email_sequences?.body || 'No Content',
          step_number: emailSend.email_sequences?.step_number || 1,
        },
        sender_account: {
          email: emailSend.sender_accounts?.email || 'Unknown Sender',
        },
      };

      setEmail(transformedEmail);

    } catch (error) {
      console.error('Error fetching email details:', error);
      toast({
        title: "Error",
        description: "Failed to load email details",
        variant: "destructive",
      });
      navigate('/inbox');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string, sentAt: string | null, openedAt: string | null) => {
    if (status === 'failed') {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    if (status === 'sent') {
      if (openedAt) {
        return <Eye className="w-5 h-5 text-green-500" />;
      }
      return <CheckCircle className="w-5 h-5 text-blue-500" />;
    }
    return <Clock className="w-5 h-5 text-gray-500" />;
  };

  const getStatusBadge = (status: string, sentAt: string | null, openedAt: string | null) => {
    if (status === 'failed') {
      return <Badge variant="destructive">Failed</Badge>;
    }
    if (status === 'sent') {
      if (openedAt) {
        return <Badge className="bg-green-100 text-green-800 border-green-200">Opened</Badge>;
      }
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Sent</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleStarToggle = () => {
    setStarred(!starred);
  };

  const handleReply = () => {
    // Navigate to compose email with reply data
    const replySubject = `Re: ${email?.email_sequence.subject}`;
    const replyBody = `\n\n--- Original Message ---\nFrom: ${email?.sender_account.email}\nTo: ${email?.contact.email}\nSubject: ${email?.email_sequence.subject}\n\n${email?.email_sequence.body}`;
    
    navigate(`/emails`, { 
      state: { 
        composeData: {
          recipient: email?.contact.email,
          subject: replySubject,
          body: replyBody
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/inbox')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inbox
          </Button>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading email...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/inbox')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inbox
          </Button>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Email not found</h3>
            <p className="text-muted-foreground">
              The email you're looking for doesn't exist or you don't have permission to view it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/inbox')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inbox
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleStarToggle}
            >
              <Star className={`w-4 h-4 ${starred ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
            </Button>
            {getStatusIcon(email.status, email.sent_at, email.opened_at)}
            {getStatusBadge(email.status, email.sent_at, email.opened_at)}
            {email.contact.replied_at && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                Replied
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReply}>
            <Reply className="w-4 h-4 mr-2" />
            Reply
          </Button>
          <Button variant="outline" size="sm">
            <Forward className="w-4 h-4 mr-2" />
            Forward
          </Button>
          <Button variant="outline" size="sm">
            <Archive className="w-4 h-4 mr-2" />
            Archive
          </Button>
          <Button variant="outline" size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Email Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">
              {personalizeContent(email.email_sequence.subject, email.contact)}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {formatDateTime(email.sent_at || email.created_at)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">To:</span>
                <span>{email.contact.first_name && email.contact.last_name 
                  ? `${email.contact.first_name} ${email.contact.last_name}` 
                  : email.contact.email
                }</span>
              </div>
              <div className="text-sm text-muted-foreground ml-6">
                {email.contact.email}
              </div>
              
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">From:</span>
                <span>{email.sender_account.email}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Campaign:</span>
                <span>{email.campaign.name}</span>
              </div>
              <div className="text-sm text-muted-foreground ml-6">
                Step {email.email_sequence.step_number}
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Sent:</span>
                <span>{email.sent_at ? formatDateTime(email.sent_at) : 'Pending'}</span>
              </div>
            </div>
          </div>

          {/* Tracking Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              <div>
                <div className="font-medium text-blue-900">Delivery Status</div>
                <div className="text-sm text-blue-700">
                  {email.status === 'sent' ? 'Successfully delivered' : 
                   email.status === 'failed' ? 'Delivery failed' : 'Pending delivery'}
                </div>
              </div>
            </div>
            
            {email.opened_at && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <Eye className="w-5 h-5 text-green-500" />
                <div>
                  <div className="font-medium text-green-900">Email Opened</div>
                  <div className="text-sm text-green-700">
                    {formatDateTime(email.opened_at)}
                  </div>
                </div>
              </div>
            )}
            
            {email.clicked_at && (
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <Send className="w-5 h-5 text-purple-500" />
                <div>
                  <div className="font-medium text-purple-900">Link Clicked</div>
                  <div className="text-sm text-purple-700">
                    {formatDateTime(email.clicked_at)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Email Body */}
          <div className="border-t pt-6">
            <h3 className="font-medium text-foreground mb-4">Message Content</h3>
            <div className="prose prose-sm max-w-none bg-background p-4 rounded-lg border">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: personalizeContent(email.email_sequence.body, email.contact).replace(/\n/g, '<br>') 
                }}
              />
            </div>
          </div>

          {/* Error Message */}
          {email.error_message && (
            <div className="border-t pt-6">
              <h3 className="font-medium text-destructive mb-4">Error Details</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{email.error_message}</p>
              </div>
            </div>
          )}

          {/* Reply Information */}
          {email.contact.replied_at && (
            <div className="border-t pt-6">
              <h3 className="font-medium text-yellow-800 mb-4 flex items-center gap-2">
                <Reply className="w-4 h-4" />
                Contact Replied
              </h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  This contact replied on {formatDateTime(email.contact.replied_at)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailDetail;
