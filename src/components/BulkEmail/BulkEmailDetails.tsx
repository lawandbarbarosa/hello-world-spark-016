import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

interface BulkEmailDetailsProps {
  data: BulkEmailData;
  onUpdate: (data: Partial<BulkEmailData>) => void;
}

const BulkEmailDetails = ({ data, onUpdate }: BulkEmailDetailsProps) => {
  const [formData, setFormData] = useState({
    name: data.name || "",
    description: data.description || ""
  });

  const handleInputChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    onUpdate(newFormData);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Bulk Email Name *</Label>
          <Input
            id="name"
            placeholder="Enter a name for your bulk email campaign"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe your bulk email campaign (optional)"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
          />
        </div>
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">What is Email in Bulk?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Email in Bulk allows you to send personalized emails to multiple recipients at once. 
            This feature is designed for personal use and doesn't rely on external email services.
            You can import contact names, upload CSV files with email addresses, and create multiple email templates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkEmailDetails;
