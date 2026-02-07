// Gmail OAuth Callback Handler
// GET /api/auth/gmail/callback - Handles OAuth redirect from Google

import { NextRequest, NextResponse } from 'next/server';
import { 
  exchangeCodeForTokens, 
  getUserInfo,
  GmailCredentials,
} from '@/lib/integrations/gmail';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  // Handle OAuth errors
  if (error) {
    const errorDescription = searchParams.get('error_description') || error;
    return new NextResponse(
      generateErrorPage('OAuth Error', errorDescription),
      { 
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
  
  if (!code) {
    return new NextResponse(
      generateErrorPage('Missing Code', 'No authorization code received from Google.'),
      { 
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
  
  try {
    // Decode state to get credentials
    let credentials: GmailCredentials;
    
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        credentials = {
          client_id: stateData.client_id,
          client_secret: stateData.client_secret,
          redirect_uri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback',
        };
      } catch {
        // Fall back to env vars
        credentials = {
          client_id: process.env.GMAIL_CLIENT_ID!,
          client_secret: process.env.GMAIL_CLIENT_SECRET!,
          redirect_uri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback',
        };
      }
    } else {
      // Use environment credentials
      if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
        return new NextResponse(
          generateErrorPage('Configuration Error', 'Gmail credentials not configured.'),
          { 
            status: 500,
            headers: { 'Content-Type': 'text/html' },
          }
        );
      }
      
      credentials = {
        client_id: process.env.GMAIL_CLIENT_ID,
        client_secret: process.env.GMAIL_CLIENT_SECRET,
        redirect_uri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback',
      };
    }
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, credentials);
    
    // Get user info
    const userInfo = await getUserInfo(tokens.access_token);
    
    // Return success page that stores tokens in localStorage and closes
    return new NextResponse(
      generateSuccessPage({
        tokens,
        userInfo,
        credentials,
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during authentication';
    return new NextResponse(
      generateErrorPage('Authentication Failed', message),
      { 
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}

function generateSuccessPage(data: {
  tokens: unknown;
  userInfo: unknown;
  credentials: unknown;
}): string {
  // Escape data for safe embedding in HTML
  const jsonData = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Gmail Connected - MrSnappy</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: rgba(255,255,255,0.05);
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      max-width: 400px;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    p {
      color: rgba(255,255,255,0.7);
      margin-bottom: 1.5rem;
    }
    .email {
      background: rgba(139,92,246,0.2);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      display: inline-block;
      margin-bottom: 1rem;
    }
    .status {
      color: #4ade80;
      font-size: 0.875rem;
    }
    .close-btn {
      background: #8b5cf6;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 10px;
      font-size: 1rem;
      cursor: pointer;
      margin-top: 1rem;
    }
    .close-btn:hover {
      background: #7c3aed;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✅</div>
    <h1>Gmail Connected!</h1>
    <p>Your Gmail account has been successfully connected to MrSnappy.</p>
    <div class="email" id="email"></div>
    <p class="status">Saving credentials...</p>
    <button class="close-btn" onclick="window.close()">Close Window</button>
  </div>
  
  <script>
    (function() {
      const data = ${jsonData};
      
      // Display email
      document.getElementById('email').textContent = data.userInfo.email;
      
      // Store auth data
      const authState = {
        tokens: data.tokens,
        userInfo: data.userInfo,
        credentials: data.credentials,
        lastRefreshed: Date.now()
      };
      
      try {
        localStorage.setItem('mrsnappy-gmail-auth', JSON.stringify(authState));
        document.querySelector('.status').textContent = 'Credentials saved! You can close this window.';
        
        // Notify parent window if opened as popup
        if (window.opener) {
          window.opener.postMessage({ type: 'gmail-auth-success', data: authState }, '*');
        }
        
        // Auto-close after 2 seconds
        setTimeout(() => {
          window.close();
        }, 2000);
      } catch (err) {
        document.querySelector('.status').textContent = 'Error saving credentials: ' + err.message;
        document.querySelector('.status').style.color = '#f87171';
      }
    })();
  </script>
</body>
</html>
`;
}

function generateErrorPage(title: string, message: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>${title} - MrSnappy</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: rgba(255,255,255,0.05);
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      max-width: 400px;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
      color: #f87171;
    }
    p {
      color: rgba(255,255,255,0.7);
      margin-bottom: 1.5rem;
    }
    .error-msg {
      background: rgba(239,68,68,0.2);
      padding: 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      color: #fca5a5;
      margin-bottom: 1rem;
      word-break: break-word;
    }
    .close-btn {
      background: #6b7280;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 10px;
      font-size: 1rem;
      cursor: pointer;
    }
    .close-btn:hover {
      background: #4b5563;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">❌</div>
    <h1>${title}</h1>
    <p>Failed to connect your Gmail account.</p>
    <div class="error-msg">${message}</div>
    <button class="close-btn" onclick="window.close()">Close Window</button>
  </div>
  
  <script>
    // Notify parent window of error
    if (window.opener) {
      window.opener.postMessage({ type: 'gmail-auth-error', error: '${message.replace(/'/g, "\\'")}' }, '*');
    }
  </script>
</body>
</html>
`;
}
