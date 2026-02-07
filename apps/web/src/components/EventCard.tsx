'use client';

import { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Repeat,
} from 'lucide-react';

interface EventAttendee {
  email: string;
  name?: string;
  responseStatus?: string;
  self?: boolean;
}

interface CalendarEventData {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  isAllDay: boolean;
  status: string;
  htmlLink?: string;
  attendees?: EventAttendee[];
  meetingLink?: string;
  isRecurring?: boolean;
}

interface EventCardProps {
  event: CalendarEventData;
  variant?: 'compact' | 'full';
  showActions?: boolean;
}

// Get relative time description
function getTimeStatus(startStr: string, endStr: string, isAllDay: boolean): {
  label: string;
  color: string;
  isPast: boolean;
  isNow: boolean;
} {
  const now = new Date();
  const start = new Date(startStr);
  const end = new Date(endStr);
  
  if (end < now) {
    return { label: 'Past', color: 'text-zinc-500', isPast: true, isNow: false };
  }
  
  if (start <= now && now <= end) {
    return { label: 'Now', color: 'text-green-400', isPast: false, isNow: true };
  }
  
  // Future event
  const msUntilStart = start.getTime() - now.getTime();
  const minutesUntilStart = Math.floor(msUntilStart / (1000 * 60));
  const hoursUntilStart = Math.floor(minutesUntilStart / 60);
  const daysUntilStart = Math.floor(hoursUntilStart / 24);
  
  if (minutesUntilStart < 60) {
    return { label: `In ${minutesUntilStart}m`, color: 'text-amber-400', isPast: false, isNow: false };
  }
  
  if (hoursUntilStart < 24) {
    return { label: `In ${hoursUntilStart}h`, color: 'text-blue-400', isPast: false, isNow: false };
  }
  
  if (daysUntilStart === 1) {
    return { label: 'Tomorrow', color: 'text-purple-400', isPast: false, isNow: false };
  }
  
  if (daysUntilStart < 7) {
    return { label: `In ${daysUntilStart} days`, color: 'text-zinc-400', isPast: false, isNow: false };
  }
  
  return { label: '', color: 'text-zinc-400', isPast: false, isNow: false };
}

// Format time for display
function formatEventTime(startStr: string, endStr: string, isAllDay: boolean): string {
  const start = new Date(startStr);
  const end = new Date(endStr);
  
  if (isAllDay) {
    const startDate = start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    
    // Check if multi-day
    const endMinusOne = new Date(end);
    endMinusOne.setDate(endMinusOne.getDate() - 1);
    
    if (startDate !== endMinusOne.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })) {
      const endDate = endMinusOne.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      return `${startDate} - ${endDate}`;
    }
    
    return startDate;
  }
  
  const timeFormat: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  const dateFormat: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  
  const startTime = start.toLocaleTimeString([], timeFormat);
  const endTime = end.toLocaleTimeString([], timeFormat);
  const startDate = start.toLocaleDateString([], dateFormat);
  
  // Check if same day
  if (start.toDateString() === end.toDateString()) {
    return `${startDate}, ${startTime} - ${endTime}`;
  }
  
  const endDate = end.toLocaleDateString([], dateFormat);
  return `${startDate} ${startTime} - ${endDate} ${endTime}`;
}

// Get response status icon
function getResponseIcon(status?: string): string {
  switch (status) {
    case 'accepted': return '✅';
    case 'declined': return '❌';
    case 'tentative': return '❓';
    default: return '⏳';
  }
}

