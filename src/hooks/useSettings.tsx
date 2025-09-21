import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserSettings {
  timezone: string;
  theme_mode: 'light' | 'dark' | 'auto';
  daily_send_limit: number;
  send_time_start: string;
  send_time_end: string;
  sending_days: string[];
  reply_handling_enabled: boolean;
  fallback_merge_tags: {
    first_name: string;
    company: string;
  };
  default_signature: string;
  from_name_format: 'first_last' | 'company_team';
  unsubscribe_link_enabled: boolean;
  legal_disclaimer: string;
}

interface SettingsContextType {
  settings: UserSettings | null;
  loading: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: UserSettings = {
  timezone: 'UTC',
  theme_mode: 'light',
  daily_send_limit: 50,
  send_time_start: '00:00',
  send_time_end: '23:59',
  sending_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  reply_handling_enabled: true,
  fallback_merge_tags: {
    first_name: 'there',
    company: 'your company',
  },
  default_signature: '',
  from_name_format: 'first_last',
  unsubscribe_link_enabled: true,
  legal_disclaimer: '',
};

const SettingsContext = React.createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = React.useState<UserSettings | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refreshSettings = React.useCallback(async () => {
    if (!user) {
      setSettings(defaultSettings);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, create default
          const { error: insertError } = await supabase
            .from('user_settings')
            .insert([{ user_id: user.id, ...defaultSettings }]);
          
          if (!insertError) {
            setSettings(defaultSettings);
          }
        }
      } else if (data) {
        const fallbackTags = (data.fallback_merge_tags as any) || defaultSettings.fallback_merge_tags;
        setSettings({
          timezone: data.timezone || defaultSettings.timezone,
          theme_mode: (data.theme_mode as any) || defaultSettings.theme_mode,
          daily_send_limit: data.daily_send_limit || defaultSettings.daily_send_limit,
          send_time_start: data.send_time_start || defaultSettings.send_time_start,
          send_time_end: data.send_time_end || defaultSettings.send_time_end,
          sending_days: (data.sending_days as string[]) || defaultSettings.sending_days,
          reply_handling_enabled: data.reply_handling_enabled ?? defaultSettings.reply_handling_enabled,
          fallback_merge_tags: {
            first_name: fallbackTags.first_name || defaultSettings.fallback_merge_tags.first_name,
            company: fallbackTags.company || defaultSettings.fallback_merge_tags.company,
          },
          default_signature: data.default_signature || defaultSettings.default_signature,
          from_name_format: (data.from_name_format as any) || defaultSettings.from_name_format,
          unsubscribe_link_enabled: data.unsubscribe_link_enabled ?? defaultSettings.unsubscribe_link_enabled,
          legal_disclaimer: data.legal_disclaimer || defaultSettings.legal_disclaimer,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateSettings = React.useCallback(async (updates: Partial<UserSettings>) => {
    if (!user || !settings) return;

    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    try {
      const updateData = {
        timezone: newSettings.timezone,
        theme_mode: newSettings.theme_mode,
        daily_send_limit: newSettings.daily_send_limit,
        send_time_start: newSettings.send_time_start,
        send_time_end: newSettings.send_time_end,
        sending_days: newSettings.sending_days,
        reply_handling_enabled: newSettings.reply_handling_enabled,
        fallback_merge_tags: newSettings.fallback_merge_tags,
        default_signature: newSettings.default_signature,
        from_name_format: newSettings.from_name_format,
        unsubscribe_link_enabled: newSettings.unsubscribe_link_enabled,
        legal_disclaimer: newSettings.legal_disclaimer,
      };

      const { error } = await supabase
        .from('user_settings')
        .upsert([{ user_id: user.id, ...updateData }], {
          onConflict: 'user_id'
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      // Revert optimistic update
      setSettings(settings);
      throw error;
    }
  }, [user, settings]);

  React.useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  return (
    <SettingsContext.Provider value={{
      settings,
      loading,
      updateSettings,
      refreshSettings
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = React.useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}