// Memory types for MrSnappy Local
// The memory system allows the AI to remember facts about the user across conversations

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  content: string;
  importance: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  source?: string; // Optional: which conversation this came from
}

export type MemoryCategory = 
  | 'personal'    // Name, job, location, family
  | 'preference'  // Likes, dislikes, communication style
  | 'technical'   // Tech stack, tools, expertise
  | 'project'     // Ongoing projects, goals
  | 'context'     // Situational info, reminders
  | 'custom';     // User-defined

export interface Memory {
  items: MemoryItem[];
  enabled: boolean; // Global toggle for memory feature
  autoExtract: boolean; // Automatically extract memories from conversations
  lastExtractedAt?: string;
  version: number;
}

export const DEFAULT_MEMORY: Memory = {
  items: [],
  enabled: true,
  autoExtract: true,
  version: 1,
};

// Category metadata for UI
export const MEMORY_CATEGORIES: Record<MemoryCategory, { label: string; icon: string; description: string }> = {
  personal: {
    label: 'Personal',
    icon: '👤',
    description: 'Name, job, location, family, birthday',
  },
  preference: {
    label: 'Preferences',
    icon: '⭐',
    description: 'Communication style, likes, dislikes',
  },
  technical: {
    label: 'Technical',
    icon: '💻',
    description: 'Tech stack, tools, programming languages',
  },
  project: {
    label: 'Projects',
    icon: '📁',
    description: 'Ongoing work, goals, deadlines',
  },
  context: {
    label: 'Context',
    icon: '📌',
    description: 'Current situation, reminders',
  },
  custom: {
    label: 'Custom',
    icon: '📝',
    description: 'Your own notes',
  },
};

// Helper to generate memory IDs
export function generateMemoryId(): string {
  return `mem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Create a new memory item
export function createMemoryItem(
  category: MemoryCategory,
  content: string,
  importance: 'low' | 'medium' | 'high' = 'medium',
  source?: string
): MemoryItem {
  const now = new Date().toISOString();
  return {
    id: generateMemoryId(),
    category,
    content,
    importance,
    createdAt: now,
    updatedAt: now,
    source,
  };
}

// Format memories for system prompt inclusion
export function formatMemoriesForPrompt(memory: Memory): string {
  if (!memory.enabled || memory.items.length === 0) {
    return '';
  }

  const grouped = memory.items.reduce((acc, item) => {
    const key = item.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<MemoryCategory, MemoryItem[]>);

  let prompt = '\n\n## What I Remember About You\n';
  
  for (const [category, items] of Object.entries(grouped)) {
    const meta = MEMORY_CATEGORIES[category as MemoryCategory];
    prompt += `\n### ${meta.icon} ${meta.label}\n`;
    for (const item of items) {
      const importance = item.importance === 'high' ? ' ⚡' : '';
      prompt += `- ${item.content}${importance}\n`;
    }
  }

  prompt += '\nUse this information to personalize your responses. Reference these facts naturally when relevant, but don\'t force them into every conversation.';

  return prompt;
}

// Suggested extraction prompt for the AI
export const MEMORY_EXTRACTION_PROMPT = `You are analyzing a conversation to extract memorable facts about the user.

Extract facts that would be useful to remember for future conversations. Focus on:
- Personal details (name, job, location, family)
- Preferences (communication style, likes/dislikes)
- Technical expertise (languages, tools, frameworks)
- Projects they're working on
- Important context or reminders

For each fact, provide:
1. category: one of "personal", "preference", "technical", "project", "context"
2. content: a concise statement of the fact
3. importance: "low", "medium", or "high"

Respond with a JSON array of objects with these fields. Only include clear, factual information - not opinions or speculation. If there's nothing notable to remember, return an empty array [].

Example output:
[
  {"category": "personal", "content": "User's name is Alex", "importance": "high"},
  {"category": "technical", "content": "Uses TypeScript and React for frontend work", "importance": "medium"},
  {"category": "preference", "content": "Prefers concise explanations over lengthy ones", "importance": "medium"}
]`;
