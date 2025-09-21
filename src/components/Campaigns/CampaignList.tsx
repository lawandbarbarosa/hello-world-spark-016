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

interface CampaignListProps {
  onCreateNew: () => void;
  onEditCampaign?: (campaignId: string) => void;
}

const CampaignList = ({ onCreateNew, onEditCampaign }: CampaignListProps) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCampaigns();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your email campaigns
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
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Campaigns List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading campaigns...</p>
        </div>
      ) : filteredCampaigns.length > 0 ? (
        <div className="space-y-4">
          {filteredCampaigns.map((campaign) => {
            const statusInfo = formatCampaignStatus(campaign.status);
            return (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg bg-gradient-card hover:shadow-md transition-shadow"
              >
                <div className="space-y-1 flex-1">
                  <h4 className="font-medium text-foreground">{campaign.name}</h4>
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground">{campaign.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Created {new Date(campaign.created_at).toLocaleDateString()}
                    </span>
                    {campaign.updated_at !== campaign.created_at && (
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        Updated {new Date(campaign.updated_at).toLocaleDateString()}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      Opens tracked automatically
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={statusInfo.variant}
                    className={statusInfo.className}
                  >
                    {statusInfo.label}
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditCampaign?.(campaign.id)}
                      className="text-primary hover:text-primary-foreground hover:bg-primary"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    {campaign.status === 'active' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCampaignStatus(campaign.id, 'paused')}
                        className="text-warning hover:text-warning-foreground hover:bg-warning"
                      >
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </Button>
                    ) : campaign.status === 'paused' || campaign.status === 'draft' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCampaignStatus(campaign.id, 'active')}
                        className="text-success hover:text-success-foreground hover:bg-success"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Activate
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteCampaign(campaign.id)}
                      className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
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
              {searchTerm ? "No campaigns found" : "No campaigns yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Get started by creating your first campaign"}
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