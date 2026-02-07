// Gmail OAuth Flow - Start Authorization
// GET /api/auth/gmail - Redirects to Google OAuth consent screen

import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl, GmailCredentials, GMAIL_SCOPES } from '@/lib/integrations/gmail';

export async function GET(request: NextRequest) {
  // Get credentials from environment or query params
  const searchParams = request.nextUrl.searchParams;
  
  const clientId = searchParams.get('client_id') || process.env.GMAIL_CLIENT_ID;
  const clientSecret = searchParams.get('client_secret') || process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback';
  
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { 
        error: 'Missing credentials',
        message: 'Gmail client_id and client_secret are required. Please configure them in settings.',
      },
      { status: 400 }
    );
  }
  
  const credentials: GmailCredentials = {
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  };
  
  // Generate a random state for CSRF protection
  const state = Buffer.from(JSON.stringify({
    timestamp: Date.now(),
    client_id: clientId,
    client_secret: clientSecret,
  })).toString('base64');
  
  const authUrl = getGoogleAuthUrl(credentials, state);
  
  // Redirect to Google OAuth
  return NextResponse.redirect(authUrl);
}

// POST handler for getting auth URL without redirect (for client-side handling)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const clientId = body.client_id || process.env.GMAIL_CLIENT_ID;
    const clientSecret = body.client_secret || process.env.GMAIL_CLIENT_SECRET;
    const redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback';
    
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { 
          error: 'Missing credentials',
          message: 'Gmail client_id and client_secret are required.',
        },
        { status: 400 }
      );
    }
    
    const credentials: GmailCredentials = {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    };
    
    // Generate state with credentials for callback
    const state = Buffer.from(JSON.stringify({
      timestamp: Date.now(),
      client_id: clientId,
      client_secret: clientSecret,
    })).toString('base64');
    
    const authUrl = getGoogleAuthUrl(credentials, state);
    
    return NextResponse.json({ authUrl, state });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
