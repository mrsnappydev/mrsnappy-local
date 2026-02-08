// Provider Factory and Manager

export * from './types';
export * from './autostart';
export { OllamaProvider } from './ollama';
export { LMStudioProvider } from './lmstudio';
export { AnthropicProvider } from './anthropic';

import {
  ModelProvider,
  ProviderType,
  ProviderConfig,
  ProviderStatus,
  DEFAULT_PROVIDERS,
} from './types';
import { OllamaProvider } from './ollama';
import { LMStudioProvider } from './lmstudio';
import { AnthropicProvider } from './anthropic';

export interface DetectedProvider {
  type: ProviderType;
  name: string;
  baseUrl: string;
  connected: boolean;
  modelCount: number;
}

/**
 * Create a provider instance from config
 */
export function createProvider(config: ProviderConfig): ModelProvider {
  switch (config.type) {
    case 'ollama':
      return new OllamaProvider(config.baseUrl);
    case 'lmstudio':
    case 'openai-compatible':
      return new LMStudioProvider(config.baseUrl, config.apiKey);
    case 'anthropic':
      return new AnthropicProvider(config.apiKey, config.baseUrl);
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}

/**
 * Create a provider by type with default config
 */
export function createDefaultProvider(type: ProviderType): ModelProvider {
  const config = DEFAULT_PROVIDERS[type];
  return createProvider(config);
}

/**
 * Detect all available providers
 */
export async function detectProviders(): Promise<DetectedProvider[]> {
  const results: DetectedProvider[] = [];

  // Check Ollama
  const ollama = new OllamaProvider();
  try {
    const status = await ollama.getStatus();
    results.push({
      type: 'ollama',
      name: 'Ollama',
      baseUrl: ollama.baseUrl,
      connected: status.connected,
      modelCount: status.models.length,
    });
  } catch {
    results.push({
      type: 'ollama',
      name: 'Ollama',
      baseUrl: ollama.baseUrl,
      connected: false,
      modelCount: 0,
    });
  }

  // Check LM Studio
  const lmstudio = new LMStudioProvider();
  try {
    const status = await lmstudio.getStatus();
    results.push({
      type: 'lmstudio',
      name: 'LM Studio',
      baseUrl: lmstudio.baseUrl,
      connected: status.connected,
      modelCount: status.models.length,
    });
  } catch {
    results.push({
      type: 'lmstudio',
      name: 'LM Studio',
      baseUrl: lmstudio.baseUrl,
      connected: false,
      modelCount: 0,
    });
  }

  return results;
}

/**
 * Get the best available provider (first connected one)
 */
export async function getAvailableProvider(): Promise<ModelProvider | null> {
  const detected = await detectProviders();
  const available = detected.find((p) => p.connected);
  
  if (!available) return null;
  
  return createDefaultProvider(available.type);
}

/**
 * Get provider status by type
 */
export async function getProviderStatus(
  type: ProviderType,
  baseUrl?: string
): Promise<ProviderStatus> {
  const config = { ...DEFAULT_PROVIDERS[type] };
  if (baseUrl) config.baseUrl = baseUrl;
  
  const provider = createProvider(config);
  return provider.getStatus();
}
