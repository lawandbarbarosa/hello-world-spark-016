import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
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

  const handleLaunch = () => {
    // TODO: Implement campaign launch logic
    console.log('Launching campaign:', campaignData);
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