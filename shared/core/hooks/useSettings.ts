// Settings management hook

import { useState, useCallback, useEffect } from 'react';
import type { Settings, Message } from '../types';
import { getServices } from '../services';

export interface UseSettingsReturn {
  settings: Settings | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  message: Message | null;
  load: () => Promise<void>;
  save: (settings: Settings) => Promise<boolean>;
  reloadConfig: () => Promise<boolean>;
  clearMessage: () => void;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const services = getServices();

  const clearMessage = useCallback(() => setMessage(null), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await services.settings.getSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      setMessage({ type: 'error', text: `Failed to load settings: ${err}` });
    } finally {
      setLoading(false);
    }
  }, [services.settings]);

  const save = useCallback(async (newSettings: Settings): Promise<boolean> => {
    setSaving(true);
    try {
      const updated = await services.settings.update(newSettings);
      setSettings(updated);
      setMessage({ type: 'success', text: 'Settings saved successfully' });
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to save settings: ${err}` });
      return false;
    } finally {
      setSaving(false);
    }
  }, [services.settings]);

  const reloadConfig = useCallback(async (): Promise<boolean> => {
    try {
      await services.settings.reloadConfig();
      setMessage({ type: 'success', text: 'Configuration reloaded' });
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to reload: ${err}` });
      return false;
    }
  }, [services.settings]);

  // Auto clear messages
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(clearMessage, 5000);
    return () => clearTimeout(timer);
  }, [message, clearMessage]);

  return {
    settings,
    loading,
    saving,
    error,
    message,
    load,
    save,
    reloadConfig,
    clearMessage,
  };
}
