// Session debugging utility to help identify session persistence issues
export class SessionDebugger {
  private static instance: SessionDebugger;
  private debugMode: boolean = true;

  static getInstance(): SessionDebugger {
    if (!SessionDebugger.instance) {
      SessionDebugger.instance = new SessionDebugger();
    }
    return SessionDebugger.instance;
  }

  log(message: string, data?: any) {
    if (this.debugMode) {
      console.log(`[SessionDebug] ${message}`, data || '');
    }
  }

  error(message: string, error?: any) {
    if (this.debugMode) {
      console.error(`[SessionDebug] ERROR: ${message}`, error || '');
    }
  }

  checkLocalStorage() {
    this.log('Checking localStorage contents:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('supabase')) {
        this.log(`Found Supabase key: ${key}`);
        try {
          const value = localStorage.getItem(key);
          this.log(`Value: ${value ? 'Present' : 'Missing'}`);
        } catch (error) {
          this.error(`Error reading key ${key}:`, error);
        }
      }
    }
  }

  checkSessionStorage() {
    this.log('Checking sessionStorage contents:');
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.includes('supabase')) {
        this.log(`Found Supabase key in sessionStorage: ${key}`);
      }
    }
  }

  clearAllAuthData() {
    this.log('Clearing all authentication data...');
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('supabase')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      this.log(`Removed: ${key}`);
    });

    this.log('All authentication data cleared');
  }

  enableDebug() {
    this.debugMode = true;
    this.log('Session debugging enabled');
  }

  disableDebug() {
    this.debugMode = false;
    console.log('[SessionDebug] Session debugging disabled');
  }
}

export const sessionDebugger = SessionDebugger.getInstance();
