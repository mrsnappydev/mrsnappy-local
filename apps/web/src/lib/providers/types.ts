// Model Provider Types for MrSnappy Local

export type ProviderType = 'ollama' | 'lmstudio' | 'openai-compatible' | 'anthropic';

export interface ProviderConfig {
  type: ProviderType;
  name: string;
  baseUrl: string;
  apiKey?: string; // For OpenAI-compatible providers that need auth
}

export interface ModelInfo {
  id: string;
  name: string;
  size?: number; // bytes
  modified?: string; // ISO date
  provider: ProviderType;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  systemPrompt?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  model: string;
  done: boolean;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export interface ProviderStatus {
  connected: boolean;
  error?: string;
  models: ModelInfo[];
}

// Provider interface that all backends must implement
export interface ModelProvider {
  type: ProviderType;
  name: string;
  baseUrl: string;

  // Check if provider is available
  checkConnection(): Promise<boolean>;
  
  // Get available models
  getModels(): Promise<ModelInfo[]>;
  
  // Get provider status (connection + models)
  getStatus(): Promise<ProviderStatus>;
  
  // Non-streaming chat
  chat(request: ChatRequest): Promise<ChatResponse>;
  
  // Streaming chat - returns a ReadableStream
  chatStream(request: ChatRequest): Promise<ReadableStream<Uint8Array>>;
}

// Default provider configurations
export const DEFAULT_PROVIDERS: Record<ProviderType, ProviderConfig> = {
  ollama: {
    type: 'ollama',
    name: 'Ollama',
    baseUrl: 'http://localhost:11434',
  },
  lmstudio: {
    type: 'lmstudio',
    name: 'LM Studio',
    baseUrl: 'http://localhost:1234',
  },
  'openai-compatible': {
    type: 'openai-compatible',
    name: 'OpenAI Compatible',
    baseUrl: 'http://localhost:8080',
  },
  anthropic: {
    type: 'anthropic',
    name: 'Claude (Anthropic)',
    baseUrl: 'https://api.anthropic.com',
    apiKey: '', // User provides this
  },
};
