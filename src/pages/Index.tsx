import { useState } from 'react';
import Sidebar from '@/components/Layout/Sidebar';
import Dashboard from '@/components/Dashboard/Dashboard';
import CampaignList from '@/components/Campaigns/CampaignList';
import CampaignWizard from '@/components/Campaigns/CampaignWizard';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveTab} />;
      case 'campaigns':
        return <CampaignList onCreateNew={() => setActiveTab('create-campaign')} />;
      case 'create-campaign':
        return <CampaignWizard onBack={() => setActiveTab('campaigns')} />;
      case 'inbox':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Gmail-style Inbox</h2>
            <p className="text-muted-foreground">View and manage email replies...</p>
          </div>
        );
      case 'contacts':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Contact Management</h2>
            <p className="text-muted-foreground">Upload and manage contact lists...</p>
          </div>
        );
      case 'senders':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Sender Accounts</h2>
            <p className="text-muted-foreground">Manage your email sender accounts...</p>
          </div>
        );
      case 'settings':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Settings</h2>
            <p className="text-muted-foreground">Configure your account and preferences...</p>
          </div>
        );
      default:
        return <Dashboard onNavigate={setActiveTab} />;
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