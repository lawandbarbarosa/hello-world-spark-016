import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCsvUpload } from "@/hooks/useCsvUpload";

interface BulkEmailData {
  name: string;
  description: string;
  contacts: Array<{
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    [key: string]: any;
  }>;
  selectedColumns: string[];
  emailColumn?: string;
  templates: Array<{
    id: string;
    subject: string;
    body: string;
  }>;
}

interface BulkEmailContactsProps {
  data: BulkEmailData;
  onUpdate: (data: Partial<BulkEmailData>) => void;
}

const BulkEmailContacts = ({ data, onUpdate }: BulkEmailContactsProps) => {
  const [manualContacts, setManualContacts] = useState<Array<{email: string, firstName: string, lastName: string}>>([]);
  const [newContact, setNewContact] = useState({ email: "", firstName: "", lastName: "" });
  
  const { uploadCsv, isUploading, csvData } = useCsvUpload();

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      await uploadCsv(file);
      toast.success("CSV file uploaded successfully!");
    } catch (error) {
      console.error("Error uploading CSV:", error);
      toast.error("Failed to upload CSV file. Please try again.");
    }
  }, [uploadCsv]);

  const handleAddManualContact = () => {
    if (newContact.email && newContact.firstName && newContact.lastName) {
      const contact = {
        email: newContact.email,
        firstName: newContact.firstName,
        lastName: newContact.lastName
      };
      
      setManualContacts(prev => [...prev, contact]);
      setNewContact({ email: "", firstName: "", lastName: "" });
      toast.success("Contact added successfully!");
    } else {
      toast.error("Please fill in all contact fields.");
    }
  };

  const handleRemoveManualContact = (index: number) => {
    setManualContacts(prev => prev.filter((_, i) => i !== index));
    toast.success("Contact removed successfully!");
  };

  // Update parent component when contacts change
  React.useEffect(() => {
    const allContacts = [...manualContacts];
    if (csvData && csvData.length > 0) {
      allContacts.push(...csvData);
    }
    
    onUpdate({
      contacts: allContacts,
      selectedColumns: ['email', 'firstName', 'lastName'],
      emailColumn: 'email'
    });
  }, [manualContacts, csvData, onUpdate]);

  return (
    <div className="space-y-6">
      {/* Manual Contact Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Contacts Manually</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                placeholder="Enter first name"
                value={newContact.firstName}
                onChange={(e) => setNewContact(prev => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                placeholder="Enter last name"
                value={newContact.lastName}
                onChange={(e) => setNewContact(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={newContact.email}
                onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={handleAddManualContact} className="w-full">
            <Users className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </CardContent>
      </Card>

      {/* CSV Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Upload a CSV file with contact information
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(file);
                }
              }}
              className="hidden"
              id="csv-upload"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('csv-upload')?.click()}
              disabled={isUploading}
            >
              <FileText className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Choose CSV File"}
            </Button>
          </div>
          
          {csvData && csvData.length > 0 && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">
                CSV Data Loaded: {csvData.length} contacts
              </p>
              <div className="text-xs text-muted-foreground">
                Columns: {Object.keys(csvData[0] || {}).join(", ")}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact List */}
      {(manualContacts.length > 0 || (csvData && csvData.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Contact List ({manualContacts.length + (csvData?.length || 0)} contacts)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {manualContacts.map((contact, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{contact.firstName} {contact.lastName}</p>
                    <p className="text-sm text-muted-foreground">{contact.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveManualContact(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {csvData && csvData.map((contact, index) => (
                <div key={`csv-${index}`} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">
                      {contact.firstName || contact.first_name || "N/A"} {contact.lastName || contact.last_name || "N/A"}
                    </p>
                    <p className="text-sm text-muted-foreground">{contact.email}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">CSV</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkEmailContacts;
