// Google Calendar API Client
// Wraps the Calendar REST API with typed methods

import {
  CalendarEvent,
  CalendarListEntry,
  EventListResponse,
  FreeBusyResponse,
  SimpleEvent,
  EventDraft,
  EventUpdateDraft,
  EventListOptions,
  FreeTimeSlot,
} from './types';
import { getValidAccessToken, loadCalendarAuth } from './auth';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// Make authenticated request to Calendar API
async function calendarRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const state = loadCalendarAuth();
  if (!state) {
    throw new Error('Calendar not connected');
  }
  
  const { token } = await getValidAccessToken(state);
  
  const response = await fetch(`${CALENDAR_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.error?.message || `Calendar API error: ${response.status}`;
    throw new Error(message);
  }
  
  // Handle 204 No Content for DELETE requests
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
}

// Convert Google Calendar event to our SimpleEvent type
function parseCalendarEvent(event: CalendarEvent): SimpleEvent {
  const isAllDay = !!event.start.date;
  
  let start: Date;
  let end: Date;
  
  if (isAllDay) {
    start = new Date(event.start.date!);
    end = new Date(event.end.date!);
  } else {
    start = new Date(event.start.dateTime!);
    end = new Date(event.end.dateTime!);
  }
  
  // Extract meeting link from various sources
  let meetingLink: string | undefined;
  if (event.hangoutLink) {
    meetingLink = event.hangoutLink;
  } else if (event.conferenceData?.entryPoints) {
    const videoEntry = event.conferenceData.entryPoints.find(e => e.entryPointType === 'video');
    meetingLink = videoEntry?.uri;
  }
  
  return {
    id: event.id,
    summary: event.summary || '(No title)',
    description: event.description,
    location: event.location,
    start,
    end,
    isAllDay,
    status: event.status,
    htmlLink: event.htmlLink,
    attendees: event.attendees?.map(a => ({
      email: a.email || '',
      name: a.displayName,
      responseStatus: a.responseStatus,
      self: a.self,
    })),
    meetingLink,
    isRecurring: !!event.recurringEventId || !!event.recurrence?.length,
    colorId: event.colorId,
  };
}

// Format date for API (handles Date objects and strings)
function formatDateTime(date: Date | string, isAllDay: boolean = false): { date?: string; dateTime?: string; timeZone?: string } {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isAllDay) {
    // Format as YYYY-MM-DD for all-day events
    return { date: d.toISOString().split('T')[0] };
  }
  
  // Format as RFC3339 for timed events
  return { 
    dateTime: d.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

// ==================== Public API ====================

/**
 * List calendars the user has access to
 */
export async function listCalendars(): Promise<CalendarListEntry[]> {
  const response = await calendarRequest<{ items: CalendarListEntry[] }>(
    '/users/me/calendarList'
  );
  return response.items || [];
}

/**
 * Get the primary calendar
 */
export async function getPrimaryCalendar(): Promise<CalendarListEntry> {
  return calendarRequest<CalendarListEntry>('/calendars/primary');
}

/**
 * List events from a calendar
 */
export async function listEvents(options: EventListOptions = {}): Promise<{
  events: SimpleEvent[];
  nextPageToken?: string;
}> {
  const calendarId = options.calendarId || 'primary';
  const params = new URLSearchParams();
  
  if (options.maxResults) {
    params.append('maxResults', String(options.maxResults));
  }
  if (options.pageToken) {
    params.append('pageToken', options.pageToken);
  }
  if (options.timeMin) {
    params.append('timeMin', options.timeMin.toISOString());
  }
  if (options.timeMax) {
    params.append('timeMax', options.timeMax.toISOString());
  }
  if (options.q) {
    params.append('q', options.q);
  }
  if (options.singleEvents !== undefined) {
    params.append('singleEvents', String(options.singleEvents));
  }
  if (options.orderBy) {
    params.append('orderBy', options.orderBy);
  }
  if (options.showDeleted) {
    params.append('showDeleted', 'true');
  }
  
  const queryString = params.toString();
  const endpoint = `/calendars/${encodeURIComponent(calendarId)}/events${queryString ? `?${queryString}` : ''}`;
  
  const response = await calendarRequest<EventListResponse>(endpoint);
  
  return {
    events: (response.items || []).map(parseCalendarEvent),
    nextPageToken: response.nextPageToken,
  };
}

/**
 * Get upcoming events (today and forward)
 */
export async function getUpcomingEvents(maxResults: number = 10): Promise<SimpleEvent[]> {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today
  
  const { events } = await listEvents({
    timeMin: now,
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });
  
  return events;
}

/**
 * Get today's events
 */
export async function getTodayEvents(): Promise<SimpleEvent[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  
  const { events } = await listEvents({
    timeMin: startOfDay,
    timeMax: endOfDay,
    singleEvents: true,
    orderBy: 'startTime',
  });
  
  return events;
}

/**
 * Get events for a specific date range
 */
export async function getEventsInRange(
  startDate: Date,
  endDate: Date,
  maxResults: number = 50
): Promise<SimpleEvent[]> {
  const { events } = await listEvents({
    timeMin: startDate,
    timeMax: endDate,
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });
  
  return events;
}

/**
 * Get a single event by ID
 */
export async function getEvent(eventId: string, calendarId: string = 'primary'): Promise<SimpleEvent> {
  const event = await calendarRequest<CalendarEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
  );
  return parseCalendarEvent(event);
}

/**
 * Search events by query
 */
export async function searchEvents(
  query: string,
  maxResults: number = 10,
  calendarId: string = 'primary'
): Promise<SimpleEvent[]> {
  const { events } = await listEvents({
    calendarId,
    q: query,
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
    timeMin: new Date(), // Only future events
  });
  
  return events;
}

/**
 * Create a new event
 */
export async function createEvent(
  draft: EventDraft,
  calendarId: string = 'primary'
): Promise<SimpleEvent> {
  const isAllDay = draft.isAllDay || false;
  
  const eventData: Partial<CalendarEvent> & { start: object; end: object } = {
    summary: draft.summary,
    description: draft.description,
    location: draft.location,
    start: formatDateTime(draft.start, isAllDay),
    end: formatDateTime(draft.end, isAllDay),
    colorId: draft.colorId,
  };
  
  if (draft.attendees?.length) {
    eventData.attendees = draft.attendees.map(email => ({ email }));
  }
  
  if (draft.reminders) {
    eventData.reminders = {
      useDefault: draft.reminders.useDefault ?? true,
      overrides: draft.reminders.overrides,
    };
  }
  
  if (draft.recurrence) {
    eventData.recurrence = draft.recurrence;
  }
  
  // Add Google Meet if requested
  const queryParams = draft.conferenceDataVersion 
    ? `?conferenceDataVersion=${draft.conferenceDataVersion}`
    : '';
  
  const event = await calendarRequest<CalendarEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events${queryParams}`,
    {
      method: 'POST',
      body: JSON.stringify(eventData),
    }
  );
  
  return parseCalendarEvent(event);
}

