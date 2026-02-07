'use client';

import { useState } from 'react';
import { 
  Mail, 
  Reply, 
  Star, 
  ChevronDown, 
  ChevronUp,
  Paperclip,
  User,
  Clock,
  ExternalLink,
} from 'lucide-react';

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

interface EmailCardProps {
  email: EmailSummary | EmailFull;
  compact?: boolean;
  onReply?: (emailId: string) => void;
  onRead?: (emailId: string) => void;
}

function isFullEmail(email: EmailSummary | EmailFull): email is EmailFull {
  return 'body' in email;
}

function parseEmailName(from: string): { name: string; email: string } {
  // Parse "Name <email@example.com>" format
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2] };
  }
  return { name: from, email: from };
}

export default function EmailCard({ email, compact = false, onReply, onRead }: EmailCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { name: senderName, email: senderEmail } = parseEmailName(email.from);
  const isFull = isFullEmail(email);

  const handleExpand = () => {
    if (!isFull && onRead) {
      onRead(email.id);
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div 
      className={`
        rounded-xl border transition-all
        ${email.isUnread 
          ? 'border-blue-500/30 bg-blue-500/5' 
          : 'border-zinc-800 bg-zinc-800/30'
        }
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`
          flex-shrink-0 rounded-full flex items-center justify-center
          ${compact ? 'w-8 h-8' : 'w-10 h-10'}
          ${email.isUnread ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-700 text-zinc-400'}
        `}>
          {senderName.charAt(0).toUpperCase()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Sender & Date */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`font-medium truncate ${email.isUnread ? 'text-zinc-100' : 'text-zinc-300'}`}>
                {senderName}
              </span>
              {email.isStarred && (
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
              )}
            </div>
            <span className="text-xs text-zinc-500 flex-shrink-0 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {email.date}
            </span>
          </div>

          {/* Subject */}
          <h4 className={`
            ${compact ? 'text-sm' : 'text-base'}
            ${email.isUnread ? 'font-semibold text-zinc-100' : 'text-zinc-300'}
            truncate mb-1
          `}>
            {email.isUnread && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2" />}
            {email.subject}
          </h4>

          {/* Snippet / Body */}
          {!isExpanded ? (
            <p className="text-sm text-zinc-500 line-clamp-2">
              {email.snippet}
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {/* Full headers */}
              {isFull && (
                <div className="text-xs text-zinc-500 space-y-1 p-3 bg-zinc-900/50 rounded-lg">
                  <div className="flex gap-2">
                    <span className="text-zinc-400">From:</span>
                    <span>{email.from}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-zinc-400">To:</span>
                    <span>{email.to.join(', ')}</span>
                  </div>
                  {email.cc && email.cc.length > 0 && (
                    <div className="flex gap-2">
                      <span className="text-zinc-400">CC:</span>
                      <span>{email.cc.join(', ')}</span>
                    </div>
                  )}
                  {email.hasAttachments && (
                    <div className="flex items-center gap-2 text-amber-400">
                      <Paperclip className="w-3 h-3" />
                      <span>{email.attachmentCount} attachment{email.attachmentCount !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="text-sm text-zinc-300 whitespace-pre-wrap bg-zinc-900/30 p-3 rounded-lg max-h-64 overflow-y-auto">
                {isFull ? email.body : email.snippet}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/50">
        <div className="flex items-center gap-2">
          {onReply && (
            <button
              onClick={() => onReply(email.id)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-purple-400 hover:bg-purple-500/10 rounded transition-colors"
            >
              <Reply className="w-3 h-3" />
              Reply
            </button>
          )}
        </div>
        
        <button
          onClick={handleExpand}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              {isFull ? 'Expand' : 'Read more'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Component for displaying a list of emails
interface EmailListProps {
  emails: EmailSummary[];
  title?: string;
  totalUnread?: number;
  onReply?: (emailId: string) => void;
  onRead?: (emailId: string) => void;
}

export function EmailList({ emails, title, totalUnread, onReply, onRead }: EmailListProps) {
  if (emails.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No emails found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-400" />
            {title}
          </h3>
          {totalUnread !== undefined && totalUnread > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
              {totalUnread} unread
            </span>
          )}
        </div>
      )}
      
      {emails.map((email) => (
        <EmailCard 
          key={email.id} 
          email={email} 
          compact 
          onReply={onReply}
          onRead={onRead}
        />
      ))}
    </div>
  );
}

// Export for tool result rendering
export function renderEmailToolResult(result: {
  emails?: EmailSummary[];
  email?: EmailFull;
  totalUnread?: number;
  count?: number;
  query?: string;
  message?: string;
}): React.ReactNode {
  // Single email (from gmail_read_email)
  if (result.email) {
    return <EmailCard email={result.email} />;
  }
  
  // Email list (from gmail_list_inbox or gmail_search)
  if (result.emails) {
    const title = result.query 
      ? `Search: "${result.query}"` 
      : `Inbox`;
    
    return (
      <EmailList 
        emails={result.emails}
        title={title}
        totalUnread={result.totalUnread}
      />
    );
  }
  
  // Simple message (from gmail_send_email or gmail_reply)
  if (result.message) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
        <Mail className="w-5 h-5" />
        <span>{result.message}</span>
      </div>
    );
  }
  
  return null;
}
