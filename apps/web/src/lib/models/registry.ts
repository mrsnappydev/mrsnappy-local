// Unified Model Registry for MrSnappy Local
// Aggregates models from all providers and shows compatibility

import {
  UnifiedModel,
  ModelFormat,
  ModelSource,
  ModelProvider,
  FORMAT_COMPATIBILITY,
  detectFormat,
  extractQuantization,
  extractParameters,
} from './types';
import { OllamaProvider } from '../providers/ollama';
import { LMStudioProvider } from '../providers/lmstudio';
import { ModelInfo, ProviderType } from '../providers/types';

export interface RegistryOptions {
  ollamaUrl?: string;
  lmstudioUrl?: string;
}

export interface ProviderState {
  type: ProviderType;
  connected: boolean;
  models: ModelInfo[];
  error?: string;
}

export interface RegistryState {
  models: UnifiedModel[];
  providers: ProviderState[];
  lastUpdated: number;
}

/**
 * Get all models from all providers, unified with compatibility info
 */
export async function getUnifiedModels(options: RegistryOptions = {}): Promise<RegistryState> {
  const ollamaUrl = options.ollamaUrl || 'http://localhost:11434';
  const lmstudioUrl = options.lmstudioUrl || 'http://localhost:1234';
  
  const ollama = new OllamaProvider(ollamaUrl);
  const lmstudio = new LMStudioProvider(lmstudioUrl);
  
  const providers: ProviderState[] = [];
  const modelMap = new Map<string, UnifiedModel>();
  
  // Check Ollama
  try {
    const ollamaStatus = await ollama.getStatus();
    providers.push({
      type: 'ollama',
      connected: ollamaStatus.connected,
      models: ollamaStatus.models,
      error: ollamaStatus.error,
    });
    
    if (ollamaStatus.connected) {
      for (const model of ollamaStatus.models) {
        const unified = convertToUnified(model, 'ollama');
        modelMap.set(unified.id, unified);
      }
    }
  } catch (error) {
    providers.push({
      type: 'ollama',
      connected: false,
      models: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  // Check LM Studio
  try {
    const lmstudioStatus = await lmstudio.getStatus();
    providers.push({
      type: 'lmstudio',
      connected: lmstudioStatus.connected,
      models: lmstudioStatus.models,
      error: lmstudioStatus.error,
    });
    
    if (lmstudioStatus.connected) {
      for (const model of lmstudioStatus.models) {
        const modelKey = normalizeModelId(model.id);
        
        if (modelMap.has(modelKey)) {
          // Model exists in Ollama too - mark it as available in both
          const existing = modelMap.get(modelKey)!;
          existing.compatibility.lmstudio = true;
        } else {
          const unified = convertToUnified(model, 'lmstudio');
          modelMap.set(unified.id, unified);
        }
      }
    }
  } catch (error) {
    providers.push({
      type: 'lmstudio',
      connected: false,
      models: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  return {
    models: Array.from(modelMap.values()).sort((a, b) => 
      a.displayName.localeCompare(b.displayName)
    ),
    providers,
    lastUpdated: Date.now(),
  };
}

/**
 * Convert provider-specific model to unified model
 */
function convertToUnified(model: ModelInfo, provider: ProviderType): UnifiedModel {
  // Ollama model names are like "llama3.2:latest" or "mistral:7b-instruct-q4_K_M"
  // LM Studio model names are like "lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF"
  
  const name = model.name || model.id;
  const displayName = cleanDisplayName(name);
  const quantization = extractQuantization(name);
  const parameters = extractParameters(name);
  
  // All models from these providers are GGUF-based
  const format: ModelFormat = 'gguf';
  const compatibility = { ...FORMAT_COMPATIBILITY[format] };
  
  // Mark which provider currently has this loaded
  if (provider === 'ollama') {
    compatibility.ollama = true;
  } else if (provider === 'lmstudio') {
    compatibility.lmstudio = true;
  }
  
  // Map provider type to model source/provider (handle openai-compatible)
  const modelSource: ModelSource = provider === 'openai-compatible' ? 'lmstudio' : provider;
  const modelProvider: ModelProvider = provider;
  
  return {
    id: model.id,
    name,
    displayName,
    source: modelSource,
    provider: modelProvider,
    format,
    sizeBytes: model.size,
    isDownloaded: true,  // If we see it from a provider, it's downloaded
    isLoaded: true,
    compatibility,
    modified: model.modified,
    quantization,
    parameters,
  };
}

/**
 * Normalize model ID for comparison across providers
 */
function normalizeModelId(id: string): string {
  // Remove common suffixes and prefixes to find base model
  let normalized = id.toLowerCase();
  normalized = normalized.replace(/:latest$/, '');
  normalized = normalized.replace(/\.gguf$/, '');
  // Remove paths
  normalized = normalized.split('/').pop() || normalized;
  return normalized;
}

/**
 * Clean up model name for display
 */
function cleanDisplayName(name: string): string {
  let display = name;
  
  // Remove :latest suffix
  display = display.replace(/:latest$/, '');
  
  // Remove path prefixes
  if (display.includes('/')) {
    display = display.split('/').pop() || display;
  }
  
  // Clean up GGUF suffixes
  display = display.replace(/-GGUF$/i, '');
  display = display.replace(/\.gguf$/i, '');
  
  // Remove double dashes
  display = display.replace(/--+/g, '-');
  
  // Capitalize model names nicely
  display = display.replace(/^llama/i, 'Llama');
  display = display.replace(/^mistral/i, 'Mistral');
  display = display.replace(/^qwen/i, 'Qwen');
  display = display.replace(/^phi/i, 'Phi');
  display = display.replace(/^gemma/i, 'Gemma');
  
  return display;
}

/**
 * Get models compatible with a specific provider
 */
export function getModelsForProvider(
  models: UnifiedModel[], 
  provider: ProviderType
): UnifiedModel[] {
  return models.filter(m => {
    if (provider === 'ollama') return m.compatibility.ollama;
    if (provider === 'lmstudio' || provider === 'openai-compatible') return m.compatibility.lmstudio;
    return false;
  });
}

/**
 * Check which providers can run a given model
 */
export function getCompatibleProviders(model: UnifiedModel): ModelProvider[] {
  const providers: ModelProvider[] = [];
  if (model.compatibility.ollama) providers.push('ollama');
  if (model.compatibility.lmstudio) providers.push('lmstudio');
  return providers;
}
