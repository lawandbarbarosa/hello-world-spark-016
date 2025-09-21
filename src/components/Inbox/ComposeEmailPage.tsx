import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Send, ArrowLeft } from "lucide-react";

interface ComposeEmailPageProps {
  onBack: () => void;
  onEmailSent?: () => void;
  initialRecipient?: string;
  initialSubject?: string;
  initialBody?: string;
}

const ComposeEmailPage = ({ 
  onBack, 
  onEmailSent, 
  initialRecipient = "", 
  initialSubject = "", 
  initialBody = "" 
}: ComposeEmailPageProps) => {
  const { user } = useAuth();
  const [selectedSender, setSelectedSender] = useState<string>("");
  const [recipient, setRecipient] = useState(initialRecipient);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [sending, setSending] = useState(false);

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

      const senderEmail = selectedSender.trim();

      // Create a direct email send record
      const { data: emailSendRecord, error: insertError } = await supabase
        .from("email_sends")
        .insert({
          campaign_id: null,
          contact_id: null,
          sequence_id: null,
          sender_account_id: null,
          status: "pending",
        })
        .select()
        .single();

      if (insertError) throw insertError;

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

      // Go back to inbox
      onBack();

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inbox
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Send className="w-6 h-6" />
            Compose Email
          </h1>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-6">
          {/* Sender Email */}
          <div className="space-y-2">
            <Label htmlFor="sender-email" className="text-sm font-medium">
              From
            </Label>
            <Input
              id="sender-email"
              type="email"
              placeholder="your-email@example.com"
              value={selectedSender}
              onChange={(e) => setSelectedSender(e.target.value)}
              className="bg-background"
            />
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
              className="bg-background"
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
              className="bg-background"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="email-body" className="text-sm font-medium">
              Message
            </Label>
            <Textarea
              id="email-body"
              placeholder="Write your email message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[300px] bg-background resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedSender("");
                setRecipient("");
                setSubject("");
                setBody("");
              }}
            >
              Clear
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onBack}
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

export default ComposeEmailPage;
