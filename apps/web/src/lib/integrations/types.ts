// Integration Types for MrSnappy Local

export type IntegrationType = 
  | 'web-search' 
  | 'email' 
  | 'calendar' 
  | 'files' 
  | 'weather'
  | 'notes';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'connecting';

export interface IntegrationConfig {
  type: IntegrationType;
  name: string;
  description: string;
  icon: string;
  requiresOAuth: boolean;
  requiresApiKey: boolean;
  scopes?: string[]; // OAuth scopes or permission descriptions
  setupUrl?: string; // URL to get API keys
}

export interface IntegrationState {
  type: IntegrationType;
  status: IntegrationStatus;
  enabled: boolean;
  lastChecked?: number; // timestamp
  error?: string;
  metadata?: Record<string, unknown>; // e.g., email address, account name
}

export interface IntegrationCredentials {
  type: IntegrationType;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  extra?: Record<string, string>;
}

// Registry of available integrations
export const INTEGRATIONS: Record<IntegrationType, IntegrationConfig> = {
  'web-search': {
    type: 'web-search',
    name: 'Web Search',
    description: 'Search the web using DuckDuckGo or Brave Search',
    icon: '🔍',
    requiresOAuth: false,
    requiresApiKey: false, // DuckDuckGo is free, Brave optional
    scopes: ['Search the web', 'Get current information'],
  },
  'email': {
    type: 'email',
    name: 'Email',
    description: 'Read, send, and search your Gmail',
    icon: '📧',
    requiresOAuth: true,
    requiresApiKey: false,
    scopes: [
      'Read emails',
      'Send emails', 
      'Search inbox',
      'Manage labels',
    ],
    setupUrl: 'https://console.cloud.google.com/apis/credentials',
  },
  'calendar': {
    type: 'calendar',
    name: 'Calendar',
    description: 'View and manage your Google Calendar events',
    icon: '📅',
    requiresOAuth: true,
    requiresApiKey: false,
    scopes: [
      'View events',
      'Create events',
      'Update events',
      'Delete events',
    ],
    setupUrl: 'https://console.cloud.google.com/apis/credentials',
  },
  'files': {
    type: 'files',
    name: 'Local Files',
    description: 'Read and manage files on your computer',
    icon: '📁',
    requiresOAuth: false,
    requiresApiKey: false,
    scopes: [
      'Read files',
      'Create files',
      'Edit files',
      'Search files',
    ],
  },
  'weather': {
    type: 'weather',
    name: 'Weather',
    description: 'Get current weather and forecasts',
    icon: '🌤️',
    requiresOAuth: false,
    requiresApiKey: true, // OpenWeatherMap or similar
    scopes: ['Current weather', 'Forecasts'],
    setupUrl: 'https://openweathermap.org/api',
  },
  'notes': {
    type: 'notes',
    name: 'Notes',
    description: 'Save and retrieve notes locally',
    icon: '📝',
    requiresOAuth: false,
    requiresApiKey: false,
    scopes: ['Create notes', 'Search notes', 'Edit notes'],
  },
};

// Default states for all integrations
export const DEFAULT_INTEGRATION_STATES: IntegrationState[] = Object.values(INTEGRATIONS).map(
  (config) => ({
    type: config.type,
    status: 'disconnected' as IntegrationStatus,
    enabled: config.type === 'web-search', // Web search enabled by default
  })
);
