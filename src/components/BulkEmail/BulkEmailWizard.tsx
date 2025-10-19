import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import BulkEmailDetails from "./BulkEmailDetails";
import BulkEmailContacts from "./BulkEmailContacts";
import BulkEmailTemplates from "./BulkEmailTemplates";
import BulkEmailReview from "./BulkEmailReview";

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

interface BulkEmailWizardProps {
  onBack: () => void;
}

const BulkEmailWizard = ({ onBack }: BulkEmailWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [bulkEmailData, setBulkEmailData] = useState<BulkEmailData>({
    name: "",
    description: "",
    contacts: [],
    selectedColumns: ['email'],
    emailColumn: 'email',
    templates: []
  });

  const steps = [
    { id: 'details', label: 'Bulk Email Details', component: BulkEmailDetails },
    { id: 'contacts', label: 'Import Contacts', component: BulkEmailContacts },
    { id: 'templates', label: 'Email Templates', component: BulkEmailTemplates },
    { id: 'review', label: 'Review & Send', component: BulkEmailReview },
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

  const handleDataUpdate = useCallback((stepData: Partial<BulkEmailData>) => {
    console.log('=== BULK EMAIL WIZARD DATA UPDATE ===');
    console.log('BulkEmailWizard - Data update received:', stepData);
    console.log('BulkEmailWizard - Current step:', steps[currentStep].label);
    
    setBulkEmailData(prev => {
      const newData = { ...prev, ...stepData };
      console.log('BulkEmailWizard - New bulk email data:', newData);
      console.log('=== END BULK EMAIL WIZARD DATA UPDATE ===');
      return newData;
    });
  }, [currentStep]);

  const handleSend = async () => {
    try {
      console.log("=== BULK EMAIL SEND DEBUG ===");
      console.log("Full bulk email data:", JSON.stringify(bulkEmailData, null, 2));
      console.log("Contacts count:", bulkEmailData.contacts?.length || 0);
      console.log("Templates count:", bulkEmailData.templates?.length || 0);
      console.log("=== END DEBUG ===");
      
      if (!bulkEmailData.name || bulkEmailData.contacts.length === 0 || bulkEmailData.templates.length === 0) {
        toast.error("Please complete all required fields before sending bulk emails.");
        return;
      }

      // Simulate sending emails (since we're not using resend.com API)
      toast.success(`Bulk emails prepared successfully! ${bulkEmailData.contacts.length} emails will be sent with ${bulkEmailData.templates.length} templates.`);
      
      onBack();
    } catch (error) {
      console.error('Error sending bulk emails:', error);
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
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Email in Bulk</h1>
            <p className="text-muted-foreground mt-1">
              Send bulk emails in {steps.length} easy steps
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
          {currentStep === steps.length - 1 ? (
            <BulkEmailReview 
              data={bulkEmailData}
              onUpdate={handleDataUpdate}
              onSend={handleSend}
            />
          ) : (
            <CurrentStepComponent 
              data={bulkEmailData}
              onUpdate={handleDataUpdate}
            />
          )}
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
            onClick={handleSend}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            <Check className="w-4 h-4 mr-2" />
            Send Bulk Emails
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

export default BulkEmailWizard;
