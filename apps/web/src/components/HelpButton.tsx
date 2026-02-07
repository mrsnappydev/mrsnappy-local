'use client';

import { HelpCircle } from 'lucide-react';

interface HelpButtonProps {
  topic?: string;
  onClick: (topic?: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Contextual help button that opens the help guide to a specific topic
 */
export default function HelpButton({ topic, onClick, className = '', size = 'sm' }: HelpButtonProps) {
  const sizeClasses = size === 'sm' 
    ? 'w-4 h-4' 
    : 'w-5 h-5';
  
  return (
    <button
      onClick={() => onClick(topic)}
      className={`p-1 rounded-full hover:bg-zinc-700/50 transition-colors text-zinc-500 hover:text-zinc-300 ${className}`}
      title="Help"
    >
      <HelpCircle className={sizeClasses} />
    </button>
  );
}
