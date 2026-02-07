// Chat types for MrSnappy Local

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string for serialization
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  model?: string; // Track which model was used
}

export interface ConversationPreview {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string; // First few chars of last message
}

// Search result with conversation context
export interface SearchResult {
  conversationId: string;
  conversationTitle: string;
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  matchSnippet: string; // Snippet around the match
}

// Export format for conversations
export interface ExportData {
  version: number;
  exportedAt: string;
  conversations: Conversation[];
}

// Generate a unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Generate a conversation title from the first user message
export function generateTitle(messages: Message[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage) return 'New Conversation';
  
  const content = firstUserMessage.content.trim();
  if (content.length <= 40) return content;
  return content.substring(0, 40) + '...';
}

// Create a new conversation
export function createConversation(): Conversation {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: 'New Conversation',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

// Convert Conversation to Message[] with Date objects for display
export function messagesToDisplay(messages: Message[]): Message[] {
  return messages.map(m => ({
    ...m,
    // Keep as ISO string but component can parse if needed
  }));
}
