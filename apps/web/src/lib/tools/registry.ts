// Tool Registry for MrSnappy Local
// Central registry of all available tools

import { ToolDefinition, ToolCall, ToolResult, toolToLLMFormat, ToolForLLM } from './types';
import { webSearchTool, imageSearchTool, executeWebSearch, executeImageSearch } from './web-search';
import { 
  gmailTools, 
  executeGmailListInbox, 
  executeGmailReadEmail, 
  executeGmailSendEmail,
  executeGmailSearch,
  executeGmailReply,
} from './gmail';
import { IntegrationState } from '../integrations/types';

// All available tools
const ALL_TOOLS: ToolDefinition[] = [
  webSearchTool,
  imageSearchTool,
  ...gmailTools,
  // Add more tools here as we build them
];

// Tool executors mapped by name
type ToolExecutor = (args: Record<string, unknown>) => Promise<ToolResult>;

const TOOL_EXECUTORS: Record<string, ToolExecutor> = {
  // Web Search
  'web_search': async (args) => {
    const query = args.query as string;
    const limit = (args.limit as number) || 5;
    return executeWebSearch(query, limit);
  },
  
  // Image Search
  'image_search': async (args) => {
    const query = args.query as string;
    const count = (args.count as number) || 6;
    return executeImageSearch(query, count);
  },
  
  // Gmail Tools
  'gmail_list_inbox': async (args) => {
    const maxResults = (args.maxResults as number) || 10;
    const unreadOnly = (args.unreadOnly as boolean) || false;
    return executeGmailListInbox(maxResults, unreadOnly);
  },
  
  'gmail_read_email': async (args) => {
    const emailId = args.emailId as string;
    return executeGmailReadEmail(emailId);
  },
  
  'gmail_send_email': async (args) => {
    const to = args.to as string;
    const subject = args.subject as string;
    const body = args.body as string;
    const cc = args.cc as string | undefined;
    return executeGmailSendEmail(to, subject, body, cc);
  },
  
  'gmail_search': async (args) => {
    const query = args.query as string;
    const maxResults = (args.maxResults as number) || 10;
    return executeGmailSearch(query, maxResults);
  },
  
  'gmail_reply': async (args) => {
    const emailId = args.emailId as string;
    const body = args.body as string;
    return executeGmailReply(emailId, body);
  },
  
  // Add more executors here
};

/**
 * Get tools available for the current integration state
 */
export function getAvailableTools(integrations: IntegrationState[]): ToolDefinition[] {
  const enabledIntegrations = new Set(
    integrations.filter(i => i.enabled && i.status !== 'error').map(i => i.type)
  );
  
  return ALL_TOOLS.filter(tool => enabledIntegrations.has(tool.integration as IntegrationState['type']));
}

/**
 * Get tools in LLM-compatible format
 */
export function getToolsForLLM(integrations: IntegrationState[]): ToolForLLM[] {
  return getAvailableTools(integrations).map(toolToLLMFormat);
}

/**
 * Execute a tool call
 */
export async function executeTool(call: ToolCall): Promise<ToolResult> {
  const executor = TOOL_EXECUTORS[call.name];
  
  if (!executor) {
    return {
      toolCallId: call.id,
      name: call.name,
      success: false,
      error: `Unknown tool: ${call.name}`,
    };
  }
  
  try {
    const result = await executor(call.arguments);
    return {
      ...result,
      toolCallId: call.id,
    };
  } catch (error) {
    return {
      toolCallId: call.id,
      name: call.name,
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed',
    };
  }
}

/**
 * Execute multiple tool calls
 */
export async function executeTools(calls: ToolCall[]): Promise<ToolResult[]> {
  return Promise.all(calls.map(executeTool));
}

/**
 * Get a tool definition by name
 */
export function getTool(name: string): ToolDefinition | undefined {
  return ALL_TOOLS.find(t => t.name === name);
}

/**
 * Get all tool definitions
 */
export function getAllTools(): ToolDefinition[] {
  return [...ALL_TOOLS];
}

/**
 * Build system prompt addition for tools
 */
export function buildToolsSystemPrompt(integrations: IntegrationState[]): string {
  const tools = getAvailableTools(integrations);
  
  if (tools.length === 0) {
    return '';
  }
  
  let prompt = '\n\n## Available Tools\n\n';
  prompt += 'You have access to the following tools. To use a tool, wrap your call in <tool_call> tags with JSON:\n\n';
  prompt += '```\n<tool_call>{"name": "tool_name", "arguments": {"param": "value"}}</tool_call>\n```\n\n';
  prompt += 'Available tools:\n\n';
  
  for (const tool of tools) {
    prompt += `### ${tool.icon} ${tool.displayName} (${tool.name})\n`;
    prompt += `${tool.description}\n\n`;
    prompt += 'Parameters:\n';
    for (const param of tool.parameters) {
      const required = param.required ? ' (required)' : ' (optional)';
      prompt += `- **${param.name}** (${param.type})${required}: ${param.description}\n`;
    }
    prompt += '\n';
  }
  
  prompt += 'When you need information you don\'t have, use the appropriate tool. Always explain what you\'re doing before calling a tool.\n';
  
  return prompt;
}
