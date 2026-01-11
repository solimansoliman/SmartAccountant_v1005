import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, Loader2, AlertTriangle, Info, CheckCircle, AlertCircle, Clock, X, RefreshCw } from 'lucide-react';
import { notificationsApi, ApiNotification } from '../services/apiService';
import { useNotification } from '../context/NotificationContext';
import { formatDateTime, formatDate as formatDateSimple } from '../services/dateService';
import { usePagePermission } from '../services/permissionsHooks';
import AccessDenied from '../components/AccessDenied';

const Notifications: React.FC = () => {
  const { notify } = useNotification();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // ==================== صلاحيات الصفحة ====================
  const pagePerms = usePagePermission('notifications');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationsApi.getAll({ 
        unreadOnly: filter === 'unread',
        pageSize: 50 
      });
      setNotifications(data);
    } catch (err: any) {
      console.warn('فشل في جلب الإشعارات:', err.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // إذا لم يكن لديه صلاحية عرض الصفحة
  if (pagePerms.checked && !pagePerms.canView) {
    return <AccessDenied />;
  }

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
    } catch (err: any) {
      notify(err.message || 'فشل في تحديث الإشعار', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    setActionLoading(true);
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      notify('تم تحديد جميع الإشعارات كمقروءة', 'success');
    } catch (err: any) {
      notify(err.message || 'فشل في تحديث الإشعارات', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await notificationsApi.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      notify('تم حذف الإشعار', 'success');
      setDeleteId(null);
    } catch (err: any) {
      notify(err.message || 'فشل في حذف الإشعار', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    setActionLoading(true);
    try {
      await notificationsApi.deleteAll();
      setNotifications([]);
      notify('تم حذف جميع الإشعارات', 'success');
    } catch (err: any) {
      notify(err.message || 'فشل في حذف الإشعارات', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getTypeIcon = (type: ApiNotification['type']) => {
    switch (type) {
      case 'Success': return <CheckCircle className="text-emerald-500" size={20} />;
      case 'Warning': return <AlertTriangle className="text-amber-500" size={20} />;
      case 'Error': return <AlertCircle className="text-rose-500" size={20} />;
      case 'Reminder': return <Clock className="text-blue-500" size={20} />;
      case 'Alert': return <Bell className="text-purple-500" size={20} />;
      default: return <Info className="text-slate-500" size={20} />;
    }
  };

  const getTypeBgColor = (type: ApiNotification['type']) => {
    switch (type) {
      case 'Success': return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700';
      case 'Warning': return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700';
      case 'Error': return 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700';
      case 'Reminder': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700';
      case 'Alert': return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700';
      default: return 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return formatDateSimple(dateStr);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">جاري تحميل الإشعارات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <Bell className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">الإشعارات</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {unreadCount} إشعار غير مقروء
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={fetchNotifications}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="تحديث"
          >
            <RefreshCw size={18} />
          </button>
          
          {notifications.length > 0 && (
            <>
              <button
                onClick={handleMarkAllAsRead}
                disabled={actionLoading || unreadCount === 0}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors"
              >
                <CheckCheck size={16} />
                تحديد الكل كمقروء
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={actionLoading}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 disabled:opacity-50 transition-colors"
              >
                <Trash2 size={16} />
                حذف الكل
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            filter === 'all' 
              ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          الكل ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            filter === 'unread' 
              ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          غير مقروء ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <Bell className="mx-auto mb-4 text-slate-300 dark:text-slate-600" size={48} />
            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">لا توجد إشعارات</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {filter === 'unread' ? 'تم قراءة جميع الإشعارات' : 'ستظهر الإشعارات الجديدة هنا'}
            </p>
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.id}
              className={`rounded-xl border-2 p-4 transition-all hover:shadow-md ${getTypeBgColor(notification.type)} ${
                !notification.isRead ? 'border-r-4' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                  {getTypeIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`font-bold text-slate-800 dark:text-white ${!notification.isRead ? '' : 'opacity-70'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {formatDate(notification.createdAt)}
                    </span>
                  </div>
                  
                  <p className={`text-sm text-slate-600 dark:text-slate-300 mt-1 ${!notification.isRead ? '' : 'opacity-70'}`}>
                    {notification.message}
                  </p>
                  
                  {notification.link && (
                    <a
                      href={notification.link}
                      className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
                    >
                      عرض التفاصيل
                    </a>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  {!notification.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="p-2 text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                      title="تحديد كمقروء"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteId(notification.id)}
                    className="p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-full">
                <AlertTriangle className="text-rose-600 dark:text-rose-400" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">تأكيد الحذف</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">هل أنت متأكد من حذف هذا الإشعار؟</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={actionLoading}
                className="flex-1 bg-rose-600 text-white py-2.5 rounded-lg hover:bg-rose-700 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading && <Loader2 className="animate-spin h-4 w-4" />}
                حذف
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
