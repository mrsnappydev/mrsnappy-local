// Calendar Tools for MrSnappy Local
// Provides LLM-accessible tools for calendar operations

import { ToolDefinition, ToolResult } from './types';
import {
  listEvents,
  getEvent,
  getTodayEvents,
  getUpcomingEvents,
  getEventsInRange,
  searchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  quickAddEvent,
  findFreeTime,
  isCalendarConnected,
  SimpleEvent,
  FreeTimeSlot,
} from '@/lib/integrations/calendar';

// ==================== Tool Definitions ====================

export const calendarListEventsTool: ToolDefinition = {
  name: 'calendar_list_events',
  displayName: 'List Calendar Events',
  description: 'List upcoming events from your Google Calendar. Can filter by date range. Returns event title, date/time, location, and meeting links.',
  icon: '📅',
  integration: 'calendar',
  parameters: [
    {
      name: 'timeFrame',
      type: 'string',
      description: 'Time frame to list: "today", "tomorrow", "week", "month", or "custom"',
      required: false,
      default: 'week',
    },
    {
      name: 'startDate',
      type: 'string',
      description: 'Start date for custom range (ISO format: YYYY-MM-DD). Required if timeFrame is "custom".',
      required: false,
    },
    {
      name: 'endDate',
      type: 'string',
      description: 'End date for custom range (ISO format: YYYY-MM-DD). Required if timeFrame is "custom".',
      required: false,
    },
    {
      name: 'maxResults',
      type: 'number',
      description: 'Maximum number of events to return (default: 10, max: 50)',
      required: false,
      default: 10,
    },
  ],
};

export const calendarGetEventTool: ToolDefinition = {
  name: 'calendar_get_event',
  displayName: 'Get Event Details',
  description: 'Get detailed information about a specific calendar event by its ID.',
  icon: '📋',
  integration: 'calendar',
  parameters: [
    {
      name: 'eventId',
      type: 'string',
      description: 'The ID of the event to retrieve',
      required: true,
    },
  ],
};

export const calendarCreateEventTool: ToolDefinition = {
  name: 'calendar_create_event',
  displayName: 'Create Event',
  description: 'Create a new calendar event. Supports setting title, time, location, description, and attendees.',
  icon: '➕',
  integration: 'calendar',
  parameters: [
    {
      name: 'summary',
      type: 'string',
      description: 'Event title/summary',
      required: true,
    },
    {
      name: 'startTime',
      type: 'string',
      description: 'Event start time (ISO format: YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD for all-day)',
      required: true,
    },
    {
      name: 'endTime',
      type: 'string',
      description: 'Event end time (ISO format). If not provided for timed events, defaults to 1 hour after start.',
      required: false,
    },
    {
      name: 'description',
      type: 'string',
      description: 'Event description/notes',
      required: false,
    },
    {
      name: 'location',
      type: 'string',
      description: 'Event location (address or place name)',
      required: false,
    },
    {
      name: 'attendees',
      type: 'string',
      description: 'Comma-separated list of attendee email addresses',
      required: false,
    },
    {
      name: 'isAllDay',
      type: 'boolean',
      description: 'Whether this is an all-day event',
      required: false,
      default: false,
    },
    {
      name: 'addMeet',
      type: 'boolean',
      description: 'Add a Google Meet video conference link',
      required: false,
      default: false,
    },
  ],
};

export const calendarUpdateEventTool: ToolDefinition = {
  name: 'calendar_update_event',
  displayName: 'Update Event',
  description: 'Update an existing calendar event. Only provide fields you want to change.',
  icon: '✏️',
  integration: 'calendar',
  parameters: [
    {
      name: 'eventId',
      type: 'string',
      description: 'The ID of the event to update',
      required: true,
    },
    {
      name: 'summary',
      type: 'string',
      description: 'New event title',
      required: false,
    },
    {
      name: 'startTime',
      type: 'string',
      description: 'New start time (ISO format)',
      required: false,
    },
    {
      name: 'endTime',
      type: 'string',
      description: 'New end time (ISO format)',
      required: false,
    },
    {
      name: 'description',
      type: 'string',
      description: 'New description',
      required: false,
    },
    {
      name: 'location',
      type: 'string',
      description: 'New location',
      required: false,
    },
  ],
};

