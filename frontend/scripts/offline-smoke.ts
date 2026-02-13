type Listener = (event?: any) => void;

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

const listeners = new Map<string, Set<Listener>>();

const windowStub = {
  addEventListener: (type: string, listener: Listener) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type)!.add(listener);
  },
  removeEventListener: (type: string, listener: Listener) => {
    listeners.get(type)?.delete(listener);
  },
  dispatchEvent: (event: { type: string }) => {
    listeners.get(event.type)?.forEach((listener) => listener(event));
    return true;
  },
};

Object.defineProperty(globalThis, 'window', {
  value: windowStub,
  configurable: true,
});

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: new MemoryStorage(),
  configurable: true,
});

Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true },
  writable: true,
  configurable: true,
});

function setOnline(value: boolean) {
  (globalThis as any).navigator.onLine = value;
  (globalThis as any).window.dispatchEvent({ type: value ? 'online' : 'offline' });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitFor(condition: () => boolean, timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (condition()) return true;
    await sleep(50);
  }
  return false;
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  sessionStorage.setItem('smart_accountant_user', JSON.stringify({ accountId: 1 }));

  const { syncService } = await import('../services/syncService');

  syncService.clearQueue();

  const processed: string[] = [];
  let expenseAttempts = 0;

  syncService.registerProcessor('invoices', async (item) => {
    processed.push(`invoice:${item.type}:${item.id}`);
    return { ...item.data, synced: true };
  });

  syncService.registerProcessor('expenses', async (item) => {
    expenseAttempts += 1;
    if (expenseAttempts === 1) {
      const error = new Error('network temporarily unavailable') as Error & { status?: number };
      error.status = 0;
      throw error;
    }
    processed.push(`expense:${item.type}:${item.id}`);
    return { ...item.data, synced: true };
  });

  syncService.registerProcessor('payments', async () => {
    const error = new Error('conflict detected') as Error & { status?: number; code?: string };
    error.status = 409;
    error.code = 'CONFLICT';
    throw error;
  });

  setOnline(false);
  syncService.queueChange('invoices', 'create', { id: 'tmp-invoice-1', total: 120 });

  assert(syncService.getPendingCount() === 1, 'Expected 1 pending item while offline');
  assert(processed.length === 0, 'No processing should happen while offline');
  console.log('[PASS] Offline queueing works');

  setOnline(true);
  const syncedAfterReconnect = await waitFor(() => syncService.getPendingCount() === 0);
  assert(syncedAfterReconnect, 'Queued invoice was not synced after reconnect');
  assert(processed.some(p => p.startsWith('invoice:create')), 'Invoice processor did not run');
  console.log('[PASS] Reconnect sync works');

  syncService.queueChange('expenses', 'create', { id: 'tmp-expense-1', amount: 33 });
  const hasFailedExpense = await waitFor(() => syncService.getQueueItems().some(i => i.entity === 'expenses' && i.status === 'failed'));
  assert(hasFailedExpense, 'Expected failed expense after first transient failure');
  console.log('[PASS] Failed item captured');

  const retriedCount = syncService.retryFailedItems();
  assert(retriedCount >= 1, 'Expected retryFailedItems to reset failed entries');
  await syncService.forceSync();
  const expenseSynced = await waitFor(() => syncService.getQueueItems().every(i => i.entity !== 'expenses'));
  assert(expenseSynced, 'Expense was not synced after retry');
  assert(expenseAttempts >= 2, 'Expected at least two attempts for expense');
  console.log('[PASS] Retry flow works');

  syncService.queueChange('payments', 'create', { id: 'tmp-payment-1', amount: 50 });
  const hasConflict = await waitFor(() => syncService.getQueueItems().some(i => i.entity === 'payments' && i.errorType === 'conflict'));
  assert(hasConflict, 'Expected conflict item in queue');
  const removedConflicts = syncService.discardConflictItems();
  assert(removedConflicts >= 1, 'Expected conflict item to be discarded');
  console.log('[PASS] Conflict discard works');

  syncService.clearQueue();
  syncService.destroy();
  console.log('\n[SUCCESS] Offline outbox smoke test completed.');
}

run().catch((error) => {
  console.error('\n[FAIL] Offline outbox smoke test failed:', error.message);
  process.exitCode = 1;
});
