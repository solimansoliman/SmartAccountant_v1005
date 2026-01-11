/**
 * SyncContext - سياق المزامنة
 * يوفر حالة المزامنة ووظائف الإدارة لجميع المكونات
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import syncService, { SyncState, createDataStore } from '../services/syncService';
import { getSystemPermissions } from '../services/storageService';
import { SystemPermissions } from '../types';

// ==================== Types ====================

interface DataCache<T = any> {
  data: T[];
  timestamp: number;
  isLoading: boolean;
  error: string | null;
}

interface SyncContextType {
  // Sync State
  syncState: SyncState;
  
  // Connection Status
  isOnline: boolean;
  
  // Offline Mode Permissions
  offlinePermissions: {
    enabled: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    showIndicator: boolean;
    autoSync: boolean;
    maxPendingChanges: number;
  };
  
  // Data Management
  refreshData: (entity: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // Optimistic Updates
  optimisticUpdate: <T>(entity: string, action: 'add' | 'update' | 'delete', data: T, apiCall: () => Promise<T>) => Promise<T>;
  
  // Cache Management
  getCache: <T>(entity: string) => T[];
  setCache: <T>(entity: string, data: T[]) => void;
  updateCacheItem: <T extends { id: number | string }>(entity: string, item: T) => void;
  addCacheItem: <T>(entity: string, item: T) => void;
  removeCacheItem: <T extends { id: number | string }>(entity: string, id: number | string) => void;
  
  // Force Sync
  forceSync: () => Promise<void>;
  
  // Pending Changes
  pendingChangesCount: number;
  
  // Check if action is allowed offline
  canPerformOffline: (action: 'create' | 'edit' | 'delete') => boolean;
}

const SyncContext = createContext<SyncContextType | null>(null);

// ==================== Provider ====================

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [syncState, setSyncState] = useState<SyncState>(syncService.getState());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [permissions, setPermissions] = useState<SystemPermissions>(getSystemPermissions());
  const cacheRef = useRef<Map<string, DataCache>>(new Map());
  const listenersRef = useRef<Map<string, Set<() => void>>>(new Map());

  // Calculate offline permissions
  const offlinePermissions = {
    enabled: permissions.allowOfflineMode !== false,
    canCreate: permissions.allowOfflineCreate !== false,
    canEdit: permissions.allowOfflineEdit !== false,
    canDelete: permissions.allowOfflineDelete === true,
    showIndicator: permissions.showOfflineIndicator !== false,
    autoSync: permissions.autoSyncOnReconnect !== false,
    maxPendingChanges: permissions.maxPendingChanges || 100,
  };

  // Check if action is allowed offline
  const canPerformOffline = useCallback((action: 'create' | 'edit' | 'delete'): boolean => {
    if (isOnline) return true; // Always allowed when online
    if (!offlinePermissions.enabled) return false; // Offline mode disabled
    
    switch (action) {
      case 'create':
        return offlinePermissions.canCreate;
      case 'edit':
        return offlinePermissions.canEdit;
      case 'delete':
        return offlinePermissions.canDelete;
      default:
        return false;
    }
  }, [isOnline, offlinePermissions]);

  // Subscribe to sync service
  useEffect(() => {
    const unsubscribe = syncService.subscribe(setSyncState);
    
    const handleOnline = () => {
      setIsOnline(true);
      // Auto sync on reconnect if enabled
      if (offlinePermissions.autoSync) {
        syncService.forceSync();
      }
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Refresh permissions periodically
    const permInterval = setInterval(() => {
      setPermissions(getSystemPermissions());
    }, 5000);
    
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(permInterval);
    };
  }, [offlinePermissions.autoSync]);

  // Get cache for entity
  const getCache = useCallback(<T,>(entity: string): T[] => {
    const cache = cacheRef.current.get(entity);
    return (cache?.data || []) as T[];
  }, []);

  // Set cache for entity
  const setCache = useCallback(<T,>(entity: string, data: T[]) => {
    cacheRef.current.set(entity, {
      data,
      timestamp: Date.now(),
      isLoading: false,
      error: null,
    });
    
    // Notify listeners
    const listeners = listenersRef.current.get(entity);
    if (listeners) {
      listeners.forEach(l => l());
    }
  }, []);

  // Update single item in cache
  const updateCacheItem = useCallback(<T extends { id: number | string }>(entity: string, item: T) => {
    const cache = cacheRef.current.get(entity);
    if (cache) {
      const newData = cache.data.map((i: any) => i.id === item.id ? item : i);
      setCache(entity, newData);
    }
  }, [setCache]);

  // Add item to cache
  const addCacheItem = useCallback(<T,>(entity: string, item: T) => {
    const cache = cacheRef.current.get(entity);
    const currentData = cache?.data || [];
    setCache(entity, [...currentData, item]);
  }, [setCache]);

  // Remove item from cache
  const removeCacheItem = useCallback(<T extends { id: number | string }>(entity: string, id: number | string) => {
    const cache = cacheRef.current.get(entity);
    if (cache) {
      const newData = cache.data.filter((i: any) => i.id !== id);
      setCache(entity, newData);
    }
  }, [setCache]);

  // Optimistic update with rollback
  const optimisticUpdate = useCallback(async <T,>(
    entity: string,
    action: 'add' | 'update' | 'delete',
    data: T,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const cache = cacheRef.current.get(entity);
    const originalData = cache?.data ? [...cache.data] : [];
    
    // Optimistic update
    switch (action) {
      case 'add':
        addCacheItem(entity, data);
        break;
      case 'update':
        updateCacheItem(entity, data as any);
        break;
      case 'delete':
        removeCacheItem(entity, (data as any).id);
        break;
    }
    
    try {
      // Make API call
      const result = await apiCall();
      
      // Update with server response (for IDs, timestamps, etc.)
      if (action === 'add' || action === 'update') {
        updateCacheItem(entity, result as any);
      }
      
      syncService.markSynced(entity, action === 'add' ? 'create' : action, result);
      
      return result;
    } catch (error) {
      // Rollback on error
      setCache(entity, originalData);
      throw error;
    }
  }, [addCacheItem, updateCacheItem, removeCacheItem, setCache]);

  // Refresh data for entity
  const refreshData = useCallback(async (entity: string) => {
    // This should be implemented by the component that knows how to fetch
    console.log(`Refreshing ${entity}...`);
  }, []);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    const entities = Array.from(cacheRef.current.keys());
    await Promise.all(entities.map(e => refreshData(e)));
  }, [refreshData]);

  // Force sync
  const forceSync = useCallback(async () => {
    await syncService.forceSync();
  }, []);

  const value: SyncContextType = {
    syncState,
    isOnline,
    refreshData,
    refreshAll,
    optimisticUpdate,
    getCache,
    setCache,
    updateCacheItem,
    addCacheItem,
    removeCacheItem,
    forceSync,
    pendingChangesCount: syncState.pendingChanges,
    offlinePermissions,
    canPerformOffline,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
      {/* Offline Indicator - Only show if showIndicator permission is enabled */}
      {!isOnline && offlinePermissions.showIndicator && (
        <div className="fixed bottom-4 left-4 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-pulse">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
          </svg>
          <div className="flex flex-col">
            <span>لا يوجد اتصال بالإنترنت</span>
            {offlinePermissions.enabled ? (
              <span className="text-xs opacity-80">
                وضع عدم الاتصال مفعّل
                {offlinePermissions.canCreate && ' • إضافة'}
                {offlinePermissions.canEdit && ' • تعديل'}
                {offlinePermissions.canDelete && ' • حذف'}
              </span>
            ) : (
              <span className="text-xs text-red-200">وضع عدم الاتصال معطّل</span>
            )}
          </div>
        </div>
      )}
      {/* Syncing Indicator */}
      {syncState.isSyncing && offlinePermissions.showIndicator && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>جاري المزامنة...</span>
        </div>
      )}
      {/* Pending Changes Indicator */}
      {syncState.pendingChanges > 0 && !syncState.isSyncing && isOnline && offlinePermissions.showIndicator && (
        <div className="fixed bottom-4 right-4 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <span>{syncState.pendingChanges} تغييرات معلقة</span>
          <button 
            onClick={forceSync}
            className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-sm"
          >
            مزامنة الآن
          </button>
        </div>
      )}
      {/* Offline Mode Disabled Warning */}
      {!isOnline && !offlinePermissions.enabled && offlinePermissions.showIndicator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md text-center">
            <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              لا يوجد اتصال بالإنترنت
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              وضع العمل بدون اتصال غير مفعّل لهذا الحساب.
              يرجى الاتصال بالإنترنت للمتابعة.
            </p>
          </div>
        </div>
      )}
    </SyncContext.Provider>
  );
};