export const calendarDeleteEventTool: ToolDefinition = {
  name: 'calendar_delete_event',
  displayName: 'Delete Event',
  description: 'Delete a calendar event. This action cannot be undone.',
  icon: '🗑️',
  integration: 'calendar',
  parameters: [
    {
      name: 'eventId',
      type: 'string',
      description: 'The ID of the event to delete',
      required: true,
    },
  ],
};

export const calendarQuickAddTool: ToolDefinition = {
  name: 'calendar_quick_add',
  displayName: 'Quick Add Event',
  description: 'Create an event using natural language. Google will parse the text to determine date, time, and title. Examples: "Meeting with Bob tomorrow at 3pm", "Dentist appointment Friday 10am"',
  icon: '⚡',
  integration: 'calendar',
  parameters: [
    {
      name: 'text',
      type: 'string',
      description: 'Natural language description of the event',
      required: true,
    },
  ],
};

export const calendarFindFreeTimeTool: ToolDefinition = {
  name: 'calendar_find_free_time',
  displayName: 'Find Free Time',
  description: 'Find available time slots in your calendar. Useful for scheduling meetings.',
  icon: '🕐',
  integration: 'calendar',
  parameters: [
    {
      name: 'date',
      type: 'string',
      description: 'Date to search for free time (ISO format: YYYY-MM-DD). Defaults to today.',
      required: false,
    },
    {
      name: 'daysToSearch',
      type: 'number',
      description: 'Number of days to search (default: 7)',
      required: false,
      default: 7,
    },
    {
      name: 'minDuration',
      type: 'number',
      description: 'Minimum slot duration in minutes (default: 30)',
      required: false,
      default: 30,
    },
    {
      name: 'workingHoursOnly',
      type: 'boolean',
      description: 'Only show slots during working hours (9 AM - 6 PM)',
      required: false,
      default: true,
    },
  ],
};

export const calendarSearchTool: ToolDefinition = {
  name: 'calendar_search',
  displayName: 'Search Events',
  description: 'Search for calendar events by keyword. Searches event titles, descriptions, and locations.',
  icon: '🔍',
  integration: 'calendar',
  parameters: [
    {
      name: 'query',
      type: 'string',
      description: 'Search query',
      required: true,
    },
    {
      name: 'maxResults',
      type: 'number',
      description: 'Maximum number of results (default: 10)',
      required: false,
      default: 10,
    },
  ],
};

// All Calendar tools
export const calendarTools: ToolDefinition[] = [
  calendarListEventsTool,
  calendarGetEventTool,
  calendarCreateEventTool,
  calendarUpdateEventTool,
  calendarDeleteEventTool,
  calendarQuickAddTool,
  calendarFindFreeTimeTool,
  calendarSearchTool,
];

// ==================== Tool Executors ====================

/**
 * Execute calendar_list_events tool
 */
export async function executeCalendarListEvents(
  timeFrame: string = 'week',
  startDate?: string,
  endDate?: string,
  maxResults: number = 10
): Promise<ToolResult> {
  const toolCallId = `calendar_list_${Date.now()}`;
  
  if (!isCalendarConnected()) {
    return {
      toolCallId,
      name: 'calendar_list_events',
      success: false,
      error: 'Calendar is not connected. Please connect your Google Calendar in Settings → Integrations.',
    };
  }
  
  try {
    const clampedMax = Math.min(Math.max(1, maxResults), 50);
    let events: SimpleEvent[];
    let periodDescription: string;
    
    const now = new Date();
    
    switch (timeFrame.toLowerCase()) {
      case 'today':
        events = await getTodayEvents();
        periodDescription = 'today';
        break;
        
      case 'tomorrow': {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);
        events = await getEventsInRange(tomorrow, dayAfter, clampedMax);
        periodDescription = 'tomorrow';
        break;
      }
        
      case 'week': {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);
        events = await getEventsInRange(now, weekEnd, clampedMax);
        periodDescription = 'this week';
        break;
      }
        
      case 'month': {
        const monthEnd = new Date(now);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        events = await getEventsInRange(now, monthEnd, clampedMax);
        periodDescription = 'this month';
        break;
      }
        
      case 'custom':
        if (!startDate || !endDate) {
          return {
            toolCallId,
            name: 'calendar_list_events',
            success: false,
            error: 'startDate and endDate are required for custom time frame',
          };
        }
        events = await getEventsInRange(
          new Date(startDate),
          new Date(endDate),
          clampedMax
        );
        periodDescription = `${startDate} to ${endDate}`;
        break;
        
      default:
        events = await getUpcomingEvents(clampedMax);
        periodDescription = 'upcoming';
    }
    
    const result = {
      period: periodDescription,
      events: events.map(formatEventSummary),
      count: events.length,
    };
    
    return {
      toolCallId,
      name: 'calendar_list_events',
      success: true,
      result,
      displayType: 'calendar',
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'calendar_list_events',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list events',
    };
  }
}

/**
 * Execute calendar_get_event tool
 */
export async function executeCalendarGetEvent(eventId: string): Promise<ToolResult> {
  const toolCallId = `calendar_get_${Date.now()}`;
  
  if (!isCalendarConnected()) {
    return {
      toolCallId,
      name: 'calendar_get_event',
      success: false,
      error: 'Calendar is not connected. Please connect your Google Calendar in Settings → Integrations.',
    };
  }
  
  if (!eventId) {
    return {
      toolCallId,
      name: 'calendar_get_event',
      success: false,
      error: 'Event ID is required',
    };
  }
  
  try {
    const event = await getEvent(eventId);
    
    return {
      toolCallId,
      name: 'calendar_get_event',
      success: true,
      result: formatEventFull(event),
      displayType: 'calendar',
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'calendar_get_event',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get event',
    };
  }
}

/**
 * Execute calendar_create_event tool
 */
export async function executeCalendarCreateEvent(
  summary: string,
  startTime: string,
  endTime?: string,
  description?: string,
  location?: string,
  attendees?: string,
  isAllDay: boolean = false,
  addMeet: boolean = false
): Promise<ToolResult> {
  const toolCallId = `calendar_create_${Date.now()}`;
  
  if (!isCalendarConnected()) {
    return {
      toolCallId,
      name: 'calendar_create_event',
      success: false,
      error: 'Calendar is not connected. Please connect your Google Calendar in Settings → Integrations.',
    };
  }
  
  if (!summary || !startTime) {
    return {
      toolCallId,
      name: 'calendar_create_event',
      success: false,
      error: 'Summary and start time are required',
    };
  }
  
  try {
    const start = new Date(startTime);
    let end: Date;
    
    if (endTime) {
      end = new Date(endTime);
    } else if (isAllDay) {
      // All-day event: end is next day
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    } else {
      // Default to 1 hour duration
      end = new Date(start);
      end.setHours(end.getHours() + 1);
    }
    
    const event = await createEvent({
      summary,
      start,
      end,
      description,
      location,
      isAllDay,
      attendees: attendees ? attendees.split(',').map(e => e.trim()) : undefined,
      conferenceDataVersion: addMeet ? 1 : undefined,
    });
    
    return {
      toolCallId,
      name: 'calendar_create_event',
      success: true,
      result: {
        message: 'Event created successfully',
        event: formatEventFull(event),
      },
      displayType: 'calendar',
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'calendar_create_event',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create event',
    };
  }
}

/**
 * Execute calendar_update_event tool
 */
export async function executeCalendarUpdateEvent(
  eventId: string,
  summary?: string,
  startTime?: string,
  endTime?: string,
  description?: string,
  location?: string
): Promise<ToolResult> {
  const toolCallId = `calendar_update_${Date.now()}`;
  
  if (!isCalendarConnected()) {
    return {
      toolCallId,
      name: 'calendar_update_event',
      success: false,
      error: 'Calendar is not connected. Please connect your Google Calendar in Settings → Integrations.',
    };
  }
  
  if (!eventId) {
    return {
      toolCallId,
      name: 'calendar_update_event',
      success: false,
      error: 'Event ID is required',
    };
  }
  
  try {
    const updates: {
      summary?: string;
      start?: Date;
      end?: Date;
      description?: string;
      location?: string;
    } = {};
    
    if (summary) updates.summary = summary;
    if (startTime) updates.start = new Date(startTime);
    if (endTime) updates.end = new Date(endTime);
    if (description !== undefined) updates.description = description;
    if (location !== undefined) updates.location = location;
    
    const event = await updateEvent(eventId, updates);
    
    return {
      toolCallId,
      name: 'calendar_update_event',
      success: true,
      result: {
        message: 'Event updated successfully',
        event: formatEventFull(event),
      },
      displayType: 'calendar',
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'calendar_update_event',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update event',
    };
  }
}

