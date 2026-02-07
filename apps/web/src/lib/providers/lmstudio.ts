// LM Studio Provider Implementation (OpenAI-compatible)

import {
  ModelProvider,
  ProviderType,
  ModelInfo,
  ProviderStatus,
  ChatRequest,
  ChatResponse,
  ChatMessage,
} from './types';

interface OpenAIModel {
  id: string;
  object: string;
  owned_by: string;
}

interface OpenAIModelsResponse {
  data: OpenAIModel[];
}

interface OpenAIChatMessage {
  role: string;
  content: string;
}

interface OpenAIChatChoice {
  index: number;
  message: OpenAIChatMessage;
  finish_reason: string;
}

interface OpenAIChatResponse {
  id: string;
  model: string;
  choices: OpenAIChatChoice[];
}

interface OpenAIStreamDelta {
  role?: string;
  content?: string;
}

interface OpenAIStreamChoice {
  index: number;
  delta: OpenAIStreamDelta;
  finish_reason: string | null;
}

interface OpenAIStreamChunk {
  id: string;
  model: string;
  choices: OpenAIStreamChoice[];
}

export class LMStudioProvider implements ModelProvider {
  type: ProviderType = 'lmstudio';
  name = 'LM Studio';
  baseUrl: string;
  apiKey: string;

  constructor(baseUrl: string = 'http://localhost:1234', apiKey: string = 'lm-studio') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/models`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/models`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) return [];

      const data: OpenAIModelsResponse = await res.json();
      return (data.data || []).map((m) => ({
        id: m.id,
        name: m.id,
        provider: this.type,
      }));
    } catch {
      return [];
    }
  }

  async getStatus(): Promise<ProviderStatus> {
    try {
      const connected = await this.checkConnection();
      if (!connected) {
        return { connected: false, error: 'Cannot connect to LM Studio', models: [] };
      }
      const models = await this.getModels();
      return { connected: true, models };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        models: [],
      };
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const messages = this.prepareMessages(request);

    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: request.model,
        messages,
        stream: false,
        ...(request.temperature !== undefined && { temperature: request.temperature }),
        ...(request.maxTokens !== undefined && { max_tokens: request.maxTokens }),
      }),
    });

    if (!res.ok) {
      throw new Error(`LM Studio error: ${res.status} ${res.statusText}`);
    }

    const data: OpenAIChatResponse = await res.json();
    const choice = data.choices[0];
    
    return {
      content: choice?.message?.content || '',
      model: data.model,
      done: true,
    };
  }

  async chatStream(request: ChatRequest): Promise<ReadableStream<Uint8Array>> {
    const messages = this.prepareMessages(request);

    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: request.model,
        messages,
        stream: true,
        ...(request.temperature !== undefined && { temperature: request.temperature }),
        ...(request.maxTokens !== undefined && { max_tokens: request.maxTokens }),
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`LM Studio stream error: ${res.status} ${res.statusText}`);
    }

    // Transform OpenAI SSE stream to our unified SSE format
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';

    return res.body.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          buffer += decoder.decode(chunk, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6); // Remove "data: " prefix
            if (data === '[DONE]') {
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              continue;
            }

            try {
              const json: OpenAIStreamChunk = JSON.parse(data);
              const delta = json.choices[0]?.delta;
              if (delta?.content) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ 
                      content: delta.content, 
                      done: json.choices[0]?.finish_reason === 'stop' 
                    })}\n\n`
                  )
                );
              }
              if (json.choices[0]?.finish_reason === 'stop') {
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              }
            } catch {
              // Skip malformed JSON
            }
          }
        },
        flush(controller) {
          // Process any remaining buffer
          if (buffer.trim()) {
            const trimmed = buffer.trim();
            if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
              try {
                const data = trimmed.slice(6);
                const json: OpenAIStreamChunk = JSON.parse(data);
                const delta = json.choices[0]?.delta;
                if (delta?.content) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ content: delta.content, done: true })}\n\n`
                    )
                  );
                }
              } catch {
                // Ignore
              }
            }
          }
        },
      })
    );
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private prepareMessages(request: ChatRequest): ChatMessage[] {
    const messages: ChatMessage[] = [];
    
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    
    messages.push(...request.messages);
    return messages;
  }
}
