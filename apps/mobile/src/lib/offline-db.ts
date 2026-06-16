import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DB_NAME = 'ths-thm-offline-db';

interface OfflineStore {
  members: any[];
  trainings: any[];
  notifications: any[];
  lastSync: string | null;
}

interface SyncResult {
  added: number;
  updated: number;
  deleted: number;
}

class OfflineDB {
  private async getStore(): Promise<OfflineStore> {
    const stored = await AsyncStorage.getItem(DB_NAME);
    return stored
      ? JSON.parse(stored)
      : { members: [], trainings: [], notifications: [], lastSync: null };
  }

  private async setStore(store: OfflineStore): Promise<void> {
    await AsyncStorage.setItem(DB_NAME, JSON.stringify(store));
  }

  async saveMembers(members: any[]): Promise<void> {
    const store = await this.getStore();
    store.members = members;
    store.lastSync = new Date().toISOString();
    await this.setStore(store);
  }

  async getMembers(): Promise<any[]> {
    const store = await this.getStore();
    return store.members;
  }

  async saveTrainings(trainings: any[]): Promise<void> {
    const store = await this.getStore();
    store.trainings = trainings;
    await this.setStore(store);
  }

  async getTrainings(): Promise<any[]> {
    const store = await this.getStore();
    return store.trainings;
  }

  async saveNotifications(notifications: any[]): Promise<void> {
    const store = await this.getStore();
    store.notifications = notifications;
    await this.setStore(store);
  }

  async getNotifications(): Promise<any[]> {
    const store = await this.getStore();
    return store.notifications;
  }

  async getLastSync(): Promise<string | null> {
    const store = await this.getStore();
    return store.lastSync;
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(DB_NAME);
  }
}

export const offlineDB = new OfflineDB();

// React Hook for offline data
export function useOfflineData<T>(key: 'members' | 'trainings' | 'notifications') {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      let result: any[];
      if (key === 'members') result = await offlineDB.getMembers();
      else if (key === 'trainings') result = await offlineDB.getTrainings();
      else result = await offlineDB.getNotifications();
      setData(result);
      setLoading(false);
    };
    loadData();
  }, [key]);

  return {
    data,
    loading,
    refresh: async () => {
      const loadData = async () => {
        let result: any[];
        if (key === 'members') result = await offlineDB.getMembers();
        else if (key === 'trainings') result = await offlineDB.getTrainings();
        else result = await offlineDB.getNotifications();
        setData(result);
      };
      await loadData();
    },
  };
}

// Sync service
export class SyncService {
  private static API_URL = process.env.API_URL || 'http://localhost:3000';
  private static TOKEN_KEY = 'auth-token';

  static async syncMembers(token: string): Promise<SyncResult> {
    const res = await fetch(`${this.API_URL}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    const remoteMembers = json.data?.data || [];

    const localMembers = await offlineDB.getMembers();
    const added = remoteMembers.filter((m: any) => !localMembers.find((l: any) => l.id === m.id));
    const updated = remoteMembers.filter((m: any) => {
      const local = localMembers.find((l: any) => l.id === m.id);
      return local && new Date(m.updatedAt) > new Date(local.updatedAt);
    });
    const deleted = localMembers.filter((l: any) => !remoteMembers.find((r: any) => r.id === l.id));

    await offlineDB.saveMembers(remoteMembers);

    return {
      added: added.length,
      updated: updated.length,
      deleted: deleted.length,
    };
  }

  static async syncTrainings(token: string): Promise<SyncResult> {
    const res = await fetch(`${this.API_URL}/trainings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    const remoteTrainings = json.data?.data || [];

    const localTrainings = await offlineDB.getTrainings();
    await offlineDB.saveTrainings(remoteTrainings);

    return {
      added: remoteTrainings.filter((t: any) => !localTrainings.find((l: any) => l.id === t.id)).length,
      updated: 0,
      deleted: localTrainings.filter((l: any) => !remoteTrainings.find((r: any) => r.id === l.id)).length,
    };
  }

  static async fullSync(token: string): Promise<{ members: SyncResult; trainings: SyncResult }> {
    const [members, trainings] = await Promise.all([
      this.syncMembers(token),
      this.syncTrainings(token),
    ]);
    return { members, trainings };
  }
}
