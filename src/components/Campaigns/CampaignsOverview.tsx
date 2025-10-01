import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { 
  Target, 
  Mail, 
  Eye, 
  MousePointer,
  Calendar,
  Search,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Activity
} from "lucide-react";

interface CampaignStats {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  totalEmails: number;
  sentEmails: number;
  openedEmails: number;
  clickedEmails: number;
  failedEmails: number;
  openRate: number;
  clickRate: number;
  launchDate: string;
  endDate: string | null;
}

interface CampaignsOverviewProps {
  onCreateNew: () => void;
  onEditCampaign?: (campaignId: string) => void;
}

const CampaignsOverview = ({ onCreateNew, onEditCampaign }: CampaignsOverviewProps) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCampaignsWithStats();
    }
  }, [user]);

  const fetchCampaignsWithStats = async () => {
    try {
      setLoading(true);

      // First, get all campaigns for the user
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (campaignsError) {
        console.error('Error fetching campaigns:', campaignsError);
        toast({
          title: "Error",
          description: "Failed to load campaigns",
          variant: "destructive",
        });
        return;
      }

      // For each campaign, get email statistics
      const campaignsWithStats: CampaignStats[] = await Promise.all(
        (campaignsData || []).map(async (campaign) => {
          const { data: emailSends, error: emailError } = await supabase
            .from('email_sends')
            .select('status, sent_at, opened_at, clicked_at')
            .eq('campaign_id', campaign.id);

          if (emailError) {
            console.error('Error fetching email stats for campaign:', campaign.id, emailError);
            return {
              ...campaign,
              totalEmails: 0,
              sentEmails: 0,
              openedEmails: 0,
              clickedEmails: 0,
              failedEmails: 0,
              openRate: 0,
              clickRate: 0,
              launchDate: campaign.created_at,
              endDate: null
            };
          }

          const totalEmails = emailSends?.length || 0;
          const sentEmails = emailSends?.filter(e => e.sent_at).length || 0;
          const openedEmails = emailSends?.filter(e => e.opened_at).length || 0;
          const clickedEmails = emailSends?.filter(e => e.clicked_at).length || 0;
          const failedEmails = emailSends?.filter(e => e.status === 'failed').length || 0;
          
          const openRate = sentEmails > 0 ? Math.round((openedEmails / sentEmails) * 100) : 0;
          const clickRate = sentEmails > 0 ? Math.round((clickedEmails / sentEmails) * 100) : 0;

          // Determine launch and end dates
          const launchDate = campaign.created_at;
          const endDate = campaign.status === 'completed' ? campaign.updated_at : null;

          return {
            ...campaign,
            totalEmails,
            sentEmails,
            openedEmails,
            clickedEmails,
            failedEmails,
            openRate,
            clickRate,
            launchDate,
            endDate
          };
        })
      );

      setCampaigns(campaignsWithStats);
    } catch (error) {
      console.error('Error fetching campaigns with stats:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          icon: Clock
        };
      case 'draft':
        return { 
          label: 'Draft', 
          variant: 'outline' as const,
          className: 'bg-muted text-muted-foreground',
          icon: Activity
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
            Overview of your email campaigns with performance statistics
          </p>
        </div>
        <Button 
          onClick={onCreateNew}
          className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-md"
        >
          <Target className="w-4 h-4 mr-2" />
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
            const StatusIcon = statusInfo.icon;

            return (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-primary" />
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        <Badge
                          variant={statusInfo.variant}
                          className={statusInfo.className}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                      {campaign.description && (
                        <CardDescription className="mb-3">
                          {campaign.description}
                        </CardDescription>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditCampaign?.(campaign.id)}
                      className="text-primary hover:text-primary-foreground hover:bg-primary"
                    >
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Statistics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Mail className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Total Emails</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">{campaign.totalEmails}</div>
                    </div>
                    
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Eye className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">Open Rate</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600">{campaign.openRate}%</div>
                    </div>
                    
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <MousePointer className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium">Click Rate</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">{campaign.clickRate}%</div>
                    </div>
                    
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium">Sent</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-600">{campaign.sentEmails}</div>
                    </div>
                  </div>

                  {/* Detailed Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Launched:</span>
                      <span className="font-medium">{new Date(campaign.launchDate).toLocaleDateString()}</span>
                    </div>
                    
                    {campaign.endDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Ended:</span>
                        <span className="font-medium">{new Date(campaign.endDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Opened:</span>
                      <span className="font-medium">{campaign.openedEmails} of {campaign.sentEmails}</span>
                    </div>
                  </div>

                  {/* Progress Bars */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Open Rate</span>
                      <span>{campaign.openRate}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(campaign.openRate, 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Click Rate</span>
                      <span>{campaign.clickRate}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(campaign.clickRate, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="text-center">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
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

export default CampaignsOverview;
