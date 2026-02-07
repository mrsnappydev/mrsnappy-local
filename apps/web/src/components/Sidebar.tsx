'use client';

import React, { useState, useRef } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  Clock,
  Search,
  X,
  Download,
  Upload,
  User,
  Bot,
  FileJson
} from 'lucide-react';
import { ConversationPreview, SearchResult } from '@/types/chat';

interface SidebarProps {
  conversations: ConversationPreview[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onSearch: (query: string) => SearchResult[];
  onExport: () => string;
  onImport: (json: string) => { success: boolean; message: string; count: number };
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric' 
  });
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  
  if (index === -1) return text;
  
  return (
    <>
      {text.substring(0, index)}
      <mark className="bg-amber-500/30 text-amber-300 px-0.5 rounded">
        {text.substring(index, index + query.length)}
      </mark>
      {text.substring(index + query.length)}
    </>
  );
}

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onSearch,
  onExport,
  onImport,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Import state
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      const results = onSearch(query);
      setSearchResults(results);
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const handleSearchResultClick = (result: SearchResult) => {
    onSelectConversation(result.conversationId);
    clearSearch();
  };

  const handleExport = () => {
    const json = onExport();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mrsnappy-conversations-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = onImport(text);
      
      if (result.success) {
        setImportMessage({ type: 'success', text: result.message });
      } else {
        setImportMessage({ type: 'error', text: result.message });
      }
      
      // Clear message after 3 seconds
      setTimeout(() => setImportMessage(null), 3000);
    } catch (error) {
      setImportMessage({ type: 'error', text: 'Failed to read file' });
      setTimeout(() => setImportMessage(null), 3000);
    }
    
    // Reset file input
    e.target.value = '';
  };

  if (!isOpen) {
    return (
      <div className="w-12 border-r border-zinc-800 flex flex-col items-center py-4 gap-4 bg-zinc-900/50">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          title="Open sidebar"
        >
          <ChevronRight className="w-5 h-5 text-zinc-400" />
        </button>
        <button
          onClick={onNewConversation}
          className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          title="New chat"
        >
          <Plus className="w-5 h-5 text-zinc-400" />
        </button>
        <div className="flex-1" />
        <div className="text-xs text-zinc-600 writing-mode-vertical rotate-180" style={{ writingMode: 'vertical-rl' }}>
          {conversations.length} chats
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="font-semibold text-sm text-zinc-300">Conversations</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewConversation}
            className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            title="New chat"
          >
            <Plus className="w-4 h-4 text-zinc-400" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Search Box */}
      <div className="px-3 py-2 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search messages..."
            className="w-full pl-8 pr-8 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-amber-500/50 placeholder:text-zinc-600"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-zinc-700 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results or Conversation List */}
      <div className="flex-1 overflow-y-auto py-2">
        {isSearching ? (
          // Search Results View
          <div className="px-2">
            <div className="px-2 py-1 text-xs text-zinc-500 mb-2">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
            </div>
            {searchResults.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Search className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-600">No messages found</p>
                <p className="text-xs text-zinc-700 mt-1">Try different keywords</p>
              </div>
            ) : (
              <div className="space-y-1">
                {searchResults.slice(0, 20).map((result, idx) => (
                  <button
                    key={`${result.conversationId}-${result.messageId}-${idx}`}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      {result.role === 'user' ? (
                        <User className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                      ) : (
                        <Bot className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-500 truncate mb-0.5">
                          {result.conversationTitle}
                        </p>
                        <p className="text-sm text-zinc-300 line-clamp-2">
                          {highlightMatch(result.matchSnippet, searchQuery)}
                        </p>
                        <span className="text-xs text-zinc-600 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(result.timestamp)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
                {searchResults.length > 20 && (
                  <p className="text-xs text-zinc-600 text-center py-2">
                    Showing first 20 of {searchResults.length} results
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          // Conversations List View
          conversations.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-sm text-zinc-600">No conversations yet</p>
              <p className="text-xs text-zinc-700 mt-1">Start a new chat!</p>
            </div>
          ) : (
            <div className="space-y-1 px-2">
              {conversations.map((convo) => (
                <div
                  key={convo.id}
                  onMouseEnter={() => setHoveredId(convo.id)}
                  onMouseLeave={() => {
                    setHoveredId(null);
                    setMenuOpenId(null);
                  }}
                  className={`
                    relative group rounded-lg cursor-pointer transition-colors
                    ${currentConversationId === convo.id 
                      ? 'bg-zinc-800' 
                      : 'hover:bg-zinc-800/50'
                    }
                  `}
                >
                  <button
                    onClick={() => onSelectConversation(convo.id)}
                    className="w-full text-left px-3 py-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">
                          {convo.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-zinc-600 truncate">
                            {convo.messageCount} messages
                          </span>
                          <span className="text-xs text-zinc-700">•</span>
                          <span className="text-xs text-zinc-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(convo.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Delete button - show on hover */}
                  {(hoveredId === convo.id || menuOpenId === convo.id) && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (menuOpenId === convo.id) {
                            onDeleteConversation(convo.id);
                            setMenuOpenId(null);
                          } else {
                            setMenuOpenId(convo.id);
                          }
                        }}
                        className={`
                          p-1.5 rounded-lg transition-colors
                          ${menuOpenId === convo.id 
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                            : 'hover:bg-zinc-700 text-zinc-500'
                          }
                        `}
                        title={menuOpenId === convo.id ? 'Click again to delete' : 'Delete conversation'}
                      >
                        {menuOpenId === convo.id ? (
                          <Trash2 className="w-4 h-4" />
                        ) : (
                          <MoreVertical className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Import Message Toast */}
      {importMessage && (
        <div className={`mx-3 mb-2 px-3 py-2 rounded-lg text-xs ${
          importMessage.type === 'success' 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {importMessage.text}
        </div>
      )}

      {/* Footer with Export/Import */}
      <div className="p-3 border-t border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={handleExport}
            disabled={conversations.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export all conversations"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={handleImportClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Import conversations from JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
        </div>
        <p className="text-xs text-zinc-600 text-center">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} saved locally
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
