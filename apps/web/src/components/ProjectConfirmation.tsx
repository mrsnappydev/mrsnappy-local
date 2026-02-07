'use client';

import { FolderOpen, ChevronRight, RefreshCw, X } from 'lucide-react';
import { Project } from '@/lib/projects/types';

interface ProjectConfirmationProps {
  project: Project;
  onContinue: () => void;
  onSwitchProject: () => void;
  onStartFresh: () => void;
}

export default function ProjectConfirmation({
  project,
  onContinue,
  onSwitchProject,
  onStartFresh,
}: ProjectConfirmationProps) {
  // Format last opened time
  const formatLastOpened = () => {
    const diff = Date.now() - project.lastOpenedAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(project.lastOpenedAt).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Card */}
      <div className="relative w-full max-w-md mx-4 bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl overflow-hidden">
        {/* Color accent bar */}
        <div 
          className="h-1"
          style={{ backgroundColor: project.color }}
        />
        
        {/* Content */}
        <div className="p-6">
          {/* Greeting */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-1">Welcome back! 👋</h2>
            <p className="text-zinc-400 text-sm">
              Are we still working on this project today?
            </p>
          </div>

          {/* Project Card */}
          <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl mb-6">
            <div className="flex items-center gap-4">
              <span 
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: project.color + '20' }}
              >
                {project.icon}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-zinc-400 truncate">{project.description}</p>
                )}
                <p className="text-xs text-zinc-500 mt-1">
                  Last opened {formatLastOpened()}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {/* Continue with project */}
            <button
              onClick={onContinue}
              className="w-full flex items-center justify-between p-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FolderOpen className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">Yes, continue</p>
                  <p className="text-xs text-amber-400/70">Keep working on {project.name}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>

            {/* Switch project */}
            <button
              onClick={onSwitchProject}
              className="w-full flex items-center justify-between p-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-zinc-500" />
                <div className="text-left">
                  <p className="font-medium">Switch project</p>
                  <p className="text-xs text-zinc-500">Open a different project</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-500 transition-transform group-hover:translate-x-1" />
            </button>

            {/* Start fresh */}
            <button
              onClick={onStartFresh}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <X className="w-5 h-5 text-zinc-600" />
                <div className="text-left">
                  <p className="font-medium">Start fresh</p>
                  <p className="text-xs text-zinc-600">Chat without a project</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
