// Gmail API Client
// Wraps the Gmail REST API with typed methods

import {
  GmailMessage,
  GmailListResponse,
  GmailThread,
  GmailLabel,
  GmailHeader,
  GmailMessagePart,
  Email,
  EmailDraft,
  EmailListOptions,
  EmailAttachment,
  GMAIL_LABELS,
} from './types';
import { getValidAccessToken, loadGmailAuth } from './auth';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

// Make authenticated request to Gmail API
async function gmailRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const state = loadGmailAuth();
  if (!state) {
    throw new Error('Gmail not connected');
  }
  
  const { token } = await getValidAccessToken(state);
  
  const response = await fetch(`${GMAIL_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.error?.message || `Gmail API error: ${response.status}`;
    throw new Error(message);
  }
  
  return response.json();
}

// Parse email address from "Name <email>" format
function parseEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return match ? match[1] : raw.trim();
}

// Parse full address list
function parseAddressList(raw?: string): string[] {
  if (!raw) return [];
  return raw.split(',').map(addr => parseEmailAddress(addr.trim()));
}

// Get header value from message
function getHeader(headers: GmailHeader[], name: string): string | undefined {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header?.value;
}

// Decode base64url encoded string
function decodeBase64Url(data: string): string {
  // Replace URL-safe characters
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  
  try {
    return atob(base64);
  } catch {
    // Try with padding
    const padded = base64 + '==='.slice(0, (4 - base64.length % 4) % 4);
    return atob(padded);
  }
}

// Encode string to base64url
function encodeBase64Url(data: string): string {
  const base64 = btoa(unescape(encodeURIComponent(data)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Extract body from message parts (recursive)
function extractBody(part: GmailMessagePart): { text: string; html: string } {
  let text = '';
  let html = '';
  
  if (part.mimeType === 'text/plain' && part.body.data) {
    text = decodeBase64Url(part.body.data);
  } else if (part.mimeType === 'text/html' && part.body.data) {
    html = decodeBase64Url(part.body.data);
  }
  
  if (part.parts) {
    for (const subPart of part.parts) {
      const { text: subText, html: subHtml } = extractBody(subPart);
      if (subText) text = subText;
      if (subHtml) html = subHtml;
    }
  }
  
  return { text, html };
}

// Extract attachments from message parts
function extractAttachments(part: GmailMessagePart, messageId: string): EmailAttachment[] {
  const attachments: EmailAttachment[] = [];
  
  if (part.body.attachmentId && part.filename) {
    attachments.push({
      id: part.body.attachmentId,
      filename: part.filename,
      mimeType: part.mimeType,
      size: part.body.size,
    });
  }
  
  if (part.parts) {
    for (const subPart of part.parts) {
      attachments.push(...extractAttachments(subPart, messageId));
    }
  }
  
  return attachments;
}

// Convert Gmail message to our Email type
function parseGmailMessage(msg: GmailMessage): Email {
  const headers = msg.payload.headers;
  const { text, html } = extractBody(msg.payload);
  
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: getHeader(headers, 'From') || '',
    to: parseAddressList(getHeader(headers, 'To')),
    cc: parseAddressList(getHeader(headers, 'Cc')),
    bcc: parseAddressList(getHeader(headers, 'Bcc')),
    subject: getHeader(headers, 'Subject') || '(no subject)',
    body: text || html.replace(/<[^>]*>/g, '') || '', // Fallback to stripped HTML
    bodyHtml: html,
    date: new Date(parseInt(msg.internalDate)),
    isUnread: msg.labelIds.includes(GMAIL_LABELS.UNREAD),
    isStarred: msg.labelIds.includes(GMAIL_LABELS.STARRED),
    labels: msg.labelIds,
    snippet: msg.snippet,
    attachments: extractAttachments(msg.payload, msg.id),
  };
}

// Build RFC 2822 email message
function buildRawEmail(draft: EmailDraft): string {
  const to = Array.isArray(draft.to) ? draft.to.join(', ') : draft.to;
  const cc = draft.cc ? (Array.isArray(draft.cc) ? draft.cc.join(', ') : draft.cc) : '';
  const bcc = draft.bcc ? (Array.isArray(draft.bcc) ? draft.bcc.join(', ') : draft.bcc) : '';
  
  let message = '';
  message += `To: ${to}\r\n`;
  if (cc) message += `Cc: ${cc}\r\n`;
  if (bcc) message += `Bcc: ${bcc}\r\n`;
  message += `Subject: ${draft.subject}\r\n`;
  
  if (draft.inReplyTo) {
    message += `In-Reply-To: ${draft.inReplyTo}\r\n`;
  }
  if (draft.references) {
    message += `References: ${draft.references}\r\n`;
  }
  
  if (draft.isHtml) {
    message += 'Content-Type: text/html; charset=utf-8\r\n';
  } else {
    message += 'Content-Type: text/plain; charset=utf-8\r\n';
  }
  
  message += '\r\n';
  message += draft.body;
  
  return message;
}

// ==================== Public API ====================

/**
 * List messages from Gmail
 */
export async function listMessages(options: EmailListOptions = {}): Promise<{
  messages: Email[];
  nextPageToken?: string;
}> {
  const params = new URLSearchParams();
  params.append('maxResults', String(options.maxResults || 10));
  
  if (options.pageToken) {
    params.append('pageToken', options.pageToken);
  }
  if (options.query) {
    params.append('q', options.query);
  }
  if (options.labelIds?.length) {
    options.labelIds.forEach(id => params.append('labelIds', id));
  }
  if (options.includeSpamTrash) {
    params.append('includeSpamTrash', 'true');
  }
  
  const listResponse = await gmailRequest<GmailListResponse>(
    `/users/me/messages?${params.toString()}`
  );
  
  if (!listResponse.messages?.length) {
    return { messages: [] };
  }
  
  // Fetch full message details in parallel
  const messages = await Promise.all(
    listResponse.messages.map(async ({ id }) => {
      const msg = await gmailRequest<GmailMessage>(
        `/users/me/messages/${id}?format=full`
      );
      return parseGmailMessage(msg);
    })
  );
  
  return {
    messages,
    nextPageToken: listResponse.nextPageToken,
  };
}

/**
 * Get a single message by ID
 */
export async function getMessage(messageId: string): Promise<Email> {
  const msg = await gmailRequest<GmailMessage>(
    `/users/me/messages/${messageId}?format=full`
  );
  return parseGmailMessage(msg);
}

/**
 * Get a thread with all messages
 */
export async function getThread(threadId: string): Promise<Email[]> {
  const thread = await gmailRequest<GmailThread>(
    `/users/me/threads/${threadId}?format=full`
  );
  return thread.messages.map(parseGmailMessage);
}

/**
 * Search emails using Gmail query syntax
 */
export async function searchEmails(
  query: string,
  maxResults: number = 10
): Promise<Email[]> {
  const { messages } = await listMessages({ query, maxResults });
  return messages;
}

/**
 * Send an email
 */
export async function sendEmail(draft: EmailDraft): Promise<Email> {
  const rawMessage = buildRawEmail(draft);
  const encoded = encodeBase64Url(rawMessage);
  
  const body: { raw: string; threadId?: string } = { raw: encoded };
  if (draft.threadId) {
    body.threadId = draft.threadId;
  }
  
  const response = await gmailRequest<GmailMessage>('/users/me/messages/send', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  
  return parseGmailMessage(response);
}

/**
 * Reply to an email thread
 */
export async function replyToEmail(
  originalEmail: Email,
  body: string,
  isHtml: boolean = false
): Promise<Email> {
  // Get the Message-ID for threading
  const msg = await gmailRequest<GmailMessage>(
    `/users/me/messages/${originalEmail.id}?format=metadata&metadataHeaders=Message-ID&metadataHeaders=References`
  );
  
  const messageId = getHeader(msg.payload.headers, 'Message-ID');
  const references = getHeader(msg.payload.headers, 'References');
  
  // Build reply
  const replyTo = parseEmailAddress(originalEmail.from);
  const subject = originalEmail.subject.startsWith('Re:') 
    ? originalEmail.subject 
    : `Re: ${originalEmail.subject}`;
  
  return sendEmail({
    to: replyTo,
    subject,
    body,
    isHtml,
    threadId: originalEmail.threadId,
    inReplyTo: messageId,
    references: references ? `${references} ${messageId}` : messageId,
  });
}

/**
 * Mark message as read
 */
export async function markAsRead(messageId: string): Promise<void> {
  await gmailRequest(`/users/me/messages/${messageId}/modify`, {
    method: 'POST',
    body: JSON.stringify({
      removeLabelIds: [GMAIL_LABELS.UNREAD],
    }),
  });
}

/**
 * Mark message as unread
 */
export async function markAsUnread(messageId: string): Promise<void> {
  await gmailRequest(`/users/me/messages/${messageId}/modify`, {
    method: 'POST',
    body: JSON.stringify({
      addLabelIds: [GMAIL_LABELS.UNREAD],
    }),
  });
}

/**
 * Star a message
 */
export async function starMessage(messageId: string): Promise<void> {
  await gmailRequest(`/users/me/messages/${messageId}/modify`, {
    method: 'POST',
    body: JSON.stringify({
      addLabelIds: [GMAIL_LABELS.STARRED],
    }),
  });
}

/**
 * Unstar a message
 */
export async function unstarMessage(messageId: string): Promise<void> {
  await gmailRequest(`/users/me/messages/${messageId}/modify`, {
    method: 'POST',
    body: JSON.stringify({
      removeLabelIds: [GMAIL_LABELS.STARRED],
    }),
  });
}

/**
 * Move message to trash
 */
export async function trashMessage(messageId: string): Promise<void> {
  await gmailRequest(`/users/me/messages/${messageId}/trash`, {
    method: 'POST',
  });
}

/**
 * Permanently delete a message
 */
export async function deleteMessage(messageId: string): Promise<void> {
  await gmailRequest(`/users/me/messages/${messageId}`, {
    method: 'DELETE',
  });
}

/**
 * Get list of labels
 */
export async function listLabels(): Promise<GmailLabel[]> {
  const response = await gmailRequest<{ labels: GmailLabel[] }>(
    '/users/me/labels'
  );
  return response.labels;
}

/**
 * Get inbox unread count
 */
export async function getUnreadCount(): Promise<number> {
  const response = await gmailRequest<GmailLabel>(
    `/users/me/labels/${GMAIL_LABELS.INBOX}`
  );
  return response.messagesUnread || 0;
}

/**
 * Batch get multiple messages (more efficient)
 */
export async function batchGetMessages(messageIds: string[]): Promise<Email[]> {
  // Gmail API supports batch requests but for simplicity we'll use parallel fetches
  const messages = await Promise.all(
    messageIds.map(id => getMessage(id))
  );
  return messages;
}
