import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * GDPR Compliance Page
 * Allows users to export, correct, and delete their data
 */
export const GdprPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteArmedUntil, setDeleteArmedUntil] = useState(0);

  const apiUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem('token');

  // Export data as JSON
  const handleExportJson = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${apiUrl}/api/gdpr/export`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `account-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage('✅ Your data has been exported successfully');
    } catch (err) {
      setError('❌ Failed to export data: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  // Export data as CSV
  const handleExportCsv = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${apiUrl}/api/gdpr/export-csv`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `account-export-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage('✅ Your data has been exported as CSV');
    } catch (err) {
      setError('❌ Failed to export CSV: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  // Request account deletion
  const handleRequestDeletion = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${apiUrl}/api/gdpr/request-deletion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      const data = await response.json();
      setMessage(
        `⏱️ Your account is scheduled for deletion on ${new Date(data.gracePeriodUntil).toLocaleDateString()}. You have 30 days to cancel.`
      );
    } catch (err) {
      setError('❌ Failed to request deletion: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  // Permanent account deletion
  const handlePermanentDelete = async () => {
    if (deleteCode !== 'DELETE_PERMANENTLY') {
      setError('❌ Invalid confirmation code');
      return;
    }

    const now = Date.now();
    if (now > deleteArmedUntil) {
      setDeleteArmedUntil(now + 7000);
      setError('');
      setMessage('⚠️ Click "Delete Permanently" again within 7 seconds to confirm final deletion.');
      return;
    }

    setDeleteArmedUntil(0);

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${apiUrl}/api/gdpr/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirmationCode: 'DELETE_PERMANENTLY' })
      });

      if (!response.ok) {
        throw new Error('Deletion failed');
      }

      setMessage('✅ Your account has been permanently deleted');
      setDeleteConfirm(false);
      setDeleteCode('');
      setDeleteArmedUntil(0);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }, 3000);
    } catch (err) {
      setError('❌ Failed to delete account: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  // Cancel deletion
  const handleCancelDeletion = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${apiUrl}/api/gdpr/cancel-deletion`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Cancel failed');
      }

      setMessage('✅ Account deletion has been cancelled');
    } catch (err) {
      setError('❌ Failed to cancel deletion: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🛡️ Privacy & Data Protection</h1>
        <p className="text-gray-600 mb-8">
          Manage your personal data in accordance with GDPR regulations
        </p>

        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Data Export Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              📥 Export Your Data
            </h2>
            <p className="text-gray-600 mb-4">
              Download a copy of all your data in a portable format. You can use this data with other services or keep it as a backup.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleExportJson}
                disabled={loading}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded font-medium transition"
              >
                {loading ? '⏳ Exporting...' : '📄 Export as JSON'}
              </button>
              <button
                onClick={handleExportCsv}
                disabled={loading}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded font-medium transition"
              >
                {loading ? '⏳ Exporting...' : '📊 Export as CSV'}
              </button>
            </div>
          </div>

          {/* Data Correction Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              ✏️ Correct Your Data
            </h2>
            <p className="text-gray-600 mb-4">
              Update your personal information to ensure accuracy.
            </p>
            <button
              className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded font-medium transition"
            >
              📝 Edit My Data
            </button>
          </div>

          {/* Account Deletion Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              🗑️ Delete Your Account
            </h2>
            <p className="text-gray-600 mb-4">
              You can request deletion of your account. After a 30-day grace period, all data will be permanently deleted.
            </p>

            {!deleteConfirm ? (
              <div className="flex gap-4">
                <button
                  onClick={handleRequestDeletion}
                  disabled={loading}
                  className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded font-medium transition"
                >
                  {loading ? '⏳ Processing...' : '⏱️ Schedule Deletion (30 days)'}
                </button>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium transition"
                >
                  ⚠️ Delete Immediately
                </button>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded p-4 space-y-4">
                <p className="font-bold text-red-700">
                  ⚠️ Permanent deletion cannot be undone!
                </p>
                <p className="text-gray-600">
                  Type this code exactly: <code className="bg-gray-100 px-2 py-1 rounded font-mono">DELETE_PERMANENTLY</code>
                </p>
                <input
                  type="text"
                  value={deleteCode}
                  onChange={e => {
                    setDeleteCode(e.target.value);
                    setDeleteArmedUntil(0);
                  }}
                  placeholder="Enter confirmation code"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
                <div className="flex gap-4">
                  <button
                    onClick={handlePermanentDelete}
                    disabled={loading || deleteCode !== 'DELETE_PERMANENTLY'}
                    className="flex-1 px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded font-medium transition"
                  >
                    {loading ? '⏳ Deleting...' : '🔥 Delete Permanently'}
                  </button>
                  <button
                    onClick={() => {
                      setDeleteConfirm(false);
                      setDeleteCode('');
                      setDeleteArmedUntil(0);
                    }}
                    className="flex-1 px-6 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded font-medium transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-blue-900 mb-2">ℹ️ Your Rights Under GDPR</h3>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li>✅ Right to access - Download all your data</li>
              <li>✅ Right to rectification - Correct your personal data</li>
              <li>✅ Right to erasure - Delete your account and data</li>
              <li>✅ Right to data portability - Export your data in open format</li>
              <li>✅ Right to withdraw consent - Cancel scheduled deletion</li>
            </ul>
          </div>

          {/* Contact Section */}
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <h3 className="font-bold mb-2">📞 Questions?</h3>
            <p className="text-gray-600">
              For GDPR inquiries or data requests, contact us at{' '}
              <a href="mailto:privacy@smartaccountant.com" className="text-blue-600 hover:underline">
                privacy@smartaccountant.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GdprPage;
