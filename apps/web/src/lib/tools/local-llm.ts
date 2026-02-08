// Local LLM Tool - Allows Claude to delegate tasks to Ollama/LM Studio
// This enables the "head agent" architecture where Claude orchestrates local models

// Direct calls to local providers (runs server-side in API routes)
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const LMSTUDIO_URL = process.env.LMSTUDIO_URL || 'http://localhost:1234';

export interface LocalLLMRequest {
  prompt: string;
  model?: string;
  provider?: 'ollama' | 'lmstudio';
  temperature?: number;
  maxTokens?: number;
  task?: string;
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
  const temperature = request.temperature ?? 0.7;
  const maxTokens = request.maxTokens ?? 2048;
  
  console.log(`[LocalLLM] Delegating to ${provider}: "${request.task || request.prompt.slice(0, 50)}..."`);
  
  try {
    let content: string;
    let usedModel: string;
    
    if (provider === 'lmstudio') {
      // LM Studio uses OpenAI-compatible API
      const res = await fetch(`${LMSTUDIO_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer lm-studio',
        },
        body: JSON.stringify({
          model: request.model || 'default',
          messages: [{ role: 'user', content: request.prompt }],
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`LM Studio error: ${res.status} - ${error}`);
      }
      
      const data = await res.json();
      content = data.choices?.[0]?.message?.content || '';
      usedModel = data.model || request.model || 'lmstudio';
      
    } else {
      // Ollama
      let targetModel = request.model;
      
      // Get default model if none specified
      if (!targetModel) {
        try {
          const tagsRes = await fetch(`${OLLAMA_URL}/api/tags`);
          if (tagsRes.ok) {
            const tags = await tagsRes.json();
            targetModel = tags.models?.[0]?.name || 'llama3.2';
          }
        } catch {
          targetModel = 'llama3.2';
        }
      }
      
      const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: targetModel,
          prompt: request.prompt,
          stream: false,
          options: {
            temperature,
            num_predict: maxTokens,
          },
        }),
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Ollama error: ${res.status} - ${error}`);
      }
      
      const data = await res.json();
      content = data.response || '';
      usedModel = targetModel || 'unknown';
    }
    
    console.log(`[LocalLLM] Got response from ${usedModel} (${Date.now() - startTime}ms)`);
    
    return {
      success: true,
      content,
      model: usedModel,
      provider,
      durationMs: Date.now() - startTime,
    };
    
  } catch (error) {
    console.error('[LocalLLM] Error:', error);
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
