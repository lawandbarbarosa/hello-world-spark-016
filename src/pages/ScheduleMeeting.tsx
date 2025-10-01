import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, Calendar as CalendarIcon, User, Mail, Check } from 'lucide-react';
import { createKurdistanDate, formatKurdistanDate } from '@/config/timezone';

interface SchedulingLink {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  available_days: string[];
  available_time_start: string;
  available_time_end: string;
}

const ScheduleMeeting = () => {
  const { linkCode } = useParams<{ linkCode: string }>();
  const navigate = useNavigate();
  const [schedulingLink, setSchedulingLink] = useState<SchedulingLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [prospectName, setProspectName] = useState('');
  const [prospectEmail, setProspectEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  useEffect(() => {
    if (linkCode) {
      fetchSchedulingLink();
    }
  }, [linkCode]);

  useEffect(() => {
    if (selectedDate && schedulingLink) {
      generateAvailableTimes();
    }
  }, [selectedDate, schedulingLink]);

  const fetchSchedulingLink = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduling_links')
        .select('*')
        .eq('link_code', linkCode)
        .eq('is_active', true)
        .single();

      if (error) {
        toast.error('Scheduling link not found');
        navigate('/');
        return;
      }

      setSchedulingLink(data);
    } catch (error) {
      console.error('Error fetching scheduling link:', error);
      toast.error('Failed to load scheduling link');
    } finally {
      setLoading(false);
    }
  };

  const generateAvailableTimes = () => {
    if (!schedulingLink || !selectedDate) return;

    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (!schedulingLink.available_days.includes(dayName)) {
      setAvailableTimes([]);
      return;
    }

    const times: string[] = [];
    const [startHour, startMinute] = schedulingLink.available_time_start.split(':').map(Number);
    const [endHour, endMinute] = schedulingLink.available_time_end.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMinute = startMinute;
    
    while (
      currentHour < endHour || 
      (currentHour === endHour && currentMinute < endMinute)
    ) {
      const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      times.push(timeString);
      
      currentMinute += schedulingLink.duration_minutes;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }

    setAvailableTimes(times);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !selectedTime || !prospectEmail || !schedulingLink) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const scheduledDateTime = createKurdistanDate(
        formatKurdistanDate(selectedDate),
        selectedTime
      );

      const { error } = await supabase
        .from('scheduled_meetings')
        .insert({
          link_id: schedulingLink.id,
          user_id: schedulingLink.user_id,
          prospect_email: prospectEmail,
          prospect_name: prospectName || null,
          scheduled_date: scheduledDateTime.toISOString(),
          status: 'scheduled'
        });

      if (error) throw error;

      setSuccess(true);
      toast.success('Meeting scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      toast.error('Failed to schedule meeting');
    } finally {
      setSubmitting(false);
    }
  };

  const isDayAvailable = (date: Date) => {
    if (!schedulingLink) return false;
    
    // Don't allow past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return false;

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    return schedulingLink.available_days.includes(dayName);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!schedulingLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Scheduling link not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Meeting Scheduled!</h2>
            <p className="text-muted-foreground mb-4">
              Your meeting has been successfully scheduled. You will receive a confirmation email shortly.
            </p>
            <div className="bg-muted p-4 rounded-lg text-left space-y-2">
              <p><strong>Date:</strong> {selectedDate?.toLocaleDateString()}</p>
              <p><strong>Time:</strong> {selectedTime}</p>
              <p><strong>Duration:</strong> {schedulingLink.duration_minutes} minutes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{schedulingLink.title}</CardTitle>
            {schedulingLink.description && (
              <CardDescription className="text-base">
                {schedulingLink.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{schedulingLink.duration_minutes} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                <span className="capitalize">{schedulingLink.available_days.join(', ')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Date & Time</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => !isDayAvailable(date)}
                  className="rounded-md border"
                />

                {selectedDate && availableTimes.length > 0 && (
                  <div>
                    <Label>Available Times</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {availableTimes.map((time) => (
                        <Button
                          key={time}
                          type="button"
                          variant={selectedTime === time ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedTime(time)}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDate && availableTimes.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No available times for this date
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Name (Optional)</Label>
                  <Input
                    id="name"
                    value={prospectName}
                    onChange={(e) => setProspectName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={prospectEmail}
                    onChange={(e) => setProspectEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!selectedDate || !selectedTime || !prospectEmail || submitting}
                >
                  {submitting ? 'Scheduling...' : 'Schedule Meeting'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleMeeting;