// ==================== Hook ====================

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}

// ==================== Entity Hook ====================

/**
 * Hook for managing entity data with automatic sync
 */
export function useEntityData<T extends { id: number | string }>(
  entityName: string,
  fetchFn: () => Promise<T[]>,
  deps: any[] = []
) {
  const { setCache, getCache, updateCacheItem, addCacheItem, removeCacheItem, optimisticUpdate, isOnline } = useSync();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  // Fetch data
  const fetch = useCallback(async (force = false) => {
    if (!force && fetchedRef.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchFn();
      setData(result);
      setCache(entityName, result);
      fetchedRef.current = true;
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data');
      // Try to use cached data
      const cached = getCache<T>(entityName);
      if (cached.length > 0) {
        setData(cached);
      }
    } finally {
      setLoading(false);
    }
  }, [entityName, fetchFn, setCache, getCache, ...deps]);

  // Initial fetch
  useEffect(() => {
    fetch();
  }, [fetch]);

  // Refetch when coming back online
  useEffect(() => {
    if (isOnline && fetchedRef.current) {
      fetch(true);
    }
  }, [isOnline]);

  // Add item
  const add = useCallback(async (item: Omit<T, 'id'>, apiCall: () => Promise<T>) => {
    const tempId = `temp_${Date.now()}`;
    const tempItem = { ...item, id: tempId } as T;
    
    const result = await optimisticUpdate(entityName, 'add', tempItem, apiCall);
    
    // Update local state with server response
    setData(prev => prev.map(i => (i as any).id === tempId ? result : i));
    
    return result;
  }, [entityName, optimisticUpdate]);

  // Update item
  const update = useCallback(async (item: T, apiCall: () => Promise<T>) => {
    const result = await optimisticUpdate(entityName, 'update', item, apiCall);
    setData(prev => prev.map(i => i.id === item.id ? result : i));
    return result;
  }, [entityName, optimisticUpdate]);

  // Remove item
  const remove = useCallback(async (id: number | string, apiCall: () => Promise<void>) => {
    const item = data.find(i => i.id === id);
    if (!item) return;
    
    await optimisticUpdate(entityName, 'delete', item, async () => {
      await apiCall();
      return item;
    });
    
    setData(prev => prev.filter(i => i.id !== id));
  }, [entityName, optimisticUpdate, data]);

  // Update local item without API call
  const updateLocal = useCallback((item: T) => {
    setData(prev => prev.map(i => i.id === item.id ? item : i));
    updateCacheItem(entityName, item);
  }, [entityName, updateCacheItem]);

  // Add local item without API call  
  const addLocal = useCallback((item: T) => {
    setData(prev => [...prev, item]);
    addCacheItem(entityName, item);
  }, [entityName, addCacheItem]);

  // Remove local item without API call
  const removeLocal = useCallback((id: number | string) => {
    setData(prev => prev.filter(i => i.id !== id));
    removeCacheItem(entityName, id);
  }, [entityName, removeCacheItem]);

  return {
    data,
    loading,
    error,
    refetch: () => fetch(true),
    add,
    update,
    remove,
    updateLocal,
    addLocal,
    removeLocal,
    setData: (newData: T[]) => {
      setData(newData);
      setCache(entityName, newData);
    },
  };
}

export default SyncContext;
