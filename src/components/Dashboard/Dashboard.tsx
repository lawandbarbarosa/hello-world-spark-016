import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Users, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  Eye
} from "lucide-react";

const Dashboard = () => {
  // Reset stats for fresh start
  const stats = [
    {
      title: "Total Campaigns",
      value: "0",
      change: "Create your first campaign",
      icon: Mail,
      color: "text-primary"
    },
    {
      title: "Active Contacts",
      value: "0",
      change: "Upload contact lists",
      icon: Users,
      color: "text-success"
    },
    {
      title: "Response Rate",
      value: "0%",
      change: "Start sending campaigns",
      icon: TrendingUp,
      color: "text-warning"
    },
    {
      title: "Emails Sent",
      value: "0",
      change: "No campaigns yet",
      icon: CheckCircle,
      color: "text-success"
    }
  ];

  const recentCampaigns: any[] = [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your cold email campaigns and performance
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
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
            Recent Campaigns
          </CardTitle>
          <CardDescription>
            Your latest email campaign performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentCampaigns.length > 0 ? (
            <div className="space-y-4">
              {recentCampaigns.map((campaign, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-border rounded-lg bg-gradient-card"
                >
                  <div className="space-y-1">
                    <h4 className="font-medium text-foreground">{campaign.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {campaign.sent} sent
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {campaign.opened} opened
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {campaign.replied} replied
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={campaign.status === 'Active' ? 'default' : 'secondary'}
                      className={
                        campaign.status === 'Active' 
                          ? 'bg-success text-success-foreground'
                          : 'bg-warning text-warning-foreground'
                      }
                    >
                      {campaign.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(campaign.created).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground">
                Create your first campaign to see it here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;