// Anthropic Status API - Check API key validity
import { NextRequest, NextResponse } from 'next/server';

interface StatusRequest {
  apiKey: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: StatusRequest = await request.json();
    const { apiKey } = body;
    
    if (!apiKey) {
      return NextResponse.json({ 
        connected: false, 
        error: 'API key required',
        models: [],
      });
    }
    
    // Test the API key by making a simple request
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
      signal: AbortSignal.timeout(10000),
    });
    
    // Even a 400 error means the API key is valid (just bad request)
    // 401 means invalid API key
    if (res.status === 401) {
      return NextResponse.json({ 
        connected: false, 
        error: 'Invalid API key',
        models: [],
      });
    }
    
    // Available Claude models
    const models = [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)', provider: 'anthropic' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
    ];
    
    console.log('[Anthropic Status] Connected! API key valid.');
    
    return NextResponse.json({ 
      connected: true, 
      models,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Cannot connect to Anthropic';
    console.log(`[Anthropic Status] Connection failed: ${errorMsg}`);
    
    return NextResponse.json({ 
      connected: false, 
      models: [],
      error: errorMsg,
    });
  }
}
