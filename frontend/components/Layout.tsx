
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, ShoppingCart, BarChart3, Menu, X, Wallet, Database, Package, Wifi, WifiOff, RefreshCw, LogOut, User as UserIcon, PlayCircle, AlertTriangle, Sparkles, Lock, Settings, Moon, Sun, Shield, Bell, CheckCheck, Mail, Server, Loader2, Upload, Image as ImageIcon, Trash2, Building, Clock, Check, Circle, Crown, Search, Command, Keyboard, ChevronsLeft, ChevronsRight, ArrowUp, ChevronDown } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { profileApi, accountApi, AccountUsageDto } from '../services/adminApi';
import { checkApiConnection, messagesApi } from '../services/apiService';
import { useSettings } from '../context/SettingsContext';
import { formatDateTime, formatDate } from '../services/dateService';
import { useMenuPermissions, useButtonPermissions } from '../services/permissionsHooks';
import GlobalSearch from './GlobalSearch';
import ShortcutsModal from './ShortcutsModal';
import { useKeyboardShortcuts, shortcutEvents } from '../services/keyboardShortcuts';

// Sync Items List
const SYNC_ITEMS = [
  { id: 'products', label: 'المنتجات', icon: Package },
  { id: 'customers', label: 'العملاء', icon: Users },
  { id: 'invoices', label: 'الفواتير', icon: FileText },
  { id: 'expenses', label: 'المصروفات', icon: ShoppingCart },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
];

const AUTO_REFRESH_SCROLL_IDLE_MS = 3000;

