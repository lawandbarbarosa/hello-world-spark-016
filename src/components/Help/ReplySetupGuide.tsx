import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Webhook,
  Copy,
  ExternalLink,
  CheckCircle,
  Mail,
  Settings,
  Code,
  Globe
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ReplySetupGuide = () => {
  const webhookUrl = "https://ogzdqhvpsobpwxteqpnx.supabase.co/functions/v1/handle-email-reply";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Webhook URL copied to clipboard",
    });
  };

  const examplePayload = `{
  "contactEmail": "john@example.com",
  "campaignId": "your-campaign-uuid",
  "replyData": {
    "subject": "Re: Your email subject",
    "body": "Reply email content",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}`;

  const curlExample = `curl -X POST \\
  ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -d '${examplePayload.replace(/\n/g, ' ').replace(/\s+/g, ' ')}'`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-primary" />
            Reply Tracking Setup Guide
          </CardTitle>
          <CardDescription>
            Set up automatic reply tracking to monitor your campaign responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Webhook URL */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Webhook URL
            </h3>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <code className="flex-1 text-sm">{webhookUrl}</code>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => copyToClipboard(webhookUrl)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              This is your publicly accessible webhook endpoint for receiving reply notifications.
            </p>
          </div>

          <Separator />

          {/* Setup Options */}
          <div>
            <h3 className="font-semibold mb-4">Setup Options</h3>
            <div className="grid gap-4">
              
              {/* Gmail Setup */}
              <Card className="border-2 border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-500" />
                    Gmail Integration
                    <Badge variant="outline">Recommended</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ol className="text-sm space-y-1 text-muted-foreground">
                    <li>1. Enable Gmail API in Google Cloud Console</li>
                    <li>2. Set up Google Pub/Sub for email notifications</li>
                    <li>3. Configure push notifications to webhook URL</li>
                    <li>4. Use Gmail filters to detect replies</li>
                  </ol>
                  <Button size="sm" variant="outline" className="mt-2">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Gmail API Docs
                  </Button>
                </CardContent>
              </Card>

              {/* Email Provider Setup */}
              <Card className="border-2 border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-4 h-4 text-green-500" />
                    Email Provider Webhooks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-2">
                    Configure webhooks in your email provider:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline">SendGrid</Button>
                    <Button size="sm" variant="outline">Mailgun</Button>
                    <Button size="sm" variant="outline">Amazon SES</Button>
                    <Button size="sm" variant="outline">Resend</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Manual Testing */}
              <Card className="border-2 border-dashed border-warning/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code className="w-4 h-4 text-warning" />
                    Manual Testing
                    <Badge className="bg-warning text-warning-foreground">For Testing</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Test the webhook manually or mark contacts as replied using the Reply Tracker interface.
                  </p>
                  <Button size="sm" className="w-full">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Go to Reply Tracker
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* API Format */}
          <div>
            <h3 className="font-semibold mb-2">Webhook Payload Format</h3>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-xs overflow-x-auto">
                <code>{examplePayload}</code>
              </pre>
            </div>
          </div>

          {/* cURL Example */}
          <div>
            <h3 className="font-semibold mb-2">Test with cURL</h3>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-xs overflow-x-auto">
                <code>{curlExample}</code>
              </pre>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2"
              onClick={() => copyToClipboard(curlExample)}
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy cURL Command
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReplySetupGuide;