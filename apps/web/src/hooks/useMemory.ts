'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Memory, 
  MemoryItem, 
  MemoryCategory, 
  DEFAULT_MEMORY,
  createMemoryItem,
  generateMemoryId,
} from '@/types/memory';

const STORAGE_KEY = 'mrsnappy-memory';

function loadMemory(): Memory {
  if (typeof window === 'undefined') return DEFAULT_MEMORY;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_MEMORY;
    
    const parsed = JSON.parse(stored);
    return { ...DEFAULT_MEMORY, ...parsed };
  } catch (error) {
    console.error('Failed to load memory:', error);
    return DEFAULT_MEMORY;
  }
}

function saveMemory(memory: Memory) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch (error) {
    console.error('Failed to save memory:', error);
  }
}

export function useMemory() {
  const [memory, setMemory] = useState<Memory>(DEFAULT_MEMORY);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    const loaded = loadMemory();
    setMemory(loaded);
    setIsLoaded(true);
  }, []);

  // Save whenever memory changes
  useEffect(() => {
    if (isLoaded) {
      saveMemory(memory);
    }
  }, [memory, isLoaded]);

  // Toggle memory feature on/off
  const toggleEnabled = useCallback(() => {
    setMemory(prev => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  // Toggle auto-extraction
  const toggleAutoExtract = useCallback(() => {
    setMemory(prev => ({ ...prev, autoExtract: !prev.autoExtract }));
  }, []);

  // Add a single memory item
  const addMemory = useCallback((
    category: MemoryCategory,
    content: string,
    importance: 'low' | 'medium' | 'high' = 'medium',
    source?: string
  ) => {
    const newItem = createMemoryItem(category, content, importance, source);
    setMemory(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    return newItem;
  }, []);

  // Add multiple memory items (from extraction)
  const addMemories = useCallback((items: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const now = new Date().toISOString();
    const newItems: MemoryItem[] = items.map(item => ({
      ...item,
      id: generateMemoryId(),
      createdAt: now,
      updatedAt: now,
    }));
    
    setMemory(prev => ({
      ...prev,
      items: [...prev.items, ...newItems],
      lastExtractedAt: now,
    }));
    
    return newItems;
  }, []);

  // Update a memory item
  const updateMemory = useCallback((id: string, updates: Partial<Pick<MemoryItem, 'content' | 'category' | 'importance'>>) => {
    setMemory(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === id 
          ? { ...item, ...updates, updatedAt: new Date().toISOString() }
          : item
      ),
    }));
  }, []);

  // Delete a memory item
  const deleteMemory = useCallback((id: string) => {
    setMemory(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id),
    }));
  }, []);

  // Clear all memories
  const clearMemories = useCallback(() => {
    setMemory(prev => ({
      ...prev,
      items: [],
      lastExtractedAt: undefined,
    }));
  }, []);

  // Get memories by category
  const getMemoriesByCategory = useCallback((category: MemoryCategory) => {
    return memory.items.filter(item => item.category === category);
  }, [memory.items]);

  // Get high-importance memories
  const getImportantMemories = useCallback(() => {
    return memory.items.filter(item => item.importance === 'high');
  }, [memory.items]);

  // Check if a similar memory already exists (basic duplicate detection)
  const hasSimilarMemory = useCallback((content: string) => {
    const normalizedContent = content.toLowerCase().trim();
    return memory.items.some(item => {
      const normalizedItem = item.content.toLowerCase().trim();
      // Check for exact match or high similarity
      return normalizedItem === normalizedContent || 
             normalizedItem.includes(normalizedContent) ||
             normalizedContent.includes(normalizedItem);
    });
  }, [memory.items]);

  // Export memories as JSON
  const exportMemories = useCallback(() => {
    return JSON.stringify({
      version: memory.version,
      exportedAt: new Date().toISOString(),
      items: memory.items,
    }, null, 2);
  }, [memory]);

  // Import memories from JSON
  const importMemories = useCallback((jsonString: string, merge = true): { success: boolean; message: string; count: number } => {
    try {
      const data = JSON.parse(jsonString);
      
      if (!data.items || !Array.isArray(data.items)) {
        return { success: false, message: 'Invalid format: missing items array', count: 0 };
      }

      const validItems: MemoryItem[] = data.items
        .filter((item: MemoryItem) => item.content && item.category)
        .map((item: MemoryItem) => ({
          ...item,
          id: item.id || generateMemoryId(),
          importance: item.importance || 'medium',
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
        }));

      if (validItems.length === 0) {
        return { success: false, message: 'No valid memories found in import', count: 0 };
      }

      setMemory(prev => ({
        ...prev,
        items: merge ? [...prev.items, ...validItems] : validItems,
      }));

      return {
        success: true,
        message: `Successfully imported ${validItems.length} memory item(s)`,
        count: validItems.length,
      };
    } catch (error) {
      console.error('Memory import error:', error);
      return { success: false, message: 'Failed to parse JSON', count: 0 };
    }
  }, []);

  return {
    memory,
    isLoaded,
    toggleEnabled,
    toggleAutoExtract,
    addMemory,
    addMemories,
    updateMemory,
    deleteMemory,
    clearMemories,
    getMemoriesByCategory,
    getImportantMemories,
    hasSimilarMemory,
    exportMemories,
    importMemories,
  };
}
