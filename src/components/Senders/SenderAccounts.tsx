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

interface SenderStats {
  totalSent: number;
  totalFailed: number;
  totalOpened: number;
  successRate: number;
  openRate: number;
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
  const [senderStats, setSenderStats] = useState<Record<string, SenderStats>>({});
  const [senderEmails, setSenderEmails] = useState<Record<string, SentEmail[]>>({});
  const [expandedSenders, setExpandedSenders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
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

      // Fetch stats and emails for each sender account
      if (accounts && accounts.length > 0) {
        await fetchSenderStats(accounts);
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

  const fetchSenderStats = async (accounts: SenderAccount[]) => {
    const stats: Record<string, SenderStats> = {};
    const emails: Record<string, SentEmail[]> = {};

    for (const account of accounts) {
      // Fetch email sends for this sender
      const { data: emailSends, error } = await supabase
        .from('email_sends')
        .select(`
          *,
          contacts(email, first_name, last_name),
          campaigns(name),
          email_sequences(subject, body)
        `)
        .eq('sender_account_id', account.id)
        .order('created_at', { ascending: false });

      if (!error && emailSends) {
        const totalSent = emailSends.filter(e => e.status === 'sent').length;
        const totalFailed = emailSends.filter(e => e.status === 'failed').length;
        const totalOpened = emailSends.filter(e => e.opened_at).length;
        const successRate = emailSends.length > 0 ? Math.round((totalSent / emailSends.length) * 100) : 0;
        const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

        stats[account.id] = {
          totalSent,
          totalFailed,
          totalOpened,
          successRate,
          openRate
        };

        // Transform emails data
        emails[account.id] = emailSends.map(email => ({
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
          ) : senderAccounts.length > 0 ? (
            <div className="space-y-4">
              {senderAccounts.map((sender) => {
                const stats = senderStats[sender.id] || { totalSent: 0, totalFailed: 0, totalOpened: 0, successRate: 0, openRate: 0 };
                const emails = senderEmails[sender.id] || [];
                const isExpanded = expandedSenders.has(sender.id);

                return (
                  <div key={sender.id} className="border border-border rounded-lg bg-gradient-card">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <User className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold text-foreground">{sender.email}</h3>
                            <Badge variant="outline" className="capitalize">
                              {sender.provider}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Sent:</span>
                              <div className="font-medium text-success">{stats.totalSent}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Failed:</span>
                              <div className="font-medium text-destructive">{stats.totalFailed}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Opened:</span>
                              <div className="font-medium text-primary">{stats.totalOpened}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Success Rate:</span>
                              <div className="font-medium">{stats.successRate}%</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Open Rate:</span>
                              <div className="font-medium flex items-center gap-1">
                                {stats.openRate}%
                                {stats.openRate > 0 && <Eye className="w-3 h-3 text-success" />}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>Daily Limit: {sender.daily_limit}</span>
                            <span>Added: {new Date(sender.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(sender)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSender(sender.id)}
                            className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSenderExpansion(sender.id)}
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Collapsible
                      open={isExpanded}
                      onOpenChange={() => toggleSenderExpansion(sender.id)}
                    >
                      <CollapsibleContent>
                        <div className="px-4 pb-4 border-t bg-background/50">
                          <div className="pt-4">
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <Send className="w-4 h-4" />
                              Emails Sent ({emails.length})
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