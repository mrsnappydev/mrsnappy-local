// LM Studio Status Proxy - Server-side fetch bypasses CORS
import { NextResponse } from 'next/server';

// Get LM Studio URL from environment or use default
const LMSTUDIO_URL = process.env.LMSTUDIO_URL || 'http://localhost:1234';

interface OpenAIModel {
  id: string;
  object: string;
  owned_by: string;
}

interface OpenAIModelsResponse {
  data: OpenAIModel[];
}

export async function GET() {
  try {
    const res = await fetch(`${LMSTUDIO_URL}/v1/models`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer lm-studio',
      },
      signal: AbortSignal.timeout(5000),
    });
    
    if (!res.ok) {
      return NextResponse.json({ 
        connected: false, 
        models: [],
        error: `LM Studio returned ${res.status}`,
        baseUrl: LMSTUDIO_URL,
      });
    }
    
    const data: OpenAIModelsResponse = await res.json();
    const models = (data.data || []).map((m) => ({
      id: m.id,
      name: m.id,
      provider: 'lmstudio' as const,
    }));
    
    return NextResponse.json({ 
      connected: true, 
      models,
      baseUrl: LMSTUDIO_URL,
    });
  } catch (error) {
    return NextResponse.json({ 
      connected: false, 
      models: [],
      error: error instanceof Error ? error.message : 'Cannot connect to LM Studio',
      baseUrl: LMSTUDIO_URL,
    });
  }
}
