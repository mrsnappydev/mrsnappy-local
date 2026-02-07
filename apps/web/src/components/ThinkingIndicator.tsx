'use client';

import { useState, useEffect } from 'react';
import { Brain, Zap } from 'lucide-react';

interface ThinkingIndicatorProps {
  isVisible: boolean;
}

export default function ThinkingIndicator({ isVisible }: ThinkingIndicatorProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showTimer, setShowTimer] = useState(false);

  // Reset and start timer when visible
  useEffect(() => {
    if (!isVisible) {
      setElapsedSeconds(0);
      setShowTimer(false);
      return;
    }

    // Show timer after 3 seconds
    const timerTimeout = setTimeout(() => {
      setShowTimer(true);
    }, 3000);

    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      clearTimeout(timerTimeout);
      clearInterval(interval);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="flex gap-4 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0">
        <Zap className="w-4 h-4 text-zinc-900" />
      </div>
      
      {/* Thinking bubble */}
      <div className="flex-1">
        <div className="inline-flex items-center gap-3 rounded-2xl rounded-tl-sm px-4 py-3 bg-zinc-900 border border-zinc-800">
          {/* Animated brain */}
          <div className="relative">
            <Brain className="w-5 h-5 text-amber-400 animate-pulse" />
            <div className="absolute inset-0 bg-amber-400/20 rounded-full animate-ping" />
          </div>
          
          {/* Bouncing dots */}
          <div className="flex items-center gap-1">
            <span className="text-sm text-zinc-400">MrSnappy is thinking</span>
            <div className="flex gap-0.5 ml-1">
              <span 
                className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
                style={{ animationDelay: '0ms', animationDuration: '600ms' }}
              />
              <span 
                className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
                style={{ animationDelay: '150ms', animationDuration: '600ms' }}
              />
              <span 
                className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
                style={{ animationDelay: '300ms', animationDuration: '600ms' }}
              />
            </div>
          </div>
          
          {/* Elapsed time (shows after 3s) */}
          {showTimer && (
            <span className="text-xs text-zinc-500 ml-2 tabular-nums">
              {formatTime(elapsedSeconds)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
