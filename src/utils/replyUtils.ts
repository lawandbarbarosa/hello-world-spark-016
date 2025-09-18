import { supabase } from "@/integrations/supabase/client";

interface TestReplyData {
  contactEmail: string;
  campaignId: string;
  subject?: string;
  body?: string;
}

export const testReplyWebhook = async (replyData: TestReplyData) => {
  try {
    // Test the handle-email-reply edge function with manual data
    const { data, error } = await supabase.functions.invoke('handle-email-reply', {
      body: {
        contactEmail: replyData.contactEmail,
        campaignId: replyData.campaignId,
        replyData: {
          subject: replyData.subject || "Test Reply",
          body: replyData.body || "This is a test reply to verify the webhook functionality",
          timestamp: new Date().toISOString()
        }
      }
    });

    if (error) {
      console.error('Error testing reply webhook:', error);
      throw new Error(error.message || 'Failed to test reply webhook');
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in testReplyWebhook:', error);
    throw error;
  }
};

export const markContactAsReplied = async (contactEmail: string, campaignId: string) => {
  return testReplyWebhook({
    contactEmail,
    campaignId,
    subject: "Manual Reply Mark",
    body: "This contact was manually marked as replied via the interface"
  });
};

// Helper function to validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function to format reply tracking URL for external webhooks
export const getReplyWebhookUrl = (baseUrl?: string): string => {
  const projectId = "ogzdqhvpsobpwxteqpnx";
  return baseUrl || `https://${projectId}.supabase.co/functions/v1/handle-email-reply`;
};

// Helper function to create webhook payload format for external integration
export const createWebhookPayload = (
  contactEmail: string, 
  campaignId: string, 
  replySubject: string, 
  replyBody: string
) => {
  return {
    contactEmail,
    campaignId,
    replyData: {
      subject: replySubject,
      body: replyBody,
      timestamp: new Date().toISOString()
    }
  };
};