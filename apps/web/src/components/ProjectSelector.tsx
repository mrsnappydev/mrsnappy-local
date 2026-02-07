'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  FolderOpen, 
  ChevronDown, 
  Plus, 
  Check, 
  Search,
  Clock,
  Folder,
  X,
} from 'lucide-react';
import { Project } from '@/lib/projects/types';

interface ProjectSelectorProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (id: string | null) => void;
  onNewProject: () => void;
}

export default function ProjectSelector({
  projects,
  activeProject,
  onSelectProject,
  onNewProject,
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter projects by search
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Sort by last opened
  const sortedProjects = [...filteredProjects].sort(
    (a, b) => b.lastOpenedAt - a.lastOpenedAt
  );

  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
          activeProject 
            ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' 
            : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
        }`}
      >
        {activeProject ? (
          <>
            <span 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: activeProject.color }}
            />
            <span className="text-sm">{activeProject.icon}</span>
            <span className="text-sm text-zinc-200 max-w-[120px] truncate">
              {activeProject.name}
            </span>
          </>
        ) : (
          <>
            <Folder className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">No project</span>
          </>
        )}
        <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* Current Project Section */}
          {activeProject && (
            <div className="p-2 border-b border-zinc-800">
              <p className="px-2 py-1 text-xs text-zinc-500 uppercase tracking-wider">Current Project</p>
              <button
                onClick={() => {
                  onSelectProject(null);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-400">Close project</span>
              </button>
            </div>
          )}

          {/* Projects List */}
          <div className="max-h-64 overflow-y-auto">
            {sortedProjects.length > 0 ? (
              <div className="p-2">
                <p className="px-2 py-1 text-xs text-zinc-500 uppercase tracking-wider">
                  {searchQuery ? 'Search Results' : 'Recent Projects'}
                </p>
                {sortedProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      onSelectProject(project.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      project.id === activeProject?.id
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'hover:bg-zinc-800'
                    }`}
                  >
                    <span 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: project.color + '20' }}
                    >
                      {project.icon}
                    </span>
                    <div className="flex-1 text-left overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{project.name}</span>
                        {project.id === activeProject?.id && (
                          <Check className="w-3 h-3 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatRelativeTime(project.lastOpenedAt)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-zinc-500 text-sm">
                {searchQuery ? 'No projects found' : 'No projects yet'}
              </div>
            )}
          </div>

          {/* New Project Button */}
          <div className="p-2 border-t border-zinc-800">
            <button
              onClick={() => {
                onNewProject();
                setIsOpen(false);
                setSearchQuery('');
              }}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-amber-500/10 text-amber-400 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">New Project</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
