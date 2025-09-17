import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CampaignDetails from "./CampaignDetails";
import SenderAccounts from "./SenderAccounts";
import ContactUpload from "./ContactUpload";
import EmailSequence from "./EmailSequence";
import CampaignReview from "./CampaignReview";

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
    [key: string]: any;
  }>;
  sequence: Array<{
    id: string;
    subject: string;
    body: string;
    delay: number;
    delayUnit: 'hours' | 'days';
  }>;
}

interface CampaignWizardProps {
  onBack: () => void;
}

const CampaignWizard = ({ onBack }: CampaignWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: "",
    description: "",
    senderAccounts: [],
    contacts: [],
    sequence: []
  });

  const steps = [
    { id: 'details', label: 'Campaign Details', component: CampaignDetails },
    { id: 'senders', label: 'Sender Accounts', component: SenderAccounts },
    { id: 'contacts', label: 'Upload Contacts', component: ContactUpload },
    { id: 'sequence', label: 'Email Sequence', component: EmailSequence },
    { id: 'review', label: 'Review & Launch', component: CampaignReview },
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;
  const CurrentStepComponent = steps[currentStep].component;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDataUpdate = useCallback((stepData: Partial<CampaignData>) => {
    setCampaignData(prev => ({ ...prev, ...stepData }));
  }, []);

  const handleLaunch = async () => {
    try {
      console.log("Launching campaign with data:", campaignData);
      
      if (!campaignData.name || campaignData.senderAccounts.length === 0 || campaignData.sequence.length === 0) {
        toast.error("Please complete all required fields before launching the campaign.");
        return;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("You must be logged in to create a campaign.");
        return;
      }

      // Create campaign in database
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          name: campaignData.name,
          description: campaignData.description,
          status: 'draft',
          user_id: user.id
        })
        .select()
        .single();

      if (campaignError) {
        console.error('Error creating campaign:', campaignError);
        toast.error('Failed to create campaign. Please try again.');
        return;
      }

      // Create sender accounts
      const senderAccountsData = campaignData.senderAccounts.map(account => ({
        campaign_id: campaign.id,
        email: account.email,
        provider: account.provider,
        daily_limit: account.dailyLimit,
        user_id: user.id
      }));

      const { error: senderError } = await supabase
        .from('sender_accounts')
        .insert(senderAccountsData);

      if (senderError) {
        console.error('Error creating sender accounts:', senderError);
        toast.error('Failed to create sender accounts. Please try again.');
        return;
      }

      // Create email sequences
      const emailSequenceData = campaignData.sequence.map((email, index) => ({
        campaign_id: campaign.id,
        step_number: index + 1,
        subject: email.subject,
        body: email.body,
        delay_amount: email.delay,
        delay_unit: email.delayUnit
      }));

      const { error: sequenceError } = await supabase
        .from('email_sequences')
        .insert(emailSequenceData);

      if (sequenceError) {
        console.error('Error creating email sequences:', sequenceError);
        toast.error('Failed to create email sequences. Please try again.');
        return;
      }

      // Create contacts
      if (campaignData.contacts && campaignData.contacts.length > 0) {
        const contactsData = campaignData.contacts.map(contact => ({
          campaign_id: campaign.id,
          email: contact.email,
          first_name: contact.firstName,
          last_name: contact.lastName,
          status: 'active',
          user_id: user.id
        }));

        const { error: contactsError } = await supabase
          .from('contacts')
          .insert(contactsData);

        if (contactsError) {
          console.error('Error creating contacts:', contactsError);
          toast.error('Failed to create contacts. Please try again.');
          return;
        }
      }

      // Launch the campaign
      const { data: launchData, error: launchError } = await supabase.functions.invoke('send-campaign-email', {
        body: { campaignId: campaign.id }
      });

      if (launchError) {
        console.error('Error launching campaign:', launchError);
        toast.error('Failed to launch campaign. Please try again.');
        return;
      }

      toast.success(`Campaign launched successfully! ${launchData.message}`);
      onBack();
    } catch (error) {
      console.error('Error launching campaign:', error);
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Create Campaign</h1>
            <p className="text-muted-foreground mt-1">
              Set up your email campaign in {steps.length} easy steps
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <Card className="bg-gradient-card border-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-foreground">
              Step {currentStep + 1} of {steps.length}: {steps[currentStep].label}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          
          <div className="flex justify-between mt-4">
            {steps.map((step, index) => (
              <div 
                key={step.id}
                className={`flex items-center gap-2 ${
                  index <= currentStep ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  index < currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : index === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {index < currentStep ? <Check className="w-3 h-3" /> : index + 1}
                </div>
                <span className="text-sm hidden sm:block">{step.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">{steps[currentStep].label}</CardTitle>
        </CardHeader>
        <CardContent>
          <CurrentStepComponent 
            data={campaignData}
            onUpdate={handleDataUpdate}
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        {currentStep === steps.length - 1 ? (
          <Button 
            onClick={handleLaunch}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            <Check className="w-4 h-4 mr-2" />
            Launch Campaign
          </Button>
        ) : (
          <Button 
            onClick={handleNext}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default CampaignWizard;