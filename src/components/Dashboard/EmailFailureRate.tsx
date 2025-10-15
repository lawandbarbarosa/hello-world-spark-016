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
  successfulEmails: number;
  failedEmails: number;
  bouncedEmails: number;
  rejectedEmails: number;
  invalidAddressEmails: number;
  blockedEmails: number;
  spamEmails: number;
  rateLimitedEmails: number;
  authenticationErrors: number;
  networkErrors: number;
  domainErrors: number;
  contentFilteredEmails: number;
  unknownErrors: number;
  successRate: number;
  failureRate: number;
  bounceRate: number;
  rejectionRate: number;
  recentFailures: Array<{
    id: string;
    contact_email: string;
    campaign_name: string;
    status: string;
    failure_category: string | null;
    failure_reason: string | null;
    bounce_type: string | null;
    rejection_reason: string | null;
    error_message: string | null;
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
    successfulEmails: 0,
    failedEmails: 0,
    bouncedEmails: 0,
    rejectedEmails: 0,
    invalidAddressEmails: 0,
    blockedEmails: 0,
    spamEmails: 0,
    rateLimitedEmails: 0,
    authenticationErrors: 0,
    networkErrors: 0,
    domainErrors: 0,
    contentFilteredEmails: 0,
    unknownErrors: 0,
    successRate: 0,
    failureRate: 0,
    bounceRate: 0,
    rejectionRate: 0,
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

      // Try to get detailed failure statistics using the new database function
      const { data: failureStats, error: statsError } = await supabase
        .rpc('get_email_failure_stats' as any, {
          user_id_param: user?.id
        }) as { data: any, error: any };

      if (statsError) {
        // If the function doesn't exist or any other error, fall back to basic stats
        console.log('Using basic failure stats (advanced functions not available)');
        await fetchBasicFailureStats();
        return;
      }

      const stats = failureStats?.[0];
      if (!stats) {
        setStats({
          totalEmails: 0,
          successfulEmails: 0,
          failedEmails: 0,
          bouncedEmails: 0,
          rejectedEmails: 0,
          invalidAddressEmails: 0,
          blockedEmails: 0,
          spamEmails: 0,
          rateLimitedEmails: 0,
          authenticationErrors: 0,
          networkErrors: 0,
          domainErrors: 0,
          contentFilteredEmails: 0,
          unknownErrors: 0,
          successRate: 0,
          failureRate: 0,
          bounceRate: 0,
          rejectionRate: 0,
          recentFailures: []
        });
        return;
      }

      // Get recent failures by category
      const { data: recentFailures, error: failuresError } = await supabase
        .rpc('get_recent_failures_by_category' as any, {
          user_id_param: user?.id,
          limit_count: 10
        }) as { data: any, error: any };

      if (failuresError) {
        console.log('Using basic recent failures (advanced functions not available)');
        // If function doesn't exist, we'll use empty array - the basic stats will handle recent failures
      }

      setStats({
        totalEmails: Number(stats.total_emails) || 0,
        successfulEmails: Number(stats.successful_emails) || 0,
        failedEmails: Number(stats.failed_emails) || 0,
        bouncedEmails: Number(stats.bounced_emails) || 0,
        rejectedEmails: Number(stats.rejected_emails) || 0,
        invalidAddressEmails: Number(stats.invalid_address_emails) || 0,
        blockedEmails: Number(stats.blocked_emails) || 0,
        spamEmails: Number(stats.spam_emails) || 0,
        rateLimitedEmails: Number(stats.rate_limited_emails) || 0,
        authenticationErrors: Number(stats.authentication_errors) || 0,
        networkErrors: Number(stats.network_errors) || 0,
        domainErrors: Number(stats.domain_errors) || 0,
        contentFilteredEmails: Number(stats.content_filtered_emails) || 0,
        unknownErrors: Number(stats.unknown_errors) || 0,
        successRate: Number(stats.overall_failure_rate) ? 100 - Number(stats.overall_failure_rate) : 100,
        failureRate: Number(stats.overall_failure_rate) || 0,
        bounceRate: Number(stats.bounce_rate) || 0,
        rejectionRate: Number(stats.rejection_rate) || 0,
        recentFailures: recentFailures || []
      });

    } catch (error) {
      console.error('Error fetching failure stats:', error);
      // Fall back to basic stats on any error
      await fetchBasicFailureStats();
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

  const getFailureRateBadge = (rate: number, totalEmails: number) => {
    if (totalEmails === 0) return { variant: "secondary" as const, className: "bg-muted text-muted-foreground" };
    if (rate === 0) return { variant: "default" as const, className: "bg-success text-success-foreground" };
    if (rate <= 5) return { variant: "secondary" as const, className: "bg-warning text-warning-foreground" };
    if (rate <= 15) return { variant: "outline" as const, className: "bg-orange-100 text-orange-800 border-orange-300" };
    return { variant: "destructive" as const, className: "bg-destructive text-destructive-foreground" };
  };

  const getFailureRateMessage = (rate: number, totalEmails: number) => {
    // Don't show positive messages if no emails have been sent
    if (totalEmails === 0) return "No emails sent yet";
    if (rate === 0) return "Perfect delivery rate!";
    if (rate <= 5) return "Good delivery rate";
    if (rate <= 15) return "Moderate failure rate - monitor closely";
    return "High failure rate - immediate attention needed";
  };

  const getFailureCategoryColor = (category: string | null) => {
    switch (category) {
      case 'invalid_address': return 'text-red-600';
      case 'bounced': return 'text-orange-600';
      case 'rejected': return 'text-yellow-600';
      case 'blocked': return 'text-purple-600';
      case 'spam': return 'text-pink-600';
      case 'rate_limited': return 'text-blue-600';
      case 'authentication': return 'text-indigo-600';
      case 'network': return 'text-gray-600';
      case 'domain_issue': return 'text-teal-600';
      case 'content_filtered': return 'text-amber-600';
      default: return 'text-gray-500';
    }
  };

  const getFailureCategoryIcon = (category: string | null) => {
    switch (category) {
      case 'invalid_address': return '📧';
      case 'bounced': return '↩️';
      case 'rejected': return '❌';
      case 'blocked': return '🚫';
      case 'spam': return '📮';
      case 'rate_limited': return '⏱️';
      case 'authentication': return '🔐';
      case 'network': return '🌐';
      case 'domain_issue': return '🏠';
      case 'content_filtered': return '🔍';
      default: return '❓';
    }
  };

  const fetchBasicFailureStats = async () => {
    try {
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
          successfulEmails: 0,
          failedEmails: 0,
          bouncedEmails: 0,
          rejectedEmails: 0,
          invalidAddressEmails: 0,
          blockedEmails: 0,
          spamEmails: 0,
          rateLimitedEmails: 0,
          authenticationErrors: 0,
          networkErrors: 0,
          domainErrors: 0,
          contentFilteredEmails: 0,
          unknownErrors: 0,
          successRate: 0,
          failureRate: 0,
          bounceRate: 0,
          rejectionRate: 0,
          recentFailures: []
        });
        return;
      }

      // Use count queries to avoid 1000 row limit
      const orCondition = campaignIds.length > 0 
        ? `campaign_id.in.(${campaignIds.join(',')}),campaign_id.is.null`
        : 'campaign_id.is.null';

      // Get counts for different email statuses
      const [totalCountResult, successfulCountResult, failedCountResult, pendingCountResult] = await Promise.all([
        supabase
          .from('email_sends')
          .select('*', { count: 'exact', head: true })
          .or(orCondition),
        supabase
          .from('email_sends')
          .select('*', { count: 'exact', head: true })
          .or(orCondition)
          .eq('status', 'sent'),
        supabase
          .from('email_sends')
          .select('*', { count: 'exact', head: true })
          .or(orCondition)
          .eq('status', 'failed'),
        supabase
          .from('email_sends')
          .select('*', { count: 'exact', head: true })
          .or(orCondition)
          .eq('status', 'pending')
      ]);

      if (totalCountResult.error || successfulCountResult.error || failedCountResult.error || pendingCountResult.error) {
        console.error('Error fetching email send counts:', {
          totalError: totalCountResult.error,
          successfulError: successfulCountResult.error,
          failedError: failedCountResult.error,
          pendingError: pendingCountResult.error
        });
        return;
      }

      const totalEmails = totalCountResult.count || 0;
      const successfulEmails = successfulCountResult.count || 0;
      const failedEmails = failedCountResult.count || 0;
      const pendingEmails = pendingCountResult.count || 0;
      const successRate = totalEmails > 0 ? Math.round((successfulEmails / totalEmails) * 100) : 100;
      const failureRate = totalEmails > 0 ? Math.round((failedEmails / totalEmails) * 100) : 0;

      // Debug logging to identify stuck emails
      if (pendingEmails > 0) {
        console.warn(`Found ${pendingEmails} emails stuck in pending status`);
      }

      // Get recent failures (last 10) - this query can be limited to 10 records
      const { data: recentFailuresData, error: recentFailuresError } = await supabase
        .from('email_sends')
        .select(`
          id,
          status,
          error_message,
          created_at,
          campaign_id,
          contacts(email),
          campaigns(name)
        `)
        .or(orCondition)
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(10);

      const recentFailures = recentFailuresData?.map(email => ({
        id: email.id,
        contact_email: email.contacts?.email || 'Unknown',
        campaign_name: email.campaigns?.name || (email.campaign_id ? 'Unknown Campaign' : 'Direct Email'),
        status: email.status,
        failure_category: null,
        failure_reason: null,
        bounce_type: null,
        rejection_reason: null,
        error_message: email.error_message || 'Unknown error',
        created_at: email.created_at
      })) || [];

      setStats({
        totalEmails,
        successfulEmails,
        failedEmails,
        bouncedEmails: 0,
        rejectedEmails: 0,
        invalidAddressEmails: 0,
        blockedEmails: 0,
        spamEmails: 0,
        rateLimitedEmails: 0,
        authenticationErrors: 0,
        networkErrors: 0,
        domainErrors: 0,
        contentFilteredEmails: 0,
        unknownErrors: failedEmails,
        successRate,
        failureRate,
        bounceRate: 0,
        rejectionRate: 0,
        recentFailures
      });

    } catch (error) {
      console.error('Error fetching basic failure stats:', error);
      // Set empty stats if everything fails
      setStats({
        totalEmails: 0,
        successfulEmails: 0,
        failedEmails: 0,
        bouncedEmails: 0,
        rejectedEmails: 0,
        invalidAddressEmails: 0,
        blockedEmails: 0,
        spamEmails: 0,
        rateLimitedEmails: 0,
        authenticationErrors: 0,
        networkErrors: 0,
        domainErrors: 0,
        contentFilteredEmails: 0,
        unknownErrors: 0,
        successRate: 0,
        failureRate: 0,
        bounceRate: 0,
        rejectionRate: 0,
        recentFailures: []
      });
    }
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground">{stats.failureRate}%</div>
                  <div className="text-sm text-muted-foreground">Overall Failure Rate</div>
                  <Badge 
                    variant={getFailureRateBadge(stats.failureRate, stats.totalEmails).variant}
                    className={`mt-2 ${getFailureRateBadge(stats.failureRate, stats.totalEmails).className}`}
                  >
                    {getFailureRateMessage(stats.failureRate, stats.totalEmails)}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-success">{stats.successRate}%</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {stats.successfulEmails} of {stats.totalEmails} emails delivered
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{stats.bounceRate}%</div>
                  <div className="text-sm text-muted-foreground">Bounce Rate</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {stats.bouncedEmails} emails bounced
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{stats.rejectionRate}%</div>
                  <div className="text-sm text-muted-foreground">Rejection Rate</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {stats.rejectedEmails} emails rejected
                  </div>
                </div>
              </div>

              {/* Detailed Failure Breakdown */}
              {stats.failedEmails > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-foreground mb-4">Failure Breakdown</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.invalidAddressEmails > 0 && (
                      <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">📧</span>
                          <span className="font-medium text-red-800">Invalid Address</span>
                        </div>
                        <div className="text-2xl font-bold text-red-600">{stats.invalidAddressEmails}</div>
                        <div className="text-xs text-red-600">Wrong email format</div>
                      </div>
                    )}
                    {stats.bouncedEmails > 0 && (
                      <div className="p-3 border border-orange-200 rounded-lg bg-orange-50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">↩️</span>
                          <span className="font-medium text-orange-800">Bounced</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-600">{stats.bouncedEmails}</div>
                        <div className="text-xs text-orange-600">Mailbox issues</div>
                      </div>
                    )}
                    {stats.rejectedEmails > 0 && (
                      <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">❌</span>
                          <span className="font-medium text-yellow-800">Rejected</span>
                        </div>
                        <div className="text-2xl font-bold text-yellow-600">{stats.rejectedEmails}</div>
                        <div className="text-xs text-yellow-600">Server rejection</div>
                      </div>
                    )}
                    {stats.blockedEmails > 0 && (
                      <div className="p-3 border border-purple-200 rounded-lg bg-purple-50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">🚫</span>
                          <span className="font-medium text-purple-800">Blocked</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-600">{stats.blockedEmails}</div>
                        <div className="text-xs text-purple-600">IP/domain blocked</div>
                      </div>
                    )}
                    {stats.spamEmails > 0 && (
                      <div className="p-3 border border-pink-200 rounded-lg bg-pink-50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">📮</span>
                          <span className="font-medium text-pink-800">Spam</span>
                        </div>
                        <div className="text-2xl font-bold text-pink-600">{stats.spamEmails}</div>
                        <div className="text-xs text-pink-600">Marked as spam</div>
                      </div>
                    )}
                    {stats.rateLimitedEmails > 0 && (
                      <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">⏱️</span>
                          <span className="font-medium text-blue-800">Rate Limited</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">{stats.rateLimitedEmails}</div>
                        <div className="text-xs text-blue-600">Quota exceeded</div>
                      </div>
                    )}
                    {stats.authenticationErrors > 0 && (
                      <div className="p-3 border border-indigo-200 rounded-lg bg-indigo-50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">🔐</span>
                          <span className="font-medium text-indigo-800">Auth Error</span>
                        </div>
                        <div className="text-2xl font-bold text-indigo-600">{stats.authenticationErrors}</div>
                        <div className="text-xs text-indigo-600">Credential issue</div>
                      </div>
                    )}
                    {stats.networkErrors > 0 && (
                      <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">🌐</span>
                          <span className="font-medium text-gray-800">Network</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-600">{stats.networkErrors}</div>
                        <div className="text-xs text-gray-600">Connection issue</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                stats.totalEmails === 0 ? 'bg-muted/10 border-muted/20' :
                stats.failureRate === 0 ? 'bg-success/10 border-success/20' :
                stats.failureRate <= 5 ? 'bg-warning/10 border-warning/20' :
                stats.failureRate <= 15 ? 'bg-orange-100 border-orange-200' : 'bg-destructive/10 border-destructive/20'
              }`}>
                <div className="flex items-center gap-2">
                  {stats.totalEmails === 0 ? (
                    <Mail className="w-5 h-5 text-muted-foreground" />
                  ) : stats.failureRate === 0 ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : stats.failureRate <= 5 ? (
                    <Info className="w-5 h-5 text-warning" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  )}
                  <div>
                    <div className="font-medium text-foreground">
                      {stats.totalEmails === 0 ? 'No Email History' :
                       stats.failureRate === 0 ? 'Excellent Delivery' :
                       stats.failureRate <= 5 ? 'Good Delivery' :
                       stats.failureRate <= 15 ? 'Monitor Delivery' : 'Delivery Issues Detected'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getFailureRateMessage(stats.failureRate, stats.totalEmails)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


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
