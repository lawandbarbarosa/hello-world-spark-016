import { supabase } from "@/integrations/supabase/client";

export interface SpamEmail {
  id: string;
  user_id: string;
  subject: string;
  sender_email: string;
  content: string | null;
  original_message_id: string | null;
  campaign_id: string | null;
  received_at: string;
  created_at: string;
  updated_at: string;
}

// Add an email to spam folder
export const addToSpam = async (
  subject: string,
  senderEmail: string,
  content: string,
  originalMessageId?: string,
  campaignId?: string
) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User must be authenticated to add spam emails');
    }

    const { data, error } = await supabase
      .from('spam_emails')
      .insert({
        user_id: user.id,
        subject,
        sender_email: senderEmail,
        content,
        original_message_id: originalMessageId,
        campaign_id: campaignId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding email to spam:', error);
      throw new Error(error.message || 'Failed to add email to spam');
    }

    return data;
  } catch (error) {
    console.error('Error in addToSpam:', error);
    throw error;
  }
};

// Get all spam emails for the current user
export const getSpamEmails = async () => {
  try {
    const { data, error } = await supabase
      .from('spam_emails')
      .select('*')
      .order('received_at', { ascending: false });

    if (error) {
      console.error('Error fetching spam emails:', error);
      throw new Error(error.message || 'Failed to fetch spam emails');
    }

    return data || [];
  } catch (error) {
    console.error('Error in getSpamEmails:', error);
    throw error;
  }
};

// Delete a specific spam email
export const deleteSpamEmail = async (emailId: string) => {
  try {
    const { error } = await supabase
      .from('spam_emails')
      .delete()
      .eq('id', emailId);

    if (error) {
      console.error('Error deleting spam email:', error);
      throw new Error(error.message || 'Failed to delete spam email');
    }

    return true;
  } catch (error) {
    console.error('Error in deleteSpamEmail:', error);
    throw error;
  }
};

// Clear all spam emails for the current user
export const clearAllSpam = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('spam_emails')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing all spam:', error);
      throw new Error(error.message || 'Failed to clear all spam');
    }

    return true;
  } catch (error) {
    console.error('Error in clearAllSpam:', error);
    throw error;
  }
};

// Create sample spam emails for testing
export const createSampleSpamEmails = async () => {
  const sampleEmails = [
    {
      subject: 'URGENT: Claim your prize now!',
      sender_email: 'noreply@suspicious-site.com',
      content: 'You have won $1,000,000! Click here to claim your prize immediately. This offer expires in 24 hours! Act now to secure your winnings.',
    },
    {
      subject: 'Your account has been compromised',
      sender_email: 'security@fake-bank.com',
      content: 'We detected suspicious activity on your account. Please verify your identity immediately by clicking this link to avoid account suspension.',
    },
    {
      subject: 'Amazing weight loss secret doctors hate!',
      sender_email: 'health@miracle-pills.net',
      content: 'Lose 30 pounds in 30 days with this one weird trick! No diet or exercise required. Doctors are shocked by this breakthrough method.',
    },
    {
      subject: 'Re: Your PayPal account is suspended',
      sender_email: 'support@payp4l-security.com',
      content: 'Your PayPal account has been temporarily suspended due to unusual activity. Click here to restore access and verify your payment information.',
    },
    {
      subject: 'Congratulations! You\'ve been selected',
      sender_email: 'winner@lottery-international.org',
      content: 'You have been randomly selected to receive a $500,000 cash prize from our international lottery program. Claim your prize within 48 hours.',
    }
  ];

  try {
    const results = await Promise.all(
      sampleEmails.map(email => addToSpam(email.subject, email.sender_email, email.content))
    );
    return results;
  } catch (error) {
    console.error('Error creating sample spam emails:', error);
    throw error;
  }
};