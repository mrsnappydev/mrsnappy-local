'use client';

import React, { useState } from 'react';
import { Pencil, RefreshCw, Trash2, Check, X, Copy } from 'lucide-react';

interface MessageActionsProps {
  messageId: string;
  content: string;
  role: 'user' | 'assistant';
  isStreaming?: boolean;
  onEdit: (messageId: string, newContent: string) => void;
  onRegenerate: (messageId: string) => void;
  onDelete: (messageId: string) => void;
}

export default function MessageActions({
  messageId,
  content,
  role,
  isStreaming,
  onEdit,
  onRegenerate,
  onDelete,
}: MessageActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [copied, setCopied] = useState(false);

  const handleSaveEdit = () => {
    if (editContent.trim()) {
      onEdit(messageId, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Don't show actions while streaming
  if (isStreaming) return null;

  if (isEditing) {
    return (
      <div className="mt-2 w-full">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 
                     focus:outline-none focus:border-amber-500 resize-none min-h-[100px]"
          autoFocus
        />
        <div className="flex gap-2 mt-2 justify-end">
          <button
            onClick={handleCancelEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 
                       hover:text-zinc-200 bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
          <button
            onClick={handleSaveEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-900 
                       bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Copy */}
      <button
        onClick={handleCopy}
        className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
        title="Copy message"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-400" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Edit (only for user messages) */}
      {role === 'user' && (
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
          title="Edit message"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Regenerate (only for assistant messages) */}
      {role === 'assistant' && (
        <button
          onClick={() => onRegenerate(messageId)}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
          title="Regenerate response"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Delete */}
      <button
        onClick={() => onDelete(messageId)}
        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
        title="Delete message and all after"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
