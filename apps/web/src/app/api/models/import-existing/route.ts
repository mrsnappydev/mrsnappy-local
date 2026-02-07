// API Route: Import Existing Models from Providers to Central Storage
// POST: Copy or move model from Ollama/LM Studio to central storage

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';
import {
  getStoragePath,
  ensureStorageDirectory,
  registerModel,
  getAllModels,
} from '@/lib/models/storage';
import {
  ExistingModel,
  detectOllamaModels,
  detectLMStudioModels,
  getOllamaModelGGUFPath,
  getOllamaBlobPath,
} from '@/lib/models/detect';
import { detectFormat, extractQuantization, extractParameters } from '@/lib/models/types';

interface ImportExistingRequest {
  sourcePath: string;
  provider: 'ollama' | 'lmstudio';
  modelName: string;
  deleteOriginal: boolean;
  // For Ollama models, we need additional info
  ollamaDigest?: string;  // The digest of the GGUF blob
}

interface ImportExistingResponse {
  success: boolean;
  modelId?: string;
  filename?: string;
  size?: number;
  storagePath?: string;
  spaceFreed?: number;  // If original was deleted
  error?: string;
}

/**
 * Copy a file with progress (large file support)
 */
async function copyFile(source: string, destination: string): Promise<void> {
  const readStream = createReadStream(source);
  const writeStream = createWriteStream(destination);
  
  await pipeline(readStream, writeStream);
}

/**
 * Get file size
 */
async function getFileSize(path: string): Promise<number> {
  const stat = await fs.stat(path);
  return stat.size;
}

/**
 * Verify that a copy succeeded by comparing file sizes
 */
async function verifyCopy(source: string, destination: string): Promise<boolean> {
  try {
    const sourceSize = await getFileSize(source);
    const destSize = await getFileSize(destination);
    return sourceSize === destSize;
  } catch {
    return false;
  }
}

/**
 * POST /api/models/import-existing
 * Import a model from a provider to central storage
 */
export async function POST(request: NextRequest): Promise<NextResponse<ImportExistingResponse>> {
  try {
    const body: ImportExistingRequest = await request.json();
    const { sourcePath, provider, modelName, deleteOriginal, ollamaDigest } = body;
    
    if (!sourcePath || !provider || !modelName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: sourcePath, provider, modelName' },
        { status: 400 }
      );
    }
    
    // Ensure central storage exists
    const storagePath = await ensureStorageDirectory();
    
    let actualSourcePath = sourcePath;
    let filename = modelName;
    
    // For Ollama, we need to find the actual GGUF blob
    if (provider === 'ollama') {
      if (ollamaDigest) {
        // Direct blob path
        const ollamaPath = sourcePath.split('/manifests/')[0] || join(sourcePath, '..', '..', '..', '..', '..');
        actualSourcePath = getOllamaBlobPath(ollamaPath, ollamaDigest);
      } else {
        // Parse manifest to find GGUF blob
        const manifestContent = await fs.readFile(sourcePath, 'utf-8');
        const manifest = JSON.parse(manifestContent);
        
        const modelLayer = manifest.layers?.find((l: any) => 
          l.mediaType === 'application/vnd.ollama.image.model'
        );
        
        if (!modelLayer) {
          return NextResponse.json(
            { success: false, error: 'Could not find model layer in Ollama manifest' },
            { status: 400 }
          );
        }
        
        const ollamaPath = sourcePath.split('/manifests/')[0];
        actualSourcePath = getOllamaBlobPath(ollamaPath, modelLayer.digest);
      }
      
      // Generate a proper filename for Ollama models
      if (!filename.endsWith('.gguf')) {
        filename = `${modelName.replace(':', '-').replace('/', '-')}.gguf`;
      }
    } else {
      // LM Studio - use the original filename
      filename = basename(sourcePath);
    }
    
    // Check if source exists
    try {
      await fs.access(actualSourcePath);
    } catch {
      return NextResponse.json(
        { success: false, error: `Source file not found: ${actualSourcePath}` },
        { status: 404 }
      );
    }
    
    // Check if already in storage
    const existingModels = await getAllModels();
    const alreadyExists = existingModels.some(m => 
      m.filename.toLowerCase() === filename.toLowerCase()
    );
    
    if (alreadyExists) {
      return NextResponse.json(
        { success: false, error: `Model "${filename}" already exists in central storage` },
        { status: 409 }
      );
    }
    
    // Get source file size
    const sourceSize = await getFileSize(actualSourcePath);
    
    // Destination path
    const destPath = join(storagePath, filename);
    
    // Copy the file
    console.log(`Copying ${actualSourcePath} to ${destPath}...`);
    await copyFile(actualSourcePath, destPath);
    
    // Verify the copy
    const verified = await verifyCopy(actualSourcePath, destPath);
    if (!verified) {
      // Clean up failed copy
      try {
        await fs.unlink(destPath);
      } catch {}
      
      return NextResponse.json(
        { success: false, error: 'File copy verification failed - sizes do not match' },
        { status: 500 }
      );
    }
    
    // Register the model
    const model = await registerModel({
      filename,
      path: destPath,
      size: sourceSize,
      format: detectFormat(filename),
      quantization: extractQuantization(filename),
      parameters: extractParameters(filename),
      downloadedAt: Date.now(),
      source: provider,
      importedTo: [],
    });
    
    let spaceFreed = 0;
    
    // Delete original if requested (only after verified copy)
    if (deleteOriginal) {
      try {
        if (provider === 'ollama') {
          // For Ollama, just delete the specific blob file
          // Note: This might break the model in Ollama if other manifests reference it
          await fs.unlink(actualSourcePath);
          spaceFreed = sourceSize;
        } else {
          // For LM Studio, delete the GGUF file
          await fs.unlink(sourcePath);
          spaceFreed = sourceSize;
        }
      } catch (error) {
        console.error('Failed to delete original:', error);
        // Don't fail the entire operation if delete fails
      }
    }
    
    return NextResponse.json({
      success: true,
      modelId: model.id,
      filename: model.filename,
      size: model.size,
      storagePath: model.path,
      spaceFreed,
    });
    
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/models/import-existing
 * Get import progress or status
 */
export async function GET(request: NextRequest) {
  // Could be used for progress tracking in the future
  const storagePath = getStoragePath();
  
  try {
    await fs.access(storagePath);
    return NextResponse.json({
      storagePath,
      ready: true,
    });
  } catch {
    return NextResponse.json({
      storagePath,
      ready: false,
    });
  }
}
