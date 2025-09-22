// Custom storage implementation for better session persistence
export class AuthStorage {
  private storage: Storage;
  private fallbackStorage: Map<string, string> = new Map();

  constructor() {
    this.storage = window.localStorage;
  }

  getItem(key: string): string | null {
    try {
      // Try localStorage first
      const value = this.storage.getItem(key);
      if (value !== null) {
        return value;
      }
      
      // Fallback to in-memory storage
      return this.fallbackStorage.get(key) || null;
    } catch (error) {
      console.error('Error getting item from storage:', error);
      // Fallback to in-memory storage
      return this.fallbackStorage.get(key) || null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      this.storage.setItem(key, value);
      // Also store in fallback
      this.fallbackStorage.set(key, value);
    } catch (error) {
      console.error('Error setting item in storage:', error);
      // Fallback to in-memory storage
      this.fallbackStorage.set(key, value);
    }
  }

  removeItem(key: string): void {
    try {
      this.storage.removeItem(key);
      this.fallbackStorage.delete(key);
    } catch (error) {
      console.error('Error removing item from storage:', error);
      this.fallbackStorage.delete(key);
    }
  }

  // Method to check if storage is available
  isStorageAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      this.storage.setItem(testKey, 'test');
      this.storage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Method to get all auth-related keys
  getAuthKeys(): string[] {
    const keys: string[] = [];
    try {
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.includes('supabase')) {
          keys.push(key);
        }
      }
    } catch (error) {
      console.error('Error getting auth keys:', error);
    }
    return keys;
  }
}

export const authStorage = new AuthStorage();
