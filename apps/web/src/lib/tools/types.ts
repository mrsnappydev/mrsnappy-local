// Tool Types for MrSnappy Local
// Tools are capabilities the LLM can invoke

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
  enum?: string[]; // For constrained choices
}

export interface ToolDefinition {
  name: string;
  description: string;
  integration: string; // Which integration provides this tool
  parameters: ToolParameter[];
  // For display in chat
  displayName: string;
  icon: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  success: boolean;
  result?: unknown;
  error?: string;
  // For rendering in UI
  displayType?: 'text' | 'json' | 'list' | 'table' | 'email' | 'search-results' | 'image-results';
}

// Message with potential tool calls
export interface ToolMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolResult?: ToolResult;
}

// Format for sending tools to LLM (OpenAI-compatible format)
export interface ToolForLLM {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
        default?: unknown;
      }>;
      required: string[];
    };
  };
}

/**
 * Convert our tool definition to OpenAI-compatible format
 */
export function toolToLLMFormat(tool: ToolDefinition): ToolForLLM {
  const properties: Record<string, {
    type: string;
    description: string;
    enum?: string[];
    default?: unknown;
  }> = {};
  
  const required: string[] = [];
  
  for (const param of tool.parameters) {
    properties[param.name] = {
      type: param.type,
      description: param.description,
    };
    if (param.enum) {
      properties[param.name].enum = param.enum;
    }
    if (param.default !== undefined) {
      properties[param.name].default = param.default;
    }
    if (param.required) {
      required.push(param.name);
    }
  }
  
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties,
        required,
      },
    },
  };
}

/**
 * Parse tool calls from assistant response
 * Supports multiple formats:
 * 1. OpenAI-style tool_calls array
 * 2. XML-style <tool_call> tags (Claude/Anthropic style)
 * 3. JSON code blocks with tool calls
 */
export function parseToolCalls(content: string): ToolCall[] {
  const calls: ToolCall[] = [];
  
  // Try XML-style tool calls: <tool_call>{"name": "...", "arguments": {...}}</tool_call>
  const xmlRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
  let match;
  
  while ((match = xmlRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.name) {
        calls.push({
          id: `call_${Date.now()}_${calls.length}`,
          name: parsed.name,
          arguments: parsed.arguments || parsed.params || {},
        });
      }
    } catch {
      // Invalid JSON, skip
    }
  }
  
  if (calls.length > 0) return calls;
  
  // Try JSON code block style: ```json\n{"tool": "...", "arguments": {...}}\n```
  const jsonBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/g;
  
  while ((match = jsonBlockRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      // Check for tool call structure
      if (parsed.tool || parsed.name || parsed.function) {
        calls.push({
          id: `call_${Date.now()}_${calls.length}`,
          name: parsed.tool || parsed.name || parsed.function,
          arguments: parsed.arguments || parsed.params || parsed.input || {},
        });
      }
    } catch {
      // Invalid JSON, skip
    }
  }
  
  return calls;
}

/**
 * Format tool result for display
 */
export function formatToolResultForDisplay(result: ToolResult): string {
  if (!result.success) {
    return `❌ Error: ${result.error}`;
  }
  
  if (result.displayType === 'search-results' && Array.isArray(result.result)) {
    const items = result.result as Array<{ title: string; url: string; snippet: string }>;
    return items.map((item, i) => 
      `${i + 1}. **${item.title}**\n   ${item.snippet}\n   [${item.url}](${item.url})`
    ).join('\n\n');
  }
  
  if (typeof result.result === 'string') {
    return result.result;
  }
  
  return JSON.stringify(result.result, null, 2);
}
