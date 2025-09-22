import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { 
  AlertTriangle, 
  XCircle, 
  TrendingDown, 
  RefreshCw,
  Mail,
  Clock,
  CheckCircle,
  Info
} from "lucide-react";

interface FailureStats {
  totalEmails: number;
  failedEmails: number;
  successRate: number;
  failureRate: number;
  recentFailures: Array<{
    id: string;
    contact_email: string;
    campaign_name: string;
    error_message: string;
    created_at: string;
  }>;
}

interface EmailFailureRateProps {
  onRefresh?: () => void;
}

const EmailFailureRate = ({ onRefresh }: EmailFailureRateProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<FailureStats>({
    totalEmails: 0,
    failedEmails: 0,
    successRate: 0,
    failureRate: 0,
    recentFailures: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFailureStats();
    }
  }, [user]);

  const fetchFailureStats = async () => {
    try {
      setLoading(true);

      // Get all campaigns for the user
      const { data: campaigns, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, name')
        .eq('user_id', user?.id);

      if (campaignError) {
        console.error('Error fetching campaigns:', campaignError);
        return;
      }

      const campaignIds = campaigns?.map(c => c.id) || [];

      if (campaignIds.length === 0) {
        setStats({
          totalEmails: 0,
          failedEmails: 0,
          successRate: 0,
          failureRate: 0,
          recentFailures: []
        });
        return;
      }

      // Get all email sends for user's campaigns
      const { data: emailSends, error: emailSendsError } = await supabase
        .from('email_sends')
        .select(`
          id,
          status,
          error_message,
          created_at,
          contacts!inner(email),
          campaigns!inner(name)
        `)
        .in('campaign_id', campaignIds)
        .order('created_at', { ascending: false });

      if (emailSendsError) {
        console.error('Error fetching email sends:', emailSendsError);
        toast({
          title: "Error",
          description: "Failed to fetch email failure data",
          variant: "destructive",
        });
        return;
      }

      const totalEmails = emailSends?.length || 0;
      const failedEmails = emailSends?.filter(e => e.status === 'failed').length || 0;
      const successRate = totalEmails > 0 ? Math.round(((totalEmails - failedEmails) / totalEmails) * 100) : 100;
      const failureRate = totalEmails > 0 ? Math.round((failedEmails / totalEmails) * 100) : 0;

      // Get recent failures (last 10)
      const recentFailures = emailSends
        ?.filter(e => e.status === 'failed')
        .slice(0, 10)
        .map(email => ({
          id: email.id,
          contact_email: email.contacts?.email || 'Unknown',
          campaign_name: email.campaigns?.name || 'Unknown Campaign',
          error_message: email.error_message || 'Unknown error',
          created_at: email.created_at
        })) || [];

      setStats({
        totalEmails,
        failedEmails,
        successRate,
        failureRate,
        recentFailures
      });

    } catch (error) {
      console.error('Error fetching failure stats:', error);
      toast({
        title: "Error",
        description: "Failed to load email failure data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFailureRateColor = (rate: number) => {
    if (rate === 0) return "text-success";
    if (rate <= 5) return "text-warning";
    if (rate <= 15) return "text-orange-500";
    return "text-destructive";
  };

  const getFailureRateBadge = (rate: number) => {
    if (rate === 0) return { variant: "default" as const, className: "bg-success text-success-foreground" };
    if (rate <= 5) return { variant: "secondary" as const, className: "bg-warning text-warning-foreground" };
    if (rate <= 15) return { variant: "outline" as const, className: "bg-orange-100 text-orange-800 border-orange-300" };
    return { variant: "destructive" as const, className: "bg-destructive text-destructive-foreground" };
  };

  const getFailureRateMessage = (rate: number) => {
    if (rate === 0) return "Perfect delivery rate!";
    if (rate <= 5) return "Good delivery rate";
    if (rate <= 15) return "Moderate failure rate - monitor closely";
    return "High failure rate - immediate attention needed";
  };

  const handleRefresh = () => {
    fetchFailureStats();
    onRefresh?.();
  };

  return (
    <div className="space-y-6">
      {/* Main Failure Rate Card */}
      <Card className="bg-gradient-card border-border shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Email Failure Rate
              </CardTitle>
              <CardDescription>
                Monitor email delivery success and failure rates
              </CardDescription>
            </div>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading failure data...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Main Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground">{stats.failureRate}%</div>
                  <div className="text-sm text-muted-foreground">Failure Rate</div>
                  <Badge 
                    variant={getFailureRateBadge(stats.failureRate).variant}
                    className={`mt-2 ${getFailureRateBadge(stats.failureRate).className}`}
                  >
                    {getFailureRateMessage(stats.failureRate)}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-success">{stats.successRate}%</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {stats.totalEmails - stats.failedEmails} of {stats.totalEmails} emails delivered
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-destructive">{stats.failedEmails}</div>
                  <div className="text-sm text-muted-foreground">Failed Emails</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Out of {stats.totalEmails} total emails
                  </div>
                </div>
              </div>

              {/* Visual Indicators */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Success Rate</span>
                      <span>{stats.successRate}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-success h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stats.successRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Failure Rate</span>
                      <span>{stats.failureRate}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          stats.failureRate === 0 ? 'bg-success' :
                          stats.failureRate <= 5 ? 'bg-warning' :
                          stats.failureRate <= 15 ? 'bg-orange-500' : 'bg-destructive'
                        }`}
                        style={{ width: `${stats.failureRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Message */}
              <div className={`p-4 rounded-lg border ${
                stats.failureRate === 0 ? 'bg-success/10 border-success/20' :
                stats.failureRate <= 5 ? 'bg-warning/10 border-warning/20' :
                stats.failureRate <= 15 ? 'bg-orange-100 border-orange-200' : 'bg-destructive/10 border-destructive/20'
              }`}>
                <div className="flex items-center gap-2">
                  {stats.failureRate === 0 ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : stats.failureRate <= 5 ? (
                    <Info className="w-5 h-5 text-warning" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  )}
                  <div>
                    <div className="font-medium text-foreground">
                      {stats.failureRate === 0 ? 'Excellent Delivery' :
                       stats.failureRate <= 5 ? 'Good Delivery' :
                       stats.failureRate <= 15 ? 'Monitor Delivery' : 'Delivery Issues Detected'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getFailureRateMessage(stats.failureRate)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Failures */}
      {stats.recentFailures.length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Recent Failures ({stats.recentFailures.length})
            </CardTitle>
            <CardDescription>
              Latest email delivery failures and their error messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentFailures.map((failure) => (
                <div 
                  key={failure.id}
                  className="p-4 border border-destructive/20 rounded-lg bg-destructive/5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-4 h-4 text-destructive" />
                        <span className="font-medium text-foreground">{failure.contact_email}</span>
                        <Badge variant="outline" className="text-xs">
                          {failure.campaign_name}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(failure.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-destructive bg-destructive/10 p-2 rounded border">
                        <strong>Error:</strong> {failure.error_message}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Failures Message */}
      {!loading && stats.failedEmails === 0 && stats.totalEmails > 0 && (
        <Card className="shadow-md">
          <CardContent className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Perfect Delivery!</h3>
            <p className="text-muted-foreground">
              All {stats.totalEmails} emails have been delivered successfully. No failures detected.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Emails Message */}
      {!loading && stats.totalEmails === 0 && (
        <Card className="shadow-md">
          <CardContent className="text-center py-8">
            <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No emails sent yet</h3>
            <p className="text-muted-foreground">
              Launch your first campaign to see email delivery statistics here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmailFailureRate;
