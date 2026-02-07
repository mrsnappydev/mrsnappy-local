'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Project, 
  createProject as createProjectObj,
  DEFAULT_PROJECTS_BASE,
} from '@/lib/projects/types';

const STORAGE_KEY = 'mrsnappy-projects';
const ACTIVE_PROJECT_KEY = 'mrsnappy-active-project';
const LAST_PROJECT_KEY = 'mrsnappy-last-project';
const PROJECTS_BASE_KEY = 'mrsnappy-projects-base';

interface StoredData {
  projects: Project[];
  version: number;
}

// Load projects from localStorage
function loadProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const data: StoredData = JSON.parse(stored);
    return data.projects || [];
  } catch (error) {
    console.error('Failed to load projects:', error);
    return [];
  }
}

// Save projects to localStorage
function saveProjects(projects: Project[]) {
  if (typeof window === 'undefined') return;
  
  try {
    const data: StoredData = {
      projects,
      version: 1,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save projects:', error);
  }
}

// Load active project ID
function loadActiveProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_PROJECT_KEY);
}

// Save active project ID
function saveActiveProjectId(id: string | null) {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    localStorage.setItem(LAST_PROJECT_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
  }
}

// Load last project ID (persists even after switching to no project)
function loadLastProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_PROJECT_KEY);
}

// Load projects base path
function loadProjectsBasePath(): string {
  if (typeof window === 'undefined') return DEFAULT_PROJECTS_BASE;
  return localStorage.getItem(PROJECTS_BASE_KEY) || DEFAULT_PROJECTS_BASE;
}

// Save projects base path
function saveProjectsBasePath(basePath: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROJECTS_BASE_KEY, basePath);
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [lastProjectId, setLastProjectId] = useState<string | null>(null);
  const [projectsBasePath, setProjectsBasePathState] = useState<string>(DEFAULT_PROJECTS_BASE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [hasConfirmedSession, setHasConfirmedSession] = useState(false);

  // Get the active project object
  const activeProject = projects.find(p => p.id === activeProjectId) || null;
  const lastProject = projects.find(p => p.id === lastProjectId) || null;

  // Load on mount
  useEffect(() => {
    const loaded = loadProjects();
    setProjects(loaded);
    
    const activeId = loadActiveProjectId();
    setActiveProjectId(activeId);
    
    const lastId = loadLastProjectId();
    setLastProjectId(lastId);
    
    const basePath = loadProjectsBasePath();
    setProjectsBasePathState(basePath);
    
    // Show confirmation if there's a last project but we haven't confirmed yet
    if (lastId && loaded.find(p => p.id === lastId)) {
      setShowConfirmation(true);
    }
    
    setIsLoaded(true);
  }, []);

  // Save projects whenever they change
  useEffect(() => {
    if (isLoaded) {
      saveProjects(projects);
    }
  }, [projects, isLoaded]);

  // Save active project ID whenever it changes
  useEffect(() => {
    if (isLoaded) {
      saveActiveProjectId(activeProjectId);
    }
  }, [activeProjectId, isLoaded]);

  // Create a new project
  const createProject = useCallback(async (
    name: string,
    options?: {
      description?: string;
      color?: string;
      icon?: string;
    }
  ): Promise<{ success: boolean; project?: Project; error?: string }> => {
    try {
      // Create project object
      const project = createProjectObj(name, projectsBasePath, options);
      
      // Call API to create folder on disk
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });
      
      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.error || 'Failed to create project folder' };
      }
      
      // Add to local state
      setProjects(prev => [project, ...prev]);
      
      // Switch to the new project
      setActiveProjectId(project.id);
      setLastProjectId(project.id);
      setHasConfirmedSession(true);
      setShowConfirmation(false);
      
      return { success: true, project };
    } catch (error) {
      console.error('Failed to create project:', error);
      return { success: false, error: 'Failed to create project' };
    }
  }, [projectsBasePath]);

  // Switch to a project
  const switchProject = useCallback((id: string | null) => {
    const project = id ? projects.find(p => p.id === id) : null;
    
    if (id && !project) {
      console.error('Project not found:', id);
      return;
    }
    
    // Update last opened time if switching to a project
    if (project) {
      const now = Date.now();
      setProjects(prev => prev.map(p => 
        p.id === id ? { ...p, lastOpenedAt: now } : p
      ));
    }
    
    setActiveProjectId(id);
    if (id) {
      setLastProjectId(id);
    }
    setHasConfirmedSession(true);
    setShowConfirmation(false);
  }, [projects]);

  // Delete a project
  const deleteProject = useCallback(async (id: string, deleteFolder: boolean = false): Promise<{ success: boolean; error?: string }> => {
    const project = projects.find(p => p.id === id);
    if (!project) {
      return { success: false, error: 'Project not found' };
    }
    
    try {
      if (deleteFolder) {
        // Call API to delete folder
        const response = await fetch(`/api/projects/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: project.path }),
        });
        
        if (!response.ok) {
          const data = await response.json();
          return { success: false, error: data.error || 'Failed to delete project folder' };
        }
      }
      
      // Remove from local state
      setProjects(prev => prev.filter(p => p.id !== id));
      
      // Clear active if this was the active project
      if (activeProjectId === id) {
        setActiveProjectId(null);
      }
      
      // Clear last if this was the last project
      if (lastProjectId === id) {
        setLastProjectId(null);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to delete project:', error);
      return { success: false, error: 'Failed to delete project' };
    }
  }, [projects, activeProjectId, lastProjectId]);

  // Update a project
  const updateProject = useCallback((id: string, updates: Partial<Omit<Project, 'id' | 'createdAt' | 'path'>>) => {
    setProjects(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
  }, []);

  // Set projects base path
  const setProjectsBasePath = useCallback((basePath: string) => {
    setProjectsBasePathState(basePath);
    saveProjectsBasePath(basePath);
  }, []);

  // Confirm continuing with last project
  const confirmLastProject = useCallback(() => {
    if (lastProjectId) {
      switchProject(lastProjectId);
    }
  }, [lastProjectId, switchProject]);

  // Dismiss confirmation and start fresh (no project)
  const dismissConfirmation = useCallback(() => {
    setActiveProjectId(null);
    setHasConfirmedSession(true);
    setShowConfirmation(false);
  }, []);

  // Get projects sorted by last opened
  const getProjectsSorted = useCallback((): Project[] => {
    return [...projects].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  }, [projects]);

  return {
    projects,
    activeProject,
    activeProjectId,
    lastProject,
    lastProjectId,
    projectsBasePath,
    isLoaded,
    showConfirmation,
    hasConfirmedSession,
    createProject,
    switchProject,
    deleteProject,
    updateProject,
    setProjectsBasePath,
    confirmLastProject,
    dismissConfirmation,
    getProjectsSorted,
  };
}
