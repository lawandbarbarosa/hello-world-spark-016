import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Trash2, Clock, ArrowDown, Eye, Tag } from "lucide-react";

interface EmailStep {
  id: string;
  subject: string;
  body: string;
  delay: number;
  delayUnit: 'hours' | 'days';
}

interface CampaignData {
  name: string;
  description: string;
  senderAccounts: any[];
  contacts: any[];
  sequence: EmailStep[];
}

interface EmailSequenceProps {
  data: CampaignData;
  onUpdate: (data: Partial<CampaignData>) => void;
}

const EmailSequence = ({ data, onUpdate }: EmailSequenceProps) => {
  const [sequence, setSequence] = useState<EmailStep[]>(data.sequence || []);
  
  // Get available merge tags from uploaded contacts
  const getAvailableMergeTags = () => {
    if (!data.contacts || data.contacts.length === 0) {
      return ['firstName', 'lastName', 'company', 'email'];
    }
    
    // Get all unique keys from contacts
    const allKeys = new Set<string>();
    data.contacts.forEach(contact => {
      Object.keys(contact).forEach(key => allKeys.add(key));
    });
    
    return Array.from(allKeys).sort();
  };
  
  const availableMergeTags = getAvailableMergeTags();
  const previewContact = data.contacts?.[0] || {
    firstName: 'John',
    lastName: 'Doe', 
    company: 'Example Corp',
    email: 'john@example.com'
  };

  useEffect(() => {
    onUpdate({ sequence });
  }, [sequence, onUpdate]);

  const addEmailStep = () => {
    const newStep: EmailStep = {
      id: Date.now().toString(),
      subject: '',
      body: '',
      delay: sequence.length === 0 ? 0 : 3,
      delayUnit: 'days'
    };
    setSequence([...sequence, newStep]);
  };

  const updateStep = (id: string, updates: Partial<EmailStep>) => {
    setSequence(sequence.map(step => 
      step.id === id ? { ...step, ...updates } : step
    ));
  };

  const removeStep = (id: string) => {
    setSequence(sequence.filter(step => step.id !== id));
  };

  const replaceVariables = (text: string) => {
    let result = text;
    availableMergeTags.forEach(tag => {
      const regex = new RegExp(`{{${tag}}}`, 'g');
      const value = previewContact[tag] || `[${tag}]`;
      result = result.replace(regex, String(value));
    });
    return result;
  };

  const insertMergeTag = (stepId: string, field: 'subject' | 'body', tag: string) => {
    const step = sequence.find(s => s.id === stepId);
    if (!step) return;
    
    const currentValue = step[field];
    const newValue = currentValue + `{{${tag}}}`;
    updateStep(stepId, { [field]: newValue });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Email Sequence</h3>
          <p className="text-sm text-muted-foreground">
            Create a series of emails that will be sent automatically with delays
          </p>
        </div>
        <Button 
          onClick={addEmailStep}
          className="bg-gradient-primary text-primary-foreground hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Email Step
        </Button>
      </div>

      {sequence.length === 0 ? (
        <Card className="bg-gradient-card border-border border-dashed">
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Create Your Email Sequence</h3>
              <p className="text-muted-foreground mb-6">
                Start by adding your first email step
              </p>
              <Button 
                onClick={addEmailStep}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Email
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sequence.map((step, index) => (
            <div key={step.id}>
              <Card className="bg-gradient-card border-border">
                <CardHeader>
                  <CardTitle className="text-base text-foreground flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <span>Email Step {index + 1}</span>
                      {index > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          Wait {step.delay} {step.delayUnit}
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeStep(step.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Delay Settings (not for first email) */}
                  {index > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">Delay Amount</Label>
                        <Input
                          type="number"
                          min="1"
                          value={step.delay}
                          onChange={(e) => updateStep(step.id, { delay: parseInt(e.target.value) || 1 })}
                          className="bg-background border-border text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">Delay Unit</Label>
                        <Select 
                          value={step.delayUnit} 
                          onValueChange={(value: 'hours' | 'days') => updateStep(step.id, { delayUnit: value })}
                        >
                          <SelectTrigger className="bg-background border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Subject Line */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-foreground">Subject Line</Label>
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Click tags to insert:</span>
                      </div>
                    </div>
                    <Input
                      placeholder="e.g., Quick question about {{company}}"
                      value={step.subject}
                      onChange={(e) => updateStep(step.id, { subject: e.target.value })}
                      className="bg-background border-border text-foreground"
                    />
                    <div className="flex flex-wrap gap-1">
                      {availableMergeTags.map(tag => (
                        <Badge 
                          key={tag}
                          variant="outline" 
                          className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => insertMergeTag(step.id, 'subject', tag)}
                        >
                          {`{{${tag}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Email Body */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-foreground">Email Body</Label>
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Click tags to insert:</span>
                      </div>
                    </div>
                    <Textarea
                      placeholder={`Hi {{firstName}},\n\nI hope this email finds you well...\n\nBest regards,\n[Your name]`}
                      value={step.body}
                      onChange={(e) => updateStep(step.id, { body: e.target.value })}
                      rows={8}
                      className="bg-background border-border text-foreground font-mono text-sm"
                    />
                    <div className="flex flex-wrap gap-1">
                      {availableMergeTags.map(tag => (
                        <Badge 
                          key={tag}
                          variant="outline" 
                          className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => insertMergeTag(step.id, 'body', tag)}
                        >
                          {`{{${tag}}}`}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Available merge tags from your CSV: {availableMergeTags.join(', ')}
                    </div>
                  </div>

                  {/* Preview */}
                  {(step.subject || step.body) && (
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-4 h-4 text-foreground" />
                        <span className="text-sm font-medium text-foreground">Preview</span>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong className="text-foreground">Subject:</strong>{' '}
                          <span className="text-muted-foreground">
                            {replaceVariables(step.subject) || 'No subject'}
                          </span>
                        </div>
                        <div className="text-sm">
                          <strong className="text-foreground">Body:</strong>
                          <div className="mt-1 p-2 bg-background rounded text-muted-foreground whitespace-pre-wrap text-xs">
                            {replaceVariables(step.body) || 'No content'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Arrow between steps */}
              {index < sequence.length - 1 && (
                <div className="flex justify-center py-2">
                  <ArrowDown className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {/* Summary */}
          <Card className="bg-muted/50 border-border">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Steps:</span>
                  <span className="ml-2 font-medium text-foreground">{sequence.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Sequence Duration:</span>
                  <span className="ml-2 font-medium text-foreground">
                    {sequence.reduce((total, step, index) => {
                      if (index === 0) return 0;
                      return total + (step.delayUnit === 'days' ? step.delay : Math.ceil(step.delay / 24));
                    }, 0)} days
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Follow-up Strategy:</span>
                  <span className="ml-2 font-medium text-foreground">Stop on reply</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EmailSequence;