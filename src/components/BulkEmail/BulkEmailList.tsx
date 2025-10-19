import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Mailbox, Users, FileText } from "lucide-react";

interface BulkEmailListProps {
  onCreateNew: () => void;
}

const BulkEmailList = ({ onCreateNew }: BulkEmailListProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Email in Bulk</h1>
          <p className="text-muted-foreground mt-1">
            Send personalized bulk emails to multiple recipients
          </p>
        </div>
        <Button 
          onClick={onCreateNew}
          className="bg-gradient-primary text-primary-foreground hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Bulk Email
        </Button>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Import Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Add contacts manually or upload CSV files with email addresses and names.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Email Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create multiple email templates to personalize your bulk email campaigns.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mailbox className="w-5 h-5 text-primary" />
              Send in Bulk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Send personalized emails to all your contacts using your custom templates.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Getting Started with Bulk Email</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>1. <strong>Create a new bulk email campaign</strong> by clicking the "Create Bulk Email" button</p>
            <p>2. <strong>Add your contacts</strong> manually or upload a CSV file with email addresses</p>
            <p>3. <strong>Create email templates</strong> with personalized content for your recipients</p>
            <p>4. <strong>Review and send</strong> your bulk emails to all contacts</p>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      <Card className="text-center py-12">
        <CardContent>
          <Mailbox className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Bulk Email Campaigns Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first bulk email campaign to get started
          </p>
          <Button 
            onClick={onCreateNew}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Campaign
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkEmailList;
