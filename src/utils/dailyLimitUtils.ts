import { supabase } from '@/integrations/supabase/client';

export interface DailyLimitStatus {
  senderAccountId: string;
  email: string;
  dailyLimit: number;
  sentToday: number;
  remaining: number;
  canSend: boolean;
}

export const getDailyLimitStatus = async (
  userId: string,
  senderAccountIds?: string[]
): Promise<DailyLimitStatus[]> => {
  try {
    // Get user's daily limit setting
    const { data: settings } = await supabase
      .from('user_settings')
      .select('daily_send_limit')
      .eq('user_id', userId)
      .single();

    const dailyLimit = settings?.daily_send_limit || 50;

    // Get sender accounts
    let senderQuery = supabase
      .from('sender_accounts')
      .select('id, email')
      .eq('user_id', userId);

    if (senderAccountIds && senderAccountIds.length > 0) {
      senderQuery = senderQuery.in('id', senderAccountIds);
    }

    const { data: senders, error: senderError } = await senderQuery;

    if (senderError || !senders) {
      return [];
    }

    // Get today's counts for each sender
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const results: DailyLimitStatus[] = [];

    for (const sender of senders) {
      const { count, error: countError } = await supabase
        .from('email_sends')
        .select('*', { count: 'exact', head: true })
        .eq('sender_account_id', sender.id)
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString())
        .in('status', ['sent', 'pending']); // Count both sent and pending

      const sentToday = countError ? 0 : (count || 0);
      const remaining = Math.max(0, dailyLimit - sentToday);

      results.push({
        senderAccountId: sender.id,
        email: sender.email,
        dailyLimit,
        sentToday,
        remaining,
        canSend: remaining > 0
      });
    }

    return results.sort((a, b) => b.remaining - a.remaining); // Sort by remaining capacity
  } catch (error) {
    console.error('Error getting daily limit status:', error);
    return [];
  }
};

export const getAvailableSenders = async (
  userId: string,
  campaignId?: string
): Promise<DailyLimitStatus[]> => {
  let senderIds: string[] | undefined;

  if (campaignId) {
    // Get sender accounts associated with this campaign
    const { data: campaignSenders } = await supabase
      .from('sender_accounts')
      .select('id')
      .eq('campaign_id', campaignId);

    senderIds = campaignSenders?.map(s => s.id);
  }

  const statuses = await getDailyLimitStatus(userId, senderIds);
  return statuses.filter(status => status.canSend);
};

export const getTotalDailyCapacity = async (userId: string): Promise<{
  totalLimit: number;
  totalSent: number;
  totalRemaining: number;
  senderCount: number;
}> => {
  const statuses = await getDailyLimitStatus(userId);
  
  const totalLimit = statuses.reduce((sum, status) => sum + status.dailyLimit, 0);
  const totalSent = statuses.reduce((sum, status) => sum + status.sentToday, 0);
  const totalRemaining = statuses.reduce((sum, status) => sum + status.remaining, 0);
  
  return {
    totalLimit,
    totalSent,
    totalRemaining,
    senderCount: statuses.length
  };
};