// Gmail Integration Types

export interface GmailTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expiry_date: number; // timestamp when token expires
  scope: string;
}

export interface GmailCredentials {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

export interface GmailUserInfo {
  email: string;
  name?: string;
  picture?: string;
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  partId?: string;
  mimeType: string;
  filename?: string;
  headers: GmailHeader[];
  body: {
    attachmentId?: string;
    size: number;
    data?: string; // Base64 encoded
  };
  parts?: GmailMessagePart[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string; // timestamp in ms as string
  payload: GmailMessagePart;
  sizeEstimate: number;
  raw?: string; // Only if format=raw
}

export interface GmailMessageMetadata {
  id: string;
  threadId: string;
}

export interface GmailListResponse {
  messages?: GmailMessageMetadata[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface GmailThread {
  id: string;
  historyId: string;
  messages: GmailMessage[];
}

export interface GmailLabel {
  id: string;
  name: string;
  type: 'system' | 'user';
  messageListVisibility?: 'show' | 'hide';
  labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide';
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
}

// Simplified types for our app
export interface Email {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  date: Date;
  isUnread: boolean;
  isStarred: boolean;
  labels: string[];
  snippet: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface EmailDraft {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  threadId?: string; // For replies
  inReplyTo?: string; // Message-ID header for threading
  references?: string; // References header for threading
}

export interface EmailListOptions {
  maxResults?: number;
  pageToken?: string;
  query?: string; // Gmail search query
  labelIds?: string[];
  includeSpamTrash?: boolean;
}

// OAuth state stored in localStorage
export interface GmailOAuthState {
  tokens?: GmailTokens;
  userInfo?: GmailUserInfo;
  credentials?: GmailCredentials;
  lastRefreshed?: number;
}

// Standard Gmail labels
export const GMAIL_LABELS = {
  INBOX: 'INBOX',
  STARRED: 'STARRED',
  SENT: 'SENT',
  DRAFTS: 'DRAFT',
  SPAM: 'SPAM',
  TRASH: 'TRASH',
  UNREAD: 'UNREAD',
  IMPORTANT: 'IMPORTANT',
} as const;

// Gmail API scopes
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];
