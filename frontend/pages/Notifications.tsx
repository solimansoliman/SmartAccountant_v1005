import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Bell, Check, CheckCheck, Trash2, Loader2, AlertTriangle, Info, CheckCircle, AlertCircle, Clock, X, RefreshCw, Search, Calendar, Plus, Send } from 'lucide-react';
import { notificationsApi, ApiNotification } from '../services/apiService';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, formatDate as formatDateSimple } from '../services/dateService';
import { usePagePermission } from '../services/permissionsHooks';
import AccessDenied from '../components/AccessDenied';
import AccessibleModal from '../components/AccessibleModal';

const Notifications: React.FC = () => {
  const { notify, refreshNotifications } = useNotification();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendTarget, setSendTarget] = useState<'self' | 'all'>('self');
  const [composeTitle, setComposeTitle] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeType, setComposeType] = useState<ApiNotification['type']>('Info');
  const [composeLink, setComposeLink] = useState('');

  // بدون فلترة تاريخ افتراضية حتى لا يتم إخفاء الإشعارات تلقائيا
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
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
      refreshNotifications();
    } catch (err: any) {
      notify(err.message || 'فشل في تحديث الإشعار', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    setActionLoading(true);
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      refreshNotifications();
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
      refreshNotifications();
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
      refreshNotifications();
      notify('تم حذف جميع الإشعارات', 'success');
    } catch (err: any) {
      notify(err.message || 'فشل في حذف الإشعارات', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const resetCompose = () => {
    setSendTarget('self');
    setComposeTitle('');
    setComposeMessage('');
    setComposeType('Info');
    setComposeLink('');
  };

  const handleSendNotification = async () => {
    if (!composeTitle.trim() || !composeMessage.trim()) {
      notify('يرجى إدخال عنوان ومحتوى الإشعار', 'warning');
      return;
    }

    if (!user?.id) {
      notify('تعذر تحديد المستخدم الحالي', 'error');
      return;
    }

    setSendLoading(true);
    try {
      const payload = {
        title: composeTitle.trim(),
        message: composeMessage.trim(),
        type: composeType,
        link: composeLink.trim() || undefined,
        icon: 'bell',
      };

      if (sendTarget === 'all') {
        await notificationsApi.broadcast(payload);
        notify('تم إرسال الإشعار لجميع المستخدمين', 'success');
      } else {
        await notificationsApi.create({ ...payload, userId: Number(user.id) });
        notify('تم إرسال الإشعار بنجاح', 'success');
      }

      setShowCompose(false);
      resetCompose();
      await fetchNotifications();
      refreshNotifications();
    } catch (err: any) {
      notify(err.message || 'فشل في إرسال الإشعار', 'error');
    } finally {
      setSendLoading(false);
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

  // تصفية الإشعارات حسب البحث والتاريخ
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // تصفية بالبحث
      const matchesSearch = !searchQuery || 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase());
      
      // تصفية بالتاريخ
      const notifDate = new Date(n.createdAt);
      const matchesDateFrom = !dateFrom || notifDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || notifDate <= new Date(dateTo + 'T23:59:59');
      
      return matchesSearch && matchesDateFrom && matchesDateTo;
    });
  }, [notifications, searchQuery, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = !!searchQuery || !!dateFrom || !!dateTo;

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
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-800/80 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-blue-100 dark:border-slate-600">
              <Bell className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">الإشعارات</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">مركز التنبيهات والتنبيهات النظامية</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCompose(true)}
              disabled={!pagePerms.canCreate}
              className="h-9 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 transition-colors"
              title={pagePerms.canCreate ? 'إضافة إشعار' : 'لا تملك صلاحية إضافة إشعارات'}
            >
              <Plus size={14} />
              <span className="text-xs font-semibold">إضافة إشعار</span>
            </button>
            <button
              onClick={fetchNotifications}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
              title="تحديث"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-slate-200/80 dark:border-slate-600 bg-white/80 dark:bg-slate-700/70 px-2.5 py-2">
            <p className="text-[10px] text-slate-500 dark:text-slate-400">الإجمالي</p>
            <p className="text-sm font-bold text-slate-800 dark:text-white">{notifications.length}</p>
          </div>
          <div className="rounded-lg border border-blue-200/80 dark:border-blue-700 bg-blue-50/80 dark:bg-blue-900/20 px-2.5 py-2">
            <p className="text-[10px] text-blue-600/80 dark:text-blue-300/80">غير مقروء</p>
            <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{unreadCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200/80 dark:border-slate-600 bg-white/80 dark:bg-slate-700/70 px-2.5 py-2">
            <p className="text-[10px] text-slate-500 dark:text-slate-400">الظاهر</p>
            <p className="text-sm font-bold text-slate-800 dark:text-white">{filteredNotifications.length}</p>
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleMarkAllAsRead}
              disabled={actionLoading || unreadCount === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <CheckCheck size={14} />
              <span className="hidden sm:inline">تحديد الكل كمقروء</span>
              <span className="sm:hidden">قراءة الكل</span>
            </button>
            <button
              onClick={handleDeleteAll}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 disabled:opacity-50 transition-colors"
            >
              <Trash2 size={14} />
              حذف الكل
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-fit">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            filter === 'all' 
              ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          الكل ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            filter === 'unread' 
              ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          غير مقروء ({unreadCount})
        </button>
      </div>

      {/* Search and Date Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none text-sm"
            />
          </div>
          
          {/* Date Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Calendar size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full pr-8 pl-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none text-xs"
                title="من تاريخ"
              />
            </div>
            <div className="relative flex-1">
              <Calendar size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full pr-8 pl-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none text-xs"
                title="إلى تاريخ"
              />
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        
        {hasFilters && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
            {filteredNotifications.length} من {notifications.length}
          </p>
        )}
      </div>

      {/* Notifications List - Grid Layout */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-700 shadow-sm">
          <Bell className="mx-auto mb-2 text-slate-300 dark:text-slate-600" size={32} />
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">لا توجد إشعارات</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {hasFilters ? 'لا توجد نتائج للبحث' : filter === 'unread' ? 'تم قراءة جميع الإشعارات' : 'ستظهر الإشعارات الجديدة هنا'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredNotifications.map(notification => (
            <div
              key={notification.id}
              className={`rounded-xl border p-3 transition-all hover:shadow-md ${getTypeBgColor(notification.type)} ${
                !notification.isRead ? 'border-r-4 ring-1 ring-blue-200/60 dark:ring-blue-700/30' : ''
              }`}
            >
              {/* Header: Icon + Date + Actions */}
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 bg-white dark:bg-slate-800 rounded shadow-sm">
                    {getTypeIcon(notification.type)}
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500">
                    {formatDate(notification.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  {!notification.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="p-1 text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded transition-colors"
                      title="تحديد كمقروء"
                    >
                      <Check size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteId(notification.id)}
                    className="p-1 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              
              {/* Title */}
              <h4 className={`font-bold text-xs text-slate-800 dark:text-white line-clamp-1 ${!notification.isRead ? '' : 'opacity-80'}`}>
                {notification.title}
              </h4>
              
              {/* Message */}
              <p className={`text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2 ${!notification.isRead ? '' : 'opacity-80'}`}>
                {notification.message}
              </p>
              
              {notification.link && (
                <a
                  href={notification.link}
                  className="inline-block text-[10px] text-blue-600 dark:text-blue-400 hover:underline mt-1"
                >
                  عرض ←
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Compose Notification Modal */}
      <AccessibleModal
        isOpen={showCompose}
        onClose={() => {
          setShowCompose(false);
          resetCompose();
        }}
        title="إضافة إشعار"
        maxWidthClassName="max-w-xl"
      >
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">جهة الإرسال</label>
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <button
                    onClick={() => setSendTarget('self')}
                    className={`flex-1 py-2 text-sm rounded-md transition-colors ${sendTarget === 'self' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 shadow' : 'text-slate-500 dark:text-slate-300'}`}
                  >
                    إشعار لي
                  </button>
                  <button
                    onClick={() => setSendTarget('all')}
                    className={`flex-1 py-2 text-sm rounded-md transition-colors ${sendTarget === 'all' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 shadow' : 'text-slate-500 dark:text-slate-300'}`}
                  >
                    إشعار للجميع
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">العنوان *</label>
                <input
                  type="text"
                  value={composeTitle}
                  onChange={(e) => setComposeTitle(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none"
                  placeholder="عنوان الإشعار"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">النوع</label>
                <select
                  value={composeType}
                  onChange={(e) => setComposeType(e.target.value as ApiNotification['type'])}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none"
                >
                  <option value="Info">معلومة</option>
                  <option value="Success">نجاح</option>
                  <option value="Warning">تحذير</option>
                  <option value="Error">خطأ</option>
                  <option value="Reminder">تذكير</option>
                  <option value="Alert">تنبيه</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">المحتوى *</label>
                <textarea
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  rows={4}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none resize-none"
                  placeholder="اكتب محتوى الإشعار..."
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">رابط اختياري</label>
                <input
                  type="text"
                  value={composeLink}
                  onChange={(e) => setComposeLink(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none"
                  placeholder="مثال: /messages"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSendNotification}
                  disabled={sendLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-bold disabled:opacity-50"
                >
                  {sendLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Send size={16} />}
                  إرسال
                </button>
                <button
                  onClick={() => {
                    setShowCompose(false);
                    resetCompose();
                  }}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  إلغاء
                </button>
              </div>
            </div>
      </AccessibleModal>

      {/* Delete Confirmation Modal */}
      <AccessibleModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="تأكيد الحذف"
        maxWidthClassName="max-w-md"
      >
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
      </AccessibleModal>
    </div>
  );
};

export default Notifications;
