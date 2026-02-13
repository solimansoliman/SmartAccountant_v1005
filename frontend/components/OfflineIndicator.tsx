import React from 'react';
import { useOfflineMode } from '../hooks/useOfflineMode';

/**
 * Offline Indicator Component
 * Shows connection status and sync queue progress
 */
export const OfflineIndicator: React.FC = () => {
  const [showDetails, setShowDetails] = React.useState(false);
  const { offlineState, syncNow, retryFailed, clearCache } = useOfflineMode();

  if (offlineState.isOnline && offlineState.syncStats.pending === 0) {
    return null; // Don't show if online and nothing to sync
  }

  const syncPercentage =
    offlineState.syncStats.total > 0
      ? ((offlineState.syncStats.completed / offlineState.syncStats.total) * 100).toFixed(0)
      : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Main indicator button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all ${
          offlineState.isOnline
            ? 'bg-green-500 hover:bg-green-600'
            : 'bg-red-500 hover:bg-red-600'
        } text-white font-medium`}
      >
        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        {offlineState.isOnline ? '🌐 Online' : '📴 Offline'}

        {offlineState.syncStats.pending > 0 && (
          <span className="ml-2 px-2 py-1 bg-yellow-400 text-black rounded text-xs font-bold">
            {offlineState.syncStats.pending}
          </span>
        )}
      </button>

      {/* Details panel */}
      {showDetails && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-lg shadow-2xl p-4 text-gray-800">
          <div className="space-y-4">
            {/* Status */}
            <div className="border-b pb-3">
              <h3 className="font-bold mb-2">📊 Status</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <span className={offlineState.isOnline ? 'text-green-600' : 'text-red-600'}>
                    {offlineState.isOnline ? '✅ Online' : '❌ Offline'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Service Worker:</span>
                  <span className={offlineState.sw_registered ? 'text-green-600' : 'text-red-600'}>
                    {offlineState.sw_registered ? '✅ Active' : '❌ Not registered'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cache Size:</span>
                  <span>{offlineState.cacheSize}</span>
                </div>
              </div>
            </div>

            {/* Sync queue stats */}
            <div className="border-b pb-3">
              <h3 className="font-bold mb-2">🔄 Sync Queue</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span>{offlineState.syncStats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending:</span>
                  <span className="text-yellow-600">
                    {offlineState.syncStats.pending}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Syncing:</span>
                  <span className="text-blue-600">
                    {offlineState.syncStats.syncing}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Completed:</span>
                  <span className="text-green-600">
                    {offlineState.syncStats.completed}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Failed:</span>
                  <span className="text-red-600">
                    {offlineState.syncStats.failed}
                  </span>
                </div>

                {offlineState.syncStats.total > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Progress:</span>
                      <span>{syncPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${syncPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {offlineState.isOnline && offlineState.syncStats.pending > 0 && (
                <button
                  onClick={syncNow}
                  className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition"
                >
                  🔄 Sync Now
                </button>
              )}

              {offlineState.syncStats.failed > 0 && (
                <button
                  onClick={retryFailed}
                  className="flex-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm font-medium transition"
                >
                  🔁 Retry Failed
                </button>
              )}

              <button
                onClick={clearCache}
                className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition"
              >
                🗑️ Clear Cache
              </button>
            </div>

            {/* Info message */}
            <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
              💡 Your data is automatically synced when connection is restored.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
