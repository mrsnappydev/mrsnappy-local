import { NextRequest, NextResponse } from 'next/server';
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

// Recursively delete a directory
async function deleteDirectory(dirPath: string): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await deleteDirectory(fullPath);
    } else {
      await fs.unlink(fullPath);
    }
  }
  
  await fs.rmdir(dirPath);
}

// GET - Get project info and files
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const projectPath = searchParams.get('path');
    
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Missing project path' },
        { status: 400 }
      );
    }
    
    const fullPath = expandPath(projectPath);
    
    // Security check
    const homeDir = os.homedir();
    if (!fullPath.startsWith(homeDir)) {
      return NextResponse.json(
        { error: 'Invalid project path' },
        { status: 400 }
      );
    }
    
    // Check if folder exists
    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json(
        { error: 'Project folder not found' },
        { status: 404 }
      );
    }
    
    // List files in project
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(fullPath, entry.name);
        const stat = await fs.stat(entryPath);
        
        return {
          name: entry.name,
          path: entry.name, // relative path
          type: entry.isDirectory() ? 'directory' : 'file',
          size: entry.isFile() ? stat.size : undefined,
          modifiedAt: stat.mtime.getTime(),
        };
      })
    );
    
    // Sort: directories first, then by name
    files.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    
    return NextResponse.json({ 
      files,
      path: fullPath
    });
  } catch (error) {
    console.error('Error getting project info:', error);
    return NextResponse.json(
      { error: 'Failed to get project info' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a project folder
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const projectPath = body.path;
    
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Missing project path' },
        { status: 400 }
      );
    }
    
    const fullPath = expandPath(projectPath);
    
    // Security check: only allow deletion within home directory
    const homeDir = os.homedir();
    if (!fullPath.startsWith(homeDir)) {
      return NextResponse.json(
        { error: 'Invalid project path' },
        { status: 400 }
      );
    }
    
    // Additional safety: path must contain MrSnappy-Projects
    if (!fullPath.includes('MrSnappy-Projects')) {
      return NextResponse.json(
        { error: 'Can only delete folders within MrSnappy-Projects' },
        { status: 400 }
      );
    }
    
    // Check if folder exists
    try {
      await fs.access(fullPath);
    } catch {
      // Folder doesn't exist - that's fine
      return NextResponse.json({ 
        success: true, 
        message: 'Project folder already deleted'
      });
    }
    
    // Delete the folder recursively
    await deleteDirectory(fullPath);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Project folder deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project folder' },
      { status: 500 }
    );
  }
}

// PATCH - Update project (rename, move, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { path: projectPath, newPath, newName } = body;
    
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Missing project path' },
        { status: 400 }
      );
    }
    
    const fullPath = expandPath(projectPath);
    
    // Security check
    const homeDir = os.homedir();
    if (!fullPath.startsWith(homeDir)) {
      return NextResponse.json(
        { error: 'Invalid project path' },
        { status: 400 }
      );
    }
    
    // Check if folder exists
    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json(
        { error: 'Project folder not found' },
        { status: 404 }
      );
    }
    
    // Rename folder if newPath provided
    if (newPath) {
      const fullNewPath = expandPath(newPath);
      
      // Security check for new path
      if (!fullNewPath.startsWith(homeDir)) {
        return NextResponse.json(
          { error: 'Invalid new path' },
          { status: 400 }
        );
      }
      
      await fs.rename(fullPath, fullNewPath);
      
      return NextResponse.json({ 
        success: true, 
        path: fullNewPath,
        message: 'Project folder renamed successfully'
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}
