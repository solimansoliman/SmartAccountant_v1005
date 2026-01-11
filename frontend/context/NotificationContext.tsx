
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Notification, NotificationType, SystemMessage } from '../types';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { getUserMessages, markMessageAsRead, markAllMessagesAsRead } from '../services/storageService';

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
  
  // System Messages State
  const [systemNotifications, setSystemNotifications] = useState<SystemMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // --- Transient Toast Logic ---
  const notify = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    console.log('🔔 Notification:', type, message); // Debug log
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // إطالة مدة عرض رسائل الخطأ والتحذير
    const duration = type === 'error' ? 8000 : type === 'warning' ? 6000 : 4000;
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // --- Persistent System Notifications Logic ---
  const refreshNotifications = useCallback(() => {
    const msgs = getUserMessages();
    // Sort by date desc
    msgs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setSystemNotifications(msgs);
    setUnreadCount(msgs.filter(m => !m.isRead).length);
  }, []);

  // Poll for new messages every 30 seconds
  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 30000); 
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const markAsRead = (id: string) => {
    markMessageAsRead(id);
    refreshNotifications();
  };

  const markAllRead = () => {
    markAllMessagesAsRead();
    refreshNotifications();
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
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col gap-3 w-full max-w-md px-4 pointer-events-none">
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
