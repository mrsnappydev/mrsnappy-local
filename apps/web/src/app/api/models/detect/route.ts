// API Route: Detect Existing Models from Providers
// GET: Scan Ollama and LM Studio for existing models that can be imported

import { NextRequest, NextResponse } from 'next/server';
import {
  detectOllamaModels,
  detectLMStudioModels,
  detectAllExistingModels,
  DetectionResult,
  getDefaultProviderPaths,
} from '@/lib/models/detect';
import { getAllModels } from '@/lib/models/storage';

interface DetectResponse {
  ollama: DetectionResult & { notImported: number };
  lmstudio: DetectionResult & { notImported: number };
  combinedSize: number;
  totalModels: number;
  notImportedTotal: number;
  providerPaths: {
    ollama: string;
    lmstudio: string;
  };
}

/**
 * GET /api/models/detect
 * Detect existing models from Ollama and LM Studio
 * 
 * Query params:
 * - provider: 'ollama' | 'lmstudio' | 'all' (default: 'all')
 */
export async function GET(request: NextRequest): Promise<NextResponse<DetectResponse | { error: string }>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider') || 'all';
    
    // Get already imported models for comparison
    const storedModels = await getAllModels();
    const storedPaths = new Set(storedModels.map(m => m.path));
    const storedFilenames = new Set(storedModels.map(m => m.filename.toLowerCase()));
    
    // Helper to check if a model is already imported
    const isAlreadyImported = (model: { path: string; name: string }): boolean => {
      // Check by path
      if (storedPaths.has(model.path)) return true;
      
      // Check by filename (for GGUF files)
      const filename = model.name.toLowerCase();
      if (filename.endsWith('.gguf') && storedFilenames.has(filename)) return true;
      
      return false;
    };
    
    let ollama: DetectionResult = {
      provider: 'ollama',
      path: '',
      exists: false,
      models: [],
      totalSize: 0,
    };
    
    let lmstudio: DetectionResult = {
      provider: 'lmstudio',
      path: '',
      exists: false,
      models: [],
      totalSize: 0,
    };
    
    if (provider === 'all' || provider === 'ollama') {
      ollama = await detectOllamaModels();
    }
    
    if (provider === 'all' || provider === 'lmstudio') {
      lmstudio = await detectLMStudioModels();
    }
    
    // Calculate not imported counts
    const ollamaNotImported = ollama.models.filter(m => !isAlreadyImported(m)).length;
    const lmstudioNotImported = lmstudio.models.filter(m => !isAlreadyImported(m)).length;
    
    const paths = getDefaultProviderPaths();
    
    const response: DetectResponse = {
      ollama: {
        ...ollama,
        notImported: ollamaNotImported,
      },
      lmstudio: {
        ...lmstudio,
        notImported: lmstudioNotImported,
      },
      combinedSize: ollama.totalSize + lmstudio.totalSize,
      totalModels: ollama.models.length + lmstudio.models.length,
      notImportedTotal: ollamaNotImported + lmstudioNotImported,
      providerPaths: paths,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Detection error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
