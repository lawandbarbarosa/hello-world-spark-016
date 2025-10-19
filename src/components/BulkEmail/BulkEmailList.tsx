import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Users, Trash2, Mail, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { useCsvUpload } from "@/hooks/useCsvUpload";

interface BulkEmailListProps {
  onCreateNew: () => void;
}

const BulkEmailList = ({ onCreateNew }: BulkEmailListProps) => {
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [templates, setTemplates] = useState<Array<{id: string, subject: string, body: string}>>([]);
  const [newTemplate, setNewTemplate] = useState({ subject: "", body: "" });
  
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

  const handleSendBulkEmails = () => {
    if (!campaignName) {
      toast.error("Please enter a campaign name.");
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

    // Simulate sending emails
    toast.success(`Bulk emails prepared successfully! ${csvData.length} emails will be sent with ${templates.length} templates.`);
    
    // Reset form
    setCampaignName("");
    setCampaignDescription("");
    setTemplates([]);
    setNewTemplate({ subject: "", body: "" });
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
                Contacts: {csvData?.length || 0} | 
                Templates: {templates.length}
              </p>
            </div>
            <Button 
              onClick={handleSendBulkEmails}
              size="lg"
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              <Send className="w-5 h-5 mr-2" />
              Send Bulk Emails
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkEmailList;
