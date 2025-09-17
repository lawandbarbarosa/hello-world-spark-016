import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Mail, 
  Search, 
  RefreshCw, 
  User, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Reply
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ContactWithEmails {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  status: string;
  replied_at: string | null;
  created_at: string;
  campaign_name: string | null;
  email_sends: {
    status: string;
    sent_at: string | null;
    opened_at: string | null;
    clicked_at: string | null;
    error_message: string | null;
  }[];
}

const ContactsList = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactWithEmails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchContacts = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Fetch contacts with their email sends and campaign info
      const { data: contactsData, error } = await supabase
        .from('contacts')
        .select(`
          id,
          first_name,
          last_name,
          email,
          status,
          replied_at,
          created_at,
          campaigns!inner(name),
          email_sends(
            status,
            sent_at,
            opened_at,
            clicked_at,
            error_message
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contacts:', error);
        toast.error('Failed to load contacts');
        return;
      }

      // Transform the data to match our interface
      const transformedContacts: ContactWithEmails[] = contactsData?.map(contact => ({
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        status: contact.status,
        replied_at: contact.replied_at,
        created_at: contact.created_at,
        campaign_name: contact.campaigns?.name || null,
        email_sends: contact.email_sends || []
      })) || [];

      setContacts(transformedContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [user?.id]);

  const getContactDisplayName = (contact: ContactWithEmails) => {
    if (contact.first_name || contact.last_name) {
      return `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    }
    return contact.email.split('@')[0];
  };

  const getEmailStatus = (emailSends: ContactWithEmails['email_sends']) => {
    if (!emailSends || emailSends.length === 0) {
      return { status: 'none', label: 'No emails sent', color: 'secondary' };
    }

    const latestSend = emailSends[emailSends.length - 1];
    
    if (latestSend.status === 'failed') {
      return { status: 'failed', label: 'Failed', color: 'destructive' };
    }
    
    if (latestSend.clicked_at) {
      return { status: 'clicked', label: 'Clicked', color: 'default' };
    }
    
    if (latestSend.opened_at) {
      return { status: 'opened', label: 'Opened', color: 'default' };
    }
    
    if (latestSend.sent_at) {
      return { status: 'sent', label: 'Sent', color: 'secondary' };
    }
    
    return { status: 'pending', label: 'Pending', color: 'outline' };
  };

  const getStatusIcon = (emailSends: ContactWithEmails['email_sends']) => {
    const { status } = getEmailStatus(emailSends);
    
    switch (status) {
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'clicked':
      case 'opened':
        return <Eye className="h-4 w-4" />;
      case 'sent':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const displayName = getContactDisplayName(contact);
    const searchLower = searchTerm.toLowerCase();
    return (
      displayName.toLowerCase().includes(searchLower) ||
      contact.email.toLowerCase().includes(searchLower) ||
      contact.campaign_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your contacts and track email engagement
          </p>
        </div>
        <Button onClick={fetchContacts} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact List
          </CardTitle>
          <CardDescription>
            View all your contacts and their email engagement status
          </CardDescription>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts by name, email, or campaign..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm ? 'No contacts found' : 'No contacts yet'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms' : 'Start by creating a campaign and uploading contacts'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Email Status</TableHead>
                  <TableHead>Replied</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => {
                  const emailStatus = getEmailStatus(contact.email_sends);
                  return (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {getContactDisplayName(contact)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {contact.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.campaign_name ? (
                          <Badge variant="outline">
                            {contact.campaign_name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(contact.email_sends)}
                          <Badge variant={emailStatus.color as any}>
                            {emailStatus.label}
                          </Badge>
                          {contact.email_sends.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({contact.email_sends.length} sent)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.replied_at ? (
                          <div className="flex items-center gap-2">
                            <Reply className="h-4 w-4 text-green-600" />
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Replied
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No reply</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(contact.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactsList;