// Google Calendar Integration Types

export interface CalendarTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expiry_date: number; // timestamp when token expires
  scope: string;
}

export interface CalendarCredentials {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

export interface CalendarUserInfo {
  email: string;
  name?: string;
  picture?: string;
}

// Google Calendar API types
export interface CalendarEvent {
  id: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  description?: string;
  location?: string;
  colorId?: string;
  creator: {
    id?: string;
    email?: string;
    displayName?: string;
    self?: boolean;
  };
  organizer: {
    id?: string;
    email?: string;
    displayName?: string;
    self?: boolean;
  };
  start: EventDateTime;
  end: EventDateTime;
  endTimeUnspecified?: boolean;
  recurrence?: string[];
  recurringEventId?: string;
  originalStartTime?: EventDateTime;
  transparency?: 'opaque' | 'transparent';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  iCalUID: string;
  sequence: number;
  attendees?: EventAttendee[];
  attendeesOmitted?: boolean;
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
  hangoutLink?: string;
  conferenceData?: ConferenceData;
  gadget?: {
    type: string;
    title: string;
    link: string;
    iconLink: string;
    width?: number;
    height?: number;
    display?: string;
    preferences?: Record<string, string>;
  };
  anyoneCanAddSelf?: boolean;
  guestsCanInviteOthers?: boolean;
  guestsCanModify?: boolean;
  guestsCanSeeOtherGuests?: boolean;
  privateCopy?: boolean;
  locked?: boolean;
  reminders?: {
    useDefault: boolean;
    overrides?: EventReminder[];
  };
  source?: {
    url: string;
    title: string;
  };
  attachments?: EventAttachment[];
  eventType?: 'default' | 'outOfOffice' | 'focusTime' | 'workingLocation';
}

export interface EventDateTime {
  date?: string; // For all-day events (YYYY-MM-DD)
  dateTime?: string; // For timed events (RFC3339)
  timeZone?: string;
}

export interface EventAttendee {
  id?: string;
  email?: string;
  displayName?: string;
  organizer?: boolean;
  self?: boolean;
  resource?: boolean;
  optional?: boolean;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  comment?: string;
  additionalGuests?: number;
}

export interface EventReminder {
  method: 'email' | 'popup';
  minutes: number;
}

export interface EventAttachment {
  fileUrl: string;
  title: string;
  mimeType: string;
  iconLink: string;
  fileId: string;
}

export interface ConferenceData {
  createRequest?: {
    requestId: string;
    conferenceSolutionKey: {
      type: string;
    };
    status: {
      statusCode: string;
    };
  };
  entryPoints?: Array<{
    entryPointType: 'video' | 'phone' | 'sip' | 'more';
    uri: string;
    label?: string;
    pin?: string;
    accessCode?: string;
    meetingCode?: string;
    passcode?: string;
    password?: string;
  }>;
  conferenceSolution?: {
    key: {
      type: string;
    };
    name: string;
    iconUri: string;
  };
  conferenceId?: string;
  signature?: string;
  notes?: string;
}

export interface CalendarListEntry {
  kind: 'calendar#calendarListEntry';
  etag: string;
  id: string;
  summary: string;
  description?: string;
  location?: string;
  timeZone: string;
  summaryOverride?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  hidden?: boolean;
  selected?: boolean;
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  defaultReminders?: EventReminder[];
  notificationSettings?: {
    notifications: Array<{
      type: string;
      method: string;
    }>;
  };
  primary?: boolean;
  deleted?: boolean;
  conferenceProperties?: {
    allowedConferenceSolutionTypes: string[];
  };
}

export interface EventListResponse {
  kind: 'calendar#events';
  etag: string;
  summary: string;
  description?: string;
  updated: string;
  timeZone: string;
  accessRole: string;
  defaultReminders: EventReminder[];
  nextPageToken?: string;
  nextSyncToken?: string;
  items: CalendarEvent[];
}

export interface FreeBusyResponse {
  kind: 'calendar#freeBusy';
  timeMin: string;
  timeMax: string;
  groups?: Record<string, { errors?: Array<{ domain: string; reason: string }>; calendars: string[] }>;
  calendars: Record<string, {
    errors?: Array<{ domain: string; reason: string }>;
    busy: Array<{ start: string; end: string }>;
  }>;
}

// Simplified types for our app
export interface SimpleEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  status: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink: string;
  attendees?: Array<{
    email: string;
    name?: string;
    responseStatus?: string;
    self?: boolean;
  }>;
  meetingLink?: string;
  isRecurring: boolean;
  colorId?: string;
}

export interface EventDraft {
  summary: string;
  description?: string;
  location?: string;
  start: Date | string;
  end: Date | string;
  isAllDay?: boolean;
  attendees?: string[]; // email addresses
  reminders?: {
    useDefault?: boolean;
    overrides?: EventReminder[];
  };
  recurrence?: string[]; // RRULE strings
  colorId?: string;
  conferenceDataVersion?: number; // Set to 1 to create Google Meet
}

export interface EventUpdateDraft {
  summary?: string;
  description?: string;
  location?: string;
  start?: Date | string;
  end?: Date | string;
  isAllDay?: boolean;
  attendees?: string[];
  colorId?: string;
}

export interface EventListOptions {
  calendarId?: string;
  maxResults?: number;
  pageToken?: string;
  timeMin?: Date;
  timeMax?: Date;
  q?: string; // Search query
  singleEvents?: boolean; // Expand recurring events
  orderBy?: 'startTime' | 'updated';
  showDeleted?: boolean;
}

export interface FreeTimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

// OAuth state stored in localStorage
export interface CalendarOAuthState {
  tokens?: CalendarTokens;
  userInfo?: CalendarUserInfo;
  credentials?: CalendarCredentials;
  lastRefreshed?: number;
  defaultCalendarId?: string; // Usually 'primary' or user's email
}

// Calendar API scopes
export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];
