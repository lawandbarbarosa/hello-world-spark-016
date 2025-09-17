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
  // Mock data for demo
  const stats = [
    {
      title: "Total Campaigns",
      value: "12",
      change: "+2 this month",
      icon: Mail,
      color: "text-primary"
    },
    {
      title: "Active Contacts",
      value: "2,847",
      change: "+324 this week",
      icon: Users,
      color: "text-success"
    },
    {
      title: "Response Rate",
      value: "23.4%",
      change: "+4.2% vs last month",
      icon: TrendingUp,
      color: "text-warning"
    },
    {
      title: "Emails Sent",
      value: "8,291",
      change: "In last 30 days",
      icon: CheckCircle,
      color: "text-success"
    }
  ];

  const recentCampaigns = [
    {
      name: "Product Launch Outreach",
      status: "Active",
      sent: 245,
      opened: 89,
      replied: 12,
      created: "2024-01-15"
    },
    {
      name: "Follow-up Sequence",
      status: "Paused",
      sent: 156,
      opened: 45,
      replied: 8,
      created: "2024-01-12"
    },
    {
      name: "Partnership Proposal",
      status: "Active",
      sent: 78,
      opened: 34,
      replied: 6,
      created: "2024-01-10"
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;