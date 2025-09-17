import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  Mail, 
  Users, 
  Send, 
  Clock, 
  AlertTriangle,
  Rocket
} from "lucide-react";

interface CampaignData {
  name: string;
  description: string;
  senderAccounts: Array<{
    id: string;
    email: string;
    provider: string;
    dailyLimit: number;
  }>;
  contacts: Array<{
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
  }>;
  sequence: Array<{
    id: string;
    subject: string;
    body: string;
    delay: number;
    delayUnit: 'hours' | 'days';
  }>;
}

interface CampaignReviewProps {
  data: CampaignData;
  onUpdate: (data: Partial<CampaignData>) => void;
}

const CampaignReview = ({ data }: CampaignReviewProps) => {
  const totalDailyLimit = data.senderAccounts.reduce((sum, account) => sum + account.dailyLimit, 0);
  const estimatedDuration = Math.ceil(data.contacts.length / totalDailyLimit);
  const sequenceDuration = data.sequence.reduce((total, step, index) => {
    if (index === 0) return 0;
    return total + (step.delayUnit === 'days' ? step.delay : Math.ceil(step.delay / 24));
  }, 0);

  const validationIssues = [];
  if (!data.name.trim()) validationIssues.push("Campaign name is required");
  if (data.senderAccounts.length === 0) validationIssues.push("At least one sender account is required");
  if (data.contacts.length === 0) validationIssues.push("Contact list is required");
  if (data.sequence.length === 0) validationIssues.push("Email sequence is required");
  if (data.sequence.some(step => !step.subject.trim() || !step.body.trim())) {
    validationIssues.push("All email steps must have subject and body");
  }

  const isValid = validationIssues.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Review & Launch Campaign</h3>
        <p className="text-sm text-muted-foreground">
          Review all campaign details before launching
        </p>
      </div>

      {/* Validation Status */}
      <Card className={`border-2 ${isValid ? 'border-success bg-success/5' : 'border-warning bg-warning/5'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {isValid ? (
              <>
                <CheckCircle className="w-6 h-6 text-success" />
                <div>
                  <h4 className="font-medium text-success">Ready to Launch</h4>
                  <p className="text-sm text-success/80">All requirements are met</p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-6 h-6 text-warning" />
                <div>
                  <h4 className="font-medium text-warning">Issues Found</h4>
                  <ul className="text-sm text-warning/80 mt-1">
                    {validationIssues.map((issue, index) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Overview */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Campaign Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Name</Label>
              <p className="text-foreground font-medium">{data.name || 'Not set'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Description</Label>
              <p className="text-foreground">{data.description || 'No description'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sender Accounts */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <Send className="w-4 h-4" />
            Sender Accounts ({data.senderAccounts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.senderAccounts.length > 0 ? (
            <div className="space-y-3">
              {data.senderAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{account.email}</p>
                    <p className="text-sm text-muted-foreground capitalize">{account.provider}</p>
                  </div>
                  <Badge variant="secondary">{account.dailyLimit}/day</Badge>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Daily Limit:</span>
                <span className="font-medium text-foreground">{totalDailyLimit} emails/day</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No sender accounts configured</p>
          )}
        </CardContent>
      </Card>

      {/* Contacts */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <Users className="w-4 h-4" />
            Contacts ({data.contacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.contacts.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Contacts:</span>
                  <span className="ml-2 font-medium text-foreground">{data.contacts.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Estimated Duration:</span>
                  <span className="ml-2 font-medium text-foreground">{estimatedDuration} days</span>
                </div>
              </div>
              <div className="max-h-32 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {data.contacts.slice(0, 6).map((contact, index) => (
                    <div key={index} className="text-sm p-2 bg-muted rounded">
                      <p className="font-medium text-foreground">{contact.email}</p>
                      {contact.firstName && (
                        <p className="text-muted-foreground">
                          {contact.firstName} {contact.lastName} {contact.company && `• ${contact.company}`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {data.contacts.length > 6 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    +{data.contacts.length - 6} more contacts
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No contacts uploaded</p>
          )}
        </CardContent>
      </Card>

      {/* Email Sequence */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Sequence ({data.sequence.length} steps)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.sequence.length > 0 ? (
            <div className="space-y-3">
              {data.sequence.map((step, index) => (
                <div key={step.id} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium text-foreground">
                      {step.subject || 'No subject'}
                    </span>
                    {index > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Wait {step.delay} {step.delayUnit}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {step.body || 'No content'}
                  </p>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sequence Duration:</span>
                <span className="font-medium text-foreground">{sequenceDuration} days</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No email sequence configured</p>
          )}
        </CardContent>
      </Card>

      {/* Launch Button */}
      <Card className="bg-gradient-primary text-primary-foreground">
        <CardContent className="pt-6">
          <div className="text-center">
            <Rocket className="w-12 h-12 mx-auto mb-4 text-primary-foreground" />
            <h3 className="text-lg font-semibold mb-2">Ready to Launch?</h3>
            <p className="text-primary-foreground/80 mb-4">
              Your campaign will start sending immediately after launch
            </p>
            <Button 
              disabled={!isValid}
              variant="secondary"
              size="lg"
              className="w-full md:w-auto"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Launch Campaign
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper component for labels
const Label = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <span className={className}>{children}</span>
);

export default CampaignReview;