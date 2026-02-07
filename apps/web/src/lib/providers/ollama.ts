// Ollama Provider Implementation

import {
  ModelProvider,
  ProviderType,
  ModelInfo,
  ProviderStatus,
  ChatRequest,
  ChatResponse,
  ChatMessage,
} from './types';

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

interface OllamaChatResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export class OllamaProvider implements ModelProvider {
  type: ProviderType = 'ollama';
  name = 'Ollama';
  baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (!res.ok) return [];

      const data: OllamaTagsResponse = await res.json();
      return (data.models || []).map((m) => ({
        id: m.name,
        name: m.name,
        size: m.size,
        modified: m.modified_at,
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
        return { connected: false, error: 'Cannot connect to Ollama', models: [] };
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

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        messages,
        stream: false,
        ...(request.temperature !== undefined && { options: { temperature: request.temperature } }),
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
    }

    const data: OllamaChatResponse = await res.json();
    return {
      content: data.message?.content || '',
      model: data.model,
      done: data.done,
    };
  }

  async chatStream(request: ChatRequest): Promise<ReadableStream<Uint8Array>> {
    const messages = this.prepareMessages(request);

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        messages,
        stream: true,
        ...(request.temperature !== undefined && { options: { temperature: request.temperature } }),
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Ollama stream error: ${res.status} ${res.statusText}`);
    }

    // Transform Ollama's NDJSON stream to SSE format
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    return res.body.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          const text = decoder.decode(chunk);
          const lines = text.split('\n').filter((line) => line.trim());

          for (const line of lines) {
            try {
              const json: OllamaChatResponse = JSON.parse(line);
              if (json.message?.content) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ content: json.message.content, done: json.done })}\n\n`
                  )
                );
              }
              if (json.done) {
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              }
            } catch {
              // Skip malformed JSON
            }
          }
        },
      })
    );
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