const Layout: React.FC = () => {
  const { notify, unreadCount, systemNotifications, markAsRead, markAllRead, refreshNotifications } = useNotification();
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode, autoSync, permissions, syncDuration, autoRefreshEnabled, autoRefreshInterval } = useSettings();
  const menuPerms = useMenuPermissions();
  const showSyncPopup = (permissions as any)?.showSyncPopup !== false; // Default to true
  const refreshDuration = (permissions as any)?.refreshDuration ?? 1000; // Default 1 second
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('layout_desktop_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [currentSyncItem, setCurrentSyncItem] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const scrollMetaRafRef = useRef<number | null>(null);
  const lastScrollActivityAtRef = useRef(0);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [remainingScrollPx, setRemainingScrollPx] = useState(0);

  // Auto Refresh Countdown State
  const [refreshCountdown, setRefreshCountdown] = useState(autoRefreshInterval || 30);
  
  // Refresh State (Manual)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [currentRefreshItem, setCurrentRefreshItem] = useState(0);
  
  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', companyName: '', password: '', logoUrl: '' });

  // State to track if popup should be shown for current refresh
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  // State to track if popup should be shown for current sync
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Global Search & Shortcuts Modal State
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Collapsible sidebar tools section
  const [sidebarToolsOpen, setSidebarToolsOpen] = useState(false);
  const [isAccountCardExpanded, setIsAccountCardExpanded] = useState(true);
  const [sidebarMenuSearch, setSidebarMenuSearch] = useState('');

  // Account Usage State for Plan Card
  const [accountUsage, setAccountUsage] = useState<AccountUsageDto | null>(null);

  // Helper function to check showRefreshPopup from localStorage directly
  // يجب استخدام نفس المفتاح المستخدم في storageService: app_system_config_global
  const getShowRefreshPopup = (): boolean => {
    try {
      const data = localStorage.getItem('app_system_config_global');
      if (data) {
        const parsed = JSON.parse(data);
        const value = parsed.showRefreshPopup === true || parsed.showRefreshPopup === 'true';
        console.log('[getShowRefreshPopup] Value:', value, 'Raw:', parsed.showRefreshPopup);
        return value;
      }
    } catch (e) {
      console.error('Error reading showRefreshPopup:', e);
    }
    return false; // Default to false
  };

  // Helper function to check showSyncPopup from localStorage directly
  const getShowSyncPopup = (): boolean => {
    try {
      const data = localStorage.getItem('app_system_config_global');
      if (data) {
        const parsed = JSON.parse(data);
        // Default to true if not set
        const value = parsed.showSyncPopup !== false && parsed.showSyncPopup !== 'false';
        console.log('[getShowSyncPopup] Value:', value, 'Raw:', parsed.showSyncPopup);
        return value;
      }
    } catch (e) {
      console.error('Error reading showSyncPopup:', e);
    }
    return true; // Default to true
  };

  // Reference to track if refresh is in progress
  const isRefreshingRef = useRef(false);

  // Auto refresh should run only on Dashboard route.
  const isDashboardRoute = location.pathname === '/' || location.pathname === '/dashboard';
  const isAutoRefreshRunning = autoRefreshEnabled && autoRefreshInterval > 0 && isOnline && isApiConnected && isDashboardRoute;
  const isCompactDesktopSidebar = isDesktopSidebarCollapsed;
  const hasRefreshQuickAction = isOnline && isApiConnected;
  const hasSyncQuickAction = permissions.showDataSync;
  const hasQuickActions = hasRefreshQuickAction || hasSyncQuickAction;
  const autoRefreshProgress = isAutoRefreshRunning && autoRefreshInterval > 0
    ? Math.min(100, Math.max(0, ((autoRefreshInterval - refreshCountdown) / autoRefreshInterval) * 100))
    : 0;

  const refreshUnreadMessagesCount = useCallback(async () => {
    try {
      const rawCount = await messagesApi.getUnreadCount();
      const normalized = typeof rawCount === 'number'
        ? rawCount
        : Number((rawCount as any)?.unreadCount ?? (rawCount as any)?.count ?? 0);
      setUnreadMessagesCount(Number.isFinite(normalized) && normalized > 0 ? normalized : 0);
    } catch {
      // Keep last known count on transient failures.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('layout_desktop_sidebar_collapsed', String(isDesktopSidebarCollapsed));
    } catch {
      // Ignore localStorage failures.
    }
  }, [isDesktopSidebarCollapsed]);

  useEffect(() => {
    // Prevent hidden filtering when compact mode hides the sidebar search input.
    if (isCompactDesktopSidebar && sidebarMenuSearch) {
      setSidebarMenuSearch('');
    }
  }, [isCompactDesktopSidebar, sidebarMenuSearch]);

  // Avoid disruptive auto refresh while user is typing or interacting with overlay UIs.
  const isUserInteracting = useCallback((): boolean => {
    if (document.hidden) return true;

    const recentlyScrolled = Date.now() - lastScrollActivityAtRef.current < AUTO_REFRESH_SCROLL_IDLE_MS;
    if (recentlyScrolled) return true;

    const activeElement = document.activeElement as HTMLElement | null;
    if (activeElement) {
      const tag = activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || activeElement.isContentEditable) {
        return true;
      }
    }

    return showProfileModal || showLogoutConfirm || showGlobalSearch || showShortcutsModal || showNotifications;
  }, [showProfileModal, showLogoutConfirm, showGlobalSearch, showShortcutsModal, showNotifications]);

  // Refresh handler (manual + auto).
  const handleRefresh = (isAuto: boolean = false) => {
    // منع الاستدعاء المتكرر باستخدام ref
    if (isRefreshingRef.current) {
      console.log('[handleRefresh] Blocked - already refreshing');
      return;
    }
    
    if (!isOnline) {
      notify('لا يوجد اتصال بالإنترنت', 'error');
      return;
    }
    
    // Keep auto refresh silent to avoid noisy UX.
    const shouldShowPopup = isAuto ? false : getShowRefreshPopup();
    console.log('[handleRefresh] Starting refresh, shouldShowPopup:', shouldShowPopup, 'isAuto:', isAuto);
    
    // تعيين الفلاج فوراً
    isRefreshingRef.current = true;
    if (!isAuto) {
      setIsRefreshing(true);
      setRefreshProgress(0);
      setCurrentRefreshItem(0);
      setShowRefreshModal(shouldShowPopup);
    } else {
      setShowRefreshModal(false);
    }
    
    // إرسال حدث مخصص لإعادة تحميل البيانات في الصفحات
    window.dispatchEvent(new CustomEvent('autoRefreshData', {
      detail: { silent: isAuto },
    }));
    
    // إذا كانت النافذة لا تظهر، أنهِ التحديث فوراً بدون animation
    if (!shouldShowPopup) {
      setTimeout(() => {
        isRefreshingRef.current = false;
        if (!isAuto) {
          setIsRefreshing(false);
          setRefreshProgress(0);
          setCurrentRefreshItem(0);
          setShowRefreshModal(false);
        }
        if (!isAuto) {
          notify('تم تحديث البيانات بنجاح', 'success');
        }
        console.log('[handleRefresh] Finished (no popup)');
      }, 300);
      return;
    }
    
    // Animate progress bar - use refreshDuration from settings
    const duration = refreshDuration || 1000;
    const progressInterval = 50;
    const steps = duration / progressInterval;
    let currentStep = 0;
    
    const animateProgress = setInterval(() => {
      currentStep++;
      const progress = Math.min((currentStep / steps) * 100, 100);
      setRefreshProgress(progress);
      
      // Update current refresh item based on progress
      const itemIndex = Math.min(Math.floor((progress / 100) * SYNC_ITEMS.length), SYNC_ITEMS.length - 1);
      setCurrentRefreshItem(itemIndex);
      
      if (currentStep >= steps) {
        clearInterval(animateProgress);
        // Small delay before closing to show completion
        setTimeout(() => {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
          setRefreshProgress(0);
          setCurrentRefreshItem(0);
          setShowRefreshModal(false);
          if (!isAuto) {
            notify('تم تحديث البيانات بنجاح', 'success');
          }
          console.log('[handleRefresh] Finished (with popup)');
        }, 300);
      }
    }, progressInterval);
  };

  // Auto Refresh Timer (Dashboard only)
  useEffect(() => {
    if (!isAutoRefreshRunning) {
      setRefreshCountdown(autoRefreshInterval > 0 ? autoRefreshInterval : 30);
      return;
    }

    const interval = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          if (isUserInteracting()) {
            return Math.min(5, autoRefreshInterval > 0 ? autoRefreshInterval : 5);
          }

          setTimeout(() => handleRefresh(true), 0);
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoRefreshRunning, autoRefreshInterval, isUserInteracting]);

  // Reset countdown when interval changes
  useEffect(() => {
    setRefreshCountdown(autoRefreshInterval > 0 ? autoRefreshInterval : 30);
  }, [autoRefreshInterval]);

  // Check API Connection
  useEffect(() => {
    const checkApi = async () => {
      const connected = await checkApiConnection();
      setIsApiConnected(connected);
    };
    checkApi();
    // Check every 30 seconds
    const interval = setInterval(checkApi, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!menuPerms.canShowMessages) {
      setUnreadMessagesCount(0);
      return;
    }

    refreshUnreadMessagesCount();

    const interval = window.setInterval(refreshUnreadMessagesCount, 30000);
    const handleFocus = () => refreshUnreadMessagesCount();
    const handleUnreadRefresh = () => refreshUnreadMessagesCount();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('messages:refresh-unread', handleUnreadRefresh as EventListener);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('messages:refresh-unread', handleUnreadRefresh as EventListener);
    };
  }, [menuPerms.canShowMessages, refreshUnreadMessagesCount]);

  // Load Account Usage for Plan Card
  useEffect(() => {
    const loadAccountUsage = async () => {
      if (user?.accountId) {
        try {
          const usage = await accountApi.getUsage(user.accountId);
          setAccountUsage(usage);
        } catch (error: any) {
          // تجاهل أخطاء الصلاحيات والأخطاء 500
          if (error?.status === 403 || error?.status === 401 || error?.status === 500) {
            console.log('Cannot load account usage - user may not have permissions or API error occurred');
            // لا تعيّن الاستخدام - اترك القيمة الافتراضية فارغة
          } else {
            console.error('Error loading account usage:', error);
          }
        }
      }
    };
    loadAccountUsage();
  }, [user?.accountId]);

  // Close notifications when clicking outside (Desktop only)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const clickedTarget = event.target as Node;
      const clickedInsideTrigger = notifDropdownRef.current?.contains(clickedTarget);
      const clickedInsidePanel = notifPanelRef.current?.contains(clickedTarget);

      if (!clickedInsideTrigger && !clickedInsidePanel) {
        // Only close if it's the dropdown (desktop). 
        // Mobile uses a modal overlay which handles its own close.
        if (window.innerWidth >= 768) {
            setShowNotifications(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keep notification panel behavior consistent with other menus on route change.
  useEffect(() => {
    setShowNotifications(false);
  }, [location.pathname]);

  // Auto Sync Logic
  useEffect(() => {
    let syncInterval: ReturnType<typeof setInterval>;

    if (autoSync && isOnline) {
      // Simulate periodic sync
      syncInterval = setInterval(() => {
        if (!isSyncing) {
          setIsSyncing(true);
          setTimeout(() => {
            setIsSyncing(false);
            // Silent sync
          }, 1000);
        }
      }, 30000); // Every 30 seconds
    }

    return () => clearInterval(syncInterval);
  }, [autoSync, isOnline]);

  useEffect(() => {
    const handleOnline = () => {
        setIsOnline(true);
        notify('تم استعادة الاتصال بالإنترنت - المزامنة نشطة', 'success');
    };
    const handleOffline = () => {
        setIsOnline(false);
        notify('انقطع الاتصال - يعمل التطبيق في الوضع المحلي', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [notify]);

  const updateScrollMeta = useCallback(() => {
    const element = contentScrollRef.current;
    if (!element) return;

    const maxScrollable = Math.max(element.scrollHeight - element.clientHeight, 0);
    const currentScroll = Math.max(element.scrollTop, 0);
    const remainingPx = Math.max(0, Math.ceil(maxScrollable - currentScroll));

    if (maxScrollable <= 0) {
      setShowScrollTopButton(false);
      setScrollProgress(0);
      setRemainingScrollPx(0);
      return;
    }

    const progress = Math.min(100, Math.max(0, Number(((currentScroll / maxScrollable) * 100).toFixed(2))));
    setScrollProgress(progress);
    setRemainingScrollPx(remainingPx);
    setShowScrollTopButton(currentScroll > 120);
  }, []);

  const scheduleScrollMetaUpdate = useCallback(() => {
    if (scrollMetaRafRef.current !== null) {
      return;
    }

    scrollMetaRafRef.current = window.requestAnimationFrame(() => {
      scrollMetaRafRef.current = null;
      updateScrollMeta();
    });
  }, [updateScrollMeta]);

  useEffect(() => {
    const element = contentScrollRef.current;
    if (!element) return;

    const handleScroll = () => {
      lastScrollActivityAtRef.current = Date.now();
      scheduleScrollMetaUpdate();
    };
    const resizeObserver = new ResizeObserver(() => scheduleScrollMetaUpdate());

    element.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    resizeObserver.observe(element);
    scheduleScrollMetaUpdate();

    return () => {
      element.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      resizeObserver.disconnect();
      if (scrollMetaRafRef.current !== null) {
        window.cancelAnimationFrame(scrollMetaRafRef.current);
        scrollMetaRafRef.current = null;
      }
    };
  }, [scheduleScrollMetaUpdate]);

  useEffect(() => {
    const timer = window.setTimeout(() => scheduleScrollMetaUpdate(), 120);
    return () => window.clearTimeout(timer);
  }, [location.pathname, scheduleScrollMetaUpdate]);

  const scrollToTop = () => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openNotificationsScreen = useCallback(() => {
    refreshNotifications();
    setShowNotifications(false);
    navigate('/notifications');
  }, [navigate, refreshNotifications]);

  const openMessagesScreen = useCallback(() => {
    setShowNotifications(false);
    navigate('/messages');
  }, [navigate]);

  useEffect(() => {
      if (user && showProfileModal) {
          setProfileForm({
              name: user.name,
              companyName: user.companyName,
              password: '',
              logoUrl: user.accountLogo || ''
          });
      }
  }, [user, showProfileModal]);

  const handleSync = () => {
    if (!isOnline) {
        notify('لا يوجد اتصال بالإنترنت', 'error');
        return;
    }
    
    // قراءة القيمة الحالية مباشرة من localStorage
    const shouldShowPopup = getShowSyncPopup();
    console.log('[handleSync] Starting sync, shouldShowPopup:', shouldShowPopup);
    
    setIsSyncing(true);
    setSyncProgress(0);
    setCurrentSyncItem(0);
    setShowSyncModal(shouldShowPopup);
    
    // إذا كانت النافذة لا تظهر، أنهِ المزامنة فوراً بدون animation
    if (!shouldShowPopup) {
      setTimeout(() => {
        setIsSyncing(false);
        setSyncProgress(0);
        setCurrentSyncItem(0);
        setShowSyncModal(false);
        notify('تمت مزامنة البيانات بنجاح', 'success');
        console.log('[handleSync] Finished (no popup)');
      }, 300);
      return;
    }
    
    // Animate progress bar - use syncDuration from settings
    const duration = syncDuration || 1500;
    const interval = 50;
    const steps = duration / interval;
    let currentStep = 0;
    
    const progressInterval = setInterval(() => {
      currentStep++;
      const progress = Math.min((currentStep / steps) * 100, 100);
      setSyncProgress(progress);
      
      // Update current sync item based on progress
      const itemIndex = Math.min(Math.floor((progress / 100) * SYNC_ITEMS.length), SYNC_ITEMS.length - 1);
      setCurrentSyncItem(itemIndex);
      
      if (currentStep >= steps) {
        clearInterval(progressInterval);
        // Small delay before closing to show completion
        setTimeout(() => {
          setIsSyncing(false);
          setSyncProgress(0);
          setCurrentSyncItem(0);
          setShowSyncModal(false);
          notify('تمت مزامنة البيانات مع قاعدة البيانات بنجاح', 'success');
          console.log('[handleSync] Finished (with popup)');
        }, 300);
      }
    }, interval);
  };

  const handleLogoutClick = () => {
      setShowLogoutConfirm(true);
  };

  const performLogout = () => {
      setShowLogoutConfirm(false);
      logout();
      navigate('/login', { replace: true });
      notify('تم تسجيل الخروج بنجاح', 'info');
  };

  const [updatingProfile, setUpdatingProfile] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (user && profileForm.password && profileForm.password.length < 6) {
          notify('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'warning');
          return;
      }
      
      if (user) {
          setUpdatingProfile(true);
          try {
            // تحديث بيانات المستخدم
            await profileApi.update(Number(user.id), {
                fullName: profileForm.name,
                password: profileForm.password || undefined
            });
            
            // تحديث شعار الحساب إذا تغير
            if (user.accountId && profileForm.logoUrl !== user.accountLogo) {
                await accountApi.updateLogo(user.accountId, profileForm.logoUrl || '');
            }
            
            notify('تم تحديث بيانات الملف الشخصي بنجاح', 'success');
            setShowProfileModal(false);
            
            // إعادة تحميل الصفحة لتحديث الشعار
            if (profileForm.logoUrl !== user.accountLogo) {
              window.location.reload();
            }
          } catch (err: any) {
            notify(err.message || 'حدث خطأ أثناء التحديث', 'error');
          } finally {
            setUpdatingProfile(false);
          }
      }
  };

  // Handle logo file upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // التحقق من حجم الملف (حد أقصى 500KB)
    if (file.size > 500 * 1024) {
      notify('حجم الملف كبير جداً! الحد الأقصى 500KB', 'error');
      return;
    }
    
    // تحويل إلى Base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setProfileForm({ ...profileForm, logoUrl: base64 });
    };
    reader.readAsDataURL(file);
  };

  // Keyboard Shortcuts Handler
  const handleShortcutAction = useCallback((action: string) => {
    console.log('[Layout] Shortcut action:', action);
    
    switch (action) {
      // Navigation
      case 'navigate-home':
        navigate('/');
        break;
      case 'navigate-products':
        navigate('/products');
        break;
      case 'navigate-customers':
        navigate('/customers');
        break;
      case 'navigate-invoices':
        navigate('/invoices');
        break;
      case 'navigate-expenses':
        navigate('/expenses');
        break;
      case 'navigate-reports':
        navigate('/reports');
        break;
      case 'navigate-settings':
        navigate('/settings');
        break;
      case 'navigate-notifications':
        navigate('/notifications');
        break;
      case 'navigate-messages':
        navigate('/messages');
        break;
      
      // UI Actions
      case 'global-search':
        setShowGlobalSearch(true);
        break;
      case 'show-shortcuts':
        setShowShortcutsModal(true);
        break;
      case 'toggle-dark-mode':
        toggleDarkMode();
        break;
      case 'toggle-sidebar':
        setSidebarOpen(prev => !prev);
        break;
      case 'close-modal':
        // Close any open modal
        setShowGlobalSearch(false);
        setShowShortcutsModal(false);
        setShowProfileModal(false);
        setShowLogoutConfirm(false);
        setShowNotifications(false);
        break;
      
      // Actions
      case 'search':
        // Open search in current page (emit event)
        window.dispatchEvent(new CustomEvent('shortcut:search'));
        break;
      case 'new-item':
        // Create new item (emit event)
        window.dispatchEvent(new CustomEvent('shortcut:new'));
        break;
      case 'save':
        // Save current item (emit event)
        window.dispatchEvent(new CustomEvent('shortcut:save'));
        break;
      case 'refresh':
        handleRefresh(false);
        break;
      case 'print':
        window.print();
        break;
      
      default:
        console.log('[Layout] Unknown shortcut action:', action);
    }
  }, [navigate, toggleDarkMode, handleRefresh]);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts(handleShortcutAction);

  // Navigation Logic with Permissions
  const isAdmin = user?.role === 'sys_admin';
  const accountRoleNames = user?.roleNames && user.roleNames.length > 0
    ? user.roleNames
    : [isAdmin ? 'Admin' : 'User'];
  const accountGroupLabel = isAdmin
    ? 'مجموعة الإدارة'
    : user?.parentId
      ? 'مجموعة الموظفين'
      : 'مجموعة الحسابات';
  const accountUsername = user?.username || user?.email || '-';

  type NavSectionKey = 'main' | 'operations' | 'analytics' | 'communication' | 'system';
  type NavItem = {
    to: string;
    label: string;
    icon: React.ReactElement;
    section: NavSectionKey;
    visible: boolean;
    order: number;
  };

  const navItems: NavItem[] = [
    { 
        to: '/', 
        label: 'الرئيسية', 
        icon: <LayoutDashboard size={20} />, 
      section: 'main',
        visible: permissions.showDashboard && menuPerms.canShowDashboard,
      order: 1,
    },
    { 
        to: '/products', 
        label: 'المنتجات', 
        icon: <Package size={20} />, 
      section: 'operations',
        visible: permissions.showInventoryModule && menuPerms.canShowProducts && (isAdmin || user?.permissions?.canManageProducts !== false),
      order: 1,
    },
    { 
        to: '/customers', 
        label: 'العملاء', 
        icon: <Users size={20} />, 
      section: 'operations',
        visible: permissions.showCustomersModule && menuPerms.canShowCustomers && (isAdmin || user?.permissions?.canManageCustomers !== false),
      order: 2,
    },
    { 
        to: '/invoices', 
        label: 'الفواتير', 
        icon: <FileText size={20} />, 
      section: 'operations',
        visible: permissions.showInvoicesModule && menuPerms.canShowInvoices && (isAdmin || user?.permissions?.canCreateInvoices !== false),
      order: 3,
    },
    { 
        to: '/expenses', 
        label: 'مصروفات وإيرادات', 
        icon: <ShoppingCart size={20} />, 
      section: 'operations',
        visible: permissions.showExpensesModule && menuPerms.canShowExpenses && (isAdmin || user?.permissions?.canManageExpenses !== false),
      order: 4,
    },
    { 
        to: '/reports', 
        label: 'التقارير', 
        icon: <BarChart3 size={20} />, 
      section: 'analytics',
        visible: permissions.showReportsModule && menuPerms.canShowReports && (isAdmin || user?.permissions?.canViewReports !== false),
      order: 1,
    },
    { 
        to: '/notifications', 
        label: 'الإشعارات', 
        icon: <Bell size={20} />, 
      section: 'communication',
        visible: menuPerms.canShowNotifications,
      order: 1,
    },
    { 
        to: '/messages', 
        label: 'الرسائل', 
        icon: <Mail size={20} />, 
      section: 'communication',
        visible: menuPerms.canShowMessages,
      order: 2,
    },
    { 
        to: '/plans', 
        label: 'خطط الاشتراك', 
        icon: <Crown size={20} />, 
      section: 'system',
        visible: menuPerms.canShowPlans,
      order: 1,
    },
    { 
        to: '/settings', 
        label: 'الإعدادات', 
        icon: <Settings size={20} />, 
      section: 'system',
        visible: (permissions.showSettingsModule || isAdmin) && menuPerms.canShowSettings && (isAdmin || user?.permissions?.canManageSettings !== false),
      order: 2,
    },
  ];

  const sectionOrderMap: Record<NavSectionKey, number> = {
    main: 1,
    operations: 2,
    analytics: 3,
    communication: 4,
    system: 5,
  };

  const effectiveSidebarMenuSearch = isCompactDesktopSidebar ? '' : sidebarMenuSearch;
  const normalizedSidebarSearch = effectiveSidebarMenuSearch.trim().toLowerCase();
  const visibleNavItems = navItems.filter(item => item.visible);
  const filteredNavItems = visibleNavItems.filter(item => {
    if (!normalizedSidebarSearch) return true;
    return item.label.toLowerCase().includes(normalizedSidebarSearch);
  });

  const sortedNavItems = [...filteredNavItems].sort((a, b) => {
    const sectionDiff = sectionOrderMap[a.section] - sectionOrderMap[b.section];
    if (sectionDiff !== 0) return sectionDiff;
    return a.order - b.order;
  });

  // Reusable Notification Content
  const NotificationContent = () => (
      <div className="flex flex-col h-full">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
              <h4 className="text-sm font-bold text-slate-700 dark:text-white">الإشعارات</h4>
              {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:text-blue-700 flex items-center gap-1">
                      <CheckCheck size={12}/> تحديد الكل كمقروء
                  </button>
              )}
          </div>
          <div className="overflow-y-auto flex-1 max-h-[300px] md:max-h-64 custom-scrollbar">
              {systemNotifications.length > 0 ? (
                  systemNotifications.map(msg => (
                      <div 
                        key={msg.id} 
                        onClick={() => !msg.isRead && markAsRead(msg.id)}
                        className={`p-3 border-b border-slate-50 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors ${!msg.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                      >
                          <div className="flex justify-between items-start mb-1">
                              <span className={`text-xs font-bold ${!msg.isRead ? 'text-primary dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>{msg.title}</span>
                              {!msg.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-300 line-clamp-2">{msg.content}</p>
                          <div className="mt-2 flex justify-between items-center">
                              <span className="text-[10px] text-slate-400">{formatDate(msg.date)}</span>
                              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{msg.sender}</span>
                          </div>
                      </div>
                  ))
              ) : (
                  <div className="p-6 text-center text-slate-400 flex flex-col items-center">
                      <Bell size={24} className="mb-2 opacity-50"/>
                      <span className="text-xs">لا توجد إشعارات جديدة</span>
                  </div>
              )}
          </div>
      </div>
  );

  return (
    <div className={`flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 overflow-hidden print:bg-white print:h-auto`}>
      
      {/* Mobile Notification Modal */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-[110] flex items-start justify-center pt-20 px-4 bg-black/50 animate-in fade-in md:hidden"
          onClick={() => setShowNotifications(false)}
        >
            <div
              ref={notifPanelRef}
              className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4"
              onClick={e => e.stopPropagation()}
            >
                <NotificationContent />
                <div className="p-2 border-t border-slate-100 dark:border-slate-700 text-center">
                    <button onClick={() => setShowNotifications(false)} className="text-sm text-slate-500 py-2 w-full hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg">إغلاق</button>
                </div>
            </div>
        </div>
      )}

      {/* Sync Progress Modal - Only show if showSyncModal is true */}
      {isSyncing && showSyncModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white/95 dark:bg-slate-800/95 p-6 rounded-2xl shadow-2xl w-full max-w-xs animate-in zoom-in-95 duration-200 border border-slate-200/50 dark:border-slate-700/50">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                <RefreshCw size={22} className="text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">جاري المزامنة</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{Math.round(syncProgress)}% مكتمل</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-5">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-100 ease-linear rounded-full"
                style={{ width: `${syncProgress}%` }}
              />
            </div>

            {/* Sync Items List */}
            <div className="space-y-2">
              {SYNC_ITEMS.map((item, index) => {
                const Icon = item.icon;
                const isCompleted = index < currentSyncItem;
                const isCurrent = index === currentSyncItem;
                const isPending = index > currentSyncItem;
                
                return (
                  <div 
                    key={item.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 ${
                      isCurrent 
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800' 
                        : isCompleted 
                          ? 'bg-green-50 dark:bg-green-900/20' 
                          : 'bg-slate-50 dark:bg-slate-700/50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-full transition-colors ${
                      isCurrent 
                        ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300' 
                        : isCompleted 
                          ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300' 
                          : 'bg-slate-100 dark:bg-slate-600 text-slate-400'
                    }`}>
                      {isCompleted ? (
                        <Check size={14} />
                      ) : isCurrent ? (
                        <Icon size={14} className="animate-pulse" />
                      ) : (
                        <Circle size={14} />
                      )}
                    </div>
                    <span className={`text-sm font-medium transition-colors ${
                      isCurrent 
                        ? 'text-blue-700 dark:text-blue-300' 
                        : isCompleted 
                          ? 'text-green-700 dark:text-green-300' 
                          : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {item.label}
                    </span>
                    {isCurrent && (
                      <div className="mr-auto">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {isCompleted && (
                      <span className="mr-auto text-xs text-green-600 dark:text-green-400">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Refresh Progress Modal - Only show if showRefreshModal is true */}
      {isRefreshing && showRefreshModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white/95 dark:bg-slate-800/95 p-6 rounded-2xl shadow-2xl w-full max-w-xs animate-in zoom-in-95 duration-200 border border-emerald-200/50 dark:border-emerald-700/50">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                <RefreshCw size={22} className="text-emerald-600 dark:text-emerald-400 animate-spin" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">جاري التحديث</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{Math.round(refreshProgress)}% مكتمل</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-5">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-100 ease-linear rounded-full"
                style={{ width: `${refreshProgress}%` }}
              />
            </div>

            {/* Refresh Items List */}
            <div className="space-y-2">
              {SYNC_ITEMS.map((item, index) => {
                const Icon = item.icon;
                const isCompleted = index < currentRefreshItem;
                const isCurrent = index === currentRefreshItem;
                
                return (
                  <div 
                    key={item.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 ${
                      isCurrent 
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800' 
                        : isCompleted 
                          ? 'bg-green-50 dark:bg-green-900/20' 
                          : 'bg-slate-50 dark:bg-slate-700/50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-full transition-colors ${
                      isCurrent 
                        ? 'bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300' 
                        : isCompleted 
                          ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300' 
                          : 'bg-slate-100 dark:bg-slate-600 text-slate-400'
                    }`}>
                      {isCompleted ? (
                        <Check size={14} />
                      ) : isCurrent ? (
                        <Icon size={14} className="animate-pulse" />
                      ) : (
                        <Circle size={14} />
                      )}
                    </div>
                    <span className={`text-sm font-medium transition-colors ${
                      isCurrent 
                        ? 'text-emerald-700 dark:text-emerald-300' 
                        : isCompleted 
                          ? 'text-green-700 dark:text-green-300' 
                          : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {item.label}
                    </span>
                    {isCurrent && (
                      <div className="mr-auto">
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {isCompleted && (
                      <span className="mr-auto text-xs text-green-600 dark:text-green-400">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
             <div className="flex items-center gap-3 text-rose-600 mb-4">
                <div className="bg-rose-100 dark:bg-rose-900/50 p-2 rounded-full"><LogOut size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">تسجيل الخروج</h3>
             </div>
             <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">
                 هل أنت متأكد من رغبتك في تسجيل الخروج من النظام؟
             </p>
             <div className="flex gap-3">
                 <button onClick={performLogout} className="flex-1 bg-rose-600 text-white py-2 rounded-lg font-bold hover:bg-rose-700 transition-colors">نعم، خروج</button>
                 <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">إلغاء</button>
             </div>
          </div>
        </div>
      )}

      {/* Profile Edit Modal - Enhanced Design */}
      {showProfileModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
             <div className="bg-white dark:bg-slate-800/95 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
                 {/* Header */}
                 <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                   <div className="flex justify-between items-center">
                     <div className="flex items-center gap-3">
                       <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                         <UserIcon size={22} className="text-blue-600 dark:text-blue-400"/>
                       </div>
                       <div>
                         <h3 className="font-bold text-lg text-blue-600 dark:text-blue-400">الملف الشخصي</h3>
                         <p className="text-slate-500 dark:text-slate-400 text-sm">تعديل بياناتك الشخصية</p>
                       </div>
                     </div>
                     <button 
                       onClick={() => setShowProfileModal(false)}
                       className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 hover:text-slate-700 transition-all"
                     >
                       <X size={22}/>
                     </button>
                   </div>
                 </div>

                 <form onSubmit={handleUpdateProfile} className="p-6 space-y-5">
                     {/* قسم شعار الحساب */}
                     <div className="flex flex-col items-center gap-4 pb-5 border-b border-slate-200 dark:border-slate-700">
                         <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                             <Building size={16} className="text-purple-500" />
                             شعار الحساب
                         </label>
                         <div className="relative group">
                             <div className="w-24 h-24 rounded-2xl overflow-hidden border-3 border-slate-200 dark:border-slate-600 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shadow-lg">
                                 {profileForm.logoUrl ? (
                                     <img 
                                         src={profileForm.logoUrl} 
                                         alt="شعار الحساب"
                                         className="w-full h-full object-cover"
                                         onError={(e) => {
                                             (e.target as HTMLImageElement).style.display = 'none';
                                         }}
                                     />
                                 ) : (
                                     <div className="flex flex-col items-center gap-1 text-slate-400">
                                         <Building size={32} />
                                     </div>
                                 )}
                             </div>
                             {/* زر تغيير الشعار */}
                             <input
                                 type="file"
                                 id="profile-logo-upload"
                                 accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                                 className="hidden"
                                 onChange={handleLogoUpload}
                             />
                             <label
                                 htmlFor="profile-logo-upload"
                                 className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                             >
                                 <Upload size={20} className="text-white" />
                             </label>
                         </div>
                         <div className="flex gap-2 items-center">
                             <input
                                 type="url"
                                 placeholder="أو أدخل رابط URL..."
                                 value={profileForm.logoUrl?.startsWith('data:') ? '' : (profileForm.logoUrl || '')}
                                 onChange={(e) => setProfileForm({ ...profileForm, logoUrl: e.target.value })}
                                 className="px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-xs w-52 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                             />
                             {profileForm.logoUrl && (
                                 <button
                                     type="button"
                                     onClick={() => setProfileForm({ ...profileForm, logoUrl: '' })}
                                     className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                                     title="حذف الشعار"
                                 >
                                     <Trash2 size={16} />
                                 </button>
                             )}
                         </div>
                         <p className="text-xs text-slate-400">(PNG, JPG, SVG - حد أقصى 500KB)</p>
                     </div>

                     {/* الاسم الشخصي */}
                     <div className="group">
                         <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                           <UserIcon size={16} className="text-emerald-500" />
                           الاسم الشخصي
                         </label>
                         <div className="relative">
                           <input 
                             type="text" 
                             value={profileForm.name} 
                             onChange={e => setProfileForm({...profileForm, name: e.target.value})} 
                             className="w-full border-2 border-slate-200 dark:border-slate-600 p-3 pr-10 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                             placeholder="أدخل اسمك..."
                           />
                           <UserIcon size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                         </div>
                     </div>

                     {/* اسم الشركة */}
                     <div className="group">
                         <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                           <Building size={16} className="text-blue-500" />
                           اسم الشركة / المتجر
                         </label>
                         <div className="relative">
                           <input 
                             type="text" 
                             value={profileForm.companyName} 
                             onChange={e => setProfileForm({...profileForm, companyName: e.target.value})} 
                             className={`w-full border-2 border-slate-200 dark:border-slate-600 p-3 pr-10 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all ${user?.parentId ? 'opacity-60 cursor-not-allowed' : ''}`}
                             placeholder="اسم شركتك أو متجرك..."
                             disabled={!!user?.parentId}
                           />
                           <Building size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                         </div>
                         {user?.parentId && (
                           <p className="flex items-center gap-1.5 text-xs text-amber-500 mt-2">
                             <AlertTriangle size={12} />
                             لا يمكن تغيير اسم الشركة للموظفين
                           </p>
                         )}
                     </div>

                     {/* كلمة المرور */}
                     <div className="group">
                         <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                           <Lock size={16} className="text-amber-500" />
                           تحديث كلمة المرور
                           <span className="text-slate-400 text-xs font-normal">(اختياري)</span>
                         </label>
                         <div className="relative">
                            <input 
                              type="text" 
                              value={profileForm.password} 
                              onChange={e => setProfileForm({...profileForm, password: e.target.value})} 
                              className="w-full border-2 border-slate-200 dark:border-slate-600 p-3 pr-10 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" 
                              placeholder="اتركه فارغاً إذا لم ترد تغييره"
                            />
                            <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                         </div>
                     </div>

                     {/* Action Buttons */}
                     <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                         <button 
                           type="submit" 
                           disabled={updatingProfile} 
                           className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                         >
                            {updatingProfile ? <Loader2 className="animate-spin" size={18}/> : <Check size={18}/>}
                            حفظ التغييرات
                         </button>
                         <button 
                           type="button" 
                           onClick={() => setShowProfileModal(false)} 
                           className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 font-semibold flex items-center justify-center gap-2 transition-all"
                         >
                           <X size={18}/>
                           إلغاء
                         </button>
                     </div>
                 </form>
             </div>
          </div>
      )}

      {/* Global Search Modal */}
      <GlobalSearch 
        isOpen={showGlobalSearch} 
        onClose={() => setShowGlobalSearch(false)} 
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal 
        isOpen={showShortcutsModal} 
        onClose={() => setShowShortcutsModal(false)} 
      />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden print:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed md:static inset-y-0 right-0 z-30 w-[280px] ${isCompactDesktopSidebar ? 'md:w-20' : 'md:w-64'} bg-white dark:bg-gradient-to-b dark:from-slate-800 dark:to-slate-900 shadow-xl md:shadow-lg transform transition-[width,transform] duration-300 ease-in-out print:hidden border-l border-slate-200 dark:border-slate-700 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}
      >
        <div className="h-full min-h-0 flex flex-col overflow-y-auto custom-scrollbar sidebar-scrollbar">
          {/* Brand & User Info & Connection Status (TOP) */}
          <div className={`shrink-0 p-4 ${isCompactDesktopSidebar ? 'md:p-3' : 'md:p-6'} border-b border-slate-200 dark:border-slate-700/50 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-850`}>
            <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className={`flex items-center text-primary dark:text-blue-300 ${isCompactDesktopSidebar ? 'md:justify-center md:w-full' : 'gap-2'}`}>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-600 p-1.5 md:p-2 rounded-lg md:rounded-xl text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20">
                        <Wallet size={18} />
                    </div>
                    <h1 className={`text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap ${isCompactDesktopSidebar ? 'md:hidden' : ''}`}>المحاسب الذكي</h1>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="hidden md:flex text-slate-500 dark:text-slate-300 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    onClick={() => setIsDesktopSidebarCollapsed(prev => !prev)}
                    title={isCompactDesktopSidebar ? 'فرد القائمة' : 'طي القائمة'}
                  >
                    {isCompactDesktopSidebar ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
                  </button>
                  <button className="md:hidden text-slate-500 dark:text-slate-400 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" onClick={() => setSidebarOpen(false)}>
                      <X size={22} />
                  </button>
                </div>
            </div>
            
            <div className="space-y-2.5 md:space-y-3">
              {!isCompactDesktopSidebar && (
                <p className="px-1 text-[10px] md:text-[11px] font-bold tracking-wide text-slate-400 dark:text-slate-500">
                  الحساب
                </p>
              )}

              {/* Logged In User Card */}
              {user && (
                <div
                  onClick={() => setShowProfileModal(true)}
                  className={`bg-white dark:bg-slate-700 border rounded-xl p-2 md:p-3 shadow-sm cursor-pointer hover:shadow-md transition-all group ${isCompactDesktopSidebar ? 'md:bg-transparent md:shadow-none md:border-slate-200/60 dark:md:border-slate-700/70' : ''} ${user.role === 'sys_admin' ? 'border-amber-400 ring-1 ring-amber-400/60' : 'border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500/70'}`}
                >
                  <div className={`flex items-center gap-2 md:gap-3 ${isCompactDesktopSidebar ? 'md:justify-center' : ''}`}>
                    {/* صورة/شعار الحساب */}
                    <div className="relative w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-600 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center group-hover:border-primary transition-colors shrink-0">
                      {user.accountLogo ? (
                        <img
                          src={user.accountLogo}
                          alt={user.companyName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`${user.accountLogo ? 'hidden' : ''} p-2 rounded-full transition-colors ${user.role === 'sys_admin' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 dark:bg-slate-600 text-primary dark:text-blue-300 group-hover:bg-blue-600 group-hover:text-white'}`}>
                        {user.role === 'sys_admin' ? <Shield size={16} /> : <UserIcon size={16} />}
                      </div>
                    </div>

                    <div className={`overflow-hidden flex-1 min-w-0 ${isCompactDesktopSidebar ? 'md:hidden' : ''}`}>
                      <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-white truncate">{user.companyName}</p>
                      <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                        {user.name}
                        {user.role === 'sys_admin' && <span className="text-amber-500 font-bold">(Admin)</span>}
                        {user.parentId && <span className="text-[9px] bg-slate-100 dark:bg-slate-600 px-1 rounded">موظف</span>}
                      </p>
                    </div>

                    <div className={`flex items-center gap-1 shrink-0 ${isCompactDesktopSidebar ? 'md:hidden' : ''}`}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowProfileModal(true);
                        }}
                        title="إدارة الحساب"
                        className="p-1 rounded-md text-slate-300 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                      >
                        <Settings size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsAccountCardExpanded(prev => !prev);
                        }}
                        title={isAccountCardExpanded ? 'طي التفاصيل' : 'فرد التفاصيل'}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                      >
                        <ChevronDown size={13} className={`transition-transform duration-200 ${isAccountCardExpanded ? 'rotate-0' : '-rotate-90'}`} />
                      </button>
                    </div>
                  </div>

                  {!isCompactDesktopSidebar && isAccountCardExpanded && (
                    <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-600/70 space-y-1.5 text-[10px] md:text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 dark:text-slate-400">الدور</span>
                        <div className="flex items-center flex-wrap justify-end gap-1">
                          {accountRoleNames.slice(0, 2).map((roleName, index) => (
                            <span
                              key={`${roleName}-${index}`}
                              className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium"
                            >
                              {roleName}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 dark:text-slate-400">المجموعة</span>
                        <span className="text-slate-700 dark:text-slate-200 font-medium truncate">{accountGroupLabel}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 dark:text-slate-400">اسم الحساب / الشركة</span>
                        <span className="text-slate-700 dark:text-slate-200 font-medium truncate max-w-[55%]">{user.companyName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 dark:text-slate-400">اسم المستخدم</span>
                        <span className="text-slate-700 dark:text-slate-200 font-medium truncate max-w-[55%]">{accountUsername}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Plan Usage Mini Card */}
              {accountUsage && (
                <NavLink
                  to="/plans"
                  onClick={() => setSidebarOpen(false)}
                  className={`block bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 p-2 md:p-2.5 rounded-xl border border-violet-200 dark:border-violet-700/50 hover:shadow-md transition-all group ${isCompactDesktopSidebar ? 'md:hidden' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Crown size={12} className="text-violet-600 dark:text-violet-400" />
                      <span className="text-[10px] md:text-xs font-bold text-violet-700 dark:text-violet-300">
                        {accountUsage.planName}
                      </span>
                    </div>
                    {accountUsage.daysRemaining <= 7 && accountUsage.daysRemaining > 0 && (
                      <span className="text-[8px] bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 px-1 py-0.5 rounded">
                        {accountUsage.daysRemaining}d
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-[8px] md:text-[9px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>الفواتير</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{accountUsage.currentMonthInvoices}/{accountUsage.maxInvoices === -1 ? '∞' : accountUsage.maxInvoices}</span>
                    </div>
                    <div className="text-[8px] md:text-[9px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>العملاء</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{accountUsage.currentCustomers}/{accountUsage.maxCustomers === -1 ? '∞' : accountUsage.maxCustomers}</span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        accountUsage.invoicesPercentage >= 90 ? 'bg-rose-500' :
                        accountUsage.invoicesPercentage >= 70 ? 'bg-amber-500' : 'bg-violet-500'
                      }`}
                      style={{ width: `${Math.min(accountUsage.invoicesPercentage, 100)}%` }}
                    />
                  </div>
                </NavLink>
              )}

              {/* ─── قسم قابل للطي: الإجراءات والأدوات ─── */}
              {!isCompactDesktopSidebar && (
                <button
                  onClick={() => setSidebarToolsOpen(prev => !prev)}
                  className="flex items-center justify-between w-full px-1 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
                >
                  <p className="text-[10px] md:text-[11px] font-bold tracking-wide text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    الإجراءات والأدوات
                  </p>
                  <ChevronDown size={11} className={`text-slate-400 transition-transform duration-200 ${sidebarToolsOpen ? 'rotate-0' : '-rotate-90'}`} />
                </button>
              )}

              {(sidebarToolsOpen || isCompactDesktopSidebar) && (
                <div className="space-y-1.5">

                {hasQuickActions && (
                  <div className="space-y-1.5">
                  <div className={`grid ${isCompactDesktopSidebar ? 'gap-1 justify-items-center grid-cols-1' : ((hasRefreshQuickAction && hasSyncQuickAction) ? 'gap-1.5 md:gap-2 grid-cols-2' : 'gap-1.5 md:gap-2 grid-cols-1')}`}>
                  {hasRefreshQuickAction && (
                    <button
                      onClick={() => handleRefresh(false)}
                      disabled={isRefreshing}
                      className={`relative h-8 md:h-9 rounded-lg border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-colors disabled:opacity-60 ${isCompactDesktopSidebar ? 'w-8 md:w-9' : ''}`}
                      title={isAutoRefreshRunning ? `تحديث تلقائي خلال ${refreshCountdown}ث` : 'تحديث يدوي للبيانات'}
                    >
                      <span className="flex items-center justify-center gap-1.5 text-[10px] md:text-[11px] font-semibold">
                        <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-cyan-500' : (isAutoRefreshRunning ? 'animate-pulse' : '')} />
                        <span className={isCompactDesktopSidebar ? 'md:hidden' : ''}>تحديث</span>
                      </span>
                      {isAutoRefreshRunning && !isRefreshing && (
                        <span className="absolute -top-1 -left-1 px-1 py-0.5 rounded-md bg-cyan-600 text-white text-[9px] leading-none tabular-nums">
                          {refreshCountdown}ث
                        </span>
                      )}
                    </button>
                  )}

                  {hasSyncQuickAction && (
                    <button
                      onClick={handleSync}
                      disabled={!isOnline || isSyncing}
                      className={`relative h-8 md:h-9 rounded-lg text-[10px] md:text-[11px] font-semibold transition-colors ${isCompactDesktopSidebar ? 'w-8 md:w-9' : ''} ${
                        isOnline
                          ? 'border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                      title={isSyncing ? `جاري المزامنة ${Math.round(syncProgress)}%` : 'مزامنة يدوية'}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <Database size={12} className={isSyncing ? 'animate-pulse text-indigo-500' : ''} />
                        <span className={isCompactDesktopSidebar ? 'md:hidden' : ''}>مزامنة</span>
                      </span>
                      {isSyncing && (
                        <span className="absolute -top-1 -left-1 px-1 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] leading-none tabular-nums">
                          {Math.round(syncProgress)}%
                        </span>
                      )}
                    </button>
                  )}
                  </div>
                  </div>
                )}

                <div className="space-y-1.5 md:space-y-2">
                  <>
                    <div className={`grid ${isCompactDesktopSidebar ? 'gap-1 justify-items-center grid-cols-1' : 'gap-1.5 md:gap-2 grid-cols-2'}`}>
                      <div className={`flex items-center justify-center gap-1 md:gap-2 bg-white/60 dark:bg-slate-700/50 h-8 md:h-9 rounded-lg border border-slate-200/70 dark:border-slate-600 ${isCompactDesktopSidebar ? 'w-8 md:w-9' : ''}`} title={isOnline ? 'متصل بالإنترنت' : 'غير متصل بالإنترنت'}>
                        {isOnline ? <Wifi size={12} className="text-emerald-500" /> : <WifiOff size={12} className="text-rose-500" />}
                        <span className={`text-[9px] md:text-[10px] font-bold ${isCompactDesktopSidebar ? 'md:hidden' : ''} ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isOnline ? 'متصل' : 'مفصول'}
                        </span>
                      </div>

                      <div className={`flex items-center justify-center gap-1 md:gap-2 bg-white/60 dark:bg-slate-700/50 h-8 md:h-9 rounded-lg border border-slate-200/70 dark:border-slate-600 ${isCompactDesktopSidebar ? 'w-8 md:w-9' : ''}`} title={isApiConnected ? 'متصل بالخادم' : 'غير متصل بالخادم - وضع محلي'}>
                        <Server size={12} className={isApiConnected ? 'text-emerald-500' : 'text-amber-500'} />
                        <span className={`text-[9px] md:text-[10px] font-bold ${isCompactDesktopSidebar ? 'md:hidden' : ''} ${isApiConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {isApiConnected ? 'API' : 'محلي'}
                        </span>
                      </div>
                    </div>

                    <div className={`flex ${isCompactDesktopSidebar ? 'gap-1 flex-col items-center' : 'gap-1.5 md:gap-2 flex-wrap'}`}>
                      <button
                        onClick={toggleDarkMode}
                        className="h-8 md:h-9 w-8 md:w-9 rounded-lg border border-slate-200 dark:border-slate-600 bg-white/60 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors inline-flex items-center justify-center"
                        title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
                      >
                        {isDarkMode ? <Sun size={12} /> : <Moon size={12} />}
                      </button>

                      <button
                        onClick={() => setShowGlobalSearch(true)}
                        className="h-8 md:h-9 w-8 md:w-9 rounded-lg border border-slate-200 dark:border-slate-600 bg-white/60 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors inline-flex items-center justify-center group"
                        title="البحث الشامل (Ctrl+K)"
                      >
                        <Search size={12} className="group-hover:text-blue-500 transition-colors" />
                      </button>

                      <button
                        onClick={() => setShowShortcutsModal(true)}
                        className="hidden md:inline-flex h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-600 bg-white/60 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors group items-center justify-center"
                        title="اختصارات لوحة المفاتيح (Ctrl+/)"
                      >
                        <Keyboard size={12} className="group-hover:text-purple-500 transition-colors" />
                      </button>

                      {menuPerms.canShowMessages && (
                        <div className="relative hidden md:block">
                          <button
                            onClick={openMessagesScreen}
                            className="h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-600 bg-white/60 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors inline-flex items-center justify-center"
                            title="شاشة الرسائل"
                          >
                            <Mail size={12} />
                            {unreadMessagesCount > 0 && (
                              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[8px] font-bold min-w-[14px] h-3.5 rounded-full px-1 inline-flex items-center justify-center animate-bounce">
                                {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                              </span>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Desktop Notification Icon */}
                      <div className="relative hidden md:block" ref={notifDropdownRef}>
                        <button
                          onClick={openNotificationsScreen}
                          className={`h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-600 bg-white/60 dark:bg-slate-700/50 transition-colors inline-flex items-center justify-center ${showNotifications ? 'bg-blue-100 dark:bg-slate-600 text-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                          title="شاشة الإشعارات"
                        >
                          <Bell size={12} />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center animate-bounce">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </button>

                        {/* Desktop Dropdown */}
                        {showNotifications && (
                          <div ref={notifPanelRef} className="absolute top-10 right-0 z-[120] w-60 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <NotificationContent />
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                </div>

                </div>
              )}
            </div>
          </div>
          
          <nav className={`shrink-0 p-2 ${isCompactDesktopSidebar ? 'md:p-2' : 'md:p-4'} space-y-2 md:space-y-3`}>
            {!isCompactDesktopSidebar && (
              <div className="mb-1.5">
                <div className="px-1 pb-2 text-[10px] md:text-[11px] font-bold tracking-wide text-slate-400 dark:text-slate-500">
                  التنقل السريع
                </div>
                <div className="relative">
                  <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={sidebarMenuSearch}
                    onChange={(e) => setSidebarMenuSearch(e.target.value)}
                    placeholder="بحث في القائمة..."
                    className="w-full h-9 pr-9 pl-9 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 dark:focus:border-blue-600"
                  />
                  {sidebarMenuSearch && (
                    <button
                      type="button"
                      onClick={() => setSidebarMenuSearch('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      title="مسح البحث"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 px-1">
                  العناصر الظاهرة: <span className="font-bold text-slate-700 dark:text-slate-200">{sortedNavItems.length}</span>
                </div>

              </div>
            )}

            <div className={`space-y-1 ${isCompactDesktopSidebar ? '' : 'rounded-xl p-1.5 md:p-2 border-r-2 border-slate-200 dark:border-slate-700'}`}>
              {sortedNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  title={isCompactDesktopSidebar ? item.label : undefined}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2 md:gap-3 px-3 ${isCompactDesktopSidebar ? 'md:px-2 md:justify-center' : 'md:px-3'} py-2.5 md:py-2.5 rounded-lg md:rounded-xl transition-all duration-200 text-sm md:text-[15px] border-r-4 ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-blue-500 font-semibold shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 border-r-transparent hover:bg-slate-100 dark:hover:bg-slate-700/70'
                    }`
                  }
                >
                  <span className={`inline-flex items-center justify-center rounded-lg ${isCompactDesktopSidebar ? 'md:bg-transparent md:p-0' : 'p-1.5'} transition-colors`}>
                    {React.cloneElement(item.icon as React.ReactElement, { size: 17 })}
                  </span>
                  <span className={`${item.to === '/expenses' ? 'leading-tight whitespace-normal' : 'truncate'} ${isCompactDesktopSidebar ? 'md:hidden' : ''}`}>
                    {item.to === '/expenses' ? (
                      <>
                        مصروفات
                        <br />
                        وإيرادات
                      </>
                    ) : item.label}
                  </span>
                  {item.to === '/notifications' && unreadCount > 0 && !isCompactDesktopSidebar && (
                    <span className="mr-auto px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none tabular-nums">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {item.to === '/notifications' && unreadCount > 0 && isCompactDesktopSidebar && (
                    <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-800" />
                  )}
                  {item.to === '/messages' && unreadMessagesCount > 0 && !isCompactDesktopSidebar && (
                    <span className="mr-auto px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold leading-none tabular-nums">
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </span>
                  )}
                  {item.to === '/messages' && unreadMessagesCount > 0 && isCompactDesktopSidebar && (
                    <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-800" />
                  )}
                </NavLink>
              ))}
            </div>

            {!isCompactDesktopSidebar && sortedNavItems.length === 0 && (
              <div className="h-28 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                <Search size={14} className="mb-1.5 opacity-70" />
                <p className="text-xs">لا توجد عناصر مطابقة</p>
              </div>
            )}
          </nav>

          <div className={`shrink-0 p-2 ${isCompactDesktopSidebar ? 'md:p-2' : 'md:px-4 md:pb-4'} border-t border-slate-200 dark:border-slate-700/60 bg-gradient-to-t from-slate-100/80 to-white dark:from-slate-900 dark:to-slate-850`}>
            {!isCompactDesktopSidebar && (
              <p className="px-1 pb-2 text-[10px] md:text-[11px] font-bold tracking-wide text-slate-400 dark:text-slate-500">
                جلسة المستخدم
              </p>
            )}

            <button
              type="button"
              onClick={handleLogoutClick}
              className="w-full h-8 md:h-9 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
              title="تسجيل خروج"
            >
              <span className="flex items-center justify-center gap-1.5 text-[10px] md:text-[11px] font-semibold">
                <LogOut size={12} />
                <span className={isCompactDesktopSidebar ? 'md:hidden' : ''}>تسجيل خروج</span>
              </span>
            </button>
          </div>

        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden print:overflow-visible print:h-auto">
        <header className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg shadow-sm p-4 md:hidden flex items-center justify-between z-10 print:hidden border-b border-slate-200 dark:border-slate-700">
           <div className="flex items-center gap-2 text-primary dark:text-blue-400 font-bold">
              <Wallet size={24} />
              <span>المحاسب</span>
           </div>
           
           <div className="flex items-center gap-3">
              {/* Mobile Notification Button (Opens Modal) */}
              <button
                onClick={openNotificationsScreen}
                className="p-2 text-slate-600 dark:text-slate-300 relative"
                title="شاشة الإشعارات"
              >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                    {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
              </button>

              {menuPerms.canShowMessages && (
                <button
                  onClick={openMessagesScreen}
                  className="p-2 text-slate-600 dark:text-slate-300 relative"
                  title="شاشة الرسائل"
                >
                  <Mail size={23} />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute top-1 right-1 bg-indigo-600 text-white text-[10px] font-bold min-w-[16px] h-4 rounded-full px-1 inline-flex items-center justify-center animate-bounce">
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </span>
                  )}
                </button>
              )}

              {isOnline ? <div className="w-3 h-3 bg-emerald-500 rounded-full"></div> : <div className="w-3 h-3 bg-rose-500 rounded-full"></div>}
              <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <Menu size={24} />
              </button>
           </div>
        </header>

        {/* Top Auto Refresh Indicator */}
        {isDashboardRoute && autoRefreshEnabled && autoRefreshInterval > 0 && (
          <div className="px-4 md:px-8 pt-1.5 md:pt-2 print:hidden">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <RefreshCw size={12} className={`shrink-0 ${isRefreshing ? 'animate-spin text-cyan-500' : (isAutoRefreshRunning ? 'animate-pulse text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400')}`} />
                <span className="text-[10px] md:text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
                  {isRefreshing
                    ? 'جاري تحديث البيانات...'
                    : isAutoRefreshRunning
                      ? `تحديث تلقائي خلال ${refreshCountdown}ث`
                      : (!isOnline ? 'في انتظار اتصال الإنترنت' : 'في انتظار اتصال الخادم')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleRefresh(false)}
                disabled={isRefreshing || !isOnline || !isApiConnected}
                className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                تحديث الآن
              </button>
            </div>

            <div className="relative h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700/80 overflow-hidden">
              <div
                className={`absolute inset-y-0 right-0 rounded-full transition-all duration-1000 ease-linear ${
                  isAutoRefreshRunning
                    ? 'bg-gradient-to-l from-cyan-500 to-blue-500'
                    : 'bg-slate-400/50 dark:bg-slate-500/60'
                }`}
                style={{ width: isAutoRefreshRunning ? `${autoRefreshProgress}%` : '18%' }}
              />
            </div>
          </div>
        )}

        <div ref={contentScrollRef} className="flex-1 overflow-auto p-4 md:p-8 print:p-0 print:overflow-visible">
          <Outlet />
        </div>

        {showScrollTopButton && (
          <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-[120] print:hidden">
            <div className="relative">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-900/85 text-white text-[10px] whitespace-nowrap">
                {scrollProgress >= 99.5 ? 'وصلت للنهاية' : `باقي ${remainingScrollPx}px`}
              </div>

              <button
                type="button"
                onClick={scrollToTop}
                title="الذهاب إلى أعلى الصفحة"
                aria-label="الذهاب إلى أعلى الصفحة"
                className="relative h-14 w-14 rounded-full bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-600 shadow-xl hover:shadow-2xl transition-all group"
              >
                <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
                  <circle cx="28" cy="28" r="23" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-200 dark:text-slate-700" strokeDasharray="2 5" />
                  <circle
                    cx="28"
                    cy="28"
                    r="23"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="text-blue-500"
                    strokeDasharray={`${(2 * Math.PI * 23 * scrollProgress) / 100} ${2 * Math.PI * 23}`}
                  />
                </svg>

                <span className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 dark:text-slate-100 leading-none">
                  <ArrowUp size={18} className="animate-bounce group-hover:-translate-y-0.5 transition-transform" />
                  <span className="mt-1 text-[10px] font-bold tabular-nums text-blue-600 dark:text-blue-300">
                    {Math.round(scrollProgress)}%
                  </span>
                </span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Layout;
