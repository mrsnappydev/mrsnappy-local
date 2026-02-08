// Tool Registry for MrSnappy Local
// Central registry of all available tools

import { ToolDefinition, ToolCall, ToolResult, toolToLLMFormat, ToolForLLM } from './types';
import { webSearchTool, imageSearchTool, executeWebSearch, executeImageSearch } from './web-search';
import { callLocalLLM } from './local-llm';
import { 
  gmailTools, 
  executeGmailListInbox, 
  executeGmailReadEmail, 
  executeGmailSendEmail,
  executeGmailSearch,
  executeGmailReply,
} from './gmail';
import {
  calendarTools,
  executeCalendarListEvents,
  executeCalendarGetEvent,
  executeCalendarCreateEvent,
  executeCalendarUpdateEvent,
  executeCalendarDeleteEvent,
  executeCalendarQuickAdd,
  executeCalendarFindFreeTime,
  executeCalendarSearch,
} from './calendar';
import { projectTools } from './project-files';
import { chartTool, executeChartCreate, ChartDataset } from './charts';
import { diagramTool, executeDiagramCreate, getDiagramToolPrompt } from './diagrams';
// Note: project tool executors are in project-files-server.ts and called from API routes
import { IntegrationState } from '../integrations/types';

// Local LLM Tool - Allows Claude to delegate to Ollama/LM Studio
const localLLMTool: ToolDefinition = {
  name: 'local_llm',
  displayName: 'Local LLM',
  icon: '🦙',
  description: `Delegate a task to a local LLM (Ollama or LM Studio) running on the user's machine. Use this for long-form content generation, privacy-sensitive tasks, or to reduce API costs.`,
  integration: 'local', // Always available
  parameters: [
    {
      name: 'prompt',
      type: 'string',
      description: 'The prompt to send to the local LLM. Be specific and include all context needed.',
      required: true,
    },
    {
      name: 'task',
      type: 'string',
      description: 'Brief description of what this task is (shown to user)',
      required: false,
    },
    {
      name: 'model',
      type: 'string',
      description: 'Specific model to use (e.g., "llama3.2", "codellama"). Leave empty for default.',
      required: false,
    },
    {
      name: 'provider',
      type: 'string',
      description: 'Which local provider to use: "ollama" or "lmstudio". Default: ollama',
      required: false,
      enum: ['ollama', 'lmstudio'],
    },
  ],
};

// All available tools
const ALL_TOOLS: ToolDefinition[] = [
  webSearchTool,
  imageSearchTool,
  ...gmailTools,
  ...calendarTools,
  ...projectTools,
  chartTool,
  diagramTool,
  localLLMTool, // Local LLM delegation (Ollama/LM Studio)
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
  
  // Calendar Tools
  'calendar_list_events': async (args) => {
    const timeFrame = (args.timeFrame as string) || 'week';
    const startDate = args.startDate as string | undefined;
    const endDate = args.endDate as string | undefined;
    const maxResults = (args.maxResults as number) || 10;
    return executeCalendarListEvents(timeFrame, startDate, endDate, maxResults);
  },
  
  'calendar_get_event': async (args) => {
    const eventId = args.eventId as string;
    return executeCalendarGetEvent(eventId);
  },
  
  'calendar_create_event': async (args) => {
    const summary = args.summary as string;
    const startTime = args.startTime as string;
    const endTime = args.endTime as string | undefined;
    const description = args.description as string | undefined;
    const location = args.location as string | undefined;
    const attendees = args.attendees as string | undefined;
    const isAllDay = (args.isAllDay as boolean) || false;
    const addMeet = (args.addMeet as boolean) || false;
    return executeCalendarCreateEvent(summary, startTime, endTime, description, location, attendees, isAllDay, addMeet);
  },
  
  'calendar_update_event': async (args) => {
    const eventId = args.eventId as string;
    const summary = args.summary as string | undefined;
    const startTime = args.startTime as string | undefined;
    const endTime = args.endTime as string | undefined;
    const description = args.description as string | undefined;
    const location = args.location as string | undefined;
    return executeCalendarUpdateEvent(eventId, summary, startTime, endTime, description, location);
  },
  
  'calendar_delete_event': async (args) => {
    const eventId = args.eventId as string;
    return executeCalendarDeleteEvent(eventId);
  },
  
  'calendar_quick_add': async (args) => {
    const text = args.text as string;
    return executeCalendarQuickAdd(text);
  },
  
  'calendar_find_free_time': async (args) => {
    const date = args.date as string | undefined;
    const daysToSearch = (args.daysToSearch as number) || 7;
    const minDuration = (args.minDuration as number) || 30;
    const workingHoursOnly = args.workingHoursOnly !== false;
    return executeCalendarFindFreeTime(date, daysToSearch, minDuration, workingHoursOnly);
  },
  
  'calendar_search': async (args) => {
    const query = args.query as string;
    const maxResults = (args.maxResults as number) || 10;
    return executeCalendarSearch(query, maxResults);
  },
  
  // Chart Tool
  'chart_create': async (args) => {
    const chartType = args.chartType as string;
    const labels = args.labels as string[];
    const datasets = args.datasets as ChartDataset[];
    const title = args.title as string | undefined;
    return executeChartCreate(chartType, labels, datasets, title);
  },
  
  // Diagram Tool
  'diagram_create': async (args) => {
    const diagramType = args.diagramType as string;
    const code = args.code as string;
    const title = args.title as string | undefined;
    return executeDiagramCreate(diagramType, code, title);
  },
  
  // Local LLM Delegation Tool
  'local_llm': async (args) => {
    const prompt = args.prompt as string;
    const task = args.task as string | undefined;
    const model = args.model as string | undefined;
    const provider = args.provider as 'ollama' | 'lmstudio' | undefined;
    
    const result = await callLocalLLM({ prompt, task, model, provider });
    
    if (result.success) {
      return {
        toolCallId: '',
        name: 'local_llm',
        success: true,
        result: `**Local LLM Response** (${result.model} via ${result.provider}, ${result.durationMs}ms):\n\n${result.content}`,
      };
    } else {
      return {
        toolCallId: '',
        name: 'local_llm',
        success: false,
        error: result.error || 'Failed to get response from local LLM',
      };
    }
  },
  
  // Project Tools - these are registered but executed via API route
  // See /api/tools/execute/route.ts which imports project-files-server.ts
  'project_create_file': async () => ({
    toolCallId: '',
    name: 'project_create_file',
    success: false,
    error: 'Project tools must be executed via API route',
  }),
  
  'project_read_file': async () => ({
    toolCallId: '',
    name: 'project_read_file',
    success: false,
    error: 'Project tools must be executed via API route',
  }),
  
  'project_list_files': async () => ({
    toolCallId: '',
    name: 'project_list_files',
    success: false,
    error: 'Project tools must be executed via API route',
  }),
  
  'project_delete_file': async () => ({
    toolCallId: '',
    name: 'project_delete_file',
    success: false,
    error: 'Project tools must be executed via API route',
  }),
};

