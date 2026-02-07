// API Route: Model Registry
// GET /api/models - Get unified model list with compatibility

import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedModels } from '@/lib/models/registry';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ollamaUrl = searchParams.get('ollamaUrl') || undefined;
    const lmstudioUrl = searchParams.get('lmstudioUrl') || undefined;
    
    const registry = await getUnifiedModels({ ollamaUrl, lmstudioUrl });
    
    return NextResponse.json(registry);
  } catch (error) {
    console.error('Model registry error:', error);
    return NextResponse.json(
      { error: 'Failed to get model registry' },
      { status: 500 }
    );
  }
}
