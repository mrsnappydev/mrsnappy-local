'use client';

import { useState, useEffect } from 'react';
import { X, RotateCcw, Check, AlertCircle, Loader2, Server, Zap, Network, Plus, Trash2 } from 'lucide-react';
import { Settings } from '@/hooks/useSettings';
import { 
  ProviderType, 
  ModelInfo, 
  detectProviders, 
  DetectedProvider,
  createProvider,
  getProviderStartInfo,
  ProviderStartInfo,
} from '@/lib/providers';
import ProviderStartGuide from './ProviderStartGuide';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdateSettings: (updates: Partial<Settings>) => void;
  onSwitchProvider: (provider: ProviderType) => void;
  onResetSettings: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onSwitchProvider,
  onResetSettings,
}: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [detectedProviders, setDetectedProviders] = useState<DetectedProvider[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isDetectingProviders, setIsDetectingProviders] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state when settings prop changes
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(localSettings) !== JSON.stringify(settings);
    setHasChanges(changed);
  }, [localSettings, settings]);

  // Detect providers and fetch models when modal opens
  useEffect(() => {
    if (isOpen) {
      runProviderDetection();
      fetchModels();
    }
  }, [isOpen]);

  // Refetch models when provider or URL changes
  useEffect(() => {
    if (isOpen) {
      fetchModels();
    }
  }, [localSettings.provider, localSettings.providerUrl]);

  const runProviderDetection = async () => {
    setIsDetectingProviders(true);
    try {
      const detected = await detectProviders();
      setDetectedProviders(detected);
    } catch (error) {
      console.error('Provider detection failed:', error);
    }
    setIsDetectingProviders(false);
  };

  const fetchModels = async () => {
    setIsLoadingModels(true);
    setConnectionStatus('checking');
    
    // Handle Anthropic separately (predefined models, API key validation)
    if (localSettings.provider === 'anthropic') {
      const claudeModels = [
        { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic' as ProviderType },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic' as ProviderType },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)', provider: 'anthropic' as ProviderType },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' as ProviderType },
      ];
      
      setAvailableModels(claudeModels);
      setConnectionStatus(localSettings.anthropicApiKey ? 'connected' : 'error');
      
      // Auto-select first model if none selected
      if (!localSettings.model || !localSettings.model.startsWith('claude')) {
        setLocalSettings(prev => ({ ...prev, model: 'claude-sonnet-4-20250514' }));
      }
      
      setIsLoadingModels(false);
      return;
    }
    
    try {
      const provider = createProvider({
        type: localSettings.provider,
        name: localSettings.provider,
        baseUrl: localSettings.providerUrl,
      });
      
      const status = await provider.getStatus();
      
      if (status.connected) {
        setAvailableModels(status.models);
        setConnectionStatus('connected');
        
        // Auto-select first model if none selected
        if (!localSettings.model && status.models.length > 0) {
          setLocalSettings(prev => ({ ...prev, model: status.models[0].id }));
        }
      } else {
        setAvailableModels([]);
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
      setAvailableModels([]);
      setConnectionStatus('error');
    }
    
    setIsLoadingModels(false);
  };

  const handleProviderChange = (provider: ProviderType) => {
    const detected = detectedProviders.find(p => p.type === provider);
    const defaultUrl = detected?.baseUrl || getDefaultUrl(provider);
    
    setLocalSettings(prev => ({
      ...prev,
      provider,
      providerUrl: defaultUrl,
      model: '', // Reset model selection
    }));
  };

  const getDefaultUrl = (provider: ProviderType): string => {
    switch (provider) {
      case 'ollama': return 'http://localhost:11434';
      case 'lmstudio': return 'http://localhost:1234';
      case 'anthropic': return 'https://api.anthropic.com';
      default: return 'http://localhost:8080';
    }
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    if (localSettings.provider !== settings.provider) {
      onSwitchProvider(localSettings.provider);
    }
    onClose();
  };

  const handleReset = () => {
    onResetSettings();
    setLocalSettings(settings);
  };

  const formatSize = (bytes?: number): string => {
    if (!bytes) return '';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const getProviderIcon = (type: ProviderType) => {
    switch (type) {
      case 'ollama': return '🦙';
      case 'lmstudio': return '🎛️';
      case 'anthropic': return '🧠';
      default: return '🔌';
    }
  };

  const getProviderName = (type: ProviderType) => {
    switch (type) {
      case 'ollama': return 'Ollama';
      case 'lmstudio': return 'LM Studio';
      case 'anthropic': return 'Claude';
      default: return type;
    }
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
      <div className="relative w-full max-w-lg mx-4 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Provider Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-zinc-300">
                Model Provider
              </label>
              <button
                onClick={runProviderDetection}
                disabled={isDetectingProviders}
                className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1"
              >
                {isDetectingProviders ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3" />
                )}
                Detect
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {(['ollama', 'lmstudio', 'anthropic'] as ProviderType[]).map((type) => {
                const detected = detectedProviders.find(p => p.type === type);
                const isSelected = localSettings.provider === type;
                const isConnected = type === 'anthropic' 
                  ? !!localSettings.anthropicApiKey 
                  : detected?.connected;
                
                return (
                  <button
                    key={type}
                    onClick={() => handleProviderChange(type)}
                    className={`relative p-3 rounded-lg border text-left transition-all ${
                      isSelected 
                        ? 'border-amber-500 bg-amber-500/10' 
                        : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getProviderIcon(type)}</span>
                      <span className="font-medium text-sm">
                        {getProviderName(type)}
                      </span>
                    </div>
                    {type === 'anthropic' ? (
                      <div className="mt-1 flex items-center gap-1">
                        {localSettings.anthropicApiKey ? (
                          <>
                            <Check className="w-3 h-3 text-green-500" />
                            <span className="text-xs text-green-500">API key set</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-zinc-500" />
                            <span className="text-xs text-zinc-500">Need API key</span>
                          </>
                        )}
                      </div>
                    ) : detected && (
                      <div className="mt-1 flex items-center gap-1">
                        {isConnected ? (
                          <>
                            <Check className="w-3 h-3 text-green-500" />
                            <span className="text-xs text-green-500">
                              {detected.modelCount} model{detected.modelCount !== 1 ? 's' : ''}
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-zinc-500" />
                            <span className="text-xs text-zinc-500">Not running</span>
                          </>
                        )}
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4 text-amber-500" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Anthropic API Key (only shown when Anthropic is selected) */}
          {localSettings.provider === 'anthropic' && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Anthropic API Key
              </label>
              <input
                type="password"
                value={localSettings.anthropicApiKey || ''}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, anthropicApiKey: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-amber-500"
                placeholder="sk-ant-..."
              />
              <p className="text-xs text-zinc-500 mt-2">
                Get your API key from{' '}
                <a 
                  href="https://console.anthropic.com/settings/keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline"
                >
                  console.anthropic.com
                </a>
              </p>
              <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-xs text-amber-400">
                  <strong>🧠 Claude as Head Agent</strong><br/>
                  Claude orchestrates tools (web search, calendar, etc.) and can delegate 
                  to local models (Ollama/LM Studio) for specific tasks.
                </p>
              </div>
            </div>
          )}

          {/* Provider URL (for local providers) */}
          {localSettings.provider !== 'anthropic' && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                {getProviderName(localSettings.provider)} URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localSettings.providerUrl}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, providerUrl: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-amber-500"
                  placeholder={getDefaultUrl(localSettings.provider)}
                />
                <button
                  onClick={fetchModels}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  Test
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {connectionStatus === 'checking' && (
                  <>
                    <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
                    <span className="text-xs text-zinc-500">Checking connection...</span>
                  </>
                )}
                {connectionStatus === 'connected' && (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-500">Connected</span>
                  </>
                )}
                {connectionStatus === 'error' && (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-red-500">
                      Cannot connect to {getProviderName(localSettings.provider)}
                    </span>
                  </>
                )}
              </div>
              
              {/* Provider Start Guide - shown when offline */}
              {connectionStatus === 'error' && (
                <div className="mt-3">
                  <ProviderStartGuide
                    provider={getProviderStartInfo(localSettings.provider, false)}
                    onRefresh={fetchModels}
                    compact
                  />
                </div>
              )}
            </div>
          )}

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Model
            </label>
            {isLoadingModels ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                <span className="text-sm text-zinc-500">Loading models...</span>
              </div>
            ) : availableModels.length > 0 ? (
              <select
                value={localSettings.model}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, model: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="">Select a model...</option>
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} {model.size ? `(${formatSize(model.size)})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={localSettings.model}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Enter model name"
                />
                <p className="text-xs text-zinc-500">
                  Connect to {localSettings.provider === 'ollama' ? 'Ollama' : 'LM Studio'} to see available models
                </p>
              </div>
            )}
          </div>

          {/* Streaming Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-zinc-300">
                Streaming Responses
              </label>
              <p className="text-xs text-zinc-500 mt-0.5">
                Watch responses appear in real-time
              </p>
            </div>
            <button
              onClick={() => setLocalSettings(prev => ({ ...prev, streamingEnabled: !prev.streamingEnabled }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                localSettings.streamingEnabled ? 'bg-amber-500' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  localSettings.streamingEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              System Prompt
            </label>
            <textarea
              value={localSettings.systemPrompt}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
              rows={6}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-amber-500 resize-none"
              placeholder="Define MrSnappy's personality..."
            />
            <p className="text-xs text-zinc-500 mt-1">
              This sets MrSnappy's personality and behavior
            </p>
          </div>

          {/* Network Settings */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Network className="w-4 h-4 text-zinc-400" />
              <label className="text-sm font-medium text-zinc-300">
                Trusted Networks
              </label>
            </div>
            <p className="text-xs text-zinc-500 mb-3">
              IP prefixes and domains considered "local" for model imports. 
              Useful for Tailscale, VPN, or LAN setups.
            </p>
            
            <div className="space-y-2 max-h-32 overflow-y-auto mb-2">
              {(localSettings.trustedNetworks || []).map((network, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={network}
                    onChange={(e) => {
                      const updated = [...(localSettings.trustedNetworks || [])];
                      updated[index] = e.target.value;
                      setLocalSettings(prev => ({ ...prev, trustedNetworks: updated }));
                    }}
                    className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs focus:outline-none focus:border-amber-500"
                    placeholder="e.g., 100. or .ts.net"
                  />
                  <button
                    onClick={() => {
                      const updated = (localSettings.trustedNetworks || []).filter((_, i) => i !== index);
                      setLocalSettings(prev => ({ ...prev, trustedNetworks: updated }));
                    }}
                    className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => {
                const updated = [...(localSettings.trustedNetworks || []), ''];
                setLocalSettings(prev => ({ ...prev, trustedNetworks: updated }));
              }}
              className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400"
            >
              <Plus className="w-3 h-3" />
              Add network
            </button>
            
            <div className="mt-3 p-2 bg-zinc-800/50 rounded text-xs text-zinc-500">
              <strong>Examples:</strong>
              <ul className="mt-1 space-y-0.5">
                <li>• <code className="text-amber-400">100.</code> — Tailscale IPs</li>
                <li>• <code className="text-amber-400">192.168.</code> — Home network</li>
                <li>• <code className="text-amber-400">.ts.net</code> — Tailscale MagicDNS</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to defaults
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 font-medium rounded-lg transition-colors"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
