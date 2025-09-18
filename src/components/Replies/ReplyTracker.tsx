import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { 
  Reply, 
  Mail, 
  CheckCircle,
  Clock,
  Search,
  Send,
  User,
  Calendar
} from "lucide-react";

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  replied_at: string | null;
  campaign_id: string;
  campaign: {
    id: string;
    name: string;
  };
}

const ReplyTracker = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testCampaignId, setTestCampaignId] = useState("");
  const [markingReply, setMarkingReply] = useState(false);

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);

  const fetchContacts = async () => {
    try {
      setLoading(true);

      const { data: contactsData, error } = await supabase
        .from('contacts')
        .select(`
          id,
          email,
          first_name,
          last_name,
          replied_at,
          campaign_id,
          campaigns!inner(id, name, user_id)
        `)
        .eq('campaigns.user_id', user?.id)
        .eq('status', 'active')
        .order('replied_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching contacts:', error);
        toast({
          title: "Error",
          description: "Failed to fetch contacts",
          variant: "destructive",
        });
        return;
      }

      const transformedContacts: Contact[] = (contactsData || []).map(contact => ({
        id: contact.id,
        email: contact.email,
        first_name: contact.first_name,
        last_name: contact.last_name,
        replied_at: contact.replied_at,
        campaign_id: contact.campaign_id,
        campaign: {
          id: contact.campaigns.id,
          name: contact.campaigns.name,
        }
      }));

      setContacts(transformedContacts);

    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markContactReplied = async (contactEmail: string, campaignId: string) => {
    try {
      setMarkingReply(true);

      // Call the handle-email-reply edge function
      const { data, error } = await supabase.functions.invoke('handle-email-reply', {
        body: {
          contactEmail,
          campaignId,
          replyData: {
            subject: "Manual Reply Tracking",
            body: "Reply manually marked by user",
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) {
        console.error('Error marking contact as replied:', error);
        toast({
          title: "Error",
          description: "Failed to mark contact as replied",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Contact ${contactEmail} marked as replied`,
      });

      // Refresh contacts list
      fetchContacts();

    } catch (error) {
      console.error('Error marking contact as replied:', error);
      toast({
        title: "Error",
        description: "Failed to mark contact as replied",
        variant: "destructive",
      });
    } finally {
      setMarkingReply(false);
    }
  };

  const handleManualReplyMark = async () => {
    if (!testEmail || !testCampaignId) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and campaign ID",
        variant: "destructive",
      });
      return;
    }

    await markContactReplied(testEmail, testCampaignId);
    setTestEmail("");
    setTestCampaignId("");
  };

  const filteredContacts = contacts.filter(contact =>
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.first_name && contact.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (contact.last_name && contact.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    contact.campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const repliedContacts = filteredContacts.filter(contact => contact.replied_at);
  const unrepliedContacts = filteredContacts.filter(contact => !contact.replied_at);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reply Tracker</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage email replies from your contacts
          </p>
        </div>
        <Button 
          onClick={fetchContacts} 
          variant="outline" 
          size="sm"
          disabled={loading}
        >
          <Reply className="w-4 h-4 mr-2" />
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Manual Reply Marking */}
      <Card className="border-dashed border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Manual Reply Tracking
          </CardTitle>
          <CardDescription>
            Test the reply tracking system or manually mark contacts as replied
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Contact Email</label>
              <Input
                type="email"
                placeholder="contact@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Campaign ID</label>
              <Input
                placeholder="Select from campaigns below"
                value={testCampaignId}
                onChange={(e) => setTestCampaignId(e.target.value)}
              />
            </div>
          </div>
          <Button 
            onClick={handleManualReplyMark}
            disabled={markingReply || !testEmail || !testCampaignId}
            className="w-full"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {markingReply ? 'Marking as Replied...' : 'Mark as Replied'}
          </Button>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredContacts.length}</div>
            <p className="text-xs text-muted-foreground">
              Active campaign contacts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Replied</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{repliedContacts.length}</div>
            <p className="text-xs text-muted-foreground">
              {filteredContacts.length > 0 
                ? `${Math.round((repliedContacts.length / filteredContacts.length) * 100)}% reply rate`
                : '0% reply rate'
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No Reply</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unrepliedContacts.length}</div>
            <p className="text-xs text-muted-foreground">
              Waiting for replies
            </p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading contacts...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Replied Contacts */}
          {repliedContacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  Replied Contacts ({repliedContacts.length})
                </CardTitle>
                <CardDescription>
                  Contacts who have replied to your emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {repliedContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg bg-success/5"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <div>
                          <div className="font-medium text-foreground">
                            {contact.first_name || contact.last_name 
                              ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                              : contact.email
                            }
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {contact.email} • {contact.campaign.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-success text-success-foreground">
                          <Reply className="w-3 h-3 mr-1" />
                          Replied
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          {contact.replied_at && new Date(contact.replied_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unreplied Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                Awaiting Replies ({unrepliedContacts.length})
              </CardTitle>
              <CardDescription>
                Contacts who haven't replied yet - click to manually mark as replied
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unrepliedContacts.length > 0 ? (
                <div className="space-y-3">
                  {unrepliedContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg bg-background hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-foreground">
                            {contact.first_name || contact.last_name 
                              ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                              : contact.email
                            }
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {contact.email} • {contact.campaign.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Campaign ID: {contact.campaign_id}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markContactReplied(contact.email, contact.campaign_id)}
                          disabled={markingReply}
                        >
                          <Reply className="w-3 h-3 mr-1" />
                          Mark as Replied
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">All contacts have replied!</h3>
                  <p className="text-muted-foreground">
                    Great job! All your contacts have responded to your campaigns.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ReplyTracker;