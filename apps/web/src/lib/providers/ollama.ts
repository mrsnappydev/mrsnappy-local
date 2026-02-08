// Ollama Provider Implementation
// Uses Next.js API proxy to avoid CORS issues

import {
  ModelProvider,
  ProviderType,
  ModelInfo,
  ProviderStatus,
  ChatRequest,
  ChatResponse,
  ChatMessage,
} from './types';

interface ProxyStatusResponse {
  connected: boolean;
  models: ModelInfo[];
  error?: string;
  baseUrl: string;
}

export class OllamaProvider implements ModelProvider {
  type: ProviderType = 'ollama';
  name = 'Ollama';
  baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    // Note: baseUrl is kept for interface compatibility but actual URL is server-side
    this.baseUrl = baseUrl;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const res = await fetch('/api/providers/ollama/status', {
        signal: AbortSignal.timeout(5000),
      });
      const data: ProxyStatusResponse = await res.json();
      return data.connected;
    } catch {
      return false;
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    try {
      const res = await fetch('/api/providers/ollama/status');
      if (!res.ok) return [];

      const data: ProxyStatusResponse = await res.json();
      return data.models || [];
    } catch {
      return [];
    }
  }

  async getStatus(): Promise<ProviderStatus> {
    try {
      // Pass the configured URL to the API so it can check the right server
      const urlParam = this.baseUrl !== 'http://localhost:11434' 
        ? `?url=${encodeURIComponent(this.baseUrl)}` 
        : '';
      const res = await fetch(`/api/providers/ollama/status${urlParam}`);
      const data: ProxyStatusResponse = await res.json();
      
      if (!data.connected) {
        return { connected: false, error: data.error || 'Cannot connect to Ollama', models: [] };
      }
      
      // Update baseUrl from server response
      if (data.baseUrl) {
        this.baseUrl = data.baseUrl;
      }
      
      return { connected: true, models: data.models || [] };
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

    const res = await fetch('/api/providers/ollama/chat', {
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
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Ollama error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return {
      content: data.content || '',
      model: data.model,
      done: data.done,
    };
  }

  async chatStream(request: ChatRequest): Promise<ReadableStream<Uint8Array>> {
    const messages = this.prepareMessages(request);

    const res = await fetch('/api/providers/ollama/chat', {
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
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Ollama stream error: ${res.status} ${res.statusText}`);
    }

    // The proxy already returns SSE format, so just pass it through
    return res.body;
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
