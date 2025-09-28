import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Mail, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
          originalData: email
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
          originalData: email
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
      return 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-900 border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-all duration-200';
    } else if (type === 'sent') {
      return 'bg-gradient-to-r from-green-50 to-green-100 text-green-900 border-l-4 border-green-500 shadow-sm hover:shadow-md transition-all duration-200';
    } else if (type === 'failed') {
      return 'bg-gradient-to-r from-red-50 to-red-100 text-red-900 border-l-4 border-red-500 shadow-sm hover:shadow-md transition-all duration-200';
    }
    return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-900 border-l-4 border-gray-400 shadow-sm hover:shadow-md transition-all duration-200';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Email Calendar
              </h1>
              <p className="text-gray-600 text-lg">Track your email campaigns and scheduled sends</p>
            </div>
            
            <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('prev')}
                className="hover:bg-white hover:shadow-sm transition-all duration-200"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="text-center min-w-[200px]">
                <h2 className="text-2xl font-bold text-gray-900">
                  {monthNames[currentDate.getMonth()]}
                </h2>
                <p className="text-gray-600 font-medium">
                  {currentDate.getFullYear()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('next')}
                className="hover:bg-white hover:shadow-sm transition-all duration-200"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Status Legend</h3>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-sm shadow-sm"></div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-700">Scheduled</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 rounded-sm shadow-sm"></div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium text-gray-700">Sent</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-sm shadow-sm"></div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="font-medium text-gray-700">Failed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Calendar Header */}
          <div className="grid grid-cols-7 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            {dayNames.map(day => (
              <div key={day} className="p-4 text-center font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Body */}
          <div className="grid grid-cols-7">
            {getDaysInMonth(currentDate).map((day, index) => {
              const isToday = day && day.toDateString() === new Date().toDateString();
              const isCurrentMonth = day && day.getMonth() === currentDate.getMonth();
              
              return (
                <div
                  key={index}
                  className={`min-h-[140px] border-r border-b border-gray-200 last:border-r-0 p-3 relative transition-colors duration-200 ${
                    isCurrentMonth 
                      ? 'bg-white hover:bg-gray-50' 
                      : 'bg-gray-50 text-gray-400'
                  }`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-semibold mb-2 ${
                        isToday 
                          ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs' 
                          : isCurrentMonth 
                            ? 'text-gray-900' 
                            : 'text-gray-400'
                      }`}>
                        {day.getDate()}
                      </div>
                      
                      <div className="space-y-1.5">
                        {getEventsForDay(day).slice(0, 3).map(event => (
                          <div
                            key={event.id}
                            className={`text-xs p-2 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md ${getEventColor(event.type, event.status)}`}
                            onClick={() => setSelectedEvent(event)}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              {getEventIcon(event.type, event.status)}
                              <span className="font-medium text-xs">{formatTime(event.date)}</span>
                            </div>
                            <div className="truncate font-semibold text-xs leading-tight">
                              {event.title}
                            </div>
                          </div>
                        ))}
                        
                        {getEventsForDay(day).length > 3 && (
                          <div className="text-xs text-gray-500 font-medium bg-gray-100 rounded px-2 py-1 text-center">
                            +{getEventsForDay(day).length - 3} more
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
      </div>
    </div>

        {/* Event Details Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
              {/* Modal Header */}
              <div className={`p-6 text-white ${
                selectedEvent.type === 'scheduled' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                  : selectedEvent.type === 'sent'
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : 'bg-gradient-to-r from-red-500 to-red-600'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getEventIcon(selectedEvent.type, selectedEvent.status)}
                    <h2 className="text-xl font-bold">Email Details</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEvent(null)}
                    className="text-white hover:bg-white/20"
                  >
                    ✕
                  </Button>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Subject</label>
                    <p className="text-gray-900 font-medium mt-1">{selectedEvent.subject}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Campaign</label>
                    <p className="text-gray-900 font-medium mt-1">{selectedEvent.campaignName}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Contact</label>
                    <p className="text-gray-900 font-medium mt-1">{selectedEvent.contactEmail}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Date & Time</label>
                    <p className="text-gray-900 font-medium mt-1">
                      {selectedEvent.date.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })} at {formatTime(selectedEvent.date)}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Status</label>
                    <div className="mt-2">
                      <Badge className={`px-3 py-1 text-sm font-semibold ${
                        selectedEvent.type === 'scheduled' 
                          ? 'bg-blue-100 text-blue-800 border-blue-200' 
                          : selectedEvent.type === 'sent'
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {selectedEvent.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {selectedEvent.stepNumber && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Step</label>
                      <p className="text-gray-900 font-medium mt-1">Step {selectedEvent.stepNumber}</p>
                    </div>
                  )}
                  
                  {selectedEvent.originalData.error_message && (
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <label className="text-sm font-semibold text-red-600 uppercase tracking-wide">Error Message</label>
                      <p className="text-red-800 font-medium mt-1">{selectedEvent.originalData.error_message}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedEvent(null)}
                    className="px-6 py-2 hover:bg-gray-50 transition-colors duration-200"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
  );
};

export default Calendar;
