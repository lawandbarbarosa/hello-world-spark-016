import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { 
  Mail, 
  User, 
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  Eye,
  MousePointer,
  Calendar,
  TrendingUp,
  Activity,
  Clock,
  BarChart3,
  Target
} from "lucide-react";

interface SenderAccount {
  id: string;
  email: string;
  provider: string;
  daily_limit: number;
  created_at: string;
  campaign_id: string | null;
  user_id: string;
}

interface DailyEmailStats {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
  failed: number;
}

interface SenderProfileStats {
  totalSent: number;
  totalFailed: number;
  totalOpened: number;
  totalClicked: number;
  successRate: number;
  openRate: number;
  clickRate: number;
  lastSentAt: string | null;
  todaySent: number;
  dailyStats: DailyEmailStats[];
  recentEmails: {
    id: string;
    status: string;
    sent_at: string | null;
    opened_at: string | null;
    clicked_at: string | null;
    created_at: string;
    contact: {
      email: string;
      first_name: string | null;
      last_name: string | null;
    };
    campaign: {
      name: string;
    };
    email_sequence: {
      subject: string;
    };
  }[];
}

interface SenderProfileProps {
  senderEmail: string;
  onBack: () => void;
}

const SenderProfile = ({ senderEmail, onBack }: SenderProfileProps) => {
  const { user } = useAuth();
  const [senderAccount, setSenderAccount] = useState<SenderAccount | null>(null);
  const [stats, setStats] = useState<SenderProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && senderEmail) {
      fetchSenderProfile();
    }
  }, [user, senderEmail]);

  const fetchSenderProfile = async () => {
    try {
      setLoading(true);

      // Fetch sender account details (get the first account with this email)
      const { data: accounts, error: accountError } = await supabase
        .from('sender_accounts')
        .select('*')
        .eq('email', senderEmail)
        .eq('user_id', user?.id)
        .limit(1);
      
      const account = accounts?.[0];

      if (accountError || !account) {
        console.error('Error fetching sender account:', accountError);
        toast({
          title: "Error",
          description: "Sender account not found",
          variant: "destructive",
        });
        return;
      }

      setSenderAccount(account);

      // Get all sender account IDs for this email address
      const { data: allAccounts, error: accountsError } = await supabase
        .from('sender_accounts')
        .select('id')
        .eq('email', senderEmail)
        .eq('user_id', user?.id);
      
      if (accountsError || !allAccounts) {
        console.error('Error fetching sender accounts:', accountsError);
        return;
      }
      
      const accountIds = allAccounts.map(acc => acc.id);

      // Fetch email sends for all accounts with this email address
      const { data: emailSends, error: emailError } = await supabase
        .from('email_sends')
        .select(`
          *,
          contacts(email, first_name, last_name),
          campaigns(name),
          email_sequences(subject)
        `)
        .in('sender_account_id', accountIds)
        .order('created_at', { ascending: false });

      if (emailError) {
        console.error('Error fetching email sends:', emailError);
        return;
      }

      // Calculate statistics
      const totalSent = emailSends?.filter(e => e.status === 'sent').length || 0;
      const totalFailed = emailSends?.filter(e => e.status === 'failed').length || 0;
      const totalOpened = emailSends?.filter(e => e.opened_at).length || 0;
      const totalClicked = emailSends?.filter(e => e.clicked_at).length || 0;
      const successRate = emailSends && emailSends.length > 0 ? Math.round((totalSent / emailSends.length) * 100) : 0;
      const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
      const clickRate = totalOpened > 0 ? Math.round((totalClicked / totalOpened) * 100) : 0;
      
      // Get last sent email date
      const sentEmails = emailSends?.filter(e => e.status === 'sent' && e.sent_at) || [];
      const lastSentAt = sentEmails.length > 0 ? sentEmails[0].sent_at : null;
      
      // Count today's emails
      const today = new Date().toISOString().split('T')[0];
      const todaySent = emailSends?.filter(e => 
        e.status === 'sent' && 
        e.sent_at && 
        e.sent_at.startsWith(today)
      ).length || 0;

      // Calculate daily stats only for days when emails were actually sent
      const dailyStats: DailyEmailStats[] = [];
      const dateStatsMap = new Map<string, { sent: number; opened: number; clicked: number; failed: number }>();

      // Group emails by date
      emailSends?.forEach(email => {
        if (email.sent_at) {
          const date = email.sent_at.split('T')[0];
          if (!dateStatsMap.has(date)) {
            dateStatsMap.set(date, { sent: 0, opened: 0, clicked: 0, failed: 0 });
          }
          
          const dayStats = dateStatsMap.get(date)!;
          if (email.status === 'sent') dayStats.sent++;
          if (email.status === 'failed') dayStats.failed++;
          if (email.opened_at) dayStats.opened++;
          if (email.clicked_at) dayStats.clicked++;
        }
      });

      // Convert map to array and sort by date (newest first)
      for (const [date, stats] of dateStatsMap.entries()) {
        dailyStats.push({
          date,
          sent: stats.sent,
          opened: stats.opened,
          clicked: stats.clicked,
          failed: stats.failed
        });
      }

      // Sort by date (newest first)
      dailyStats.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Get recent emails (last 10)
      const recentEmails = (emailSends || []).slice(0, 10).map(email => ({
        id: email.id,
        status: email.status,
        sent_at: email.sent_at,
        opened_at: email.opened_at,
        clicked_at: email.clicked_at,
        created_at: email.created_at,
        contact: {
          email: email.contacts?.email || 'Unknown',
          first_name: email.contacts?.first_name || null,
          last_name: email.contacts?.last_name || null,
        },
        campaign: {
          name: email.campaigns?.name || 'Unknown Campaign',
        },
        email_sequence: {
          subject: email.email_sequences?.subject || 'No Subject',
        },
      }));

      setStats({
        totalSent,
        totalFailed,
        totalOpened,
        totalClicked,
        successRate,
        openRate,
        clickRate,
        lastSentAt,
        todaySent,
        dailyStats, // Show newest to oldest
        recentEmails
      });

    } catch (error) {
      console.error('Error fetching sender profile:', error);
      toast({
        title: "Error",
        description: "Failed to load sender profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Senders
          </Button>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading sender profile...</p>
        </div>
      </div>
    );
  }

  if (!senderAccount || !stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Senders
          </Button>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Sender not found</h3>
            <p className="text-muted-foreground">The requested sender account could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Senders
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{senderAccount.email}</h1>
          <p className="text-muted-foreground mt-1">Sender Account Profile</p>
        </div>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Email Address</Label>
              <p className="text-foreground font-medium">{senderAccount.email}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Provider</Label>
              <Badge variant="outline" className="mt-1">
                {senderAccount.provider.toUpperCase()}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Daily Limit</Label>
              <p className="text-foreground font-medium">{senderAccount.daily_limit} emails/day</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Send className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Total Sent</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{stats.totalSent}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {stats.todaySent} sent today
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Success Rate</span>
            </div>
            <div className="text-3xl font-bold text-green-600">{stats.successRate}%</div>
            <div className="text-sm text-muted-foreground mt-1">
              {stats.totalFailed} failed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Open Rate</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">{stats.openRate}%</div>
            <div className="text-sm text-muted-foreground mt-1">
              {stats.totalOpened} opened
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-muted-foreground">Click Rate</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">{stats.clickRate}%</div>
            <div className="text-sm text-muted-foreground mt-1">
              {stats.totalClicked} clicked
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Email Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Daily Email Activity
          </CardTitle>
          <CardDescription>
            Track daily email sending patterns and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.dailyStats.length > 0 ? (
            <div className="space-y-4">
              {stats.dailyStats.map((day, index) => (
              <div key={day.date} className="flex items-center gap-4 p-3 border border-border rounded-lg">
                <div className="w-20 text-sm text-muted-foreground">
                  {new Date(day.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="flex-1 grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">{day.sent}</div>
                    <div className="text-xs text-muted-foreground">Sent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{day.opened}</div>
                    <div className="text-xs text-muted-foreground">Opened</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{day.clicked}</div>
                    <div className="text-xs text-muted-foreground">Clicked</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">{day.failed}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>
                <div className="w-32">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${day.sent > 0 ? Math.min((day.sent / senderAccount.daily_limit) * 100, 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 text-center">
                    {Math.round((day.sent / senderAccount.daily_limit) * 100)}% of limit
                  </div>
                </div>
              </div>
            ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No email activity yet</p>
              <p className="text-sm">Daily stats will appear here once emails are sent</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Emails */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Recent Emails
          </CardTitle>
          <CardDescription>
            Latest emails sent from this account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentEmails.map((email) => (
              <div key={email.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(email.status)}
                    <span className="font-medium text-foreground">{email.email_sequence.subject}</span>
                    <Badge className={`text-xs ${getStatusColor(email.status)}`}>
                      {email.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    To: {email.contact.first_name && email.contact.last_name 
                      ? `${email.contact.first_name} ${email.contact.last_name}` 
                      : email.contact.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Campaign: {email.campaign.name}
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {email.sent_at && (
                    <div>Sent: {new Date(email.sent_at).toLocaleDateString()}</div>
                  )}
                  {email.opened_at && (
                    <div className="text-green-600">Opened: {new Date(email.opened_at).toLocaleDateString()}</div>
                  )}
                  {email.clicked_at && (
                    <div className="text-blue-600">Clicked: {new Date(email.clicked_at).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SenderProfile;
