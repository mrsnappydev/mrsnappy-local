'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Conversation, 
  ConversationPreview, 
  Message, 
  SearchResult,
  ExportData,
  generateId, 
  generateTitle,
  createConversation 
} from '@/types/chat';

const STORAGE_KEY = 'mrsnappy-conversations';
const CURRENT_CONVERSATION_KEY = 'mrsnappy-current-conversation';
const MAX_CONVERSATIONS = 50; // Limit stored conversations
const EXPORT_VERSION = 1;

interface StoredData {
  conversations: Conversation[];
  version: number;
}

// Load conversations from localStorage
function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const data: StoredData = JSON.parse(stored);
    return data.conversations || [];
  } catch (error) {
    console.error('Failed to load conversations:', error);
    return [];
  }
}

// Save conversations to localStorage
function saveConversations(conversations: Conversation[]) {
  if (typeof window === 'undefined') return;
  
  try {
    // Keep only the most recent MAX_CONVERSATIONS
    const toSave = conversations.slice(0, MAX_CONVERSATIONS);
    
    const data: StoredData = {
      conversations: toSave,
      version: 1,
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save conversations:', error);
  }
}

// Load current conversation ID
function loadCurrentConversationId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CURRENT_CONVERSATION_KEY);
}

// Save current conversation ID
function saveCurrentConversationId(id: string | null) {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem(CURRENT_CONVERSATION_KEY, id);
  } else {
    localStorage.removeItem(CURRENT_CONVERSATION_KEY);
  }
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    const loaded = loadConversations();
    setConversations(loaded);
    
    // Load current conversation
    const currentId = loadCurrentConversationId();
    if (currentId) {
      const current = loaded.find(c => c.id === currentId);
      if (current) {
        setCurrentConversation(current);
      }
    }
    
    // If no current conversation, create one
    if (!currentId || !loaded.find(c => c.id === currentId)) {
      const newConvo = createConversation();
      setCurrentConversation(newConvo);
    }
    
    setIsLoaded(true);
  }, []);

  // Save whenever conversations change
  useEffect(() => {
    if (isLoaded) {
      saveConversations(conversations);
    }
  }, [conversations, isLoaded]);

  // Save current conversation ID whenever it changes
  useEffect(() => {
    if (isLoaded && currentConversation) {
      saveCurrentConversationId(currentConversation.id);
    }
  }, [currentConversation?.id, isLoaded]);

  // Get conversation previews for sidebar
  const getConversationPreviews = useCallback((): ConversationPreview[] => {
    return conversations
      .filter(c => c.messages.length > 0) // Only show conversations with messages
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map(c => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messageCount: c.messages.length,
        preview: c.messages[c.messages.length - 1]?.content.substring(0, 50) || '',
      }));
  }, [conversations]);

  // Create a new conversation
  const newConversation = useCallback(() => {
    const convo = createConversation();
    setCurrentConversation(convo);
    return convo;
  }, []);

  // Select a conversation
  const selectConversation = useCallback((id: string) => {
    const convo = conversations.find(c => c.id === id);
    if (convo) {
      setCurrentConversation(convo);
    }
  }, [conversations]);

  // Update current conversation (add message, etc.)
  const updateCurrentConversation = useCallback((updater: (convo: Conversation) => Conversation) => {
    setCurrentConversation(prev => {
      if (!prev) return prev;
      const updated = updater(prev);
      
      // Update in conversations list
      setConversations(convos => {
        const existing = convos.findIndex(c => c.id === updated.id);
        if (existing >= 0) {
          const newConvos = [...convos];
          newConvos[existing] = updated;
          return newConvos;
        } else {
          return [updated, ...convos];
        }
      });
      
      return updated;
    });
  }, []);

  // Add a message to current conversation
  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const now = new Date().toISOString();
    const newMessage: Message = {
      ...message,
      id: generateId(),
      timestamp: now,
    };

    updateCurrentConversation(convo => {
      const messages = [...convo.messages, newMessage];
      return {
        ...convo,
        messages,
        title: convo.messages.length === 0 ? generateTitle(messages) : convo.title,
        updatedAt: now,
      };
    });

    return newMessage;
  }, [updateCurrentConversation]);

  // Update a message in current conversation (for streaming)
  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    updateCurrentConversation(convo => ({
      ...convo,
      messages: convo.messages.map(m => 
        m.id === messageId ? { ...m, ...updates } : m
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, [updateCurrentConversation]);

  // Delete a message and all messages after it (for regenerate)
  const deleteMessagesFrom = useCallback((messageId: string) => {
    updateCurrentConversation(convo => {
      const messageIndex = convo.messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) return convo;
      
      return {
        ...convo,
        messages: convo.messages.slice(0, messageIndex),
        updatedAt: new Date().toISOString(),
      };
    });
  }, [updateCurrentConversation]);

  // Edit a message content
  const editMessage = useCallback((messageId: string, newContent: string) => {
    updateCurrentConversation(convo => ({
      ...convo,
      messages: convo.messages.map(m => 
        m.id === messageId ? { ...m, content: newContent } : m
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, [updateCurrentConversation]);

  // Delete a conversation
  const deleteConversation = useCallback((id: string) => {
    setConversations(convos => convos.filter(c => c.id !== id));
    
    // If we deleted the current conversation, create a new one
    if (currentConversation?.id === id) {
      const remaining = conversations.filter(c => c.id !== id);
      if (remaining.length > 0) {
        setCurrentConversation(remaining[0]);
      } else {
        newConversation();
      }
    }
  }, [conversations, currentConversation?.id, newConversation]);

  // Clear all conversations
  const clearAllConversations = useCallback(() => {
    setConversations([]);
    newConversation();
  }, [newConversation]);

  // Search across all conversations
  const searchConversations = useCallback((query: string): SearchResult[] => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];
    
    for (const convo of conversations) {
      for (const msg of convo.messages) {
        const lowerContent = msg.content.toLowerCase();
        const matchIndex = lowerContent.indexOf(lowerQuery);
        
        if (matchIndex !== -1) {
          // Create a snippet around the match
          const snippetStart = Math.max(0, matchIndex - 40);
          const snippetEnd = Math.min(msg.content.length, matchIndex + query.length + 40);
          let snippet = msg.content.substring(snippetStart, snippetEnd);
          
          if (snippetStart > 0) snippet = '...' + snippet;
          if (snippetEnd < msg.content.length) snippet = snippet + '...';
          
          results.push({
            conversationId: convo.id,
            conversationTitle: convo.title,
            messageId: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            matchSnippet: snippet,
          });
        }
      }
    }
    
    // Sort by timestamp, most recent first
    return results.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [conversations]);

  // Export all conversations as JSON
  const exportConversations = useCallback((): string => {
    const exportData: ExportData = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      conversations: conversations,
    };
    return JSON.stringify(exportData, null, 2);
  }, [conversations]);

  // Import conversations from JSON
  const importConversations = useCallback((jsonString: string): { success: boolean; message: string; count: number } => {
    try {
      const data = JSON.parse(jsonString);
      
      // Validate structure
      if (!data.conversations || !Array.isArray(data.conversations)) {
        return { success: false, message: 'Invalid format: missing conversations array', count: 0 };
      }
      
      // Validate each conversation
      const validConversations: Conversation[] = [];
      for (const convo of data.conversations) {
        if (!convo.id || !convo.title || !Array.isArray(convo.messages)) {
          continue; // Skip invalid conversations
        }
        
        // Ensure required fields exist
        const validConvo: Conversation = {
          id: convo.id,
          title: convo.title,
          messages: convo.messages.filter((m: Message) => 
            m.id && m.role && m.content && m.timestamp
          ),
          createdAt: convo.createdAt || new Date().toISOString(),
          updatedAt: convo.updatedAt || new Date().toISOString(),
          model: convo.model,
        };
        
        if (validConvo.messages.length > 0) {
          validConversations.push(validConvo);
        }
      }
      
      if (validConversations.length === 0) {
        return { success: false, message: 'No valid conversations found in import', count: 0 };
      }
      
      // Merge with existing conversations (avoid duplicates by ID)
      setConversations(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const newConvos = validConversations.filter(c => !existingIds.has(c.id));
        
        // Also allow updating existing conversations with same ID
        const updatedConvos = prev.map(existing => {
          const imported = validConversations.find(c => c.id === existing.id);
          return imported || existing;
        });
        
        return [...newConvos, ...updatedConvos].slice(0, MAX_CONVERSATIONS);
      });
      
      return { 
        success: true, 
        message: `Successfully imported ${validConversations.length} conversation(s)`, 
        count: validConversations.length 
      };
    } catch (error) {
      console.error('Import error:', error);
      return { success: false, message: 'Failed to parse JSON', count: 0 };
    }
  }, []);

  return {
    conversations,
    currentConversation,
    isLoaded,
    getConversationPreviews,
    newConversation,
    selectConversation,
    addMessage,
    updateMessage,
    editMessage,
    deleteMessagesFrom,
    deleteConversation,
    clearAllConversations,
    updateCurrentConversation,
    searchConversations,
    exportConversations,
    importConversations,
  };
}
