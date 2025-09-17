import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Mail, 
  Users, 
  Play,
  Pause,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Paused' | 'Draft' | 'Completed';
  contacts: number;
  sent: number;
  opened: number;
  replied: number;
  steps: number;
  created: string;
  lastActivity: string;
}

interface CampaignListProps {
  onCreateNew: () => void;
}

const CampaignList = ({ onCreateNew }: CampaignListProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Empty campaigns array - users start fresh
  const campaigns: Campaign[] = [];

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'Active':
        return 'bg-success text-success-foreground';
      case 'Paused':
        return 'bg-warning text-warning-foreground';
      case 'Draft':
        return 'bg-muted text-muted-foreground';
      case 'Completed':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your email campaigns
          </p>
        </div>
        <Button 
          onClick={onCreateNew}
          className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-md"
        >
          <Mail className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCampaigns.map((campaign) => (
          <Card key={campaign.id} className="bg-gradient-card border-border shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-lg text-foreground">{campaign.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {campaign.description}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(campaign.status)}>
                    {campaign.status}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Campaign
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        {campaign.status === 'Active' ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause Campaign
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Start Campaign
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Campaign
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-3 h-3" />
                    Contacts
                  </div>
                  <div className="font-semibold text-foreground">{campaign.contacts.toLocaleString()}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    Steps
                  </div>
                  <div className="font-semibold text-foreground">{campaign.steps}</div>
                </div>
              </div>

              {/* Performance Metrics */}
              {campaign.sent > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Performance</div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <div className="font-semibold text-foreground">{campaign.sent}</div>
                      <div className="text-muted-foreground text-xs">Sent</div>
                    </div>
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <div className="font-semibold text-foreground">{campaign.opened}</div>
                      <div className="text-muted-foreground text-xs">Opened</div>
                    </div>
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <div className="font-semibold text-foreground">{campaign.replied}</div>
                      <div className="text-muted-foreground text-xs">Replied</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                <span>Created {new Date(campaign.created).toLocaleDateString()}</span>
                <span>Last activity: {campaign.lastActivity}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCampaigns.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No campaigns found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Get started by creating your first campaign"}
            </p>
            {!searchTerm && (
              <Button 
                onClick={onCreateNew}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              >
                Create Your First Campaign
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CampaignList;