/**
 * Execute calendar_delete_event tool
 */
export async function executeCalendarDeleteEvent(eventId: string): Promise<ToolResult> {
  const toolCallId = `calendar_delete_${Date.now()}`;
  
  if (!isCalendarConnected()) {
    return {
      toolCallId,
      name: 'calendar_delete_event',
      success: false,
      error: 'Calendar is not connected. Please connect your Google Calendar in Settings → Integrations.',
    };
  }
  
  if (!eventId) {
    return {
      toolCallId,
      name: 'calendar_delete_event',
      success: false,
      error: 'Event ID is required',
    };
  }
  
  try {
    // Get event details first for confirmation message
    const event = await getEvent(eventId);
    await deleteEvent(eventId);
    
    return {
      toolCallId,
      name: 'calendar_delete_event',
      success: true,
      result: {
        message: 'Event deleted successfully',
        deletedEvent: event.summary,
        eventId,
      },
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'calendar_delete_event',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete event',
    };
  }
}

/**
 * Execute calendar_quick_add tool
 */
export async function executeCalendarQuickAdd(text: string): Promise<ToolResult> {
  const toolCallId = `calendar_quickadd_${Date.now()}`;
  
  if (!isCalendarConnected()) {
    return {
      toolCallId,
      name: 'calendar_quick_add',
      success: false,
      error: 'Calendar is not connected. Please connect your Google Calendar in Settings → Integrations.',
    };
  }
  
  if (!text) {
    return {
      toolCallId,
      name: 'calendar_quick_add',
      success: false,
      error: 'Event text is required',
    };
  }
  
  try {
    const event = await quickAddEvent(text);
    
    return {
      toolCallId,
      name: 'calendar_quick_add',
      success: true,
      result: {
        message: 'Event created successfully',
        event: formatEventFull(event),
      },
      displayType: 'calendar',
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'calendar_quick_add',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create event',
    };
  }
}

/**
 * Execute calendar_find_free_time tool
 */
export async function executeCalendarFindFreeTime(
  date?: string,
  daysToSearch: number = 7,
  minDuration: number = 30,
  workingHoursOnly: boolean = true
): Promise<ToolResult> {
  const toolCallId = `calendar_freetime_${Date.now()}`;
  
  if (!isCalendarConnected()) {
    return {
      toolCallId,
      name: 'calendar_find_free_time',
      success: false,
      error: 'Calendar is not connected. Please connect your Google Calendar in Settings → Integrations.',
    };
  }
  
  try {
    const startDate = date ? new Date(date) : new Date();
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Math.min(Math.max(1, daysToSearch), 30));
    
    const slots = await findFreeTime(
      startDate,
      endDate,
      Math.max(15, minDuration),
      workingHoursOnly
    );
    
    return {
      toolCallId,
      name: 'calendar_find_free_time',
      success: true,
      result: {
        searchPeriod: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        },
        minDurationMinutes: minDuration,
        workingHoursOnly,
        freeSlots: slots.slice(0, 20).map(formatFreeSlot), // Limit to 20 slots
        totalSlotsFound: slots.length,
      },
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'calendar_find_free_time',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to find free time',
    };
  }
}

/**
 * Execute calendar_search tool
 */
