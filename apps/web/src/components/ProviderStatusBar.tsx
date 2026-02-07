'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Check, 
  X, 
  RefreshCw, 
  Play, 
  Loader2,
  ChevronDown,
  Terminal,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { ProviderType, detectProviders, DetectedProvider } from '@/lib/providers';
import { getProviderStartInfo, ProviderStartInfo } from '@/lib/providers/autostart';

interface ProviderStatusBarProps {
  currentProvider: ProviderType;
  onSwitchProvider: (provider: ProviderType) => void;
  onProviderStatusChange?: (connected: boolean) => void;
}

export default function ProviderStatusBar({
  currentProvider,
  onSwitchProvider,
  onProviderStatusChange,
}: ProviderStatusBarProps) {
  const [providers, setProviders] = useState<DetectedProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [startingProvider, setStartingProvider] = useState<ProviderType | null>(null);
  const [showStartGuide, setShowStartGuide] = useState<ProviderType | null>(null);

  const checkProviders = useCallback(async () => {
    setIsLoading(true);
    try {
      const detected = await detectProviders();
      setProviders(detected);
      
      // Report current provider status
      const current = detected.find(p => p.type === currentProvider);
      onProviderStatusChange?.(current?.connected ?? false);
    } catch (error) {
      console.error('Failed to detect providers:', error);
    }
    setIsLoading(false);
  }, [currentProvider, onProviderStatusChange]);

  useEffect(() => {
    checkProviders();
    // Poll every 10 seconds
    const interval = setInterval(checkProviders, 10000);
    return () => clearInterval(interval);
  }, [checkProviders]);

  const currentProviderStatus = providers.find(p => p.type === currentProvider);
  const otherProvider = providers.find(p => p.type !== currentProvider);
  
  const getProviderIcon = (type: ProviderType) => type === 'ollama' ? '🦙' : '🎛️';
  const getProviderName = (type: ProviderType) => type === 'ollama' ? 'Ollama' : 'LM Studio';

  const handleStartProvider = async (type: ProviderType) => {
    setStartingProvider(type);
    setShowStartGuide(type);
  };

  const handleSwitchToProvider = (type: ProviderType) => {
    const target = providers.find(p => p.type === type);
    if (target?.connected) {
      onSwitchProvider(type);
      setIsDropdownOpen(false);
    } else {
      setShowStartGuide(type);
    }
  };

  const startInfo = showStartGuide ? getProviderStartInfo(showStartGuide, false) : null;

  return (
    <>
      <div className="relative">
        {/* Main Status Button */}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
            currentProviderStatus?.connected
              ? 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20'
              : 'bg-red-500/10 border border-red-500/30 hover:bg-red-500/20'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
          ) : (
            <>
              <span className="text-sm">{getProviderIcon(currentProvider)}</span>
              <span className="text-sm font-medium">
                {getProviderName(currentProvider)}
              </span>
              {currentProviderStatus?.connected ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <X className="w-4 h-4 text-red-400" />
              )}
              <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${
                isDropdownOpen ? 'rotate-180' : ''
              }`} />
            </>
          )}
        </button>

        {/* Dropdown */}
        {isDropdownOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsDropdownOpen(false)}
            />
            
            {/* Menu */}
            <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">Providers</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      checkProviders();
                    }}
                    className="p-1 hover:bg-zinc-800 rounded transition-colors"
                    title="Refresh status"
                  >
                    <RefreshCw className={`w-3 h-3 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              
              <div className="p-2">
                {providers.map((provider) => (
                  <div
                    key={provider.type}
                    onClick={() => provider.connected && handleSwitchToProvider(provider.type)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && provider.connected && handleSwitchToProvider(provider.type)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                      provider.type === currentProvider
                        ? 'bg-amber-500/10 border border-amber-500/30'
                        : 'hover:bg-zinc-800'
                    }`}
                  >
                    <span className="text-xl">{getProviderIcon(provider.type)}</span>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {getProviderName(provider.type)}
                        </span>
                        {provider.type === currentProvider && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <span className={`text-xs ${
                        provider.connected ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {provider.connected 
                          ? `Running · ${provider.modelCount} models`
                          : 'Not running'}
                      </span>
                    </div>
                    {provider.connected ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartProvider(provider.type);
                        }}
                        className="px-2 py-1 text-xs bg-amber-500 text-zinc-900 rounded hover:bg-amber-400 flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        Start
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Quick tip */}
              <div className="px-3 py-2 bg-zinc-800/50 border-t border-zinc-800">
                <p className="text-[10px] text-zinc-500">
                  💡 Click a provider to switch. Both can run simultaneously.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Start Guide Modal */}
      {showStartGuide && startInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowStartGuide(null);
              setStartingProvider(null);
            }}
          />
          
          <div className="relative w-full max-w-md mx-4 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <span className="text-2xl">{getProviderIcon(showStartGuide)}</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Start {startInfo.name}</h3>
                <p className="text-sm text-zinc-400">
                  {startInfo.name} needs to be running to use its models
                </p>
              </div>
            </div>

            {/* Warning if currently using this provider */}
            {showStartGuide === currentProvider && !currentProviderStatus?.connected && (
              <div className="flex items-start gap-2 p-3 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-400">
                  This is your active provider but it's not running. Start it or switch to another provider.
                </p>
              </div>
            )}

            {/* Start Command */}
            {startInfo.startCommand && (
              <div className="mb-4">
                <p className="text-xs text-zinc-500 mb-2">Quick start command:</p>
                <div className="flex items-center gap-2 p-3 bg-zinc-950 rounded-lg font-mono text-sm border border-zinc-800">
                  <Terminal className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  <code className="text-amber-400 flex-1">{startInfo.startCommand}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(startInfo.startCommand!)}
                    className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mb-4">
              <p className="text-xs text-zinc-500 mb-2">Step by step:</p>
              <ol className="space-y-2">
                {startInfo.instructions.map((instruction, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs flex-shrink-0 text-zinc-400">
                      {i + 1}
                    </span>
                    <span className="text-zinc-300">{instruction.replace(/^\d+\.\s*/, '')}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
              {startInfo.downloadUrl && (
                <a
                  href={startInfo.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Download
                </a>
              )}
              <button
                onClick={async () => {
                  await checkProviders();
                  const updated = providers.find(p => p.type === showStartGuide);
                  if (updated?.connected) {
                    setShowStartGuide(null);
                    setStartingProvider(null);
                    if (showStartGuide !== currentProvider) {
                      onSwitchProvider(showStartGuide);
                    }
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-500 hover:bg-amber-400 text-zinc-900 rounded-lg transition-colors ml-auto"
              >
                <RefreshCw className={`w-4 h-4 ${startingProvider ? 'animate-spin' : ''}`} />
                Check Connection
              </button>
            </div>

            {/* Switch to other provider option */}
            {otherProvider?.connected && showStartGuide !== otherProvider.type && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <button
                  onClick={() => {
                    onSwitchProvider(otherProvider.type);
                    setShowStartGuide(null);
                    setStartingProvider(null);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <span>{getProviderIcon(otherProvider.type)}</span>
                  Switch to {getProviderName(otherProvider.type)} instead (running)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
