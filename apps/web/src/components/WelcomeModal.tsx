'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Zap, Sparkles } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onComplete: (name: string, avatar: string) => void;
  onSkip: () => void;
}

const AVATAR_OPTIONS = [
  '😊', '😎', '🤓', '🧑‍💻', '👨‍💻', '👩‍💻', 
  '🦊', '🐱', '🐶', '🦁', '🐼', '🐨',
  '🌟', '🚀', '💫', '⚡', '🔥', '💎',
  '🎮', '🎨', '🎵', '📚', '☕', '🌈'
];

export default function WelcomeModal({ isOpen, onComplete, onSkip }: WelcomeModalProps) {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('😊');
  const [step, setStep] = useState<'name' | 'avatar'>('name');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && step === 'name') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, step]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'name' && name.trim()) {
      setStep('avatar');
    } else if (step === 'avatar') {
      onComplete(name.trim(), selectedAvatar);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleSkip();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="relative p-8 pb-6 text-center bg-gradient-to-br from-amber-500/10 to-transparent">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            title="Skip for now"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
          
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-zinc-900" />
          </div>
          
          <h2 className="text-2xl font-bold mb-1">
            {step === 'name' ? 'Welcome to MrSnappy! ⚡' : 'Pick your avatar!'}
          </h2>
          <p className="text-zinc-400 text-sm">
            {step === 'name' 
              ? "Let's personalize your experience" 
              : "Choose an emoji that represents you"
            }
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 pt-2">
          {step === 'name' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  What should I call you?
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                  maxLength={50}
                />
              </div>
              
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                I'll use your name to make our conversations more personal
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedAvatar(emoji)}
                    className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                      selectedAvatar === emoji
                        ? 'bg-amber-500/20 ring-2 ring-amber-500 scale-110'
                        : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center justify-center gap-2 py-2">
                <span className="text-sm text-zinc-400">Selected:</span>
                <span className="text-3xl">{selectedAvatar}</span>
                <span className="text-sm font-medium text-zinc-200">{name}</span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            {step === 'avatar' && (
              <button
                type="button"
                onClick={() => setStep('name')}
                className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={step === 'name' && !name.trim()}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-900 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === 'name' ? 'Next' : "Let's Go! ⚡"}
            </button>
          </div>
          
          {step === 'name' && (
            <button
              type="button"
              onClick={handleSkip}
              className="w-full mt-3 text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              Skip for now
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
