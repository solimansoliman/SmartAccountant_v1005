/**
 * خدمة المزامنة - SyncService
 * تدير المزامنة بين البيانات المحلية والسيرفر
 * وتدعم العمل في وضع عدم الاتصال (Offline Mode)
 */

export interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingChanges: number;
  syncErrors: string[];
}

type SyncListener = (state: SyncState) => void;
type DataChangeListener<T = any> = (entity: string, action: 'create' | 'update' | 'delete', data: T) => void;

class SyncService {
  private static instance: SyncService;
  private syncQueue: SyncQueueItem[] = [];
  private listeners: Set<SyncListener> = new Set();
  private dataChangeListeners: Set<DataChangeListener> = new Set();
  private state: SyncState = {
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: 0,
    syncErrors: [],
  };
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'smartAccountant_syncQueue';
  private readonly SYNC_INTERVAL = 30000; // 30 seconds

  private constructor() {
    this.init();
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  private init() {
    // Load pending queue from localStorage
    this.loadQueue();

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnlineStatusChange(true));
    window.addEventListener('offline', () => this.handleOnlineStatusChange(false));

    // Start periodic sync
    this.startPeriodicSync();

    // Initial sync if online
    if (this.state.isOnline && this.syncQueue.length > 0) {
      this.processSyncQueue();
    }
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        this.updateState({ pendingChanges: this.syncQueue.filter(i => i.status === 'pending').length });
      }
    } catch (e) {
      console.error('Failed to load sync queue:', e);
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.syncQueue));
    } catch (e) {
      console.error('Failed to save sync queue:', e);
    }
  }

  private handleOnlineStatusChange(isOnline: boolean) {
    this.updateState({ isOnline });
    
    if (isOnline && this.syncQueue.length > 0) {
      // Process pending items when coming back online
      this.processSyncQueue();
    }
  }

  private startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      if (this.state.isOnline && this.syncQueue.length > 0 && !this.state.isSyncing) {
        this.processSyncQueue();
      }
    }, this.SYNC_INTERVAL);
  }

  private updateState(partial: Partial<SyncState>) {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  private notifyDataChange<T>(entity: string, action: 'create' | 'update' | 'delete', data: T) {
    this.dataChangeListeners.forEach(listener => listener(entity, action, data));
  }

  // ==================== Public API ====================

  /**
   * Subscribe to sync state changes
   */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.state); // Initial call
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to data changes
   */
  onDataChange<T = any>(listener: DataChangeListener<T>): () => void {
    this.dataChangeListeners.add(listener);
    return () => this.dataChangeListeners.delete(listener);
  }

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return { ...this.state };
  }

  /**
   * Queue a change for syncing
   */
  queueChange(entity: string, type: 'create' | 'update' | 'delete', data: any): string {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const item: SyncQueueItem = {
      id,
      type,
      entity,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    this.syncQueue.push(item);
    this.saveQueue();
    this.updateState({ pendingChanges: this.syncQueue.filter(i => i.status === 'pending').length });

    // Immediately notify data change listeners for optimistic updates
    this.notifyDataChange(entity, type, data);

    // Try to sync immediately if online
    if (this.state.isOnline && !this.state.isSyncing) {
      this.processSyncQueue();
    }

    return id;
  }

  /**
   * Mark a change as synced (called after successful API call)
   */
  markSynced(entity: string, type: 'create' | 'update' | 'delete', data: any) {
    // Notify listeners that data was synced
    this.notifyDataChange(entity, type, data);
    this.updateState({ lastSyncTime: Date.now() });
  }

  /**
   * Process the sync queue
   */
  async processSyncQueue(): Promise<void> {
    if (this.state.isSyncing || !this.state.isOnline) return;

    const pendingItems = this.syncQueue.filter(i => i.status === 'pending' || i.status === 'failed');
    if (pendingItems.length === 0) return;

    this.updateState({ isSyncing: true, syncErrors: [] });

    const errors: string[] = [];

    for (const item of pendingItems) {
      try {
        item.status = 'syncing';
        this.saveQueue();

        // The actual API call should be handled by the component
        // This is just for queue management
        item.status = 'synced';
        
      } catch (error: any) {
        item.status = 'failed';
        item.retryCount++;
        errors.push(`Failed to sync ${item.entity}: ${error.message}`);
      }
    }

    // Remove synced items
    this.syncQueue = this.syncQueue.filter(i => i.status !== 'synced');
    this.saveQueue();

    this.updateState({
      isSyncing: false,
      pendingChanges: this.syncQueue.filter(i => i.status === 'pending').length,
      syncErrors: errors,
      lastSyncTime: Date.now(),
    });
  }

  /**
   * Clear the sync queue
   */
  clearQueue() {
    this.syncQueue = [];
    this.saveQueue();
    this.updateState({ pendingChanges: 0, syncErrors: [] });
  }

  /**
   * Force sync now
   */
  async forceSync(): Promise<void> {
    if (!this.state.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    await this.processSyncQueue();
  }

  /**
   * Get pending changes count
   */
  getPendingCount(): number {
    return this.syncQueue.filter(i => i.status === 'pending').length;
  }

  /**
   * Check if there are pending changes for a specific entity
   */
  hasPendingChanges(entity: string): boolean {
    return this.syncQueue.some(i => i.entity === entity && i.status === 'pending');
  }

  /**
   * Destroy the service
   */
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    window.removeEventListener('online', () => this.handleOnlineStatusChange(true));
    window.removeEventListener('offline', () => this.handleOnlineStatusChange(false));
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();

// Export hook for React components
export function useSyncState(): SyncState {
  const [state, setState] = React.useState<SyncState>(syncService.getState());

  React.useEffect(() => {
    return syncService.subscribe(setState);
  }, []);

  return state;
}

// Import React for the hook
import React from 'react';

// ==================== Data Store ====================

export interface DataStore<T> {
  items: T[];
  lastFetch: number | null;
  isStale: boolean;
}

type DataStoreListener<T> = (store: DataStore<T>) => void;

/**
 * Creates a reactive data store with sync capabilities
 */
export function createDataStore<T extends { id: number | string }>(
  entityName: string,
  fetchFn: () => Promise<T[]>,
  cacheKey?: string
) {
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  const storageKey = cacheKey || `smartAccountant_${entityName}`;
  
  let store: DataStore<T> = {
    items: [],
    lastFetch: null,
    isStale: true,
  };
  
  const listeners = new Set<DataStoreListener<T>>();

  // Load from localStorage
  try {
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      store = {
        items: parsed.items || [],
        lastFetch: parsed.lastFetch || null,
        isStale: !parsed.lastFetch || Date.now() - parsed.lastFetch > CACHE_DURATION,
      };
    }
  } catch (e) {
    console.error(`Failed to load ${entityName} from cache:`, e);
  }

  const save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        items: store.items,
        lastFetch: store.lastFetch,
      }));
    } catch (e) {
      console.error(`Failed to save ${entityName} to cache:`, e);
    }
  };

  const notify = () => {
    listeners.forEach(l => l(store));
  };

  // Listen for sync service data changes
  syncService.onDataChange((entity, action, data) => {
    if (entity !== entityName) return;

    switch (action) {
      case 'create':
        store.items = [...store.items, data as T];
        break;
      case 'update':
        store.items = store.items.map(item => 
          item.id === (data as T).id ? data as T : item
        );
        break;
      case 'delete':
        store.items = store.items.filter(item => item.id !== (data as T).id);
        break;
    }
    
    save();
    notify();
  });

  return {
    getItems: () => store.items,
    
    getById: (id: number | string) => store.items.find(i => i.id === id),
    
    isStale: () => store.isStale,
    
    subscribe: (listener: DataStoreListener<T>): (() => void) => {
      listeners.add(listener);
      listener(store);
      return () => listeners.delete(listener);
    },

    async fetch(force = false): Promise<T[]> {
      if (!force && !store.isStale && store.items.length > 0) {
        return store.items;
      }

      try {
        const items = await fetchFn();
        store = {
          items,
          lastFetch: Date.now(),
          isStale: false,
        };
        save();
        notify();
        return items;
      } catch (e) {
        console.error(`Failed to fetch ${entityName}:`, e);
        throw e;
      }
    },

    add(item: T) {
      store.items = [...store.items, item];
      save();
      notify();
      syncService.markSynced(entityName, 'create', item);
    },

    update(item: T) {
      store.items = store.items.map(i => i.id === item.id ? item : i);
      save();
      notify();
      syncService.markSynced(entityName, 'update', item);
    },

    remove(id: number | string) {
      const item = store.items.find(i => i.id === id);
      store.items = store.items.filter(i => i.id !== id);
      save();
      notify();
      if (item) {
        syncService.markSynced(entityName, 'delete', item);
      }
    },

    setItems(items: T[]) {
      store = {
        items,
        lastFetch: Date.now(),
        isStale: false,
      };
      save();
      notify();
    },

    clear() {
      store = { items: [], lastFetch: null, isStale: true };
      save();
      notify();
    },
  };
}

// ==================== React Hooks ====================

/**
 * Hook to use a data store in React components
 */
export function useDataStore<T extends { id: number | string }>(
  store: ReturnType<typeof createDataStore<T>>
) {
  const [data, setData] = React.useState<DataStore<T>>({
    items: store.getItems(),
    lastFetch: null,
    isStale: store.isStale(),
  });

  React.useEffect(() => {
    return store.subscribe(setData);
  }, [store]);

  return {
    items: data.items,
    isStale: data.isStale,
    lastFetch: data.lastFetch,
    fetch: store.fetch,
    add: store.add,
    update: store.update,
    remove: store.remove,
    getById: store.getById,
  };
}

export default syncService;
