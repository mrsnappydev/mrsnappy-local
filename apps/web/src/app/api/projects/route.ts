import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Project } from '@/lib/projects/types';

// Expand ~ to home directory
function expandPath(p: string): string {
  if (p.startsWith('~/')) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

// POST - Create a new project folder
export async function POST(req: NextRequest) {
  try {
    const project: Project = await req.json();
    
    if (!project.path || !project.name) {
      return NextResponse.json(
        { error: 'Missing project path or name' },
        { status: 400 }
      );
    }
    
    // Expand the path
    const fullPath = expandPath(project.path);
    
    // Security check: don't allow paths outside home directory
    const homeDir = os.homedir();
    if (!fullPath.startsWith(homeDir)) {
      return NextResponse.json(
        { error: 'Project path must be within your home directory' },
        { status: 400 }
      );
    }
    
    // Check if folder already exists
    try {
      await fs.access(fullPath);
      return NextResponse.json(
        { error: 'A folder with this name already exists' },
        { status: 409 }
      );
    } catch {
      // Good - folder doesn't exist
    }
    
    // Create the project folder
    await fs.mkdir(fullPath, { recursive: true });
    
    // Create default subfolders
    const subfolders = ['code', 'docs', 'assets', 'notes'];
    for (const subfolder of subfolders) {
      await fs.mkdir(path.join(fullPath, subfolder), { recursive: true });
    }
    
    // Create a README.md
    const readme = `# ${project.name}

${project.description || 'A MrSnappy project.'}

## Project Structure

- \`code/\` - Source code and scripts
- \`docs/\` - Documentation
- \`assets/\` - Images, media, and other assets
- \`notes/\` - Notes and drafts

Created: ${new Date().toISOString()}
`;
    await fs.writeFile(path.join(fullPath, 'README.md'), readme, 'utf-8');
    
    return NextResponse.json({ 
      success: true, 
      path: fullPath,
      message: 'Project folder created successfully'
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project folder' },
      { status: 500 }
    );
  }
}

// GET - List projects and their folders
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const basePath = searchParams.get('basePath') || '~/MrSnappy-Projects';
    
    const fullBasePath = expandPath(basePath);
    
    // Check if base path exists
    try {
      await fs.access(fullBasePath);
    } catch {
      // Base path doesn't exist yet - that's okay
      return NextResponse.json({ 
        projects: [],
        basePath: fullBasePath
      });
    }
    
    // List directories in the base path
    const entries = await fs.readdir(fullBasePath, { withFileTypes: true });
    const projectFolders = entries
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        name: entry.name,
        path: path.join(fullBasePath, entry.name),
      }));
    
    // Get stats for each folder
    const projectsWithStats = await Promise.all(
      projectFolders.map(async (folder) => {
        try {
          const stat = await fs.stat(folder.path);
          return {
            ...folder,
            modifiedAt: stat.mtime.getTime(),
          };
        } catch {
          return folder;
        }
      })
    );
    
    return NextResponse.json({ 
      projects: projectsWithStats,
      basePath: fullBasePath
    });
  } catch (error) {
    console.error('Error listing projects:', error);
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    );
  }
}
