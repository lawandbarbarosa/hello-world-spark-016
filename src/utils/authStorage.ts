// Custom storage implementation for better session persistence
export class AuthStorage {
  private storage: Storage;

  constructor() {
    this.storage = window.localStorage;
  }

  getItem(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch (error) {
      console.error('Error getting item from storage:', error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      this.storage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item in storage:', error);
    }
  }

  removeItem(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from storage:', error);
    }
  }
}

export const authStorage = new AuthStorage();
