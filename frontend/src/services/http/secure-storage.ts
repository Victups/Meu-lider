import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const nativeStore: KeyValueStore = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

/**
 * expo-secure-store is a native module with no web implementation, so the web
 * build falls back to localStorage. That is readable by XSS, unlike Keychain or
 * Keystore — acceptable only because web is a convenience target here. Moving
 * the web build to httpOnly cookies would require backend changes.
 */
const webStore: KeyValueStore = {
  async getItem(key) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Private mode or blocked storage: the session simply will not persist.
    }
  },
  async removeItem(key) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Nothing to clear if storage is unavailable.
    }
  },
};

export const secureStorage: KeyValueStore = Platform.OS === 'web' ? webStore : nativeStore;
