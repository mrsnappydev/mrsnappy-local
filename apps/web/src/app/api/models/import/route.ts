// API Route: Import models to providers (Ollama / LM Studio)
// POST: Import a model from central storage to a provider

import { NextRequest, NextResponse } from 'next/server';
import { getModel } from '@/lib/models/storage';
import {
  importToOllama,
  importToLMStudio,
  removeFromOllama,
  removeFromLMStudio,
  isOllamaRunning,
  isLMStudioAvailable,
  OllamaImportOptions,
  LMStudioImportOptions,
  ImportResult,
} from '@/lib/models/import';

interface ImportRequest {
  modelId: string;
  provider: 'ollama' | 'lmstudio';
  action: 'import' | 'remove';
  providerUrl?: string;  // URL of the provider (e.g., http://192.168.1.100:11434 for remote Ollama)
  options?: {
    modelName?: string;  // Custom name for Ollama
    systemPrompt?: string;
    useSymlink?: boolean;  // For LM Studio
  };
}

interface ImportResponse {
  success: boolean;
  modelId: string;
  provider: 'ollama' | 'lmstudio';
  action: 'import' | 'remove';
  importedName?: string;
  error?: string;
}

/**
 * POST /api/models/import
 * Import or remove a model from a provider
 */
export async function POST(request: NextRequest): Promise<NextResponse<ImportResponse>> {
  try {
    const body: ImportRequest = await request.json();
    const { modelId, provider, action, providerUrl, options } = body;
    
    if (!modelId || !provider || !action) {
      return NextResponse.json(
        { 
          success: false,
          modelId: modelId || '',
          provider: provider || 'ollama',
          action: action || 'import',
          error: 'Missing required fields: modelId, provider, action' 
        },
        { status: 400 }
      );
    }
    
    // Get the model from storage
    const model = await getModel(modelId);
    
    if (!model) {
      return NextResponse.json(
        { 
          success: false,
          modelId,
          provider,
          action,
          error: 'Model not found in storage' 
        },
        { status: 404 }
      );
    }
    
    // Check provider availability
    if (provider === 'ollama') {
      const ollamaUrl = providerUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
      const isRunning = await isOllamaRunning(ollamaUrl);
      if (!isRunning) {
        return NextResponse.json(
          { 
            success: false,
            modelId,
            provider,
            action,
            error: `Ollama is not running at ${ollamaUrl}. Please start Ollama first.` 
          },
          { status: 503 }
        );
      }
    } else if (provider === 'lmstudio') {
      const isAvailable = await isLMStudioAvailable();
      if (!isAvailable) {
        return NextResponse.json(
          { 
            success: false,
            modelId,
            provider,
            action,
            error: 'LM Studio models directory is not accessible.' 
          },
          { status: 503 }
        );
      }
    }
    
    let result: ImportResult | { success: boolean; error?: string };
    
    if (action === 'import') {
      // Import to provider
      if (provider === 'ollama') {
        const ollamaUrl = providerUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
        const ollamaOptions: OllamaImportOptions = {
          modelName: options?.modelName,
          systemPrompt: options?.systemPrompt,
          ollamaUrl,
        };
        result = await importToOllama(model, ollamaOptions);
      } else {
        const lmstudioOptions: LMStudioImportOptions = {
          useSymlink: options?.useSymlink !== false,
        };
        result = await importToLMStudio(model, lmstudioOptions);
      }
    } else {
      // Remove from provider
      if (provider === 'ollama') {
        const success = await removeFromOllama(model);
        result = { success, error: success ? undefined : 'Failed to remove from Ollama' };
      } else {
        const success = await removeFromLMStudio(model);
        result = { success, error: success ? undefined : 'Failed to remove from LM Studio' };
      }
    }
    
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false,
          modelId,
          provider,
          action,
          error: result.error || `Failed to ${action} model` 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      modelId,
      provider,
      action,
      importedName: 'importedName' in result ? result.importedName : undefined,
    });
    
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { 
        success: false,
        modelId: '',
        provider: 'ollama',
        action: 'import',
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/models/import
 * Check provider availability
 */
export async function GET() {
  try {
    const [ollamaRunning, lmstudioAvailable] = await Promise.all([
      isOllamaRunning(),
      isLMStudioAvailable(),
    ]);
    
    return NextResponse.json({
      providers: {
        ollama: {
          available: ollamaRunning,
          status: ollamaRunning ? 'running' : 'offline',
        },
        lmstudio: {
          available: lmstudioAvailable,
          status: lmstudioAvailable ? 'available' : 'unavailable',
        },
      },
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
