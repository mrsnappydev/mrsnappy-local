'use client';

import { useState, useCallback } from 'react';
import { 
  X, 
  Brain, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Sparkles,
  Download,
  Upload,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { 
  Memory, 
  MemoryItem, 
  MemoryCategory, 
  MEMORY_CATEGORIES,
  createMemoryItem,
} from '@/types/memory';

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  memory: Memory;
  onToggleEnabled: () => void;
  onToggleAutoExtract: () => void;
  onAddMemory: (category: MemoryCategory, content: string, importance: 'low' | 'medium' | 'high') => void;
  onUpdateMemory: (id: string, updates: Partial<Pick<MemoryItem, 'content' | 'category' | 'importance'>>) => void;
  onDeleteMemory: (id: string) => void;
  onClearMemories: () => void;
  onExportMemories: () => string;
  onImportMemories: (json: string, merge?: boolean) => { success: boolean; message: string; count: number };
  onExtractFromConversation: () => Promise<void>;
  isExtracting?: boolean;
}

export default function MemoryPanel({
  isOpen,
  onClose,
  memory,
  onToggleEnabled,
  onToggleAutoExtract,
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
  onClearMemories,
  onExportMemories,
  onImportMemories,
  onExtractFromConversation,
  isExtracting = false,
}: MemoryPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [newMemory, setNewMemory] = useState<{ category: MemoryCategory; content: string; importance: 'low' | 'medium' | 'high' }>({ category: 'personal', content: '', importance: 'medium' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<MemoryCategory>>(new Set(['personal', 'preference', 'technical']));
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Group memories by category
  const groupedMemories = memory.items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<MemoryCategory, MemoryItem[]>);

  const toggleCategory = (category: MemoryCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const startEditing = (item: MemoryItem) => {
    setEditingId(item.id);
    setEditContent(item.content);
  };

  const saveEdit = (id: string) => {
    if (editContent.trim()) {
      onUpdateMemory(id, { content: editContent.trim() });
    }
    setEditingId(null);
    setEditContent('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleAddMemory = () => {
    if (newMemory.content.trim()) {
      onAddMemory(newMemory.category, newMemory.content.trim(), newMemory.importance);
      setNewMemory({ category: 'personal', content: '', importance: 'medium' });
      setShowAddForm(false);
      // Expand the category we just added to
      setExpandedCategories(prev => new Set([...prev, newMemory.category]));
    }
  };

  const handleExport = () => {
    const json = onExportMemories();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mrsnappy-memories-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const text = await file.text();
      const result = onImportMemories(text, true);
      setImportStatus({ type: result.success ? 'success' : 'error', message: result.message });
      setTimeout(() => setImportStatus(null), 3000);
    };
    input.click();
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'text-amber-400 bg-amber-400/10';
      case 'medium': return 'text-zinc-400 bg-zinc-400/10';
      case 'low': return 'text-zinc-500 bg-zinc-500/10';
      default: return 'text-zinc-400 bg-zinc-400/10';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-zinc-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Memory</h2>
              <p className="text-xs text-zinc-500">
                {memory.items.length} thing{memory.items.length !== 1 ? 's' : ''} remembered
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-b border-zinc-800 space-y-4">
          {/* Toggle switches */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={memory.enabled}
                  onChange={onToggleEnabled}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/20"
                />
                <span className="text-sm">Memory enabled</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={memory.autoExtract}
                  onChange={onToggleAutoExtract}
                  disabled={!memory.enabled}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/20 disabled:opacity-50"
                />
                <span className={`text-sm ${!memory.enabled ? 'opacity-50' : ''}`}>Auto-learn</span>
              </label>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={onExtractFromConversation}
                disabled={isExtracting || !memory.enabled}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isExtracting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Extract from chat
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                disabled={!memory.enabled}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Import status */}
          {importStatus && (
            <div className={`text-xs px-3 py-2 rounded-lg ${
              importStatus.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {importStatus.message}
            </div>
          )}

          {/* Add memory form */}
          {showAddForm && (
            <div className="p-4 bg-zinc-800/50 rounded-xl space-y-3">
              <div className="flex gap-3">
                <select
                  value={newMemory.category}
                  onChange={(e) => setNewMemory(prev => ({ ...prev, category: e.target.value as MemoryCategory }))}
                  className="px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg focus:border-amber-500 outline-none"
                >
                  {Object.entries(MEMORY_CATEGORIES).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.icon} {meta.label}</option>
                  ))}
                </select>
                <select
                  value={newMemory.importance}
                  onChange={(e) => setNewMemory(prev => ({ ...prev, importance: e.target.value as 'low' | 'medium' | 'high' }))}
                  className="px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg focus:border-amber-500 outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">⚡ High</option>
                </select>
              </div>
              <textarea
                value={newMemory.content}
                onChange={(e) => setNewMemory(prev => ({ ...prev, content: e.target.value }))}
                placeholder="What should I remember?"
                className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg focus:border-amber-500 outline-none resize-none"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMemory}
                  disabled={!newMemory.content.trim()}
                  className="px-4 py-1.5 text-xs bg-amber-500 text-zinc-900 rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Memory List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {memory.items.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No memories yet</p>
              <p className="text-xs mt-1">
                {memory.autoExtract 
                  ? "I'll learn about you as we chat!" 
                  : "Click 'Extract from chat' or add memories manually"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(MEMORY_CATEGORIES).map(([categoryKey, meta]) => {
                const items = groupedMemories[categoryKey as MemoryCategory] || [];
                if (items.length === 0) return null;
                
                const isExpanded = expandedCategories.has(categoryKey as MemoryCategory);
                
                return (
                  <div key={categoryKey} className="border border-zinc-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleCategory(categoryKey as MemoryCategory)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span>{meta.icon}</span>
                        <span className="font-medium text-sm">{meta.label}</span>
                        <span className="text-xs text-zinc-500">({items.length})</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-zinc-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      )}
                    </button>
                    
                    {isExpanded && (
                      <div className="divide-y divide-zinc-800">
                        {items.map(item => (
                          <div key={item.id} className="px-4 py-3 group">
                            {editingId === item.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="flex-1 px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded-lg focus:border-amber-500 outline-none"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit(item.id);
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                />
                                <button
                                  onClick={() => saveEdit(item.id)}
                                  className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="p-1.5 text-zinc-400 hover:bg-zinc-700 rounded-lg transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${getImportanceColor(item.importance)}`}>
                                    {item.importance === 'high' ? '⚡' : item.importance === 'medium' ? '•' : '○'}
                                  </span>
                                  <span className="text-sm truncate">{item.content}</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => startEditing(item)}
                                    className="p-1.5 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700 rounded-lg transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteMemory(item.id)}
                                    className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={memory.items.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              onClick={handleImport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Import
            </button>
          </div>
          
          {memory.items.length > 0 && (
            <div className="relative">
              {showClearConfirm ? (
                <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs text-red-400">Clear all?</span>
                  <button
                    onClick={() => {
                      onClearMemories();
                      setShowClearConfirm(false);
                    }}
                    className="text-xs text-red-400 hover:text-red-300 font-medium"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="text-xs text-zinc-400 hover:text-zinc-300"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
