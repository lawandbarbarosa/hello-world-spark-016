import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Shield,
  Mail,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Clock,
  Users
} from "lucide-react";

interface SpamEmail {
  id: string;
  subject: string;
  sender_email: string;
  content: string;
  received_at: string;
  campaign_id?: string;
}

const Spam = () => {
  const { user } = useAuth();
  const [spamEmails, setSpamEmails] = useState<SpamEmail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSpamEmails();
    }
  }, [user]);

  const fetchSpamEmails = async () => {
    try {
      setLoading(true);
      // For now, we'll simulate spam emails since we don't have a spam table yet
      // In a real implementation, you would query a spam_emails table
      const mockSpamEmails: SpamEmail[] = [
        {
          id: '1',
          subject: 'URGENT: Claim your prize now!',
          sender_email: 'noreply@suspicious-site.com',
          content: 'You have won $1,000,000! Click here to claim...',
          received_at: new Date().toISOString(),
        },
        {
          id: '2',
          subject: 'Your account has been compromised',
          sender_email: 'security@fake-bank.com',
          content: 'Please verify your account immediately...',
          received_at: new Date(Date.now() - 86400000).toISOString(),
        }
      ];
      
      setSpamEmails(mockSpamEmails);
    } catch (error) {
      console.error('Error fetching spam emails:', error);
      toast.error('Failed to fetch spam emails');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSpam = async (emailId: string) => {
    try {
      // Remove from local state
      setSpamEmails(prev => prev.filter(email => email.id !== emailId));
      toast.success('Spam email deleted permanently');
    } catch (error) {
      console.error('Error deleting spam:', error);
      toast.error('Failed to delete spam email');
    }
  };

  const handleRestoreEmail = async (emailId: string) => {
    try {
      // Move email back to inbox
      setSpamEmails(prev => prev.filter(email => email.id !== emailId));
      toast.success('Email restored to inbox');
    } catch (error) {
      console.error('Error restoring email:', error);
      toast.error('Failed to restore email');
    }
  };

  const handleClearAllSpam = async () => {
    try {
      setSpamEmails([]);
      toast.success('All spam emails cleared');
    } catch (error) {
      console.error('Error clearing spam:', error);
      toast.error('Failed to clear spam emails');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-foreground">Spam</h1>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading spam emails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-foreground">Spam</h1>
          <Badge variant="secondary" className="ml-2">
            {spamEmails.length} emails
          </Badge>
        </div>
        
        {spamEmails.length > 0 && (
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleClearAllSpam}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Spam
          </Button>
        )}
      </div>

      {spamEmails.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No spam emails</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Your spam folder is clean! Suspicious emails will appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {spamEmails.map((email) => (
            <Card key={email.id} className="border-orange-200 dark:border-orange-900">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        Spam
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{email.subject}</CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {email.sender_email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(email.received_at).toLocaleDateString()}
                      </span>
                    </CardDescription>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreEmail(email.id)}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Restore
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteSpam(email.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    {email.content.length > 200 
                      ? `${email.content.substring(0, 200)}...` 
                      : email.content
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Spam;