// API Route: Huggingface Model Details
// GET /api/models/huggingface/[author]/[repo] - Get model details including files

import { NextRequest, NextResponse } from 'next/server';
import { getModelDetails } from '@/lib/models/huggingface';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ repo: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const repoId = resolvedParams.repo.join('/');
    
    if (!repoId || resolvedParams.repo.length < 2) {
      return NextResponse.json(
        { error: 'Invalid repo ID. Expected format: author/repo' },
        { status: 400 }
      );
    }
    
    const details = await getModelDetails(repoId);
    
    return NextResponse.json(details);
  } catch (error) {
    console.error('Huggingface model details error:', error);
    return NextResponse.json(
      { error: 'Failed to get model details' },
      { status: 500 }
    );
  }
}
