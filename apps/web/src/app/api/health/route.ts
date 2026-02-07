import { NextResponse } from 'next/server';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ 
        ollama: true, 
        models: data.models?.map((m: { name: string }) => m.name) || [] 
      });
    }
    
    return NextResponse.json({ ollama: false, models: [] });
  } catch {
    return NextResponse.json({ ollama: false, models: [] });
  }
}
