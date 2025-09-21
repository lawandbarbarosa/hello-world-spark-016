import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Users, Mail, Settings, Eye, Trash2, Plus } from "lucide-react";
import EmailSequence from "./EmailSequence";
import ContactUpload from "./ContactUpload";
import SenderAccounts from "./SenderAccounts";
import AddContacts from "./AddContacts";

interface EditCampaignProps {
  campaignId: string;
  onBack: () => void;
}

interface CampaignData {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  senderAccounts: any[];
  contacts: any[];
  sequence: any[];
}

const EditCampaign = ({ campaignId, onBack }: EditCampaignProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [showAddContacts, setShowAddContacts] = useState(false);
  const [contactSearchTerm, setContactSearchTerm] = useState("");

  useEffect(() => {
    if (campaignId && user) {
      loadCampaignData();
    }
  }, [campaignId, user]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);

      // Fetch campaign details
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', user.id)
        .single();

      if (campaignError) throw campaignError;

      // Fetch related data
      const [contactsResult, sequenceResult, senderAccountsResult] = await Promise.all([
        supabase.from('contacts').select('*').eq('campaign_id', campaignId),
        supabase.from('email_sequences').select('*').eq('campaign_id', campaignId).order('step_number'),
        supabase.from('sender_accounts').select('*').eq('campaign_id', campaignId)
      ]);

      if (contactsResult.error) throw contactsResult.error;
      if (sequenceResult.error) throw sequenceResult.error;
      if (senderAccountsResult.error) throw senderAccountsResult.error;

      // Format sequence data to match EmailSequence component structure
      const formattedSequence = sequenceResult.data?.map(seq => ({
        id: seq.id,
        subject: seq.subject,
        body: seq.body,
        delay: seq.delay_amount || 0,
        delayUnit: seq.delay_unit || 'days',
        scheduledDate: seq.scheduled_date ? new Date(seq.scheduled_date) : undefined,
        scheduledTime: seq.scheduled_time || undefined
      })) || [];

      setCampaignData({
        ...campaign,
        contacts: contactsResult.data || [],
        sequence: formattedSequence,
        senderAccounts: senderAccountsResult.data || []
      });

    } catch (error) {
      console.error('Error loading campaign:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCampaignData = (updates: Partial<CampaignData>) => {
    setCampaignData(prev => prev ? { ...prev, ...updates } : null);
  };

  const saveCampaign = async () => {
    if (!campaignData) return;

    try {
      setSaving(true);

      // Update campaign basic info
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update({
          name: campaignData.name,
          description: campaignData.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (campaignError) throw campaignError;

      // Update email sequences - preserve existing data and only update what changed
      if (campaignData.sequence.length > 0) {
        // Get existing sequences to preserve IDs and relationships
        const { data: existingSequences } = await supabase
          .from('email_sequences')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('step_number');

        // Update existing sequences or create new ones
        for (let i = 0; i < campaignData.sequence.length; i++) {
          const step = campaignData.sequence[i];
          const existingSequence = existingSequences?.find(seq => seq.step_number === i + 1);

          const sequenceData = {
            campaign_id: campaignId,
            step_number: i + 1,
            subject: step.subject,
            body: step.body,
            delay_amount: step.delay,
            delay_unit: step.delayUnit,
            scheduled_date: step.scheduledDate ? step.scheduledDate.toISOString().split('T')[0] : null,
            scheduled_time: step.scheduledTime || null
          };

          if (existingSequence) {
            // Update existing sequence
            const { error: updateError } = await supabase
              .from('email_sequences')
              .update(sequenceData)
              .eq('id', existingSequence.id);

            if (updateError) throw updateError;
          } else {
            // Insert new sequence
            const { error: insertError } = await supabase
              .from('email_sequences')
              .insert(sequenceData);

            if (insertError) throw insertError;
          }
        }

        // Remove any sequences that were deleted (if the new sequence is shorter)
        if (existingSequences && existingSequences.length > campaignData.sequence.length) {
          const sequencesToDelete = existingSequences.slice(campaignData.sequence.length);
          for (const sequenceToDelete of sequencesToDelete) {
            await supabase
              .from('email_sequences')
              .delete()
              .eq('id', sequenceToDelete.id);
          }
        }
      }

      toast({
        title: "Success",
        description: "Campaign updated successfully",
      });

      // Only update the updated_at timestamp without reloading all data
      setCampaignData(prev => prev ? { ...prev, updated_at: new Date().toISOString() } : null);

    } catch (error) {
      console.error('Error saving campaign:', error);
      toast({
        title: "Error",
        description: "Failed to save campaign changes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleContactsAdded = (newContacts: any[]) => {
    setCampaignData(prev => prev ? {
      ...prev,
      contacts: [...prev.contacts, ...newContacts]
    } : null);
    setShowAddContacts(false);
  };

  const deleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      // Update local state
      setCampaignData(prev => prev ? {
        ...prev,
        contacts: prev.contacts.filter(c => c.id !== contactId)
      } : null);

      toast({
        title: "Success",
        description: "Contact removed from campaign",
      });

    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: "Error",
        description: "Failed to remove contact",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (!campaignData) {
    return (
      <div className="text-center py-12">
        <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Campaign not found</h3>
        <p className="text-muted-foreground mb-4">
          The campaign you're trying to edit doesn't exist or you don't have permission to edit it.
        </p>
        <Button onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Campaigns
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edit Campaign</h1>
            <p className="text-muted-foreground">
              Modify your campaign details, contacts, and email sequences
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={campaignData.status === 'active' ? 'default' : 'secondary'}>
            {campaignData.status}
          </Badge>
          <Button 
            onClick={saveCampaign} 
            disabled={saving}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Campaign Editor Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Contacts ({campaignData.contacts.length})
          </TabsTrigger>
          <TabsTrigger value="sequence" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Sequence ({campaignData.sequence.length})
          </TabsTrigger>
          <TabsTrigger value="senders" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Sender Accounts
          </TabsTrigger>
        </TabsList>

        {/* Campaign Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card className="bg-gradient-card border-border">
            <CardHeader>
              <CardTitle>Campaign Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={campaignData.name}
                  onChange={(e) => updateCampaignData({ name: e.target.value })}
                  placeholder="Enter campaign name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={campaignData.description}
                  onChange={(e) => updateCampaignData({ description: e.target.value })}
                  placeholder="Describe your campaign"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <strong>Created:</strong> {new Date(campaignData.created_at).toLocaleString()}
                </div>
                <div>
                  <strong>Last Updated:</strong> {new Date(campaignData.updated_at).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6">
          {showAddContacts ? (
            <AddContacts
              campaignId={campaignId}
              onContactsAdded={handleContactsAdded}
              onClose={() => setShowAddContacts(false)}
            />
          ) : (
            <Card className="bg-gradient-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Campaign Contacts
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAddContacts(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contacts
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Search contacts..."
                      value={contactSearchTerm}
                      onChange={(e) => setContactSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  {(() => {
                    const filteredContacts = campaignData.contacts.filter((contact) =>
                      contactSearchTerm === "" || 
                      `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
                      contact.email.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
                      (contact.company && contact.company.toLowerCase().includes(contactSearchTerm.toLowerCase()))
                    );

                    return filteredContacts.length > 0 ? (
                      <div className="space-y-2">
                        {filteredContacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="flex items-center justify-between p-3 border border-border rounded-lg bg-background"
                          >
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-medium text-foreground">
                                  {contact.first_name} {contact.last_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {contact.email}
                                </div>
                                {contact.company && (
                                  <div className="text-xs text-muted-foreground">
                                    {contact.company}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={contact.status === 'active' ? 'default' : 'secondary'}>
                                {contact.status}
                              </Badge>
                              {contact.replied_at && (
                                <Badge variant="outline" className="text-green-600">
                                  Replied
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteContact(contact.id)}
                                className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : campaignData.contacts.length > 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No contacts found</h3>
                        <p className="text-muted-foreground mb-4">
                          No contacts match your search criteria
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No contacts yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Add contacts to start your campaign
                        </p>
                        <Button 
                          variant="outline"
                          onClick={() => setShowAddContacts(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Contacts
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Email Sequence Tab */}
        <TabsContent value="sequence" className="space-y-6">
          <EmailSequence
            data={campaignData as any}
            onUpdate={(updates) => updateCampaignData(updates)}
          />
        </TabsContent>

        {/* Sender Accounts Tab */}
        <TabsContent value="senders" className="space-y-6">
          <SenderAccounts
            data={campaignData as any}
            onUpdate={(updates) => updateCampaignData(updates)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EditCampaign;