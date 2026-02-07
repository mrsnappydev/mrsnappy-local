// Gmail Tools for MrSnappy Local
// Provides LLM-accessible tools for email operations

import { ToolDefinition, ToolResult } from './types';
import { 
  listMessages, 
  getMessage, 
  sendEmail, 
  replyToEmail, 
  searchEmails,
  getUnreadCount,
  Email,
  GMAIL_LABELS,
  isGmailConnected,
} from '@/lib/integrations/gmail';

// ==================== Tool Definitions ====================

export const gmailListInboxTool: ToolDefinition = {
  name: 'gmail_list_inbox',
  displayName: 'List Inbox',
  description: 'List recent emails from your Gmail inbox. Can filter by unread status. Returns subject, sender, date, and a preview snippet for each email.',
  icon: '📥',
  integration: 'email',
  parameters: [
    {
      name: 'maxResults',
      type: 'number',
      description: 'Maximum number of emails to return (default: 10, max: 20)',
      required: false,
      default: 10,
    },
    {
      name: 'unreadOnly',
      type: 'boolean',
      description: 'Only show unread emails',
      required: false,
      default: false,
    },
  ],
};

export const gmailReadEmailTool: ToolDefinition = {
  name: 'gmail_read_email',
  displayName: 'Read Email',
  description: 'Read the full content of a specific email by its ID. Use this after listing emails to get the complete message body.',
  icon: '📧',
  integration: 'email',
  parameters: [
    {
      name: 'emailId',
      type: 'string',
      description: 'The ID of the email to read (from gmail_list_inbox or gmail_search)',
      required: true,
    },
  ],
};

export const gmailSendEmailTool: ToolDefinition = {
  name: 'gmail_send_email',
  displayName: 'Send Email',
  description: 'Send a new email. Requires recipient email address, subject, and body text.',
  icon: '📤',
  integration: 'email',
  parameters: [
    {
      name: 'to',
      type: 'string',
      description: 'Recipient email address (comma-separated for multiple recipients)',
      required: true,
    },
    {
      name: 'subject',
      type: 'string',
      description: 'Email subject line',
      required: true,
    },
    {
      name: 'body',
      type: 'string',
      description: 'Email body content (plain text)',
      required: true,
    },
    {
      name: 'cc',
      type: 'string',
      description: 'CC recipients (comma-separated)',
      required: false,
    },
  ],
};

