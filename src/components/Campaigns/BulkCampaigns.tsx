import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  Users, 
  Mail, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Play,
  Pause,
  Settings,
  Download,
  Trash2,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

interface BulkCampaign {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  emails: number;
  sent: number;
  opened: number;
  replied: number;
  createdAt: string;
}

const BulkCampaigns = () => {
  const [activeTab, setActiveTab] = useState('create');
  const [campaignName, setCampaignName] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('');
  const [scheduleType, setScheduleType] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // State for bulk campaigns - starts empty, only shows created campaigns
  const [bulkCampaigns, setBulkCampaigns] = useState<BulkCampaign[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.type === 'application/vnd.ms-excel') {
        setUploadedFile(file);
        toast.success(`File "${file.name}" uploaded successfully`);
      } else {
        toast.error('Please upload a CSV file');
      }
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName || !emailTemplate || !scheduleType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create new campaign object
    const newCampaign: BulkCampaign = {
      id: Date.now().toString(), // Simple ID generation
      name: campaignName,
      status: 'draft',
      emails: uploadedFile ? Math.floor(Math.random() * 5000) + 1000 : 0, // Mock email count if file uploaded
      sent: 0,
      opened: 0,
      replied: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    // Add the new campaign to the list
    setBulkCampaigns(prev => [newCampaign, ...prev]);
    
    toast.success('Bulk campaign created successfully!');
    setIsCreating(false);
    setActiveTab('manage');
    
    // Reset form
    setCampaignName('');
    setEmailTemplate('');
    setScheduleType('');
    setUploadedFile(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      case 'draft': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'draft': return <FileText className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleDeleteCampaign = (campaignId: string) => {
    setBulkCampaigns(prev => prev.filter(campaign => campaign.id !== campaignId));
    toast.success('Campaign deleted successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bulk Campaigns</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage high-volume email campaigns with advanced automation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Campaign</TabsTrigger>
          <TabsTrigger value="manage">Manage Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Create New Bulk Campaign
              </CardTitle>
              <CardDescription>
                Set up a high-volume email campaign with advanced targeting and automation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="campaign-name">Campaign Name *</Label>
                    <Input
                      id="campaign-name"
                      placeholder="Enter campaign name"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email-template">Email Template *</Label>
                    <Select value={emailTemplate} onValueChange={setEmailTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="welcome">Welcome Series</SelectItem>
                        <SelectItem value="product-launch">Product Launch</SelectItem>
                        <SelectItem value="newsletter">Newsletter</SelectItem>
                        <SelectItem value="promotional">Promotional</SelectItem>
                        <SelectItem value="custom">Custom Template</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="schedule-type">Schedule Type *</Label>
                    <Select value={scheduleType} onValueChange={setScheduleType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select schedule" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Send Immediately</SelectItem>
                        <SelectItem value="scheduled">Schedule for Later</SelectItem>
                        <SelectItem value="drip">Drip Campaign</SelectItem>
                        <SelectItem value="recurring">Recurring</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="contact-upload">Contact List Upload</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Upload CSV file with contact details
                      </p>
                      <Input
                        id="contact-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('contact-upload')?.click()}
                      >
                        Choose File
                      </Button>
                      {uploadedFile && (
                        <p className="text-sm text-green-600 mt-2">
                          {uploadedFile.name} uploaded
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Bulk Campaign Features</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Advanced contact segmentation</li>
                      <li>• Automated A/B testing</li>
                      <li>• Smart send time optimization</li>
                      <li>• Real-time delivery tracking</li>
                      <li>• Automated follow-up sequences</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="custom-message">Custom Message (Optional)</Label>
                <Textarea
                  id="custom-message"
                  placeholder="Add any specific instructions or notes for this campaign..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">Save as Draft</Button>
                <Button 
                  onClick={handleCreateCampaign}
                  disabled={isCreating}
                  className="bg-gradient-primary"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Create Campaign
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          {bulkCampaigns.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Bulk Campaigns Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first bulk campaign to get started with high-volume email marketing.
                </p>
                <Button 
                  onClick={() => setActiveTab('create')}
                  className="bg-gradient-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {bulkCampaigns.map((campaign) => (
                <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(campaign.status)}`} />
                        <h3 className="font-semibold text-lg">{campaign.name}</h3>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          {getStatusIcon(campaign.status)}
                          {campaign.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteCampaign(campaign.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{campaign.emails.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Total Emails</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{campaign.sent.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Sent</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{campaign.opened.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Opened</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{campaign.replied.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Replied</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Delivery Progress</span>
                        <span>{campaign.emails > 0 ? Math.round((campaign.sent / campaign.emails) * 100) : 0}%</span>
                      </div>
                      <Progress value={campaign.emails > 0 ? (campaign.sent / campaign.emails) * 100 : 0} className="h-2" />
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Created: {new Date(campaign.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                        {campaign.status === 'paused' && (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            Resume
                          </Button>
                        )}
                        {campaign.status === 'active' && (
                          <Button variant="outline" size="sm">
                            Pause
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BulkCampaigns;