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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Mail, 
  Search, 
  RefreshCw, 
  User, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Reply,
  ChevronRight,
  Calendar
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
    id: string;
    status: string;
    sent_at: string | null;
    opened_at: string | null;
    error_message: string | null;
    campaign_name: string | null;
    sequence_step: number | null;
  }[];
}

interface GroupedContact {
  email: string;
  first_name: string | null;
  last_name: string | null;
  total_emails_sent: number;
  campaigns: string[];
  replied_at: string | null;
  latest_status: string;
  email_sends: ContactWithEmails['email_sends'];
  created_at: string;
}

const ContactsList = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<GroupedContact[]>([]);
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
            id,
            status,
            sent_at,
            opened_at,
            error_message,
            campaigns!inner(name),
            email_sequences!inner(step_number)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contacts:', error);
        toast.error('Failed to load contacts');
        return;
      }

      // Group contacts by email
      const contactsMap = new Map<string, GroupedContact>();
      
      contactsData?.forEach(contact => {
        const email = contact.email;
        
        if (contactsMap.has(email)) {
          const existing = contactsMap.get(email)!;
          // Add email sends to existing contact
          if (contact.email_sends) {
            existing.email_sends.push(...contact.email_sends.map(send => ({
              id: send.id,
              status: send.status,
              sent_at: send.sent_at,
              opened_at: send.opened_at,
              error_message: send.error_message,
              campaign_name: send.campaigns?.name || null,
              sequence_step: send.email_sequences?.step_number || null
            })));
          }
          // Add campaigns
          if (contact.campaigns?.name && !existing.campaigns.includes(contact.campaigns.name)) {
            existing.campaigns.push(contact.campaigns.name);
          }
          // Update total emails sent
          existing.total_emails_sent = existing.email_sends.length;
          // Update replied_at if this contact replied
          if (contact.replied_at && !existing.replied_at) {
            existing.replied_at = contact.replied_at;
          }
        } else {
          // Create new grouped contact
          const emailSends = contact.email_sends?.map(send => ({
            id: send.id,
            status: send.status,
            sent_at: send.sent_at,
            opened_at: send.opened_at,
            error_message: send.error_message,
            campaign_name: send.campaigns?.name || null,
            sequence_step: send.email_sequences?.step_number || null
          })) || [];

          const groupedContact: GroupedContact = {
            email: contact.email,
            first_name: contact.first_name,
            last_name: contact.last_name,
            total_emails_sent: emailSends.length,
            campaigns: contact.campaigns?.name ? [contact.campaigns.name] : [],
            replied_at: contact.replied_at,
            latest_status: contact.status,
            email_sends: emailSends,
            created_at: contact.created_at
          };
          
          contactsMap.set(email, groupedContact);
        }
      });

      setContacts(Array.from(contactsMap.values()));
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

  const getContactDisplayName = (contact: GroupedContact) => {
    if (contact.first_name || contact.last_name) {
      return `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    }
    return contact.email.split('@')[0];
  };

  const getEmailStatus = (emailSends: GroupedContact['email_sends']) => {
    if (!emailSends || emailSends.length === 0) {
      return { status: 'none', label: 'No emails sent', color: 'secondary' };
    }

    // Check for any replied emails first
    const hasReplied = emailSends.some(send => send.sent_at);
    if (hasReplied) {
      return { status: 'replied', label: 'Replied', color: 'default' };
    }

    // Find the most recent interaction
    const latestSend = emailSends.reduce((latest, current) => {
      if (!latest) return current;
      if (current.sent_at && (!latest.sent_at || current.sent_at > latest.sent_at)) {
        return current;
      }
      return latest;
    }, emailSends[0]);
    
    if (latestSend.status === 'failed') {
      return { status: 'failed', label: 'Failed', color: 'destructive' };
    }
    
    if (latestSend.opened_at) {
      return { status: 'opened', label: 'Opened', color: 'default' };
    }
    
    if (latestSend.sent_at) {
      return { status: 'sent', label: 'Sent', color: 'secondary' };
    }
    
    return { status: 'pending', label: 'Pending', color: 'outline' };
  };

  const getStatusIcon = (emailSends: GroupedContact['email_sends']) => {
    const { status } = getEmailStatus(emailSends);
    
    switch (status) {
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'replied':
        return <Reply className="h-4 w-4" />;
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
      contact.campaigns.some(campaign => campaign.toLowerCase().includes(searchLower))
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
                  <TableHead>Campaigns</TableHead>
                  <TableHead>Email Status</TableHead>
                  <TableHead>Emails Sent</TableHead>
                  <TableHead>Replied</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact, index) => {
                  const emailStatus = getEmailStatus(contact.email_sends);
                  return (
                    <TableRow key={`${contact.email}-${index}`}>
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
                        {contact.campaigns.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {contact.campaigns.map((campaign, idx) => (
                              <Badge key={idx} variant="outline">
                                {campaign}
                              </Badge>
                            ))}
                          </div>
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
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {contact.total_emails_sent}
                        </Badge>
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
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                {getContactDisplayName(contact)}
                              </DialogTitle>
                              <DialogDescription>
                                Email history for {contact.email}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Contact Information</h4>
                                  <div className="space-y-1 text-sm">
                                    <p><span className="font-medium">Email:</span> {contact.email}</p>
                                    <p><span className="font-medium">Name:</span> {getContactDisplayName(contact)}</p>
                                    <p><span className="font-medium">Campaigns:</span> {contact.campaigns.join(', ') || 'None'}</p>
                                    <p><span className="font-medium">Total Emails:</span> {contact.total_emails_sent}</p>
                                    <p><span className="font-medium">Replied:</span> {contact.replied_at ? 'Yes' : 'No'}</p>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Status Summary</h4>
                                  <div className="space-y-1 text-sm">
                                    <p><span className="font-medium">Sent:</span> {contact.email_sends.filter(s => s.sent_at).length}</p>
                                    <p><span className="font-medium">Opened:</span> {contact.email_sends.filter(s => s.opened_at).length}</p>
                                    <p><span className="font-medium">Failed:</span> {contact.email_sends.filter(s => s.status === 'failed').length}</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold mb-2">Email History</h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Campaign</TableHead>
                                      <TableHead>Step</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Sent</TableHead>
                                      <TableHead>Opened</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {contact.email_sends
                                      .sort((a, b) => (b.sent_at || '').localeCompare(a.sent_at || ''))
                                      .map((send, sendIdx) => (
                                      <TableRow key={send.id || sendIdx}>
                                        <TableCell>
                                          {send.campaign_name ? (
                                            <Badge variant="outline">{send.campaign_name}</Badge>
                                          ) : (
                                            <span className="text-muted-foreground">-</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {send.sequence_step ? (
                                            <Badge variant="secondary">Step {send.sequence_step}</Badge>
                                          ) : (
                                            <span className="text-muted-foreground">-</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            {send.status === 'failed' && <XCircle className="h-4 w-4 text-destructive" />}
                                            {send.opened_at && <Eye className="h-4 w-4 text-secondary" />}
                                            {send.sent_at && !send.opened_at && <CheckCircle className="h-4 w-4 text-muted-foreground" />}
                                            {!send.sent_at && <Clock className="h-4 w-4 text-muted-foreground" />}
                                            <Badge variant={
                                              send.status === 'failed' ? 'destructive' :
                                              send.opened_at ? 'secondary' :
                                              send.sent_at ? 'outline' : 'secondary'
                                            }>
                                              {send.status === 'failed' ? 'Failed' :
                                               send.opened_at ? 'Opened' :
                                               send.sent_at ? 'Sent' : 'Pending'}
                                            </Badge>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                          {send.sent_at ? (
                                            <div className="flex items-center gap-1">
                                              <Calendar className="h-3 w-3" />
                                              {new Date(send.sent_at).toLocaleString()}
                                            </div>
                                          ) : (
                                            <span>-</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                          {send.opened_at ? (
                                            <div className="flex items-center gap-1">
                                              <Calendar className="h-3 w-3" />
                                              {new Date(send.opened_at).toLocaleString()}
                                            </div>
                                          ) : (
                                            <span>-</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                          {send.opened_at ? (
                                            <div className="flex items-center gap-1">
                                              <Calendar className="h-3 w-3" />
                                              {new Date(send.opened_at).toLocaleString()}
                                            </div>
                                          ) : (
                                            <span>-</span>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                                {contact.email_sends.length === 0 && (
                                  <div className="text-center py-4 text-muted-foreground">
                                    No emails sent to this contact yet
                                  </div>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
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