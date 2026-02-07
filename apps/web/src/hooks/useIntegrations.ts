'use client';

import { useState, useEffect, useCallback } from 'react';
import { IntegrationState, IntegrationType, DEFAULT_INTEGRATION_STATES } from '@/lib/integrations';

const STORAGE_KEY = 'mrsnappy-integrations';

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<IntegrationState[]>(DEFAULT_INTEGRATION_STATES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as IntegrationState[];
        // Merge with defaults to ensure new integrations are included
        const merged = DEFAULT_INTEGRATION_STATES.map(defaultState => {
          const savedState = parsed.find(s => s.type === defaultState.type);
          return savedState || defaultState;
        });
        setIntegrations(merged);
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when integrations change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(integrations));
      } catch (error) {
        console.error('Failed to save integrations:', error);
      }
    }
  }, [integrations, isLoaded]);

  const updateIntegrations = useCallback((newStates: IntegrationState[]) => {
    setIntegrations(newStates);
  }, []);

  const updateIntegration = useCallback((type: IntegrationType, updates: Partial<IntegrationState>) => {
    setIntegrations(prev => 
      prev.map(s => s.type === type ? { ...s, ...updates } : s)
    );
  }, []);

  const toggleIntegration = useCallback((type: IntegrationType) => {
    setIntegrations(prev => 
      prev.map(s => s.type === type 
        ? { ...s, enabled: !s.enabled, status: !s.enabled ? 'connected' : 'disconnected' } 
        : s
      )
    );
  }, []);

  const getIntegration = useCallback((type: IntegrationType): IntegrationState | undefined => {
    return integrations.find(s => s.type === type);
  }, [integrations]);

  const isEnabled = useCallback((type: IntegrationType): boolean => {
    const state = integrations.find(s => s.type === type);
    return state?.enabled || false;
  }, [integrations]);

  const getEnabledIntegrations = useCallback((): IntegrationState[] => {
    return integrations.filter(s => s.enabled);
  }, [integrations]);

  return {
    integrations,
    isLoaded,
    updateIntegrations,
    updateIntegration,
    toggleIntegration,
    getIntegration,
    isEnabled,
    getEnabledIntegrations,
  };
}
