import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Mail, 
  Users, 
  Settings, 
  Plus,
  Inbox,
  Send,
  LogOut,
  User,
  Shield,
  Reply
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Failed to sign out');
    } else {
      toast.success('Signed out successfully');
      navigate('/auth');
    }
  };

  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'campaigns', label: 'Campaigns', icon: Mail },
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center">
      <div className="bg-slate-800 backdrop-blur-sm rounded-2xl px-4 py-2.5 shadow-lg">
        <div className="flex items-center justify-center gap-4">
          {/* Main navigation items */}
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  activeTab === item.id
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
          
          {/* New Campaign Button */}
          <button
            onClick={() => onTabChange('create-campaign')}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BottomNavigation;