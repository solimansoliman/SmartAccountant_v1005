/**
 * نقطة التصدير الموحدة لجميع الخدمات
 * Unified Export Point for All Services
 * 
 * يمكن للصفحات الاستيراد من هنا مباشرة:
 * import { getProducts, addProduct } from '../services';
 */

// Re-export from storageService (الوضع الحالي - localStorage)
export * from './storageService';

// Re-export API service for direct API calls
export * from './apiService';

// Re-export dataService for hybrid mode (API + fallback)
export * as dataService from './dataService';

// Re-export invoice service as namespace to avoid conflicts with storageService
export * as invoiceService from './invoiceService';

// Re-export config service for API URL management
export * from './configService';

// Re-export sync service for offline support and data synchronization
export { default as syncService, useSyncState, createDataStore, useDataStore } from './syncService';
export type { SyncState, SyncQueueItem, DataStore } from './syncService';

// Re-export plan limits service
export * from './planLimitsService';
export { usePlanLimits } from './usePlanLimits';