/**
 * Quick add event using natural language
 * e.g., "Meeting with Bob tomorrow at 3pm"
 */
export async function quickAddEvent(
  text: string,
  calendarId: string = 'primary'
): Promise<SimpleEvent> {
  const event = await calendarRequest<CalendarEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events/quickAdd?text=${encodeURIComponent(text)}`,
    { method: 'POST' }
  );
  
  return parseCalendarEvent(event);
}

/**
 * Update an existing event
 */
export async function updateEvent(
  eventId: string,
  updates: EventUpdateDraft,
  calendarId: string = 'primary'
): Promise<SimpleEvent> {
  // First fetch the existing event
  const existing = await calendarRequest<CalendarEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
  );
  
  // Merge updates
  const eventData: Partial<CalendarEvent> = { ...existing };
  
  if (updates.summary !== undefined) {
    eventData.summary = updates.summary;
  }
  if (updates.description !== undefined) {
    eventData.description = updates.description;
  }
  if (updates.location !== undefined) {
    eventData.location = updates.location;
  }
  if (updates.colorId !== undefined) {
    eventData.colorId = updates.colorId;
  }
  if (updates.start !== undefined) {
    const isAllDay = updates.isAllDay ?? !!existing.start.date;
    eventData.start = formatDateTime(updates.start, isAllDay);
  }
  if (updates.end !== undefined) {
    const isAllDay = updates.isAllDay ?? !!existing.end.date;
    eventData.end = formatDateTime(updates.end, isAllDay);
  }
  if (updates.attendees !== undefined) {
    eventData.attendees = updates.attendees.map(email => ({ email }));
  }
  
  const event = await calendarRequest<CalendarEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(eventData),
    }
  );
  
  return parseCalendarEvent(event);
}

/**
 * Delete an event
 */
export async function deleteEvent(
  eventId: string,
  calendarId: string = 'primary'
): Promise<void> {
  await calendarRequest<void>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'DELETE' }
  );
}

/**
 * Get free/busy information for finding available slots
 */
export async function getFreeBusy(
  timeMin: Date,
  timeMax: Date,
  calendarIds: string[] = ['primary']
): Promise<FreeBusyResponse> {
  return calendarRequest<FreeBusyResponse>('/freeBusy', {
    method: 'POST',
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: calendarIds.map(id => ({ id })),
    }),
  });
}

/**
 * Find free time slots in a date range
 */
export async function findFreeTime(
  startDate: Date,
  endDate: Date,
  minDurationMinutes: number = 30,
  workingHoursOnly: boolean = true
): Promise<FreeTimeSlot[]> {
  // Get busy times
  const freeBusy = await getFreeBusy(startDate, endDate);
  const busyTimes = freeBusy.calendars.primary?.busy || [];
  
  // Convert to sorted array of busy periods
  const busy = busyTimes
    .map(b => ({
      start: new Date(b.start),
      end: new Date(b.end),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  
  // Find gaps
  const freeSlots: FreeTimeSlot[] = [];
  let current = new Date(startDate);
  
  // Working hours: 9 AM to 6 PM
  const workStart = 9;
  const workEnd = 18;
  
  for (const period of busy) {
    // Check if there's a gap before this busy period
    if (current < period.start) {
      let slotStart = new Date(current);
      let slotEnd = new Date(period.start);
      
      // Apply working hours filter if needed
      if (workingHoursOnly) {
        // Adjust start to working hours
        if (slotStart.getHours() < workStart) {
          slotStart.setHours(workStart, 0, 0, 0);
        }
        if (slotStart.getHours() >= workEnd) {
          // Move to next day
          slotStart.setDate(slotStart.getDate() + 1);
          slotStart.setHours(workStart, 0, 0, 0);
        }
        
        // Adjust end to working hours
        if (slotEnd.getHours() > workEnd) {
          slotEnd.setHours(workEnd, 0, 0, 0);
        }
        if (slotEnd.getHours() < workStart) {
          // This slot is before working hours, skip
          slotEnd = slotStart;
        }
      }
      
      const durationMs = slotEnd.getTime() - slotStart.getTime();
      const durationMinutes = durationMs / (1000 * 60);
      
      if (durationMinutes >= minDurationMinutes) {
        freeSlots.push({
          start: slotStart,
          end: slotEnd,
          durationMinutes: Math.round(durationMinutes),
        });
      }
    }
    
    // Move current to end of this busy period
    if (period.end > current) {
      current = new Date(period.end);
    }
  }
  
  // Check for free time after last busy period
  if (current < endDate) {
    let slotStart = new Date(current);
    let slotEnd = new Date(endDate);
    
    if (workingHoursOnly) {
      if (slotStart.getHours() < workStart) {
        slotStart.setHours(workStart, 0, 0, 0);
      }
      if (slotStart.getHours() >= workEnd) {
        slotStart.setDate(slotStart.getDate() + 1);
        slotStart.setHours(workStart, 0, 0, 0);
      }
      if (slotEnd.getHours() > workEnd) {
        slotEnd.setHours(workEnd, 0, 0, 0);
      }
    }
    
    const durationMs = slotEnd.getTime() - slotStart.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    
    if (durationMinutes >= minDurationMinutes) {
      freeSlots.push({
        start: slotStart,
        end: slotEnd,
        durationMinutes: Math.round(durationMinutes),
      });
    }
  }
  
  return freeSlots;
}

/**
 * Get event count for a date range (for summaries)
 */
export async function getEventCount(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const { events } = await listEvents({
    timeMin: startDate,
    timeMax: endDate,
    singleEvents: true,
    maxResults: 250, // Max allowed by API
  });
  
  return events.length;
}

/**
 * Check if a time slot is available
 */
export async function isTimeSlotAvailable(
  start: Date,
  end: Date
): Promise<boolean> {
  const freeBusy = await getFreeBusy(start, end);
  const busy = freeBusy.calendars.primary?.busy || [];
  
  return busy.length === 0;
}
