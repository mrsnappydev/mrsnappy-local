import { NextRequest, NextResponse } from 'next/server';
import { executeTool, getTool } from '@/lib/tools';
import { ToolCall } from '@/lib/tools/types';

interface ExecuteRequest {
  toolCalls: ToolCall[];
}

export async function POST(request: NextRequest) {
  try {
    const { toolCalls } = await request.json() as ExecuteRequest;
    
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
