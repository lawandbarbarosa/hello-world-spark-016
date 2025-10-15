// Test script to verify email counting logic
// This can be run in the browser console to test the dashboard queries

async function testEmailCounting() {
  console.log('🧪 Testing Email Counting Logic...');
  
  try {
    // Test the new query logic
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id')
      .eq('user_id', user?.id);
    
    const campaignIds = campaigns?.map(c => c.id) || [];
    
    // Test using count queries to avoid 1000 row limit
    const orCondition = campaignIds.length > 0 
      ? `campaign_id.in.(${campaignIds.join(',')}),campaign_id.is.null`
      : 'campaign_id.is.null';

    const [totalResult, sentResult, openedResult, failedResult, pendingResult] = await Promise.all([
      supabase
        .from('email_sends')
        .select('*', { count: 'exact', head: true })
        .or(orCondition),
      supabase
        .from('email_sends')
        .select('*', { count: 'exact', head: true })
        .or(orCondition)
        .eq('status', 'sent'),
      supabase
        .from('email_sends')
        .select('*', { count: 'exact', head: true })
        .or(orCondition)
        .not('opened_at', 'is', null),
      supabase
        .from('email_sends')
        .select('*', { count: 'exact', head: true })
        .or(orCondition)
        .eq('status', 'failed'),
      supabase
        .from('email_sends')
        .select('*', { count: 'exact', head: true })
        .or(orCondition)
        .eq('status', 'pending')
    ]);
    
    if (totalResult.error || sentResult.error || openedResult.error || failedResult.error || pendingResult.error) {
      console.error('❌ Query failed:', {
        totalError: totalResult.error,
        sentError: sentResult.error,
        openedError: openedResult.error,
        failedError: failedResult.error,
        pendingError: pendingResult.error
      });
      return;
    }
    
    // Analyze the results
    const analysis = {
      total: totalResult.count || 0,
      sentEmails: sentResult.count || 0,
      openedEmails: openedResult.count || 0,
      failedEmails: failedResult.count || 0,
      pendingEmails: pendingResult.count || 0,
      campaignIds: campaignIds.length
    };
    
    console.log('📊 Email Analysis:', analysis);
    
    // Check for stuck emails
    if (analysis.pendingEmails > 0) {
      console.warn(`⚠️ Found ${analysis.pendingEmails} emails stuck in pending status`);
    }
    
    // Calculate rates
    const openRate = analysis.sentEmails > 0 ? Math.round((analysis.openedEmails / analysis.sentEmails) * 100) : 0;
    const failureRate = analysis.total > 0 ? Math.round((analysis.failedEmails / analysis.total) * 100) : 0;
    
    console.log('📈 Calculated Rates:', {
      openRate: `${openRate}%`,
      failureRate: `${failureRate}%`
    });
    
    console.log('✅ Email counting test completed successfully!');
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

// Export for use in console
window.testEmailCounting = testEmailCounting;
