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
      return 'bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 text-orange-900 border-l-4 border-orange-500 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ring-2 ring-orange-200 hover:ring-orange-300';
    } else if (type === 'sent') {
      return 'bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 text-green-900 border-l-4 border-green-500 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ring-2 ring-green-200 hover:ring-green-300';
    } else if (type === 'failed') {
      return 'bg-gradient-to-br from-red-100 via-rose-50 to-pink-100 text-red-900 border-l-4 border-red-500 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ring-2 ring-red-200 hover:ring-red-300';
    }
    return 'bg-gradient-to-br from-gray-100 via-slate-50 to-zinc-100 text-gray-900 border-l-4 border-gray-400 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ring-2 ring-gray-200 hover:ring-gray-300';
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-gray-800 to-purple-800 rounded-2xl shadow-2xl border border-purple-700 p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
                Email Calendar
              </h1>
              <p className="text-purple-100 text-lg">Track your email campaigns and scheduled sends</p>
            </div>
            
            <div className="flex items-center gap-4 bg-gradient-to-r from-gray-700 to-purple-700 rounded-xl p-2 border border-purple-600">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('prev')}
                className="hover:bg-purple-600 hover:shadow-lg transition-all duration-200 text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="text-center min-w-[200px]">
                <h2 className="text-2xl font-bold text-white">
                  {monthNames[currentDate.getMonth()]}
                </h2>
                <p className="text-purple-200 font-medium">
                  {currentDate.getFullYear()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('next')}
                className="hover:bg-purple-600 hover:shadow-lg transition-all duration-200 text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Legend */}
        <div className="bg-gradient-to-r from-gray-800 to-purple-800 rounded-2xl shadow-2xl border border-purple-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white">Email Status Legend</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Scheduled */}
            <div className="group p-6 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 hover:shadow-xl hover:scale-105 transition-all duration-300">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-orange-900">Scheduled</h4>
                  <p className="text-sm text-orange-700">Emails waiting to be sent</p>
                </div>
              </div>
              <div className="w-full h-3 bg-gradient-to-r from-orange-200 to-amber-200 rounded-full overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-orange-500 to-amber-600 rounded-full"></div>
              </div>
            </div>

            {/* Sent */}
            <div className="group p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 hover:shadow-xl hover:scale-105 transition-all duration-300">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-green-900">Sent</h4>
                  <p className="text-sm text-green-700">Successfully delivered</p>
                </div>
              </div>
              <div className="w-full h-3 bg-gradient-to-r from-green-200 to-emerald-200 rounded-full overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"></div>
              </div>
            </div>

            {/* Failed */}
            <div className="group p-6 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-300 hover:shadow-xl hover:scale-105 transition-all duration-300">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-red-900">Failed</h4>
                  <p className="text-sm text-red-700">Delivery unsuccessful</p>
                </div>
              </div>
              <div className="w-full h-3 bg-gradient-to-r from-red-200 to-rose-200 rounded-full overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-red-500 to-rose-600 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Calendar Grid */}
        <div className="bg-gradient-to-r from-gray-800 to-purple-800 rounded-3xl shadow-2xl border-2 border-purple-600 overflow-hidden">
          {/* Calendar Header */}
          <div className="grid grid-cols-7 bg-gradient-to-r from-gray-700 via-purple-700 to-gray-700 border-b-2 border-purple-500">
            {dayNames.map(day => (
              <div key={day} className="p-6 text-center font-bold text-white border-r border-purple-500 last:border-r-0 text-xl tracking-wide">
                {day}
              </div>
            ))}
          </div>
          
          {/* Enhanced Calendar Body */}
          <div className="grid grid-cols-7">
            {getDaysInMonth(currentDate).map((day, index) => {
              const isToday = day && day.toDateString() === new Date().toDateString();
              const isCurrentMonth = day && day.getMonth() === currentDate.getMonth();
              const hasEvents = day && getEventsForDay(day).length > 0;
              
              return (
                <div
                  key={index}
                  className={`min-h-[180px] border-r border-b border-purple-500 last:border-r-0 p-5 relative transition-all duration-300 group ${
                    isCurrentMonth 
                      ? hasEvents
                        ? 'bg-gradient-to-br from-gray-700 to-purple-700 hover:from-purple-600 hover:to-purple-800 hover:shadow-inner' 
                        : 'bg-gradient-to-br from-gray-800 to-purple-800 hover:from-purple-600 hover:to-purple-800 hover:shadow-inner'
                      : 'bg-gradient-to-br from-gray-900 to-purple-900 text-gray-400'
                  }`}
                >
                  {day && (
                    <>
                      <div className={`text-xl font-bold mb-4 transition-all duration-300 ${
                        isToday 
                          ? 'bg-gradient-to-br from-purple-400 to-purple-600 text-white rounded-2xl w-10 h-10 flex items-center justify-center shadow-xl transform scale-110 ring-2 ring-purple-300' 
                          : isCurrentMonth 
                            ? 'text-white group-hover:text-purple-300 group-hover:scale-110' 
                            : 'text-gray-400'
                      }`}>
                        {day.getDate()}
                      </div>
                      
                      <div className="space-y-3">
                        {getEventsForDay(day).slice(0, 3).map(event => (
                          <div
                            key={event.id}
                            className={`text-sm p-4 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:-translate-y-2 hover:rotate-1 ${getEventColor(event.type, event.status)}`}
                            onClick={() => setSelectedEvent(event)}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              {getEventIcon(event.type, event.status)}
                              <span className="font-bold text-sm">{formatTime(event.date)}</span>
                            </div>
                            <div className="truncate font-bold text-sm leading-tight">
                              {event.title}
                            </div>
                          </div>
                        ))}
                        
                        {getEventsForDay(day).length > 3 && (
                          <div className="text-sm text-white font-bold bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl px-4 py-3 text-center hover:from-purple-500 hover:to-purple-600 hover:scale-105 transition-all duration-200 shadow-lg">
                            +{getEventsForDay(day).length - 3} more emails
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

        {/* Event Details Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
              {/* Enhanced Modal Header */}
              <div className={`p-8 text-white ${
                selectedEvent.type === 'scheduled' 
                  ? 'bg-gradient-to-br from-gray-800 via-purple-700 to-purple-800' 
                  : selectedEvent.type === 'sent'
                    ? 'bg-gradient-to-br from-gray-800 via-purple-700 to-purple-800'
                    : 'bg-gradient-to-br from-gray-800 via-purple-700 to-purple-800'
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
              
              {/* Enhanced Modal Content */}
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className={`rounded-xl p-6 border-2 ${
                    selectedEvent.type === 'scheduled' 
                      ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300' 
                      : selectedEvent.type === 'sent'
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
                        : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-300'
                  }`}>
                    <label className={`text-sm font-bold uppercase tracking-wider ${
                      selectedEvent.type === 'scheduled' 
                        ? 'text-orange-700' 
                        : selectedEvent.type === 'sent'
                          ? 'text-green-700'
                          : 'text-red-700'
                    }`}>Subject</label>
                    <p className="text-gray-900 font-bold text-lg mt-2">{selectedEvent.subject}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Campaign</label>
                    <p className="text-gray-900 font-bold text-lg mt-2">{selectedEvent.campaignName}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Contact</label>
                    <p className="text-gray-900 font-bold text-lg mt-2">{selectedEvent.contactEmail}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Date & Time</label>
                    <p className="text-gray-900 font-bold text-lg mt-2">
                      {selectedEvent.date.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })} at {formatTime(selectedEvent.date)}
                    </p>
                  </div>
                  
                  <div className={`rounded-xl p-6 border-2 ${
                    selectedEvent.type === 'scheduled' 
                      ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300' 
                      : selectedEvent.type === 'sent'
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
                        : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-300'
                  }`}>
                    <label className={`text-sm font-bold uppercase tracking-wider ${
                      selectedEvent.type === 'scheduled' 
                        ? 'text-orange-700' 
                        : selectedEvent.type === 'sent'
                          ? 'text-green-700'
                          : 'text-red-700'
                    }`}>Status</label>
                    <div className="mt-3">
                      <Badge className={`px-4 py-2 text-sm font-bold rounded-lg ${
                        selectedEvent.type === 'scheduled' 
                          ? 'bg-orange-100 text-orange-800 border-2 border-orange-300' 
                          : selectedEvent.type === 'sent'
                            ? 'bg-green-100 text-green-800 border-2 border-green-300'
                            : 'bg-red-100 text-red-800 border-2 border-red-300'
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
      </div>
    </div>
  );
};

export default Calendar;