export default function EventCard({ 
  event, 
  variant = 'compact',
  showActions = true 
}: EventCardProps) {
  const [isExpanded, setIsExpanded] = useState(variant === 'full');
  
  const timeStatus = getTimeStatus(event.start, event.end, event.isAllDay);
  const formattedTime = formatEventTime(event.start, event.end, event.isAllDay);
  
  const hasDetails = event.description || event.attendees?.length || event.location || event.meetingLink;
  
  return (
    <div 
      className={`rounded-xl border transition-all ${
        timeStatus.isNow 
          ? 'border-green-500/50 bg-green-500/5' 
          : timeStatus.isPast 
            ? 'border-zinc-800 bg-zinc-900/50 opacity-70'
            : 'border-zinc-800 bg-zinc-800/30'
      }`}
    >
      {/* Main content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Calendar icon */}
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            timeStatus.isNow 
              ? 'bg-green-500/20' 
              : timeStatus.isPast 
                ? 'bg-zinc-800'
                : 'bg-purple-500/20'
          }`}>
            <Calendar className={`w-5 h-5 ${
              timeStatus.isNow 
                ? 'text-green-400' 
                : timeStatus.isPast 
                  ? 'text-zinc-500'
                  : 'text-purple-400'
            }`} />
          </div>
          
          {/* Event info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-medium truncate ${
                timeStatus.isPast ? 'text-zinc-400' : 'text-zinc-100'
              }`}>
                {event.summary}
              </h3>
              
              {timeStatus.label && (
                <span className={`text-xs px-2 py-0.5 rounded-full bg-zinc-800 ${timeStatus.color}`}>
                  {timeStatus.label}
                </span>
              )}
              
              {event.status === 'tentative' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                  Tentative
                </span>
              )}
              
              {event.isRecurring && (
                <span title="Recurring event">
                  <Repeat className="w-3.5 h-3.5 text-zinc-500" />
                </span>
              )}
            </div>
            
            {/* Time */}
            <div className="flex items-center gap-1.5 mt-1 text-sm text-zinc-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{formattedTime}</span>
              {event.isAllDay && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                  All day
                </span>
              )}
            </div>
            
            {/* Quick info row */}
            <div className="flex items-center gap-4 mt-2 text-sm">
              {event.location && (
                <div className="flex items-center gap-1.5 text-zinc-500 truncate max-w-[200px]">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
              
              {event.meetingLink && (
                <a
                  href={event.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Join</span>
                </a>
              )}
              
              {event.attendees && event.attendees.length > 0 && (
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <Users className="w-3.5 h-3.5" />
                  <span>{event.attendees.length}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Expand toggle */}
          {hasDetails && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg hover:bg-zinc-700/50 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Expanded details */}
      {isExpanded && hasDetails && (
        <div className="px-4 pb-4 pt-0 border-t border-zinc-800 mt-0">
          <div className="pt-3 space-y-3">
            {/* Description */}
            {event.description && (
              <div>
                <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
                  Description
                </h4>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}
            
            {/* Location with map link */}
            {event.location && (
              <div>
                <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
                  Location
                </h4>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  {event.location}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            
            {/* Attendees */}
            {event.attendees && event.attendees.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
                  Attendees ({event.attendees.length})
                </h4>
                <div className="space-y-1">
                  {event.attendees.slice(0, 10).map((attendee, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span>{getResponseIcon(attendee.responseStatus)}</span>
                      <span className="text-zinc-300">
                        {attendee.name || attendee.email}
                      </span>
                      {attendee.self && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          You
                        </span>
                      )}
                    </div>
                  ))}
                  {event.attendees.length > 10 && (
                    <p className="text-xs text-zinc-500">
                      +{event.attendees.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Actions */}
            {showActions && event.htmlLink && (
              <div className="flex items-center gap-3 pt-2">
                <a
                  href={event.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Calendar
                </a>
                
                {event.meetingLink && (
                  <a
                    href={event.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
                  >
                    <Video className="w-4 h-4" />
                    Join Meeting
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// List variant for displaying multiple events
interface EventListProps {
  events: CalendarEventData[];
  emptyMessage?: string;
  showDate?: boolean;
}

export function EventList({ events, emptyMessage = 'No events found', showDate = false }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }
  
  // Group events by date if showDate is true
  if (showDate) {
    const grouped = events.reduce((acc, event) => {
      const date = new Date(event.start).toLocaleDateString([], { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(event);
      return acc;
    }, {} as Record<string, CalendarEventData[]>);
    
    return (
      <div className="space-y-6">
        {Object.entries(grouped).map(([date, dateEvents]) => (
          <div key={date}>
            <h3 className="text-sm font-medium text-zinc-400 mb-3">{date}</h3>
            <div className="space-y-2">
              {dateEvents.map((event) => (
                <EventCard key={event.id} event={event} variant="compact" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {events.map((event) => (
        <EventCard key={event.id} event={event} variant="compact" />
      ))}
    </div>
  );
}
