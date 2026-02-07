'use client';

import { useState } from 'react';
import { ModelCapability, CAPABILITIES } from '@/lib/models/capabilities';

interface CapabilityBadgeProps {
  capability: ModelCapability;
  compact?: boolean;
  showTooltip?: boolean;
  className?: string;
}

// Map capability color to actual Tailwind classes
// (Can't use dynamic classes in Tailwind)
const COLOR_CLASSES: Record<string, { bg: string; text: string }> = {
  zinc: { bg: 'bg-zinc-500/20', text: 'text-zinc-400' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  pink: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  rose: { bg: 'bg-rose-500/20', text: 'text-rose-400' },
  green: { bg: 'bg-green-500/20', text: 'text-green-400' },
  teal: { bg: 'bg-teal-500/20', text: 'text-teal-400' },
  indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  red: { bg: 'bg-red-500/20', text: 'text-red-400' },
};

export default function CapabilityBadge({ 
  capability, 
  compact = false, 
  showTooltip = true,
  className = '' 
}: CapabilityBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const info = CAPABILITIES[capability];
  if (!info) return null;
  
  const colors = COLOR_CLASSES[info.color] || COLOR_CLASSES.zinc;
  
  if (compact) {
    return (
      <div className="relative">
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs ${colors.bg} ${colors.text} cursor-default ${className}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          title={showTooltip ? `${info.label}: ${info.description}` : undefined}
        >
          {info.icon}
        </span>
        
        {/* Tooltip */}
        {showTooltip && isHovered && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs whitespace-nowrap z-50 shadow-lg">
            <span className="font-medium">{info.icon} {info.label}</span>
            <span className="text-zinc-400 ml-1">- {info.description}</span>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="relative">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${colors.bg} ${colors.text} cursor-default ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span>{info.icon}</span>
        <span>{info.label}</span>
      </span>
      
      {/* Tooltip */}
      {showTooltip && isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-xs whitespace-nowrap z-50 shadow-lg max-w-xs">
          <div className="font-medium text-zinc-200">{info.icon} {info.label}</div>
          <div className="text-zinc-400 mt-0.5">{info.description}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
        </div>
      )}
    </div>
  );
}

// Helper component to render multiple badges
interface CapabilityBadgesProps {
  capabilities: ModelCapability[];
  compact?: boolean;
  maxVisible?: number;
  className?: string;
}

export function CapabilityBadges({ 
  capabilities, 
  compact = false, 
  maxVisible = 5,
  className = '' 
}: CapabilityBadgesProps) {
  const visible = capabilities.slice(0, maxVisible);
  const remaining = capabilities.length - maxVisible;
  
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {visible.map((cap) => (
        <CapabilityBadge key={cap} capability={cap} compact={compact} />
      ))}
      {remaining > 0 && (
        <span className="px-1.5 py-0.5 text-xs bg-zinc-700 text-zinc-400 rounded">
          +{remaining}
        </span>
      )}
    </div>
  );
}
