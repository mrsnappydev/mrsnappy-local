// Auto-spin Backend - Provider Auto-Start Functionality
// Detects offline providers and offers guidance to start them

import { ProviderType } from './types';
import { detectProviders, DetectedProvider } from './index';

export interface ProviderStartInfo {
  type: ProviderType;
  name: string;
  isRunning: boolean;
  canAutoStart: boolean;
  startCommand?: string;
  instructions: string[];
  downloadUrl?: string;
}

/**
 * Get start info for a specific provider
 */
export function getProviderStartInfo(type: ProviderType, isRunning: boolean): ProviderStartInfo {
  switch (type) {
    case 'ollama':
      return {
        type: 'ollama',
        name: 'Ollama',
        isRunning,
        canAutoStart: false, // Need system-level access to start Ollama
        startCommand: 'ollama serve',
        instructions: [
          '1. Open a terminal',
          '2. Run: ollama serve',
          '3. Wait for "Listening on 127.0.0.1:11434"',
          '4. Come back here and refresh',
        ],
        downloadUrl: 'https://ollama.com/download',
      };
    
    case 'lmstudio':
      return {
        type: 'lmstudio',
        name: 'LM Studio',
        isRunning,
        canAutoStart: false, // LM Studio is a GUI app
        instructions: [
          '1. Open LM Studio application',
          '2. Load a model',
          '3. Go to "Local Server" tab',
          '4. Click "Start Server"',
          '5. Come back here and refresh',
        ],
        downloadUrl: 'https://lmstudio.ai/',
      };
    
    default:
      return {
        type,
        name: 'Unknown Provider',
        isRunning,
        canAutoStart: false,
        instructions: ['Please start the provider manually'],
      };
  }
}

/**
 * Get all providers with their start info
 */
export async function getAllProviderStartInfo(): Promise<ProviderStartInfo[]> {
  const detected = await detectProviders();
  
  return detected.map(p => getProviderStartInfo(p.type, p.connected));
}

/**
 * Recommend the best provider based on what's available
 */
export async function recommendProvider(): Promise<{
  recommendation: ProviderType | null;
  reason: string;
  allProviders: ProviderStartInfo[];
}> {
  const providers = await getAllProviderStartInfo();
  
  // Prefer running providers
  const running = providers.filter(p => p.isRunning);
  
  if (running.length > 0) {
    // Prefer Ollama if available (more widely used)
    const preferredOrder: ProviderType[] = ['ollama', 'lmstudio'];
    
    for (const preferred of preferredOrder) {
      const found = running.find(p => p.type === preferred);
      if (found) {
        return {
          recommendation: found.type,
          reason: `${found.name} is running and ready`,
          allProviders: providers,
        };
      }
    }
    
    // Fallback to first running
    return {
      recommendation: running[0].type,
      reason: `${running[0].name} is running`,
      allProviders: providers,
    };
  }
  
  // Nothing running - suggest installing Ollama (easier setup)
  return {
    recommendation: 'ollama',
    reason: 'No providers running. Ollama is recommended for easy setup.',
    allProviders: providers,
  };
}

/**
 * Check if a model requires a specific provider
 */
export function getRequiredProvider(modelId: string): ProviderType | null {
  // Some model naming conventions indicate provider
  const lower = modelId.toLowerCase();
  
  // Ollama-specific naming (e.g., llama3.2:latest)
  if (lower.includes(':') && !lower.includes('/')) {
    return 'ollama';
  }
  
  // LM Studio paths (e.g., lmstudio-community/xxx)
  if (lower.includes('lmstudio-community/')) {
    return 'lmstudio';
  }
  
  // GGUF files can run on either
  return null;
}

/**
 * Get provider status with startup help
 */
export interface ProviderStatusWithHelp {
  type: ProviderType;
  name: string;
  connected: boolean;
  modelCount: number;
  startInfo: ProviderStartInfo;
}

export async function getProvidersWithHelp(): Promise<ProviderStatusWithHelp[]> {
  const detected = await detectProviders();
  
  return detected.map(p => ({
    type: p.type,
    name: p.name,
    connected: p.connected,
    modelCount: p.modelCount,
    startInfo: getProviderStartInfo(p.type, p.connected),
  }));
}
