import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Link as LinkIcon, Calendar as CalendarIcon, Mail, Clock, CheckCircle, XCircle, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SchedulingLinkManager from './SchedulingLinkManager';

interface ScheduledEmail {
  id: string;
  campaign_id: string;
  contact_id: string;
  sequence_id: string;
  sender_account_id: string;
  scheduled_for: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  campaigns?: { name: string };
  contacts?: { email: string; first_name?: string; last_name?: string };
  email_sequences?: { subject: string; step_number: number };
}

interface SentEmail {
  id: string;
  campaign_id: string;
  contact_id: string;
  sequence_id: string;
  sent_at: string;
  status: 'sent' | 'failed';
  error_message?: string;
  campaigns?: { name: string };
  contacts?: { email: string; first_name?: string; last_name?: string };
  email_sequences?: { subject: string; step_number: number };
}

interface ScheduledMeeting {
  id: string;
  link_id: string;
  prospect_email: string;
  prospect_name?: string;
  scheduled_date: string;
  status: string;
  created_at: string;
  scheduling_links?: {
    title: string;
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'scheduled' | 'sent' | 'failed' | 'meeting';
  status: string;
  campaignName?: string;
  contactEmail: string;
  subject?: string;
  stepNumber?: number;
  originalData: any;
}

const Calendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showSchedulingLinks, setShowSchedulingLinks] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCalendarData();
    }
  }, [user, currentDate]);

  const fetchCalendarData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

      // Fetch scheduled emails
      const { data: scheduledEmails, error: scheduledError } = await supabase
        .from('scheduled_emails')
        .select('*')
        .gte('scheduled_for', startOfMonth.toISOString())
        .lte('scheduled_for', endOfMonth.toISOString())
        .order('scheduled_for', { ascending: true });

      // Fetch sent emails
      const { data: sentEmails, error: sentError } = await supabase
        .from('email_sends')
        .select('*')
        .not('sent_at', 'is', null)
        .gte('sent_at', startOfMonth.toISOString())
        .lte('sent_at', endOfMonth.toISOString())
        .order('sent_at', { ascending: true });

      // Fetch scheduled meetings
      const { data: meetings, error: meetingsError } = await supabase
        .from('scheduled_meetings')
        .select(`
          *,
          scheduling_links(title)
        `)
        .gte('scheduled_date', startOfMonth.toISOString())
        .lte('scheduled_date', endOfMonth.toISOString())
        .order('scheduled_date', { ascending: true });

      // Fetch related data
      let campaignsMap = new Map();
      let contactsMap = new Map();
      let sequencesMap = new Map();

      const allIds = {
        campaignIds: new Set([
          ...(scheduledEmails?.map(e => e.campaign_id) || []),
          ...(sentEmails?.map(e => e.campaign_id) || [])
        ]),
        contactIds: new Set([
          ...(scheduledEmails?.map(e => e.contact_id) || []),
          ...(sentEmails?.map(e => e.contact_id) || [])
        ]),
        sequenceIds: new Set([
          ...(scheduledEmails?.map(e => e.sequence_id) || []),
          ...(sentEmails?.map(e => e.sequence_id) || [])
        ])
      };

      if (allIds.campaignIds.size > 0) {
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('id, name')
          .in('id', Array.from(allIds.campaignIds));
        campaigns?.forEach(c => campaignsMap.set(c.id, c));
      }

      if (allIds.contactIds.size > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, email, first_name, last_name')
          .in('id', Array.from(allIds.contactIds));
        contacts?.forEach(c => contactsMap.set(c.id, c));
      }

      if (allIds.sequenceIds.size > 0) {
        const { data: sequences } = await supabase
          .from('email_sequences')
          .select('id, subject, step_number')
          .in('id', Array.from(allIds.sequenceIds));
        sequences?.forEach(s => sequencesMap.set(s.id, s));
      }

      const allEvents: CalendarEvent[] = [];

      // Process scheduled emails
      scheduledEmails?.forEach(email => {
        const contact = contactsMap.get(email.contact_id);
        const campaign = campaignsMap.get(email.campaign_id);
        const sequence = sequencesMap.get(email.sequence_id);
        
        allEvents.push({
          id: `scheduled-${email.id}`,
          title: sequence?.subject || 'Scheduled Email',
          date: new Date(email.scheduled_for),
          type: 'scheduled',
          status: email.status,
          campaignName: campaign?.name,
          contactEmail: contact?.email || 'Unknown',
          subject: sequence?.subject,
          stepNumber: sequence?.step_number,
          originalData: email
        });
      });

      // Process sent emails
      sentEmails?.forEach(email => {
        const contact = contactsMap.get(email.contact_id);
        const campaign = campaignsMap.get(email.campaign_id);
        const sequence = sequencesMap.get(email.sequence_id);
        
        allEvents.push({
          id: `sent-${email.id}`,
          title: sequence?.subject || 'Sent Email',
          date: new Date(email.sent_at),
          type: email.status === 'failed' ? 'failed' : 'sent',
          status: email.status,
          campaignName: campaign?.name,
          contactEmail: contact?.email || 'Unknown',
          subject: sequence?.subject,
          stepNumber: sequence?.step_number,
          originalData: email
        });
      });

      // Process scheduled meetings
      meetings?.forEach(meeting => {
        allEvents.push({
          id: `meeting-${meeting.id}`,
          title: meeting.scheduling_links?.title || 'Meeting',
          date: new Date(meeting.scheduled_date),
          type: 'meeting',
          status: meeting.status,
          contactEmail: meeting.prospect_email,
          originalData: meeting
        });
      });

      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const handleDayClick = (date: Date) => {
    const eventsOnDay = getEventsForDay(date);
    if (eventsOnDay.length > 0) {
      setSelectedDate(date);
      setDayEvents(eventsOnDay);
      setShowDayModal(true);
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'scheduled':
        return 'bg-blue-500';
      case 'sent':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'meeting':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
            >
              Today
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-semibold min-w-[200px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          <Button
            onClick={() => setShowSchedulingLinks(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Scheduling Link
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          {/* Day names header */}
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7 flex-1 border-l border-t">
            {getDaysInMonth(currentDate).map((day, index) => {
              const isToday = day && day.toDateString() === new Date().toDateString();
              const isCurrentMonth = day && day.getMonth() === currentDate.getMonth();
              const dayEvents = day ? getEventsForDay(day) : [];
              
              return (
                <div
                  key={index}
                  onClick={() => day && handleDayClick(day)}
                  className={`min-h-[120px] border-r border-b p-2 cursor-pointer transition-colors ${
                    isCurrentMonth 
                      ? 'bg-card hover:bg-accent/50' 
                      : 'bg-muted/20'
                  }`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${
                        isToday 
                          ? 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center' 
                          : ''
                      }`}>
                        {day.getDate()}
                      </div>
                      
                      <div className="space-y-1">
                        {dayEvents.length === 1 ? (
                          <div className={`text-xs p-1 rounded ${getEventColor(dayEvents[0].type)} text-white truncate`}>
                            {formatTime(dayEvents[0].date)} {dayEvents[0].title}
                          </div>
                        ) : dayEvents.length > 1 ? (
                          <div className="text-xs text-muted-foreground font-medium">
                            {dayEvents.length} events
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="border-t bg-card p-4">
        <div className="max-w-7xl mx-auto flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span>Scheduled ({events.filter(e => e.type === 'scheduled').length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span>Sent ({events.filter(e => e.type === 'sent').length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span>Failed ({events.filter(e => e.type === 'failed').length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-500"></div>
            <span>Meetings ({events.filter(e => e.type === 'meeting').length})</span>
          </div>
        </div>
      </div>

      {/* Day Events Modal */}
      <Dialog open={showDayModal} onOpenChange={setShowDayModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {dayEvents.map(event => (
              <Card 
                key={event.id} 
                className="cursor-pointer hover:bg-accent"
                onClick={() => {
                  setSelectedEvent(event);
                  setShowEventDetails(true);
                  setShowDayModal(false);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-1 h-full ${getEventColor(event.type)} rounded`}></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{formatTime(event.date)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${getEventColor(event.type)} text-white`}>
                          {event.type}
                        </span>
                      </div>
                      <p className="font-semibold">{event.title}</p>
                      <p className="text-sm text-muted-foreground">{event.contactEmail}</p>
                      {event.campaignName && (
                        <p className="text-xs text-muted-foreground mt-1">Campaign: {event.campaignName}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Details Modal */}
      <Dialog open={showEventDetails} onOpenChange={setShowEventDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <p className="capitalize">{selectedEvent.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Title</label>
                <p>{selectedEvent.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                <p>{selectedEvent.date.toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contact</label>
                <p>{selectedEvent.contactEmail}</p>
              </div>
              {selectedEvent.campaignName && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Campaign</label>
                  <p>{selectedEvent.campaignName}</p>
                </div>
              )}
              {selectedEvent.status && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="capitalize">{selectedEvent.status}</p>
                </div>
              )}
              {selectedEvent.originalData?.error_message && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Error</label>
                  <p className="text-destructive">{selectedEvent.originalData.error_message}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scheduling Links Manager */}
      <Dialog open={showSchedulingLinks} onOpenChange={setShowSchedulingLinks}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scheduling Links</DialogTitle>
          </DialogHeader>
          <SchedulingLinkManager onClose={() => {
            setShowSchedulingLinks(false);
            fetchCalendarData();
          }} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;
