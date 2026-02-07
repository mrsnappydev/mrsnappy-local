import { NextRequest, NextResponse } from 'next/server';
import { 
  detectProviders, 
  getProviderStatus, 
  ProviderType 
} from '@/lib/providers';

// GET /api/providers - Detect all available providers
export async function GET() {
  try {
    const providers = await detectProviders();
    return NextResponse.json({ providers });
  } catch (error) {
    console.error('Provider detection error:', error);
    return NextResponse.json(
      { error: 'Failed to detect providers' },
      { status: 500 }
    );
  }
}

// POST /api/providers - Check a specific provider
export async function POST(request: NextRequest) {
  try {
    const { type, baseUrl } = await request.json() as {
      type: ProviderType;
      baseUrl?: string;
    };

    const status = await getProviderStatus(type, baseUrl);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Provider status error:', error);
    return NextResponse.json(
      { error: 'Failed to get provider status' },
      { status: 500 }
    );
  }
}
