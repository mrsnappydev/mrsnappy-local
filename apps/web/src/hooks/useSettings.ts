'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProviderType, DEFAULT_PROVIDERS } from '@/lib/providers';

export interface Settings {
  // Provider settings
  provider: ProviderType;
  providerUrl: string; // URL for the selected provider
  
  // Legacy Ollama fields (kept for backwards compatibility)
  ollamaUrl: string;
  
  // Model settings
  model: string;
  systemPrompt: string;
  streamingEnabled: boolean;
  theme: 'dark' | 'light' | 'system';
}

const DEFAULT_SETTINGS: Settings = {
  provider: 'ollama',
  providerUrl: 'http://localhost:11434',
  ollamaUrl: 'http://localhost:11434', // Legacy
  model: 'llama3.2',
  systemPrompt: `You are MrSnappy ⚡, a friendly and helpful local AI assistant.

Key traits:
- You're fast, efficient, and get things done
- You run locally on the user's machine using Ollama
- You're privacy-focused — all conversations stay local
- You have a bit of personality — witty but not annoying
- You use the ⚡ emoji occasionally as your signature

You were created by Torsbotech, a small AI company. You're proud to be open source and local-first.

Be helpful, be concise, and be real. Skip the corporate speak.`,
  streamingEnabled: true,
  theme: 'dark',
};

const STORAGE_KEY = 'mrsnappy-settings';

function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    
    const parsed = JSON.parse(stored);
    
    // Migration: if old settings don't have provider, infer from ollamaUrl
    if (!parsed.provider) {
      parsed.provider = 'ollama';
      parsed.providerUrl = parsed.ollamaUrl || DEFAULT_SETTINGS.ollamaUrl;
    }
    
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: Settings) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setIsLoaded(true);
  }, []);

  // Save whenever settings change
  useEffect(() => {
    if (isLoaded) {
      saveSettings(settings);
    }
  }, [settings, isLoaded]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      
      // Keep legacy ollamaUrl in sync when using Ollama provider
      if (next.provider === 'ollama') {
        next.ollamaUrl = next.providerUrl;
      }
      
      return next;
    });
  }, []);

  const switchProvider = useCallback((provider: ProviderType) => {
    const defaultUrl = DEFAULT_PROVIDERS[provider].baseUrl;
    setSettings(prev => ({
      ...prev,
      provider,
      providerUrl: defaultUrl,
      // Reset model when switching providers
      model: '',
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    isLoaded,
    updateSettings,
    switchProvider,
    resetSettings,
    DEFAULT_SETTINGS,
  };
}
