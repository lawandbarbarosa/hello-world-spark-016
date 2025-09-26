import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import RichTextEditor from "@/components/ui/rich-text-editor";
import EmailTemplateLibrary from "./EmailTemplateLibrary";
import ErrorBoundary from "../ErrorBoundary";
import { Plus, Mail, Trash2, Clock, ArrowDown, Eye, Tag, User, CalendarIcon, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EmailStep {
  id: string;
  subject: string;
  body: string;
  scheduledDate?: Date;
  scheduledTime?: string;
  delay: number;
  delayUnit: 'minutes' | 'hours' | 'days';
}

interface CampaignData {
  name: string;
  description: string;
  senderAccounts: any[];
  contacts: any[];
  selectedColumns?: string[];
  emailColumn?: string; // The column name that contains email addresses
  sequence: EmailStep[];
}

interface EmailSequenceProps {
  data: CampaignData;
  onUpdate: (data: Partial<CampaignData>) => void;
}

const EmailSequence = ({ data, onUpdate }: EmailSequenceProps) => {
  const [sequence, setSequence] = useState<EmailStep[]>(data.sequence || []);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [selectedContactIndex, setSelectedContactIndex] = useState<number>(0);
  const [cursorPositions, setCursorPositions] = useState<Record<string, { subject: number; body: number }>>({});
  const [richTextMode, setRichTextMode] = useState<Record<string, boolean>>({});
  const [showTemplateLibrary, setShowTemplateLibrary] = useState<boolean>(false);
  
  // Get available merge tags from uploaded contacts
  const getAvailableMergeTags = () => {
    // Use selectedColumns if available, otherwise fallback to all contact keys
    if (data.selectedColumns && data.selectedColumns.length > 0) {
      const availableTags = data.selectedColumns.sort();
      console.log('Available merge tags from selected columns:', availableTags);
      return availableTags;
    }
    
    if (!data.contacts || data.contacts.length === 0) {
      return ['email']; // Only email is required
    }
    
    // Get all unique keys from contacts (fallback)
    const allKeys = new Set<string>();
    data.contacts.forEach((contact, index) => {
      if (index < 3) {
        console.log(`Contact ${index} keys:`, Object.keys(contact));
      }
      Object.keys(contact).forEach(key => {
        if (key && key.trim()) { // Only add non-empty keys
          allKeys.add(key);
        }
      });
    });
    
    const availableTags = Array.from(allKeys).sort();
    console.log('Available merge tags from CSV:', availableTags);
    console.log('Sample contact data:', data.contacts[0]);
    return availableTags;
  };
  
  const availableMergeTags = getAvailableMergeTags();
  const previewContact = data.contacts?.[selectedContactIndex] || {
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe', 
    company: 'Example Corp',
    city: 'New York',
    phone: '+1-555-0123',
    title: 'Manager'
  };

  useEffect(() => {
    onUpdate({ sequence });
  }, [sequence, onUpdate]);

  // Monitor data changes for debugging
  useEffect(() => {
    if (data.contacts && data.contacts.length > 0) {
      console.log('EmailSequence - Loaded contacts:', data.contacts.length);
      console.log('EmailSequence - First contact data:', data.contacts[0]);
      console.log('EmailSequence - Available fields:', Object.keys(data.contacts[0]));
    }
  }, [data.contacts]);

  const addEmailStep = () => {
    const newStep: EmailStep = {
      id: Date.now().toString(),
      subject: '',
      body: '',
      delay: 0, // Default to 0 delay - user will set specific dates
      delayUnit: 'days',
      scheduledDate: undefined, // Let user set specific date
      scheduledTime: undefined // Let user set specific time
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

  const handleSelectTemplate = (template: any) => {
    try {
      if (template && template.template_data?.sequence && Array.isArray(template.template_data.sequence)) {
        // Convert template data to our EmailStep format
        const templateSequence = template.template_data.sequence.map((step: any) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Generate new ID
          subject: step.subject || '',
          body: step.body || '',
          scheduledDate: step.scheduledDate ? new Date(step.scheduledDate) : undefined,
          scheduledTime: step.scheduledTime || undefined
        }));
        
        setSequence(templateSequence);
        setShowTemplateLibrary(false);
      } else {
        console.error('Invalid template data:', template);
      }
    } catch (error) {
      console.error('Error selecting template:', error);
      setShowTemplateLibrary(false); // Close the template library on error
    }
  };

  const handleSaveTemplate = (templateData: any) => {
    try {
      // Template saved successfully, no action needed here
      console.log('Template saved:', templateData);
    } catch (error) {
      console.error('Error in save template callback:', error);
    }
  };

  const replaceVariables = (text: string) => {
    console.log('replaceVariables called with text:', text);
    console.log('availableMergeTags:', availableMergeTags);
    console.log('previewContact:', previewContact);
    
    let result = text;
    availableMergeTags.forEach(tag => {
      const regex = new RegExp(`{{${tag}}}`, 'g');
      const value = previewContact[tag] || `[${tag}]`;
      console.log(`Replacing {{${tag}}} with:`, value);
      result = result.replace(regex, String(value));
    });
    
    console.log('Final result:', result);
    return result;
  };

  const renderHtmlContent = (html: string) => {
    if (!html) return '';
    
    // Replace variables in HTML content
    let result = html;
    availableMergeTags.forEach(tag => {
      const regex = new RegExp(`{{${tag}}}`, 'g');
      const value = previewContact[tag] || `[${tag}]`;
      result = result.replace(regex, String(value));
    });
    return result;
  };

  const handleCursorChange = (stepId: string, field: 'subject' | 'body', position: number) => {
    setCursorPositions(prev => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        [field]: position
      }
    }));
  };

  const insertMergeTag = (stepId: string, field: 'subject' | 'body', tag: string, position?: number) => {
    const step = sequence.find(s => s.id === stepId);
    if (!step) return;
    
    const currentValue = step[field];
    let insertPosition = position;
    
    // If no position provided, use stored cursor position or end of text
    if (insertPosition === undefined) {
      insertPosition = cursorPositions[stepId]?.[field] ?? currentValue.length;
    }
    
    // Insert the tag at the specified position
    const newValue = currentValue.slice(0, insertPosition) + `{{${tag}}}` + currentValue.slice(insertPosition);
    updateStep(stepId, { [field]: newValue });
    
    // Update cursor position to after the inserted tag
    const newCursorPosition = insertPosition + `{{${tag}}}`.length;
    setCursorPositions(prev => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        [field]: newCursorPosition
      }
    }));
  };

  const handleDragStart = (e: React.DragEvent, tag: string) => {
    e.dataTransfer.setData('text/plain', tag);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, stepId: string, field: 'subject' | 'body') => {
    e.preventDefault();
    const tag = e.dataTransfer.getData('text/plain');
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const cursorPosition = target.selectionStart || 0;
    insertMergeTag(stepId, field, tag, cursorPosition);
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="preview-mode" className="text-sm font-medium text-foreground">
              Preview Mode
            </Label>
            <Switch
              id="preview-mode"
              checked={previewMode}
              onCheckedChange={setPreviewMode}
            />
          </div>
          <Button 
            variant="outline"
            onClick={() => {
              try {
                setShowTemplateLibrary(!showTemplateLibrary);
              } catch (error) {
                console.error('Error toggling template library:', error);
                // If there's an error, just close it
                setShowTemplateLibrary(false);
              }
            }}
            className="flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            {showTemplateLibrary ? 'Hide Templates' : 'Templates'}
          </Button>
          <Button 
            onClick={addEmailStep}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Email Step
          </Button>
        </div>
      </div>

      {/* Email Column Selection */}
      {data.contacts && data.contacts.length > 0 && (
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-column" className="text-sm font-medium text-foreground">
                  Email To: <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Select which column contains the email addresses to send emails to. This is critical for campaign delivery.
                </p>
                <Select
                  value={data.emailColumn || ''}
                  onValueChange={(value) => {
                    console.log('Email column selected:', value);
                    console.log('Available columns:', availableMergeTags);
                    onUpdate({ emailColumn: value });
                  }}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select email column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMergeTags.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {data.emailColumn && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Selected: <strong>{data.emailColumn}</strong>
                  </div>
                )}
                {!data.emailColumn && (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    Please select an email column before launching the campaign
                  </div>
                )}
                
                {/* Debug info - show available columns */}
                <div className="text-xs text-muted-foreground">
                  <details>
                    <summary className="cursor-pointer">Available columns ({availableMergeTags.length})</summary>
                    <div className="mt-2 p-2 bg-muted rounded text-xs">
                      {availableMergeTags.map((column, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="font-mono">{column}</span>
                          {data.contacts?.[0]?.[column] && (
                            <span className="text-green-600">✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Library */}
      {showTemplateLibrary && (
        <Card className="bg-gradient-card border-border">
          <CardContent className="pt-6">
            <ErrorBoundary
              fallback={
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-4">
                    <BookOpen className="w-12 h-12 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold mb-2">Template Library Unavailable</h3>
                    <p className="text-sm">
                      The template library is currently unavailable. You can still create your email sequence manually.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowTemplateLibrary(false)}
                  >
                    Close Templates
                  </Button>
                </div>
              }
            >
              <EmailTemplateLibrary
                onSelectTemplate={handleSelectTemplate}
                onSaveTemplate={handleSaveTemplate}
                currentSequence={sequence}
                currentCampaignName={data.name || ''}
              />
            </ErrorBoundary>
          </CardContent>
        </Card>
      )}

      {/* Preview Controls */}
      {previewMode && data.contacts && data.contacts.length > 0 && (
        <Card className="bg-muted/30 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <Label className="text-sm font-medium text-foreground">Preview for contact:</Label>
              </div>
              <Select 
                value={selectedContactIndex.toString()} 
                onValueChange={(value) => setSelectedContactIndex(parseInt(value))}
              >
                <SelectTrigger className="w-64 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.contacts.slice(0, 10).map((contact, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {contact.email} {contact.firstName ? `(${contact.firstName})` : ''}
                    </SelectItem>
                  ))}
                  {data.contacts.length > 10 && (
                    <SelectItem value="more" disabled>
                      ... and {data.contacts.length - 10} more contacts
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {previewMode && sequence.length > 0 && (
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Email Preview - Full Sequence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {sequence.map((step, index) => (
                <div key={step.id} className="border border-border rounded-lg p-4 bg-background">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium text-foreground">Step {index + 1}</span>
                     {index > 0 && step.scheduledDate && (
                       <Badge variant="outline" className="text-xs">
                         {format(step.scheduledDate, "MMM dd")} at {step.scheduledTime || '09:00'}
                       </Badge>
                     )}
                  </div>
                  
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 font-sans">
                    <div className="border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Subject:</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {replaceVariables(step.subject) || 'No subject'}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      To: {previewContact.email}
                    </div>
                    
                    <div 
                      className="text-gray-900 dark:text-gray-100 leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: renderHtmlContent(step.body) || 'No content' 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                       {index > 0 && step.scheduledDate && (
                         <div className="flex items-center gap-1 text-sm text-muted-foreground">
                           <Clock className="w-4 h-4" />
                           {format(step.scheduledDate, "MMM dd")} at {step.scheduledTime || '09:00'}
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
                         <Label className="text-sm font-medium text-foreground">Scheduled Date</Label>
                         <Popover>
                           <PopoverTrigger asChild>
                             <Button
                               variant="outline"
                               className={cn(
                                 "w-full justify-start text-left font-normal bg-background border-border",
                                 !step.scheduledDate && "text-muted-foreground"
                               )}
                             >
                               <CalendarIcon className="mr-2 h-4 w-4" />
                               {step.scheduledDate ? format(step.scheduledDate, "PPP") : <span>Pick a date</span>}
                             </Button>
                           </PopoverTrigger>
                           <PopoverContent className="w-auto p-0" align="start">
                             <Calendar
                               mode="single"
                               selected={step.scheduledDate}
                               onSelect={(date) => updateStep(step.id, { scheduledDate: date })}
                               disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                               initialFocus
                               className={cn("p-3 pointer-events-auto")}
                             />
                           </PopoverContent>
                         </Popover>
                       </div>
                       <div className="space-y-2">
                         <Label className="text-sm font-medium text-foreground">Scheduled Time</Label>
                         <Input
                           type="time"
                           value={step.scheduledTime || '09:00'}
                           onChange={(e) => updateStep(step.id, { scheduledTime: e.target.value })}
                           className="bg-background border-border text-foreground"
                         />
                       </div>
                     </div>
                  )}

                  {/* Subject Line */}
                  <div className="space-y-2">
                     <div className="flex items-center justify-between">
                       <Label className="text-sm font-medium text-foreground">Subject Line</Label>
                       <div className="flex items-center gap-1">
                         <Tag className="w-3 h-3 text-muted-foreground" />
                         <span className="text-xs text-muted-foreground">Drag tags or click to insert at cursor:</span>
                       </div>
                     </div>
                     <Input
                       placeholder="e.g., Quick question about {{company}} from {{city}}"
                       value={step.subject}
                       onChange={(e) => updateStep(step.id, { subject: e.target.value })}
                       onSelect={(e) => handleCursorChange(step.id, 'subject', e.currentTarget.selectionStart || 0)}
                       onClick={(e) => handleCursorChange(step.id, 'subject', e.currentTarget.selectionStart || 0)}
                       onKeyUp={(e) => handleCursorChange(step.id, 'subject', e.currentTarget.selectionStart || 0)}
                       className="bg-background border-border text-foreground"
                       onDragOver={handleDragOver}
                       onDrop={(e) => handleDrop(e, step.id, 'subject')}
                     />
                     <div className="flex flex-wrap gap-1">
                       {availableMergeTags.map(tag => (
                         <Badge 
                           key={tag}
                           variant="outline" 
                           className="text-xs cursor-move hover:bg-primary hover:text-primary-foreground transition-colors select-none"
                           onClick={() => insertMergeTag(step.id, 'subject', tag)}
                           draggable
                           onDragStart={(e) => handleDragStart(e, tag)}
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
                       <div className="flex items-center gap-2">
                         <span className="text-xs text-muted-foreground">
                           {richTextMode[step.id] ? 'Rich Text' : 'Plain Text'}
                         </span>
                         <Switch
                           checked={richTextMode[step.id] || false}
                           onCheckedChange={(checked) => {
                             setRichTextMode(prev => ({ ...prev, [step.id]: checked }));
                             // If switching to plain text, convert HTML to plain text
                             if (!checked && step.body) {
                               const tempDiv = document.createElement('div');
                               tempDiv.innerHTML = step.body;
                               updateStep(step.id, { body: tempDiv.textContent || tempDiv.innerText || '' });
                             }
                           }}
                         />
                       </div>
                     </div>
                     
                     {richTextMode[step.id] ? (
                       <RichTextEditor
                         value={step.body}
                         onChange={(value) => updateStep(step.id, { body: value })}
                         placeholder="Hi {{firstName}},

I hope this email finds you well. I noticed you're from {{city}} and work at {{company}} as a {{title}}.

Best regards,
[Your name]"
                         mergeTags={availableMergeTags}
                         onInsertMergeTag={(tag) => {
                           console.log('Merge tag inserted:', tag);
                         }}
                         className="min-h-[300px]"
                       />
                     ) : (
                       <div className="space-y-2">
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-1">
                             <Tag className="w-3 h-3 text-muted-foreground" />
                             <span className="text-xs text-muted-foreground">Drag tags or click to insert at cursor:</span>
                           </div>
                         </div>
                         <Textarea
                           placeholder="Hi {{firstName}},

I hope this email finds you well. I noticed you're from {{city}} and work at {{company}} as a {{title}}.

Best regards,
[Your name]"
                           value={step.body}
                           onChange={(e) => updateStep(step.id, { body: e.target.value })}
                           onSelect={(e) => handleCursorChange(step.id, 'body', e.currentTarget.selectionStart || 0)}
                           onClick={(e) => handleCursorChange(step.id, 'body', e.currentTarget.selectionStart || 0)}
                           onKeyUp={(e) => handleCursorChange(step.id, 'body', e.currentTarget.selectionStart || 0)}
                           rows={8}
                           className="bg-background border-border text-foreground font-mono text-sm"
                           onDragOver={handleDragOver}
                           onDrop={(e) => handleDrop(e, step.id, 'body')}
                         />
                         <div className="flex flex-wrap gap-1">
                           {availableMergeTags.map(tag => (
                             <Badge 
                               key={tag}
                               variant="outline" 
                               className="text-xs cursor-move hover:bg-primary hover:text-primary-foreground transition-colors select-none"
                               onClick={() => insertMergeTag(step.id, 'body', tag)}
                               draggable
                               onDragStart={(e) => handleDragStart(e, tag)}
                             >
                               {`{{${tag}}}`}
                             </Badge>
                           ))}
                         </div>
                       </div>
                     )}
                     
                     <div className="text-xs text-muted-foreground">
                       Available merge tags from your CSV: {availableMergeTags.join(', ')}
                     </div>
                   </div>

                  {/* Preview */}
                  {!previewMode && (step.subject || step.body) && (
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-4 h-4 text-foreground" />
                        <span className="text-sm font-medium text-foreground">Quick Preview</span>
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
                          <div 
                            className="mt-1 p-2 bg-background rounded text-muted-foreground text-xs"
                            dangerouslySetInnerHTML={{ 
                              __html: renderHtmlContent(step.body) || 'No content' 
                            }}
                          />
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
                    {(() => {
                      if (sequence.length <= 1) return "0 days";
                      
                      // Find the last step with a scheduled date
                      const lastScheduledStep = sequence
                        .filter(step => step.scheduledDate)
                        .sort((a, b) => new Date(b.scheduledDate!).getTime() - new Date(a.scheduledDate!).getTime())[0];
                      
                      if (!lastScheduledStep) {
                        // Fallback to delay-based calculation if no scheduled dates
                        const totalDays = sequence.reduce((total, step, index) => {
                          if (index === 0) return 0;
                          const delayInDays = step.delayUnit === 'days' ? step.delay : 
                                             step.delayUnit === 'hours' ? Math.ceil(step.delay / 24) :
                                             Math.ceil(step.delay / (24 * 60));
                          return total + delayInDays;
                        }, 0);
                        return `${totalDays} days`;
                      }
                      
                      // Calculate duration from first email to last scheduled email
                      const firstEmailDate = new Date();
                      const lastEmailDate = new Date(lastScheduledStep.scheduledDate!);
                      const durationInDays = Math.ceil((lastEmailDate.getTime() - firstEmailDate.getTime()) / (1000 * 60 * 60 * 24));
                      
                      return `${Math.max(0, durationInDays)} days`;
                    })()}
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