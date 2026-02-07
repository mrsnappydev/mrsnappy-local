import { NextRequest, NextResponse } from 'next/server';
import { executeTool, getTool } from '@/lib/tools';
import { ToolCall, ToolResult } from '@/lib/tools/types';
import {
  executeProjectCreateFile,
  executeProjectReadFile,
  executeProjectListFiles,
  executeProjectDeleteFile,
} from '@/lib/tools/project-files-server';

interface ExecuteRequest {
  toolCalls: ToolCall[];
  projectPath?: string | null;
}

// Execute project tools server-side
async function executeProjectTool(call: ToolCall, projectPath: string | null): Promise<ToolResult> {
  if (!projectPath) {
    return {
      toolCallId: call.id,
      name: call.name,
      success: false,
      error: 'No project is currently active. Please select a project first.',
    };
  }
  
  const args = call.arguments;
  
  switch (call.name) {
    case 'project_create_file': {
      const result = await executeProjectCreateFile(
        args.path as string,
        args.content as string,
        (args.overwrite as boolean) || false,
        projectPath
      );
      return { ...result, toolCallId: call.id };
    }
    
    case 'project_read_file': {
      const result = await executeProjectReadFile(
        args.path as string,
        projectPath
      );
      return { ...result, toolCallId: call.id };
    }
    
    case 'project_list_files': {
      const result = await executeProjectListFiles(
        (args.path as string) || '',
        (args.recursive as boolean) || false,
        projectPath
      );
      return { ...result, toolCallId: call.id };
    }
    
    case 'project_delete_file': {
      const result = await executeProjectDeleteFile(
        args.path as string,
        projectPath
      );
      return { ...result, toolCallId: call.id };
    }
    
    default:
      return {
        toolCallId: call.id,
        name: call.name,
        success: false,
        error: `Unknown project tool: ${call.name}`,
      };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { toolCalls, projectPath } = await request.json() as ExecuteRequest;
    
    if (!toolCalls || !Array.isArray(toolCalls) || toolCalls.length === 0) {
      return NextResponse.json(
        { error: 'No tool calls provided' },
        { status: 400 }
      );
    }
    
    const results = await Promise.all(
      toolCalls.map(async (call) => {
        // Validate tool exists
        const tool = getTool(call.name);
        if (!tool) {
          return {
            toolCallId: call.id,
            name: call.name,
            success: false,
            error: `Unknown tool: ${call.name}`,
          };
        }
        
        // Handle project tools specially (server-side execution)
        if (tool.integration === 'projects') {
          return executeProjectTool(call, projectPath || null);
        }
        
        return executeTool(call);
      })
    );
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Tool execution error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Tool execution failed' },
      { status: 500 }
    );
  }
}
