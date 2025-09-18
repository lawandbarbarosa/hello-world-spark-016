import { useState } from 'react';
import Sidebar from '@/components/Layout/Sidebar';
import Dashboard from '@/components/Dashboard/Dashboard';
import CampaignList from '@/components/Campaigns/CampaignList';
import CampaignWizard from '@/components/Campaigns/CampaignWizard';
import EditCampaign from '@/components/Campaigns/EditCampaign';
import Delivery from '@/components/Delivery/Delivery';
import Inbox from '@/components/Inbox/Inbox';
import Spam from '@/components/Spam/Spam';
import SenderAccounts from '@/components/Senders/SenderAccounts';
import Settings from '@/components/Settings/Settings';
import ContactsList from '@/components/Contacts/ContactsList';
import ReplyTracker from '@/components/Replies/ReplyTracker';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const handleNavigation = (tab: string, campaignId?: string) => {
    setActiveTab(tab);
    if (campaignId) {
      setSelectedCampaignId(campaignId);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigation} />;
      case 'campaigns':
        return <CampaignList onCreateNew={() => setActiveTab('create-campaign')} />;
      case 'create-campaign':
        return <CampaignWizard onBack={() => setActiveTab('campaigns')} />;
      case 'edit-campaign':
        return selectedCampaignId ? (
          <EditCampaign 
            campaignId={selectedCampaignId} 
            onBack={() => setActiveTab('campaigns')} 
          />
        ) : (
          <Dashboard onNavigate={handleNavigation} />
        );
      case 'delivery':
        return <Delivery />;
      case 'inbox':
        return <Inbox />;
      case 'replies':
        return <ReplyTracker />;
      case 'spam':
        return <Spam />;
      case 'contacts':
        return <ContactsList />;
      case 'senders':
        return <SenderAccounts />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={handleNavigation} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 p-6 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;