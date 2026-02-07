'use client';

import { ExternalLink, Terminal, RefreshCw, Zap, AlertCircle } from 'lucide-react';
import { ProviderStartInfo } from '@/lib/providers';

interface ProviderStartGuideProps {
  provider: ProviderStartInfo;
  onRefresh: () => void;
  compact?: boolean;
}

export default function ProviderStartGuide({
  provider,
  onRefresh,
  compact = false,
}: ProviderStartGuideProps) {
  const providerEmoji = provider.type === 'ollama' ? '🦙' : '🎛️';
  
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-amber-400">
            {providerEmoji} {provider.name} is not running
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {provider.type === 'ollama' 
              ? 'Run `ollama serve` in terminal'
              : 'Open LM Studio and start the server'}
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 hover:bg-zinc-800 rounded transition-colors flex-shrink-0"
          title="Check again"
        >
          <RefreshCw className="w-4 h-4 text-zinc-400" />
        </button>
      </div>
    );
  }
  
  return (
    <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">{providerEmoji}</span>
        </div>
        <div>
          <h3 className="font-semibold text-zinc-100">
            Start {provider.name}
          </h3>
          <p className="text-sm text-zinc-400 mt-0.5">
            {provider.name} needs to be running for MrSnappy to work
          </p>
        </div>
      </div>
      
      {/* Start Command (for Ollama) */}
      {provider.startCommand && (
        <div className="mb-4">
          <p className="text-xs text-zinc-500 mb-2">Quick start command:</p>
          <div className="flex items-center gap-2 p-3 bg-zinc-900 rounded-lg font-mono text-sm">
            <Terminal className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <code className="text-amber-400 flex-1">{provider.startCommand}</code>
            <button
              onClick={() => navigator.clipboard.writeText(provider.startCommand!)}
              className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      )}
      
      {/* Step by step instructions */}
      <div className="mb-4">
        <p className="text-xs text-zinc-500 mb-2">Step by step:</p>
        <ol className="space-y-2">
          {provider.instructions.map((instruction, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-xs flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-zinc-300">{instruction.replace(/^\d+\.\s*/, '')}</span>
            </li>
          ))}
        </ol>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-3 pt-3 border-t border-zinc-700">
        {provider.downloadUrl && (
          <a
            href={provider.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Download {provider.name}
          </a>
        )}
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-amber-500 hover:bg-amber-400 text-zinc-900 rounded-lg transition-colors ml-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Check Connection
        </button>
      </div>
    </div>
  );
}
