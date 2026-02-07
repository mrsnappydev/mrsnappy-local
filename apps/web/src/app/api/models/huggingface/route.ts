// API Route: Huggingface Model Search
// GET /api/models/huggingface - Search GGUF models on Huggingface

import { NextRequest, NextResponse } from 'next/server';
import { searchModels, getPopularGGUFModels } from '@/lib/models/huggingface';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    
    let models;
    
    if (query) {
      models = await searchModels({
        query,
        filter: 'gguf',
        sort: 'downloads',
        limit,
      });
    } else {
      // No query = get popular models
      models = await getPopularGGUFModels(limit);
    }
    
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Huggingface search error:', error);
    return NextResponse.json(
      { error: 'Failed to search Huggingface' },
      { status: 500 }
    );
  }
}
