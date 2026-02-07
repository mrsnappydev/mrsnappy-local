// Model Capability System for MrSnappy Local
// Defines what each model is good at

export type ModelCapability = 
  | 'general'      // General chat/assistant
  | 'coding'       // Code generation, debugging
  | 'creative'     // Creative writing, stories
  | 'reasoning'    // Logic, math, analysis
  | 'vision'       // Image understanding (multimodal)
  | 'roleplay'     // Character roleplay
  | 'instruction'  // Following instructions precisely
  | 'multilingual' // Multiple languages
  | 'long-context' // Large context window
  | 'fast'         // Optimized for speed
  | 'small'        // Runs on limited hardware
  | 'uncensored';  // No content restrictions

export interface ModelCapabilityInfo {
  id: ModelCapability;
  label: string;
  icon: string;  // emoji
  description: string;
  color: string; // Tailwind color class prefix (e.g., 'blue' -> 'bg-blue-500/20 text-blue-400')
}

// Capability definitions with full metadata
export const CAPABILITIES: Record<ModelCapability, ModelCapabilityInfo> = {
  general: {
    id: 'general',
    label: 'General',
    icon: '💬',
    description: 'Great for everyday conversations and questions',
    color: 'zinc',
  },
  coding: {
    id: 'coding',
    label: 'Coding',
    icon: '💻',
    description: 'Code generation, debugging, and technical explanations',
    color: 'blue',
  },
  creative: {
    id: 'creative',
    label: 'Creative',
    icon: '✍️',
    description: 'Creative writing, stories, poetry, and brainstorming',
    color: 'pink',
  },
  reasoning: {
    id: 'reasoning',
    label: 'Reasoning',
    icon: '🧮',
    description: 'Logic puzzles, math, and analytical thinking',
    color: 'amber',
  },
  vision: {
    id: 'vision',
    label: 'Vision',
    icon: '👁️',
    description: 'Can understand and analyze images',
    color: 'purple',
  },
  roleplay: {
    id: 'roleplay',
    label: 'Roleplay',
    icon: '🎭',
    description: 'Character roleplay and interactive fiction',
    color: 'rose',
  },
  instruction: {
    id: 'instruction',
    label: 'Instruction',
    icon: '📋',
    description: 'Follows complex instructions precisely',
    color: 'green',
  },
  multilingual: {
    id: 'multilingual',
    label: 'Multilingual',
    icon: '🌍',
    description: 'Strong support for multiple languages',
    color: 'teal',
  },
  'long-context': {
    id: 'long-context',
    label: 'Long Context',
    icon: '📚',
    description: 'Can process very long documents',
    color: 'indigo',
  },
  fast: {
    id: 'fast',
    label: 'Fast',
    icon: '⚡',
    description: 'Optimized for quick responses',
    color: 'yellow',
  },
  small: {
    id: 'small',
    label: 'Small',
    icon: '📱',
    description: 'Runs well on limited hardware / low RAM',
    color: 'emerald',
  },
  uncensored: {
    id: 'uncensored',
    label: 'Uncensored',
    icon: '🔓',
    description: 'Fewer content restrictions',
    color: 'red',
  },
};

// Get capability info by ID
export function getCapabilityInfo(id: ModelCapability): ModelCapabilityInfo {
  return CAPABILITIES[id];
}

// Get Tailwind classes for a capability badge
export function getCapabilityClasses(id: ModelCapability): { bg: string; text: string } {
  const info = CAPABILITIES[id];
  return {
    bg: `bg-${info.color}-500/20`,
    text: `text-${info.color}-400`,
  };
}

// Capability filters for UI
export const CAPABILITY_FILTERS: Array<{ id: ModelCapability | 'all'; label: string; icon: string }> = [
  { id: 'all', label: 'All Models', icon: '🔍' },
  { id: 'coding', label: 'Coding', icon: '💻' },
  { id: 'vision', label: 'Vision', icon: '👁️' },
  { id: 'creative', label: 'Creative', icon: '✍️' },
  { id: 'reasoning', label: 'Reasoning', icon: '🧮' },
  { id: 'fast', label: 'Fast', icon: '⚡' },
  { id: 'small', label: 'Small (Low RAM)', icon: '📱' },
  { id: 'multilingual', label: 'Multilingual', icon: '🌍' },
  { id: 'long-context', label: 'Long Context', icon: '📚' },
];
