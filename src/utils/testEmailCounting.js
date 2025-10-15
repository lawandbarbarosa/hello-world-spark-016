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
    
    // Test the main dashboard query
    const { data: emailSendsData, error } = await supabase
      .from('email_sends')
      .select('id, status, opened_at, campaign_id, sender_account_id, created_at')
      .or(`campaign_id.in.(${campaignIds.join(',')}),campaign_id.is.null`);
    
    if (error) {
      console.error('❌ Query failed:', error);
      return;
    }
    
    // Analyze the results
    const analysis = {
      total: emailSendsData?.length || 0,
      campaignEmails: emailSendsData?.filter(e => e.campaign_id).length || 0,
      directEmails: emailSendsData?.filter(e => !e.campaign_id).length || 0,
      sentEmails: emailSendsData?.filter(e => e.status === 'sent').length || 0,
      pendingEmails: emailSendsData?.filter(e => e.status === 'pending').length || 0,
      failedEmails: emailSendsData?.filter(e => e.status === 'failed').length || 0,
      openedEmails: emailSendsData?.filter(e => e.opened_at).length || 0
    };
    
    console.log('📊 Email Analysis:', analysis);
    
    // Check for stuck emails
    const stuckEmails = emailSendsData?.filter(e => e.status === 'pending');
    if (stuckEmails && stuckEmails.length > 0) {
      console.warn('⚠️ Found stuck emails:', stuckEmails.map(e => ({
        id: e.id,
        created_at: e.created_at,
        campaign_id: e.campaign_id,
        sender_account_id: e.sender_account_id
      })));
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
