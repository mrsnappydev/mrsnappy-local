'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Link,
  Unlink,
  Check,
  AlertCircle,
  Loader2,
  FolderSymlink,
  RotateCcw,
  Copy,
  ChevronDown,
  ChevronUp,
  Info,
  Terminal,
} from 'lucide-react';

interface ProviderConfigStatus {
  provider: 'ollama' | 'lmstudio';
  configured: boolean;
  usingCentralStorage: boolean;
  currentPath: string;
  centralStoragePath: string;
  symlinkExists: boolean;
  backupExists: boolean;
  backupPath?: string;
  envVarSet?: boolean;
  instructions?: string[];
}

interface ConfigureProviderStorageProps {
  onConfigChange?: () => void;
}

export default function ConfigureProviderStorage({ onConfigChange }: ConfigureProviderStorageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [providers, setProviders] = useState<{
    ollama: ProviderConfigStatus;
    lmstudio: ProviderConfigStatus;
  } | null>(null);
  const [centralStoragePath, setCentralStoragePath] = useState<string>('');
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<'ollama' | 'lmstudio' | null>(null);
  const [showInstructions, setShowInstructions] = useState<'ollama' | 'lmstudio' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/models/configure-provider');
      if (!response.ok) throw new Error('Failed to fetch configuration status');
      
      const data = await response.json();
      setProviders(data.providers);
      setCentralStoragePath(data.centralStoragePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
    
    setIsLoading(false);
  };

  const handleConfigure = async (provider: 'ollama' | 'lmstudio') => {
    setConfiguring(provider);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/models/configure-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          action: 'configure',
          createBackup: true,
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Configuration failed');
      }
      
      setSuccessMessage(result.message || `${provider === 'ollama' ? 'Ollama' : 'LM Studio'} configured successfully!`);
      await fetchStatus();
      onConfigChange?.();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
    
    setConfiguring(null);
  };

  const handleRestore = async (provider: 'ollama' | 'lmstudio') => {
    setConfiguring(`restore-${provider}`);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/models/configure-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          action: 'restore',
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Restore failed');
      }
      
      setSuccessMessage(result.message || 'Restored original configuration');
      await fetchStatus();
      onConfigChange?.();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
    
    setConfiguring(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const renderProviderCard = (
    status: ProviderConfigStatus,
    icon: string,
    name: string
  ) => {
    const isExpanded = expandedProvider === status.provider;
    const isConfiguring = configuring === status.provider;
    const isRestoring = configuring === `restore-${status.provider}`;
    
    return (
      <div className="border border-zinc-700 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-zinc-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">{icon}</span>
              <div>
                <h4 className="font-medium text-zinc-200">{name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  {status.usingCentralStorage ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-xs text-green-500">Using central storage</span>
                    </>
                  ) : (
                    <>
                      <Info className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-xs text-zinc-500">Using default storage</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setExpandedProvider(isExpanded ? null : status.provider)}
              className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              )}
            </button>
          </div>
        </div>
        
        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-zinc-700 p-4 space-y-4">
            {/* Current Status */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Current Path:</span>
                <span className="text-zinc-300 font-mono text-xs truncate max-w-[200px]" title={status.currentPath}>
                  {status.currentPath || '(not set)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Central Storage:</span>
                <span className="text-zinc-300 font-mono text-xs truncate max-w-[200px]" title={status.centralStoragePath}>
                  {status.centralStoragePath}
                </span>
              </div>
              {status.symlinkExists && (
                <div className="flex items-center gap-2">
                  <FolderSymlink className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-blue-400">Symlink active</span>
                </div>
              )}
              {status.backupExists && (
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-amber-400">Backup available</span>
                </div>
              )}
              {status.provider === 'ollama' && status.envVarSet && (
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs text-green-400">OLLAMA_MODELS env var set</span>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {!status.usingCentralStorage ? (
                <button
                  onClick={() => handleConfigure(status.provider)}
                  disabled={isConfiguring || isRestoring}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-900 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isConfiguring ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link className="w-4 h-4" />
                  )}
                  Configure Symlink
                </button>
              ) : (
                <button
                  onClick={() => handleRestore(status.provider)}
                  disabled={isConfiguring || isRestoring}
                  className="flex items-center gap-2 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                  {isRestoring ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Unlink className="w-4 h-4" />
                  )}
                  Restore Original
                </button>
              )}
              
              <button
                onClick={() => setShowInstructions(showInstructions === status.provider ? null : status.provider)}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
              >
                <Info className="w-4 h-4" />
                Manual Setup
              </button>
            </div>
            
            {/* Manual Instructions */}
            {showInstructions === status.provider && status.instructions && (
              <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-400">Manual Configuration</span>
                  <button
                    onClick={() => copyToClipboard(status.instructions?.join('\n') || '')}
                    className="text-xs text-zinc-500 hover:text-zinc-400 flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="text-xs text-zinc-400 font-mono whitespace-pre-wrap">
                  {status.instructions.join('\n')}
                </pre>
              </div>
            )}
            
            {/* Warning for Ollama */}
            {status.provider === 'ollama' && !status.usingCentralStorage && (
              <div className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-500/80">
                  After configuring, restart Ollama for changes to take effect.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <FolderSymlink className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h3 className="font-medium text-zinc-200">Configure Provider Storage</h3>
          <p className="text-xs text-zinc-500">
            Set up providers to use central model storage
          </p>
        </div>
      </div>
      
      {/* Info Banner */}
      <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-400/80">
          <p className="font-medium mb-1">Why configure provider storage?</p>
          <p>
            By pointing Ollama and LM Studio to your central storage, they'll automatically 
            see all your models without needing to import each one separately.
          </p>
        </div>
      </div>
      
      {/* Central Storage Path */}
      <div className="p-3 bg-zinc-800/50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Central Storage Location</span>
          <code className="text-xs text-amber-500 bg-zinc-900 px-2 py-1 rounded">
            {centralStoragePath}
          </code>
        </div>
      </div>
      
      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      
      {/* Success */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-400 whitespace-pre-line">{successMessage}</p>
        </div>
      )}
      
      {/* Provider Cards */}
      {providers && (
        <div className="space-y-3">
          {renderProviderCard(providers.ollama, '🦙', 'Ollama')}
          {renderProviderCard(providers.lmstudio, '🎛️', 'LM Studio')}
        </div>
      )}
      
      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-2 text-xs text-zinc-500">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <p>
          Symlink configuration creates a backup of your existing models directory.
          You can restore it at any time.
        </p>
      </div>
    </div>
  );
}
