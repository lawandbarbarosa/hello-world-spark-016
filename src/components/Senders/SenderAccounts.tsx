import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import SenderProfile from "./SenderProfile";
import { 
  Mail, 
  User, 
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Send,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  Activity,
  Settings
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

interface GroupedSenderAccount {
  email: string;
  provider: string;
  daily_limit: number;
  first_created_at: string;
  campaign_ids: string[];
  total_accounts: number;
}

interface SenderStats {
  totalSent: number;
  totalFailed: number;
  totalOpened: number;
  totalClicked: number;
  successRate: number;
  openRate: number;
  clickRate: number;
  lastSentAt: string | null;
  todaySent: number;
  thisWeekSent: number;
  thisMonthSent: number;
  dateSpecificCounts: {
    [date: string]: {
      sent: number;
      opened: number;
      clicked: number;
      failed: number;
    };
  };
}

interface SentEmail {
  id: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  created_at: string;
  contact: {
    email: string;
    first_name: string;
    last_name: string;
  };
  campaign: {
    name: string;
  };
  email_sequence: {
    subject: string;
    body: string;
  };
}

const SenderAccounts = () => {
  const { user } = useAuth();
  const [senderAccounts, setSenderAccounts] = useState<SenderAccount[]>([]);
  const [groupedSenderAccounts, setGroupedSenderAccounts] = useState<GroupedSenderAccount[]>([]);
  const [senderStats, setSenderStats] = useState<Record<string, SenderStats>>({});
  const [senderEmails, setSenderEmails] = useState<Record<string, SentEmail[]>>({});
  const [expandedSenders, setExpandedSenders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSender, setEditingSender] = useState<SenderAccount | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    provider: 'gmail',
    dailyLimit: 50
  });

  useEffect(() => {
    if (user) {
      fetchSenderAccounts();
    }
  }, [user]);

  const fetchSenderAccounts = async () => {
    try {
      setLoading(true);

      // Fetch sender accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('sender_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (accountsError) {
        console.error('Error fetching sender accounts:', accountsError);
        toast({
          title: "Error",
          description: "Failed to fetch sender accounts",
          variant: "destructive",
        });
        return;
      }

      setSenderAccounts(accounts || []);

      // Group sender accounts by email address
      const groupedAccounts = groupSenderAccountsByEmail(accounts || []);
      setGroupedSenderAccounts(groupedAccounts);

      // Fetch stats and emails for each grouped sender account
      if (groupedAccounts && groupedAccounts.length > 0) {
        await fetchSenderStats(groupedAccounts);
      }

    } catch (error) {
      console.error('Error fetching sender accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load sender accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const groupSenderAccountsByEmail = (accounts: SenderAccount[]): GroupedSenderAccount[] => {
    const grouped = new Map<string, GroupedSenderAccount>();

    accounts.forEach(account => {
      if (grouped.has(account.email)) {
        const existing = grouped.get(account.email)!;
        existing.campaign_ids.push(account.campaign_id || '');
        existing.total_accounts += 1;
        // Keep the earliest creation date
        if (new Date(account.created_at) < new Date(existing.first_created_at)) {
          existing.first_created_at = account.created_at;
        }
      } else {
        grouped.set(account.email, {
          email: account.email,
          provider: account.provider,
          daily_limit: account.daily_limit,
          first_created_at: account.created_at,
          campaign_ids: [account.campaign_id || ''],
          total_accounts: 1
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) => 
      new Date(b.first_created_at).getTime() - new Date(a.first_created_at).getTime()
    );
  };

  const fetchSenderStats = async (groupedAccounts: GroupedSenderAccount[]) => {
    const stats: Record<string, SenderStats> = {};
    const emails: Record<string, SentEmail[]> = {};

    for (const groupedAccount of groupedAccounts) {
      // Get all sender account IDs for this email address
      const accountIds = senderAccounts
        .filter(acc => acc.email === groupedAccount.email)
        .map(acc => acc.id);

      if (accountIds.length === 0) continue;

      // Fetch email sends for all accounts with this email address
      const { data: emailSends, error } = await supabase
        .from('email_sends')
        .select(`
          *,
          contacts(email, first_name, last_name),
          campaigns(name),
          email_sequences(subject, body)
        `)
        .in('sender_account_id', accountIds)
        .order('created_at', { ascending: false });

      if (!error && emailSends) {
        const totalSent = emailSends.filter(e => e.status === 'sent').length;
        const totalFailed = emailSends.filter(e => e.status === 'failed').length;
        const totalOpened = emailSends.filter(e => e.opened_at).length;
        const totalClicked = emailSends.filter(e => e.clicked_at).length;
        const successRate = emailSends.length > 0 ? Math.round((totalSent / emailSends.length) * 100) : 0;
        const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
        const clickRate = totalOpened > 0 ? Math.round((totalClicked / totalOpened) * 100) : 0;
        
        // Get last sent email date
        const sentEmails = emailSends.filter(e => e.status === 'sent' && e.sent_at);
        const lastSentAt = sentEmails.length > 0 ? sentEmails[0].sent_at : null;
        
        // Count emails by time periods
        const today = new Date().toISOString().split('T')[0];
        const thisWeekStart = new Date();
        thisWeekStart.setDate(thisWeekStart.getDate() - 7);
        const thisMonthStart = new Date();
        thisMonthStart.setMonth(thisMonthStart.getMonth() - 1);
        
        const todaySent = emailSends.filter(e => 
          e.status === 'sent' && 
          e.sent_at && 
          e.sent_at.startsWith(today)
        ).length;
        
        const thisWeekSent = emailSends.filter(e => 
          e.status === 'sent' && 
          e.sent_at && 
          new Date(e.sent_at) >= thisWeekStart
        ).length;
        
        const thisMonthSent = emailSends.filter(e => 
          e.status === 'sent' && 
          e.sent_at && 
          new Date(e.sent_at) >= thisMonthStart
        ).length;

        // Calculate date-specific counts
        const dateSpecificCounts: { [date: string]: { sent: number; opened: number; clicked: number; failed: number; } } = {};
        emailSends.forEach(email => {
          if (email.sent_at) {
            const date = email.sent_at.split('T')[0];
            if (!dateSpecificCounts[date]) {
              dateSpecificCounts[date] = { sent: 0, opened: 0, clicked: 0, failed: 0 };
            }
            
            if (email.status === 'sent') dateSpecificCounts[date].sent++;
            if (email.status === 'failed') dateSpecificCounts[date].failed++;
            if (email.opened_at) dateSpecificCounts[date].opened++;
            if (email.clicked_at) dateSpecificCounts[date].clicked++;
          }
        });

        stats[groupedAccount.email] = {
          totalSent,
          totalFailed,
          totalOpened,
          totalClicked,
          successRate,
          openRate,
          clickRate,
          lastSentAt,
          todaySent,
          thisWeekSent,
          thisMonthSent,
          dateSpecificCounts
        };

        // Transform emails data
        emails[groupedAccount.email] = emailSends.map(email => ({
          id: email.id,
          status: email.status,
          sent_at: email.sent_at,
          opened_at: email.opened_at,
          created_at: email.created_at,
          contact: {
            email: email.contacts?.email || 'Unknown',
            first_name: email.contacts?.first_name || '',
            last_name: email.contacts?.last_name || '',
          },
          campaign: {
            name: email.campaigns?.name || 'Unknown Campaign',
          },
          email_sequence: {
            subject: email.email_sequences?.subject || 'No Subject',
            body: email.email_sequences?.body || 'No Content',
          },
        }));
      }
    }

    setSenderStats(stats);
    setSenderEmails(emails);
  };

  const handleAddSender = async () => {
    try {
      // Check if email already exists for this user
      const { data: existingAccount, error: checkError } = await supabase
        .from('sender_accounts')
        .select('id')
        .eq('user_id', user?.id)
        .eq('email', formData.email)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking for existing account:', checkError);
        toast({
          title: "Error",
          description: "Failed to verify sender account",
          variant: "destructive",
        });
        return;
      }

      if (existingAccount) {
        toast({
          title: "Account Already Exists",
          description: `The email ${formData.email} is already available in your sender accounts.`,
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('sender_accounts')
        .insert([{
          email: formData.email,
          provider: formData.provider,
          daily_limit: formData.dailyLimit,
          user_id: user?.id
        }]);

      if (error) {
        console.error('Error adding sender account:', error);
        toast({
          title: "Error",
          description: "Failed to add sender account",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Sender account added successfully",
      });

      setIsAddDialogOpen(false);
      setFormData({ email: '', provider: 'gmail', dailyLimit: 50 });
      fetchSenderAccounts();
    } catch (error) {
      console.error('Error adding sender account:', error);
      toast({
        title: "Error",
        description: "Failed to add sender account",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSender = async () => {
    if (!editingSender) return;

    try {
      const { error } = await supabase
        .from('sender_accounts')
        .update({
          email: formData.email,
          provider: formData.provider,
          daily_limit: formData.dailyLimit
        })
        .eq('id', editingSender.id)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error updating sender account:', error);
        toast({
          title: "Error",
          description: "Failed to update sender account",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Sender account updated successfully",
      });

      setEditingSender(null);
      setFormData({ email: '', provider: 'gmail', dailyLimit: 50 });
      fetchSenderAccounts();
    } catch (error) {
      console.error('Error updating sender account:', error);
      toast({
        title: "Error",
        description: "Failed to update sender account",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSender = async (senderId: string) => {
    if (!confirm('Are you sure you want to delete this sender account? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sender_accounts')
        .delete()
        .eq('id', senderId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error deleting sender account:', error);
        toast({
          title: "Error",
          description: "Failed to delete sender account",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Sender account deleted successfully",
      });

      fetchSenderAccounts();
    } catch (error) {
      console.error('Error deleting sender account:', error);
      toast({
        title: "Error",
        description: "Failed to delete sender account",
        variant: "destructive",
      });
    }
  };

  const toggleSenderExpansion = (senderId: string) => {
    const newExpanded = new Set(expandedSenders);
    if (newExpanded.has(senderId)) {
      newExpanded.delete(senderId);
    } else {
      newExpanded.add(senderId);
    }
    setExpandedSenders(newExpanded);
  };

  const openEditDialog = (sender: SenderAccount) => {
    setEditingSender(sender);
    setFormData({
      email: sender.email,
      provider: sender.provider,
      dailyLimit: sender.daily_limit
    });
  };

  const getStatusIcon = (status: string, openedAt: string | null) => {
    if (status === 'failed') {
      return <XCircle className="w-3 h-3 text-destructive" />;
    }
    if (status === 'sent') {
      if (openedAt) {
        return <Eye className="w-3 h-3 text-success" />;
      }
      return <CheckCircle className="w-3 h-3 text-primary" />;
    }
    return <Mail className="w-3 h-3 text-muted-foreground" />;
  };

  const personalizeContent = (content: string, contact: SentEmail['contact']) => {
    return content
      .replace(/\{\{firstName\}\}/g, contact.first_name || "")
      .replace(/\{\{lastName\}\}/g, contact.last_name || "")
      .replace(/\{\{email\}\}/g, contact.email);
  };

  // If viewing a profile, show the profile component
  if (viewingProfile) {
    return (
      <SenderProfile 
        senderEmail={viewingProfile} 
        onBack={() => setViewingProfile(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sender Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your email sender accounts and view their performance
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Sender Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Sender Account</DialogTitle>
              <DialogDescription>
                Add a new email account to send campaigns from
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="sender@yourdomain.com"
                />
              </div>
              <div>
                <Label htmlFor="provider">Provider</Label>
                <Select value={formData.provider} onValueChange={(value) => setFormData({ ...formData, provider: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail</SelectItem>
                    <SelectItem value="outlook">Outlook</SelectItem>
                    <SelectItem value="custom">Custom SMTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dailyLimit">Daily Sending Limit</Label>
                <Input
                  id="dailyLimit"
                  type="number"
                  value={formData.dailyLimit}
                  onChange={(e) => setFormData({ ...formData, dailyLimit: parseInt(e.target.value) || 50 })}
                  min="1"
                  max="500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddSender} disabled={!formData.email}>
                Add Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingSender} onOpenChange={() => setEditingSender(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sender Account</DialogTitle>
            <DialogDescription>
              Update your sender account settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-provider">Provider</Label>
              <Select value={formData.provider} onValueChange={(value) => setFormData({ ...formData, provider: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail">Gmail</SelectItem>
                  <SelectItem value="outlook">Outlook</SelectItem>
                  <SelectItem value="custom">Custom SMTP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-dailyLimit">Daily Sending Limit</Label>
              <Input
                id="edit-dailyLimit"
                type="number"
                value={formData.dailyLimit}
                onChange={(e) => setFormData({ ...formData, dailyLimit: parseInt(e.target.value) || 50 })}
                min="1"
                max="500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSender(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSender}>
              Update Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Sender Accounts ({senderAccounts.length})
          </CardTitle>
          <CardDescription>
            Your configured email sender accounts and their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading sender accounts...</p>
            </div>
          ) : groupedSenderAccounts.length > 0 ? (
            <div className="space-y-6">
              {/* Active Senders (accounts that have sent emails) */}
              {groupedSenderAccounts.filter(sender => {
                const stats = senderStats[sender.email];
                return stats && stats.totalSent > 0;
              }).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Activity className="w-5 h-5 text-success" />
                    Active Senders ({groupedSenderAccounts.filter(sender => {
                      const stats = senderStats[sender.email];
                      return stats && stats.totalSent > 0;
                    }).length})
                  </h3>
                  {groupedSenderAccounts
                    .filter(sender => {
                      const stats = senderStats[sender.email];
                      return stats && stats.totalSent > 0;
                    })
                    .map((sender) => {
                      const stats = senderStats[sender.email] || { 
                        totalSent: 0, totalFailed: 0, totalOpened: 0, totalClicked: 0,
                        successRate: 0, openRate: 0, clickRate: 0, lastSentAt: null, todaySent: 0,
                        thisWeekSent: 0, thisMonthSent: 0, dateSpecificCounts: {}
                      };
                      const emails = senderEmails[sender.email] || [];
                      const isExpanded = expandedSenders.has(sender.email);

                      return (
                        <div key={sender.email} className="border border-border rounded-lg bg-gradient-card">
                          <div className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <User className="w-5 h-5 text-primary" />
                                  <h4 className="font-semibold text-foreground text-lg">{sender.email}</h4>
                                  <Badge variant="outline" className="capitalize">
                                    {sender.provider}
                                  </Badge>
                                  {sender.total_accounts > 1 && (
                                    <Badge variant="secondary">
                                      {sender.total_accounts} campaigns
                                    </Badge>
                                  )}
                                  {stats.todaySent > 0 && (
                                    <Badge variant="default" className="bg-success text-success-foreground">
                                      {stats.todaySent} sent today
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* Enhanced Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-3">
                                  <div className="text-center p-3 bg-background/50 rounded-lg">
                                    <div className="text-2xl font-bold text-success">{stats.totalSent}</div>
                                    <div className="text-xs text-muted-foreground">Total Sent</div>
                                  </div>
                                  <div className="text-center p-3 bg-background/50 rounded-lg">
                                    <div className="text-2xl font-bold text-primary">{stats.totalOpened}</div>
                                    <div className="text-xs text-muted-foreground">Opened</div>
                                  </div>
                                  <div className="text-center p-3 bg-background/50 rounded-lg">
                                    <div className="text-2xl font-bold text-warning">{stats.totalClicked}</div>
                                    <div className="text-xs text-muted-foreground">Clicked</div>
                                  </div>
                                  <div className="text-center p-3 bg-background/50 rounded-lg">
                                    <div className="text-2xl font-bold text-destructive">{stats.totalFailed}</div>
                                    <div className="text-xs text-muted-foreground">Failed</div>
                                  </div>
                                  <div className="text-center p-3 bg-background/50 rounded-lg">
                                    <div className="text-2xl font-bold">{stats.openRate}%</div>
                                    <div className="text-xs text-muted-foreground">Open Rate</div>
                                  </div>
                                  <div className="text-center p-3 bg-background/50 rounded-lg">
                                    <div className="text-2xl font-bold">{stats.clickRate}%</div>
                                    <div className="text-xs text-muted-foreground">Click Rate</div>
                                  </div>
                                </div>

                                {/* Time Period Stats */}
                                <div className="grid grid-cols-3 gap-4 mb-3">
                                  <div className="text-center p-3 bg-background/30 rounded-lg border border-border">
                                    <div className="text-lg font-bold text-success">{stats.todaySent}</div>
                                    <div className="text-xs text-muted-foreground">Today</div>
                                  </div>
                                  <div className="text-center p-3 bg-background/30 rounded-lg border border-border">
                                    <div className="text-lg font-bold text-primary">{stats.thisWeekSent}</div>
                                    <div className="text-xs text-muted-foreground">This Week</div>
                                  </div>
                                  <div className="text-center p-3 bg-background/30 rounded-lg border border-border">
                                    <div className="text-lg font-bold text-blue-600">{stats.thisMonthSent}</div>
                                    <div className="text-xs text-muted-foreground">This Month</div>
                                  </div>
                                </div>

                                {/* Date-Specific Counts */}
                                {Object.keys(stats.dateSpecificCounts).length > 0 && (
                                  <div className="mb-3">
                                    <h5 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                                      <Calendar className="w-4 h-4" />
                                      Recent Activity by Date
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                                      {Object.entries(stats.dateSpecificCounts)
                                        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                                        .slice(0, 6)
                                        .map(([date, counts]) => (
                                          <div key={date} className="p-2 bg-background/20 rounded border text-xs">
                                            <div className="font-medium text-foreground">{new Date(date).toLocaleDateString()}</div>
                                            <div className="flex justify-between mt-1">
                                              <span className="text-success">S: {counts.sent}</span>
                                              <span className="text-primary">O: {counts.opened}</span>
                                              <span className="text-blue-600">C: {counts.clicked}</span>
                                              <span className="text-destructive">F: {counts.failed}</span>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                  <span>Daily Limit: {sender.daily_limit}</span>
                                  {stats.lastSentAt && (
                                    <span>Last Sent: {new Date(stats.lastSentAt).toLocaleDateString()}</span>
                                  )}
                                  <span>Added: {new Date(sender.first_created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setViewingProfile(sender.email)}
                                  className="text-primary hover:text-primary-foreground hover:bg-primary"
                                >
                                  <User className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Find the first sender account with this email for editing
                                    const firstAccount = senderAccounts.find(acc => acc.email === sender.email);
                                    if (firstAccount) openEditDialog(firstAccount);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Delete all accounts with this email
                                    const accountsToDelete = senderAccounts.filter(acc => acc.email === sender.email);
                                    accountsToDelete.forEach(acc => handleDeleteSender(acc.id));
                                  }}
                                  className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleSenderExpansion(sender.email)}
                                >
                                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </Button>
                              </div>
                            </div>
                          </div>

                          <Collapsible
                            open={isExpanded}
                            onOpenChange={() => toggleSenderExpansion(sender.email)}
                          >
                            <CollapsibleContent>
                              <div className="px-4 pb-4 border-t bg-background/50">
                                <div className="pt-4">
                                  <h4 className="font-medium mb-3 flex items-center gap-2">
                                    <Send className="w-4 h-4" />
                                    Email History ({emails.length})
                                  </h4>
                                  
                                  {emails.length > 0 ? (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                      {emails.map((email) => (
                                        <div key={email.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                                          <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {getStatusIcon(email.status, email.opened_at)}
                                            <div className="flex-1 min-w-0">
                                              <div className="font-medium truncate">
                                                {personalizeContent(email.email_sequence.subject, email.contact)}
                                              </div>
                                              <div className="text-sm text-muted-foreground">
                                                To: {email.contact.email} • {email.campaign.name}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {email.sent_at 
                                              ? new Date(email.sent_at).toLocaleDateString()
                                              : new Date(email.created_at).toLocaleDateString()
                                            }
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground text-center py-4">
                                      No emails sent from this account yet
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Unused Senders (accounts that haven't sent emails yet) */}
              {groupedSenderAccounts.filter(sender => {
                const stats = senderStats[sender.email];
                return !stats || stats.totalSent === 0;
              }).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Unused Senders ({groupedSenderAccounts.filter(sender => {
                      const stats = senderStats[sender.email];
                      return !stats || stats.totalSent === 0;
                    }).length})
                  </h3>
                  {groupedSenderAccounts
                    .filter(sender => {
                      const stats = senderStats[sender.email];
                      return !stats || stats.totalSent === 0;
                    })
                    .map((sender) => (
                      <div key={sender.email} className="border border-border rounded-lg bg-muted/30">
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <User className="w-5 h-5 text-muted-foreground" />
                                <h4 className="font-semibold text-foreground">{sender.email}</h4>
                                <Badge variant="outline" className="capitalize">
                                  {sender.provider}
                                </Badge>
                                {sender.total_accounts > 1 && (
                                  <Badge variant="secondary">
                                    {sender.total_accounts} campaigns
                                  </Badge>
                                )}
                                <Badge variant="secondary">No activity</Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Daily Limit: {sender.daily_limit}</span>
                                <span>Added: {new Date(sender.first_created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setViewingProfile(sender.email)}
                                  className="text-primary hover:text-primary-foreground hover:bg-primary"
                                >
                                  <User className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Find the first sender account with this email for editing
                                    const firstAccount = senderAccounts.find(acc => acc.email === sender.email);
                                    if (firstAccount) openEditDialog(firstAccount);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Delete all accounts with this email
                                    const accountsToDelete = senderAccounts.filter(acc => acc.email === sender.email);
                                    accountsToDelete.forEach(acc => handleDeleteSender(acc.id));
                                  }}
                                  className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No sender accounts yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first sender account to start sending campaigns
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Sender Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SenderAccounts;