export async function executeCalendarSearch(
  query: string,
  maxResults: number = 10
): Promise<ToolResult> {
  const toolCallId = `calendar_search_${Date.now()}`;
  
  if (!isCalendarConnected()) {
    return {
      toolCallId,
      name: 'calendar_search',
      success: false,
      error: 'Calendar is not connected. Please connect your Google Calendar in Settings → Integrations.',
    };
  }
  
  if (!query) {
    return {
      toolCallId,
      name: 'calendar_search',
      success: false,
      error: 'Search query is required',
    };
  }
  
  try {
    const clampedMax = Math.min(Math.max(1, maxResults), 50);
    const events = await searchEvents(query, clampedMax);
    
    return {
      toolCallId,
      name: 'calendar_search',
      success: true,
      result: {
        query,
        events: events.map(formatEventSummary),
        count: events.length,
      },
      displayType: 'calendar',
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'calendar_search',
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
}

// ==================== Formatting Helpers ====================

interface EventSummary {
  id: string;
  summary: string;
  start: string;
  end: string;
  isAllDay: boolean;
  location?: string;
  meetingLink?: string;
  status: string;
}

interface EventFull extends EventSummary {
  description?: string;
  attendees?: Array<{
    email: string;
    name?: string;
    responseStatus?: string;
  }>;
  isRecurring: boolean;
  htmlLink: string;
}

function formatEventSummary(event: SimpleEvent): EventSummary {
  return {
    id: event.id,
    summary: event.summary,
    start: formatDateTime(event.start, event.isAllDay),
    end: formatDateTime(event.end, event.isAllDay),
    isAllDay: event.isAllDay,
    location: event.location,
    meetingLink: event.meetingLink,
    status: event.status,
  };
}

function formatEventFull(event: SimpleEvent): EventFull {
  return {
    ...formatEventSummary(event),
    description: event.description,
    attendees: event.attendees?.filter(a => !a.self),
    isRecurring: event.isRecurring,
    htmlLink: event.htmlLink,
  };
}

function formatDateTime(date: Date, isAllDay: boolean): string {
  if (isAllDay) {
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
  
  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFreeSlot(slot: FreeTimeSlot): {
  start: string;
  end: string;
  duration: string;
} {
  const formatTime = (d: Date) => d.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  
  const hours = Math.floor(slot.durationMinutes / 60);
  const minutes = slot.durationMinutes % 60;
  let duration: string;
  if (hours > 0 && minutes > 0) {
    duration = `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    duration = `${hours}h`;
  } else {
    duration = `${minutes}m`;
  }
  
  return {
    start: formatTime(slot.start),
    end: formatTime(slot.end),
    duration,
  };
}

/**
 * Format event list for chat display
 */
export function formatEventListForChat(events: EventSummary[], period: string): string {
  if (events.length === 0) {
    return `📅 No events found for ${period}.`;
  }
  
  let output = `📅 **${events.length} event${events.length === 1 ? '' : 's'} ${period}:**\n\n`;
  
  for (const event of events) {
    const statusIcon = event.status === 'tentative' ? '❓' : '✅';
    
    output += `${statusIcon} **${event.summary}**\n`;
    output += `   📆 ${event.start}`;
    if (!event.isAllDay) {
      output += ` → ${event.end}`;
    }
    output += '\n';
    
    if (event.location) {
      output += `   📍 ${event.location}\n`;
    }
    if (event.meetingLink) {
      output += `   🔗 [Join meeting](${event.meetingLink})\n`;
    }
    output += `   _ID: ${event.id}_\n\n`;
  }
  
  return output;
}

/**
 * Format single event for chat display
 */
export function formatEventForChat(event: EventFull): string {
  let output = `📅 **${event.summary}**\n\n`;
  
  if (event.isAllDay) {
    output += `**When:** ${event.start} (All day)\n`;
  } else {
    output += `**When:** ${event.start} → ${event.end}\n`;
  }
  
  if (event.location) {
    output += `**Location:** ${event.location}\n`;
  }
  
  if (event.meetingLink) {
    output += `**Meeting:** [Join video call](${event.meetingLink})\n`;
  }
  
  if (event.attendees?.length) {
    output += `**Attendees:** ${event.attendees.map(a => a.name || a.email).join(', ')}\n`;
  }
  
  if (event.isRecurring) {
    output += `**Recurring:** Yes\n`;
  }
  
  if (event.description) {
    output += `\n---\n\n${event.description}\n`;
  }
  
  output += `\n[Open in Calendar](${event.htmlLink})\n`;
  
  return output;
}
