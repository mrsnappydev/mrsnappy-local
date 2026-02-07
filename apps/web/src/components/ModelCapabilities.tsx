'use client';

import { Check, FileText, Cpu } from 'lucide-react';
import { ModelCapability, CAPABILITIES } from '@/lib/models/capabilities';
import { ModelMetadata } from '@/lib/models/database';
import CapabilityBadge, { CapabilityBadges } from './CapabilityBadge';

interface ModelCapabilitiesProps {
  capabilities: ModelCapability[];
  metadata?: ModelMetadata | null;
  compact?: boolean;
  className?: string;
}

export default function ModelCapabilities({ 
  capabilities, 
  metadata,
  compact = false,
  className = '' 
}: ModelCapabilitiesProps) {
  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        <CapabilityBadges capabilities={capabilities} compact />
        {metadata?.strengths && metadata.strengths.length > 0 && (
          <p className="text-xs text-zinc-500 truncate">
            {metadata.strengths[0]}
          </p>
        )}
      </div>
    );
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Capabilities Section */}
      <div>
        <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
          Capabilities
        </h4>
        <CapabilityBadges capabilities={capabilities} maxVisible={10} />
      </div>
      
      {/* Strengths Section */}
      {metadata?.strengths && metadata.strengths.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
            Good For
          </h4>
          <ul className="space-y-1">
            {metadata.strengths.map((strength, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                {strength}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Specs Section */}
      {metadata && (
        <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
          {metadata.contextLength && (
            <div className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              <span>{formatContextLength(metadata.contextLength)} context</span>
            </div>
          )}
          {metadata.parameterSizes && metadata.parameterSizes.length > 0 && (
            <div className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" />
              <span>{metadata.parameterSizes.join(', ')}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Description */}
      {metadata?.description && (
        <p className="text-sm text-zinc-400">
          {metadata.description}
        </p>
      )}
    </div>
  );
}

// Format context length for display
function formatContextLength(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${Math.round(tokens / 1000)}K`;
  }
  return tokens.toString();
}

// Compact summary for model cards
interface CapabilitySummaryProps {
  capabilities: ModelCapability[];
  className?: string;
}

export function CapabilitySummary({ capabilities, className = '' }: CapabilitySummaryProps) {
  // Get the top 3 most distinctive capabilities (excluding 'general')
  const prioritized = capabilities
    .filter(c => c !== 'general')
    .slice(0, 3);
  
  // If no distinctive capabilities, show general
  const toShow = prioritized.length > 0 ? prioritized : ['general' as ModelCapability];
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {toShow.map(cap => {
        const info = CAPABILITIES[cap];
        return (
          <span 
            key={cap} 
            className="text-xs" 
            title={info?.label}
          >
            {info?.icon}
          </span>
        );
      })}
    </div>
  );
}

// "Best for" inline text
export function BestForText({ capabilities }: { capabilities: ModelCapability[] }) {
  const distinctive = capabilities.filter(c => c !== 'general');
  
  if (distinctive.length === 0) {
    return <span className="text-xs text-zinc-500">General purpose</span>;
  }
  
  const labels = distinctive.slice(0, 2).map(c => CAPABILITIES[c]?.label).filter(Boolean);
  
  return (
    <span className="text-xs text-zinc-500">
      Best for: <span className="text-zinc-400">{labels.join(', ')}</span>
    </span>
  );
}
