'use client';

import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Terminal, 
  ExternalLink,
  Check,
  Loader2,
  Zap,
} from 'lucide-react';
import { detectProviders, DetectedProvider } from '@/lib/providers';
import { getProviderStartInfo } from '@/lib/providers/autostart';

interface NoProviderPromptProps {
  onProviderReady: (provider: 'ollama' | 'lmstudio') => void;
}

export default function NoProviderPrompt({ onProviderReady }: NoProviderPromptProps) {
  const [providers, setProviders] = useState<DetectedProvider[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<'ollama' | 'lmstudio'>('ollama');

  const checkProviders = async () => {
    setIsChecking(true);
    try {
      const detected = await detectProviders();
      setProviders(detected);
      
      // If a provider is now available, notify parent
      const connected = detected.find(p => p.connected);
      if (connected) {
        onProviderReady(connected.type as 'ollama' | 'lmstudio');
      }
    } catch (error) {
      console.error('Failed to detect providers:', error);
    }
    setIsChecking(false);
  };

  useEffect(() => {
    checkProviders();
  }, []);

  const ollamaInfo = getProviderStartInfo('ollama', false);
  const lmstudioInfo = getProviderStartInfo('lmstudio', false);
  
  const selectedInfo = selectedProvider === 'ollama' ? ollamaInfo : lmstudioInfo;
  const providerStatus = providers.find(p => p.type === selectedProvider);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      {/* Logo */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mb-6">
        <Zap className="w-10 h-10 text-zinc-900" />
      </div>
      
      <h2 className="text-2xl font-bold mb-2">No AI Provider Running</h2>
      <p className="text-zinc-400 text-center max-w-md mb-8">
        MrSnappy needs either Ollama or LM Studio running to work. 
        Choose one below to get started.
      </p>

      {/* Provider Selection */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setSelectedProvider('ollama')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
            selectedProvider === 'ollama'
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
          }`}
        >
          <span className="text-3xl">🦙</span>
          <span className="font-medium">Ollama</span>
          <span className="text-xs text-zinc-500">Recommended</span>
        </button>
        
        <button
          onClick={() => setSelectedProvider('lmstudio')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
            selectedProvider === 'lmstudio'
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
          }`}
        >
          <span className="text-3xl">🎛️</span>
          <span className="font-medium">LM Studio</span>
          <span className="text-xs text-zinc-500">GUI App</span>
        </button>
      </div>

      {/* Instructions Card */}
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <span>{selectedProvider === 'ollama' ? '🦙' : '🎛️'}</span>
            Start {selectedInfo.name}
          </h3>
          {providerStatus && (
            <span className={`flex items-center gap-1 text-sm ${
              providerStatus.connected ? 'text-green-400' : 'text-zinc-500'
            }`}>
              {providerStatus.connected ? (
                <>
                  <Check className="w-4 h-4" />
                  Running
                </>
              ) : (
                'Not running'
              )}
            </span>
          )}
        </div>

        {/* Quick Command (Ollama) */}
        {selectedInfo.startCommand && (
          <div className="mb-4">
            <p className="text-xs text-zinc-500 mb-2">Quick start command:</p>
            <div className="flex items-center gap-2 p-3 bg-zinc-950 rounded-lg font-mono text-sm border border-zinc-800">
              <Terminal className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <code className="text-amber-400 flex-1">{selectedInfo.startCommand}</code>
              <button
                onClick={() => navigator.clipboard.writeText(selectedInfo.startCommand!)}
                className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Step by step */}
        <div className="mb-4">
          <p className="text-xs text-zinc-500 mb-2">Step by step:</p>
          <ol className="space-y-2">
            {selectedInfo.instructions.map((instruction, i) => (
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
          {selectedInfo.downloadUrl && (
            <a
              href={selectedInfo.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Download {selectedInfo.name}
            </a>
          )}
          <button
            onClick={checkProviders}
            disabled={isChecking}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-500 hover:bg-amber-400 text-zinc-900 rounded-lg transition-colors ml-auto font-medium"
          >
            {isChecking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Check Connection
          </button>
        </div>
      </div>

      {/* Alternative provider hint */}
      <p className="mt-6 text-xs text-zinc-600">
        {selectedProvider === 'ollama' 
          ? 'Prefer a GUI? Try LM Studio instead.'
          : 'Want something simpler? Try Ollama instead.'}
      </p>
    </div>
  );
}
