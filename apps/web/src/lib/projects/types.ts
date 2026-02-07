// Project Types for MrSnappy Local
// Projects are workspace containers for organizing work

export interface Project {
  id: string;
  name: string;
  path: string;  // folder path on disk
  createdAt: number;  // unix timestamp
  lastOpenedAt: number;  // unix timestamp
  description?: string;
  color?: string;  // for UI distinction (hex color)
  icon?: string;   // emoji icon
}

export interface ProjectFile {
  name: string;
  path: string;  // relative to project root
  type: 'file' | 'directory';
  size?: number;  // bytes, for files
  modifiedAt?: number;  // unix timestamp
}

export interface ProjectStats {
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;  // bytes
}

// Available project colors for UI
export const PROJECT_COLORS = [
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Lime', value: '#84cc16' },
] as const;

// Available project icons (emojis)
export const PROJECT_ICONS = [
  '📁', '💼', '🚀', '⚡', '🎯', '💡', '🔥', '✨',
  '🎨', '🛠️', '📊', '📝', '🎮', '🌐', '🔬', '📱',
  '💻', '🎵', '📸', '🏠', '🎬', '📚', '🧪', '🔧',
] as const;

// Default project folder base path
export const DEFAULT_PROJECTS_BASE = '~/MrSnappy-Projects';

// Generate a unique project ID
export function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// Generate a slug from project name (for folder name)
export function slugifyProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 50);
}

// Create a new project object
export function createProject(
  name: string,
  basePath: string,
  options?: {
    description?: string;
    color?: string;
    icon?: string;
  }
): Project {
  const now = Date.now();
  const slug = slugifyProjectName(name);
  
  return {
    id: generateProjectId(),
    name,
    path: `${basePath}/${slug}`,
    createdAt: now,
    lastOpenedAt: now,
    description: options?.description,
    color: options?.color || PROJECT_COLORS[0].value,
    icon: options?.icon || '📁',
  };
}

// Project context for LLM system prompt
export function buildProjectContext(project: Project): string {
  return `

## Current Project Context

You are working in a project workspace:
- **Project Name:** ${project.icon} ${project.name}
- **Project Path:** ${project.path}
${project.description ? `- **Description:** ${project.description}` : ''}

When the user asks you to create, read, or modify files, assume they want to work within this project folder unless they specify otherwise.

Use the project file tools to:
- Create files in the project: \`project_create_file\`
- List files in the project: \`project_list_files\`
- Read files from the project: \`project_read_file\`
`;
}
