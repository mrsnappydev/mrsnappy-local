import { NextRequest, NextResponse } from 'next/server';
import { executeWebSearch } from '@/lib/tools/web-search';

interface SearchRequest {
  query: string;
  limit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 5 } = await request.json() as SearchRequest;
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }
    
    const result = await executeWebSearch(query, limit);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}

// Test endpoint
export async function GET() {
  try {
    const result = await executeWebSearch('test', 1);
    return NextResponse.json({ 
      ok: result.success,
      message: result.success ? 'Search is working' : result.error,
    });
  } catch (error) {
    return NextResponse.json({ 
      ok: false, 
      message: error instanceof Error ? error.message : 'Search failed',
    });
  }
}
