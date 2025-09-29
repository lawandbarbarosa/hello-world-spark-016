import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Mail, Clock, CheckCircle, XCircle, AlertCircle, X, RefreshCw, Calendar as CalendarIcon } from 'lucide-react';
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
  const [refreshing, setRefreshing] = useState(false);

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

      console.log('Fetching calendar data for:', {
        startOfMonth: startOfMonth.toISOString(),
        endOfMonth: endOfMonth.toISOString(),
        userId: user.id
      });

      // Get scheduled emails - basic query without joins since no foreign keys exist
      const { data: scheduledEmails, error: scheduledError } = await supabase
        .from('scheduled_emails')
        .select('*')
        .gte('scheduled_for', startOfMonth.toISOString())
        .lte('scheduled_for', endOfMonth.toISOString())
        .order('scheduled_for', { ascending: true });

      // Get sent emails - basic query without joins since foreign keys might not work
      const { data: sentEmails, error: sentError } = await supabase
        .from('email_sends')
        .select('*')
        .not('sent_at', 'is', null)
        .gte('sent_at', startOfMonth.toISOString())
        .lte('sent_at', endOfMonth.toISOString())
        .order('sent_at', { ascending: true });

      // Fetch related data separately to avoid join issues
      let campaignsMap = new Map();
      let contactsMap = new Map();
      let sequencesMap = new Map();
      let sendersMap = new Map();

      if (scheduledEmails && scheduledEmails.length > 0) {
        // Get unique IDs for related data
        const campaignIds = [...new Set(scheduledEmails.map(e => e.campaign_id))];
        const contactIds = [...new Set(scheduledEmails.map(e => e.contact_id))];
        const sequenceIds = [...new Set(scheduledEmails.map(e => e.sequence_id))];
        const senderIds = [...new Set(scheduledEmails.map(e => e.sender_account_id))];

        // Fetch campaigns
        if (campaignIds.length > 0) {
          const { data: campaigns } = await supabase
            .from('campaigns')
            .select('id, name, description')
            .in('id', campaignIds);
          campaigns?.forEach(c => campaignsMap.set(c.id, c));
        }

        // Fetch contacts
        if (contactIds.length > 0) {
          const { data: contacts } = await supabase
            .from('contacts')
            .select('id, email, first_name, last_name')
            .in('id', contactIds);
          contacts?.forEach(c => contactsMap.set(c.id, c));
        }

        // Fetch email sequences
        if (sequenceIds.length > 0) {
          const { data: sequences } = await supabase
            .from('email_sequences')
            .select('id, subject, body, step_number')
            .in('id', sequenceIds);
          sequences?.forEach(s => sequencesMap.set(s.id, s));
        }

        // Fetch sender accounts
        if (senderIds.length > 0) {
          const { data: senders } = await supabase
            .from('sender_accounts')
            .select('id, email')
            .in('id', senderIds);
          senders?.forEach(s => sendersMap.set(s.id, s));
        }
      }

      // Also fetch data for sent emails
      if (sentEmails && sentEmails.length > 0) {
        const campaignIds = [...new Set(sentEmails.map(e => e.campaign_id))];
        const contactIds = [...new Set(sentEmails.map(e => e.contact_id))];
        const sequenceIds = [...new Set(sentEmails.map(e => e.sequence_id))];
        const senderIds = [...new Set(sentEmails.map(e => e.sender_account_id))];

        // Fetch campaigns (merge with existing)
        if (campaignIds.length > 0) {
          const { data: campaigns } = await supabase
            .from('campaigns')
            .select('id, name, description')
            .in('id', campaignIds);
          campaigns?.forEach(c => campaignsMap.set(c.id, c));
        }

        // Fetch contacts (merge with existing)
        if (contactIds.length > 0) {
          const { data: contacts } = await supabase
            .from('contacts')
            .select('id, email, first_name, last_name')
            .in('id', contactIds);
          contacts?.forEach(c => contactsMap.set(c.id, c));
        }

        // Fetch email sequences (merge with existing)
        if (sequenceIds.length > 0) {
          const { data: sequences } = await supabase
            .from('email_sequences')
            .select('id, subject, body, step_number')
            .in('id', sequenceIds);
          sequences?.forEach(s => sequencesMap.set(s.id, s));
        }

        // Fetch sender accounts (merge with existing)
        if (senderIds.length > 0) {
          const { data: senders } = await supabase
            .from('sender_accounts')
            .select('id, email')
            .in('id', senderIds);
          senders?.forEach(s => sendersMap.set(s.id, s));
        }
      }

      if (scheduledError) {
        console.error('Error fetching scheduled emails:', scheduledError);
        console.error('Scheduled error details:', {
          message: scheduledError.message,
          details: scheduledError.details,
          hint: scheduledError.hint,
          code: scheduledError.code
        });
        toast.error(`Failed to fetch scheduled emails: ${scheduledError.message}`);
        return;
      }

      if (sentError) {
        console.error('Error fetching sent emails:', sentError);
        console.error('Sent error details:', {
          message: sentError.message,
          details: sentError.details,
          hint: sentError.hint,
          code: sentError.code
        });
        toast.error(`Failed to fetch sent emails: ${sentError.message}`);
        return;
      }

      // Create a map to store unique emails by their actual content
      const uniqueEmails = new Map<string, CalendarEvent>();

      // Process scheduled emails using the maps
      for (const email of scheduledEmails || []) {
        const date = new Date(email.scheduled_for);
        // Use a more specific key that includes sequence and time to avoid false duplicates
        const key = `scheduled-${email.id}-${date.getTime()}`;
        
        // Get related data from maps
        const contact = contactsMap.get(email.contact_id);
        const campaign = campaignsMap.get(email.campaign_id);
        const sequence = sequencesMap.get(email.sequence_id);
        const sender = sendersMap.get(email.sender_account_id);
        
        const contactName = contact?.first_name && contact?.last_name 
          ? `${contact.first_name} ${contact.last_name}`
          : contact?.email || `Contact ${email.contact_id.slice(0, 8)}`;
        
        const campaignName = campaign?.name || `Campaign ${email.campaign_id.slice(0, 8)}`;
        const subject = sequence?.subject || 'Scheduled Email';
        
        uniqueEmails.set(key, {
          id: `scheduled-${email.id}`,
          title: subject,
          date: date,
          type: 'scheduled',
          status: email.status,
          campaignName: campaignName,
          contactEmail: contactName,
          subject: subject,
          stepNumber: sequence?.step_number || 1,
          originalData: email as ScheduledEmail
        });
      }

      // Process sent emails using the maps
      for (const email of sentEmails || []) {
        const date = new Date(email.sent_at);
        // Use a more specific key that includes sequence and time to avoid false duplicates
        const key = `sent-${email.id}-${date.getTime()}`;
        
        // Get related data from maps
        const contact = contactsMap.get(email.contact_id);
        const campaign = campaignsMap.get(email.campaign_id);
        const sequence = sequencesMap.get(email.sequence_id);
        const sender = sendersMap.get(email.sender_account_id);
        
        const contactName = contact?.first_name && contact?.last_name 
          ? `${contact.first_name} ${contact.last_name}`
          : contact?.email || `Contact ${email.contact_id.slice(0, 8)}`;
        
        const campaignName = campaign?.name || `Campaign ${email.campaign_id.slice(0, 8)}`;
        const subject = sequence?.subject || 'Sent Email';
        
        uniqueEmails.set(key, {
          id: `sent-${email.id}`,
          title: subject,
          date: date,
          type: email.status === 'failed' ? 'failed' : 'sent',
          status: email.status,
          campaignName: campaignName,
          contactEmail: contactName,
          subject: subject,
          stepNumber: sequence?.step_number || 1,
          originalData: email as SentEmail
        });
      }

      // Convert map to array and sort by date
      const finalEvents = Array.from(uniqueEmails.values()).sort((a, b) => 
        a.date.getTime() - b.date.getTime()
      );
      
      console.log('Total unique emails:', finalEvents.length);
      console.log('Scheduled emails:', scheduledEmails?.length || 0);
      console.log('Sent emails:', sentEmails?.length || 0);
      setEvents(finalEvents);
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

  const resetCalendar = async () => {
    setRefreshing(true);
    setEvents([]);
    try {
      await fetchCalendarData();
      toast.success('Calendar refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh calendar');
    } finally {
      setRefreshing(false);
    }
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
      return 'bg-gradient-to-r from-amber-50 to-orange-100 text-amber-800 border-l-4 border-amber-400 shadow-sm hover:shadow-md transition-all duration-200';
    } else if (type === 'sent') {
      return 'bg-gradient-to-r from-green-50 to-emerald-100 text-green-800 border-l-4 border-green-500 shadow-sm hover:shadow-md transition-all duration-200';
    } else if (type === 'failed') {
      return 'bg-gradient-to-r from-red-50 to-rose-100 text-red-800 border-l-4 border-red-500 shadow-sm hover:shadow-md transition-all duration-200';
    }
    return 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-800 border-l-4 border-slate-400 shadow-sm hover:shadow-md transition-all duration-200';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Clean Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-normal text-gray-900">
                Email Calendar
              </h1>
              <p className="text-gray-600">Track your email campaigns and scheduled sends</p>
            </div>
            
            <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl p-2 shadow-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('prev')}
                className="hover:bg-white/50 transition-colors duration-200 text-slate-700 hover:text-slate-900"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center min-w-[180px]">
                <h2 className="text-xl font-semibold text-slate-800">
                  {monthNames[currentDate.getMonth()]}
                </h2>
                <p className="text-slate-600 text-sm">
                  {currentDate.getFullYear()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('next')}
                className="hover:bg-white/50 transition-colors duration-200 text-slate-700 hover:text-slate-900"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="bg-white/60 backdrop-blur-sm border-white/30 text-slate-700 hover:bg-white/80 hover:text-slate-900 transition-all duration-200"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetCalendar}
                disabled={refreshing}
                className="bg-white/60 backdrop-blur-sm border-white/30 text-slate-700 hover:bg-white/80 hover:text-slate-900 transition-all duration-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Legend with Statistics */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-md shadow-sm border-l-4 border-amber-600"></div>
                <span className="text-sm font-medium text-slate-700">Scheduled</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gradient-to-br from-green-400 to-emerald-500 rounded-md shadow-sm border-l-4 border-green-600"></div>
                <span className="text-sm font-medium text-slate-700">Sent</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gradient-to-br from-red-400 to-rose-500 rounded-md shadow-sm border-l-4 border-red-600"></div>
                <span className="text-sm font-medium text-slate-700">Failed</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {events.filter(e => e.type === 'scheduled').length}
                </div>
                <div className="text-xs text-slate-500">Scheduled</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {events.filter(e => e.type === 'sent').length}
                </div>
                <div className="text-xs text-slate-500">Sent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {events.filter(e => e.type === 'failed').length}
                </div>
                <div className="text-xs text-slate-500">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-600">
                  {events.length}
                </div>
                <div className="text-xs text-slate-500">Total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sophisticated Calendar Grid */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/30 overflow-hidden">
          {/* Calendar Header */}
          <div className="grid grid-cols-7 bg-gradient-to-r from-slate-100 to-blue-100 border-b border-white/40">
            {dayNames.map(day => (
              <div key={day} className="p-4 text-center font-semibold text-slate-700 border-r border-white/40 last:border-r-0 text-sm">
                {day}
              </div>
            ))}
          </div>
          
          {/* Sophisticated Calendar Body */}
          <div className="grid grid-cols-7">
            {getDaysInMonth(currentDate).map((day, index) => {
              const isToday = day && day.toDateString() === new Date().toDateString();
              const isCurrentMonth = day && day.getMonth() === currentDate.getMonth();
              const hasEvents = day && getEventsForDay(day).length > 0;
              
              return (
                <div
                  key={index}
                  className={`min-h-[120px] border-r border-b border-white/40 last:border-r-0 p-3 relative transition-all duration-200 ${
                    isCurrentMonth 
                      ? 'bg-white/50 hover:bg-white/70 hover:shadow-sm' 
                      : 'bg-slate-50/50 text-slate-400'
                  }`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-semibold mb-2 ${
                        isToday 
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs shadow-md' 
                          : isCurrentMonth 
                            ? 'text-slate-800' 
                            : 'text-slate-400'
                      }`}>
                        {day.getDate()}
                      </div>
                      
                      <div className="space-y-1">
                        {getEventsForDay(day).slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            className={`text-xs p-2 rounded-md cursor-pointer hover:shadow-sm transition-all duration-200 ${getEventColor(event.type, event.status)}`}
                            onClick={() => setSelectedEvent(event)}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              {getEventIcon(event.type, event.status)}
                              <span className="text-xs font-medium">{formatTime(event.date)}</span>
                            </div>
                            <div className="truncate text-xs font-semibold">
                              {event.title}
                            </div>
                          </div>
                        ))}
                        
                        {getEventsForDay(day).length > 2 && (
                          <div className="text-xs text-slate-600 bg-slate-100/80 rounded-md px-2 py-1 text-center font-medium">
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

        {/* Sophisticated Event Details Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-white/20">
              {/* Sophisticated Modal Header */}
              <div className="p-6 border-b border-white/30 bg-gradient-to-r from-slate-50/50 to-blue-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${
                      selectedEvent.type === 'scheduled' 
                        ? 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600' 
                        : selectedEvent.type === 'sent'
                          ? 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600'
                          : 'bg-gradient-to-br from-red-100 to-red-200 text-red-600'
                    }`}>
                      {getEventIcon(selectedEvent.type, selectedEvent.status)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">{selectedEvent.title}</h3>
                      <p className="text-sm text-slate-600">
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
                    className="text-slate-400 hover:text-slate-600 hover:bg-white/50"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              
              {/* Sophisticated Modal Content */}
              <div className="p-6 space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email Subject</label>
                    <p className="text-sm text-slate-800 mt-1 font-medium break-words">{selectedEvent.subject}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Campaign</label>
                    <p className="text-sm text-slate-800 mt-1 font-medium">{selectedEvent.campaignName}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recipient</label>
                    <p className="text-sm text-slate-800 mt-1 font-medium">{selectedEvent.contactEmail}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</label>
                    <p className="text-sm text-slate-800 mt-1 font-medium capitalize">
                      {selectedEvent.type === 'scheduled' ? 'Scheduled Email' : 
                       selectedEvent.type === 'sent' ? 'Sent Email' : 
                       'Failed Email'}
                    </p>
                  </div>
                  
                  
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</label>
                    <div className="mt-1">
                      <Badge className={`text-xs font-semibold ${
                        selectedEvent.type === 'scheduled' 
                          ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300' 
                          : selectedEvent.type === 'sent'
                            ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300'
                            : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
                      }`}>
                        {selectedEvent.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {selectedEvent.stepNumber && (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Step</label>
                      <p className="text-sm text-slate-800 mt-1 font-medium">Step {selectedEvent.stepNumber}</p>
                    </div>
                  )}
                  
                  {selectedEvent.originalData.error_message && (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Error Message</label>
                      <p className="text-sm text-red-600 mt-1 font-medium">{selectedEvent.originalData.error_message}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end pt-4 border-t border-white/30">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedEvent(null)}
                    className="text-slate-600 hover:bg-white/50 border-white/30"
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
