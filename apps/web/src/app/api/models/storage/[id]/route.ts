// API Route: Individual Model Management
// GET: Get model details
// DELETE: Remove model from storage

import { NextRequest, NextResponse } from 'next/server';
import { getModel, removeModel, StoredModel } from '@/lib/models/storage';
import { removeFromOllama, removeFromLMStudio } from '@/lib/models/import';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/models/storage/[id]
 * Get details of a specific model
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const model = await getModel(id);
    
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ model });
    
  } catch (error) {
    console.error('Failed to get model:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get model' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/models/storage/[id]
 * Remove a model from storage
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const deleteFile = searchParams.get('deleteFile') === 'true';
    const cleanupProviders = searchParams.get('cleanupProviders') !== 'false';  // Default true
    
    // Get model first
    const model = await getModel(id);
    
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }
    
    // Clean up from providers if requested
    if (cleanupProviders) {
      if (model.importedTo.includes('ollama')) {
        await removeFromOllama(model);
      }
      if (model.importedTo.includes('lmstudio')) {
        await removeFromLMStudio(model);
      }
    }
    
    // Remove from registry (and optionally delete file)
    const success = await removeModel(id, deleteFile);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove model' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      modelId: id,
      fileDeleted: deleteFile,
    });
    
  } catch (error) {
    console.error('Failed to delete model:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete model' },
      { status: 500 }
    );
  }
}