export const gmailSearchTool: ToolDefinition = {
  name: 'gmail_search',
  displayName: 'Search Emails',
  description: 'Search emails using Gmail query syntax. Examples: "from:someone@example.com", "subject:meeting", "is:unread", "has:attachment", "after:2024/01/01"',
  icon: '🔍',
  integration: 'email',
  parameters: [
    {
      name: 'query',
      type: 'string',
      description: 'Gmail search query (e.g., "from:boss@company.com subject:urgent")',
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

export const gmailReplyTool: ToolDefinition = {
  name: 'gmail_reply',
  displayName: 'Reply to Email',
  description: 'Reply to an existing email thread. Keeps the conversation threaded properly.',
  icon: '↩️',
  integration: 'email',
  parameters: [
    {
      name: 'emailId',
      type: 'string',
      description: 'The ID of the email to reply to',
      required: true,
    },
    {
      name: 'body',
      type: 'string',
      description: 'Reply message content (plain text)',
      required: true,
    },
  ],
};

// All Gmail tools
export const gmailTools: ToolDefinition[] = [
  gmailListInboxTool,
  gmailReadEmailTool,
  gmailSendEmailTool,
  gmailSearchTool,
  gmailReplyTool,
];

// ==================== Tool Executors ====================

/**
 * Execute gmail_list_inbox tool
 */
export async function executeGmailListInbox(
  maxResults: number = 10,
  unreadOnly: boolean = false
): Promise<ToolResult> {
  const toolCallId = `gmail_list_${Date.now()}`;
  
  if (!isGmailConnected()) {
    return {
      toolCallId,
      name: 'gmail_list_inbox',
      success: false,
      error: 'Gmail is not connected. Please connect your Gmail account in Settings → Integrations.',
    };
  }
  
  try {
    const clampedMax = Math.min(Math.max(1, maxResults), 20);
    
    const { messages } = await listMessages({
      maxResults: clampedMax,
      labelIds: [GMAIL_LABELS.INBOX],
      query: unreadOnly ? 'is:unread' : undefined,
    });
    
    const unreadCount = await getUnreadCount();
    
    const result = {
      emails: messages.map(formatEmailSummary),
      totalUnread: unreadCount,
      count: messages.length,
    };
    
    return {
      toolCallId,
      name: 'gmail_list_inbox',
      success: true,
      result,
      displayType: 'email',
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'gmail_list_inbox',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list emails',
    };
  }
}

/**
 * Execute gmail_read_email tool
 */
export async function executeGmailReadEmail(emailId: string): Promise<ToolResult> {
  const toolCallId = `gmail_read_${Date.now()}`;
  
  if (!isGmailConnected()) {
    return {
      toolCallId,
      name: 'gmail_read_email',
      success: false,
      error: 'Gmail is not connected. Please connect your Gmail account in Settings → Integrations.',
    };
  }
  
  if (!emailId) {
    return {
      toolCallId,
      name: 'gmail_read_email',
      success: false,
      error: 'Email ID is required',
    };
  }
  
  try {
    const email = await getMessage(emailId);
    
    return {
      toolCallId,
      name: 'gmail_read_email',
      success: true,
      result: formatEmailFull(email),
      displayType: 'email',
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'gmail_read_email',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read email',
    };
  }
}

/**
 * Execute gmail_send_email tool
 */
export async function executeGmailSendEmail(
  to: string,
  subject: string,
  body: string,
  cc?: string
): Promise<ToolResult> {
  const toolCallId = `gmail_send_${Date.now()}`;
  
  if (!isGmailConnected()) {
    return {
      toolCallId,
      name: 'gmail_send_email',
      success: false,
      error: 'Gmail is not connected. Please connect your Gmail account in Settings → Integrations.',
    };
  }
  
  if (!to || !subject || !body) {
    return {
      toolCallId,
      name: 'gmail_send_email',
      success: false,
      error: 'To, subject, and body are all required',
    };
  }
  
  try {
    const sent = await sendEmail({
      to: to.split(',').map(e => e.trim()),
      cc: cc ? cc.split(',').map(e => e.trim()) : undefined,
      subject,
      body,
    });
    
    return {
      toolCallId,
      name: 'gmail_send_email',
      success: true,
      result: {
        message: 'Email sent successfully',
        emailId: sent.id,
        to,
        subject,
      },
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'gmail_send_email',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Execute gmail_search tool
 */
export async function executeGmailSearch(
  query: string,
  maxResults: number = 10
): Promise<ToolResult> {
  const toolCallId = `gmail_search_${Date.now()}`;
  
  if (!isGmailConnected()) {
    return {
      toolCallId,
      name: 'gmail_search',
      success: false,
      error: 'Gmail is not connected. Please connect your Gmail account in Settings → Integrations.',
    };
  }
  
  if (!query) {
    return {
      toolCallId,
      name: 'gmail_search',
      success: false,
      error: 'Search query is required',
    };
  }
  
  try {
    const clampedMax = Math.min(Math.max(1, maxResults), 20);
    const emails = await searchEmails(query, clampedMax);
    
    return {
      toolCallId,
      name: 'gmail_search',
      success: true,
      result: {
        query,
        emails: emails.map(formatEmailSummary),
        count: emails.length,
      },
      displayType: 'email',
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'gmail_search',
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
}

/**
 * Execute gmail_reply tool
 */
export async function executeGmailReply(
  emailId: string,
  body: string
): Promise<ToolResult> {
  const toolCallId = `gmail_reply_${Date.now()}`;
  
  if (!isGmailConnected()) {
    return {
      toolCallId,
      name: 'gmail_reply',
      success: false,
      error: 'Gmail is not connected. Please connect your Gmail account in Settings → Integrations.',
    };
  }
  
  if (!emailId || !body) {
    return {
      toolCallId,
      name: 'gmail_reply',
      success: false,
      error: 'Email ID and reply body are required',
    };
  }
  
  try {
    // Get original email first
    const original = await getMessage(emailId);
    
    // Send reply
    const reply = await replyToEmail(original, body);
    
    return {
      toolCallId,
      name: 'gmail_reply',
      success: true,
      result: {
        message: 'Reply sent successfully',
        emailId: reply.id,
        inReplyTo: original.subject,
        to: original.from,
      },
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'gmail_reply',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send reply',
    };
  }
}

// ==================== Formatting Helpers ====================

interface EmailSummary {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  isUnread: boolean;
  isStarred: boolean;
}

interface EmailFull extends EmailSummary {
  to: string[];
  cc?: string[];
  body: string;
  threadId: string;
  hasAttachments: boolean;
  attachmentCount: number;
}

function formatEmailSummary(email: Email): EmailSummary {
  return {
    id: email.id,
    from: email.from,
    subject: email.subject,
    date: formatDate(email.date),
    snippet: email.snippet,
    isUnread: email.isUnread,
    isStarred: email.isStarred,
  };
}

function formatEmailFull(email: Email): EmailFull {
  return {
    ...formatEmailSummary(email),
    to: email.to,
    cc: email.cc,
    body: email.body,
    threadId: email.threadId,
    hasAttachments: (email.attachments?.length || 0) > 0,
    attachmentCount: email.attachments?.length || 0,
  };
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

/**
 * Format email list for chat display
 */
export function formatEmailListForChat(emails: EmailSummary[]): string {
  if (emails.length === 0) {
    return '📭 No emails found.';
  }
  
  let output = `📬 **Found ${emails.length} email${emails.length === 1 ? '' : 's'}:**\n\n`;
  
  for (const email of emails) {
    const unreadBadge = email.isUnread ? '🔵 ' : '';
    const starBadge = email.isStarred ? '⭐ ' : '';
    
    output += `${unreadBadge}${starBadge}**${email.subject}**\n`;
    output += `From: ${email.from}\n`;
    output += `Date: ${email.date}\n`;
    output += `> ${email.snippet}\n`;
    output += `_ID: ${email.id}_\n\n`;
  }
  
  return output;
}

/**
 * Format single email for chat display
 */
export function formatEmailForChat(email: EmailFull): string {
  let output = `📧 **${email.subject}**\n\n`;
  output += `**From:** ${email.from}\n`;
  output += `**To:** ${email.to.join(', ')}\n`;
  if (email.cc?.length) {
    output += `**CC:** ${email.cc.join(', ')}\n`;
  }
  output += `**Date:** ${email.date}\n`;
  if (email.hasAttachments) {
    output += `**Attachments:** ${email.attachmentCount} file${email.attachmentCount === 1 ? '' : 's'}\n`;
  }
  output += `\n---\n\n${email.body}\n`;
  
  return output;
}
