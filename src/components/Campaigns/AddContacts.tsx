import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Plus, Upload, UserPlus } from "lucide-react";

interface AddContactsProps {
  campaignId: string;
  onContactsAdded: (contacts: any[]) => void;
  onClose: () => void;
}

const AddContacts = ({ campaignId, onContactsAdded, onClose }: AddContactsProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<'single' | 'bulk'>('single');
  
  // Single contact form
  const [singleContact, setSingleContact] = useState({
    first_name: '',
    last_name: '',
    email: '',
    company: ''
  });

  // Bulk contacts (CSV format)
  const [bulkContacts, setBulkContacts] = useState('');

  const addSingleContact = async () => {
    if (!singleContact.email) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('contacts')
        .insert({
          user_id: user.id,
          campaign_id: campaignId,
          first_name: singleContact.first_name,
          last_name: singleContact.last_name,
          email: singleContact.email,
          company: singleContact.company,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      onContactsAdded([data]);
      setSingleContact({ first_name: '', last_name: '', email: '', company: '' });
      
      toast({
        title: "Success",
        description: "Contact added successfully",
      });

    } catch (error) {
      console.error('Error adding contact:', error);
      toast({
        title: "Error",
        description: "Failed to add contact",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addBulkContacts = async () => {
    if (!bulkContacts.trim()) {
      toast({
        title: "Error",
        description: "Please enter contact data",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Parse CSV data (simple implementation)
      const lines = bulkContacts.trim().split('\n');
      const contacts = [];

      for (const line of lines) {
        const parts = line.split(',').map(part => part.trim());
        if (parts.length >= 1 && parts[0]) { // At least email is required
          contacts.push({
            user_id: user.id,
            campaign_id: campaignId,
            email: parts[0],
            first_name: parts[1] || '',
            last_name: parts[2] || '',
            company: parts[3] || '',
            status: 'active'
          });
        }
      }

      if (contacts.length === 0) {
        toast({
          title: "Error",
          description: "No valid contacts found",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('contacts')
        .insert(contacts)
        .select();

      if (error) throw error;

      onContactsAdded(data);
      setBulkContacts('');
      
      toast({
        title: "Success",
        description: `Added ${data.length} contacts successfully`,
      });

    } catch (error) {
      console.error('Error adding bulk contacts:', error);
      toast({
        title: "Error",
        description: "Failed to add contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Add New Contacts
          <Button variant="ghost" onClick={onClose}>
            ×
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Method Selection */}
        <div className="flex gap-2">
          <Button
            variant={method === 'single' ? 'default' : 'outline'}
            onClick={() => setMethod('single')}
            className="flex-1"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Single Contact
          </Button>
          <Button
            variant={method === 'bulk' ? 'default' : 'outline'}
            onClick={() => setMethod('bulk')}
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
        </div>

        {/* Single Contact Form */}
        {method === 'single' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={singleContact.first_name}
                  onChange={(e) => setSingleContact(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={singleContact.last_name}
                  onChange={(e) => setSingleContact(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={singleContact.email}
                onChange={(e) => setSingleContact(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={singleContact.company}
                onChange={(e) => setSingleContact(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Acme Inc"
              />
            </div>
            <Button 
              onClick={addSingleContact} 
              disabled={loading || !singleContact.email}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              {loading ? "Adding..." : "Add Contact"}
            </Button>
          </div>
        )}

        {/* Bulk Import Form */}
        {method === 'bulk' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk_contacts">Contact Data (CSV Format)</Label>
              <p className="text-sm text-muted-foreground">
                Enter one contact per line in format: email, first_name, last_name, company
              </p>
              <Textarea
                id="bulk_contacts"
                value={bulkContacts}
                onChange={(e) => setBulkContacts(e.target.value)}
                placeholder={`john@example.com, John, Doe, Acme Inc
jane@example.com, Jane, Smith, Beta Corp
mike@example.com, Mike, Johnson`}
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <Button 
              onClick={addBulkContacts} 
              disabled={loading || !bulkContacts.trim()}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {loading ? "Adding..." : "Add Contacts"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AddContacts;