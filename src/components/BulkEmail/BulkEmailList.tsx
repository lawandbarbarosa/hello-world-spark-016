import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Users, Trash2, Mail, Plus, Send } from "lucide-react";
import { toast } from "sonner";

interface BulkEmailListProps {
  onCreateNew: () => void;
}

interface CsvEmailData {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  [key: string]: any;
}

const BulkEmailList = ({ onCreateNew }: BulkEmailListProps) => {
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [senderEmails, setSenderEmails] = useState<string[]>([]);
  const [newSenderEmail, setNewSenderEmail] = useState("");
  const [templates, setTemplates] = useState<Array<{id: string, subject: string, body: string}>>([]);
  const [newTemplate, setNewTemplate] = useState({ subject: "", body: "" });
  const [csvData, setCsvData] = useState<CsvEmailData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const parseCsvContent = (csvContent: string): CsvEmailData[] => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const emailColumnIndex = headers.findIndex(h => 
      h.includes('email') || h.includes('e-mail') || h.includes('mail')
    );

    if (emailColumnIndex === -1) {
      throw new Error('No email column found. Please ensure your CSV has a column named "email", "e-mail", or similar.');
    }

    const firstNameIndex = headers.findIndex(h => 
      h.includes('first') && h.includes('name') || h === 'firstname' || h === 'fname'
    );
    const lastNameIndex = headers.findIndex(h => 
      h.includes('last') && h.includes('name') || h === 'lastname' || h === 'lname'
    );
    const companyIndex = headers.findIndex(h => 
      h.includes('company') || h.includes('organization') || h.includes('org')
    );

    const emails: CsvEmailData[] = [];
    const seenEmails = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
      const email = columns[emailColumnIndex]?.trim().toLowerCase();

      if (email && email.includes('@') && !seenEmails.has(email)) {
        seenEmails.add(email);
        
        const emailData: CsvEmailData = { email };
        
        if (firstNameIndex !== -1 && columns[firstNameIndex]) {
          emailData.firstName = columns[firstNameIndex].trim();
        }
        if (lastNameIndex !== -1 && columns[lastNameIndex]) {
          emailData.lastName = columns[lastNameIndex].trim();
        }
        if (companyIndex !== -1 && columns[companyIndex]) {
          emailData.company = columns[companyIndex].trim();
        }

        // Add all other columns as additional data
        headers.forEach((header, index) => {
          if (index !== emailColumnIndex && index !== firstNameIndex && 
              index !== lastNameIndex && index !== companyIndex && columns[index]) {
            emailData[header] = columns[index].trim();
          }
        });

        emails.push(emailData);
      }
    }

    return emails;
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const csvContent = await file.text();
      const emails = parseCsvContent(csvContent);
      
      if (emails.length === 0) {
        toast.error('No valid emails found in the CSV file');
        return;
      }

      setCsvData(emails);
      toast.success(`CSV file uploaded successfully! Found ${emails.length} valid emails.`);
    } catch (error: any) {
      console.error("Error uploading CSV:", error);
      toast.error(error.message || "Failed to upload CSV file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleAddSenderEmail = () => {
    if (newSenderEmail && newSenderEmail.includes('@')) {
      if (!senderEmails.includes(newSenderEmail)) {
        setSenderEmails(prev => [...prev, newSenderEmail]);
        setNewSenderEmail("");
        toast.success("Sender email added successfully!");
      } else {
        toast.error("This email address is already added.");
      }
    } else {
      toast.error("Please enter a valid email address.");
    }
  };

  const handleRemoveSenderEmail = (email: string) => {
    setSenderEmails(prev => prev.filter(e => e !== email));
    toast.success("Sender email removed successfully!");
  };

  const handleAddTemplate = () => {
    if (newTemplate.subject && newTemplate.body) {
      const template = {
        id: Date.now().toString(),
        subject: newTemplate.subject,
        body: newTemplate.body
      };
      
      setTemplates(prev => [...prev, template]);
      setNewTemplate({ subject: "", body: "" });
      toast.success("Email template added successfully!");
    } else {
      toast.error("Please fill in both subject and body.");
    }
  };

  const handleRemoveTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    toast.success("Email template removed successfully!");
  };

  const handleUpdateTemplate = (templateId: string, field: string, value: string) => {
    const updatedTemplates = templates.map(t => 
      t.id === templateId ? { ...t, [field]: value } : t
    );
    setTemplates(updatedTemplates);
  };

  const handleSendBulkEmails = async () => {
    if (!campaignName) {
      toast.error("Please enter a campaign name.");
      return;
    }
    
    if (senderEmails.length === 0) {
      toast.error("Please add at least one sender email address.");
      return;
    }
    
    if (!csvData || csvData.length === 0) {
      toast.error("Please upload a CSV file with email addresses.");
      return;
    }
    
    if (templates.length === 0) {
      toast.error("Please create at least one email template.");
      return;
    }

    try {
      setIsSending(true);
      
      // Prepare data for webhook
      const webhookData = {
        campaignName: campaignName,
        campaignDescription: campaignDescription,
        senderEmails: senderEmails,
        contacts: csvData,
        templates: templates,
        totalContacts: csvData.length,
        totalTemplates: templates.length,
        totalSenderEmails: senderEmails.length,
        timestamp: new Date().toISOString()
      };

      // Call webhook
      const response = await fetch('https://ailawand.app.n8n.cloud/webhook-test/job title-career', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      });

      if (response.ok) {
        toast.success(`Bulk emails sent successfully! ${csvData.length} emails processed with ${templates.length} templates.`);
        
        // Reset form
        setCampaignName("");
        setCampaignDescription("");
        setSenderEmails([]);
        setNewSenderEmail("");
        setTemplates([]);
        setNewTemplate({ subject: "", body: "" });
        setCsvData([]);
      } else {
        toast.error("Failed to send bulk emails. Please try again.");
      }
    } catch (error) {
      console.error("Error sending bulk emails:", error);
      toast.error("An error occurred while sending bulk emails. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Email in Bulk</h1>
          <p className="text-muted-foreground mt-1">
            Send personalized bulk emails to multiple recipients
          </p>
        </div>
      </div>

      {/* Campaign Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaignName">Campaign Name *</Label>
            <Input
              id="campaignName"
              placeholder="Enter campaign name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Enter campaign description"
              value={campaignDescription}
              onChange={(e) => setCampaignDescription(e.target.value)}
              rows={2}
            />
          </div>
          
          {/* Sender Emails */}
          <div className="space-y-3">
            <Label>Sender Email Addresses *</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter sender email address"
                value={newSenderEmail}
                onChange={(e) => setNewSenderEmail(e.target.value)}
                type="email"
              />
              <Button onClick={handleAddSenderEmail} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
            
            {senderEmails.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Added Sender Emails ({senderEmails.length})</p>
                <div className="space-y-1">
                  {senderEmails.map((email, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-sm">{email}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSenderEmail(email)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CSV Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload Email Addresses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Upload a CSV file with email addresses and names
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

      {/* Email Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Template */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject *</Label>
              <Input
                id="subject"
                placeholder="Enter email subject"
                value={newTemplate.subject}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="body">Email Body *</Label>
              <Textarea
                id="body"
                placeholder="Enter email body content"
                value={newTemplate.body}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, body: e.target.value }))}
                rows={4}
              />
            </div>
            
            <Button onClick={handleAddTemplate} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Template
            </Button>
          </div>

          {/* Templates List */}
          {templates.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Created Templates ({templates.length})</h4>
              {templates.map((template, index) => (
                <div key={template.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Template {index + 1}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTemplate(template.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Subject</Label>
                      <Input
                        value={template.subject}
                        onChange={(e) => handleUpdateTemplate(template.id, 'subject', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Body</Label>
                      <Textarea
                        value={template.body}
                        onChange={(e) => handleUpdateTemplate(template.id, 'body', e.target.value)}
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Button */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-green-800">Ready to Send!</p>
              <p className="text-sm text-green-600">
                Campaign: {campaignName || "Unnamed"} | 
                Senders: {senderEmails.length} | 
                Contacts: {csvData?.length || 0} | 
                Templates: {templates.length}
              </p>
            </div>
            <Button 
              onClick={handleSendBulkEmails}
              size="lg"
              disabled={isSending}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              <Send className="w-5 h-5 mr-2" />
              {isSending ? "Sending..." : "Send Bulk Emails"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkEmailList;
