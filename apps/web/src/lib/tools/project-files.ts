// Project File Tools for MrSnappy Local
// Tools for creating, reading, and listing files within a project
// Note: Executors are in project-files-server.ts to avoid client-side fs imports

import { ToolDefinition } from './types';

// Tool Definitions (can be imported client-side)
export const projectCreateFileTool: ToolDefinition = {
  name: 'project_create_file',
  displayName: 'Create File',
  description: 'Create a new file in the current project. Use for creating code files, documents, notes, etc.',
  integration: 'projects',
  icon: '📝',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'File path relative to project root (e.g., "code/main.py" or "docs/readme.md")',
      required: true,
    },
    {
      name: 'content',
      type: 'string',
      description: 'Content to write to the file',
      required: true,
    },
    {
      name: 'overwrite',
      type: 'boolean',
      description: 'Whether to overwrite if file exists (default: false)',
      required: false,
      default: false,
    },
  ],
};

export const projectReadFileTool: ToolDefinition = {
  name: 'project_read_file',
  displayName: 'Read File',
  description: 'Read the contents of a file in the current project.',
  integration: 'projects',
  icon: '📖',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'File path relative to project root',
      required: true,
    },
  ],
};

export const projectListFilesTool: ToolDefinition = {
  name: 'project_list_files',
  displayName: 'List Files',
  description: 'List files and directories in the current project or a subdirectory.',
  integration: 'projects',
  icon: '📂',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Directory path relative to project root (default: root)',
      required: false,
      default: '',
    },
    {
      name: 'recursive',
      type: 'boolean',
      description: 'Whether to list files recursively (default: false)',
      required: false,
      default: false,
    },
  ],
};

export const projectDeleteFileTool: ToolDefinition = {
  name: 'project_delete_file',
  displayName: 'Delete File',
  description: 'Delete a file from the current project. Use with caution.',
  integration: 'projects',
  icon: '🗑️',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'File path relative to project root',
      required: true,
    },
  ],
};

// All project tools
export const projectTools = [
  projectCreateFileTool,
  projectReadFileTool,
  projectListFilesTool,
  projectDeleteFileTool,
];