/**
 * Get tools available for the current integration state
 * @param integrations - Enabled integrations
 * @param activeProjectPath - If set, project tools are available
 */
export function getAvailableTools(integrations: IntegrationState[], activeProjectPath?: string | null): ToolDefinition[] {
  const enabledIntegrations = new Set(
    integrations.filter(i => i.enabled && i.status !== 'error').map(i => i.type)
  );
  
  return ALL_TOOLS.filter(tool => {
    // Project tools are available when a project is active
    if (tool.integration === 'projects') {
      return !!activeProjectPath;
    }
    // Visual tools (charts, diagrams) are always available
    if (tool.integration === 'visuals') {
      return true;
    }
    // Local LLM tool is always available (for delegation to Ollama/LM Studio)
    if (tool.integration === 'local') {
      return true;
    }
    return enabledIntegrations.has(tool.integration as IntegrationState['type']);
  });
}

/**
 * Get tools in LLM-compatible format
 */
export function getToolsForLLM(integrations: IntegrationState[], activeProjectPath?: string | null): ToolForLLM[] {
  return getAvailableTools(integrations, activeProjectPath).map(toolToLLMFormat);
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
 * @param integrations - Enabled integrations
 * @param activeProjectPath - If set, project tools are available
 * @param projectName - Name of the active project (for context)
 */
export function buildToolsSystemPrompt(
  integrations: IntegrationState[], 
  activeProjectPath?: string | null,
  projectName?: string | null
): string {
  const tools = getAvailableTools(integrations, activeProjectPath);
  
  if (tools.length === 0 && !activeProjectPath) {
    return '';
  }
  
  let prompt = '';
  
  // Add project context if active
  if (activeProjectPath && projectName) {
    prompt += `\n\n## Current Project Context\n\n`;
    prompt += `You are working in a project workspace:\n`;
    prompt += `- **Project Name:** ${projectName}\n`;
    prompt += `- **Project Path:** ${activeProjectPath}\n\n`;
    prompt += `When the user asks you to create, read, or modify files, assume they want to work within this project folder unless they specify otherwise.\n`;
  }
  
  if (tools.length > 0) {
    prompt += '\n\n## Available Tools\n\n';
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
    
    // Add diagram examples if diagram tool is available
    if (tools.some(t => t.name === 'diagram_create')) {
      prompt += getDiagramToolPrompt();
    }
  }
  
  return prompt;
}
