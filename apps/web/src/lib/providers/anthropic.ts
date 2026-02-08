// Anthropic Claude Provider for MrSnappy Local
// Claude acts as the head agent - orchestrating tools and local models

import {
  ModelProvider,
  ProviderType,
  ModelInfo,
  ProviderStatus,
  ChatRequest,
  ChatResponse,
  ChatMessage,
} from './types';

interface AnthropicStatusResponse {
  connected: boolean;
  models: ModelInfo[];
  error?: string;
}

export class AnthropicProvider implements ModelProvider {
  type: ProviderType = 'anthropic';
  name = 'Claude (Anthropic)';
  baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string = '', baseUrl: string = 'https://api.anthropic.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async checkConnection(): Promise<boolean> {
    if (!this.apiKey) return false;
    
    try {
      const res = await fetch('/api/providers/anthropic/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: this.apiKey }),
        signal: AbortSignal.timeout(10000),
      });
      const data: AnthropicStatusResponse = await res.json();
      return data.connected;
    } catch {
      return false;
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    // Claude models are predefined
    return [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic' as ProviderType },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic' as ProviderType },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)', provider: 'anthropic' as ProviderType },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' as ProviderType },
    ];
  }

  async getStatus(): Promise<ProviderStatus> {
    if (!this.apiKey) {
      return { 
        connected: false, 
        error: 'API key not configured', 
        models: [] 
      };
    }

    try {
      const res = await fetch('/api/providers/anthropic/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: this.apiKey }),
      });
      const data: AnthropicStatusResponse = await res.json();
      
      if (!data.connected) {
        return { connected: false, error: data.error || 'Cannot connect to Anthropic', models: [] };
      }
      
      return { connected: true, models: await this.getModels() };
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

    const res = await fetch('/api/providers/anthropic/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: this.apiKey,
        model: request.model,
        messages,
        system: request.systemPrompt,
        stream: false,
        ...(request.temperature !== undefined && { temperature: request.temperature }),
        ...(request.maxTokens !== undefined && { max_tokens: request.maxTokens }),
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Anthropic error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return {
      content: data.content || '',
      model: data.model,
      done: true,
    };
  }

  async chatStream(request: ChatRequest): Promise<ReadableStream<Uint8Array>> {
    const messages = this.prepareMessages(request);

    const res = await fetch('/api/providers/anthropic/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: this.apiKey,
        model: request.model,
        messages,
        system: request.systemPrompt,
        stream: true,
        ...(request.temperature !== undefined && { temperature: request.temperature }),
        ...(request.maxTokens !== undefined && { max_tokens: request.maxTokens }),
      }),
    });

    if (!res.ok || !res.body) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Anthropic stream error: ${res.status} ${res.statusText}`);
    }

    return res.body;
  }

  private prepareMessages(request: ChatRequest): ChatMessage[] {
    // Filter out system messages (handled separately in Anthropic API)
    return request.messages.filter(m => m.role !== 'system');
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }
}
