import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { 
  Send, 
  X, 
  Paperclip, 
  Bold, 
  Italic, 
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Link,
  Smile,
  Minimize2,
  Maximize2
} from "lucide-react";

interface ComposeEmailProps {
  onClose: () => void;
  onEmailSent?: () => void;
  initialRecipient?: string;
  initialSubject?: string;
  initialBody?: string;
}

interface SenderAccount {
  id: string;
  email: string;
  provider: string;
  daily_limit: number;
}

const ComposeEmail = ({ 
  onClose, 
  onEmailSent, 
  initialRecipient = "", 
  initialSubject = "", 
  initialBody = "" 
}: ComposeEmailProps) => {
  const { user } = useAuth();
  const [senderAccounts, setSenderAccounts] = useState<SenderAccount[]>([]);
  const [selectedSender, setSelectedSender] = useState<string>("");
  const [recipient, setRecipient] = useState(initialRecipient);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [sending, setSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);

  // Debug logging
  console.log('ComposeEmail component rendered');

  useEffect(() => {
    if (user) {
      loadSenderAccounts();
    }
  }, [user]);

  const loadSenderAccounts = async () => {
    try {
  const { data, error } = await supabase
        .from('sender_accounts')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;

      setSenderAccounts(data || []);
      if (data && data.length > 0) {
        setSelectedSender(data[0].id);
      }
    } catch (error) {
      console.error('Error loading sender accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load sender accounts",
        variant: "destructive",
      });
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSend = async () => {
    if (!selectedSender.trim()) {
      toast({
        title: "Error",
        description: "Please enter a sender email address",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(selectedSender)) {
      toast({
        title: "Error",
        description: "Please enter a valid sender email address",
        variant: "destructive",
      });
      return;
    }

    if (!recipient.trim()) {
      toast({
        title: "Error",
        description: "Please enter a recipient email",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(recipient)) {
      toast({
        title: "Error",
        description: "Please enter a valid recipient email",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim()) {
      toast({
        title: "Error",
        description: "Please enter a subject",
        variant: "destructive",
      });
      return;
    }

    if (!body.trim()) {
      toast({
        title: "Error",
        description: "Please enter email content",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);

      // Use the entered email address directly
      const senderEmail = selectedSender.trim();

      // Create a direct email send record
      const { data: emailSendRecord, error: insertError } = await supabase
        .from("email_sends")
        .insert({
          campaign_id: null, // Direct email, not part of a campaign
          contact_id: null, // Direct email, not from contact list
          sequence_id: null, // Direct email, not part of sequence
          sender_account_id: null, // Direct email, not from configured account
          status: "pending",
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating email send record:', insertError);
        throw insertError;
      }

      // Send email using Resend
      const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-direct-email', {
        body: {
          to: recipient,
          from: senderEmail,
          subject: subject,
          html: body.replace(/\n/g, '<br>'),
          emailSendId: emailSendRecord.id
        }
      });

      if (emailError) throw emailError;

      if (emailResponse.error) {
        throw new Error(emailResponse.error);
      }

      // Update email send record
      await supabase
        .from("email_sends")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", emailSendRecord.id);

      toast({
        title: "Success",
        description: "Email sent successfully!",
      });

      // Reset form
      setSelectedSender("");
      setRecipient("");
      setSubject("");
      setBody("");
      
      // Notify parent component
      if (onEmailSent) {
        onEmailSent();
      }

      // Close compose window
      onClose();

    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleFormatText = (format: string) => {
    const textarea = document.getElementById('email-body') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);
    
    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `<u>${selectedText}</u>`;
        break;
      default:
        formattedText = selectedText;
    }

    const newBody = body.substring(0, start) + formattedText + body.substring(end);
    setBody(newBody);
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999]" style={{ zIndex: 9999 }}>
        <div className="w-80 shadow-lg border-2 border-primary bg-background rounded-lg">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Compose Email</h3>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(false)}
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
      style={{ zIndex: 9999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-4xl h-[80vh] flex flex-col bg-background border border-border rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 border-b p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Send className="w-5 h-5" />
              Compose Email
            </h2>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col space-y-4 p-6 overflow-auto">
          {/* Sender Email Input */}
          <div className="space-y-2">
            <Label htmlFor="sender-email" className="text-sm font-medium">
              From
            </Label>
            <div className="flex gap-2">
              <Input
                id="sender-email"
                type="email"
                placeholder="your-email@example.com"
                value={selectedSender}
                onChange={(e) => setSelectedSender(e.target.value)}
                className="flex-1 bg-background border-border text-foreground"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Show a dropdown with configured accounts for quick selection
                  const account = senderAccounts[0];
                  if (account) {
                    setSelectedSender(account.email);
                  }
                }}
                title="Use configured account"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter any email address you want to send from
            </p>
          </div>

          {/* Recipient */}
          <div className="space-y-2">
            <Label htmlFor="recipient" className="text-sm font-medium">
              To
            </Label>
            <Input
              id="recipient"
              type="email"
              placeholder="recipient@example.com"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="bg-background border-border text-foreground"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium">
              Subject
            </Label>
            <Input
              id="subject"
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-background border-border text-foreground"
            />
          </div>

          {/* Formatting Toolbar */}
          <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFormatText('bold')}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFormatText('italic')}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFormatText('underline')}
              title="Underline"
            >
              <Underline className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              title="Attach File"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Insert Link"
            >
              <Link className="w-4 h-4" />
            </Button>
          </div>

          {/* Email Body */}
          <div className="flex-1 space-y-2">
            <Label htmlFor="email-body" className="text-sm font-medium">
              Message
            </Label>
            <Textarea
              id="email-body"
              placeholder="Write your email message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="flex-1 min-h-[300px] bg-background border-border text-foreground resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedSender("");
                  setRecipient("");
                  setSubject("");
                  setBody("");
                }}
              >
                Clear
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || !selectedSender.trim() || !recipient.trim() || !subject.trim() || !body.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComposeEmail;
