/**
 * useOfflineMode Hook
 * Manages offline mode functionality including Service Worker registration,
 * data caching, and offline indicators
 */

import { useEffect, useState, useCallback } from 'react';
import offlineService from '../services/offlineService';
import syncQueueService from '../services/syncQueueService';

export interface OfflineState {
  isOnline: boolean;
  sw_registered: boolean;
  cacheSize: string;
  syncStats: {
    total: number;
    pending: number;
    syncing: number;
    completed: number;
    failed: number;
  };
}

export function useOfflineMode() {
  const [offlineState, setOfflineState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    sw_registered: false,
    cacheSize: '0 MB',
    syncStats: { total: 0, pending: 0, syncing: 0, completed: 0, failed: 0 }
  });

  const [loading, setLoading] = useState(true);

  // Initialize offline mode
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_REQUIRED') {
        console.log('📨 Sync message received from Service Worker');
        syncQueueService.forceSync();
      }
    };

    const initOfflineMode = async () => {
      try {
        // Initialize IndexedDB
        await offlineService.init();
        console.log('✅ Offline storage initialized');

        // Register Service Worker
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
              scope: '/',
              updateViaCache: 'none'
            });
            console.log('✅ Service Worker registered:', registration);

            await registration.update();
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }

            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (!newWorker) return;

              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            });

            setOfflineState(prev => ({ ...prev, sw_registered: true }));

            // Start sync queue monitoring
            syncQueueService.startSync();
            console.log('✅ Sync queue monitoring started');

            // Listen for sync messages
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
          } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('❌ Offline mode initialization failed:', error);
        setLoading(false);
      }
    };

    initOfflineMode();

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      syncQueueService.stopSync();
    };
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Connected to internet');
      setOfflineState(prev => ({ ...prev, isOnline: true }));
      syncQueueService.forceSync();
    };

    const handleOffline = () => {
      console.log('📴 Disconnected from internet');
      setOfflineState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update storage info
  const updateStorageInfo = useCallback(async () => {
    try {
      const storage = await offlineService.getStorageInfo();
      const usedMB = storage.usage ? (storage.usage / 1024 / 1024).toFixed(2) : '0';

      const stats = await syncQueueService.getStats();
      setOfflineState(prev => ({
        ...prev,
        cacheSize: `${usedMB} MB`,
        syncStats: stats
      }));
    } catch (error) {
      console.error('Failed to update storage info:', error);
    }
  }, []);

  // Update storage info periodically
  useEffect(() => {
    updateStorageInfo();
    const interval = setInterval(updateStorageInfo, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [updateStorageInfo]);

  const cacheData = useCallback(
    async (storeName: string, data: any, clear = false) => {
      try {
        await offlineService.save(storeName, data, clear);
        console.log(`✅ Cached ${storeName}`);
        updateStorageInfo();
      } catch (error) {
        console.error(`❌ Failed to cache ${storeName}:`, error);
      }
    },
    [updateStorageInfo]
  );

  const getCachedData = useCallback(async (storeName: string) => {
    try {
      return await offlineService.load(storeName);
    } catch (error) {
      console.error(`❌ Failed to get cached ${storeName}:`, error);
      return [];
    }
  }, []);

  const queueOperation = useCallback(
    async (method: 'GET' | 'POST' | 'PUT' | 'DELETE', endpoint: string, data?: any) => {
      return syncQueueService.addToQueue(method, endpoint, data);
    },
    []
  );

  const syncNow = useCallback(() => {
    console.log('🔄 Forcing immediate sync...');
    syncQueueService.forceSync();
  }, []);

  const getRetryFailed = useCallback(() => {
    return syncQueueService.retryFailed();
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await offlineService.clearAll();
      console.log('✅ Cache cleared');
      updateStorageInfo();
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }, [updateStorageInfo]);

  const exportData = useCallback(async () => {
    try {
      const data = await offlineService.exportData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `offline-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      console.log('✅ Data exported');
    } catch (error) {
      console.error('❌ Failed to export data:', error);
    }
  }, []);

  const importData = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await offlineService.importData(data);
      updateStorageInfo();
      console.log('✅ Data imported');
    } catch (error) {
      console.error('❌ Failed to import data:', error);
    }
  }, [updateStorageInfo]);

  return {
    offlineState,
    loading,
    cacheData,
    getCachedData,
    queueOperation,
    syncNow,
    retryFailed: getRetryFailed,
    clearCache,
    exportData,
    importData
  };
}
