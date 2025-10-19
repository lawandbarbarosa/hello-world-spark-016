import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";

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

interface BulkEmailTemplatesProps {
  data: BulkEmailData;
  onUpdate: (data: Partial<BulkEmailData>) => void;
}

const BulkEmailTemplates = ({ data, onUpdate }: BulkEmailTemplatesProps) => {
  const [templates, setTemplates] = useState(data.templates || []);
  const [newTemplate, setNewTemplate] = useState({ subject: "", body: "" });

  const handleAddTemplate = () => {
    if (newTemplate.subject && newTemplate.body) {
      const template = {
        id: Date.now().toString(),
        subject: newTemplate.subject,
        body: newTemplate.body
      };
      
      const updatedTemplates = [...templates, template];
      setTemplates(updatedTemplates);
      onUpdate({ templates: updatedTemplates });
      setNewTemplate({ subject: "", body: "" });
      toast.success("Email template added successfully!");
    } else {
      toast.error("Please fill in both subject and body.");
    }
  };

  const handleRemoveTemplate = (templateId: string) => {
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    setTemplates(updatedTemplates);
    onUpdate({ templates: updatedTemplates });
    toast.success("Email template removed successfully!");
  };

  const handleUpdateTemplate = (templateId: string, field: string, value: string) => {
    const updatedTemplates = templates.map(t => 
      t.id === templateId ? { ...t, [field]: value } : t
    );
    setTemplates(updatedTemplates);
    onUpdate({ templates: updatedTemplates });
  };

  return (
    <div className="space-y-6">
      {/* Add New Template */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create Email Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              rows={6}
            />
          </div>
          
          <Button onClick={handleAddTemplate} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Template
          </Button>
        </CardContent>
      </Card>

      {/* Templates List */}
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Email Templates ({templates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {templates.map((template, index) => (
                <div key={template.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
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
                  
                  <div className="space-y-3">
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
                        rows={4}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Template Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Create multiple email templates to personalize your bulk emails</p>
            <p>• Each template will be used for different contacts</p>
            <p>• You can edit templates after creating them</p>
            <p>• Templates will be distributed among your contacts</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkEmailTemplates;
