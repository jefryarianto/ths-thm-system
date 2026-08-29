import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateCreator } from 'zustand';
import { logError } from '../lib/error-logger';

const asyncStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch (error) {
      logError(error, { module: 'PersistConfig', action: `set-${name}` });
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (error) {
      logError(error, { module: 'PersistConfig', action: `remove-${name}` });
    }
  },
};

export interface PersistOptions<T> {
  name: string;
  version?: number;
  partialize?: (state: T) => Partial<T>;
  onRehydrateStorage?: (state: T | undefined) => void | ((state: T | undefined) => void);
  whitelist?: (keyof T)[];
  blacklist?: (keyof T)[];
  migrate?: (persistedState: unknown, version: number) => T;
}

export function createPersistConfig<T extends Record<string, any>>(
  options: PersistOptions<T>
) {
  const {
    name,
    version = 1,
    partialize,
    onRehydrateStorage,
    whitelist,
    blacklist,
    migrate,
  } = options;

  const storage = createJSONStorage(() => asyncStorage);

  const partializeFn = partialize 
    ? partialize 
    : (state: T) => {
        let result: Partial<T> = { ...state };
        
        if (whitelist && whitelist.length > 0) {
          result = Object.fromEntries(
            Object.entries(result).filter(([key]) => whitelist.includes(key as keyof T))
          ) as Partial<T>;
        }
        
        if (blacklist && blacklist.length > 0) {
          result = Object.fromEntries(
            Object.entries(result).filter(([key]) => !blacklist.includes(key as keyof T))
          ) as Partial<T>;
        }
        
        return result;
      };

  return (
    stateCreator: StateCreator<T, [], []>
  ) => persist(stateCreator, {
      name,
      version,
      storage,
      partialize: partializeFn,
      onRehydrateStorage: onRehydrateStorage 
        ? (state) => {
            if (state) {
              onRehydrateStorage(state);
            }
            return (state) => {
              if (state) {
                onRehydrateStorage(state);
              }
            };
          }
        : undefined,
      migrate: migrate 
        ? (persistedState, fromVersion) => {
            return migrate(persistedState, fromVersion) as T;
          }
        : undefined,
    }
  );
}

export const authPersistConfig = createPersistConfig({
  name: 'auth-store',
  version: 1,
  whitelist: ['user', 'isAuthenticated'],
  blacklist: ['isLoading', 'login', 'logout', 'loadUser'],
});

export const appPersistConfig = createPersistConfig({
  name: 'app-store',
  version: 1,
  whitelist: ['theme', 'language', 'notificationsEnabled'],
  blacklist: ['isOnline', 'syncStatus', 'pendingMutations', 'setOnlineStatus', 'setSyncStatus', 'addPendingMutation', 'removePendingMutation', 'clearPendingMutations'],
});

export const settingsPersistConfig = createPersistConfig({
  name: 'settings-store',
  version: 1,
  whitelist: ['theme', 'language', 'notificationsEnabled', 'autoSync', 'dataSaverMode'],
});