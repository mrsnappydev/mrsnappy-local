'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Check, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  ChevronRight,
  Zap,
  Shield,
  HelpCircle,
  BookOpen,
  LogOut,
  Mail,
  KeyRound,
} from 'lucide-react';
import {
  IntegrationType,
  IntegrationState,
  IntegrationConfig,
  INTEGRATIONS,
} from '@/lib/integrations';
import {
  loadGmailAuth,
  clearGmailAuth,
  isGmailConnected,
  getConnectedEmail,
  saveGmailAuth,
  revokeToken,
} from '@/lib/integrations/gmail';

interface IntegrationsSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  integrations: IntegrationState[];
  onUpdateIntegrations: (updates: IntegrationState[]) => void;
  onOpenHelp?: (topic?: string) => void;
}

// Map integration types to help topics
const INTEGRATION_HELP_TOPICS: Record<IntegrationType, string> = {
  'web-search': 'web-search-setup',
  'email': 'gmail-setup',
  'calendar': 'calendar-setup',
  'files': 'first-run',
  'weather': 'first-run',
  'notes': 'first-run',
};

export default function IntegrationsSettings({
  isOpen,
  onClose,
  integrations,
  onUpdateIntegrations,
  onOpenHelp,
}: IntegrationsSettingsProps) {
  const [localStates, setLocalStates] = useState<IntegrationState[]>(integrations);
  const [testingIntegration, setTestingIntegration] = useState<IntegrationType | null>(null);
  const [expandedIntegration, setExpandedIntegration] = useState<IntegrationType | null>(null);
  
  // Gmail-specific state
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [showGmailCredentials, setShowGmailCredentials] = useState(false);
  const [gmailClientId, setGmailClientId] = useState('');
  const [gmailClientSecret, setGmailClientSecret] = useState('');

  // Sync with props and check Gmail status
  useEffect(() => {
    setLocalStates(integrations);
    
    // Check if Gmail is connected
    const email = getConnectedEmail();
    setGmailEmail(email);
    
    // Update email integration status based on actual connection
    if (email) {
      setLocalStates(prev => prev.map(s => 
        s.type === 'email' 
          ? { ...s, enabled: true, status: 'connected' as const, metadata: { email } }
          : s
      ));
    }
  }, [integrations, isOpen]);

  // Listen for OAuth popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'gmail-auth-success') {
        setGmailConnecting(false);
        setGmailEmail(event.data.data?.userInfo?.email);
        
        // Update state
        setLocalStates(prev => prev.map(s => 
          s.type === 'email' 
            ? { 
                ...s, 
                enabled: true, 
                status: 'connected' as const, 
                metadata: { email: event.data.data?.userInfo?.email },
                lastChecked: Date.now(),
              }
            : s
        ));
        
        setShowGmailCredentials(false);
      } else if (event.data?.type === 'gmail-auth-error') {
        setGmailConnecting(false);
        setLocalStates(prev => prev.map(s => 
          s.type === 'email' 
            ? { ...s, status: 'error' as const, error: event.data.error }
            : s
        ));
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const getState = (type: IntegrationType): IntegrationState => {
    return localStates.find(s => s.type === type) || {
      type,
      status: 'disconnected',
      enabled: false,
    };
  };

  const updateState = (type: IntegrationType, updates: Partial<IntegrationState>) => {
    setLocalStates(prev => {
      const existing = prev.find(s => s.type === type);
      if (existing) {
        return prev.map(s => s.type === type ? { ...s, ...updates } : s);
      }
      return [...prev, { type, status: 'disconnected', enabled: false, ...updates }];
    });
  };

  const toggleIntegration = async (type: IntegrationType) => {
    const state = getState(type);
    const config = INTEGRATIONS[type];
    
    // Special handling for Gmail
    if (type === 'email') {
      if (state.enabled) {
        // Disconnecting - handled by disconnect button
        return;
      } else {
        // Connecting - show credentials or start OAuth
        setShowGmailCredentials(true);
        setExpandedIntegration('email');
        return;
      }
    }
    
    const newEnabled = !state.enabled;
    updateState(type, { 
      enabled: newEnabled,
      status: newEnabled ? 'connected' : 'disconnected',
    });
  };

  const connectGmail = useCallback(async () => {
    if (!gmailClientId || !gmailClientSecret) {
      return;
    }
    
    setGmailConnecting(true);
    
    try {
      // Get auth URL from API
      const response = await fetch('/api/auth/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: gmailClientId,
          client_secret: gmailClientSecret,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start OAuth');
      }
      
      const { authUrl } = await response.json();
      
      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        authUrl,
        'gmail-oauth',
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      );
      
      if (!popup) {
        throw new Error('Popup blocked - please allow popups for this site');
      }
      
      // Poll for popup closure (fallback if message fails)
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          setGmailConnecting(false);
          
          // Check if we got connected
          const email = getConnectedEmail();
          if (email) {
            setGmailEmail(email);
            setLocalStates(prev => prev.map(s => 
              s.type === 'email' 
                ? { ...s, enabled: true, status: 'connected' as const, metadata: { email } }
                : s
            ));
          }
        }
      }, 500);
      
    } catch (error) {
      setGmailConnecting(false);
      updateState('email', { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    }
  }, [gmailClientId, gmailClientSecret]);

  const disconnectGmail = useCallback(async () => {
    const auth = loadGmailAuth();
    
    if (auth?.tokens?.access_token) {
      try {
        await revokeToken(auth.tokens.access_token);
      } catch {
        // Continue with local cleanup even if revoke fails
      }
    }
    
    clearGmailAuth();
    setGmailEmail(null);
    setGmailClientId('');
    setGmailClientSecret('');
    
    updateState('email', {
      enabled: false,
      status: 'disconnected',
      metadata: undefined,
      error: undefined,
    });
  }, []);

  const testIntegration = async (type: IntegrationType) => {
    setTestingIntegration(type);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (type === 'web-search') {
      updateState(type, { status: 'connected', lastChecked: Date.now() });
    } else if (type === 'email') {
      const email = getConnectedEmail();
      if (email) {
        updateState(type, { status: 'connected', lastChecked: Date.now() });
      } else {
        updateState(type, { status: 'disconnected' });
      }
    } else {
      const config = INTEGRATIONS[type];
      if (config.requiresOAuth || config.requiresApiKey) {
        updateState(type, { status: 'disconnected' });
      } else {
        updateState(type, { status: 'connected', lastChecked: Date.now() });
      }
    }
    
    setTestingIntegration(null);
  };

  const handleSave = () => {
    onUpdateIntegrations(localStates);
    onClose();
  };

  const getStatusBadge = (state: IntegrationState, config: IntegrationConfig) => {
    if (state.status === 'connected' && state.enabled) {
      return (
        <span className="flex items-center gap-1 text-xs text-green-500">
          <Check className="w-3 h-3" />
          Active
        </span>
      );
    }
    if (state.status === 'error') {
      return (
        <span className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="w-3 h-3" />
          Error
        </span>
      );
    }
    if (!state.enabled) {
      return (
        <span className="text-xs text-zinc-500">
          Disabled
        </span>
      );
    }
    if (config.requiresOAuth || config.requiresApiKey) {
      return (
        <span className="text-xs text-amber-500">
          Setup Required
        </span>
      );
    }
    return (
      <span className="text-xs text-zinc-500">
        Ready
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Integrations</h2>
              <p className="text-xs text-zinc-500">Connect services to give MrSnappy superpowers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Privacy Note */}
          <div className="mb-6 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-zinc-200">Your data stays local</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Credentials are stored securely on your device. MrSnappy never sends your data to external servers.
                </p>
              </div>
            </div>
          </div>

          {/* Integration Cards */}
          <div className="space-y-3">
            {Object.values(INTEGRATIONS).map((config) => {
              const state = getState(config.type);
              const isExpanded = expandedIntegration === config.type;
              const isTesting = testingIntegration === config.type;
              const isEmail = config.type === 'email';
              
              return (
                <div
                  key={config.type}
                  className={`rounded-xl border transition-all ${
                    state.enabled 
                      ? 'border-purple-500/50 bg-purple-500/5' 
                      : 'border-zinc-800 bg-zinc-800/30'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center gap-4 p-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                      state.enabled ? 'bg-purple-500/20' : 'bg-zinc-800'
                    }`}>
                      {config.icon}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{config.name}</h3>
                        {getStatusBadge(state, config)}
                        {onOpenHelp && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                              onOpenHelp(INTEGRATION_HELP_TOPICS[config.type]);
                            }}
                            className="p-0.5 rounded hover:bg-zinc-700/50 transition-colors text-zinc-500 hover:text-zinc-300"
                            title={`${config.name} Setup Guide`}
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500 truncate">
                        {isEmail && gmailEmail 
                          ? `Connected: ${gmailEmail}`
                          : config.description
                        }
                      </p>
                    </div>
                    
                    {/* Toggle & Expand */}
                    <div className="flex items-center gap-2">
                      {/* Test button */}
                      {state.enabled && (
                        <button
                          onClick={() => testIntegration(config.type)}
                          disabled={isTesting}
                          className="p-2 rounded-lg hover:bg-zinc-700 transition-colors"
                          title="Test connection"
                        >
                          {isTesting ? (
                            <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                          ) : (
                            <RefreshCw className="w-4 h-4 text-zinc-400" />
                          )}
                        </button>
                      )}
                      
                      {/* Toggle - different for email */}
                      {isEmail ? (
                        gmailEmail ? (
                          <button
                            onClick={disconnectGmail}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Disconnect Gmail"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setShowGmailCredentials(true);
                              setExpandedIntegration('email');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded-lg transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Connect
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => toggleIntegration(config.type)}
                          className={`p-1 rounded-lg transition-colors ${
                            state.enabled ? 'text-purple-400' : 'text-zinc-600'
                          }`}
                        >
                          {state.enabled ? (
                            <ToggleRight className="w-8 h-8" />
                          ) : (
                            <ToggleLeft className="w-8 h-8" />
                          )}
                        </button>
                      )}
                      
                      {/* Expand */}
                      <button
                        onClick={() => setExpandedIntegration(isExpanded ? null : config.type)}
                        className="p-2 rounded-lg hover:bg-zinc-700 transition-colors"
                      >
                        <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-zinc-800 mt-0">
                      <div className="pt-4 space-y-4">
                        {/* Gmail credentials input */}
                        {isEmail && showGmailCredentials && !gmailEmail && (
                          <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                              <KeyRound className="w-4 h-4" />
                              Enter your Google OAuth credentials
                            </div>
                            
                            <p className="text-xs text-zinc-500">
                              You need to create OAuth credentials in the Google Cloud Console. 
                              Click "Setup Guide" below for instructions.
                            </p>
                            
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                  Client ID
                                </label>
                                <input
                                  type="text"
                                  value={gmailClientId}
                                  onChange={(e) => setGmailClientId(e.target.value)}
                                  placeholder="xxx.apps.googleusercontent.com"
                                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                  Client Secret
                                </label>
                                <input
                                  type="password"
                                  value={gmailClientSecret}
                                  onChange={(e) => setGmailClientSecret(e.target.value)}
                                  placeholder="GOCSPX-..."
                                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                                />
                              </div>
                            </div>
                            
                            <button
                              onClick={connectGmail}
                              disabled={!gmailClientId || !gmailClientSecret || gmailConnecting}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-lg transition-colors"
                            >
                              {gmailConnecting ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Connecting...
                                </>
                              ) : (
                                <>
                                  <Mail className="w-4 h-4" />
                                  Connect with Google
                                </>
                              )}
                            </button>
                          </div>
                        )}
                        
                        {/* Capabilities */}
                        {config.scopes && config.scopes.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
                              Capabilities
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {config.scopes.map((scope) => (
                                <span
                                  key={scope}
                                  className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400"
                                >
                                  {scope}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Requirements */}
                        {(config.requiresOAuth || config.requiresApiKey) && !gmailEmail && (
                          <div>
                            <h4 className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
                              Requirements
                            </h4>
                            <div className="space-y-2">
                              {config.requiresOAuth && (
                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                                  Requires OAuth sign-in
                                </div>
                              )}
                              {config.requiresApiKey && (
                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                                  Requires API key
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Setup Guide & Links */}
                        <div className="flex flex-wrap items-center gap-3">
                          {onOpenHelp && (
                            <button
                              onClick={() => {
                                onClose();
                                onOpenHelp(INTEGRATION_HELP_TOPICS[config.type]);
                              }}
                              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <BookOpen className="w-3 h-3" />
                              Setup Guide
                            </button>
                          )}
                          {config.setupUrl && (
                            <a
                              href={config.setupUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                            >
                              Get API credentials
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        
                        {/* API Key input for non-OAuth integrations */}
                        {config.requiresApiKey && !config.requiresOAuth && state.enabled && (
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-2">
                              API Key
                            </label>
                            <input
                              type="password"
                              placeholder="Enter your API key..."
                              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        )}
                        
                        {/* Status info */}
                        {state.lastChecked && (
                          <p className="text-xs text-zinc-600">
                            Last checked: {new Date(state.lastChecked).toLocaleString()}
                          </p>
                        )}
                        {state.error && (
                          <p className="text-xs text-red-400">
                            Error: {state.error}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
          <p className="text-xs text-zinc-500">
            {localStates.filter(s => s.enabled).length} of {Object.keys(INTEGRATIONS).length} integrations enabled
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-purple-500 hover:bg-purple-400 text-white font-medium rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
