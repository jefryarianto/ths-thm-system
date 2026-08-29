import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { logError } from '../lib/error-logger';

export interface PendingMutation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: string;
  retryCount: number;
}

export interface OfflineStorageConfig {
  maxRetries: number;
  syncInterval: number;
  storageKey: string;
}

const DEFAULT_CONFIG: OfflineStorageConfig = {
  maxRetries: 3,
  syncInterval: 30000,
  storageKey: '@ths-thm-offline-mutations',
};

class OfflineStorageService {
  private config: OfflineStorageConfig;
  private mutations: PendingMutation[] = [];
  private isOnline: boolean = true;
  private syncIntervalId: ReturnType<typeof setInterval> | null = null;
  private syncCallback: (() => Promise<void>) | null = null;
  private listeners: Set<() => void> = new Set();

  constructor(config: Partial<OfflineStorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.init();
  }

  private async init() {
    await this.loadMutations();
    this.setupNetworkListener();
    this.startSyncInterval();
  }

  private setupNetworkListener() {
    NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (wasOffline && this.isOnline) {
        this.notifyListeners();
        this.syncMutations();
      }
      
      this.notifyListeners();
    });
  }

  private startSyncInterval() {
    this.syncIntervalId = setInterval(() => {
      if (this.isOnline && this.mutations.length > 0) {
        this.syncMutations();
      }
    }, this.config.syncInterval);
  }

  private async loadMutations() {
    try {
      const stored = await AsyncStorage.getItem(this.config.storageKey);
      if (stored) {
        this.mutations = JSON.parse(stored);
      }
    } catch (error) {
      logError(error, { module: 'OfflineStorage', action: 'load-mutations' });
    }
  }

  private async saveMutations() {
    try {
      await AsyncStorage.setItem(this.config.storageKey, JSON.stringify(this.mutations));
    } catch (error) {
      logError(error, { module: 'OfflineStorage', action: 'save-mutations' });
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  getPendingMutations(): PendingMutation[] {
    return [...this.mutations];
  }

  getPendingCount(): number {
    return this.mutations.length;
  }

  async addMutation(type: PendingMutation['type'], entity: string, data: any): Promise<string> {
    const mutation: PendingMutation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      entity,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    this.mutations.push(mutation);
    await this.saveMutations();
    this.notifyListeners();
    
    if (this.isOnline) {
      this.syncMutations();
    }

    return mutation.id;
  }

  async removeMutation(id: string): Promise<void> {
    this.mutations = this.mutations.filter(m => m.id !== id);
    await this.saveMutations();
    this.notifyListeners();
  }

  async incrementRetryCount(id: string): Promise<void> {
    const mutation = this.mutations.find(m => m.id === id);
    if (mutation) {
      mutation.retryCount++;
      await this.saveMutations();
      this.notifyListeners();
    }
  }

  setSyncCallback(callback: () => Promise<void>) {
    this.syncCallback = callback;
  }

  async syncMutations(): Promise<void> {
    if (!this.isOnline || this.mutations.length === 0) return;
    if (!this.syncCallback) return;

    try {
      await this.syncCallback();
    } catch (error) {
      logError(error, { module: 'OfflineStorage', action: 'sync' });
    }
  }

  async clearAllMutations(): Promise<void> {
    this.mutations = [];
    await this.saveMutations();
    this.notifyListeners();
  }

  destroy(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    this.listeners.clear();
  }
}

export const offlineStorage = new OfflineStorageService();

export async function getStoredData<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function setStoredData<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logError(error, { module: 'OfflineStorage', action: `store-${key}` });
  }
}

export async function removeStoredData(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    logError(error, { module: 'OfflineStorage', action: `remove-${key}` });
  }
}

export async function clearAllStorage(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    logError(error, { module: 'OfflineStorage', action: 'clear-all' });
  }
}