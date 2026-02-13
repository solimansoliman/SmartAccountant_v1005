
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Notification, NotificationType, SystemMessage } from '../types';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { getUserMessages, markMessageAsRead, markAllMessagesAsRead } from '../services/storageService';
import { notificationsApi, ApiNotification } from '../services/apiService';
import { useAuth } from './AuthContext';

export const APP_NOTIFY_EVENT = 'app:notify';
const MAX_VISIBLE_TOASTS = 1;
const DUPLICATE_TOAST_COOLDOWN_MS = 1000;

interface NotificationContextType {
  notify: (message: string, type?: NotificationType) => void;
  // New System Notifications
  systemNotifications: SystemMessage[];
  unreadCount: number;
  refreshNotifications: () => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { isAuthenticated, isLoading, user } = useAuth();
  const notificationsRef = useRef<Notification[]>([]);
  const toastTimeoutsRef = useRef<Record<string, number>>({});
  const lastToastAtRef = useRef<Record<string, number>>({});
  
  // System Messages State
  const [systemNotifications, setSystemNotifications] = useState<SystemMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const hasApiIdentity = isAuthenticated && !!user?.id && !!user?.accountId;

  const mapApiNotificationToSystemMessage = useCallback((notification: ApiNotification): SystemMessage => {
    return {
      id: String(notification.id),
      title: notification.title,
      content: notification.message,
      date: notification.createdAt,
      sender: 'النظام',
      isRead: notification.isRead,
    };
  }, []);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const clearToastTimer = useCallback((id: string) => {
    const timeoutId = toastTimeoutsRef.current[id];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      delete toastTimeoutsRef.current[id];
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    clearToastTimer(id);
    const next = notificationsRef.current.filter(n => n.id !== id);
    notificationsRef.current = next;
    setNotifications(next);
  }, [clearToastTimer]);

  // --- Transient Toast Logic ---
  const notify = useCallback((message: string, type: NotificationType = 'info') => {
    const normalizedMessage = message.trim();
    if (!normalizedMessage) {
      return;
    }

    const now = Date.now();
    const duplicateKey = `${type}|${normalizedMessage}`;
    if ((lastToastAtRef.current[duplicateKey] || 0) > now - DUPLICATE_TOAST_COOLDOWN_MS) {
      return;
    }
    lastToastAtRef.current[duplicateKey] = now;

    const previous = notificationsRef.current;
    const existingToast = previous.find(n => n.type === type && n.message === normalizedMessage);
    const targetToast: Notification = existingToast || {
      id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
      message: normalizedMessage,
      type,
    };

    const next = [...previous.filter(n => n.id !== targetToast.id), targetToast];

    while (next.length > MAX_VISIBLE_TOASTS) {
      const removedToast = next.shift();
      if (removedToast) {
        clearToastTimer(removedToast.id);
      }
    }

    notificationsRef.current = next;
    setNotifications(next);

    // إطالة مدة عرض رسائل الخطأ والتحذير
    const duration = type === 'error' ? 8000 : type === 'warning' ? 6000 : 4000;
    clearToastTimer(targetToast.id);
    toastTimeoutsRef.current[targetToast.id] = window.setTimeout(() => {
      removeNotification(targetToast.id);
    }, duration);
  }, [clearToastTimer, removeNotification]);

  // Allow non-React services to emit UI notifications through a window event.
  useEffect(() => {
    const handleAppNotify = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string; type?: NotificationType }>;
      const message = customEvent.detail?.message;
      const type = customEvent.detail?.type || 'info';
      if (!message) return;
      notify(message, type);
    };

