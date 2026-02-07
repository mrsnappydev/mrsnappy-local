'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UserPreferences {
  name: string;
  avatar: string; // Emoji avatar
  hasCompletedOnboarding: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  name: '',
  avatar: '👤',
  hasCompletedOnboarding: false,
};

const STORAGE_KEY = 'mrsnappy_user';

function loadPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
  } catch (error) {
    console.error('Failed to load user preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

function savePreferences(preferences: UserPreferences) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save user preferences:', error);
  }
}

export function useUser() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    const loaded = loadPreferences();
    setPreferences(loaded);
    setIsLoaded(true);
  }, []);

  // Save whenever preferences change
  useEffect(() => {
    if (isLoaded) {
      savePreferences(preferences);
    }
  }, [preferences, isLoaded]);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  const setName = useCallback((name: string) => {
    setPreferences(prev => ({ 
      ...prev, 
      name,
      hasCompletedOnboarding: true,
    }));
  }, []);

  const setAvatar = useCallback((avatar: string) => {
    setPreferences(prev => ({ ...prev, avatar }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setPreferences(prev => ({ ...prev, hasCompletedOnboarding: true }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  // Check if we should show the welcome modal
  const shouldShowWelcome = isLoaded && !preferences.hasCompletedOnboarding;

  return {
    user: preferences,
    isLoaded,
    shouldShowWelcome,
    updatePreferences,
    setName,
    setAvatar,
    completeOnboarding,
    resetPreferences,
  };
}
