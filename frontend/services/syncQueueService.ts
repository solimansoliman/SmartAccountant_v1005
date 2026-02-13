/**
 * Sync Queue Service
 * Manages offline operations that need to sync when online
 */

import offlineService, { SyncQueueItem } from './offlineService';

class SyncQueueService {
  private syncInProgress = false;
  private syncInterval: NodeJS.Timeout | null = null;

  /**
   * Start monitoring sync queue
   */
  startSync(): void {
    if (this.syncInterval) return;

    // Check every 5 seconds if we're online and have items to sync
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.processSyncQueue();
      }
    }, 5000);

    // Also sync when connection is restored
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored, starting sync...');
      this.processSyncQueue();
    });
  }

  /**
   * Stop monitoring sync queue
   */
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Add operation to sync queue
   */
  async addToQueue(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<SyncQueueItem> {
    const item: SyncQueueItem = {
      id: `${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      method,
      endpoint,
      data,
      status: 'pending',
      retryCount: 0
    };

    await offlineService.save('syncQueue', item);
    console.log(`📝 Added to sync queue:`, item);

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.processSyncQueue();
    }

    return item;
  }

  /**
   * Get pending sync items
   */
  async getPendingItems(): Promise<SyncQueueItem[]> {
    const allItems = await offlineService.load('syncQueue');
    return allItems.filter(item => item.status === 'pending' || item.status === 'error');
  }

  /**
   * Process all items in sync queue
   */
  async processSyncQueue(): Promise<void> {
    if (this.syncInProgress) {
      console.log('⏳ Sync already in progress...');
      return;
    }

    this.syncInProgress = true;
    console.log('🔄 Starting sync queue processing...');

    try {
      const pendingItems = await this.getPendingItems();

      if (pendingItems.length === 0) {
        console.log('✅ Sync queue is empty');
        this.syncInProgress = false;
        return;
      }

      console.log(`📤 Syncing ${pendingItems.length} items...`);

      for (const item of pendingItems) {
        await this.syncItem(item);
      }

      console.log('✅ Sync queue processing completed');
    } catch (error) {
      console.error('❌ Sync queue processing error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync individual item
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    try {
      // Update status to syncing
      item.status = 'syncing';
      await offlineService.save('syncQueue', item);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const options: RequestInit = {
        method: item.method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (item.data && (item.method === 'POST' || item.method === 'PUT')) {
        options.body = JSON.stringify(item.data);
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${item.endpoint}`,
        options
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Mark as complete
      item.status = 'complete';
      await offlineService.save('syncQueue', item);

      console.log(`✅ Synced: ${item.method} ${item.endpoint}`);
    } catch (error) {
      console.error(`❌ Sync error for ${item.endpoint}:`, error);

      item.retryCount++;
      item.errorMessage = String(error);

      // Max 5 retries
      if (item.retryCount >= 5) {
        item.status = 'error';
        console.error(`❌ Item exceeded max retries:`, item);
      } else {
        item.status = 'error';
      }

      await offlineService.save('syncQueue', item);
    }
  }

  /**
   * Get sync queue stats
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    syncing: number;
    completed: number;
    failed: number;
  }> {
    const items = await offlineService.load('syncQueue');

    return {
      total: items.length,
      pending: items.filter(i => i.status === 'pending').length,
      syncing: items.filter(i => i.status === 'syncing').length,
      completed: items.filter(i => i.status === 'complete').length,
      failed: items.filter(i => i.status === 'error').length
    };
  }

  /**
   * Clear completed items
   */
  async clearCompleted(): Promise<void> {
    const items = await offlineService.load('syncQueue');
    const completedIds = items
      .filter(i => i.status === 'complete')
      .map(i => i.id);

    for (const id of completedIds) {
      await offlineService.delete('syncQueue', id);
    }

    console.log(`🗑️ Cleared ${completedIds.length} completed sync items`);
  }

  /**
   * Retry failed items
   */
  async retryFailed(): Promise<void> {
    const items = await offlineService.load('syncQueue');
    const failedItems = items.filter(i => i.status === 'error');

    for (const item of failedItems) {
      item.status = 'pending';
      item.retryCount = 0;
      await offlineService.save('syncQueue', item);
    }

    console.log(`🔄 Queued ${failedItems.length} items for retry`);
    this.processSyncQueue();
  }

  /**
   * Check if sync is in progress
   */
  isSyncing(): boolean {
    return this.syncInProgress;
  }

  /**
   * Force sync now
   */
  forceSync(): void {
    if (navigator.onLine) {
      this.processSyncQueue();
    } else {
      console.warn('⚠️ Cannot sync: No internet connection');
    }
  }
}

export default new SyncQueueService();
