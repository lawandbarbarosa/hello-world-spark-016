import { supabase } from '@/integrations/supabase/client';
import { toZonedTime, format } from 'date-fns-tz';

export interface SendingPermissionCheck {
  canSend: boolean;
  reason?: string;
}

export const checkSendingPermissions = async (
  userId: string,
  senderAccountId: string
): Promise<SendingPermissionCheck> => {
  try {
    // Get user settings
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('daily_send_limit, send_time_start, send_time_end, timezone')
      .eq('user_id', userId)
      .single();

    if (settingsError) {
      return { canSend: false, reason: 'Unable to load user settings' };
    }

    // Convert current time to user's timezone
    const userTimezone = settings.timezone || 'UTC';
    const now = new Date();
    const zonedTime = toZonedTime(now, userTimezone);
    const currentTime = format(zonedTime, 'HH:mm', { timeZone: userTimezone });

    // Check time window
    const startTime = settings.send_time_start || '08:00';
    const endTime = settings.send_time_end || '18:00';

    console.log(`Time check - Current: ${currentTime}, Window: ${startTime} - ${endTime}, Timezone: ${userTimezone}`);

    if (currentTime < startTime || currentTime > endTime) {
      return { 
        canSend: false, 
        reason: `Sending is only allowed between ${startTime} and ${endTime} in ${userTimezone} timezone. Current time: ${currentTime}` 
      };
    }

    // Check daily limit
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const { count, error: countError } = await supabase
      .from('email_sends')
      .select('*', { count: 'exact', head: true })
      .eq('sender_account_id', senderAccountId)
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', todayEnd.toISOString());

    if (countError) {
      return { canSend: false, reason: 'Unable to check daily send count' };
    }

    const dailyLimit = settings.daily_send_limit || 50;
    if ((count || 0) >= dailyLimit) {
      return { 
        canSend: false, 
        reason: `Daily send limit of ${dailyLimit} emails reached for this sender` 
      };
    }

    return { canSend: true };
  } catch (error) {
    console.error('Error checking sending permissions:', error);
    return { canSend: false, reason: 'Error checking sending permissions' };
  }
};

export const formatEmailWithSignature = (
  body: string, 
  signature: string,
  unsubscribeLink?: string,
  legalDisclaimer?: string
): string => {
  let formattedBody = body;

  // Add signature if provided
  if (signature.trim()) {
    formattedBody += '\n\n' + signature;
  }

  // Add unsubscribe link if provided
  if (unsubscribeLink) {
    formattedBody += '\n\n---\n';
    formattedBody += `If you no longer wish to receive these emails, you can [unsubscribe here](${unsubscribeLink}).`;
  }

  // Add legal disclaimer if provided
  if (legalDisclaimer && legalDisclaimer.trim()) {
    formattedBody += '\n\n' + legalDisclaimer;
  }

  return formattedBody;
};

export const replaceMergeTags = (
  text: string,
  contact: any,
  fallbackTags: { first_name: string; company: string }
): string => {
  let result = text;

  // Replace merge tags with fallback support
  result = result.replace(/\{\{(\w+)\|([^}]+)\}\}/g, (match, field, fallback) => {
    return contact[field] || fallback;
  });

  // Replace simple merge tags without fallback
  result = result.replace(/\{\{(\w+)\}\}/g, (match, field) => {
    if (field === 'first_name') {
      return contact.first_name || fallbackTags.first_name;
    }
    if (field === 'company') {
      return contact.company || fallbackTags.company;
    }
    return contact[field] || match;
  });

  return result;
};