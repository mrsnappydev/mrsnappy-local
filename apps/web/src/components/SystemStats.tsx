'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Cpu, 
  HardDrive, 
  Activity, 
  ChevronDown, 
  ChevronUp,
  Gpu,
  X
} from 'lucide-react';

interface SystemStatsData {
  ram: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    percentage: number;
    cores: number;
    model: string;
  };
  gpu: {
    available: boolean;
    name?: string;
    vram?: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

// Color based on usage percentage
function getUsageColor(percentage: number): string {
  if (percentage < 50) return 'bg-green-500';
  if (percentage < 80) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getUsageTextColor(percentage: number): string {
  if (percentage < 50) return 'text-green-400';
  if (percentage < 80) return 'text-yellow-400';
  return 'text-red-400';
}

interface MiniBarProps {
  percentage: number;
  label: string;
  icon: React.ReactNode;
}

function MiniBar({ percentage, label, icon }: MiniBarProps) {
  return (
    <div className="flex items-center gap-1.5" title={`${label}: ${percentage}%`}>
      <span className="text-zinc-400">{icon}</span>
      <div className="w-8 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${getUsageColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface FullStatProps {
  label: string;
  icon: React.ReactNode;
  used: number;
  total: number;
  unit: string;
  percentage: number;
  subtitle?: string;
}

function FullStat({ label, icon, used, total, unit, percentage, subtitle }: FullStatProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">{icon}</span>
          <span className="text-xs font-medium text-zinc-300">{label}</span>
        </div>
        <span className={`text-xs font-mono ${getUsageTextColor(percentage)}`}>
          {percentage}%
        </span>
      </div>
      <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${getUsageColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{used.toFixed(1)} / {total.toFixed(1)} {unit}</span>
        {subtitle && <span>{subtitle}</span>}
      </div>
    </div>
  );
}

export default function SystemStats() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [stats, setStats] = useState<SystemStatsData | null>(null);
  const [error, setError] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/system/stats');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStats(data);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  // Initial fetch and interval
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000); // Update every 3 seconds
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 p-2 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors z-40"
        title="Show system stats"
      >
        <Activity className="w-4 h-4 text-zinc-400" />
      </button>
    );
  }

  if (error || !stats) {
    return (
      <div className="fixed bottom-4 right-4 px-3 py-2 bg-zinc-900/95 backdrop-blur-sm rounded-xl border border-zinc-800 z-40">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Activity className="w-3 h-3" />
          <span>{error ? 'Stats unavailable' : 'Loading...'}</span>
        </div>
      </div>
    );
  }

  // Collapsed view
  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-3 px-3 py-2 bg-zinc-900/95 backdrop-blur-sm rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all group"
        >
          <MiniBar 
            percentage={stats.ram.percentage} 
            label="RAM"
            icon={<HardDrive className="w-3 h-3" />}
          />
          <MiniBar 
            percentage={stats.cpu.percentage} 
            label="CPU"
            icon={<Cpu className="w-3 h-3" />}
          />
          {stats.gpu.available && stats.gpu.vram && (
            <MiniBar 
              percentage={stats.gpu.vram.percentage} 
              label="VRAM"
              icon={<Gpu className="w-3 h-3" />}
            />
          )}
          <ChevronUp className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
        </button>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="fixed bottom-4 right-4 w-72 bg-zinc-900/95 backdrop-blur-sm rounded-xl border border-zinc-800 overflow-hidden z-40 animate-in slide-in-from-bottom-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium">System Monitor</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 hover:bg-zinc-800 rounded transition-colors"
            title="Collapse"
          >
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-zinc-800 rounded transition-colors"
            title="Hide"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-3 space-y-4">
        {/* RAM */}
        <FullStat
          label="RAM"
          icon={<HardDrive className="w-4 h-4" />}
          used={stats.ram.used}
          total={stats.ram.total}
          unit="GB"
          percentage={stats.ram.percentage}
        />

        {/* CPU */}
        <FullStat
          label="CPU"
          icon={<Cpu className="w-4 h-4" />}
          used={stats.cpu.percentage}
          total={100}
          unit="%"
          percentage={stats.cpu.percentage}
          subtitle={`${stats.cpu.cores} cores`}
        />

        {/* GPU / VRAM */}
        {stats.gpu.available && (
          <div className="space-y-1">
            {stats.gpu.vram ? (
              <FullStat
                label="VRAM"
                icon={<Gpu className="w-4 h-4" />}
                used={stats.gpu.vram.used}
                total={stats.gpu.vram.total}
                unit="GB"
                percentage={stats.gpu.vram.percentage}
                subtitle={stats.gpu.name?.split(' ').slice(0, 2).join(' ')}
              />
            ) : (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Gpu className="w-4 h-4" />
                <span>{stats.gpu.name}</span>
              </div>
            )}
          </div>
        )}

        {!stats.gpu.available && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Gpu className="w-4 h-4" />
            <span>No GPU detected</span>
          </div>
        )}
      </div>

      {/* Footer with CPU model */}
      <div className="px-3 py-2 border-t border-zinc-800 bg-zinc-800/30">
        <p className="text-xs text-zinc-500 truncate" title={stats.cpu.model}>
          {stats.cpu.model}
        </p>
      </div>
    </div>
  );
}
