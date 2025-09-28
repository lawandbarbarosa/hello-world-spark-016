import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Mail, Clock, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ScheduledEmail {
  id: string;
  campaign_id: string;
  contact_id: string;
  sequence_id: string;
  sender_account_id: string;
  scheduled_for: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  campaigns?: {
    name: string;
    description?: string;
  };
  contacts?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
  email_sequences?: {
    subject: string;
    body: string;
    step_number: number;
  };
  sender_accounts?: {
    email: string;
  };
}

interface SentEmail {
  id: string;
  campaign_id: string;
  contact_id: string;
  sequence_id: string;
  sender_account_id: string;
  sent_at: string;
  opened_at?: string;
  clicked_at?: string;
  status: 'sent' | 'failed' | 'bounced';
  error_message?: string;
  created_at: string;
  campaigns?: {
    name: string;
    description?: string;
  };
  contacts?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
  email_sequences?: {
    subject: string;
    body: string;
    step_number: number;
  };
  sender_accounts?: {
    email: string;
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'scheduled' | 'sent' | 'failed';
  status: string;
  campaignName: string;
  contactEmail: string;
  subject: string;
  stepNumber?: number;
  originalData: ScheduledEmail | SentEmail;
}

const Calendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (user) {
      fetchCalendarData();
    }
  }, [user, currentDate]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      
      // Get the start and end of the current month
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      console.log('Fetching calendar data for:', {
        startOfMonth: startOfMonth.toISOString(),
        endOfMonth: endOfMonth.toISOString(),
        userId: user?.id
      });

      // First, let's check if there's any data at all - try without any filters
      console.log('Testing basic table access...');
      
      const { data: allScheduled, error: allScheduledError } = await supabase
        .from('scheduled_emails')
        .select('*')
        .limit(5);
      
      const { data: allSent, error: allSentError } = await supabase
        .from('email_sends')
        .select('*')
        .limit(5);

      console.log('Sample scheduled emails (any user):', { allScheduled, allScheduledError });
      console.log('Sample sent emails (any user):', { allSent, allSentError });

      // Also check campaigns table
      const { data: allCampaigns, error: allCampaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .limit(5);

      console.log('Sample campaigns (any user):', { allCampaigns, allCampaignsError });
      
      // Try a simpler approach - fetch basic data first
      console.log('Fetching scheduled emails with simple query...');
      const { data: scheduledEmails, error: scheduledError } = await supabase
        .from('scheduled_emails')
        .select('*')
        .gte('scheduled_for', startOfMonth.toISOString())
        .lte('scheduled_for', endOfMonth.toISOString())
        .order('scheduled_for', { ascending: true });

      console.log('Scheduled emails result:', { scheduledEmails, scheduledError });

      if (scheduledError) {
        console.error('Error fetching scheduled emails:', scheduledError);
        toast.error('Failed to fetch scheduled emails');
        return;
      }

      // Try a simpler approach for sent emails too
      console.log('Fetching sent emails with simple query...');
      const { data: sentEmails, error: sentError } = await supabase
        .from('email_sends')
        .select('*')
        .not('sent_at', 'is', null)
        .gte('sent_at', startOfMonth.toISOString())
        .lte('sent_at', endOfMonth.toISOString())
        .order('sent_at', { ascending: true });

      console.log('Sent emails result:', { sentEmails, sentError });

      if (sentError) {
        console.error('Error fetching sent emails:', sentError);
        toast.error('Failed to fetch sent emails');
        return;
      }

      // Transform data into calendar events
      const calendarEvents: CalendarEvent[] = [];

      // Process scheduled emails - we'll fetch related data separately if needed
      for (const email of scheduledEmails || []) {
        // For now, create basic events without related data
        calendarEvents.push({
          id: `scheduled-${email.id}`,
          title: 'Scheduled Email',
          date: new Date(email.scheduled_for),
          type: 'scheduled',
          status: email.status,
          campaignName: `Campaign ${email.campaign_id.slice(0, 8)}`,
          contactEmail: `Contact ${email.contact_id.slice(0, 8)}`,
          subject: 'Scheduled Email',
          stepNumber: 1,
          originalData: email as ScheduledEmail
        });
      }

      // Process sent emails - we'll fetch related data separately if needed
      for (const email of sentEmails || []) {
        calendarEvents.push({
          id: `sent-${email.id}`,
          title: 'Sent Email',
          date: new Date(email.sent_at),
          type: email.status === 'failed' ? 'failed' : 'sent',
          status: email.status,
          campaignName: `Campaign ${email.campaign_id.slice(0, 8)}`,
          contactEmail: `Contact ${email.contact_id.slice(0, 8)}`,
          subject: 'Sent Email',
          stepNumber: 1,
          originalData: email as SentEmail
        });
      }

      console.log('Total calendar events created:', calendarEvents.length);
      console.log('Calendar events:', calendarEvents);

      // If no events found for current month, try to get some recent data for context
      if (calendarEvents.length === 0) {
        console.log('No events found for current month, fetching recent data...');
        
        // Get recent scheduled emails (last 3 months)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const { data: recentScheduled } = await supabase
          .from('scheduled_emails')
          .select('*')
          .gte('scheduled_for', threeMonthsAgo.toISOString())
          .order('scheduled_for', { ascending: true })
          .limit(10);

        const { data: recentSent } = await supabase
          .from('email_sends')
          .select('*')
          .not('sent_at', 'is', null)
          .gte('sent_at', threeMonthsAgo.toISOString())
          .order('sent_at', { ascending: true })
          .limit(10);

        console.log('Recent scheduled emails:', recentScheduled);
        console.log('Recent sent emails:', recentSent);
      }

      setEvents(calendarEvents);
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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
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

  const getEventIcon = (type: string, status: string) => {
    if (type === 'scheduled') {
      return <Clock className="w-3 h-3" />;
    } else if (type === 'sent') {
      return <CheckCircle className="w-3 h-3" />;
    } else if (type === 'failed') {
      return <XCircle className="w-3 h-3" />;
    }
    return <Mail className="w-3 h-3" />;
  };

  const getEventColor = (type: string, status: string) => {
    if (type === 'scheduled') {
      return 'bg-blue-100 text-blue-800 border-l-2 border-blue-500';
    } else if (type === 'sent') {
      return 'bg-blue-100 text-blue-800 border-l-2 border-blue-700 border-2 border-blue-700';
    } else if (type === 'failed') {
      return 'bg-red-100 text-red-800 border-l-2 border-red-500';
    }
    return 'bg-gray-100 text-gray-800 border-l-2 border-gray-400';
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
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Clean Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-normal text-gray-900">
                Email Calendar
              </h1>
              <p className="text-gray-600">Track your email campaigns and scheduled sends</p>
            </div>
            
            <div className="flex items-center gap-3 bg-white border border-gray-300 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('prev')}
                className="hover:bg-gray-100 transition-colors duration-200 text-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center min-w-[180px]">
                <h2 className="text-xl font-medium text-gray-900">
                  {monthNames[currentDate.getMonth()]}
                </h2>
                <p className="text-gray-600 text-sm">
                  {currentDate.getFullYear()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('next')}
                className="hover:bg-gray-100 transition-colors duration-200 text-gray-700"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Simple Legend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
              <span className="text-sm text-gray-700">Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-sm border-2 border-blue-700"></div>
              <span className="text-sm text-gray-700">Sent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
              <span className="text-sm text-gray-700">Failed</span>
            </div>
          </div>
        </div>

        {/* Clean Calendar Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Calendar Header */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {dayNames.map(day => (
              <div key={day} className="p-4 text-center font-medium text-gray-700 border-r border-gray-200 last:border-r-0 text-sm">
                {day}
              </div>
            ))}
          </div>
          
          {/* Clean Calendar Body */}
          <div className="grid grid-cols-7">
            {getDaysInMonth(currentDate).map((day, index) => {
              const isToday = day && day.toDateString() === new Date().toDateString();
              const isCurrentMonth = day && day.getMonth() === currentDate.getMonth();
              const hasEvents = day && getEventsForDay(day).length > 0;
              
              return (
                <div
                  key={index}
                  className={`min-h-[120px] border-r border-b border-gray-200 last:border-r-0 p-3 relative ${
                    isCurrentMonth 
                      ? 'bg-white hover:bg-gray-50' 
                      : 'bg-gray-50 text-gray-400'
                  }`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium mb-2 ${
                        isToday 
                          ? 'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs' 
                          : isCurrentMonth 
                            ? 'text-gray-900' 
                            : 'text-gray-400'
                      }`}>
                        {day.getDate()}
                      </div>
                      
                      <div className="space-y-1">
                        {getEventsForDay(day).slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            className={`text-xs p-2 rounded cursor-pointer hover:bg-gray-100 transition-colors duration-200 ${getEventColor(event.type, event.status)}`}
                            onClick={() => setSelectedEvent(event)}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              {getEventIcon(event.type, event.status)}
                              <span className="text-xs">{formatTime(event.date)}</span>
                            </div>
                            <div className="truncate text-xs font-medium">
                              {event.title}
                            </div>
                          </div>
                        ))}
                        
                        {getEventsForDay(day).length > 2 && (
                          <div className="text-xs text-gray-600 bg-gray-100 rounded px-2 py-1 text-center">
                            +{getEventsForDay(day).length - 2} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Clean Event Details Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 overflow-hidden">
              {/* Simple Modal Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${
                      selectedEvent.type === 'scheduled' 
                        ? 'bg-blue-100 text-blue-600' 
                        : selectedEvent.type === 'sent'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-red-100 text-red-600'
                    }`}>
                      {getEventIcon(selectedEvent.type, selectedEvent.status)}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{selectedEvent.title}</h3>
                      <p className="text-sm text-gray-600">
                        {selectedEvent.date.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })} at {formatTime(selectedEvent.date)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEvent(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              
              {/* Simple Modal Content */}
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedEvent.subject}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Campaign</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedEvent.campaignName}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedEvent.contactEmail}</p>
                  </div>
                  
                  
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                    <div className="mt-1">
                      <Badge className={`text-xs ${
                        selectedEvent.type === 'scheduled' 
                          ? 'bg-blue-100 text-blue-800' 
                          : selectedEvent.type === 'sent'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedEvent.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {selectedEvent.stepNumber && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Step</label>
                      <p className="text-sm text-gray-900 mt-1">Step {selectedEvent.stepNumber}</p>
                    </div>
                  )}
                  
                  {selectedEvent.originalData.error_message && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Error Message</label>
                      <p className="text-sm text-red-600 mt-1">{selectedEvent.originalData.error_message}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedEvent(null)}
                    className="text-gray-600 hover:bg-gray-50"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;