    window.addEventListener(APP_NOTIFY_EVENT, handleAppNotify);
    return () => {
      window.removeEventListener(APP_NOTIFY_EVENT, handleAppNotify);
    };
  }, [notify]);

  useEffect(() => {
    return () => {
      Object.values(toastTimeoutsRef.current).forEach(timeoutId => window.clearTimeout(timeoutId));
      toastTimeoutsRef.current = {};
    };
  }, []);

  // --- Persistent System Notifications Logic ---
  const refreshNotifications = useCallback(() => {
    const loadNotifications = async () => {
      const localMessages = getUserMessages();

      if (isLoading || !hasApiIdentity) {
        const msgs = localMessages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setSystemNotifications(msgs);
        setUnreadCount(msgs.filter(m => !m.isRead).length);
        return;
      }

      try {
        const [apiNotifications, apiUnreadCount] = await Promise.all([
          notificationsApi.getAll({ pageSize: 50 }),
          notificationsApi.getUnreadCount(),
        ]);

        const apiMessages = apiNotifications.map(mapApiNotificationToSystemMessage);
        const merged = [...apiMessages, ...localMessages]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 50);

        setSystemNotifications(merged);
        setUnreadCount((apiUnreadCount || 0) + localMessages.filter(m => !m.isRead).length);
      } catch {
        // Fallback to local notifications in offline/failure scenarios.
        const msgs = localMessages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setSystemNotifications(msgs);
        setUnreadCount(msgs.filter(m => !m.isRead).length);
      }
    };

    void loadNotifications();
  }, [hasApiIdentity, isLoading, mapApiNotificationToSystemMessage]);

  // Poll for new messages every 30 seconds
  useEffect(() => {
    refreshNotifications();

    if (isLoading || !hasApiIdentity) {
      return;
    }

    const interval = setInterval(refreshNotifications, 30000); 
    return () => clearInterval(interval);
  }, [hasApiIdentity, isLoading, refreshNotifications]);

  const markAsRead = (id: string) => {
    const apiId = Number(id);

    if (hasApiIdentity && Number.isFinite(apiId) && apiId > 0) {
      void notificationsApi.markAsRead(apiId)
        .catch(() => {
          markMessageAsRead(id);
        })
        .finally(() => {
          refreshNotifications();
        });
      return;
    }

    markMessageAsRead(id);
    refreshNotifications();
  };

  const markAllRead = () => {
    if (!hasApiIdentity) {
      markAllMessagesAsRead();
      refreshNotifications();
      return;
    }

    void notificationsApi.markAllAsRead()
      .catch(() => {
        // Keep local behavior available when API is unavailable.
      })
      .finally(() => {
        markAllMessagesAsRead();
        refreshNotifications();
      });
  };

  // --- UI Helpers ---
  const getIcon = (type: NotificationType) => {
    switch(type) {
      case 'success': return <CheckCircle size={18} />;
      case 'error': return <AlertCircle size={18} />;
      case 'warning': return <AlertCircle size={18} />;
      default: return <Info size={18} />;
    }
  };

  const getStyles = (type: NotificationType) => {
    switch(type) {
      case 'success': 
        return {
          bg: 'bg-white',
          border: 'border-r-4 border-r-green-600 border border-slate-200',
          icon: 'text-green-600',
          text: 'text-slate-800',
        };
      case 'error': 
        return {
          bg: 'bg-white',
          border: 'border-r-4 border-r-red-600 border border-slate-200',
          icon: 'text-red-600',
          text: 'text-slate-800',
        };
      case 'warning': 
        return {
          bg: 'bg-white',
          border: 'border-r-4 border-r-amber-500 border border-slate-200',
          icon: 'text-amber-500',
          text: 'text-slate-800',
        };
      default: 
        return {
          bg: 'bg-white',
          border: 'border-r-4 border-r-blue-600 border border-slate-200',
          icon: 'text-blue-600',
          text: 'text-slate-800',
        };
    }
  };

  return (
    <NotificationContext.Provider value={{ 
        notify, 
        systemNotifications, 
        unreadCount, 
        refreshNotifications,
        markAsRead,
        markAllRead
    }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-[min(92vw,380px)] pointer-events-none">
        {notifications.map(n => {
          const styles = getStyles(n.type);
          return (
            <div 
              key={n.id}
              className={`${styles.bg} ${styles.border} px-4 py-3 rounded-lg shadow-lg flex items-start justify-between pointer-events-auto transition-all duration-300 animate-in slide-in-from-top-2`}
            >
              <div className="flex items-start gap-3">
                <span className={`${styles.icon} mt-0.5`}>{getIcon(n.type)}</span>
                <span className={`${styles.text} text-sm font-medium whitespace-pre-wrap`}>{n.message}</span>
              </div>
              <button onClick={() => removeNotification(n.id)} className="text-slate-400 hover:text-slate-600 p-1 mr-1 flex-shrink-0">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};
