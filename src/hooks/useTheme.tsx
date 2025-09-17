import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  loading: boolean;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = React.useState<Theme>('light');
  const [loading, setLoading] = React.useState(true);

  // Get actual theme considering auto mode
  const getActualTheme = React.useCallback((themeMode: Theme): 'light' | 'dark' => {
    if (themeMode === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themeMode;
  }, []);

  const actualTheme = getActualTheme(theme);

  // Apply theme to document
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(actualTheme);
  }, [actualTheme]);

  // Load theme from user settings
  React.useEffect(() => {
    const loadTheme = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('theme_mode')
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          const savedTheme = (data.theme_mode as Theme) || 'light';
          setThemeState(savedTheme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, [user]);

  // Listen for system theme changes when in auto mode
  React.useEffect(() => {
    if (theme !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Force re-render to update actualTheme
      setThemeState(prev => prev);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = React.useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);

    // Save to database if user is logged in
    if (user) {
      try {
        await supabase
          .from('user_settings')
          .upsert([{ 
            user_id: user.id, 
            theme_mode: newTheme 
          }], {
            onConflict: 'user_id'
          });
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    }
  }, [user]);

  return (
    <ThemeContext.Provider value={{
      theme,
      actualTheme,
      setTheme,
      loading
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}