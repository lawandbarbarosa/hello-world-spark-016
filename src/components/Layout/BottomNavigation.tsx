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
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl px-1.5 py-1 shadow-xl border border-slate-700/50">
        <div className="flex items-center gap-2">
          {/* Main navigation items */}
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "p-2 rounded-xl transition-all duration-200",
                  activeTab === item.id
                    ? "text-white bg-white/10 scale-110"
                    : "text-slate-400 hover:text-white hover:scale-105"
                )}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
          
          {/* New Campaign Button */}
          <button
            onClick={() => onTabChange('create-campaign')}
            className={cn(
              "p-2 rounded-xl transition-all duration-200",
              activeTab === 'create-campaign'
                ? "text-white bg-white/10 scale-110"
                : "text-slate-400 hover:text-white hover:scale-105"
            )}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BottomNavigation;