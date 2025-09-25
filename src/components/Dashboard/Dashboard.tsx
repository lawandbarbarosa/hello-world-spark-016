import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { 
  Mail, 
  Users, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Plus,
  Activity,
  Pause,
  Play,
  Trash2,
  Edit,
  AlertTriangle
} from "lucide-react";
import EmailFailureRate from "./EmailFailureRate";

interface DashboardProps {
  onNavigate?: (tab: string, campaignId?: string) => void;
}

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  totalCampaigns: number;
  activeContacts: number;
  emailsSent: number;
  emailsOpened: number;
  emailsFailed: number;
  responseRate: number; // This is now reply rate
  openRate: number; // Add separate open rate
  failureRate: number; // Add failure rate
}

const Dashboard = ({ onNavigate }: DashboardProps = {}) => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0,
    activeContacts: 0,
    emailsSent: 0,
    emailsOpened: 0,
    emailsFailed: 0,
    responseRate: 0,
    openRate: 0,
    failureRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch campaigns
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (campaignError) {
        console.error('Error fetching campaigns:', campaignError);
        toast({
          title: "Error",
          description: "Failed to fetch campaigns data",
          variant: "destructive",
        });
        return;
      }

      setCampaigns(campaignData || []);
      console.log('📊 Dashboard: Found campaigns:', campaignData?.length || 0);
      console.log('📊 Dashboard: Campaign IDs:', campaignData?.map(c => c.id) || []);

      // Fetch campaign statistics
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, replied_at')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      // Get email sends for campaigns - handle empty campaign list
      let emailSendsData = [];
      let emailSendsError = null;
      
      if (campaignData && campaignData.length > 0) {
        const { data, error } = await supabase
          .from('email_sends')
          .select('id, status, opened_at, campaign_id')
          .in('campaign_id', campaignData.map(c => c.id));
        
        emailSendsData = data || [];
        emailSendsError = error;
      } else {
        console.log('📊 Dashboard: No campaigns found, skipping email sends query');
      }

      if (contactsError || emailSendsError) {
        console.error('Error fetching stats:', { contactsError, emailSendsError });
      }

      console.log('📊 Dashboard: Email sends data:', emailSendsData?.length || 0);
      console.log('📊 Dashboard: Email sends details:', emailSendsData);

      const totalSent = emailSendsData?.filter(e => e.status === 'sent').length || 0;
      const totalOpened = emailSendsData?.filter(e => e.opened_at).length || 0;
      const totalFailed = emailSendsData?.filter(e => e.status === 'failed').length || 0;
      const totalContacted = contactsData?.length || 0;
      const totalReplied = contactsData?.filter(c => c.replied_at).length || 0;

      console.log('📊 Dashboard: Calculated stats:', {
        totalSent,
        totalOpened,
        totalFailed,
        totalContacted,
        totalReplied,
        emailSendsByStatus: emailSendsData?.reduce((acc, e) => {
          acc[e.status] = (acc[e.status] || 0) + 1;
          return acc;
        }, {}) || {}
      });
      
      const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
      const replyRate = totalContacted > 0 ? Math.round((totalReplied / totalContacted) * 100) : 0;
      const failureRate = emailSendsData && emailSendsData.length > 0 ? Math.round((totalFailed / emailSendsData.length) * 100) : 0;

      setStats({
        totalCampaigns: campaignData?.length || 0,
        activeContacts: totalContacted,
        emailsSent: totalSent,
        emailsOpened: totalOpened,
        emailsFailed: totalFailed,
        responseRate: replyRate, // This is now actually the reply rate
        openRate: openRate, // Add separate open rate
        failureRate: failureRate, // Add failure rate
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
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
        .update({ status: newStatus })
        .eq('id', campaignId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error updating campaign status:', error);
        toast({
          title: "Error",
          description: "Failed to update campaign status",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setCampaigns(campaigns.map(campaign => 
        campaign.id === campaignId 
          ? { ...campaign, status: newStatus, updated_at: new Date().toISOString() }
          : campaign
      ));

      toast({
        title: "Success",
        description: `Campaign ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      });

      // Refresh stats after status change
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating campaign status:', error);
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
        .eq('id', campaignId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error deleting campaign:', error);
        toast({
          title: "Error",
          description: "Failed to delete campaign",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setCampaigns(campaigns.filter(campaign => campaign.id !== campaignId));

      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });

      // Refresh stats after deletion
      fetchDashboardData();
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
      case 'draft':
        return { label: 'Draft', variant: 'secondary' as const, className: 'bg-muted text-muted-foreground' };
      case 'active':
        return { label: 'Active', variant: 'default' as const, className: 'bg-success text-success-foreground' };
      case 'completed':
        return { label: 'Completed', variant: 'outline' as const, className: 'bg-primary text-primary-foreground' };
      case 'paused':
        return { label: 'Paused', variant: 'secondary' as const, className: 'bg-warning text-warning-foreground' };
      default:
        return { label: status, variant: 'secondary' as const, className: 'bg-muted text-muted-foreground' };
    }
  };

  const dashboardStats = [
    {
      title: "Campaign Overview",
      metrics: [
        {
          label: "Total Campaigns",
          value: stats.totalCampaigns.toString(),
          change: stats.totalCampaigns > 0 ? `${stats.totalCampaigns} campaigns created` : "Create your first campaign",
          icon: Mail,
          color: "text-primary"
        },
        {
          label: "Emails Sent",
          value: stats.emailsSent.toString(),
          change: stats.emailsSent > 0 ? `${stats.emailsSent} emails delivered` : "No campaigns sent yet",
          icon: CheckCircle,
          color: "text-success"
        }
      ]
    },
    {
      title: "Contact Management",
      metrics: [
        {
          label: "Active Contacts",
          value: stats.activeContacts.toString(),
          change: stats.activeContacts > 0 ? `${stats.activeContacts} contacts ready` : "Upload contact lists",
          icon: Users,
          color: "text-success"
        }
      ]
    }
  ];

  const performanceStats = [
    {
      title: "Open Rate",
      value: `${stats.openRate}%`,
      change: stats.emailsOpened > 0 ? `${stats.emailsOpened} of ${stats.emailsSent} emails opened` : "No opens yet",
      icon: Eye,
      color: "text-primary"
    },
    {
      title: "Reply Rate", 
      value: `${stats.responseRate}%`,
      change: stats.responseRate > 0 ? `Contacts replied to your emails` : "No replies yet",
      icon: TrendingUp,
      color: "text-warning"
    },
    {
      title: "Failure Rate",
      value: `${stats.failureRate}%`,
      change: stats.emailsFailed > 0 ? `${stats.emailsFailed} emails failed to send` : "All emails delivered successfully",
      icon: AlertTriangle,
      color: stats.failureRate === 0 ? "text-success" : stats.failureRate <= 5 ? "text-warning" : "text-destructive"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your cold email campaigns and performance
          </p>
        </div>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline" 
          size="sm"
          disabled={loading}
        >
          <Activity className="w-4 h-4 mr-2" />
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Cards - Grouped Layout */}
      <div className="space-y-6">
        {/* Campaign & Contact Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {dashboardStats.map((statGroup, groupIndex) => (
            <Card key={groupIndex} className="bg-gradient-card border-border shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  {statGroup.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statGroup.metrics.map((metric, metricIndex) => {
                    const Icon = metric.icon;
                    return (
                      <div key={metricIndex} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-muted`}>
                            <Icon className={`h-4 w-4 ${metric.color}`} />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-muted-foreground">
                              {metric.label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {metric.change}
                            </div>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-foreground">
                          {metric.value}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Stats - Separated with Distance */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Email Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {performanceStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="bg-gradient-card border-border shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.change}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Email Failure Rate Component */}
      <EmailFailureRate onRefresh={fetchDashboardData} />

      {/* Recent Campaigns */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Your Campaigns
          </CardTitle>
          <CardDescription>
            All your email campaigns and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading campaigns...</p>
            </div>
          ) : campaigns.length > 0 ? (
            <div className="space-y-4">
              {campaigns.map((campaign) => {
                const statusInfo = formatCampaignStatus(campaign.status);
                return (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg bg-gradient-card"
                  >
                    <div className="space-y-1">
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
                          onClick={() => onNavigate?.('edit-campaign', campaign.id)}
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
                            Pause
                          </Button>
                        ) : campaign.status === 'paused' || campaign.status === 'draft' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCampaignStatus(campaign.id, 'active')}
                            className="text-success hover:text-success-foreground hover:bg-success"
                          >
                            Activate
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteCampaign(campaign.id)}
                          className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first campaign to see it here
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onNavigate?.('create-campaign')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;