// Project File Tool Executors (Server-only - uses Node.js fs)
// Only import this file in API routes, not in client components

import { ToolResult } from './types';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Expand ~ to home directory
function expandPath(p: string): string {
  if (p.startsWith('~/')) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

// Security: ensure path is within allowed directory
function isPathSafe(filePath: string, projectPath: string): boolean {
  const homeDir = os.homedir();
  const expandedProject = expandPath(projectPath);
  const fullPath = path.resolve(expandedProject, filePath);
  
  // Must be within home directory
  if (!fullPath.startsWith(homeDir)) return false;
  
  // Must be within project directory
  if (!fullPath.startsWith(expandedProject)) return false;
  
  // No path traversal
  if (filePath.includes('..')) return false;
  
  return true;
}

// Tool Executors
export async function executeProjectCreateFile(
  filePath: string,
  content: string,
  overwrite: boolean,
  projectPath: string
): Promise<ToolResult> {
  try {
    if (!isPathSafe(filePath, projectPath)) {
      return {
        toolCallId: '',
        name: 'project_create_file',
        success: false,
        error: 'Invalid file path - must be within project directory',
      };
    }
    
    const expandedProject = expandPath(projectPath);
    const fullPath = path.resolve(expandedProject, filePath);
    
    // Check if file exists
    try {
      await fs.access(fullPath);
      if (!overwrite) {
        return {
          toolCallId: '',
          name: 'project_create_file',
          success: false,
          error: `File already exists: ${filePath}. Set overwrite=true to replace.`,
        };
      }
    } catch {
      // File doesn't exist - good
    }
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, content, 'utf-8');
    
    return {
      toolCallId: '',
      name: 'project_create_file',
      success: true,
      result: {
        message: `Created file: ${filePath}`,
        path: filePath,
        size: content.length,
      },
      displayType: 'text',
    };
  } catch (error) {
    return {
      toolCallId: '',
      name: 'project_create_file',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create file',
    };
  }
}

export async function executeProjectReadFile(
  filePath: string,
  projectPath: string
): Promise<ToolResult> {
  try {
    if (!isPathSafe(filePath, projectPath)) {
      return {
        toolCallId: '',
        name: 'project_read_file',
        success: false,
        error: 'Invalid file path - must be within project directory',
      };
    }
    
    const expandedProject = expandPath(projectPath);
    const fullPath = path.resolve(expandedProject, filePath);
    
    const content = await fs.readFile(fullPath, 'utf-8');
    const stat = await fs.stat(fullPath);
    
    return {
      toolCallId: '',
      name: 'project_read_file',
      success: true,
      result: {
        path: filePath,
        content: content,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      },
      displayType: 'text',
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        toolCallId: '',
        name: 'project_read_file',
        success: false,
        error: `File not found: ${filePath}`,
      };
    }
    return {
      toolCallId: '',
      name: 'project_read_file',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read file',
    };
  }
}

async function listFilesRecursive(
  dir: string,
  baseDir: string,
  results: Array<{ name: string; path: string; type: string; size?: number }> = []
): Promise<Array<{ name: string; path: string; type: string; size?: number }>> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      results.push({ name: entry.name, path: relativePath, type: 'directory' });
      await listFilesRecursive(fullPath, baseDir, results);
    } else {
      const stat = await fs.stat(fullPath);
      results.push({ name: entry.name, path: relativePath, type: 'file', size: stat.size });
    }
  }
  
  return results;
}

export async function executeProjectListFiles(
  dirPath: string,
  recursive: boolean,
  projectPath: string
): Promise<ToolResult> {
  try {
    const targetPath = dirPath || '.';
    
    if (targetPath !== '.' && !isPathSafe(targetPath, projectPath)) {
      return {
        toolCallId: '',
        name: 'project_list_files',
        success: false,
        error: 'Invalid directory path - must be within project directory',
      };
    }
    
    const expandedProject = expandPath(projectPath);
    const fullPath = path.resolve(expandedProject, targetPath);
    
    let files: Array<{ name: string; path: string; type: string; size?: number }>;
    
    if (recursive) {
      files = await listFilesRecursive(fullPath, fullPath);
    } else {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      files = await Promise.all(
        entries.map(async (entry) => {
          const entryPath = path.join(fullPath, entry.name);
          if (entry.isDirectory()) {
            return { name: entry.name, path: entry.name, type: 'directory' as const };
          } else {
            const stat = await fs.stat(entryPath);
            return { name: entry.name, path: entry.name, type: 'file' as const, size: stat.size };
          }
        })
      );
    }
    
    // Sort: directories first, then alphabetically
    files.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    
    return {
      toolCallId: '',
      name: 'project_list_files',
      success: true,
      result: {
        directory: targetPath || '(root)',
        files: files,
        totalFiles: files.filter(f => f.type === 'file').length,
        totalDirectories: files.filter(f => f.type === 'directory').length,
      },
      displayType: 'list',
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        toolCallId: '',
        name: 'project_list_files',
        success: false,
        error: `Directory not found: ${dirPath || '(root)'}`,
      };
    }
    return {
      toolCallId: '',
      name: 'project_list_files',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list files',
    };
  }
}

export async function executeProjectDeleteFile(
  filePath: string,
  projectPath: string
): Promise<ToolResult> {
  try {
    if (!isPathSafe(filePath, projectPath)) {
      return {
        toolCallId: '',
        name: 'project_delete_file',
        success: false,
        error: 'Invalid file path - must be within project directory',
      };
    }
    
    const expandedProject = expandPath(projectPath);
    const fullPath = path.resolve(expandedProject, filePath);
    
    // Check if it's a file (not directory)
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      return {
        toolCallId: '',
        name: 'project_delete_file',
        success: false,
        error: 'Cannot delete directories with this tool',
      };
    }
    
    await fs.unlink(fullPath);
    
    return {
      toolCallId: '',
      name: 'project_delete_file',
      success: true,
      result: {
        message: `Deleted file: ${filePath}`,
        path: filePath,
      },
      displayType: 'text',
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        toolCallId: '',
        name: 'project_delete_file',
        success: false,
        error: `File not found: ${filePath}`,
      };
    }
    return {
      toolCallId: '',
      name: 'project_delete_file',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file',
    };
  }
}
