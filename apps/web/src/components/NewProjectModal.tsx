'use client';

import { useState } from 'react';
import { X, Loader2, FolderPlus, AlertCircle } from 'lucide-react';
import { PROJECT_COLORS, PROJECT_ICONS } from '@/lib/projects/types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (
    name: string,
    options?: { description?: string; color?: string; icon?: string }
  ) => Promise<{ success: boolean; error?: string }>;
}

export default function NewProjectModal({
  isOpen,
  onClose,
  onCreateProject,
}: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(PROJECT_COLORS[0].value);
  const [selectedIcon, setSelectedIcon] = useState<string>(PROJECT_ICONS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter a project name');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    const result = await onCreateProject(name.trim(), {
      description: description.trim() || undefined,
      color: selectedColor,
      icon: selectedIcon,
    });
    
    setIsCreating(false);
    
    if (result.success) {
      // Reset form
      setName('');
      setDescription('');
      setSelectedColor(PROJECT_COLORS[0].value);
      setSelectedIcon(PROJECT_ICONS[0]);
      onClose();
    } else {
      setError(result.error || 'Failed to create project');
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setName('');
      setDescription('');
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <FolderPlus className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">New Project</h2>
              <p className="text-xs text-zinc-500">Create a new workspace</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Project"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50"
              disabled={isCreating}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Description <span className="text-zinc-500">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this project about?"
              rows={2}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50 resize-none"
              disabled={isCreating}
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-colors ${
                    selectedIcon === icon
                      ? 'bg-amber-500/20 ring-2 ring-amber-500/50'
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                  disabled={isCreating}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    selectedColor === color.value
                      ? 'ring-2 ring-offset-2 ring-offset-zinc-900 ring-white scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                  disabled={isCreating}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <p className="text-xs text-zinc-500 mb-2">Preview</p>
            <div className="flex items-center gap-3">
              <span 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{ backgroundColor: selectedColor + '20' }}
              >
                {selectedIcon}
              </span>
              <div>
                <p className="font-medium">{name || 'Project Name'}</p>
                <p className="text-xs text-zinc-500">{description || 'No description'}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-400 rounded-lg text-zinc-900 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4" />
                  Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
