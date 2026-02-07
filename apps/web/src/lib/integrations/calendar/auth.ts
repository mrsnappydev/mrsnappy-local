// Google Calendar OAuth2 Authentication
// Handles token management, refresh, and OAuth flow

import { CalendarTokens, CalendarCredentials, CalendarUserInfo, CalendarOAuthState, CALENDAR_SCOPES } from './types';

const STORAGE_KEY = 'mrsnappy-calendar-auth';
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes before expiry

// Get Google OAuth URL for authorization
export function getGoogleCalendarAuthUrl(credentials: CalendarCredentials, state?: string): string {
  const params = new URLSearchParams({
    client_id: credentials.client_id,
    redirect_uri: credentials.redirect_uri,
    response_type: 'code',
    scope: CALENDAR_SCOPES.join(' '),
    access_type: 'offline', // Get refresh token
    prompt: 'consent', // Force consent to get refresh token
    include_granted_scopes: 'true',
  });
  
  if (state) {
    params.append('state', state);
  }
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  code: string,
  credentials: CalendarCredentials
): Promise<CalendarTokens> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      redirect_uri: credentials.redirect_uri,
      grant_type: 'authorization_code',
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || error.error || 'Token exchange failed');
  }
  
  const data = await response.json();
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
    expiry_date: Date.now() + (data.expires_in * 1000),
    scope: data.scope,
  };
}

// Refresh access token using refresh token
export async function refreshAccessToken(
  refreshToken: string,
  credentials: CalendarCredentials
): Promise<CalendarTokens> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      grant_type: 'refresh_token',
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || error.error || 'Token refresh failed');
  }
  
  const data = await response.json();
  
  return {
    access_token: data.access_token,
    refresh_token: refreshToken, // Keep original refresh token
    token_type: data.token_type,
    expires_in: data.expires_in,
    expiry_date: Date.now() + (data.expires_in * 1000),
    scope: data.scope,
  };
}

// Get user info from Google
export async function getUserInfo(accessToken: string): Promise<CalendarUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get user info');
  }
  
  const data = await response.json();
  
  return {
    email: data.email,
    name: data.name,
    picture: data.picture,
  };
}

// Revoke access token
export async function revokeToken(token: string): Promise<void> {
  const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  
  if (!response.ok) {
    // Don't throw - revocation might fail but we still want to clear local state
    console.warn('Calendar token revocation failed:', response.status);
  }
}

// Storage helpers (client-side)
export function saveCalendarAuth(state: CalendarOAuthState): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save Calendar auth:', error);
  }
}

export function loadCalendarAuth(): CalendarOAuthState | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as CalendarOAuthState;
  } catch (error) {
    console.error('Failed to load Calendar auth:', error);
    return null;
  }
}

export function clearCalendarAuth(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear Calendar auth:', error);
  }
}

// Check if tokens need refresh
export function isTokenExpired(tokens: CalendarTokens): boolean {
  return Date.now() >= (tokens.expiry_date - TOKEN_REFRESH_BUFFER);
}

// Get valid access token, refreshing if needed
export async function getValidAccessToken(
  state: CalendarOAuthState
): Promise<{ token: string; state: CalendarOAuthState }> {
  if (!state.tokens || !state.credentials) {
    throw new Error('No Calendar tokens available');
  }
  
  if (!isTokenExpired(state.tokens)) {
    return { token: state.tokens.access_token, state };
  }
  
  // Need to refresh
  if (!state.tokens.refresh_token) {
    throw new Error('No refresh token available - please reconnect Calendar');
  }
  
  try {
    const newTokens = await refreshAccessToken(
      state.tokens.refresh_token,
      state.credentials
    );
    
    const newState: CalendarOAuthState = {
      ...state,
      tokens: newTokens,
      lastRefreshed: Date.now(),
    };
    
    saveCalendarAuth(newState);
    
    return { token: newTokens.access_token, state: newState };
  } catch (error) {
    // Refresh failed - likely revoked
    clearCalendarAuth();
    throw new Error('Calendar session expired - please reconnect');
  }
}

// Get credentials from environment or stored state
export function getCredentials(): CalendarCredentials | null {
  // First try environment variables (server-side)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.CALENDAR_REDIRECT_URI || 'http://localhost:3000/api/auth/calendar/callback',
    };
  }
  
  // Then try stored credentials (client-provided)
  const state = loadCalendarAuth();
  return state?.credentials || null;
}

// Check if Calendar is connected and tokens are valid
export function isCalendarConnected(): boolean {
  const state = loadCalendarAuth();
  if (!state?.tokens) return false;
  
  // Check if we have required data
  return !!(state.tokens.access_token && state.userInfo?.email);
}

// Get connected email address
export function getConnectedCalendarEmail(): string | null {
  const state = loadCalendarAuth();
  return state?.userInfo?.email || null;
}
