import { create } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';
import { StateCreator } from 'zustand';
import { offlineStorage, PendingMutation } from '../services/offline-storage';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface AppState {
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingMutations: PendingMutation[];
  lastSyncTime: string | null;
  theme: 'light' | 'dark' | 'system';
  language: 'id' | 'en';
  notificationsEnabled: boolean;
  autoSync: boolean;
  dataSaverMode: boolean;
  
  setOnlineStatus: (isOnline: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setPendingMutations: (mutations: PendingMutation[]) => void;
  addPendingMutation: (mutation: PendingMutation) => void;
  removePendingMutation: (id: string) => void;
  clearPendingMutations: () => void;
  setLastSyncTime: (time: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'id' | 'en') => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setAutoSync: (enabled: boolean) => void;
  setDataSaverMode: (enabled: boolean) => void;
  initializeOfflineStorage: (syncCallback: () => Promise<void>) => void;
}

let offlineStorageInitialized = false;

const stateCreator: StateCreator<AppState> = (set, get) => ({
  isOnline: true,
  syncStatus: 'idle',
  pendingMutations: [],
  lastSyncTime: null,
  theme: 'system',
  language: 'id',
  notificationsEnabled: true,
  autoSync: true,
  dataSaverMode: false,

  setOnlineStatus: (isOnline: boolean) => {
    set({ isOnline });
    
    if (isOnline) {
      const { autoSync, pendingMutations } = get();
      if (autoSync && pendingMutations.length > 0) {
        set({ syncStatus: 'syncing' });
      }
    }
  },

  setSyncStatus: (syncStatus: SyncStatus) => {
    set({ syncStatus });
    if (syncStatus === 'success') {
      set({ lastSyncTime: new Date().toISOString() });
    }
  },

  setPendingMutations: (pendingMutations: PendingMutation[]) => {
    set({ pendingMutations });
  },

  addPendingMutation: (mutation: PendingMutation) => {
    set((state: AppState) => ({
      pendingMutations: [...state.pendingMutations, mutation],
    }));
  },

  removePendingMutation: (id: string) => {
    set((state: AppState) => ({
      pendingMutations: state.pendingMutations.filter((m) => m.id !== id),
    }));
  },

  clearPendingMutations: () => {
    set({ pendingMutations: [] });
  },

  setLastSyncTime: (lastSyncTime: string) => {
    set({ lastSyncTime });
  },

  setTheme: (theme: 'light' | 'dark' | 'system') => {
    set({ theme });
  },

  setLanguage: (language: 'id' | 'en') => {
    set({ language });
  },

  setNotificationsEnabled: (notificationsEnabled: boolean) => {
    set({ notificationsEnabled });
  },

  setAutoSync: (autoSync: boolean) => {
    set({ autoSync });
  },

  setDataSaverMode: (dataSaverMode: boolean) => {
    set({ dataSaverMode });
  },

  initializeOfflineStorage: (syncCallback: () => Promise<void>) => {
    if (offlineStorageInitialized) return;
    offlineStorageInitialized = true;

    offlineStorage.setSyncCallback(syncCallback);

    const unsubscribe = offlineStorage.subscribe(() => {
      const { isOnline, pendingMutations: currentMutations } = get();
      const newMutations = offlineStorage.getPendingMutations();
      const newIsOnline = offlineStorage.getIsOnline();

      set({ 
        pendingMutations: newMutations,
        isOnline: newIsOnline,
      });

      if (newIsOnline && newMutations.length > 0 && get().autoSync) {
        set({ syncStatus: 'syncing' });
      }
    });

    const initialOnline = offlineStorage.getIsOnline();
    const initialMutations = offlineStorage.getPendingMutations();
    
    set({ 
      isOnline: initialOnline,
      pendingMutations: initialMutations,
    });
  },
});

interface PersistedAppState {
  theme: 'light' | 'dark' | 'system';
  language: 'id' | 'en';
  notificationsEnabled: boolean;
  autoSync: boolean;
  dataSaverMode: boolean;
}

const persistOptions: PersistOptions<AppState, PersistedAppState> = {
  name: 'app-store',
  version: 1,
  partialize: (state: AppState): PersistedAppState => ({
    theme: state.theme,
    language: state.language,
    notificationsEnabled: state.notificationsEnabled,
    autoSync: state.autoSync,
    dataSaverMode: state.dataSaverMode,
  }),
};

const persistConfig = persist(stateCreator, persistOptions);

export const useAppStore = create<AppState>()(persistConfig);

export function useOnlineStatus() {
  return useAppStore((state) => state.isOnline);
}

export function useSyncStatus() {
  return useAppStore((state) => state.syncStatus);
}

export function usePendingMutations() {
  return useAppStore((state) => state.pendingMutations);
}

export function usePendingMutationsCount() {
  return useAppStore((state) => state.pendingMutations.length);
}