// API Route: Central Model Storage Management
// GET: List all models in central storage
// POST: Register a new model (after download)

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllModels,
  registerModel,
  getStorageStats,
  scanForNewModels,
  verifyModels,
  StoredModel,
} from '@/lib/models/storage';
import { detectFormat, extractQuantization, extractParameters } from '@/lib/models/types';

export interface StorageResponse {
  models: StoredModel[];
  stats: {
    totalModels: number;
    totalSize: number;
    storagePath: string;
    storageExists: boolean;
    ollamaImported: number;
    lmstudioImported: number;
  };
}

export interface RegisterModelRequest {
  filename: string;
  path: string;
  size: number;
  source: 'huggingface' | 'ollama' | 'manual';
  sourceUrl?: string;
  hfRepo?: string;
  hfFile?: string;
}

/**
 * GET /api/models/storage
 * List all models in central storage with stats
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scan = searchParams.get('scan') === 'true';
    const verify = searchParams.get('verify') === 'true';
    
    // Optionally scan for new models
    if (scan) {
      await scanForNewModels();
    }
    
    // Optionally verify existing models
    if (verify) {
      await verifyModels();
    }
    
    // Get all models and stats
    const models = await getAllModels();
    const stats = await getStorageStats();
    
    const response: StorageResponse = {
      models,
      stats,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Failed to list storage:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list storage' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/models/storage
 * Register a new model in storage
 */
export async function POST(request: NextRequest) {
  try {
    const body: RegisterModelRequest = await request.json();
    
    const { filename, path, size, source, sourceUrl, hfRepo, hfFile } = body;
    
    if (!filename || !path || !size) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, path, size' },
        { status: 400 }
      );
    }
    
    // Register the model
    const model = await registerModel({
      filename,
      path,
      size,
      format: detectFormat(filename),
      quantization: extractQuantization(filename),
      parameters: extractParameters(filename),
      downloadedAt: Date.now(),
      source,
      sourceUrl,
      hfRepo,
      hfFile,
      importedTo: [],
    });
    
    return NextResponse.json({ 
      success: true, 
      model 
    });
    
  } catch (error) {
    console.error('Failed to register model:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to register model' },
      { status: 500 }
    );
  }
}
