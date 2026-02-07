// Ollama Status Proxy - Server-side fetch bypasses CORS
import { NextResponse } from 'next/server';

// Get Ollama URL from environment or use default
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    
    if (!res.ok) {
      return NextResponse.json({ 
        connected: false, 
        models: [],
        error: `Ollama returned ${res.status}`,
        baseUrl: OLLAMA_URL,
      });
    }
    
    const data: OllamaTagsResponse = await res.json();
    const models = (data.models || []).map((m) => ({
      id: m.name,
      name: m.name,
      size: m.size,
      modified: m.modified_at,
      provider: 'ollama' as const,
    }));
    
    return NextResponse.json({ 
      connected: true, 
      models,
      baseUrl: OLLAMA_URL,
    });
  } catch (error) {
    return NextResponse.json({ 
      connected: false, 
      models: [],
      error: error instanceof Error ? error.message : 'Cannot connect to Ollama',
      baseUrl: OLLAMA_URL,
    });
  }
}
