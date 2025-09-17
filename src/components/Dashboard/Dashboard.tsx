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
  Activity
} from "lucide-react";

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
  responseRate: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0,
    activeContacts: 0,
    emailsSent: 0,
    emailsOpened: 0,
    responseRate: 0,
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

      // Fetch campaign statistics
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      const { data: emailSendsData, error: emailSendsError } = await supabase
        .from('email_sends')
        .select('id, status, opened_at')
        .in('campaign_id', campaignData?.map(c => c.id) || []);

      if (contactsError || emailSendsError) {
        console.error('Error fetching stats:', { contactsError, emailSendsError });
      }

      const totalSent = emailSendsData?.filter(e => e.status === 'sent').length || 0;
      const totalOpened = emailSendsData?.filter(e => e.opened_at).length || 0;
      const responseRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

      setStats({
        totalCampaigns: campaignData?.length || 0,
        activeContacts: contactsData?.length || 0,
        emailsSent: totalSent,
        emailsOpened: totalOpened,
        responseRate,
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
      title: "Total Campaigns",
      value: stats.totalCampaigns.toString(),
      change: stats.totalCampaigns > 0 ? `${stats.totalCampaigns} campaigns created` : "Create your first campaign",
      icon: Mail,
      color: "text-primary"
    },
    {
      title: "Active Contacts",
      value: stats.activeContacts.toString(),
      change: stats.activeContacts > 0 ? `${stats.activeContacts} contacts ready` : "Upload contact lists",
      icon: Users,
      color: "text-success"
    },
    {
      title: "Response Rate",
      value: `${stats.responseRate}%`,
      change: stats.emailsSent > 0 ? `${stats.emailsOpened} of ${stats.emailsSent} opened` : "Start sending campaigns",
      icon: TrendingUp,
      color: "text-warning"
    },
    {
      title: "Emails Sent",
      value: stats.emailsSent.toString(),
      change: stats.emailsSent > 0 ? `${stats.emailsSent} emails delivered` : "No campaigns sent yet",
      icon: CheckCircle,
      color: "text-success"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => {
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
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={statusInfo.variant}
                        className={statusInfo.className}
                      >
                        {statusInfo.label}
                      </Badge>
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
              <Button variant="outline" size="sm">
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