import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Send, X, Mail } from "lucide-react";

interface ComposeEmailSimpleProps {
  onClose: () => void;
  onEmailSent?: () => void;
  initialRecipient?: string;
  initialSubject?: string;
  initialBody?: string;
}

const ComposeEmailSimple = ({ 
  onClose, 
  onEmailSent, 
  initialRecipient = "", 
  initialSubject = "", 
  initialBody = "" 
}: ComposeEmailSimpleProps) => {
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

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '800px',
          height: '80vh',
          backgroundColor: 'var(--background)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem' 
          }}>
            <Send style={{ width: '1.25rem', height: '1.25rem' }} />
            Compose Email
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X style={{ width: '1rem', height: '1rem' }} />
          </Button>
        </div>

        {/* Content */}
        <div 
          style={{
            flex: 1,
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            overflow: 'auto'
          }}
        >
          {/* Sender Email */}
          <div>
            <Label htmlFor="sender-email" style={{ fontSize: '0.875rem', fontWeight: '500' }}>
              From
            </Label>
            <Input
              id="sender-email"
              type="email"
              placeholder="your-email@example.com"
              value={selectedSender}
              onChange={(e) => setSelectedSender(e.target.value)}
              style={{ marginTop: '0.5rem' }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
              Enter any email address you want to send from
            </p>
          </div>

          {/* Recipient */}
          <div>
            <Label htmlFor="recipient" style={{ fontSize: '0.875rem', fontWeight: '500' }}>
              To
            </Label>
            <Input
              id="recipient"
              type="email"
              placeholder="recipient@example.com"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              style={{ marginTop: '0.5rem' }}
            />
          </div>

          {/* Subject */}
          <div>
            <Label htmlFor="subject" style={{ fontSize: '0.875rem', fontWeight: '500' }}>
              Subject
            </Label>
            <Input
              id="subject"
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ marginTop: '0.5rem' }}
            />
          </div>

          {/* Message */}
          <div style={{ flex: 1 }}>
            <Label htmlFor="email-body" style={{ fontSize: '0.875rem', fontWeight: '500' }}>
              Message
            </Label>
            <Textarea
              id="email-body"
              placeholder="Write your email message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ 
                marginTop: '0.5rem',
                minHeight: '200px',
                resize: 'none'
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div 
          style={{
            padding: '1.5rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              {sending ? (
                <>
                  <div 
                    style={{
                      width: '1rem',
                      height: '1rem',
                      border: '2px solid transparent',
                      borderTop: '2px solid currentColor',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginRight: '0.5rem'
                    }}
                  />
                  Sending...
                </>
              ) : (
                <>
                  <Send style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default ComposeEmailSimple;
