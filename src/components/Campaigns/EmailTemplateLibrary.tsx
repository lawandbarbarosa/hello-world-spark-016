import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Eye, 
  Copy, 
  Trash2, 
  Tag, 
  Calendar,
  Mail,
  Filter,
  X
} from 'lucide-react';
import { format } from 'date-fns';

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  campaign_name: string;
  template_data: {
    sequence: Array<{
      id: string;
      subject: string;
      body: string;
      scheduledDate?: string;
      scheduledTime?: string;
    }>;
  };
  created_at: string;
  updated_at: string;
  tags: string[];
}

interface EmailTemplateLibraryProps {
  onSelectTemplate: (template: EmailTemplate) => void;
  onSaveTemplate: (templateData: any) => void;
  currentSequence?: any[];
  currentCampaignName?: string;
}

const EmailTemplateLibrary: React.FC<EmailTemplateLibraryProps> = ({
  onSelectTemplate,
  onSaveTemplate,
  currentSequence = [],
  currentCampaignName = ''
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  
  // Save template form state
  const [saveForm, setSaveForm] = useState({
    name: '',
    description: '',
    tags: [] as string[],
    newTag: ''
  });

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_email_templates' as any) as { data: any, error: any };
      
      if (error) {
        console.error('Error fetching templates:', error);
        toast({
          title: "Error",
          description: "Failed to load email templates",
          variant: "destructive",
        });
        return;
      }

      setTemplates((data || []) as EmailTemplate[]);
      
      // Extract unique tags
      const allTags = new Set<string>();
      if (Array.isArray(data)) {
        data.forEach((template: any) => {
          template.tags?.forEach((tag: string) => allTags.add(tag));
        });
      }
      setAvailableTags(Array.from(allTags));
      
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to load email templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!saveForm.name.trim()) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    if (currentSequence.length === 0) {
      toast({
        title: "Error",
        description: "No email sequence to save",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('save_email_template' as any, {
        template_name_param: saveForm.name,
        template_description_param: saveForm.description,
        campaign_name_param: currentCampaignName,
        template_data_param: { sequence: currentSequence },
        tags_param: saveForm.tags
      });

      if (error) {
        console.error('Error saving template:', error);
        toast({
          title: "Error",
          description: "Failed to save email template",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Email template saved successfully",
      });

      setIsSaveDialogOpen(false);
      setSaveForm({ name: '', description: '', tags: [], newTag: '' });
      fetchTemplates();
      onSaveTemplate({ id: data, ...saveForm });
      
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save email template",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('email_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        console.error('Error deleting template:', error);
        toast({
          title: "Error",
          description: "Failed to delete template",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Template deleted successfully",
      });

      fetchTemplates();
      
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handlePreviewTemplate = (template: EmailTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewDialogOpen(true);
  };

  const handleSelectTemplate = (template: EmailTemplate) => {
    onSelectTemplate(template);
    toast({
      title: "Template Loaded",
      description: `"${template.name}" has been loaded into your email sequence`,
    });
  };

  const addTag = () => {
    if (saveForm.newTag.trim() && !saveForm.tags.includes(saveForm.newTag.trim())) {
      setSaveForm(prev => ({
        ...prev,
        tags: [...prev.tags, saveForm.newTag.trim()],
        newTag: ''
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSaveForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchTerm || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.campaign_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => template.tags?.includes(tag));
    
    return matchesSearch && matchesTags;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading templates...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Email Template Library</h3>
        </div>
        
        <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={currentSequence.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Save Current as Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Save Email Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name *</Label>
                <Input
                  id="template-name"
                  value={saveForm.name}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Welcome Series, Product Launch"
                />
              </div>
              
              <div>
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  value={saveForm.description}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this template..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={saveForm.newTag}
                    onChange={(e) => setSaveForm(prev => ({ ...prev, newTag: e.target.value }))}
                    placeholder="Add tag..."
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {saveForm.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate}>
                Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select 
          value={selectedTags.length > 0 ? selectedTags[0] : ''} 
          onValueChange={(value) => setSelectedTags(value ? [value] : [])}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All templates</SelectItem>
            {availableTags.map(tag => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
              <p className="text-muted-foreground mb-4">
                {templates.length === 0 
                  ? "You haven't saved any email templates yet. Create your first template by saving a successful campaign sequence."
                  : "No templates match your search criteria. Try adjusting your search terms or filters."
                }
              </p>
              {templates.length === 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsSaveDialogOpen(true)}
                  disabled={currentSequence.length === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Save Current as Template
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.campaign_name && (
                      <p className="text-sm text-muted-foreground mt-1">
                        From: {template.campaign_name}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {template.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {template.description}
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <Mail className="w-3 h-3" />
                  <span>{template.template_data.sequence?.length || 0} emails</span>
                  <Calendar className="w-3 h-3 ml-2" />
                  <span>{format(new Date(template.updated_at), 'MMM dd, yyyy')}</span>
                </div>
                
                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreviewTemplate(template)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSelectTemplate(template)}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              {previewTemplate.description && (
                <p className="text-muted-foreground">{previewTemplate.description}</p>
              )}
              
              <div className="space-y-4">
                {previewTemplate.template_data.sequence?.map((step, index) => (
                  <Card key={step.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <span className="font-medium">Email Step {index + 1}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Subject:</Label>
                          <p className="text-sm bg-muted p-2 rounded">{step.subject || 'No subject'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Body:</Label>
                          <div 
                            className="text-sm bg-muted p-3 rounded max-h-32 overflow-y-auto"
                            dangerouslySetInnerHTML={{ 
                              __html: step.body || 'No content' 
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplateLibrary;
