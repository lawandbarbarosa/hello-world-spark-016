import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Trash2, ExternalLink, Plus, Clock, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SchedulingLink {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  available_days: string[];
  available_time_start: string;
  available_time_end: string;
  link_code: string;
  is_active: boolean;
  created_at: string;
}

interface SchedulingLinkManagerProps {
  onClose: () => void;
}

const SchedulingLinkManager: React.FC<SchedulingLinkManagerProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [links, setLinks] = useState<SchedulingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);

  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  useEffect(() => {
    if (user) {
      fetchLinks();
    }
  }, [user]);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduling_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error fetching scheduling links:', error);
      toast.error('Failed to load scheduling links');
    } finally {
      setLoading(false);
    }
  };

  const generateLinkCode = () => {
    return Math.random().toString(36).substring(2, 10);
  };

  const handleCreateLink = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (selectedDays.length === 0) {
      toast.error('Please select at least one available day');
      return;
    }

    try {
      const { error } = await supabase
        .from('scheduling_links')
        .insert({
          user_id: user?.id,
          title,
          description,
          duration_minutes: duration,
          available_days: selectedDays,
          available_time_start: startTime,
          available_time_end: endTime,
          link_code: generateLinkCode(),
          is_active: true
        });

      if (error) throw error;

      toast.success('Scheduling link created successfully');
      setShowCreateForm(false);
      resetForm();
      fetchLinks();
    } catch (error) {
      console.error('Error creating scheduling link:', error);
      toast.error('Failed to create scheduling link');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDuration(30);
    setStartTime('09:00');
    setEndTime('17:00');
    setSelectedDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('scheduling_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast.success('Scheduling link deleted');
      fetchLinks();
    } catch (error) {
      console.error('Error deleting scheduling link:', error);
      toast.error('Failed to delete scheduling link');
    }
  };

  const handleCopyLink = (linkCode: string) => {
    const fullUrl = `${window.location.origin}/schedule/${linkCode}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success('Link copied to clipboard');
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {!showCreateForm ? (
        <>
          <Button onClick={() => setShowCreateForm(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Create New Scheduling Link
          </Button>

          <div className="space-y-4">
            {links.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No scheduling links yet. Create one to get started!
              </p>
            ) : (
              links.map(link => (
                <Card key={link.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{link.title}</CardTitle>
                    {link.description && (
                      <p className="text-sm text-muted-foreground">{link.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{link.duration_minutes} minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{link.available_time_start} - {link.available_time_end}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="capitalize">{link.available_days.join(', ')}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 p-2 bg-muted rounded">
                      <code className="flex-1 text-sm">
                        {window.location.origin}/schedule/{link.link_code}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyLink(link.link_code)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteLink(link.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., 30-Minute Demo Call"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the meeting"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min={15}
              step={15}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Available Days</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {weekDays.map(day => (
                <Button
                  key={day}
                  type="button"
                  variant={selectedDays.includes(day) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleDay(day)}
                  className="capitalize"
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreateLink} className="flex-1">
              Create Link
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateForm(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulingLinkManager;
