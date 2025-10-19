import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Users, FileText, CheckCircle } from "lucide-react";

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

interface BulkEmailReviewProps {
  data: BulkEmailData;
  onUpdate: (data: Partial<BulkEmailData>) => void;
  onSend: () => void;
}

const BulkEmailReview = ({ data, onSend }: BulkEmailReviewProps) => {
  const totalContacts = data.contacts?.length || 0;
  const totalTemplates = data.templates?.length || 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bulk Email Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">{data.name}</p>
                <p className="text-sm text-muted-foreground">Campaign Name</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">{totalContacts}</p>
                <p className="text-sm text-muted-foreground">Total Contacts</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">{totalTemplates}</p>
                <p className="text-sm text-muted-foreground">Email Templates</p>
              </div>
            </div>
          </div>
          
          {data.description && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Description:</strong> {data.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contacts Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contacts Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {data.contacts?.slice(0, 5).map((contact, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div>
                  <p className="font-medium text-sm">
                    {contact.firstName || contact.first_name || "N/A"} {contact.lastName || contact.last_name || "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">{contact.email}</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Contact {index + 1}
                </Badge>
              </div>
            ))}
            {totalContacts > 5 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                ... and {totalContacts - 5} more contacts
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Templates Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email Templates Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.templates?.map((template, index) => (
              <div key={template.id} className="border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Template {index + 1}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{template.subject}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {template.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ready to Send */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Ready to Send!</p>
              <p className="text-sm text-green-600">
                Your bulk email campaign is ready. Click "Send Bulk Emails" to proceed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Send Button */}
      <div className="flex justify-center">
        <Button 
          onClick={onSend}
          size="lg"
          className="bg-gradient-primary text-primary-foreground hover:opacity-90 px-8"
        >
          <Mail className="w-5 h-5 mr-2" />
          Send Bulk Emails
        </Button>
      </div>
    </div>
  );
};

export default BulkEmailReview;
