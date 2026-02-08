// Local LLM Tool - Allows Claude to delegate tasks to Ollama/LM Studio
// This enables the "head agent" architecture where Claude orchestrates local models

export interface LocalLLMRequest {
  prompt: string;
  model?: string;      // Specific model to use, or 'auto' for default
  provider?: 'ollama' | 'lmstudio';
  temperature?: number;
  maxTokens?: number;
  task?: string;       // Description of the task (for logging)
}

export interface LocalLLMResponse {
  success: boolean;
  content?: string;
  model?: string;
  provider?: string;
  error?: string;
  durationMs?: number;
}

export async function callLocalLLM(request: LocalLLMRequest): Promise<LocalLLMResponse> {
  const startTime = Date.now();
  const provider = request.provider || 'ollama';
  
  console.log(`[LocalLLM] Delegating to ${provider}: "${request.task || request.prompt.slice(0, 50)}..."`);
  
  try {
    // Call our internal API to reach the local LLM
    const res = await fetch('/api/tools/local-llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: request.prompt,
        model: request.model,
        provider,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      }),
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        error: error.error || `Local LLM error: ${res.status}`,
      };
    }
    
    const data = await res.json();
    
    return {
      success: true,
      content: data.content,
      model: data.model,
      provider: data.provider,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to call local LLM',
    };
  }
}

// Tool definition for Claude's tool use
export const localLLMToolDefinition = {
  name: 'local_llm',
  description: `Delegate a task to a local LLM (Ollama or LM Studio) running on the user's machine. 
Use this for:
- Long-form content generation (stories, articles, code)
- Tasks that benefit from a different model's strengths
- Privacy-sensitive content that should stay local
- Reducing API costs for simple generation tasks

The local model will process the prompt and return the result.`,
  input_schema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The prompt to send to the local LLM. Be specific and include all context needed.',
      },
      task: {
        type: 'string',
        description: 'Brief description of what this task is (for logging)',
      },
      model: {
        type: 'string',
        description: 'Specific model to use (e.g., "llama3.2", "codellama"). Leave empty for default.',
      },
      provider: {
        type: 'string',
        enum: ['ollama', 'lmstudio'],
        description: 'Which local provider to use. Default: ollama',
      },
    },
    required: ['prompt'],
  },
};
