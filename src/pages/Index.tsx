import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import Sidebar from '@/components/Layout/Sidebar';
import Dashboard from '@/components/Dashboard/Dashboard';
import CampaignList from '@/components/Campaigns/CampaignList';
import CampaignsOverview from '@/components/Campaigns/CampaignsOverview';
import CampaignWizard from '@/components/Campaigns/CampaignWizard';
import EditCampaign from '@/components/Campaigns/EditCampaign';
import Delivery from '@/components/Delivery/Delivery';
import Inbox from '@/components/Inbox/Inbox';
import Spam from '@/components/Spam/Spam';
import SenderAccounts from '@/components/Senders/SenderAccounts';
import Settings from '@/components/Settings/Settings';
import ContactsList from '@/components/Contacts/ContactsList';
import ReplyTracker from '@/components/Replies/ReplyTracker';
import Calendar from '@/components/Calendar/Calendar';
import SessionDebugger from '@/components/SessionDebugger';
import EmailClassification from '@/components/EmailClassification/EmailClassification';

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Determine active tab from URL
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
      setActiveTab('dashboard');
    } else if (path === '/campaigns') {
      setActiveTab('campaigns');
    } else if (path === '/campaigns-overview') {
      setActiveTab('campaigns-overview');
    } else if (path === '/campaigns/create') {
      setActiveTab('create-campaign');
    } else if (path.startsWith('/campaigns/edit/')) {
      setActiveTab('edit-campaign');
      setSelectedCampaignId(params.id || null);
    } else if (path === '/calendar') {
      setActiveTab('calendar');
    } else if (path === '/delivery') {
      setActiveTab('delivery');
    } else if (path === '/inbox') {
      setActiveTab('inbox');
    } else if (path === '/replies') {
      setActiveTab('replies');
    } else if (path === '/spam') {
      setActiveTab('spam');
    } else if (path === '/email-classification') {
      setActiveTab('email-classification');
    } else if (path === '/contacts') {
      setActiveTab('contacts');
    } else if (path === '/senders') {
      setActiveTab('senders');
    } else if (path === '/settings') {
      setActiveTab('settings');
    } else if (path === '/debug') {
      setActiveTab('debug');
    }
  }, [location.pathname, params.id]);

  const handleNavigation = (tab: string, campaignId?: string) => {
    switch (tab) {
      case 'dashboard':
        navigate('/');
        break;
      case 'campaigns':
        navigate('/campaigns');
        break;
      case 'campaigns-overview':
        navigate('/campaigns-overview');
        break;
      case 'create-campaign':
        navigate('/campaigns/create');
        break;
      case 'edit-campaign':
        if (campaignId) {
          navigate(`/campaigns/edit/${campaignId}`);
        }
        break;
      case 'calendar':
        navigate('/calendar');
        break;
      case 'delivery':
        navigate('/delivery');
        break;
      case 'inbox':
        navigate('/inbox');
        break;
      case 'replies':
        navigate('/replies');
        break;
      case 'spam':
        navigate('/spam');
        break;
      case 'email-classification':
        navigate('/email-classification');
        break;
      case 'contacts':
        navigate('/contacts');
        break;
      case 'senders':
        navigate('/senders');
        break;
      case 'settings':
        navigate('/settings');
        break;
      default:
        navigate('/');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigation} />;
      case 'campaigns':
        return <CampaignList onCreateNew={() => handleNavigation('create-campaign')} onEditCampaign={(id) => handleNavigation('edit-campaign', id)} />;
      case 'campaigns-overview':
        return <CampaignsOverview onCreateNew={() => handleNavigation('create-campaign')} onEditCampaign={(id) => handleNavigation('edit-campaign', id)} />;
      case 'create-campaign':
        return <CampaignWizard onBack={() => handleNavigation('campaigns')} />;
      case 'edit-campaign':
        return selectedCampaignId ? (
          <EditCampaign 
            campaignId={selectedCampaignId} 
            onBack={() => handleNavigation('campaigns')} 
          />
        ) : (
          <Dashboard onNavigate={handleNavigation} />
        );
      case 'calendar':
        return <Calendar />;
      case 'delivery':
        return <Delivery />;
      case 'inbox':
        return <Inbox />;
      case 'replies':
        return <ReplyTracker />;
      case 'spam':
        return <Spam />;
      case 'email-classification':
        return <EmailClassification />;
      case 'contacts':
        return <ContactsList />;
      case 'senders':
        return <SenderAccounts />;
      case 'settings':
        return <Settings />;
      case 'debug':
        return <SessionDebugger />;
      default:
        return <Dashboard onNavigate={handleNavigation} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} onTabChange={handleNavigation} />
      <main className="flex-1 p-6 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;