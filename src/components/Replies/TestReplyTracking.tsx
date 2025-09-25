import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { TestTube, Mail, Reply } from 'lucide-react';

const TestReplyTracking = () => {
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [testData, setTestData] = useState({
    contactEmail: '',
    campaignId: '',
    fromEmail: '',
    toEmail: '',
    subject: 'Re: Your Email Campaign',
    content: 'Thank you for your email. I am interested in learning more about your offer.',
  });

  const testReplyWebhook = async () => {
    if (!testData.contactEmail || !testData.campaignId || !testData.fromEmail || !testData.toEmail) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);

    try {
      // Call the handle-email-reply edge function directly
      const { data, error } = await supabase.functions.invoke('handle-email-reply', {
        body: {
          fromEmail: testData.fromEmail,
          toEmail: testData.toEmail,
          campaignId: testData.campaignId,
          subject: testData.subject,
          content: testData.content,
          messageId: `test-${Date.now()}@example.com`,
          inReplyTo: `original-${Date.now()}@example.com`,
          references: `original-${Date.now()}@example.com`,
        }
      });

      if (error) {
        console.error('Reply tracking test error:', error);
        toast({
          title: "Test Failed",
          description: `Error: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Reply tracking test result:', data);
      
      toast({
        title: "Test Successful!",
        description: "Reply tracking is working correctly. Check the Inbox and Dashboard for updated stats.",
      });

      // Clear form after successful test
      setTestData(prev => ({
        ...prev,
        contactEmail: '',
        campaignId: '',
        fromEmail: '',
        toEmail: '',
        content: 'Thank you for your email. I am interested in learning more about your offer.',
      }));

    } catch (error: any) {
      console.error('Reply tracking test error:', error);
      toast({
        title: "Test Failed",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  // Get user's campaigns for testing
  const [campaigns, setCampaigns] = useState<Array<{id: string, name: string}>>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  const loadCampaigns = async () => {
    if (!user) return;
    
    setLoadingCampaigns(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to load campaigns: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoadingCampaigns(false);
    }
  };

  React.useEffect(() => {
    if (user) {
      loadCampaigns();
    }
  }, [user]);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5 text-primary" />
          Test Reply Tracking
        </CardTitle>
        <CardDescription>
          Test the reply tracking functionality by simulating an incoming email reply
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="contactEmail">Contact Email *</Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="prospect@example.com"
              value={testData.contactEmail}
              onChange={(e) => setTestData(prev => ({ ...prev, contactEmail: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="campaignId">Campaign ID *</Label>
            <div className="space-y-2">
              <Input
                id="campaignId"
                placeholder="Enter campaign ID or select below"
                value={testData.campaignId}
                onChange={(e) => setTestData(prev => ({ ...prev, campaignId: e.target.value }))}
              />
              {campaigns.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Or select from your campaigns:</Label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {campaigns.map((campaign) => (
                      <Button
                        key={campaign.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left"
                        onClick={() => setTestData(prev => ({ ...prev, campaignId: campaign.id }))}
                      >
                        <Mail className="w-3 h-3 mr-2" />
                        {campaign.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="fromEmail">From Email (Reply Sender) *</Label>
            <Input
              id="fromEmail"
              type="email"
              placeholder="Same as contact email"
              value={testData.fromEmail}
              onChange={(e) => setTestData(prev => ({ ...prev, fromEmail: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="toEmail">To Email (Your Sender Account) *</Label>
            <Input
              id="toEmail"
              type="email"
              placeholder="your-sender@gmail.com"
              value={testData.toEmail}
              onChange={(e) => setTestData(prev => ({ ...prev, toEmail: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="subject">Reply Subject</Label>
            <Input
              id="subject"
              placeholder="Re: Your Email Campaign"
              value={testData.subject}
              onChange={(e) => setTestData(prev => ({ ...prev, subject: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="content">Reply Content</Label>
            <Textarea
              id="content"
              rows={4}
              placeholder="Enter the reply message content..."
              value={testData.content}
              onChange={(e) => setTestData(prev => ({ ...prev, content: e.target.value }))}
            />
          </div>
        </div>

        <Button
          onClick={testReplyWebhook}
          disabled={testing || loadingCampaigns}
          className="w-full"
        >
          {testing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              Testing Reply...
            </>
          ) : (
            <>
              <Reply className="w-4 h-4 mr-2" />
              Test Reply Tracking
            </>
          )}
        </Button>

        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-semibold text-sm mb-2">How to use:</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Enter a contact email that exists in your campaigns</li>
            <li>Select or enter the campaign ID</li>
            <li>Enter the same email as "From Email" (the one replying)</li>
            <li>Enter your sender account email as "To Email"</li>
            <li>Click "Test Reply Tracking"</li>
            <li>Check Dashboard for updated reply rate and Inbox for the reply content</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestReplyTracking;