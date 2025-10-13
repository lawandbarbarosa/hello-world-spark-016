import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { 
  Mail, 
  Users, 
  Play,
  Pause,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Clock,
  Activity,
  CheckCircle,
  XCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface EmailWithCampaign {
  id: string;
  campaign_id: string;
  contact_id: string;
  sequence_id: string;
  sender_account_id: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  error_message: string | null;
  created_at: string;
  campaign: {
    name: string;
    description: string;
  };
  contact: {
    email: string;
    first_name: string | null;
    last_name: string | null;
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

interface CampaignListProps {
  onCreateNew: () => void;
  onEditCampaign?: (campaignId: string) => void;
}

const CampaignList = ({ onCreateNew, onEditCampaign }: CampaignListProps) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [emails, setEmails] = useState<EmailWithCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCampaigns();
      fetchEmails();
    }
  }, [user]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to load campaigns",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmails = async () => {
    try {
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
        console.error('Error fetching emails:', error);
        return;
      }

      // Transform the data to match our interface
      const transformedEmails: EmailWithCampaign[] = (emailSends || []).map(email => ({
        id: email.id,
        campaign_id: email.campaign_id,
        contact_id: email.contact_id,
        sequence_id: email.sequence_id,
        sender_account_id: email.sender_account_id,
        status: email.status,
        sent_at: email.sent_at,
        opened_at: email.opened_at,
        error_message: email.error_message,
        created_at: email.created_at,
        campaign: {
          name: email.campaigns?.name || 'Unknown Campaign',
          description: email.campaigns?.description || '',
        },
        contact: {
          email: email.contacts?.email || 'Unknown Contact',
          first_name: email.contacts?.first_name || null,
          last_name: email.contacts?.last_name || null,
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

      setEmails(transformedEmails);
    } catch (error) {
      console.error('Error fetching emails:', error);
    }
  };

  const updateCampaignStatus = async (campaignId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', campaignId);

      if (error) throw error;

      // If resuming a paused campaign, we need to handle scheduled emails
      if (newStatus === 'active') {
        // When activating a campaign, scheduled emails should remain as they are
        // The process-scheduled-emails function will pick them up when the campaign is active
        console.log(`Campaign ${campaignId} activated - scheduled emails will resume processing`);
      }

      // Update local state
      setCampaigns(campaigns.map(campaign => 
        campaign.id === campaignId 
          ? { ...campaign, status: newStatus, updated_at: new Date().toISOString() }
          : campaign
      ));

      toast({
        title: "Success",
        description: `Campaign ${newStatus === 'active' ? 'activated' : 'paused'} successfully`,
      });
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign status",
        variant: "destructive",
      });
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      setCampaigns(campaigns.filter(campaign => campaign.id !== campaignId));
      
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    }
  };

  const formatCampaignStatus = (status: string) => {
    switch (status) {
      case 'active':
        return { 
          label: 'Active', 
          variant: 'default' as const,
          className: 'bg-success text-success-foreground',
          icon: CheckCircle
        };
      case 'paused':
        return { 
          label: 'Paused', 
          variant: 'secondary' as const,
          className: 'bg-warning text-warning-foreground',
          icon: Pause
        };
      case 'draft':
        return { 
          label: 'Draft', 
          variant: 'outline' as const,
          className: 'bg-muted text-muted-foreground',
          icon: Edit
        };
      case 'completed':
        return { 
          label: 'Completed', 
          variant: 'default' as const,
          className: 'bg-primary text-primary-foreground',
          icon: CheckCircle
        };
      default:
        return { 
          label: status, 
          variant: 'outline' as const,
          className: 'bg-muted text-muted-foreground',
          icon: XCircle
        };
    }
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort emails with opened ones at the top
  const sortedEmails = [...emails].sort((a, b) => {
    // First, prioritize opened emails
    if (a.opened_at && !b.opened_at) return -1;
    if (!a.opened_at && b.opened_at) return 1;
    
    // If both are opened or both are not opened, sort by opened_at date (most recent first)
    if (a.opened_at && b.opened_at) {
      return new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime();
    }
    
    // If neither is opened, sort by sent_at date (most recent first)
    if (a.sent_at && b.sent_at) {
      return new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime();
    }
    
    // Fallback to created_at
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const filteredEmails = sortedEmails.filter(email =>
    email.email_sequence.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Emails</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your sent emails with opened emails shown first
          </p>
        </div>
        <Button 
          onClick={onCreateNew}
          className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-md"
        >
          <Mail className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Emails List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading emails...</p>
        </div>
      ) : filteredEmails.length > 0 ? (
        <div className="space-y-4">
          {filteredEmails.map((email) => {
            const getEmailStatus = () => {
              if (email.opened_at) {
                return { label: 'Opened', variant: 'default' as const, className: 'bg-success text-success-foreground', icon: Eye };
              }
              if (email.sent_at) {
                return { label: 'Sent', variant: 'secondary' as const, className: 'bg-muted text-muted-foreground', icon: Mail };
              }
              if (email.status === 'failed') {
                return { label: 'Failed', variant: 'destructive' as const, className: 'bg-destructive text-destructive-foreground', icon: XCircle };
              }
              return { label: 'Pending', variant: 'outline' as const, className: 'bg-warning text-warning-foreground', icon: Clock };
            };

            const statusInfo = getEmailStatus();
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={email.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg bg-gradient-card hover:shadow-md transition-shadow"
              >
                <div className="space-y-1 flex-1">
                  <h4 className="font-medium text-foreground">{email.email_sequence.subject}</h4>
                  <p className="text-sm text-muted-foreground">
                    To: {email.contact.first_name && email.contact.last_name 
                      ? `${email.contact.first_name} ${email.contact.last_name}` 
                      : email.contact.email}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      Campaign: {email.campaign.name}
                    </span>
                    {email.sent_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Sent {new Date(email.sent_at).toLocaleDateString()}
                      </span>
                    )}
                    {email.opened_at && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Opened {new Date(email.opened_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={statusInfo.variant}
                    className={statusInfo.className}
                  >
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusInfo.label}
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditCampaign?.(email.campaign_id)}
                      className="text-primary hover:text-primary-foreground hover:bg-primary"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit Campaign
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="text-center">
            <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchTerm ? "No emails found" : "No emails yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Get started by creating your first campaign to send emails"}
            </p>
            {!searchTerm && (
              <Button 
                onClick={onCreateNew}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              >
                Create Your First Campaign
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CampaignList;