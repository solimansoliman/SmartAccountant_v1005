/**
 * Offline Storage Service
 * Manages local data persistence using IndexedDB
 */

export interface OfflineDataStore {
  invoices: any[];
  customers: any[];
  products: any[];
  expenses: any[];
  revenues: any[];
  tags: any[];
  units: any[];
  messages: any[];
  syncQueue: SyncQueueItem[];
}

export interface SyncQueueItem {
  id: string;
  timestamp: number;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  data?: any;
  status: 'pending' | 'syncing' | 'error' | 'complete';
  errorMessage?: string;
  retryCount: number;
}

class OfflineStorageService {
  private dbName = 'SmartAccountant';
  private version = 1;
  private stores = [
    'invoices',
    'customers',
    'products',
    'expenses',
    'revenues',
    'tags',
    'units',
    'messages',
    'syncQueue',
    'metadata'
  ];

  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        // Create object stores if they don't exist
        this.stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });

            // Create indexes for common queries
            if (storeName !== 'syncQueue' && storeName !== 'metadata') {
              store.createIndex('accountId', 'accountId', { unique: false });
              store.createIndex('createdAt', 'createdAt', { unique: false });
            }

            if (storeName === 'syncQueue') {
              store.createIndex('status', 'status', { unique: false });
              store.createIndex('timestamp', 'timestamp', { unique: false });
            }
          }
        });
      };
    });
  }

  /**
   * Save data to IndexedDB
   */
  async save(
    storeName: string,
    data: any | any[],
    clear = false
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      if (clear) {
        store.clear();
      }

      // Handle array of items
      const items = Array.isArray(data) ? data : [data];
      items.forEach(item => {
        store.put(item);
      });

      transaction.onerror = () => {
        reject(transaction.error);
      };

      transaction.oncomplete = () => {
        resolve();
      };
    });
  }

  /**
   * Load all data from a store
   */
  async load(storeName: string): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  /**
   * Load data by account ID
   */
  async loadByAccount(storeName: string, accountId: number): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index('accountId');
      const request = index.getAll(accountId);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  /**
   * Get single item by ID
   */
  async getById(storeName: string, id: any): Promise<any> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  /**
   * Delete item by ID
   */
  async delete(storeName: string, id: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        resolve();
      };
    });
  }

  /**
   * Clear entire store
   */
  async clear(storeName: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => {
        reject(request.error);
      };

      transaction.oncomplete = () => {
        resolve();
      };
    });
  }

  /**
   * Get metadata about offline storage
   */
  async getMetadata(): Promise<any> {
    const metadata = await this.load('metadata');
    return metadata[0] || {};
  }

  /**
   * Update metadata
   */
  async setMetadata(key: string, value: any): Promise<void> {
    const metadata = await this.getMetadata();
    metadata[key] = value;
    await this.save('metadata', { id: 1, ...metadata }, false);
  }

  /**
   * Get database size estimate
   */
  async getStorageInfo(): Promise<StorageEstimate> {
    if (navigator.storage && navigator.storage.estimate) {
      return await navigator.storage.estimate();
    }
    return { usage: 0, quota: 0 };
  }

  /**
   * Export all data as JSON
   */
  async exportData(): Promise<OfflineDataStore> {
    const data: OfflineDataStore = {
      invoices: await this.load('invoices'),
      customers: await this.load('customers'),
      products: await this.load('products'),
      expenses: await this.load('expenses'),
      revenues: await this.load('revenues'),
      tags: await this.load('tags'),
      units: await this.load('units'),
      messages: await this.load('messages'),
      syncQueue: await this.load('syncQueue')
    };
    return data;
  }

  /**
   * Import data into IndexedDB
   */
  async importData(data: Partial<OfflineDataStore>): Promise<void> {
    const entries = Object.entries(data) as [keyof OfflineDataStore, any[]][];

    for (const [storeName, items] of entries) {
      if (items && items.length > 0) {
        await this.save(storeName as string, items, true);
      }
    }
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    for (const storeName of this.stores) {
      await this.clear(storeName);
    }
  }

  /**
   * Check if database is ready
   */
  isReady(): boolean {
    return this.db !== null;
  }
}

export default new OfflineStorageService();
