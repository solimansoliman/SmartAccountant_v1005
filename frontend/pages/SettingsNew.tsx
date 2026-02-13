import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Settings as SettingsIcon, Users, Shield, Key, Building2, Palette,
  Plus, Edit2, Trash2, Search, Check, X, Lock, Unlock, UserCheck, 
  UserX, Eye, EyeOff, Save, RefreshCw, ChevronDown, ChevronRight,
  Mail, Phone, Briefcase, Clock, Globe, Moon, Sun, Loader2, AlertTriangle,
  Building, CreditCard, Calendar, MapPin, Download, Upload, Sparkles, Play,
  Database, Wrench, Server, Link, CheckCircle, XCircle, Grid3X3, List, Monitor, Image as ImageIcon,
  LogIn, UserCog, ShieldCheck, Crown, FileText, Printer, Info, ToggleRight, ToggleLeft, User
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useSync } from '../context/SyncContext';
import { 
  usersApi, rolesApi, accountApi, systemSettingsApi, plansApi,
  ApiUser, ApiRole, ApiAccount, ApiPlan,
  CreateUserDto, UpdateUserDto, CreateAccountDto, UpdateAccountDto 
} from '../services/adminApi';
import { notificationsApi } from '../services/apiService';
import { getApiUrl, setApiUrl, testConnection } from '../services/configService';
import { formatDateTime, formatDate } from '../services/dateService';
import DateInput from '../components/DateInput';
import CoordinateMapPicker from '../components/CoordinateMapPicker';
import { notifyPermissionsChanged } from '../services/permissionsHooks';
import syncService, { SyncQueueItem } from '../services/syncService';
import {
  BrandIdentity,
  BrandIdentityAssignment,
  BrandAssignmentMode,
  getBrandIdentities,
  getBrandAssignments,
  createBrandIdentity,
  upsertBrandIdentity,
  deleteBrandIdentity,
  createBrandAssignment,
  upsertBrandAssignment,
  deleteBrandAssignment,
  getEffectiveBrandIdentity,
} from '../services/brandIdentityService';
import {
  buildMapUrl,
  composeAddressWithCoordinates,
  parseAddressCoordinates,
  removeCoordinateTokenFromAddress,
  validateCoordinateInputs,
} from '../services/geoAddressService';

// ==================== Types ====================
type TabType = 'general' | 'accounts' | 'users' | 'roles' | 'plans' | 'server' | 'logs' | 'permissions' | 'tools';

interface SettingsSearchResult {
  keyword: string;
  keywords: string[];
  tab: TabType;
  path: string;
  icon: string;
  selector?: string;
  settingKey?: string;
  accountId?: number;
  userId?: number;
  roleId?: number;
  planId?: number;
  logId?: number;
  permissionCategory?: 'pages' | 'menu' | 'tabs' | 'actions' | 'features';
}

interface PendingSearchNavigation {
  tab: TabType;
  keyword: string;
  selector?: string;
}

interface SearchableSettingItem {
  keyword: string;
  keywords: string[];
  tab: TabType;
  path: string;
  icon: string;
  settingKey?: string;
}

type RegisterLimitSettingKey =
  | 'registerUsernameMaxLength'
  | 'registerFullNameMaxLength'
  | 'registerCompanyNameMaxLength'
  | 'registerEmailMaxLength'
  | 'registerPasswordMaxLength';

interface RegisterLimitSettingConfig {
  min: number;
  max: number;
  fallback: number;
  label: string;
  description: string;
}

const REGISTER_LIMIT_SETTING_CONFIG: Record<RegisterLimitSettingKey, RegisterLimitSettingConfig> = {
  registerUsernameMaxLength: {
    min: 12,
    max: 80,
    fallback: 50,
    label: 'حد اسم المستخدم',
    description: 'الحد الأقصى لاسم المستخدم في التسجيل',
  },
  registerFullNameMaxLength: {
    min: 30,
    max: 150,
    fallback: 100,
    label: 'حد الاسم الشخصي',
    description: 'الحد الأقصى للاسم الشخصي في التسجيل',
  },
  registerCompanyNameMaxLength: {
    min: 30,
    max: 180,
    fallback: 120,
    label: 'حد اسم الشركة',
    description: 'الحد الأقصى لاسم الشركة في التسجيل',
  },
  registerEmailMaxLength: {
    min: 40,
    max: 200,
    fallback: 100,
    label: 'حد البريد الإلكتروني',
    description: 'الحد الأقصى للبريد الإلكتروني في التسجيل',
  },
  registerPasswordMaxLength: {
    min: 20,
    max: 128,
    fallback: 64,
    label: 'حد كلمة المرور',
    description: 'الحد الأقصى لكلمة المرور في التسجيل',
  },
};

const REGISTER_LIMIT_SETTING_KEYS: RegisterLimitSettingKey[] = [
  'registerUsernameMaxLength',
  'registerFullNameMaxLength',
  'registerCompanyNameMaxLength',
  'registerEmailMaxLength',
  'registerPasswordMaxLength',
];

// ==================== System Modules Definition ====================
const SYSTEM_MODULES = [
  // === الصفحات الرئيسية ===
  { id: 'dashboard', name: 'لوحة القيادة', category: 'pages' },
  { id: 'products', name: 'صفحة المنتجات', category: 'pages' },
  { id: 'customers', name: 'صفحة العملاء', category: 'pages' },
  { id: 'invoices', name: 'صفحة الفواتير', category: 'pages' },
  { id: 'expenses', name: 'صفحة المصروفات', category: 'pages' },
  { id: 'reports', name: 'صفحة التقارير', category: 'pages' },
  { id: 'settings', name: 'صفحة الإعدادات', category: 'pages' },
  { id: 'notifications', name: 'صفحة الإشعارات', category: 'pages' },
  { id: 'messages', name: 'صفحة الرسائل', category: 'pages' },
  { id: 'plans', name: 'صفحة الخطط', category: 'pages' },
  
  // === القوائم الجانبية ===
  { id: 'menu_dashboard', name: 'قائمة: الرئيسية', category: 'menu' },
  { id: 'menu_products', name: 'قائمة: المنتجات', category: 'menu' },
  { id: 'menu_customers', name: 'قائمة: العملاء', category: 'menu' },
  { id: 'menu_invoices', name: 'قائمة: الفواتير', category: 'menu' },
  { id: 'menu_expenses', name: 'قائمة: المصروفات', category: 'menu' },
  { id: 'menu_reports', name: 'قائمة: التقارير', category: 'menu' },
  { id: 'menu_settings', name: 'قائمة: الإعدادات', category: 'menu' },
  { id: 'menu_notifications', name: 'قائمة: الإشعارات', category: 'menu' },
  { id: 'menu_messages', name: 'قائمة: الرسائل', category: 'menu' },
  { id: 'menu_plans', name: 'قائمة: الخطط', category: 'menu' },
  
  // === تبويبات الإعدادات ===
  { id: 'settings_general', name: 'تبويب: الإعدادات العامة', category: 'tabs' },
  { id: 'settings_users', name: 'تبويب: إدارة الموظفين', category: 'tabs' },
  { id: 'settings_sync', name: 'تبويب: المزامنة', category: 'tabs' },
  { id: 'settings_tools', name: 'تبويب: أدوات النظام', category: 'tabs' },
  { id: 'settings_permissions', name: 'تبويب: مصفوفة الصلاحيات', category: 'tabs' },
  { id: 'settings_admin', name: 'تبويب: صلاحيات الأدمن', category: 'tabs' },
  { id: 'settings_plans', name: 'تبويب: إدارة الخطط', category: 'tabs' },
  
  // === أزرار وعمليات ===
  { id: 'btn_add_product', name: 'زر: إضافة منتج', category: 'actions' },
  { id: 'btn_add_customer', name: 'زر: إضافة عميل', category: 'actions' },
  { id: 'btn_add_invoice', name: 'زر: إنشاء فاتورة', category: 'actions' },
  { id: 'btn_add_expense', name: 'زر: تسجيل مصروف', category: 'actions' },
  { id: 'btn_unconfirm_invoice', name: 'زر: إلغاء تأكيد الفاتورة', category: 'actions' },
  { id: 'btn_delete_payment', name: 'زر: حذف الدفعة', category: 'actions' },
  { id: 'btn_print', name: 'زر: الطباعة', category: 'actions' },
  { id: 'btn_export', name: 'زر: التصدير', category: 'actions' },
  { id: 'btn_backup', name: 'زر: النسخ الاحتياطي', category: 'actions' },
  { id: 'btn_restore', name: 'زر: الاستعادة', category: 'actions' },
  { id: 'btn_clear_data', name: 'زر: تصفير البيانات', category: 'actions' },
  
  // === ميزات خاصة ===
  { id: 'feature_dark_mode', name: 'ميزة: الوضع الليلي', category: 'features' },
  { id: 'feature_notifications', name: 'ميزة: الإشعارات', category: 'features' },
  { id: 'feature_messages', name: 'ميزة: الرسائل', category: 'features' },
  { id: 'feature_activity_logs', name: 'ميزة: سجل النشاطات', category: 'features' },
  { id: 'feature_payments', name: 'ميزة: المدفوعات', category: 'features' },
  { id: 'feature_offline_mode', name: 'ميزة: العمل بدون اتصال', category: 'features' },
  { id: 'feature_offline_create', name: 'ميزة: إضافة بدون اتصال', category: 'features' },
  { id: 'feature_offline_edit', name: 'ميزة: تعديل بدون اتصال', category: 'features' },
  { id: 'feature_offline_delete', name: 'ميزة: حذف بدون اتصال', category: 'features' },
  { id: 'feature_offline_sync', name: 'ميزة: مزامنة تلقائية', category: 'features' },
];

const MODULE_CATEGORIES = [
  { id: 'all', name: 'الكل' },
  { id: 'pages', name: 'الصفحات' },
  { id: 'menu', name: 'القوائم' },
  { id: 'tabs', name: 'التبويبات' },
  { id: 'actions', name: 'الأزرار' },
  { id: 'features', name: 'الميزات' },
];

interface UserFormData {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: string;
  isSuperAdmin: boolean;
  roleIds: number[];
  accountId: number; // إضافة حقل الحساب
}

interface AccountFormData {
  name: string;
  nameEn: string;
  email: string;
  phone: string;
  address: string;
  latitude: string;
  longitude: string;
  currencySymbol: string;
  taxNumber: string;
  logoUrl: string;
  adminUsername: string;
  adminPassword: string;
  adminFullName: string;
}

// ==================== Main Component ====================
const Settings: React.FC = () => {
  const { notify, refreshNotifications } = useNotification();
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode, currency, setCurrency, availableCurrencies, addCurrency, permissions, togglePermission, defaultViewMode, setDefaultViewMode, dateFormat, setDateFormat, timeFormat, setTimeFormat, dateDisplayStyle, setDateDisplayStyle } = useSettings();
  const { syncState, isOnline, forceSync } = useSync();
  
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [loading, setLoading] = useState(false);
  
  // Settings Search
  const [settingsSearch, setSettingsSearch] = useState('');
  const settingsContentRef = useRef<HTMLDivElement | null>(null);
  const [pendingSearchNavigation, setPendingSearchNavigation] = useState<PendingSearchNavigation | null>(null);
  const [componentSearchResults, setComponentSearchResults] = useState<SettingsSearchResult[]>([]);
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [queueActionLoading, setQueueActionLoading] = useState<string | null>(null);
  const [registerLimitDrafts, setRegisterLimitDrafts] = useState<Record<RegisterLimitSettingKey, string>>({
    registerUsernameMaxLength: String(REGISTER_LIMIT_SETTING_CONFIG.registerUsernameMaxLength.fallback),
    registerFullNameMaxLength: String(REGISTER_LIMIT_SETTING_CONFIG.registerFullNameMaxLength.fallback),
    registerCompanyNameMaxLength: String(REGISTER_LIMIT_SETTING_CONFIG.registerCompanyNameMaxLength.fallback),
    registerEmailMaxLength: String(REGISTER_LIMIT_SETTING_CONFIG.registerEmailMaxLength.fallback),
    registerPasswordMaxLength: String(REGISTER_LIMIT_SETTING_CONFIG.registerPasswordMaxLength.fallback),
  });
  const [isSavingRegisterLimits, setIsSavingRegisterLimits] = useState(false);

  // Accounts State
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountSearch, setAccountSearch] = useState(''); // فلتر البحث في الحسابات
  const [selectedAccount, setSelectedAccount] = useState<ApiAccount | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ApiAccount | null>(null);
  const [currentAccount, setCurrentAccount] = useState<ApiAccount | null>(null); // الحساب الحالي للمستخدم
  const [expandedAccountIds, setExpandedAccountIds] = useState<number[]>([]); // الحسابات الموسعة
  const [accountUsersMap, setAccountUsersMap] = useState<Record<number, ApiUser[]>>({}); // مستخدمي كل حساب
  const [accountUsersLoading, setAccountUsersLoading] = useState<Record<number, boolean>>({}); // حالة التحميل
  const [detectingAccountLocation, setDetectingAccountLocation] = useState(false);
  const [accountFormData, setAccountFormData] = useState<AccountFormData>({
    name: '',
    nameEn: '',
    email: '',
    phone: '',
    address: '',
    latitude: '',
    longitude: '',
    currencySymbol: 'ج.م',
    taxNumber: '',
    logoUrl: '',
    adminUsername: '',
    adminPassword: '',
    adminFullName: '',
  });

  // Users State
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showViewPasswordModal, setShowViewPasswordModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [userFormData, setUserFormData] = useState<UserFormData>({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    jobTitle: '',
    department: '',
    isSuperAdmin: false,
    roleIds: [],
    accountId: user?.accountId ? parseInt(user.accountId.toString()) : 1,
  });
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAccountForUser, setSelectedAccountForUser] = useState<number>(Number(user?.accountId) || 1);

  // Roles State
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [creatingDefaultRole, setCreatingDefaultRole] = useState(false);
  const [roleSearch, setRoleSearch] = useState(''); // فلتر البحث في الأدوار
  const [selectedRole, setSelectedRole] = useState<ApiRole | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    nameEn: '',
    color: '#3B82F6',
    description: '',
  });
  const defaultLimitedRoleId = useMemo(() => {
    const preferredRole = roles.find(
      role => role.name === 'NewAcount' || role.nameEn?.toLowerCase() === 'newacount'
    );
    if (preferredRole) {
      return preferredRole.id;
    }

    // توافق مع الحسابات القديمة التي ما زالت تستخدم اسم Staff/موظف.
    return roles.find(role => role.name === 'موظف' || role.nameEn?.toLowerCase() === 'staff')?.id;
  }, [roles]);

  const findDefaultLimitedRoleId = useCallback((sourceRoles: ApiRole[]): number | undefined => {
    const preferredRole = sourceRoles.find(
      role => role.name === 'NewAcount' || role.nameEn?.toLowerCase() === 'newacount'
    );
    if (preferredRole) {
      return preferredRole.id;
    }

    return sourceRoles.find(role => role.name === 'موظف' || role.nameEn?.toLowerCase() === 'staff')?.id;
  }, []);

  // Plans State
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [planSearch, setPlanSearch] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<ApiPlan | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ApiPlan | null>(null);
  // Track which plan is showing the permissions panel
  const [expandedPlanPermsId, setExpandedPlanPermsId] = useState<number | null>(null);
  const [planFormData, setPlanFormData] = useState({
    name: '',
    nameEn: '',
    description: '',
    price: 0,
    yearlyPrice: 0,
    currency: 'ج.م',
    color: 'blue',
    icon: 'Zap',
    isPopular: false,
    sortOrder: 0,
    maxUsers: 1,
    maxInvoices: 50,
    maxCustomers: 25,
    maxProducts: 50,
    hasBasicReports: true,
    hasAdvancedReports: false,
    hasEmailSupport: true,
    hasPrioritySupport: false,
    hasDedicatedManager: false,
    hasBackup: false,
    backupFrequency: '',
    hasCustomInvoices: false,
    hasMultiCurrency: false,
    hasApiAccess: false,
    hasOfflineMode: false,
    hasWhiteLabel: false,
  });

  useEffect(() => {
    const refreshQueueItems = () => {
      const items = syncService
        .getQueueItems()
        .sort((a, b) => b.timestamp - a.timestamp);
      setQueueItems(items);
    };

    refreshQueueItems();
    const unsubscribe = syncService.subscribe(() => refreshQueueItems());
    const interval = setInterval(refreshQueueItems, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const runQueueAction = async (actionKey: string, action: () => Promise<void> | void) => {
    try {
      setQueueActionLoading(actionKey);
      await action();
      const items = syncService
        .getQueueItems()
        .sort((a, b) => b.timestamp - a.timestamp);
      setQueueItems(items);
    } finally {
      setQueueActionLoading(null);
    }
  };

  const handleForceSyncNow = async () => {
    await runQueueAction('force-sync', async () => {
      try {
        await forceSync();
        notify('تم بدء المزامنة الآن', 'success');
      } catch (error: any) {
        notify(error?.message || 'تعذر بدء المزامنة', 'error');
      }
    });
  };

  const handleRetryFailed = async () => {
    await runQueueAction('retry-failed', () => {
      const retried = syncService.retryFailedItems();
      notify(retried > 0 ? `تمت إعادة جدولة ${retried} عنصر للمزامنة` : 'لا توجد عناصر فاشلة لإعادة المحاولة', retried > 0 ? 'success' : 'info');
    });
  };

  const handleDiscardConflicts = async () => {
    await runQueueAction('discard-conflicts', () => {
      const discarded = syncService.discardConflictItems();
      notify(discarded > 0 ? `تم حذف ${discarded} عنصر متعارض من الطابور` : 'لا توجد عناصر متعارضة', discarded > 0 ? 'success' : 'info');
    });
  };

  const handleRetryItem = async (itemId: string) => {
    await runQueueAction(`retry-${itemId}`, () => {
      const ok = syncService.retryItem(itemId);
      notify(ok ? 'تمت إعادة جدولة العنصر للمزامنة' : 'العنصر غير موجود', ok ? 'success' : 'error');
    });
  };

  const handleDiscardItem = async (itemId: string) => {
    await runQueueAction(`discard-${itemId}`, () => {
      const ok = syncService.discardItem(itemId);
      notify(ok ? 'تم حذف العنصر من الطابور' : 'العنصر غير موجود', ok ? 'success' : 'error');
    });
  };

  const updateOfflineSetting = async (
    key: 'allowOfflineMode' | 'allowOfflineCreate' | 'allowOfflineEdit' | 'allowOfflineDelete' | 'showOfflineIndicator' | 'autoSyncOnReconnect' | 'maxPendingChanges' | 'offlineDataRetentionDays' | 'syncIntervalSeconds',
    value: boolean | number,
    type: 'bool' | 'int'
  ) => {
    if (!canManageOfflineSettings) {
      notify('ليس لديك صلاحية إدارة إعدادات العمل بدون اتصال', 'error');
      return;
    }

    try {
      await systemSettingsApi.update(key, String(value), type);
      togglePermission(key as any, value);
    } catch (error: any) {
      notify(error?.message || 'تعذر حفظ إعدادات العمل بدون اتصال', 'error');
    }
  };

  // Currency State
  const [newCurrency, setNewCurrency] = useState('');

  // Activity Logs State
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsViewMode, setLogsViewMode] = useState<'table' | 'grid'>('grid');
  const [logsPeriod, setLogsPeriod] = useState<'week' | 'month' | 'year' | 'custom'>('week');
  
  // Users View Mode
  const [usersViewMode, setUsersViewMode] = useState<'table' | 'grid'>('grid');
  
  // التاريخ الافتراضي: أسبوع
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [logsFilter, setLogsFilter] = useState<{ action?: string; from?: string; to?: string }>({
    from: weekAgo.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0]
  });
  const [logsSearch, setLogsSearch] = useState(''); // فلتر البحث النصي في السجلات

  // Permissions Matrix State
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean; print: boolean }>>>({});
  const [selectedPermRole, setSelectedPermRole] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [permEntityType, setPermEntityType] = useState<'roles' | 'users' | 'accounts'>('roles');
  const [showPermissionsPreview, setShowPermissionsPreview] = useState(false); // عرض ملخص الصلاحيات

  // Tools State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [productCount, setProductCount] = useState(10);
  const [customerCount, setCustomerCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jsonInput, setJsonInput] = useState('');

  // Server Settings State
  const [serverApiUrl, setServerApiUrl] = useState(getApiUrl());
  const [serverConnectionStatus, setServerConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [serverLatency, setServerLatency] = useState<number | null>(null);
  const [isSavingServer, setIsSavingServer] = useState(false);

  // Brand Identity State
  const [brandIdentities, setBrandIdentities] = useState<BrandIdentity[]>([]);
  const [brandAssignments, setBrandAssignments] = useState<BrandIdentityAssignment[]>([]);
  const [editingIdentityId, setEditingIdentityId] = useState<string | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [activeBrandIdentity, setActiveBrandIdentity] = useState<BrandIdentity | null>(null);
  const [identityFormData, setIdentityFormData] = useState({
    name: '',
    description: '',
    primary: '#2563eb',
    secondary: '#64748b',
    success: '#16a34a',
    danger: '#dc2626',
    warning: '#ca8a04',
  });
  const [assignmentFormData, setAssignmentFormData] = useState({
    identityId: '',
    mode: 'global' as BrandAssignmentMode,
    accountId: '',
    startAt: '',
    endAt: '',
    priority: 0,
    enabled: true,
    notes: '',
  });
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentFilterMode, setAssignmentFilterMode] = useState<'all' | BrandAssignmentMode>('all');
  const [assignmentFilterStatus, setAssignmentFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [assignmentFilterAccountId, setAssignmentFilterAccountId] = useState<'all' | string>('all');

  // Check admin status
  const isAdmin = user?.role === 'sys_admin' || user?.isSuperAdmin === true;
  const canManageOfflineSettings = isAdmin || user?.permissions?.canManageSettings === true;
  const offlineAllowedByPlan = (permissions as any).allowOfflineByPlan !== false;
  const offlineEnabledByAdmin = (permissions as any).allowOfflineMode !== false;
  const offlineEffectiveEnabled = offlineAllowedByPlan && offlineEnabledByAdmin;

  const clampRegisterLimitValue = useCallback((settingKey: RegisterLimitSettingKey, rawValue: string | number): number => {
    const config = REGISTER_LIMIT_SETTING_CONFIG[settingKey];
    const parsed = typeof rawValue === 'number' ? rawValue : parseInt(String(rawValue), 10);
    if (!Number.isFinite(parsed)) {
      return config.fallback;
    }
    return Math.min(config.max, Math.max(config.min, Math.floor(parsed)));
  }, []);

  const persistRegisterLimit = useCallback(
    async (settingKey: RegisterLimitSettingKey, value: number, showToast: boolean = true) => {
      const config = REGISTER_LIMIT_SETTING_CONFIG[settingKey];

      try {
        await systemSettingsApi.update(settingKey, value.toString(), 'int', config.description, true);
        togglePermission(settingKey as any, value);
        if (showToast) {
          notify(`تم تحديث ${config.label} ✓`, 'success');
        }
      } catch {
        togglePermission(settingKey as any, value);
        if (showToast) {
          notify(`تم تحديث ${config.label} (محلياً)`, 'info');
        }
      }
    },
    [notify, togglePermission]
  );

  const setRegisterLimitDraft = useCallback((settingKey: RegisterLimitSettingKey, rawValue: string) => {
    const digitsOnly = rawValue.replace(/[^\d]/g, '');
    setRegisterLimitDrafts(prev => ({ ...prev, [settingKey]: digitsOnly }));
  }, []);

  const normalizeRegisterLimitDraft = useCallback(
    (settingKey: RegisterLimitSettingKey) => {
      const nextValue = clampRegisterLimitValue(settingKey, registerLimitDrafts[settingKey]);
      setRegisterLimitDrafts(prev => ({ ...prev, [settingKey]: String(nextValue) }));
    },
    [clampRegisterLimitValue, registerLimitDrafts]
  );

  const stepRegisterLimitDraft = useCallback(
    (settingKey: RegisterLimitSettingKey, delta: number) => {
      const current = clampRegisterLimitValue(settingKey, registerLimitDrafts[settingKey]);
      const config = REGISTER_LIMIT_SETTING_CONFIG[settingKey];
      const nextValue = Math.min(config.max, Math.max(config.min, current + delta));

      setRegisterLimitDrafts(prev => ({ ...prev, [settingKey]: String(nextValue) }));
    },
    [clampRegisterLimitValue, registerLimitDrafts]
  );

  const hasPendingRegisterLimitChanges = useMemo(
    () =>
      REGISTER_LIMIT_SETTING_KEYS.some(
        (settingKey) =>
          clampRegisterLimitValue(settingKey, registerLimitDrafts[settingKey]) !==
          clampRegisterLimitValue(settingKey, (permissions as any)[settingKey])
      ),
    [
      clampRegisterLimitValue,
      registerLimitDrafts,
      (permissions as any).registerUsernameMaxLength,
      (permissions as any).registerFullNameMaxLength,
      (permissions as any).registerCompanyNameMaxLength,
      (permissions as any).registerEmailMaxLength,
      (permissions as any).registerPasswordMaxLength,
    ]
  );

  const saveAllRegisterLimits = useCallback(async () => {
    if (isSavingRegisterLimits) {
      return;
    }

    if (!hasPendingRegisterLimitChanges) {
      notify('لا توجد تغييرات جديدة في حدود الحروف', 'info');
      return;
    }

    setIsSavingRegisterLimits(true);

    const normalizedValues = REGISTER_LIMIT_SETTING_KEYS.reduce((acc, settingKey) => {
      const boundedValue = clampRegisterLimitValue(settingKey, registerLimitDrafts[settingKey]);
      acc[settingKey] = boundedValue;
      return acc;
    }, {} as Record<RegisterLimitSettingKey, number>);

    setRegisterLimitDrafts({
      registerUsernameMaxLength: String(normalizedValues.registerUsernameMaxLength),
      registerFullNameMaxLength: String(normalizedValues.registerFullNameMaxLength),
      registerCompanyNameMaxLength: String(normalizedValues.registerCompanyNameMaxLength),
      registerEmailMaxLength: String(normalizedValues.registerEmailMaxLength),
      registerPasswordMaxLength: String(normalizedValues.registerPasswordMaxLength),
    });

    const results = await Promise.all(
      REGISTER_LIMIT_SETTING_KEYS.map(async (settingKey) => {
        try {
          await systemSettingsApi.update(
            settingKey,
            normalizedValues[settingKey].toString(),
            'int',
            REGISTER_LIMIT_SETTING_CONFIG[settingKey].description,
            true
          );
          togglePermission(settingKey as any, normalizedValues[settingKey]);
          return true;
        } catch {
          togglePermission(settingKey as any, normalizedValues[settingKey]);
          return false;
        }
      })
    );

    const successCount = results.filter(Boolean).length;
    if (successCount === REGISTER_LIMIT_SETTING_KEYS.length) {
      notify('تم حفظ جميع حدود الحروف بنجاح ✓', 'success');
    } else if (successCount > 0) {
      notify('تم حفظ جزء من التغييرات على السيرفر، وتم تطبيق الباقي محلياً', 'warning');
    } else {
      notify('تم تطبيق حدود الحروف محلياً (تعذر الحفظ على السيرفر حالياً)', 'info');
    }

    setIsSavingRegisterLimits(false);
  }, [
    clampRegisterLimitValue,
    hasPendingRegisterLimitChanges,
    isSavingRegisterLimits,
    notify,
    registerLimitDrafts,
    togglePermission,
  ]);

  useEffect(() => {
    const syncDraft = (settingKey: RegisterLimitSettingKey) =>
      String(clampRegisterLimitValue(settingKey, (permissions as any)[settingKey]));

    setRegisterLimitDrafts({
      registerUsernameMaxLength: syncDraft('registerUsernameMaxLength'),
      registerFullNameMaxLength: syncDraft('registerFullNameMaxLength'),
      registerCompanyNameMaxLength: syncDraft('registerCompanyNameMaxLength'),
      registerEmailMaxLength: syncDraft('registerEmailMaxLength'),
      registerPasswordMaxLength: syncDraft('registerPasswordMaxLength'),
    });
  }, [
    clampRegisterLimitValue,
    (permissions as any).registerUsernameMaxLength,
    (permissions as any).registerFullNameMaxLength,
    (permissions as any).registerCompanyNameMaxLength,
    (permissions as any).registerEmailMaxLength,
    (permissions as any).registerPasswordMaxLength,
  ]);

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  } | null>(null);

  // ==================== Effects ====================
  useEffect(() => {
    if (activeTab === 'general') {
      loadAccounts(); // تحميل الحسابات للحصول على بيانات الحساب الحالي
      loadBrandIdentityData();
    } else if (activeTab === 'accounts') {
      loadAccounts();
    } else if (activeTab === 'users') {
      loadAccounts(); // نحتاج الحسابات لاختيار الحساب عند إضافة مستخدم
      loadUsers();
      loadRoles();
    } else if (activeTab === 'roles') {
      loadRoles();
    } else if (activeTab === 'plans') {
      loadPlans();
    } else if (activeTab === 'logs') {
      loadActivityLogs(logsPage);
    } else if (activeTab === 'permissions') {
      // تحميل جميع البيانات المطلوبة لمصفوفة الصلاحيات
      loadRoles();
      loadUsers();
      loadAccounts();
      // Load saved permissions from localStorage
      const saved = localStorage.getItem('smartAccountant_permissionsMatrix');
      if (saved) {
        try {
          setPermissionsMatrix(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse permissions matrix');
        }
      }
    } else if (activeTab === 'server') {
      // Check server connection when tab is opened
      checkServerConnection();
    }
  }, [activeTab]);

  // Auto-save permissions matrix when changed and notify other components
  useEffect(() => {
    if (Object.keys(permissionsMatrix).length > 0) {
      localStorage.setItem('smartAccountant_permissionsMatrix', JSON.stringify(permissionsMatrix));
      // إشعار جميع المكونات بتغيير الصلاحيات
      notifyPermissionsChanged();
    }
  }, [permissionsMatrix]);

  // Load activity logs when page changes
  useEffect(() => {
    if (activeTab === 'logs') {
      loadActivityLogs(logsPage);
    }
  }, [logsPage]);

  useEffect(() => {
    if (!pendingSearchNavigation || pendingSearchNavigation.tab !== activeTab) {
      return;
    }

    const highlightClasses = [
      'ring-4',
      'ring-sky-500',
      'ring-offset-4',
      'rounded-md',
      'shadow-2xl',
      'shadow-sky-500/30',
      'transition-all',
      'duration-300',
    ];

    let highlightedElement: HTMLElement | null = null;
    let highlightResetTimer: number | null = null;

    const timer = window.setTimeout(() => {
      const container = settingsContentRef.current;
      if (!container) {
        setPendingSearchNavigation(null);
        return;
      }

      const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
      const target = normalize(pendingSearchNavigation.keyword);

      const matchedBySelector = pendingSearchNavigation.selector
        ? container.querySelector<HTMLElement>(pendingSearchNavigation.selector)
        : null;

      const candidates = Array.from(
        container.querySelectorAll<HTMLElement>('h1, h2, h3, h4, label, th, td, button, p, span, div')
      );

      const matchedByText = candidates.find((element) => {
        const text = normalize(element.textContent || '');
        return text.length > 0 && text.includes(target);
      });

      const matchedElement = matchedBySelector || matchedByText;

      const focusElement = matchedElement || container;
      focusElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

      if (matchedElement) {
        highlightedElement = matchedElement;
        highlightedElement.classList.add(...highlightClasses);

        // إزاحة بسيطة للأعلى لعرض العنصر بشكل أوضح بعد الانتقال.
        window.setTimeout(() => {
          window.scrollBy({ top: -90, behavior: 'smooth' });
        }, 220);

        highlightResetTimer = window.setTimeout(() => {
          highlightedElement?.classList.remove(...highlightClasses);
          highlightedElement = null;
        }, 2600);
      }

      setPendingSearchNavigation(null);
    }, 140);

    return () => {
      window.clearTimeout(timer);
      if (highlightResetTimer) {
        window.clearTimeout(highlightResetTimer);
      }
      if (highlightedElement) {
        highlightedElement.classList.remove(...highlightClasses);
      }
    };
  }, [activeTab, pendingSearchNavigation]);

  // ==================== Server Connection Functions ====================
  const checkServerConnection = async () => {
    setServerConnectionStatus('checking');
    const result = await testConnection(serverApiUrl);
    setServerConnectionStatus(result.success ? 'connected' : 'disconnected');
    setServerLatency(result.latency || null);
  };

  const handleTestConnection = async () => {
    setServerConnectionStatus('checking');
    const result = await testConnection(serverApiUrl);
    setServerConnectionStatus(result.success ? 'connected' : 'disconnected');
    setServerLatency(result.latency || null);
    if (result.success) {
      notify(`✅ الاتصال ناجح! (${result.latency}ms)`, 'success');
    } else {
      notify(`❌ ${result.message}`, 'error');
    }
  };

  const handleSaveServerSettings = async () => {
    setIsSavingServer(true);
    try {
      // Test connection first
      const result = await testConnection(serverApiUrl);
      if (result.success) {
        setApiUrl(serverApiUrl);
        setServerConnectionStatus('connected');
        setServerLatency(result.latency || null);
        notify('✅ تم حفظ إعدادات الخادم بنجاح', 'success');
      } else {
        notify(`❌ فشل الاتصال: ${result.message}. لم يتم الحفظ.`, 'error');
        setServerConnectionStatus('disconnected');
      }
    } catch (error: any) {
      notify('❌ حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setIsSavingServer(false);
    }
  };

  // ==================== Brand Identity Functions ====================
  const isValidHexColor = (value: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(value);

  const toLocalDateTimeValue = (iso?: string): string => {
    if (!iso) return '';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return '';
    const offsetMs = parsed.getTimezoneOffset() * 60000;
    return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  const getModeLabel = (mode: BrandAssignmentMode): string => {
    switch (mode) {
      case 'global':
        return 'عام';
      case 'account':
        return 'حسب الحساب';
      case 'time':
        return 'حسب الفترة';
      case 'account_time':
        return 'حسب الحساب والفترة';
      default:
        return mode;
    }
  };

  const resetIdentityForm = () => {
    setEditingIdentityId(null);
    setIdentityFormData({
      name: '',
      description: '',
      primary: '#2563eb',
      secondary: '#64748b',
      success: '#16a34a',
      danger: '#dc2626',
      warning: '#ca8a04',
    });
  };

  const resetAssignmentForm = () => {
    setEditingAssignmentId(null);
    setAssignmentFormData(prev => ({
      identityId: brandIdentities[0]?.id || prev.identityId || '',
      mode: 'global',
      accountId: '',
      startAt: '',
      endAt: '',
      priority: 0,
      enabled: true,
      notes: '',
    }));
  };

  const loadBrandIdentityData = () => {
    const identities = getBrandIdentities();
    const assignments = getBrandAssignments().sort((a, b) => (b.priority || 0) - (a.priority || 0));
    setBrandIdentities(identities);
    setBrandAssignments(assignments);
    setActiveBrandIdentity(getEffectiveBrandIdentity());

    setAssignmentFormData(prev => ({
      ...prev,
      identityId: prev.identityId || identities[0]?.id || '',
    }));
  };

  const handleSaveIdentity = () => {
    const name = identityFormData.name.trim();
    if (!name) {
      notify('يرجى إدخال اسم الهوية', 'error');
      return;
    }

    const colorFields = [
      identityFormData.primary,
      identityFormData.secondary,
      identityFormData.success,
      identityFormData.danger,
      identityFormData.warning,
    ];
    if (!colorFields.every(isValidHexColor)) {
      notify('يرجى إدخال ألوان بصيغة Hex صحيحة مثل #2563eb', 'error');
      return;
    }

    if (editingIdentityId) {
      const existing = brandIdentities.find(item => item.id === editingIdentityId);
      upsertBrandIdentity({
        id: editingIdentityId,
        name,
        description: identityFormData.description.trim() || undefined,
        palette: {
          primary: identityFormData.primary,
          secondary: identityFormData.secondary,
          success: identityFormData.success,
          danger: identityFormData.danger,
          warning: identityFormData.warning,
        },
        isBuiltIn: existing?.isBuiltIn,
      });
      notify('تم تحديث الهوية اللونية بنجاح', 'success');
    } else {
      createBrandIdentity({
        name,
        description: identityFormData.description.trim() || undefined,
        palette: {
          primary: identityFormData.primary,
          secondary: identityFormData.secondary,
          success: identityFormData.success,
          danger: identityFormData.danger,
          warning: identityFormData.warning,
        },
      });
      notify('تم إنشاء هوية لونية جديدة', 'success');
    }

    resetIdentityForm();
    loadBrandIdentityData();
  };

  const handleEditIdentity = (identity: BrandIdentity) => {
    setEditingIdentityId(identity.id);
    setIdentityFormData({
      name: identity.name,
      description: identity.description || '',
      primary: identity.palette.primary,
      secondary: identity.palette.secondary,
      success: identity.palette.success,
      danger: identity.palette.danger,
      warning: identity.palette.warning,
    });
  };

  const handleDeleteIdentity = (identity: BrandIdentity) => {
    if (identity.isBuiltIn) {
      notify('لا يمكن حذف الهوية الافتراضية المدمجة', 'warning');
      return;
    }

    const deleted = deleteBrandIdentity(identity.id);
    if (!deleted) {
      notify('تعذر حذف الهوية: قد تكون مستخدمة في تخصيص نشط', 'error');
      return;
    }

    notify('تم حذف الهوية اللونية', 'success');
    if (editingIdentityId === identity.id) {
      resetIdentityForm();
    }
    loadBrandIdentityData();
  };

  const handleSaveAssignment = () => {
    if (!assignmentFormData.identityId) {
      notify('يرجى اختيار الهوية اللونية أولاً', 'error');
      return;
    }

    const mode = assignmentFormData.mode;
    const needsAccount = mode === 'account' || mode === 'account_time';
    const needsTime = mode === 'time' || mode === 'account_time';

    if (needsAccount && !assignmentFormData.accountId) {
      notify('يرجى اختيار الحساب لهذا التخصيص', 'error');
      return;
    }

    if (needsTime && (!assignmentFormData.startAt || !assignmentFormData.endAt)) {
      notify('يرجى تحديد بداية ونهاية الفترة الزمنية', 'error');
      return;
    }

    const startIso = needsTime ? new Date(assignmentFormData.startAt).toISOString() : undefined;
    const endIso = needsTime ? new Date(assignmentFormData.endAt).toISOString() : undefined;
    if (startIso && endIso && new Date(startIso) > new Date(endIso)) {
      notify('تاريخ البداية يجب أن يكون قبل تاريخ النهاية', 'error');
      return;
    }

    const basePayload = {
      identityId: assignmentFormData.identityId,
      mode,
      accountId: needsAccount ? Number(assignmentFormData.accountId) : undefined,
      startAt: startIso,
      endAt: endIso,
      priority: Number(assignmentFormData.priority) || 0,
      enabled: assignmentFormData.enabled,
      notes: assignmentFormData.notes.trim() || undefined,
    };

    if (editingAssignmentId) {
      upsertBrandAssignment({
        id: editingAssignmentId,
        ...basePayload,
      });
      notify('تم تحديث التخصيص بنجاح', 'success');
    } else {
      createBrandAssignment(basePayload);
      notify('تم إضافة التخصيص بنجاح', 'success');
    }

    resetAssignmentForm();
    loadBrandIdentityData();
  };

  const handleEditAssignment = (assignment: BrandIdentityAssignment) => {
    setEditingAssignmentId(assignment.id);
    setAssignmentFormData({
      identityId: assignment.identityId,
      mode: assignment.mode,
      accountId: assignment.accountId ? String(assignment.accountId) : '',
      startAt: toLocalDateTimeValue(assignment.startAt),
      endAt: toLocalDateTimeValue(assignment.endAt),
      priority: assignment.priority || 0,
      enabled: assignment.enabled !== false,
      notes: assignment.notes || '',
    });
  };

  const handleDeleteAssignment = (assignmentId: string) => {
    deleteBrandAssignment(assignmentId);
    notify('تم حذف التخصيص', 'success');
    if (editingAssignmentId === assignmentId) {
      resetAssignmentForm();
    }
    loadBrandIdentityData();
  };

  // ==================== API Calls ====================
  const loadActivityLogs = async (page: number = 1, customFilter?: { action?: string; from?: string; to?: string }) => {
    setLogsLoading(true);
    try {
      const filterToUse = customFilter || logsFilter;
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', '20');
      if (filterToUse.action) params.append('action', filterToUse.action);
      if (filterToUse.from) params.append('fromDate', filterToUse.from);
      if (filterToUse.to) params.append('toDate', filterToUse.to);
      
      const response = await fetch(`http://localhost:5000/api/activitylogs?${params.toString()}`, {
        headers: { 'X-Account-Id': (user?.accountId || 1).toString() }
      });
      if (response.ok) {
        const data = await response.json();
        setActivityLogs(data.logs || []);
        setLogsTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const data = await accountApi.getAll();
      setAccounts(data);
      
      // تحميل بيانات الحساب الحالي للمستخدم
      if (user?.accountId) {
        const myAccount = data.find(a => a.id === parseInt(user.accountId.toString()));
        if (myAccount) {
          setCurrentAccount(myAccount);
        }
      }
    } catch (error: any) {
      notify(error.message || 'فشل في تحميل الحسابات', 'error');
    } finally {
      setAccountsLoading(false);
    }
  }, [notify, user?.accountId]);

  // تحميل مستخدمي حساب معين
  const loadAccountUsers = useCallback(async (accountId: number) => {
    setAccountUsersLoading(prev => ({ ...prev, [accountId]: true }));
    try {
      const response = await usersApi.getAll({ 
        accountId, 
        pageSize: 50 
      });
      setAccountUsersMap(prev => ({ ...prev, [accountId]: response.items }));
    } catch (error: any) {
      console.error(`Failed to load users for account ${accountId}:`, error);
    } finally {
      setAccountUsersLoading(prev => ({ ...prev, [accountId]: false }));
    }
  }, []);

  // توسيع/طي قائمة مستخدمي الحساب
  const toggleAccountExpansion = useCallback((accountId: number) => {
    setExpandedAccountIds(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        // تحميل المستخدمين إذا لم يتم تحميلهم بعد
        if (!accountUsersMap[accountId]) {
          loadAccountUsers(accountId);
        }
        return [...prev, accountId];
      }
    });
  }, [accountUsersMap, loadAccountUsers]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      // المدير العام (sys_admin أو isSuperAdmin) يرى جميع المستخدمين من كل الحسابات
      const isSystemAdmin = user?.role === 'sys_admin' || user?.isSuperAdmin === true;
      
      const response = await usersApi.getAll({ 
        accountId: isSystemAdmin ? undefined : (user?.accountId || 1), // undefined = كل الحسابات
        pageSize: 100 
      });
      setUsers(response.items);
    } catch (error: any) {
      notify(error.message || 'فشل في تحميل المستخدمين', 'error');
    } finally {
      setUsersLoading(false);
    }
  }, [user?.accountId, user?.role, user?.isSuperAdmin, notify]);

  const loadRoles = useCallback(async (accountIdOverride?: number) => {
    setRolesLoading(true);
    try {
      const fallbackAccountId = Number(user?.accountId) || 1;
      const targetAccountId = accountIdOverride || fallbackAccountId;
      const data = await rolesApi.getAll(targetAccountId);
      setRoles(data);
    } catch (error: any) {
      notify(error.message || 'فشل في تحميل الأدوار', 'error');
    } finally {
      setRolesLoading(false);
    }
  }, [user?.accountId, notify]);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const data = await plansApi.getAll(true); // include inactive
      setPlans(data);
    } catch (error: any) {
      notify(error.message || 'فشل في تحميل الخطط', 'error');
    } finally {
      setPlansLoading(false);
    }
  }, [notify]);

  // ==================== User Handlers ====================
  const handleCreateUser = async () => {
    if (!userFormData.username || !userFormData.password || !userFormData.fullName) {
      notify('يرجى ملء الحقول المطلوبة', 'warning');
      return;
    }

    const targetAccountId = Number(selectedAccountForUser || user?.accountId || 1);
    if (!Number.isFinite(targetAccountId) || targetAccountId <= 0) {
      notify('يرجى اختيار حساب صالح للمستخدم', 'warning');
      return;
    }

    const validRoleIdsForAccount = userFormData.roleIds.filter(roleId => roles.some(role => role.id === roleId));
    if (validRoleIdsForAccount.length !== userFormData.roleIds.length) {
      setUserFormData(prev => ({ ...prev, roleIds: validRoleIdsForAccount }));
    }

    if (!userFormData.isSuperAdmin && roles.length > 0 && validRoleIdsForAccount.length === 0) {
      notify('يجب اختيار دور واحد على الأقل للمستخدم', 'warning');
      return;
    }

    setLoading(true);
    try {
      const dto: CreateUserDto = {
        accountId: targetAccountId,
        username: userFormData.username,
        password: userFormData.password,
        fullName: userFormData.fullName,
        email: userFormData.email || undefined,
        phone: userFormData.phone || undefined,
        jobTitle: userFormData.jobTitle || undefined,
        department: userFormData.department || undefined,
        isSuperAdmin: isAdmin && userFormData.isSuperAdmin,
        roleIds: validRoleIdsForAccount,
        assignedByUserId: parseInt(user?.id || '1'),
      };

      const newUser = await usersApi.create(dto);
      
      // تحديث الحالة المحلية فوراً
      setUsers(prev => [...prev, newUser]);
      
      notify('تم إنشاء المستخدم بنجاح', 'success');
      setShowUserModal(false);
      resetUserForm();
    } catch (error: any) {
      notify(error.message || 'فشل في إنشاء المستخدم', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    if (!userFormData.isSuperAdmin && userFormData.roleIds.length === 0) {
      notify('يجب اختيار دور واحد على الأقل للمستخدم', 'warning');
      return;
    }

    setLoading(true);
    try {
      const dto: UpdateUserDto = {
        fullName: userFormData.fullName,
        email: userFormData.email || undefined,
        phone: userFormData.phone || undefined,
        jobTitle: userFormData.jobTitle || undefined,
        department: userFormData.department || undefined,
        isSuperAdmin: isAdmin && userFormData.isSuperAdmin,
      };

      const updatedUser = await usersApi.update(editingUser.id, dto);

      // Update roles if changed
      if (userFormData.roleIds.length > 0) {
        await usersApi.updateRoles(editingUser.id, userFormData.roleIds, parseInt(user?.id || '1'));
      }

      // تحديث الحالة المحلية فوراً
      setUsers(prev => prev.map(u => 
        u.id === editingUser.id 
          ? { ...u, ...dto, roles: roles.filter(r => userFormData.roleIds.includes(r.id)) } 
          : u
      ));
      
      notify('تم تحديث المستخدم بنجاح', 'success');
      setShowUserModal(false);
      setEditingUser(null);
      resetUserForm();
    } catch (error: any) {
      notify(error.message || 'فشل في تحديث المستخدم', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (targetUser: ApiUser) => {
    const newStatus = !targetUser.isActive;
    setConfirmModal({
      show: true,
      title: newStatus ? 'تفعيل المستخدم' : 'تعطيل المستخدم',
      message: `هل أنت متأكد من ${newStatus ? 'تفعيل' : 'تعطيل'} المستخدم "${targetUser.fullName}"؟`,
      type: newStatus ? 'info' : 'warning',
      onConfirm: async () => {
        try {
          await usersApi.toggleStatus(targetUser.id, newStatus);
          
          // تحديث الحالة المحلية فوراً
          setUsers(prev => prev.map(u => 
            u.id === targetUser.id ? { ...u, isActive: newStatus } : u
          ));
          
          notify(newStatus ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم', 'success');
        } catch (error: any) {
          notify(error.message || 'فشل في تغيير حالة المستخدم', 'error');
        }
        setConfirmModal(null);
      },
    });
  };

  const handleToggleUserLock = async (targetUser: ApiUser) => {
    const shouldLock = !targetUser.isLocked;
    setConfirmModal({
      show: true,
      title: shouldLock ? 'قفل المستخدم' : 'فتح القفل',
      message: `هل أنت متأكد من ${shouldLock ? 'قفل' : 'فتح قفل'} المستخدم "${targetUser.fullName}"؟`,
      type: shouldLock ? 'danger' : 'info',
      onConfirm: async () => {
        try {
          await usersApi.toggleLock(targetUser.id, shouldLock);
          
          // تحديث الحالة المحلية فوراً
          setUsers(prev => prev.map(u => 
            u.id === targetUser.id ? { ...u, isLocked: shouldLock } : u
          ));
          
          notify(shouldLock ? 'تم قفل المستخدم' : 'تم فتح القفل', 'success');
        } catch (error: any) {
          notify(error.message || 'فشل في تغيير حالة القفل', 'error');
        }
        setConfirmModal(null);
      },
    });
  };

  const handleChangePassword = async () => {
    if (!selectedUser || !newPassword) {
      notify('يرجى إدخال كلمة المرور الجديدة', 'warning');
      return;
    }

    if (newPassword.length < 6) {
      notify('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'warning');
      return;
    }

    setLoading(true);
    try {
      await usersApi.changePassword(selectedUser.id, newPassword);
      notify('تم تغيير كلمة المرور بنجاح', 'success');
      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error: any) {
      notify(error.message || 'فشل في تغيير كلمة المرور', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (targetUser: ApiUser) => {
    setConfirmModal({
      show: true,
      title: 'حذف المستخدم',
      message: `هل أنت متأكد من حذف المستخدم "${targetUser.fullName}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await usersApi.delete(targetUser.id);
          
          // تحديث الحالة المحلية فوراً
          setUsers(prev => prev.filter(u => u.id !== targetUser.id));
          
          notify('تم حذف المستخدم بنجاح', 'success');
        } catch (error: any) {
          notify(error.message || 'فشل في حذف المستخدم', 'error');
        }
        setConfirmModal(null);
      },
    });
  };

  const openEditUserModal = (targetUser: ApiUser) => {
    setEditingUser(targetUser);
    setUserFormData({
      username: targetUser.username,
      password: '',
      fullName: targetUser.fullName,
      email: targetUser.email || '',
      phone: targetUser.phone || '',
      jobTitle: targetUser.jobTitle || '',
      department: targetUser.department || '',
      isSuperAdmin: targetUser.isSuperAdmin,
      roleIds: targetUser.roles?.map(r => r.id) || [],
    });
    setShowUserModal(true);
  };

  const resetUserForm = () => {
    setUserFormData({
      username: '',
      password: '',
      fullName: '',
      email: '',
      phone: '',
      jobTitle: '',
      department: '',
      isSuperAdmin: false,
      roleIds: defaultLimitedRoleId ? [defaultLimitedRoleId] : [],
      accountId: user?.accountId ? parseInt(user.accountId.toString()) : 1,
    });
    setSelectedAccountForUser(user?.accountId ? parseInt(user.accountId.toString()) : 1);
    setEditingUser(null);
  };

  useEffect(() => {
    if (!showUserModal || !!editingUser || userFormData.isSuperAdmin || userFormData.roleIds.length > 0 || !defaultLimitedRoleId) {
      return;
    }

    setUserFormData(prev => ({ ...prev, roleIds: [defaultLimitedRoleId] }));
  }, [showUserModal, editingUser, userFormData.isSuperAdmin, userFormData.roleIds.length, defaultLimitedRoleId]);

  useEffect(() => {
    if (!showUserModal || !!editingUser) {
      return;
    }

    if (accounts.length > 0 && !accounts.some(acc => acc.id === selectedAccountForUser)) {
      setSelectedAccountForUser(accounts[0].id);
      return;
    }

    const accountIdForRoles = selectedAccountForUser || Number(user?.accountId) || 1;
    void loadRoles(accountIdForRoles);
  }, [showUserModal, editingUser, selectedAccountForUser, loadRoles, user?.accountId, accounts]);

  // ==================== Account Handlers ====================
  const accountCoordinatesPreview = useMemo(
    () => validateCoordinateInputs(accountFormData.latitude, accountFormData.longitude),
    [accountFormData.latitude, accountFormData.longitude]
  );

  const openAccountLocationOnMap = () => {
    const fallbackQuery = [accountFormData.address, accountFormData.name].filter(Boolean).join(' - ');
    const mapUrl = buildMapUrl(accountFormData.latitude, accountFormData.longitude, fallbackQuery);
    window.open(mapUrl, '_blank', 'noopener,noreferrer');
  };

  const detectAccountLocation = () => {
    if (!navigator.geolocation) {
      notify('المتصفح لا يدعم تحديد الموقع الجغرافي.', 'error');
      return;
    }

    setDetectingAccountLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAccountFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        notify('تم تحديد إحداثيات موقع الشركة.', 'success');
        setDetectingAccountLocation(false);
      },
      () => {
        notify('تعذر تحديد الموقع الحالي. تأكد من منح صلاحية الموقع.', 'error');
        setDetectingAccountLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  const isValidEmailFormat = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const isValidUsernameFormat = (value: string) => /^[a-zA-Z0-9._-]{3,50}$/.test(value);
  const isValidPhoneFormat = (value: string) => /^[0-9+()\-\s]{7,20}$/.test(value);

  const handleCreateAccount = async () => {
    const normalizedName = accountFormData.name.trim();
    const normalizedNameEn = accountFormData.nameEn.trim();
    const normalizedEmail = accountFormData.email.trim();
    const normalizedPhone = accountFormData.phone.trim();
    const normalizedAddress = accountFormData.address.trim();
    const normalizedCurrencySymbol = accountFormData.currencySymbol.trim();
    const normalizedTaxNumber = accountFormData.taxNumber.trim();
    const normalizedAdminUsername = accountFormData.adminUsername.trim();
    const normalizedAdminPassword = accountFormData.adminPassword;
    const normalizedAdminFullName = accountFormData.adminFullName.trim();

    if (!normalizedName || !normalizedAdminUsername || !normalizedAdminPassword) {
      notify('يرجى إدخال اسم الحساب واسم المستخدم وكلمة المرور للمسؤول.', 'warning');
      return;
    }

    if (normalizedName.length < 2 || normalizedName.length > 120) {
      notify('اسم الحساب يجب أن يكون بين حرفين و120 حرفًا.', 'warning');
      return;
    }

    if (!isValidUsernameFormat(normalizedAdminUsername)) {
      notify('اسم المستخدم يجب أن يكون من 3 إلى 50 حرفًا (أحرف/أرقام/._-).', 'warning');
      return;
    }

    if (normalizedAdminPassword.length < 6) {
      notify('كلمة المرور يجب ألا تقل عن 6 أحرف.', 'warning');
      return;
    }

    if (normalizedEmail && !isValidEmailFormat(normalizedEmail)) {
      notify('البريد الإلكتروني غير صالح.', 'warning');
      return;
    }

    if (normalizedPhone && !isValidPhoneFormat(normalizedPhone)) {
      notify('رقم الهاتف غير صالح. استخدم أرقامًا ورموزًا شائعة فقط.', 'warning');
      return;
    }

    if (normalizedCurrencySymbol.length > 10) {
      notify('رمز العملة طويل جدًا. الحد الأقصى 10 أحرف.', 'warning');
      return;
    }

    if (accounts.some(acc => acc.name.trim().toLowerCase() === normalizedName.toLowerCase())) {
      notify('اسم الحساب موجود بالفعل، اختر اسمًا مختلفًا.', 'warning');
      return;
    }

    if (users.some(u => u.username.trim().toLowerCase() === normalizedAdminUsername.toLowerCase())) {
      notify('اسم المستخدم المسؤول مستخدم بالفعل.', 'warning');
      return;
    }

    const coordinateValidation = validateCoordinateInputs(accountFormData.latitude, accountFormData.longitude);
    if (!coordinateValidation.isValid) {
      notify(coordinateValidation.message || 'الإحداثيات غير صحيحة.', 'error');
      return;
    }

    const resolvedAddress = composeAddressWithCoordinates(
      normalizedAddress,
      accountFormData.latitude,
      accountFormData.longitude
    );

    setLoading(true);
    try {
      const dto: CreateAccountDto = {
        name: normalizedName,
        nameEn: normalizedNameEn || undefined,
        email: normalizedEmail || undefined,
        phone: normalizedPhone || undefined,
        address: resolvedAddress || undefined,
        currencySymbol: normalizedCurrencySymbol || 'ج.م',
        taxNumber: normalizedTaxNumber || undefined,
        adminUsername: normalizedAdminUsername,
        adminPassword: normalizedAdminPassword,
        adminFullName: normalizedAdminFullName || normalizedName,
      };

      await accountApi.create(dto);
      await loadAccounts();

      // إضافة إشعار نظام دائم في مركز الإشعارات بعد إنشاء الحساب بنجاح.
      if (user?.id) {
        try {
          await notificationsApi.create({
            userId: Number(user.id),
            title: 'إنشاء حساب جديد',
            message: `تم إنشاء الحساب "${normalizedName}" بنجاح.`,
            type: 'System',
            link: '/settings',
            icon: 'building',
          });
          refreshNotifications();
        } catch {
          // فشل الإشعار لا يجب أن يؤثر على نجاح عملية إنشاء الحساب.
        }
      }
      
      notify(`تم إنشاء الحساب "${normalizedName}" بنجاح.`, 'success');
      setShowAccountModal(false);
      resetAccountForm();
    } catch (error: any) {
      notify(error.message || 'فشل في إنشاء الحساب', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount) return;

    const coordinateValidation = validateCoordinateInputs(accountFormData.latitude, accountFormData.longitude);
    if (!coordinateValidation.isValid) {
      notify(coordinateValidation.message || 'الإحداثيات غير صحيحة.', 'error');
      return;
    }

    const resolvedAddress = composeAddressWithCoordinates(
      accountFormData.address,
      accountFormData.latitude,
      accountFormData.longitude
    );

    setLoading(true);
    try {
      const dto: UpdateAccountDto = {
        name: accountFormData.name,
        nameEn: accountFormData.nameEn || undefined,
        email: accountFormData.email || undefined,
        phone: accountFormData.phone || undefined,
        address: resolvedAddress || undefined,
        currencySymbol: accountFormData.currencySymbol,
        taxNumber: accountFormData.taxNumber || undefined,
        logoUrl: accountFormData.logoUrl || undefined,
      };

      const updatedAccount = await accountApi.update(editingAccount.id, dto);
      
      // تحديث شعار الحساب إذا تغير
      if (accountFormData.logoUrl !== editingAccount.logoUrl) {
        await accountApi.updateLogo(editingAccount.id, accountFormData.logoUrl || '');
      }
      
      // تحديث الحالة المحلية فوراً
      setAccounts(prev => prev.map(acc => 
        acc.id === editingAccount.id 
          ? { ...acc, ...dto, logoUrl: accountFormData.logoUrl } 
          : acc
      ));
      
      notify('تم تحديث الحساب بنجاح', 'success');
      setShowAccountModal(false);
      setEditingAccount(null);
      resetAccountForm();
    } catch (error: any) {
      notify(error.message || 'فشل في تحديث الحساب', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (account: ApiAccount) => {
    setConfirmModal({
      show: true,
      title: 'حذف الحساب',
      message: `هل أنت متأكد من حذف الحساب "${account.name}"؟ سيتم حذف جميع البيانات المرتبطة.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await accountApi.delete(account.id);
          
          // تحديث الحالة المحلية فوراً
          setAccounts(prev => prev.filter(acc => acc.id !== account.id));
          
          notify('تم حذف الحساب بنجاح', 'success');
        } catch (error: any) {
          notify(error.message || 'فشل في حذف الحساب', 'error');
        }
        setConfirmModal(null);
      },
    });
  };

  const handleToggleAccountStatus = async (account: ApiAccount) => {
    const newStatus = !account.isActive;
    setConfirmModal({
      show: true,
      title: newStatus ? 'تفعيل الحساب' : 'تعطيل الحساب',
      message: `هل أنت متأكد من ${newStatus ? 'تفعيل' : 'تعطيل'} الحساب "${account.name}"؟${!newStatus ? '\nسيتم منع جميع مستخدمي هذا الحساب من الدخول.' : ''}`,
      type: newStatus ? 'info' : 'warning',
      onConfirm: async () => {
        try {
          await accountApi.toggleStatus(account.id, newStatus);
          
          // تحديث الحالة المحلية فوراً
          setAccounts(prev => prev.map(acc => 
            acc.id === account.id ? { ...acc, isActive: newStatus } : acc
          ));
          
          notify(newStatus ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب', 'success');
        } catch (error: any) {
          notify(error.message || 'فشل في تغيير حالة الحساب', 'error');
        }
        setConfirmModal(null);
      },
    });
  };

  const openEditAccountModal = (account: ApiAccount) => {
    const parsedAccountAddress = parseAddressCoordinates(account.address || '');
    setEditingAccount(account);
    setAccountFormData({
      name: account.name,
      nameEn: account.nameEn || '',
      email: account.email || '',
      phone: account.phone || '',
      address: parsedAccountAddress.cleanAddress,
      latitude: parsedAccountAddress.latitude,
      longitude: parsedAccountAddress.longitude,
      currencySymbol: account.currency || 'ج.م',
      taxNumber: account.taxNumber || '',
      logoUrl: account.logoUrl || '',
      adminUsername: '',
      adminPassword: '',
      adminFullName: '',
    });
    setShowAccountModal(true);
  };

  const resetAccountForm = () => {
    setAccountFormData({
      name: '',
      nameEn: '',
      email: '',
      phone: '',
      address: '',
      latitude: '',
      longitude: '',
      currencySymbol: 'ج.م',
      taxNumber: '',
      logoUrl: '',
      adminUsername: '',
      adminPassword: '',
      adminFullName: '',
    });
    setDetectingAccountLocation(false);
    setEditingAccount(null);
  };

  const handleCreateDefaultRoleForSelectedAccount = async () => {
    const targetAccountId = Number(selectedAccountForUser || user?.accountId || 1);
    if (!Number.isFinite(targetAccountId) || targetAccountId <= 0) {
      notify('يرجى اختيار حساب صالح قبل إنشاء الدور الافتراضي', 'warning');
      return;
    }

    setCreatingDefaultRole(true);
    try {
      const latestRoles = await rolesApi.getAll(targetAccountId);
      setRoles(latestRoles);

      const existingDefaultRoleId = findDefaultLimitedRoleId(latestRoles);
      if (existingDefaultRoleId) {
        setUserFormData(prev => ({ ...prev, roleIds: [existingDefaultRoleId] }));
        notify('تم العثور على الدور الافتراضي وتحديده تلقائياً', 'info');
        return;
      }

      try {
        await rolesApi.create({
          accountId: targetAccountId,
          name: 'NewAcount',
          nameEn: 'NewAcount',
          color: '#0f766e',
          description: 'دور افتراضي بصلاحيات محدودة',
        });
      } catch (error: any) {
        const message = error?.message || '';
        if (!message.includes('يوجد دور بنفس الاسم')) {
          throw error;
        }
      }

      const refreshedRoles = await rolesApi.getAll(targetAccountId);
      setRoles(refreshedRoles);

      const defaultRoleId = findDefaultLimitedRoleId(refreshedRoles);
      if (defaultRoleId) {
        setUserFormData(prev => ({ ...prev, roleIds: [defaultRoleId] }));
        notify('تم إنشاء الدور الافتراضي وتحديده للمستخدم ✓', 'success');
      } else {
        notify('تم تحديث قائمة الأدوار، اختر الدور المناسب للمستخدم', 'info');
      }
    } catch (error: any) {
      notify(error.message || 'تعذر إنشاء الدور الافتراضي', 'error');
    } finally {
      setCreatingDefaultRole(false);
    }
  };

  // ==================== Role Handlers ====================
  const handleCreateRole = async () => {
    if (!roleFormData.name) {
      notify('يرجى إدخال اسم الدور', 'warning');
      return;
    }

    setLoading(true);
    try {
      const newRole = await rolesApi.create({
        accountId: user?.accountId || 1,
        name: roleFormData.name,
        nameEn: roleFormData.nameEn || undefined,
        color: roleFormData.color,
        description: roleFormData.description || undefined,
      });
      
      // تحديث الحالة المحلية فوراً
      setRoles(prev => [...prev, newRole]);
      
      notify('تم إنشاء الدور بنجاح', 'success');
      setShowRoleModal(false);
      resetRoleForm();
    } catch (error: any) {
      notify(error.message || 'فشل في إنشاء الدور', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;

    setLoading(true);
    try {
      const updatedRole = await rolesApi.update(selectedRole.id, {
        name: roleFormData.name,
        nameEn: roleFormData.nameEn || undefined,
        color: roleFormData.color,
        description: roleFormData.description || undefined,
      });
      
      // تحديث الحالة المحلية فوراً
      setRoles(prev => prev.map(r => 
        r.id === selectedRole.id 
          ? { ...r, ...roleFormData } 
          : r
      ));
      
      notify('تم تحديث الدور بنجاح', 'success');
      setShowRoleModal(false);
      setSelectedRole(null);
      resetRoleForm();
    } catch (error: any) {
      notify(error.message || 'فشل في تحديث الدور', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRoleStatus = async (role: ApiRole) => {
    if (role.isSystemRole) {
      notify('لا يمكن تغيير حالة أدوار النظام', 'warning');
      return;
    }

    const newStatus = !role.isActive;
    const actionText = newStatus ? 'تفعيل' : 'تعطيل';

    setConfirmModal({
      show: true,
      title: `${actionText} الدور`,
      message: `هل أنت متأكد من ${actionText} الدور "${role.name}"؟`,
      type: newStatus ? 'info' : 'warning',
      onConfirm: async () => {
        try {
          const response = await rolesApi.toggleStatus(role.id, newStatus);
          
          // تحديث الحالة المحلية فوراً
          setRoles(prev => prev.map(r => 
            r.id === role.id ? { ...r, isActive: response.isActive } : r
          ));
          
          notify(response.message || `تم ${actionText} الدور بنجاح`, 'success');
        } catch (error: any) {
          notify(error.message || `فشل في ${actionText} الدور`, 'error');
        }
        setConfirmModal(null);
      },
    });
  };

  const handleDeleteRole = async (role: ApiRole) => {
    if (role.isSystemRole) {
      notify('لا يمكن حذف أدوار النظام', 'warning');
      return;
    }

    setConfirmModal({
      show: true,
      title: 'حذف الدور',
      message: `هل أنت متأكد من حذف الدور "${role.name}"؟`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await rolesApi.delete(role.id);
          
          // تحديث الحالة المحلية فوراً
          setRoles(prev => prev.filter(r => r.id !== role.id));
          
          notify('تم حذف الدور بنجاح', 'success');
        } catch (error: any) {
          notify(error.message || 'فشل في حذف الدور', 'error');
        }
        setConfirmModal(null);
      },
    });
  };

  const resetRoleForm = () => {
    setRoleFormData({
      name: '',
      nameEn: '',
      color: '#3B82F6',
      description: '',
    });
    setSelectedRole(null);
  };

  // ==================== Plan Handlers ====================
  const handleCreatePlan = async () => {
    if (!planFormData.name) {
      notify('يرجى إدخال اسم الخطة', 'warning');
      return;
    }

    setLoading(true);
    try {
      const newPlan = await plansApi.create(planFormData);
      setPlans(prev => [...prev, newPlan]);
      notify('تم إنشاء الخطة بنجاح', 'success');
      setShowPlanModal(false);
      resetPlanForm();
    } catch (error: any) {
      notify(error.message || 'فشل في إنشاء الخطة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;

    setLoading(true);
    try {
      const updatedPlan = await plansApi.update(editingPlan.id, planFormData);
      setPlans(prev => prev.map(p => p.id === editingPlan.id ? updatedPlan : p));
      notify('تم تحديث الخطة بنجاح', 'success');
      setShowPlanModal(false);
      setEditingPlan(null);
      resetPlanForm();
    } catch (error: any) {
      notify(error.message || 'فشل في تحديث الخطة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlanStatus = async (plan: ApiPlan) => {
    const newStatus = !plan.isActive;
    const actionText = newStatus ? 'تفعيل' : 'تعطيل';

    setConfirmModal({
      show: true,
      title: `${actionText} الخطة`,
      message: `هل أنت متأكد من ${actionText} الخطة "${plan.name}"؟`,
      type: newStatus ? 'info' : 'warning',
      onConfirm: async () => {
        try {
          const response = await plansApi.toggleStatus(plan.id);
          setPlans(prev => prev.map(p => 
            p.id === plan.id ? { ...p, isActive: response.isActive } : p
          ));
          notify(response.message || `تم ${actionText} الخطة بنجاح`, 'success');
        } catch (error: any) {
          notify(error.message || `فشل في ${actionText} الخطة`, 'error');
        }
        setConfirmModal(null);
      },
    });
  };

  const handleDeletePlan = async (plan: ApiPlan) => {
    setConfirmModal({
      show: true,
      title: 'حذف الخطة',
      message: `هل أنت متأكد من حذف الخطة "${plan.name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await plansApi.delete(plan.id);
          setPlans(prev => prev.filter(p => p.id !== plan.id));
          notify('تم حذف الخطة بنجاح', 'success');
        } catch (error: any) {
          notify(error.message || 'فشل في حذف الخطة', 'error');
        }
        setConfirmModal(null);
      },
    });
  };

  const resetPlanForm = () => {
    setPlanFormData({
      name: '',
      nameEn: '',
      description: '',
      price: 0,
      yearlyPrice: 0,
      currency: 'ج.م',
      color: 'blue',
      icon: 'Zap',
      isPopular: false,
      sortOrder: 0,
      maxUsers: 1,
      maxInvoices: 50,
      maxCustomers: 25,
      maxProducts: 50,
      hasBasicReports: true,
      hasAdvancedReports: false,
      hasEmailSupport: true,
      hasPrioritySupport: false,
      hasDedicatedManager: false,
      hasBackup: false,
      backupFrequency: '',
      hasCustomInvoices: false,
      hasMultiCurrency: false,
      hasApiAccess: false,
      hasOfflineMode: false,
      hasWhiteLabel: false,
    });
    setEditingPlan(null);
  };

  const openEditPlanModal = (plan: ApiPlan) => {
    setEditingPlan(plan);
    setPlanFormData({
      name: plan.name,
      nameEn: plan.nameEn || '',
      description: plan.description || '',
      price: plan.price,
      yearlyPrice: plan.yearlyPrice || 0,
      currency: plan.currency,
      color: plan.color,
      icon: plan.icon,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      maxUsers: plan.maxUsers,
      maxInvoices: plan.maxInvoices,
      maxCustomers: plan.maxCustomers,
      maxProducts: plan.maxProducts,
      hasBasicReports: plan.hasBasicReports,
      hasAdvancedReports: plan.hasAdvancedReports,
      hasEmailSupport: plan.hasEmailSupport,
      hasPrioritySupport: plan.hasPrioritySupport,
      hasDedicatedManager: plan.hasDedicatedManager,
      hasBackup: plan.hasBackup,
      backupFrequency: plan.backupFrequency || '',
      hasCustomInvoices: plan.hasCustomInvoices,
      hasMultiCurrency: plan.hasMultiCurrency,
      hasApiAccess: plan.hasApiAccess,
      hasOfflineMode: plan.hasOfflineMode,
      hasWhiteLabel: plan.hasWhiteLabel,
    });
    setShowPlanModal(true);
  };

  // ==================== Render Helpers ====================
  const filteredUsers = users.filter(u =>
    u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredPlans = plans.filter(p =>
    p.name.toLowerCase().includes(planSearch.toLowerCase()) ||
    (p.nameEn && p.nameEn.toLowerCase().includes(planSearch.toLowerCase())) ||
    (p.description && p.description.toLowerCase().includes(planSearch.toLowerCase()))
  );

  const handleAddCurrency = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCurrency.trim()) {
      addCurrency(newCurrency.trim());
      setNewCurrency('');
      notify('تم إضافة العملة', 'success');
    }
  };

  // فلترة السجلات بناءً على البحث النصي
  const filteredActivityLogs = activityLogs.filter(log => {
    if (!logsSearch.trim()) return true;
    const search = logsSearch.toLowerCase();
    return (
      log.action?.toLowerCase().includes(search) ||
      log.entityType?.toLowerCase().includes(search) ||
      log.entityName?.toLowerCase().includes(search) ||
      log.description?.toLowerCase().includes(search) ||
      log.descriptionEn?.toLowerCase().includes(search) ||
      log.ipAddress?.toLowerCase().includes(search)
    );
  });

  // ==================== Tools Handlers ====================
  const handleDownloadBackup = () => {
    try {
      const data = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        // Get data from localStorage as backup
        products: JSON.parse(localStorage.getItem('smartAccountant_products') || '[]'),
        customers: JSON.parse(localStorage.getItem('smartAccountant_customers') || '[]'),
        invoices: JSON.parse(localStorage.getItem('smartAccountant_invoices') || '[]'),
        expenses: JSON.parse(localStorage.getItem('smartAccountant_expenses') || '[]'),
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartAccountant_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notify('تم تحميل النسخة الاحتياطية بنجاح', 'success');
    } catch (err) {
      notify('فشل في تحميل النسخة الاحتياطية', 'error');
    }
  };

  const handleRestoreBackup = () => {
    try {
      const data = JSON.parse(jsonInput);
      if (data.products) localStorage.setItem('smartAccountant_products', JSON.stringify(data.products));
      if (data.customers) localStorage.setItem('smartAccountant_customers', JSON.stringify(data.customers));
      if (data.invoices) localStorage.setItem('smartAccountant_invoices', JSON.stringify(data.invoices));
      if (data.expenses) localStorage.setItem('smartAccountant_expenses', JSON.stringify(data.expenses));
      
      notify('تم استعادة البيانات بنجاح. أعد تحميل الصفحة.', 'success');
      setShowRestoreModal(false);
      setJsonInput('');
    } catch (err) {
      notify('ملف JSON غير صالح', 'error');
    }
  };

  const handleClearData = () => {
    localStorage.removeItem('smartAccountant_products');
    localStorage.removeItem('smartAccountant_customers');
    localStorage.removeItem('smartAccountant_invoices');
    localStorage.removeItem('smartAccountant_expenses');
    notify('تم تصفير البيانات المحلية. أعد تحميل الصفحة.', 'success');
    setShowClearModal(false);
  };

  const handleGenerateMockData = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // Generate mock products
      const products = Array.from({ length: productCount }, (_, i) => ({
        id: `prod_${Date.now()}_${i}`,
        name: `منتج تجريبي ${i + 1}`,
        price: Math.floor(Math.random() * 1000) + 10,
        quantity: Math.floor(Math.random() * 100) + 1,
        category: ['إلكترونيات', 'ملابس', 'أغذية', 'أدوات'][Math.floor(Math.random() * 4)],
      }));
      
      // Generate mock customers
      const customers = Array.from({ length: customerCount }, (_, i) => ({
        id: `cust_${Date.now()}_${i}`,
        name: `عميل تجريبي ${i + 1}`,
        phone: `05${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
        email: `customer${i + 1}@test.com`,
      }));
      
      const existingProducts = JSON.parse(localStorage.getItem('smartAccountant_products') || '[]');
      const existingCustomers = JSON.parse(localStorage.getItem('smartAccountant_customers') || '[]');
      
      localStorage.setItem('smartAccountant_products', JSON.stringify([...existingProducts, ...products]));
      localStorage.setItem('smartAccountant_customers', JSON.stringify([...existingCustomers, ...customers]));
      
      setIsGenerating(false);
      setShowGenerateModal(false);
      notify(`تم توليد ${productCount} منتج و ${customerCount} عميل`, 'success');
    }, 1000);
  };

  // ==================== Tabs ====================
  // Regular users only see: general settings + manage their own sub-users
  const tabs = useMemo(
    () =>
      isAdmin
        ? [
            { id: 'general', label: 'عام', icon: SettingsIcon },
            { id: 'accounts', label: 'الحسابات', icon: Building },
            { id: 'users', label: 'المستخدمين', icon: Users },
            { id: 'roles', label: 'الأدوار', icon: Shield },
            { id: 'plans', label: 'الخطط', icon: Crown },
            { id: 'server', label: 'إعدادات السيرفر', icon: Server },
            { id: 'tools', label: 'أدوات النظام', icon: Wrench },
            { id: 'permissions', label: 'مصفوفة الصلاحيات', icon: Key },
            { id: 'logs', label: 'سجل النشاطات', icon: Clock },
          ]
        : [
            { id: 'general', label: 'عام', icon: SettingsIcon },
            { id: 'users', label: 'الموظفون', icon: Users },
          ],
    [isAdmin]
  );

  useEffect(() => {
    if (!tabs.some(tab => tab.id === activeTab)) {
      setActiveTab('general');
    }
  }, [activeTab, tabs]);

  // بيانات البحث في الإعدادات - شاملة لكل شيء
  const normalizeSearchText = useCallback((value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim(), []);
  const normalizedSettingsSearch = normalizeSearchText(settingsSearch);
  const searchTokens = useMemo(
    () => (normalizedSettingsSearch ? normalizedSettingsSearch.split(' ').filter(Boolean) : []),
    [normalizedSettingsSearch]
  );

  const matchesSettingsSearch = useCallback(
    (...segments: Array<string | undefined | null>) => {
      if (searchTokens.length === 0) {
        return true;
      }

      const normalizedHaystack = normalizeSearchText(segments.filter(Boolean).join(' '));
      return searchTokens.every(token => normalizedHaystack.includes(token));
    },
    [normalizeSearchText, searchTokens]
  );

  const searchableSettings: SearchableSettingItem[] = [
    // ============= الإعدادات العامة =============
    { keyword: 'المظهر', keywords: ['مظهر', 'ثيم', 'داكن', 'فاتح', 'theme', 'dark', 'light', 'لون', 'تصميم'], tab: 'general', path: 'عام > المظهر', icon: '🎨' },
    { keyword: 'الوضع الداكن', keywords: ['داكن', 'dark', 'ليلي', 'اسود'], tab: 'general', path: 'عام > المظهر', icon: '🌙' },
    { keyword: 'الوضع الفاتح', keywords: ['فاتح', 'light', 'نهاري', 'ابيض'], tab: 'general', path: 'عام > المظهر', icon: '☀️' },
    { keyword: 'العملة', keywords: ['عملة', 'currency', 'ريال', 'دولار', 'جنيه', 'يورو', 'عملات', 'سعر'], tab: 'general', path: 'عام > العملة', icon: '💰' },
    { keyword: 'العرض الافتراضي', keywords: ['عرض', 'جدول', 'شبكي', 'grid', 'table', 'view', 'قائمة', 'بطاقات'], tab: 'general', path: 'عام > العرض الافتراضي', icon: '📊' },
    { keyword: 'اللغة', keywords: ['لغة', 'language', 'عربي', 'انجليزي', 'english', 'arabic'], tab: 'general', path: 'عام > اللغة', icon: '🌐' },
    
    // ============= الشعار واللوجو =============
    { keyword: 'الشعار', keywords: ['شعار', 'logo', 'لوجو', 'صورة', 'رمز', 'علامة'], tab: 'general', path: 'عام > شعار الشركة', icon: '🏷️' },
    { keyword: 'تغيير الشعار', keywords: ['تغيير شعار', 'رفع شعار', 'upload logo', 'تحميل صورة'], tab: 'general', path: 'عام > شعار الشركة', icon: '📤' },
    { keyword: 'إظهار الشعار', keywords: ['عرض شعار', 'إخفاء شعار', 'show logo', 'hide logo'], tab: 'general', path: 'عام > شعار الشركة', icon: '👁️' },
    
    // ============= الصلاحيات =============
    { keyword: 'الصلاحيات', keywords: ['صلاحيات', 'صلاحية', 'permissions', 'فواتير', 'منتجات', 'اذن', 'وصول'], tab: 'general', path: 'عام > صلاحيات النظام', icon: '🔐' },
    { keyword: 'صلاحيات الفواتير', keywords: ['فواتير', 'فاتورة', 'invoice', 'بيع'], tab: 'general', path: 'عام > صلاحيات > الفواتير', icon: '🧾' },
    { keyword: 'صلاحيات المنتجات', keywords: ['منتجات', 'منتج', 'product', 'سلعة'], tab: 'general', path: 'عام > صلاحيات > المنتجات', icon: '📦' },
    { keyword: 'صلاحيات العملاء', keywords: ['عملاء', 'عميل', 'customer', 'زبون'], tab: 'general', path: 'عام > صلاحيات > العملاء', icon: '👥' },
    { keyword: 'صلاحيات المصروفات', keywords: ['مصروفات', 'مصروف', 'expense', 'نفقات'], tab: 'general', path: 'عام > صلاحيات > المصروفات', icon: '💸' },
    
    // ============= الحسابات والشركات =============
    { keyword: 'إدارة الحسابات', keywords: ['إدارة', 'حسابات', 'شركات', 'منشآت', 'manage accounts', 'accounts management'], tab: 'accounts', path: 'الحسابات', icon: '🏢' },
    { keyword: 'إدارة حسابات الشركات', keywords: ['إدارة شركات', 'حسابات الشركات', 'منشآت', 'مؤسسات', 'companies'], tab: 'accounts', path: 'الحسابات', icon: '🏭' },
    { keyword: 'الحسابات', keywords: ['حساب', 'شركة', 'account', 'company', 'اكونت', 'حسابات', 'شركات', 'منشأة', 'مؤسسة'], tab: 'accounts', path: 'الحسابات', icon: '🏢' },
    { keyword: 'إضافة حساب', keywords: ['حساب جديد', 'شركة جديدة', 'new account', 'إنشاء حساب', 'add account', 'منشأة جديدة'], tab: 'accounts', path: 'الحسابات > إضافة', icon: '➕' },
    { keyword: 'تعديل حساب', keywords: ['تحرير حساب', 'تغيير حساب', 'edit account', 'update account'], tab: 'accounts', path: 'الحسابات > تعديل', icon: '✏️' },
    { keyword: 'حذف حساب', keywords: ['إزالة حساب', 'delete account', 'remove account'], tab: 'accounts', path: 'الحسابات > حذف', icon: '🗑️' },
    { keyword: 'تفعيل حساب', keywords: ['تنشيط', 'activate', 'enable', 'فتح حساب'], tab: 'accounts', path: 'الحسابات > تفعيل', icon: '✅' },
    { keyword: 'تعطيل حساب', keywords: ['إيقاف', 'deactivate', 'disable', 'إغلاق حساب'], tab: 'accounts', path: 'الحسابات > تعطيل', icon: '⛔' },
    
    // ============= المستخدمين =============
    { keyword: 'إدارة المستخدمين', keywords: ['إدارة', 'مستخدمين', 'موظفين', 'users management', 'manage users'], tab: 'users', path: 'المستخدمين', icon: '👥' },
    { keyword: 'المستخدمين', keywords: ['مستخدم', 'user', 'users', 'موظف', 'موظفين', 'عامل', 'مدير'], tab: 'users', path: 'المستخدمين', icon: '👤' },
    { keyword: 'إضافة مستخدم', keywords: ['مستخدم جديد', 'new user', 'add user', 'موظف جديد'], tab: 'users', path: 'المستخدمين > إضافة', icon: '➕' },
    { keyword: 'كلمة المرور', keywords: ['كلمة السر', 'password', 'رمز', 'سري', 'تغيير كلمة'], tab: 'users', path: 'المستخدمين > كلمة المرور', icon: '🔑' },
    { keyword: 'البريد الإلكتروني', keywords: ['ايميل', 'email', 'بريد', 'mail'], tab: 'users', path: 'المستخدمين > البريد', icon: '📧' },
    
    // ============= الأدوار والصلاحيات =============
    { keyword: 'إدارة الأدوار', keywords: ['إدارة', 'ادوار', 'صلاحيات', 'roles management', 'manage roles'], tab: 'roles', path: 'الأدوار', icon: '👑' },
    { keyword: 'الأدوار', keywords: ['دور', 'role', 'roles', 'صلاحية', 'منصب', 'وظيفة'], tab: 'roles', path: 'الأدوار', icon: '👑' },
    { keyword: 'دور المدير', keywords: ['admin', 'مدير', 'ادمن', 'administrator'], tab: 'roles', path: 'الأدوار > المدير', icon: '🎖️' },
    { keyword: 'دور المحاسب', keywords: ['محاسب', 'accountant', 'مالي'], tab: 'roles', path: 'الأدوار > المحاسب', icon: '🧮' },
    { keyword: 'دور البائع', keywords: ['بائع', 'seller', 'مندوب', 'sales'], tab: 'roles', path: 'الأدوار > البائع', icon: '🛒' },
    
    // ============= الخطط =============
    { keyword: 'إدارة الخطط', keywords: ['خطط', 'plans', 'اشتراك', 'pricing', 'أسعار', 'باقات'], tab: 'plans', path: 'الخطط', icon: '👑' },
    { keyword: 'الخطط', keywords: ['خطة', 'plan', 'اشتراك', 'subscription', 'باقة'], tab: 'plans', path: 'الخطط', icon: '💎' },
    { keyword: 'إضافة خطة', keywords: ['خطة جديدة', 'new plan', 'add plan', 'باقة جديدة'], tab: 'plans', path: 'الخطط > إضافة', icon: '➕' },
    { keyword: 'تعديل خطة', keywords: ['تحرير خطة', 'edit plan', 'update plan', 'تغيير سعر'], tab: 'plans', path: 'الخطط > تعديل', icon: '✏️' },
    { keyword: 'أسعار الاشتراك', keywords: ['سعر', 'price', 'تسعير', 'قيمة', 'رسوم'], tab: 'plans', path: 'الخطط > الأسعار', icon: '💰' },
    
    // ============= السيرفر والاتصال =============
    { keyword: 'السيرفر', keywords: ['سيرفر', 'server', 'api', 'رابط', 'اتصال', 'خادم'], tab: 'server', path: 'إعدادات السيرفر', icon: '🖥️' },
    { keyword: 'رابط API', keywords: ['api url', 'endpoint', 'backend', 'عنوان'], tab: 'server', path: 'إعدادات السيرفر > الرابط', icon: '🔗' },
    { keyword: 'حالة الاتصال', keywords: ['connection', 'متصل', 'online', 'offline', 'منقطع'], tab: 'server', path: 'إعدادات السيرفر > الحالة', icon: '📡' },
    { keyword: 'قاعدة البيانات', keywords: ['database', 'db', 'قاعدة', 'بيانات', 'sql'], tab: 'server', path: 'إعدادات السيرفر > قاعدة البيانات', icon: '🗄️' },
    
    // ============= أدوات النظام =============
    { keyword: 'أدوات النظام', keywords: ['أدوات', 'tools', 'توليد', 'بيانات', 'تجريبي', 'اختبار'], tab: 'tools', path: 'أدوات النظام', icon: '🛠️' },
    { keyword: 'خيارات شاشة الدخول', keywords: ['شاشة الدخول', 'تسجيل الدخول', 'login', 'login screen', 'showDemoLogin', 'showAdminLogin', 'showForgotPassword', 'showRememberMe'], tab: 'tools', path: 'أدوات النظام > شاشة الدخول', icon: '🔐', settingKey: 'login-screen-options' },
    { keyword: 'زر الدخول التجريبي', keywords: ['demo login', 'showDemoLogin', 'مستخدم تجريبي'], tab: 'tools', path: 'أدوات النظام > شاشة الدخول > زر الدخول التجريبي', icon: '✨', settingKey: 'showDemoLogin' },
    { keyword: 'زر دخول الأدمن', keywords: ['admin login', 'showAdminLogin', 'دخول المدير'], tab: 'tools', path: 'أدوات النظام > شاشة الدخول > زر دخول الأدمن', icon: '🛡️', settingKey: 'showAdminLogin' },
    { keyword: 'السماح بالتسجيل', keywords: ['allow registration', 'allowUserRegistration', 'تسجيل مستخدمين جدد'], tab: 'tools', path: 'أدوات النظام > شاشة الدخول > السماح بالتسجيل', icon: '🆕', settingKey: 'allowUserRegistration' },
    { keyword: 'نسيت كلمة المرور', keywords: ['forgot password', 'showForgotPassword', 'استعادة كلمة المرور'], tab: 'tools', path: 'أدوات النظام > شاشة الدخول > نسيت كلمة المرور', icon: '🗝️', settingKey: 'showForgotPassword' },
    { keyword: 'تذكرني', keywords: ['remember me', 'showRememberMe', 'البقاء مسجل'], tab: 'tools', path: 'أدوات النظام > شاشة الدخول > تذكرني', icon: '⏱️', settingKey: 'showRememberMe' },
    { keyword: 'حدود الحروف في شاشة التسجيل', keywords: ['حدود حقول التسجيل', 'حدود الحروف', 'شاشة التسجيل', 'register limits', 'register max length', 'registerUsernameMaxLength', 'registerFullNameMaxLength', 'registerCompanyNameMaxLength', 'registerEmailMaxLength', 'registerPasswordMaxLength'], tab: 'tools', path: 'أدوات النظام > حدود الحروف في شاشة التسجيل', icon: '🧾', settingKey: 'register-field-limits' },
    { keyword: 'حد اسم المستخدم في التسجيل', keywords: ['registerUsernameMaxLength', 'اسم المستخدم', 'حد الحروف', 'شاشة التسجيل'], tab: 'tools', path: 'أدوات النظام > حدود الحروف في شاشة التسجيل > اسم المستخدم', icon: '👤', settingKey: 'registerUsernameMaxLength' },
    { keyword: 'حد الاسم الشخصي في التسجيل', keywords: ['registerFullNameMaxLength', 'الاسم الشخصي', 'حدود الحروف', 'شاشة التسجيل'], tab: 'tools', path: 'أدوات النظام > حدود الحروف في شاشة التسجيل > الاسم الشخصي', icon: '🪪', settingKey: 'registerFullNameMaxLength' },
    { keyword: 'حد اسم الشركة في التسجيل', keywords: ['registerCompanyNameMaxLength', 'اسم الشركة', 'حدود الحروف', 'شاشة التسجيل'], tab: 'tools', path: 'أدوات النظام > حدود الحروف في شاشة التسجيل > اسم الشركة', icon: '🏢', settingKey: 'registerCompanyNameMaxLength' },
    { keyword: 'حد البريد الإلكتروني في التسجيل', keywords: ['registerEmailMaxLength', 'email limit', 'حدود الحروف', 'شاشة التسجيل'], tab: 'tools', path: 'أدوات النظام > حدود الحروف في شاشة التسجيل > البريد الإلكتروني', icon: '📧', settingKey: 'registerEmailMaxLength' },
    { keyword: 'حد كلمة المرور في التسجيل', keywords: ['registerPasswordMaxLength', 'password length', 'حدود الحروف', 'شاشة التسجيل'], tab: 'tools', path: 'أدوات النظام > حدود الحروف في شاشة التسجيل > كلمة المرور', icon: '🔒', settingKey: 'registerPasswordMaxLength' },
    { keyword: 'محاولات الدخول الفاشلة', keywords: ['maxLoginAttempts', 'failed login attempts', 'security'], tab: 'tools', path: 'أدوات النظام > إعدادات الأمان > محاولات الدخول الفاشلة', icon: '🚫', settingKey: 'maxLoginAttempts' },
    { keyword: 'توليد بيانات', keywords: ['mock', 'generate', 'test data', 'بيانات تجريبية', 'تزييف'], tab: 'tools', path: 'أدوات النظام > توليد بيانات', icon: '🎲' },
    { keyword: 'تصدير البيانات', keywords: ['export', 'تصدير', 'backup', 'نسخ', 'حفظ'], tab: 'tools', path: 'أدوات النظام > تصدير', icon: '📤' },
    { keyword: 'استيراد البيانات', keywords: ['import', 'استيراد', 'restore', 'استرجاع', 'تحميل'], tab: 'tools', path: 'أدوات النظام > استيراد', icon: '📥' },
    { keyword: 'النسخ الاحتياطي', keywords: ['backup', 'نسخة', 'حفظ', 'استعادة'], tab: 'tools', path: 'أدوات النظام > النسخ الاحتياطي', icon: '💾' },
    
    // ============= مصفوفة الصلاحيات =============
    { keyword: 'مصفوفة الصلاحيات', keywords: ['مصفوفة', 'matrix', 'permissions', 'جدول صلاحيات'], tab: 'permissions', path: 'مصفوفة الصلاحيات', icon: '📋' },
    { keyword: 'تعيين صلاحيات', keywords: ['منح', 'assign', 'grant', 'إعطاء'], tab: 'permissions', path: 'مصفوفة الصلاحيات > تعيين', icon: '✔️' },
    { keyword: 'صلاحية العمل بدون اتصال', keywords: ['offline', 'بدون اتصال', 'انقطاع', 'عدم الاتصال', 'بلا انترنت'], tab: 'permissions', path: 'مصفوفة الصلاحيات > Offline', icon: '📶' },
    { keyword: 'صلاحية المزامنة', keywords: ['sync', 'مزامنة', 'تزامن', 'synchronization'], tab: 'permissions', path: 'مصفوفة الصلاحيات > المزامنة', icon: '🔄' },
    
    // ============= سجل النشاطات =============
    { keyword: 'سجل النشاطات', keywords: ['سجل', 'نشاط', 'log', 'activity', 'تاريخ', 'logs', 'عمليات'], tab: 'logs', path: 'سجل النشاطات', icon: '📜' },
    { keyword: 'سجل الدخول', keywords: ['تسجيل دخول', 'login', 'signin', 'جلسات'], tab: 'logs', path: 'سجل النشاطات > الدخول', icon: '🚪' },
    { keyword: 'سجل التعديلات', keywords: ['تعديل', 'تغيير', 'edit', 'update', 'modifications'], tab: 'logs', path: 'سجل النشاطات > التعديلات', icon: '📝' },
    { keyword: 'سجل الحذف', keywords: ['حذف', 'إزالة', 'delete', 'remove'], tab: 'logs', path: 'سجل النشاطات > الحذف', icon: '🗑️' },
    
    // ============= الميزات والخصائص =============
    { keyword: 'الفواتير', keywords: ['فاتورة', 'invoice', 'بيع', 'شراء', 'فواتير'], tab: 'general', path: 'الميزات > الفواتير', icon: '🧾' },
    { keyword: 'المنتجات', keywords: ['منتج', 'product', 'سلعة', 'بضاعة', 'مخزون'], tab: 'general', path: 'الميزات > المنتجات', icon: '📦' },
    { keyword: 'العملاء', keywords: ['عميل', 'customer', 'زبون', 'مشتري'], tab: 'general', path: 'الميزات > العملاء', icon: '👥' },
    { keyword: 'التقارير', keywords: ['تقرير', 'report', 'إحصائيات', 'statistics', 'تحليل'], tab: 'general', path: 'الميزات > التقارير', icon: '📊' },
    { keyword: 'الإشعارات', keywords: ['إشعار', 'notification', 'تنبيه', 'رسالة'], tab: 'general', path: 'الميزات > الإشعارات', icon: '🔔' },
    { keyword: 'الرسائل', keywords: ['رسالة', 'message', 'تواصل', 'محادثة', 'chat'], tab: 'general', path: 'الميزات > الرسائل', icon: '💬' },
    
    // ============= إعدادات إضافية =============
    { keyword: 'الطباعة', keywords: ['طباعة', 'print', 'ورقة', 'a4', 'pdf'], tab: 'general', path: 'عام > الطباعة', icon: '🖨️' },
    { keyword: 'الإيصالات', keywords: ['إيصال', 'receipt', 'سند', 'قبض'], tab: 'general', path: 'عام > الإيصالات', icon: '🧾' },
    { keyword: 'الضرائب', keywords: ['ضريبة', 'tax', 'vat', 'قيمة مضافة'], tab: 'general', path: 'عام > الضرائب', icon: '💵' },
    { keyword: 'الخصومات', keywords: ['خصم', 'discount', 'تخفيض', 'عرض'], tab: 'general', path: 'عام > الخصومات', icon: '🏷️' },
    
    // ============= وضع عدم الاتصال (Offline Mode) =============
    { keyword: 'وضع عدم الاتصال', keywords: ['offline', 'اوفلاين', 'بدون انترنت', 'انقطاع', 'مزامنة'], tab: 'tools', path: 'أدوات > Offline Mode', icon: '📡' },
    { keyword: 'Offline Mode', keywords: ['offline', 'mode', 'اوفلاين', 'مود'], tab: 'tools', path: 'أدوات > Offline Mode', icon: '🌐' },
    { keyword: 'المزامنة', keywords: ['مزامنة', 'sync', 'synchronize', 'تحديث', 'رفع'], tab: 'tools', path: 'أدوات > المزامنة', icon: '🔄' },
    { keyword: 'العمل بدون انترنت', keywords: ['انترنت', 'internet', 'شبكة', 'اتصال', 'network'], tab: 'tools', path: 'أدوات > Offline Mode', icon: '📴' },
    { keyword: 'التخزين المحلي', keywords: ['تخزين', 'local', 'storage', 'محلي', 'ذاكرة'], tab: 'tools', path: 'أدوات > التخزين', icon: '💾' },
  ];

  const availableSettingsTabs = new Set<TabType>(tabs.map(tab => tab.id as TabType));

  useEffect(() => {
    if (!normalizedSettingsSearch) {
      setComponentSearchResults(prev => (prev.length > 0 ? [] : prev));
      return;
    }

    const container = settingsContentRef.current;
    if (!container) {
      setComponentSearchResults(prev => (prev.length > 0 ? [] : prev));
      return;
    }

    const activeTabLabel = tabs.find(tab => tab.id === activeTab)?.label || activeTab;
    const animationFrame = window.requestAnimationFrame(() => {
      const candidates = Array.from(
        container.querySelectorAll<HTMLElement>('[data-search-setting], h2, h3, h4, label, button, th, td, p')
      );

      const uniqueKeys = new Set<string>();
      const uiResults: SettingsSearchResult[] = [];

      for (const element of candidates) {
        if (uiResults.length >= 12) {
          break;
        }

        const isVisible = element.getClientRects().length > 0;
        if (!isVisible) {
          continue;
        }

        const rawText = (element.textContent || '').replace(/\s+/g, ' ').trim();
        if (rawText.length < 3) {
          continue;
        }

        const settingKey = element.getAttribute('data-search-setting') || undefined;
        const extraKeywords = element.getAttribute('data-search-keywords') || '';
        if (!matchesSettingsSearch(rawText, extraKeywords, settingKey || '')) {
          continue;
        }

        const keyword = rawText.length > 70 ? `${rawText.slice(0, 67)}...` : rawText;
        const uniqueKey = `${activeTab}|${settingKey || ''}|${keyword.toLowerCase()}`;
        if (uniqueKeys.has(uniqueKey)) {
          continue;
        }

        uniqueKeys.add(uniqueKey);
        uiResults.push({
          keyword,
          keywords: [extraKeywords, settingKey || '', rawText].filter(Boolean),
          tab: activeTab,
          path: `${activeTabLabel} > مكونات الواجهة`,
          icon: '🧩',
          selector: settingKey ? `[data-search-setting="${settingKey}"]` : undefined,
          settingKey,
        });
      }

      setComponentSearchResults(prev => {
        if (prev.length === uiResults.length) {
          const prevSignature = prev
            .map(item => `${item.tab}|${item.settingKey || ''}|${item.selector || ''}|${item.keyword}`)
            .join('||');
          const nextSignature = uiResults
            .map(item => `${item.tab}|${item.settingKey || ''}|${item.selector || ''}|${item.keyword}`)
            .join('||');

          if (prevSignature === nextSignature) {
            return prev;
          }
        }

        return uiResults;
      });
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [activeTab, normalizedSettingsSearch, tabs, matchesSettingsSearch]);

  const tabSearchResults: SettingsSearchResult[] = normalizedSettingsSearch
    ? tabs
        .filter(tab => matchesSettingsSearch(tab.label, tab.id))
        .map(tab => ({
          keyword: tab.label,
          keywords: [tab.id],
          tab: tab.id as TabType,
          path: `التبويبات > ${tab.label}`,
          icon: '📑',
        }))
    : [];

  const dynamicAccountResults: SettingsSearchResult[] = normalizedSettingsSearch && availableSettingsTabs.has('accounts')
    ? accounts
        .filter(acc => matchesSettingsSearch(acc.name, acc.nameEn, acc.email))
        .map(acc => ({
          keyword: acc.name,
          keywords: [acc.nameEn || '', acc.email || ''],
          tab: 'accounts',
          path: `الحسابات > ${acc.name}`,
          icon: '🏢',
          accountId: acc.id
        }))
    : [];

  const dynamicUserResults: SettingsSearchResult[] = normalizedSettingsSearch && availableSettingsTabs.has('users')
    ? users
        .filter(u => matchesSettingsSearch(u.fullName, u.username, u.email))
        .map(u => ({
          keyword: u.fullName,
          keywords: [u.username, u.email || ''],
          tab: 'users',
          path: `المستخدمين > ${u.fullName}`,
          icon: '👤',
          userId: u.id
        }))
    : [];

  const dynamicRoleResults: SettingsSearchResult[] = normalizedSettingsSearch && availableSettingsTabs.has('roles')
    ? roles
        .filter(r => matchesSettingsSearch(r.name, r.nameEn))
        .map(r => ({
          keyword: r.name,
          keywords: [r.nameEn || ''],
          tab: 'roles',
          path: `الأدوار > ${r.name}`,
          icon: '👑',
          roleId: r.id
        }))
    : [];

  const dynamicPlanResults: SettingsSearchResult[] = normalizedSettingsSearch && availableSettingsTabs.has('plans')
    ? plans
        .filter(p => matchesSettingsSearch(p.name, p.nameEn, p.description))
        .map(p => ({
          keyword: p.name,
          keywords: [p.nameEn || '', p.description || ''],
          tab: 'plans',
          path: `الخطط > ${p.name}`,
          icon: '💎',
          planId: p.id
        }))
    : [];

  const dynamicLogResults: SettingsSearchResult[] = normalizedSettingsSearch && availableSettingsTabs.has('logs')
    ? activityLogs
        .filter(log => matchesSettingsSearch(log.action, log.entityType, log.entityName, log.description, log.descriptionEn, log.ipAddress))
        .map(log => ({
          keyword: log.entityName || log.action || 'سجل نشاط',
          keywords: [log.action || '', log.entityType || '', log.description || ''],
          tab: 'logs',
          path: `سجل النشاطات > ${log.action || 'عنصر'}`,
          icon: '📜',
          logId: log.id,
        }))
    : [];

  const permissionModuleResults: SettingsSearchResult[] = normalizedSettingsSearch && availableSettingsTabs.has('permissions')
    ? SYSTEM_MODULES
        .filter(module => matchesSettingsSearch(module.name, module.id, module.category))
        .map(module => ({
          keyword: module.name,
          keywords: [module.id, module.category],
          tab: 'permissions',
          path: `مصفوفة الصلاحيات > ${module.name}`,
          icon: '🔐',
          permissionCategory: module.category as 'pages' | 'menu' | 'tabs' | 'actions' | 'features',
        }))
    : [];

  const staticSearchResults: SettingsSearchResult[] = normalizedSettingsSearch
    ? searchableSettings
        .filter(item => availableSettingsTabs.has(item.tab))
        .filter(item => matchesSettingsSearch(item.keyword, item.path, ...item.keywords))
        .map(item => ({
          ...item,
          selector: item.settingKey ? `[data-search-setting="${item.settingKey}"]` : undefined,
        }))
    : [];

  const searchResults: SettingsSearchResult[] = normalizedSettingsSearch
    ? [
        ...tabSearchResults.slice(0, 6),
        ...dynamicAccountResults.slice(0, 6),
        ...dynamicUserResults.slice(0, 6),
        ...dynamicRoleResults.slice(0, 6),
        ...dynamicPlanResults.slice(0, 6),
        ...dynamicLogResults.slice(0, 6),
        ...permissionModuleResults.slice(0, 10),
        ...componentSearchResults.slice(0, 12),
        ...staticSearchResults.slice(0, 20),
      ]
    : [];

  const uniqueSearchResults = Array.from(
    new Map(searchResults.map(result => [`${result.tab}|${result.path}|${result.keyword}|${result.selector || ''}`, result])).values()
  );

  const normalizedAssignmentSearch = assignmentSearch.trim().toLowerCase();
  const filteredBrandAssignments = brandAssignments.filter((assignment) => {
    if (assignmentFilterMode !== 'all' && assignment.mode !== assignmentFilterMode) {
      return false;
    }

    if (assignmentFilterStatus === 'enabled' && assignment.enabled === false) {
      return false;
    }
    if (assignmentFilterStatus === 'disabled' && assignment.enabled !== false) {
      return false;
    }

    if (assignmentFilterAccountId !== 'all') {
      const currentAccountId = assignment.accountId ? String(assignment.accountId) : '';
      if (currentAccountId !== assignmentFilterAccountId) {
        return false;
      }
    }

    if (!normalizedAssignmentSearch) {
      return true;
    }

    const identityName = brandIdentities.find(item => item.id === assignment.identityId)?.name || '';
    const accountName = accounts.find(item => item.id === assignment.accountId)?.name || '';
    const haystack = [
      identityName,
      accountName,
      assignment.notes || '',
      getModeLabel(assignment.mode),
    ].join(' ').toLowerCase();

    return haystack.includes(normalizedAssignmentSearch);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-100 dark:border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <SettingsIcon className="text-primary" />
              الإعدادات
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              إدارة إعدادات النظام والمستخدمين والصلاحيات
            </p>
          </div>
          
          {/* شريط البحث */}
          <div className="relative w-full md:w-72">
            <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              value={settingsSearch}
              onChange={(e) => setSettingsSearch(e.target.value)}
              placeholder="بحث في الإعدادات..."
              className="w-full pr-10 pl-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400"
            />
            
            {/* نتائج البحث */}
            {uniqueSearchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 max-h-80 overflow-y-auto">
                <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {uniqueSearchResults.length} نتيجة
                  </span>
                </div>
                {uniqueSearchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      let targetSelector: string | undefined = result.selector;
                      if (!targetSelector && result.accountId) {
                        targetSelector = `[data-search-account-id=\"${result.accountId}\"]`;
                      } else if (!targetSelector && result.userId) {
                        targetSelector = `[data-search-user-id=\"${result.userId}\"]`;
                      } else if (!targetSelector && result.roleId) {
                        targetSelector = `[data-search-role-id=\"${result.roleId}\"]`;
                      } else if (!targetSelector && result.planId) {
                        targetSelector = `[data-search-plan-id=\"${result.planId}\"]`;
                      } else if (!targetSelector && result.logId) {
                        targetSelector = `[data-search-log-id=\"${result.logId}\"]`;
                      }

                      setActiveTab(result.tab);
                      setPendingSearchNavigation({ tab: result.tab, keyword: result.keyword, selector: targetSelector });
                      setSettingsSearch('');

                      if (result.tab === 'accounts') {
                        setAccountSearch(result.keyword);
                      } else if (result.tab === 'users') {
                        setUserSearch(result.keyword);
                      } else if (result.tab === 'roles') {
                        setRoleSearch(result.keyword);
                      } else if (result.tab === 'plans') {
                        setPlanSearch(result.keyword);
                      } else if (result.tab === 'logs') {
                        setLogsSearch(result.keyword);
                      } else if (result.tab === 'permissions' && result.permissionCategory) {
                        setSelectedCategory(result.permissionCategory);
                      }
                    }}
                    className="w-full px-4 py-3 text-right hover:bg-primary/10 dark:hover:bg-primary/20 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{result.icon}</span>
                      <span className="font-medium text-slate-800 dark:text-white">{result.keyword}</span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                      <ChevronRight size={12} />
                      {result.path}
                    </span>
                  </button>
                ))}
              </div>
            )}
            
            {settingsSearch.trim() && uniqueSearchResults.length === 0 && (
              <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 p-4 text-center text-slate-500 dark:text-slate-400">
                لا توجد نتائج
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div ref={settingsContentRef} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        
        {/* ==================== General Tab ==================== */}
        {activeTab === 'general' && (
          <div className="p-6 space-y-6">
            {/* Theme */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="flex items-center gap-3">
                {isDarkMode ? <Moon className="text-indigo-500" /> : <Sun className="text-amber-500" />}
                <div>
                  <h3 className="font-medium text-slate-800 dark:text-white">المظهر</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {isDarkMode ? 'الوضع الداكن' : 'الوضع الفاتح'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isDarkMode ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>

            {/* Currency */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-4">
              <div className="flex items-center gap-3">
                <Globe className="text-emerald-500" />
                <div>
                  <h3 className="font-medium text-slate-800 dark:text-white">العملة الافتراضية</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">اختر العملة المستخدمة في الفواتير</p>
                </div>
              </div>
              
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
              >
                {availableCurrencies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <form onSubmit={handleAddCurrency} className="flex gap-2">
                <input
                  type="text"
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value)}
                  placeholder="إضافة عملة جديدة..."
                  className="flex-1 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <Plus size={18} />
                </button>
              </form>
            </div>

            {/* Brand Identities */}
            {isAdmin && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-4 border border-slate-200/70 dark:border-slate-700/70">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Palette className="text-primary" />
                    <div>
                      <h3 className="font-medium text-slate-800 dark:text-white">الهويات اللونية</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">إضافة وتعديل وتخصيص الهوية حسب الحساب أو الفترة الزمنية</p>
                    </div>
                  </div>
                  <div className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm">
                    <span className="text-slate-500 dark:text-slate-400 ml-1">الهوية النشطة الآن:</span>
                    <span className="font-medium text-slate-800 dark:text-white">{activeBrandIdentity?.name || 'غير محددة'}</span>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">الهويات المتاحة</h4>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {brandIdentities.map(identity => (
                        <div key={identity.id} className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-medium text-slate-800 dark:text-white">{identity.name}</h5>
                                {identity.isBuiltIn && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                    افتراضية
                                  </span>
                                )}
                              </div>
                              {identity.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{identity.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditIdentity(identity)}
                                className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                title="تعديل"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteIdentity(identity)}
                                disabled={identity.isBuiltIn}
                                className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
                                title="حذف"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-1.5 mt-3">
                            {[identity.palette.primary, identity.palette.secondary, identity.palette.success, identity.palette.danger, identity.palette.warning].map((color, idx) => (
                              <span
                                key={`${identity.id}_${idx}`}
                                className="w-6 h-6 rounded-md border border-slate-300/80 dark:border-slate-600"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {editingIdentityId ? 'تعديل الهوية' : 'إضافة هوية جديدة'}
                    </h4>
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                      <input
                        type="text"
                        value={identityFormData.name}
                        onChange={(e) => setIdentityFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="اسم الهوية"
                        className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      />
                      <input
                        type="text"
                        value={identityFormData.description}
                        onChange={(e) => setIdentityFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="وصف مختصر (اختياري)"
                        className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { key: 'primary', label: 'Primary' },
                          { key: 'secondary', label: 'Secondary' },
                          { key: 'success', label: 'Success' },
                          { key: 'danger', label: 'Danger' },
                          { key: 'warning', label: 'Warning' },
                        ].map(field => (
                          <div key={field.key} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                            <input
                              type="color"
                              value={identityFormData[field.key as keyof typeof identityFormData] as string}
                              onChange={(e) => setIdentityFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                              className="w-10 h-9 p-0 border-0 bg-transparent"
                            />
                            <div className="flex-1">
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">{field.label}</p>
                              <input
                                type="text"
                                value={identityFormData[field.key as keyof typeof identityFormData] as string}
                                onChange={(e) => setIdentityFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                className="w-full text-sm bg-transparent text-slate-700 dark:text-slate-200 outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleSaveIdentity}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
                        >
                          <Save size={16} />
                          {editingIdentityId ? 'حفظ التعديل' : 'إضافة الهوية'}
                        </button>
                        {editingIdentityId && (
                          <button
                            onClick={resetIdentityForm}
                            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
                          >
                            إلغاء
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">تخصيص الهوية للحساب أو الفترة</h4>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2">
                    <select
                      value={assignmentFormData.identityId}
                      onChange={(e) => setAssignmentFormData(prev => ({ ...prev, identityId: e.target.value }))}
                      className="p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    >
                      <option value="">اختر الهوية</option>
                      {brandIdentities.map(identity => (
                        <option key={identity.id} value={identity.id}>{identity.name}</option>
                      ))}
                    </select>

                    <select
                      value={assignmentFormData.mode}
                      onChange={(e) => setAssignmentFormData(prev => ({ ...prev, mode: e.target.value as BrandAssignmentMode }))}
                      className="p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    >
                      <option value="global">عام</option>
                      <option value="account">حسب الحساب</option>
                      <option value="time">حسب الفترة</option>
                      <option value="account_time">حسب الحساب والفترة</option>
                    </select>

                    {(assignmentFormData.mode === 'account' || assignmentFormData.mode === 'account_time') && (
                      <select
                        value={assignmentFormData.accountId}
                        onChange={(e) => setAssignmentFormData(prev => ({ ...prev, accountId: e.target.value }))}
                        className="p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                      >
                        <option value="">اختر الحساب</option>
                        {accounts.map(account => (
                          <option key={account.id} value={account.id}>{account.name}</option>
                        ))}
                      </select>
                    )}

                    <input
                      type="number"
                      value={assignmentFormData.priority}
                      onChange={(e) => setAssignmentFormData(prev => ({ ...prev, priority: Number(e.target.value) }))}
                      placeholder="الأولوية"
                      className="p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    />
                  </div>

                  {(assignmentFormData.mode === 'time' || assignmentFormData.mode === 'account_time') && (
                    <div className="grid md:grid-cols-2 gap-2">
                      <input
                        type="datetime-local"
                        value={assignmentFormData.startAt}
                        onChange={(e) => setAssignmentFormData(prev => ({ ...prev, startAt: e.target.value }))}
                        className="p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                      />
                      <input
                        type="datetime-local"
                        value={assignmentFormData.endAt}
                        onChange={(e) => setAssignmentFormData(prev => ({ ...prev, endAt: e.target.value }))}
                        className="p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                      />
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row md:items-center gap-2">
                    <input
                      type="text"
                      value={assignmentFormData.notes}
                      onChange={(e) => setAssignmentFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="ملاحظات (اختياري)"
                      className="flex-1 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={assignmentFormData.enabled}
                        onChange={(e) => setAssignmentFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="rounded border-slate-300 dark:border-slate-600"
                      />
                      مفعل
                    </label>
                    <button
                      onClick={handleSaveAssignment}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      {editingAssignmentId ? 'حفظ التخصيص' : 'إضافة تخصيص'}
                    </button>
                    {editingAssignmentId && (
                      <button
                        onClick={resetAssignmentForm}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-2">
                      <input
                        type="text"
                        value={assignmentSearch}
                        onChange={(e) => setAssignmentSearch(e.target.value)}
                        placeholder="بحث في التخصيصات..."
                        className="p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                      />
                      <select
                        value={assignmentFilterMode}
                        onChange={(e) => setAssignmentFilterMode(e.target.value as 'all' | BrandAssignmentMode)}
                        className="p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                      >
                        <option value="all">كل الأوضاع</option>
                        <option value="global">عام</option>
                        <option value="account">حسب الحساب</option>
                        <option value="time">حسب الفترة</option>
                        <option value="account_time">حسب الحساب والفترة</option>
                      </select>
                      <select
                        value={assignmentFilterStatus}
                        onChange={(e) => setAssignmentFilterStatus(e.target.value as 'all' | 'enabled' | 'disabled')}
                        className="p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                      >
                        <option value="all">كل الحالات</option>
                        <option value="enabled">مفعل</option>
                        <option value="disabled">معطل</option>
                      </select>
                      <select
                        value={assignmentFilterAccountId}
                        onChange={(e) => setAssignmentFilterAccountId(e.target.value)}
                        className="p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                      >
                        <option value="all">كل الحسابات</option>
                        {accounts.map(account => (
                          <option key={account.id} value={account.id}>{account.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          setAssignmentSearch('');
                          setAssignmentFilterMode('all');
                          setAssignmentFilterStatus('all');
                          setAssignmentFilterAccountId('all');
                        }}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
                      >
                        تصفير الفلاتر
                      </button>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      عرض {filteredBrandAssignments.length} من {brandAssignments.length} تخصيص
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {filteredBrandAssignments.map(assignment => {
                      const identity = brandIdentities.find(item => item.id === assignment.identityId);
                      const account = accounts.find(item => item.id === assignment.accountId);
                      return (
                        <div key={assignment.id} className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-semibold text-slate-800 dark:text-white">{identity?.name || assignment.identityId}</span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px]">
                                  {getModeLabel(assignment.mode)}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[11px] ${assignment.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                                  {assignment.enabled ? 'مفعل' : 'معطل'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-3">
                                <span>أولوية: {assignment.priority}</span>
                                {account && <span>حساب: {account.name}</span>}
                                {assignment.startAt && <span>من: {new Date(assignment.startAt).toLocaleString('ar-EG')}</span>}
                                {assignment.endAt && <span>إلى: {new Date(assignment.endAt).toLocaleString('ar-EG')}</span>}
                              </div>
                              {assignment.notes && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{assignment.notes}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditAssignment(assignment)}
                                className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                title="تعديل"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="حذف"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredBrandAssignments.length === 0 && (
                      <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
                        لا توجد تخصيصات مطابقة للفلاتر الحالية
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* بيانات الحساب */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="text-primary" />
                  <div>
                    <h3 className="font-medium text-slate-800 dark:text-white">بيانات الحساب</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">معلومات الشركة/المنشأة الحالية</p>
                  </div>
                </div>
                {accountsLoading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
              </div>

              {currentAccount ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-4 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    {currentAccount.logoUrl ? (
                      <img 
                        src={currentAccount.logoUrl} 
                        alt={currentAccount.name}
                        className="w-14 h-14 rounded-lg object-cover border-2 border-slate-200 dark:border-slate-600"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <span className="text-xl font-bold text-primary">{currentAccount.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800 dark:text-white">{currentAccount.name}</h4>
                      {currentAccount.nameEn && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{currentAccount.nameEn}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      currentAccount.isActive 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {currentAccount.isActive ? 'نشط' : 'معطل'}
                    </span>
                  </div>

                  <div className="space-y-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    {currentAccount.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail size={14} className="text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-300">{currentAccount.email}</span>
                      </div>
                    )}
                    {currentAccount.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone size={14} className="text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-300">{currentAccount.phone}</span>
                      </div>
                    )}
                    {currentAccount.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin size={14} className="text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-300">{removeCoordinateTokenFromAddress(currentAccount.address)}</span>
                      </div>
                    )}
                    {currentAccount.taxNumber && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText size={14} className="text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-300">الرقم الضريبي: {currentAccount.taxNumber}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-500 dark:text-slate-400">الباقة</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        currentAccount.plan === 'Enterprise' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        currentAccount.plan === 'Professional' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        currentAccount.plan === 'Basic' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {currentAccount.plan === 'Trial' ? 'تجريبي' : 
                         currentAccount.plan === 'Basic' ? 'أساسي' :
                         currentAccount.plan === 'Professional' ? 'احترافي' :
                         currentAccount.plan === 'Enterprise' ? 'مؤسسي' : currentAccount.plan}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">العملة</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{currentAccount.currency}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-slate-500 dark:text-slate-400">عدد المستخدمين</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{currentAccount.usersCount}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-500 dark:text-slate-400">تاريخ الإنشاء</span>
                      <span className="text-sm text-slate-700 dark:text-slate-200">
                        {new Date(currentAccount.createdAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    {currentAccount.subscriptionExpiry && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">انتهاء الاشتراك</span>
                        <span className={`text-sm font-medium ${
                          new Date(currentAccount.subscriptionExpiry) < new Date() 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-slate-700 dark:text-slate-200'
                        }`}>
                          {new Date(currentAccount.subscriptionExpiry).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                  {accountsLoading ? 'جاري تحميل البيانات...' : 'لا توجد بيانات للحساب'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== Accounts Tab ==================== */}
        {activeTab === 'accounts' && isAdmin && (
          <div className="p-6 space-y-4">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">إدارة الحسابات</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">إدارة حسابات الشركات والمنشآت</p>
              </div>
              
              <div className="flex gap-2">
                {/* شريط البحث في الحسابات */}
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    placeholder="بحث في الحسابات..."
                    className="w-48 pr-9 pl-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400"
                  />
                  {accountSearch && (
                    <button
                      onClick={() => setAccountSearch('')}
                      className="absolute left-2 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button
                  onClick={loadAccounts}
                  disabled={accountsLoading}
                  className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
                >
                  <RefreshCw size={18} className={accountsLoading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => {
                    resetAccountForm();
                    setShowAccountModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <Plus size={18} />
                  إضافة حساب
                </button>
              </div>
            </div>

            {/* Accounts Grid */}
            {accountsLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {accounts
                  .filter(account => 
                    !accountSearch.trim() ||
                    account.name.toLowerCase().includes(accountSearch.toLowerCase()) ||
                    account.nameEn?.toLowerCase().includes(accountSearch.toLowerCase()) ||
                    account.email?.toLowerCase().includes(accountSearch.toLowerCase())
                  )
                  .map(account => (
                  <div
                    key={account.id}
                    data-search-account-id={account.id}
                    className="p-5 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary dark:hover:border-primary transition-all hover:shadow-lg cursor-pointer group"
                    onClick={() => openEditAccountModal(account)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* صورة/شعار الحساب مع إمكانية التغيير */}
                        <div className="relative">
                          <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-600 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center group-hover:border-primary transition-colors">
                            {account.logoUrl ? (
                              <img 
                                src={account.logoUrl} 
                                alt={account.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // إذا فشل تحميل الصورة، أظهر الحرف الأول
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-xl font-bold text-primary dark:text-blue-400">${account.name.charAt(0)}</span>`;
                                }}
                              />
                            ) : (
                              <span className="text-xl font-bold text-primary dark:text-blue-400">
                                {account.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          {/* أيقونة الكاميرا عند التمرير */}
                          <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ImageIcon size={20} className="text-white" />
                          </div>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 dark:text-white">{account.name}</h3>
                          {account.nameEn && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">{account.nameEn}</p>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        account.isActive
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {account.isActive ? 'نشط' : 'معطل'}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      {account.email && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Mail size={14} />
                          <span>{account.email}</span>
                        </div>
                      )}
                      {account.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Phone size={14} />
                          <span>{account.phone}</span>
                        </div>
                      )}
                      {/* عدد المستخدمين مع زر التوسيع */}
                      <div 
                        className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 cursor-pointer hover:text-primary dark:hover:text-blue-400 transition-colors"
                        onClick={(e) => { e.stopPropagation(); toggleAccountExpansion(account.id); }}
                      >
                        <div className="flex items-center gap-2">
                          <Users size={14} />
                          <span>{account.usersCount} مستخدم</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-medium">
                          <span>
                            {expandedAccountIds.includes(account.id) ? 'طي التفاصيل' : 'فرد التفاصيل'}
                          </span>
                          <ChevronDown 
                            size={16} 
                            className={`transition-transform ${expandedAccountIds.includes(account.id) ? 'rotate-180' : ''}`} 
                          />
                        </div>
                      </div>
                      
                      {/* قائمة المستخدمين عند التوسيع */}
                      {expandedAccountIds.includes(account.id) && (
                        <div className="mt-2 mr-4 pr-2 border-r-2 border-primary/30">
                          <div className="mb-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600/60 space-y-1">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-slate-500 dark:text-slate-400">الدور</span>
                              <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[60%]">
                                {(() => {
                                  const usersInAccount = accountUsersMap[account.id] || [];
                                  const primaryUser = usersInAccount.find(u => u.isSuperAdmin) || usersInAccount[0];
                                  if (!primaryUser) return '-';
                                  if (primaryUser.isSuperAdmin) return 'Admin';
                                  return primaryUser.roles?.[0]?.name || primaryUser.roles?.[0]?.nameEn || 'NewAcount';
                                })()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-slate-500 dark:text-slate-400">المجموعة</span>
                              <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[60%]">
                                {(() => {
                                  const usersInAccount = accountUsersMap[account.id] || [];
                                  const hasAdmin = usersInAccount.some(u => u.isSuperAdmin);
                                  return hasAdmin ? 'مجموعة الإدارة' : 'مجموعة الحسابات';
                                })()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-slate-500 dark:text-slate-400">اسم الحساب / الشركة</span>
                              <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[60%]">{account.name}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-slate-500 dark:text-slate-400">اسم المستخدم</span>
                              <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[60%]">
                                {(() => {
                                  const usersInAccount = accountUsersMap[account.id] || [];
                                  const primaryUser = usersInAccount.find(u => u.isSuperAdmin) || usersInAccount[0];
                                  return primaryUser?.username || '-';
                                })()}
                              </span>
                            </div>
                          </div>

                          {accountUsersLoading[account.id] ? (
                            <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                              <Loader2 size={12} className="animate-spin" />
                              <span>جاري التحميل...</span>
                            </div>
                          ) : accountUsersMap[account.id]?.length > 0 ? (
                            <div className="space-y-1.5">
                              {accountUsersMap[account.id].map(u => (
                                <div 
                                  key={u.id} 
                                  className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-700/50 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-medium">
                                      {u.fullName?.charAt(0) || u.username.charAt(0)}
                                    </div>
                                    <div>
                                      <span className="font-medium text-slate-700 dark:text-slate-300">{u.fullName || u.username}</span>
                                      <span className="text-slate-400 mr-1">({u.username})</span>
                                    </div>
                                  </div>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                    u.isActive 
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  }`}>
                                    {u.isActive ? 'نشط' : 'معطل'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-2 text-xs text-slate-400">لا يوجد مستخدمين</div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <CreditCard size={14} />
                        <span>الخطة: {account.plan}</span>
                      </div>
                      {account.subscriptionExpiry && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Calendar size={14} />
                          <span>ينتهي: {formatDate(account.subscriptionExpiry)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleAccountStatus(account); }}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 text-sm rounded-lg transition-colors ${
                          account.isActive 
                            ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30' 
                            : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'
                        }`}
                      >
                        {account.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {account.isActive ? 'تعطيل' : 'تفعيل'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditAccountModal(account); }}
                        className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      >
                        <Edit2 size={14} />
                        تعديل
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteAccount(account); }}
                        className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                        حذف
                      </button>
                    </div>
                  </div>
                ))}

                {accounts.length === 0 && (
                  <div className="col-span-full p-12 text-center text-slate-400">
                    <Building className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>لا توجد حسابات</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== Users Tab ==================== */}
        {activeTab === 'users' && (
          <div className="p-6 space-y-4">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="relative flex-1 w-full sm:max-w-xs">
                <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="بحث عن مستخدم..."
                  className="w-full pr-10 pl-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                />
              </div>
              
              <div className="flex gap-2 items-center">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <button
                    onClick={() => setUsersViewMode('table')}
                    className={`p-1.5 rounded transition-all ${usersViewMode === 'table' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    title="عرض جدول"
                  >
                    <List size={18} />
                  </button>
                  <button
                    onClick={() => setUsersViewMode('grid')}
                    className={`p-1.5 rounded transition-all ${usersViewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    title="عرض شبكي"
                  >
                    <Grid3X3 size={18} />
                  </button>
                </div>
                
                <button
                  onClick={loadUsers}
                  disabled={usersLoading}
                  className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
                >
                  <RefreshCw size={18} className={usersLoading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => {
                    resetUserForm();
                    setShowUserModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <Plus size={18} />
                  إضافة مستخدم
                </button>
              </div>
            </div>

            {/* Users Content */}
            {usersLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : usersViewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-sm">
                    <tr>
                      <th className="p-4 font-medium">المستخدم</th>
                      <th className="p-4 font-medium">الحساب</th>
                      <th className="p-4 font-medium">البريد</th>
                      <th className="p-4 font-medium">الأدوار</th>
                      <th className="p-4 font-medium">الحالة</th>
                      <th className="p-4 font-medium">آخر دخول</th>
                      <th className="p-4 font-medium text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredUsers.map(u => (
                      <tr key={u.id} data-search-user-id={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                              {u.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 dark:text-white">{u.fullName}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">@{u.username}</p>
                              {u.jobTitle && (
                                <p className="text-xs text-slate-400 dark:text-slate-500">{u.jobTitle}</p>
                              )}
                            </div>
                            {u.isSuperAdmin && (
                              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">
                                مدير
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-lg">
                            {u.accountName || `حساب #${u.accountId}`}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">
                          {u.email || '-'}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {u.roles?.map(role => (
                              <span
                                key={role.id}
                                className="px-2 py-0.5 text-xs rounded-full"
                                style={{ 
                                  backgroundColor: `${role.color}20`, 
                                  color: role.color 
                                }}
                              >
                                {role.name}
                              </span>
                            ))}
                            {(!u.roles || u.roles.length === 0) && (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {u.isLocked ? (
                              <span className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full">
                                <Lock size={12} />
                                مقفل
                              </span>
                            ) : u.isActive ? (
                              <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                                <Check size={12} />
                                نشط
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-full">
                                <X size={12} />
                                معطل
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 text-sm">
                          {u.lastLoginAt 
                            ? formatDateTime(u.lastLoginAt)
                            : 'لم يسجل دخول'
                          }
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => openEditUserModal(u)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                              title="تعديل"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setShowPasswordModal(true);
                              }}
                              className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg"
                              title="تغيير كلمة المرور"
                            >
                              <Key size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                // توليد كلمة مرور عشوائية
                                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
                                let pwd = '';
                                for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
                                setGeneratedPassword(pwd);
                                setShowViewPasswordModal(true);
                              }}
                              className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg"
                              title="عرض/توليد كلمة مرور"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`p-2 rounded-lg ${
                                u.isActive 
                                  ? 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700' 
                                  : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'
                              }`}
                              title={u.isActive ? 'تعطيل' : 'تفعيل'}
                            >
                              {u.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                            </button>
                            <button
                              onClick={() => handleToggleUserLock(u)}
                              className={`p-2 rounded-lg ${
                                u.isLocked 
                                  ? 'text-green-600 hover:text-green-800' 
                                  : 'text-red-600 hover:text-red-800'
                              }`}
                              title={u.isLocked ? 'فتح القفل' : 'قفل'}
                            >
                              {u.isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-2 text-red-600 hover:text-red-800 rounded-lg"
                              title="حذف"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          لا يوجد مستخدمين
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Grid View for Users */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map(u => (
                  <div key={u.id} data-search-user-id={u.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-white">{u.fullName}</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400">@{u.username}</p>
                          {u.jobTitle && (
                            <p className="text-xs text-slate-400">{u.jobTitle}</p>
                          )}
                        </div>
                      </div>
                      {u.isSuperAdmin && <Crown size={18} className="text-amber-500" />}
                    </div>

                    {/* اسم الحساب */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <Building2 size={12} />
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                        {u.accountName || `حساب #${u.accountId}`}
                      </span>
                    </div>
                    
                    {u.email && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                        <Mail size={12} />
                        {u.email}
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {u.roles?.map(role => (
                        <span
                          key={role.id}
                          className="px-2 py-0.5 text-xs rounded-full"
                          style={{ backgroundColor: `${role.color}20`, color: role.color }}
                        >
                          {role.name}
                        </span>
                      ))}
                      {(!u.roles || u.roles.length === 0) && (
                        <span className="text-slate-400 text-xs">بدون دور</span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
                      <span className={`text-xs font-medium ${
                        u.isLocked ? 'text-red-600 dark:text-red-400' :
                        u.isActive ? 'text-emerald-600 dark:text-emerald-400' :
                        'text-slate-500 dark:text-slate-400'
                      }`}>
                        {u.isLocked ? 'مقفل' : u.isActive ? 'نشط' : 'معطل'}
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => openEditUserModal(u)} className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400" title="تعديل">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => { setSelectedUser(u); setShowPasswordModal(true); }} className="p-1.5 text-amber-600 hover:text-amber-800 dark:text-amber-500 dark:hover:text-amber-400" title="كلمة المرور">
                          <Key size={14} />
                        </button>
                        <button onClick={() => handleToggleUserStatus(u)} className={`p-1.5 ${u.isActive ? 'text-slate-600 hover:text-slate-800' : 'text-green-600 hover:text-green-800'}`} title={u.isActive ? 'تعطيل' : 'تفعيل'}>
                          {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                        <button onClick={() => handleDeleteUser(u)} className="p-1.5 text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300" title="حذف">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="col-span-full p-8 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    لا يوجد مستخدمين
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== Roles Tab ==================== */}
        {activeTab === 'roles' && isAdmin && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                الأدوار والصلاحيات
              </h2>
              <div className="flex gap-2">
                {/* شريط البحث في الأدوار */}
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    placeholder="بحث في الأدوار..."
                    className="w-40 pr-9 pl-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400"
                  />
                  {roleSearch && (
                    <button
                      onClick={() => setRoleSearch('')}
                      className="absolute left-2 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowRoleModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <Plus size={18} />
                  إضافة دور
                </button>
              </div>
            </div>

            {rolesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {roles
                  .filter(role => 
                    !roleSearch.trim() ||
                    role.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
                    role.nameEn?.toLowerCase().includes(roleSearch.toLowerCase())
                  )
                  .map(role => {
                  // أيقونة دالة حسب اسم الدور
                  const getRoleIcon = () => {
                    const name = role.name.toLowerCase();
                    const nameEn = (role.nameEn || '').toLowerCase();
                    if (name.includes('مدير') || nameEn.includes('admin') || nameEn.includes('manager')) return <Crown size={20} style={{ color: role.color }} />;
                    if (name.includes('محاسب') || nameEn.includes('account')) return <CreditCard size={20} style={{ color: role.color }} />;
                    if (name.includes('مستخدم') || nameEn.includes('user')) return <UserCog size={20} style={{ color: role.color }} />;
                    if (name.includes('مشرف') || nameEn.includes('super')) return <ShieldCheck size={20} style={{ color: role.color }} />;
                    return <Shield size={20} style={{ color: role.color }} />;
                  };
                  
                  return (
                    <div
                      key={role.id}
                      data-search-role-id={role.id}
                      className="bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${role.color}20` }}
                          >
                            {getRoleIcon()}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">{role.name}</h3>
                            {role.nameEn && (
                              <p className="text-sm text-slate-500 dark:text-slate-400">{role.nameEn}</p>
                            )}
                          </div>
                        </div>
                        {role.isSystemRole && (
                          <Lock size={14} className="text-slate-400" title="دور نظامي" />
                        )}
                      </div>
                      
                      {role.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                          {role.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {role.isSystemRole ? 'دور نظامي' : 'دور مخصص'}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${role.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {role.isActive ? 'نشط' : 'معطل'}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {!role.isSystemRole && (
                            <button
                              onClick={() => handleToggleRoleStatus(role)}
                              className={`p-1.5 ${role.isActive ? 'text-amber-500 hover:text-amber-700' : 'text-emerald-500 hover:text-emerald-700'}`}
                              title={role.isActive ? 'تعطيل' : 'تفعيل'}
                            >
                              {role.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedRole(role);
                              setRoleFormData({
                                name: role.name,
                                nameEn: role.nameEn || '',
                                color: role.color || '#3B82F6',
                                description: role.description || '',
                              });
                              setShowRoleModal(true);
                            }}
                            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400"
                            title="تعديل"
                          >
                            <Edit2 size={14} />
                          </button>
                          {!role.isSystemRole && (
                            <button
                              onClick={() => handleDeleteRole(role)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                              title="حذف"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== Plans Tab ==================== */}
        {activeTab === 'plans' && isAdmin && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Crown className="text-amber-500" size={24} />
                  إدارة الخطط
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  إدارة خطط الاشتراك والأسعار
                </p>
              </div>
              <div className="flex gap-2">
                {/* شريط البحث في الخطط */}
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={planSearch}
                    onChange={(e) => setPlanSearch(e.target.value)}
                    placeholder="بحث في الخطط..."
                    className="w-40 pr-9 pl-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400"
                  />
                  {planSearch && (
                    <button
                      onClick={() => setPlanSearch('')}
                      className="absolute left-2 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    resetPlanForm();
                    setShowPlanModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <Plus size={18} />
                  إضافة خطة
                </button>
              </div>
            </div>

            {plansLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="text-center py-12">
                <Crown className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-500 dark:text-slate-400">لا توجد خطط حالياً</p>
                <button
                  onClick={() => {
                    resetPlanForm();
                    setShowPlanModal(true);
                  }}
                  className="mt-4 text-primary hover:underline"
                >
                  إضافة أول خطة
                </button>
              </div>
            ) : (
              <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {filteredPlans.map(plan => {
                  const planColors: Record<string, { bg: string; border: string; text: string }> = {
                    slate: { bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-300', text: 'text-slate-600' },
                    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300', text: 'text-blue-600' },
                    violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-300', text: 'text-violet-600' },
                    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300', text: 'text-amber-600' },
                    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-300', text: 'text-emerald-600' },
                    rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-300', text: 'text-rose-600' },
                  };
                  const colors = planColors[plan.color] || planColors.blue;

                  return (
                    <div
                      key={plan.id}
                      data-search-plan-id={plan.id}
                      className={`relative p-5 rounded-xl border-2 ${colors.border} ${colors.bg} ${!plan.isActive ? 'opacity-60' : ''} hover:shadow-lg transition-all`}
                    >
                      {/* Popular Badge */}
                      {plan.isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="px-3 py-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-medium rounded-full shadow">
                            الأكثر شعبية
                          </span>
                        </div>
                      )}

                      {/* Header */}
                      <div className="text-center mb-4">
                        <div className={`w-12 h-12 mx-auto rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center ${colors.text} mb-2`}>
                          <Crown size={24} />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg">{plan.name}</h3>
                        {plan.nameEn && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{plan.nameEn}</p>
                        )}
                      </div>

                      {/* Price */}
                      <div className="text-center mb-4">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl font-bold text-slate-800 dark:text-white">
                            {plan.price === 0 ? 'مجاني' : plan.price}
                          </span>
                          {plan.price > 0 && (
                            <>
                              <span className="text-sm text-slate-500">{plan.currency}</span>
                              <span className="text-xs text-slate-400">/شهر</span>
                            </>
                          )}
                        </div>
                        {plan.yearlyPrice && plan.yearlyPrice > 0 && (
                          <p className="text-xs text-emerald-600 mt-1">
                            {plan.yearlyPrice} {plan.currency} / سنوياً
                          </p>
                        )}
                      </div>

                      {/* Limits */}
                      <div className="space-y-1 mb-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">المستخدمين:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {plan.maxUsers === -1 ? 'غير محدود' : plan.maxUsers}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">الفواتير:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {plan.maxInvoices === -1 ? 'غير محدود' : `${plan.maxInvoices}/شهر`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">العملاء:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {plan.maxCustomers === -1 ? 'غير محدود' : plan.maxCustomers}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">المنتجات:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {plan.maxProducts === -1 ? 'غير محدود' : plan.maxProducts}
                          </span>
                        </div>
                      </div>

                      {/* Features Icons */}
                      <div className="flex flex-wrap gap-1 mb-4 justify-center">
                        {plan.hasBasicReports && (
                          <span className="px-2 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 rounded" title="تقارير أساسية">📊</span>
                        )}
                        {plan.hasAdvancedReports && (
                          <span className="px-2 py-0.5 text-xs bg-violet-200 dark:bg-violet-900 rounded" title="تقارير متقدمة">📈</span>
                        )}
                        {plan.hasBackup && (
                          <span className="px-2 py-0.5 text-xs bg-blue-200 dark:bg-blue-900 rounded" title="نسخ احتياطي">💾</span>
                        )}
                        {plan.hasMultiCurrency && (
                          <span className="px-2 py-0.5 text-xs bg-emerald-200 dark:bg-emerald-900 rounded" title="عملات متعددة">💱</span>
                        )}
                        {plan.hasApiAccess && (
                          <span className="px-2 py-0.5 text-xs bg-amber-200 dark:bg-amber-900 rounded" title="API Access">🔌</span>
                        )}
                        {plan.hasOfflineMode && (
                          <span className="px-2 py-0.5 text-xs bg-purple-200 dark:bg-purple-900 rounded" title="Offline Mode">📴</span>
                        )}
                        {plan.hasWhiteLabel && (
                          <span className="px-2 py-0.5 text-xs bg-rose-200 dark:bg-rose-900 rounded" title="تخصيص كامل">🏷️</span>
                        )}
                      </div>

                      {/* Status & Actions */}
                      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${plan.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                          {plan.isActive ? 'نشطة' : 'معطلة'}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleTogglePlanStatus(plan)}
                            className={`p-1.5 ${plan.isActive ? 'text-amber-500 hover:text-amber-700' : 'text-emerald-500 hover:text-emerald-700'}`}
                            title={plan.isActive ? 'تعطيل' : 'تفعيل'}
                          >
                            {plan.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          </button>
                          <button
                            onClick={() => openEditPlanModal(plan)}
                            className="p-1.5 text-blue-600 hover:text-blue-800"
                            title="تعديل"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeletePlan(plan)}
                            className="p-1.5 text-rose-500 hover:text-rose-700"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            onClick={() => setExpandedPlanPermsId(prev => prev === plan.id ? null : plan.id)}
                            className={`p-1.5 ${expandedPlanPermsId === plan.id ? 'text-violet-700 dark:text-violet-300' : 'text-violet-500 hover:text-violet-700'}`}
                            title="صلاحيات القوائم لهذه الخطة"
                          >
                            <Key size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ===== Plan Permissions Inline Panel ===== */}
              {expandedPlanPermsId !== null && (() => {
                const targetPlan = filteredPlans.find(p => p.id === expandedPlanPermsId);
                if (!targetPlan) return null;
                const planKey = `plan_${targetPlan.id}`;
                const menuItems = [
                  { id: 'menu_dashboard',     label: 'لوحة التحكم' },
                  { id: 'menu_products',      label: 'المنتجات' },
                  { id: 'menu_customers',     label: 'العملاء' },
                  { id: 'menu_invoices',      label: 'الفواتير' },
                  { id: 'menu_expenses',      label: 'مصروفات وإيرادات' },
                  { id: 'menu_reports',       label: 'التقارير' },
                  { id: 'menu_settings',      label: 'الإعدادات' },
                  { id: 'menu_notifications', label: 'الإشعارات' },
                  { id: 'menu_messages',      label: 'الرسائل' },
                  { id: 'menu_plans',         label: 'الخطط' },
                ];
                const current: Record<string, boolean> = {};
                menuItems.forEach(m => {
                  const entry = permissionsMatrix[planKey]?.[m.id];
                  current[m.id] = entry ? entry.view : true; // default: visible
                });
                const toggleMenu = (menuId: string) => {
                  const newVisible = !current[menuId];
                  const newMatrix = {
                    ...permissionsMatrix,
                    [planKey]: {
                      ...(permissionsMatrix[planKey] || {}),
                      [menuId]: { view: newVisible, create: newVisible, edit: newVisible, delete: newVisible, print: newVisible },
                    },
                  };
                  setPermissionsMatrix(newMatrix);
                  localStorage.setItem('smartAccountant_permissionsMatrix', JSON.stringify(newMatrix));
                  notifyPermissionsChanged();
                };
                const allowAll = () => {
                  const full = { view: true, create: true, edit: true, delete: true, print: true };
                  const newMatrix = { ...permissionsMatrix, [planKey]: Object.fromEntries(menuItems.map(m => [m.id, full])) };
                  setPermissionsMatrix(newMatrix);
                  localStorage.setItem('smartAccountant_permissionsMatrix', JSON.stringify(newMatrix));
                  notifyPermissionsChanged();
                };
                const blockAll = () => {
                  const none = { view: false, create: false, edit: false, delete: false, print: false };
                  const newMatrix = { ...permissionsMatrix, [planKey]: Object.fromEntries(menuItems.map(m => [m.id, none])) };
                  setPermissionsMatrix(newMatrix);
                  localStorage.setItem('smartAccountant_permissionsMatrix', JSON.stringify(newMatrix));
                  notifyPermissionsChanged();
                };
                return (
                  <div className="mt-4 p-5 rounded-xl border-2 border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Key size={18} className="text-violet-600 dark:text-violet-400" />
                        <h3 className="font-bold text-slate-800 dark:text-white">
                          صلاحيات قوائم خطة: <span className="text-violet-600 dark:text-violet-300">{targetPlan.name}</span>
                        </h3>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={allowAll} className="px-3 py-1.5 text-xs rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium transition-colors">تفعيل الكل</button>
                        <button onClick={blockAll} className="px-3 py-1.5 text-xs rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-medium transition-colors">تعطيل الكل</button>
                        <button onClick={() => setExpandedPlanPermsId(null)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={16} /></button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                      القوائم المُفعَّلة ظاهرة لجميع مستخدمي هذه الخطة (ما لم تُتجاوَه بصلاحيات فردية على مستوى الحساب أو المستخدم)
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {menuItems.map(m => (
                        <button
                          key={m.id}
                          onClick={() => toggleMenu(m.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                            current[m.id]
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                          }`}
                        >
                          {current[m.id] ? <Eye size={13} /> : <EyeOff size={13} />}
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              </>
            )}
          </div>
        )}

        {/* ==================== Server Settings Tab ==================== */}
        {activeTab === 'server' && isAdmin && (
          <div className="p-6 space-y-6">
            <div className="p-6 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl text-white">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <Server size={24} />
                إعدادات السيرفر (Backend)
              </h2>
              <p className="opacity-90">إعدادات الاتصال بالخادم وقاعدة البيانات</p>
            </div>

            {/* API Connection */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Link size={20} className="text-primary" />
                رابط الـ API
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                    عنوان الخادم (API URL)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={serverApiUrl}
                      onChange={(e) => setServerApiUrl(e.target.value)}
                      className="flex-1 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-mono text-sm"
                      placeholder="http://localhost:5000/api"
                      dir="ltr"
                    />
                    <button 
                      className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center gap-2"
                      onClick={handleTestConnection}
                      disabled={serverConnectionStatus === 'checking'}
                    >
                      {serverConnectionStatus === 'checking' ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <RefreshCw size={18} />
                      )}
                      اختبار
                    </button>
                    <button 
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
                      onClick={handleSaveServerSettings}
                      disabled={isSavingServer}
                    >
                      {isSavingServer ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Save size={18} />
                      )}
                      حفظ
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    مثال: http://localhost:5000/api أو http://192.168.1.100:5000/api
                  </p>
                </div>

                {/* Connection Status */}
                {serverConnectionStatus === 'checking' && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <Loader2 className="text-blue-500 animate-spin" size={24} />
                      <div>
                        <p className="font-medium text-blue-700 dark:text-blue-400">جاري التحقق من الاتصال...</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {serverConnectionStatus === 'connected' && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="text-green-500" size={24} />
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-400">✅ متصل بالخادم</p>
                        <p className="text-sm text-green-600 dark:text-green-500">
                          {serverApiUrl} {serverLatency && `(${serverLatency}ms)`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {serverConnectionStatus === 'disconnected' && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-3">
                      <XCircle className="text-red-500" size={24} />
                      <div>
                        <p className="font-medium text-red-700 dark:text-red-400">❌ غير متصل بالخادم</p>
                        <p className="text-sm text-red-600 dark:text-red-500">
                          تأكد من تشغيل الخادم وصحة الرابط
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Database Info */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Database size={20} className="text-amber-500" />
                معلومات قاعدة البيانات
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">نوع قاعدة البيانات</label>
                  <p className="font-medium text-slate-800 dark:text-white">SQL Server Express</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">اسم الخادم</label>
                  <p className="font-mono text-sm text-slate-800 dark:text-white">DESKTOP-KD7G2DG\SQLEXPRESS</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">اسم قاعدة البيانات</label>
                  <p className="font-mono text-sm text-slate-800 dark:text-white">SmartAccountant_v1005_DB</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">حالة الاتصال</label>
                  <p className="font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    متصل
                  </p>
                </div>
              </div>
            </div>

            {/* Backend Info */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Server size={20} className="text-blue-500" />
                معلومات الخادم
              </h3>
              
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">إطار العمل</label>
                  <p className="font-medium text-slate-800 dark:text-white">ASP.NET Core</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">الإصدار</label>
                  <p className="font-medium text-slate-800 dark:text-white">.NET 10.0</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">المنفذ</label>
                  <p className="font-mono text-slate-800 dark:text-white">5000</p>
                </div>
              </div>
            </div>

            {/* API Endpoints */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">نقاط الـ API المتاحة</h3>
              
              <div className="space-y-2 font-mono text-sm">
                {[
                  { method: 'GET', path: '/api/products', desc: 'المنتجات' },
                  { method: 'GET', path: '/api/customers', desc: 'العملاء' },
                  { method: 'GET', path: '/api/invoices', desc: 'الفواتير' },
                  { method: 'GET', path: '/api/expenses', desc: 'المصروفات' },
                  { method: 'GET', path: '/api/roles', desc: 'الأدوار' },
                  { method: 'GET', path: '/api/admin/users', desc: 'المستخدمين' },
                  { method: 'GET', path: '/api/tags', desc: 'العلامات' },
                ].map((endpoint, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-white dark:bg-slate-700 rounded-lg">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      endpoint.method === 'GET' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' :
                      endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
                    }`}>
                      {endpoint.method}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300" dir="ltr">{endpoint.path}</span>
                    <span className="text-slate-400 text-xs mr-auto">({endpoint.desc})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Help Section */}
            <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className="text-amber-500" />
                مساعدة - كيفية الاستخدام
              </h3>
              
              <div className="space-y-3 text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <p>اذهب إلى <strong>الإعدادات</strong> ← <strong>إعدادات السيرفر</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <p>غيّر رابط الـ API في الحقل (مثال: http://192.168.1.100:5000/api)</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <p>اضغط <strong>اختبار</strong> للتحقق من الاتصال بالخادم</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                  <p>إذا نجح الاتصال (ظهرت علامة ✅)، اضغط <strong>حفظ</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
                  <p>الرابط الجديد سيُستخدم في كل طلبات الـ API تلقائياً</p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <strong>ملاحظة:</strong> تأكد من تشغيل الخادم (Backend) قبل الاختبار
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== Tools Tab ==================== */}
        {activeTab === 'tools' && isAdmin && (
          <div className="p-6 space-y-6">
            <div className="p-6 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl text-white">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <Wrench size={24} />
                أدوات النظام
              </h2>
              <p className="opacity-90">أدوات متقدمة لإدارة البيانات والنسخ الاحتياطي</p>
            </div>

            {/* Login Screen Options */}
            <div
              className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
              data-search-setting="login-screen-options"
              data-search-keywords="خيارات شاشة الدخول تسجيل الدخول login screen controls"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full text-blue-600 dark:text-blue-400">
                  <Lock size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">خيارات شاشة الدخول</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4">
                    التحكم في إظهار أو إخفاء عناصر شاشة تسجيل الدخول
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Demo Login Toggle */}
                    <div
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                      data-search-setting="showDemoLogin"
                      data-search-keywords="زر الدخول التجريبي demo login showDemoLogin"
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className="text-emerald-500" size={20} />
                        <div>
                          <h4 className="font-medium text-slate-800 dark:text-white text-sm">زر الدخول التجريبي</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">يملأ بيانات المستخدم التجريبي</p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const newValue = !permissions.showDemoLogin;
                          try {
                            await systemSettingsApi.update('showDemoLogin', newValue.toString(), 'bool');
                            togglePermission('showDemoLogin');
                            notify(`تم ${newValue ? 'إظهار' : 'إخفاء'} زر الدخول التجريبي ✓`, 'success');
                          } catch (e) {
                            notify('فشل حفظ الإعداد!', 'error');
                            console.error('فشل حفظ الإعداد:', e);
                          }
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          permissions.showDemoLogin ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          permissions.showDemoLogin ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* Admin Login Toggle */}
                    <div
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                      data-search-setting="showAdminLogin"
                      data-search-keywords="زر دخول الأدمن admin login showAdminLogin"
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="text-rose-500" size={20} />
                        <div>
                          <h4 className="font-medium text-slate-800 dark:text-white text-sm">زر دخول الأدمن</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">يملأ بيانات مدير النظام</p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const newValue = !permissions.showAdminLogin;
                          try {
                            await systemSettingsApi.update('showAdminLogin', newValue.toString(), 'bool');
                            togglePermission('showAdminLogin');
                            notify(`تم ${newValue ? 'إظهار' : 'إخفاء'} زر دخول الأدمن ✓`, 'success');
                          } catch (e) {
                            notify('فشل حفظ الإعداد!', 'error');
                            console.error('فشل حفظ الإعداد:', e);
                          }
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          permissions.showAdminLogin ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          permissions.showAdminLogin ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* Allow Registration Toggle */}
                    <div
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                      data-search-setting="allowUserRegistration"
                      data-search-keywords="السماح بالتسجيل allow registration allowUserRegistration"
                    >
                      <div className="flex items-center gap-3">
                        <UserCheck className="text-blue-500" size={20} />
                        <div>
                          <h4 className="font-medium text-slate-800 dark:text-white text-sm">السماح بالتسجيل</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">تسجيل مستخدمين جدد</p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const newValue = !(permissions as any).allowUserRegistration;
                          try {
                            await systemSettingsApi.update('allowUserRegistration', newValue.toString(), 'bool');
                            togglePermission('allowUserRegistration');
                            notify(`تم ${newValue ? 'تفعيل' : 'إلغاء'} السماح بالتسجيل ✓`, 'success');
                          } catch (e) {
                            notify('فشل حفظ الإعداد!', 'error');
                            console.error('فشل حفظ الإعداد:', e);
                          }
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          (permissions as any).allowUserRegistration ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          (permissions as any).allowUserRegistration ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* Forgot Password Toggle */}
                    <div
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                      data-search-setting="showForgotPassword"
                      data-search-keywords="نسيت كلمة المرور forgot password showForgotPassword"
                    >
                      <div className="flex items-center gap-3">
                        <Key className="text-amber-500" size={20} />
                        <div>
                          <h4 className="font-medium text-slate-800 dark:text-white text-sm">نسيت كلمة المرور</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">إظهار رابط الاستعادة</p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const newValue = !(permissions as any).showForgotPassword;
                          try {
                            await systemSettingsApi.update('showForgotPassword', newValue.toString(), 'bool');
                            togglePermission('showForgotPassword');
                            notify(`تم ${newValue ? 'إظهار' : 'إخفاء'} رابط نسيت كلمة المرور ✓`, 'success');
                          } catch (e) {
                            notify('فشل حفظ الإعداد!', 'error');
                            console.error('فشل حفظ الإعداد:', e);
                          }
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          (permissions as any).showForgotPassword ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          (permissions as any).showForgotPassword ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* Remember Me Toggle */}
                    <div
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                      data-search-setting="showRememberMe"
                      data-search-keywords="تذكرني remember me showRememberMe"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="text-purple-500" size={20} />
                        <div>
                          <h4 className="font-medium text-slate-800 dark:text-white text-sm">تذكرني</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">إظهار خيار تذكرني</p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const newValue = !(permissions as any).showRememberMe;
                          try {
                            await systemSettingsApi.update('showRememberMe', newValue.toString(), 'bool');
                            togglePermission('showRememberMe');
                            notify(`تم ${newValue ? 'إظهار' : 'إخفاء'} خيار تذكرني ✓`, 'success');
                          } catch (e) {
                            notify('فشل حفظ الإعداد!', 'error');
                            console.error('فشل حفظ الإعداد:', e);
                          }
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          (permissions as any).showRememberMe ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          (permissions as any).showRememberMe ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Register Field Limits */}
            <div
              className="p-6 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800"
              data-search-setting="register-field-limits"
              data-search-keywords="حدود الحروف في شاشة التسجيل حدود حقول التسجيل register limits register max length username name company email password"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-cyan-100 dark:bg-cyan-900/50 rounded-full text-cyan-600 dark:text-cyan-400">
                  <User size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">حدود الحروف في شاشة التسجيل</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4">
                    تحكم في الحد الأقصى لعدد الأحرف في حقول إنشاء الحساب. يُطبَّق مباشرة في شاشة التسجيل مع عداد الأحرف.
                  </p>
                  <p className="text-xs text-cyan-700 dark:text-cyan-300 mb-3">
                    لتحسين الإدخال: عدّل الأرقام بحرية ثم اضغط زر حفظ كل الحدود مرة واحدة. أزرار + و - للتعديل السريع.
                  </p>

                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void saveAllRegisterLimits();
                      }}
                      disabled={isSavingRegisterLimits || !hasPendingRegisterLimitChanges}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-semibold hover:bg-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSavingRegisterLimits ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      حفظ كل الحدود
                    </button>
                    <span className={`text-xs ${hasPendingRegisterLimitChanges ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                      {hasPendingRegisterLimitChanges ? 'يوجد تغييرات غير محفوظة' : 'كل التغييرات محفوظة'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700" data-search-setting="registerUsernameMaxLength">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={16} className="text-cyan-500" />
                        <label className="text-sm font-medium text-slate-800 dark:text-white">اسم المستخدم</label>
                      </div>
                      <input
                        type="number"
                        min={REGISTER_LIMIT_SETTING_CONFIG.registerUsernameMaxLength.min}
                        max={REGISTER_LIMIT_SETTING_CONFIG.registerUsernameMaxLength.max}
                        step={1}
                        value={registerLimitDrafts.registerUsernameMaxLength}
                        onChange={(e) => setRegisterLimitDraft('registerUsernameMaxLength', e.target.value)}
                        onBlur={() => {
                          normalizeRegisterLimitDraft('registerUsernameMaxLength');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            (e.currentTarget as HTMLInputElement).blur();
                          }
                        }}
                        inputMode="numeric"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => stepRegisterLimitDraft('registerUsernameMaxLength', -1)}
                          className="px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => stepRegisterLimitDraft('registerUsernameMaxLength', 1)}
                          className="px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">المدى المسموح: {REGISTER_LIMIT_SETTING_CONFIG.registerUsernameMaxLength.min} - {REGISTER_LIMIT_SETTING_CONFIG.registerUsernameMaxLength.max} حرف</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700" data-search-setting="registerFullNameMaxLength">
                      <div className="flex items-center gap-2 mb-2">
                        <UserCheck size={16} className="text-cyan-500" />
                        <label className="text-sm font-medium text-slate-800 dark:text-white">الاسم الشخصي</label>
                      </div>
                      <input
                        type="number"
                        min={REGISTER_LIMIT_SETTING_CONFIG.registerFullNameMaxLength.min}
                        max={REGISTER_LIMIT_SETTING_CONFIG.registerFullNameMaxLength.max}
                        step={1}
                        value={registerLimitDrafts.registerFullNameMaxLength}
                        onChange={(e) => setRegisterLimitDraft('registerFullNameMaxLength', e.target.value)}
                        onBlur={() => {
                          normalizeRegisterLimitDraft('registerFullNameMaxLength');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            (e.currentTarget as HTMLInputElement).blur();
                          }
                        }}
                        inputMode="numeric"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => stepRegisterLimitDraft('registerFullNameMaxLength', -1)}
                          className="px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => stepRegisterLimitDraft('registerFullNameMaxLength', 1)}
                          className="px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">المدى المسموح: {REGISTER_LIMIT_SETTING_CONFIG.registerFullNameMaxLength.min} - {REGISTER_LIMIT_SETTING_CONFIG.registerFullNameMaxLength.max} حرف</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700" data-search-setting="registerCompanyNameMaxLength">
                      <div className="flex items-center gap-2 mb-2">
                        <Building size={16} className="text-cyan-500" />
                        <label className="text-sm font-medium text-slate-800 dark:text-white">اسم الشركة / المتجر</label>
                      </div>
                      <input
                        type="number"
                        min={REGISTER_LIMIT_SETTING_CONFIG.registerCompanyNameMaxLength.min}
                        max={REGISTER_LIMIT_SETTING_CONFIG.registerCompanyNameMaxLength.max}
                        step={1}
                        value={registerLimitDrafts.registerCompanyNameMaxLength}
                        onChange={(e) => setRegisterLimitDraft('registerCompanyNameMaxLength', e.target.value)}
                        onBlur={() => {
                          normalizeRegisterLimitDraft('registerCompanyNameMaxLength');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            (e.currentTarget as HTMLInputElement).blur();
                          }
                        }}
                        inputMode="numeric"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => stepRegisterLimitDraft('registerCompanyNameMaxLength', -1)}
                          className="px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => stepRegisterLimitDraft('registerCompanyNameMaxLength', 1)}
                          className="px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">المدى المسموح: {REGISTER_LIMIT_SETTING_CONFIG.registerCompanyNameMaxLength.min} - {REGISTER_LIMIT_SETTING_CONFIG.registerCompanyNameMaxLength.max} حرف</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700" data-search-setting="registerEmailMaxLength">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail size={16} className="text-cyan-500" />
                        <label className="text-sm font-medium text-slate-800 dark:text-white">البريد الإلكتروني</label>
                      </div>
                      <input
                        type="number"
                        min={REGISTER_LIMIT_SETTING_CONFIG.registerEmailMaxLength.min}
                        max={REGISTER_LIMIT_SETTING_CONFIG.registerEmailMaxLength.max}
                        step={1}
                        value={registerLimitDrafts.registerEmailMaxLength}
                        onChange={(e) => setRegisterLimitDraft('registerEmailMaxLength', e.target.value)}
                        onBlur={() => {
                          normalizeRegisterLimitDraft('registerEmailMaxLength');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            (e.currentTarget as HTMLInputElement).blur();
                          }
                        }}
                        inputMode="numeric"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => stepRegisterLimitDraft('registerEmailMaxLength', -1)}
                          className="px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => stepRegisterLimitDraft('registerEmailMaxLength', 1)}
                          className="px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">المدى المسموح: {REGISTER_LIMIT_SETTING_CONFIG.registerEmailMaxLength.min} - {REGISTER_LIMIT_SETTING_CONFIG.registerEmailMaxLength.max} حرف</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 md:col-span-2" data-search-setting="registerPasswordMaxLength">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock size={16} className="text-cyan-500" />
                        <label className="text-sm font-medium text-slate-800 dark:text-white">كلمة المرور</label>
                      </div>
                      <input
                        type="number"
                        min={REGISTER_LIMIT_SETTING_CONFIG.registerPasswordMaxLength.min}
                        max={REGISTER_LIMIT_SETTING_CONFIG.registerPasswordMaxLength.max}
                        step={1}
                        value={registerLimitDrafts.registerPasswordMaxLength}
                        onChange={(e) => setRegisterLimitDraft('registerPasswordMaxLength', e.target.value)}
                        onBlur={() => {
                          normalizeRegisterLimitDraft('registerPasswordMaxLength');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            (e.currentTarget as HTMLInputElement).blur();
                          }
                        }}
                        inputMode="numeric"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => stepRegisterLimitDraft('registerPasswordMaxLength', -1)}
                          className="px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => stepRegisterLimitDraft('registerPasswordMaxLength', 1)}
                          className="px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">المدى المسموح: {REGISTER_LIMIT_SETTING_CONFIG.registerPasswordMaxLength.min} - {REGISTER_LIMIT_SETTING_CONFIG.registerPasswordMaxLength.max} حرف</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full text-red-600 dark:text-red-400">
                  <Shield size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">إعدادات الأمان</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4">
                    التحكم في إعدادات الأمان والجلسات
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Max Login Attempts */}
                    <div
                      className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                      data-search-setting="maxLoginAttempts"
                      data-search-keywords="محاولات الدخول الفاشلة maxLoginAttempts failed login attempts"
                    >
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        محاولات الدخول الفاشلة
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={(permissions as any).maxLoginAttempts || 5}
                        onBlur={async (e) => {
                          const value = parseInt(e.target.value);
                          try {
                            await systemSettingsApi.update('maxLoginAttempts', value.toString(), 'int');
                            notify('تم حفظ محاولات الدخول الفاشلة ✓', 'success');
                          } catch (err) {
                            notify('فشل حفظ الإعداد!', 'error');
                          }
                        }}
                        onChange={(e) => {
                          togglePermission('maxLoginAttempts', parseInt(e.target.value));
                        }}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Session Timeout */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        مدة الجلسة (دقائق)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="1440"
                        value={(permissions as any).sessionTimeout || 30}
                        onBlur={async (e) => {
                          const value = parseInt(e.target.value);
                          try {
                            await systemSettingsApi.update('sessionTimeout', value.toString(), 'int');
                            notify('تم حفظ مدة الجلسة ✓', 'success');
                          } catch (err) {
                            notify('فشل حفظ الإعداد!', 'error');
                          }
                        }}
                        onChange={(e) => {
                          togglePermission('sessionTimeout', parseInt(e.target.value));
                        }}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Require Email Verification */}
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div>
                        <h4 className="font-medium text-slate-800 dark:text-white text-sm">تأكيد البريد</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">طلب تأكيد عند التسجيل</p>
                      </div>
                      <button
                        onClick={async () => {
                          const newValue = !(permissions as any).requireEmailVerification;
                          try {
                            await systemSettingsApi.update('requireEmailVerification', newValue.toString(), 'bool');
                            togglePermission('requireEmailVerification');
                            notify(`تم ${newValue ? 'تفعيل' : 'إلغاء'} تأكيد البريد ✓`, 'success');
                          } catch (e) {
                            notify('فشل حفظ الإعداد!', 'error');
                          }
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          (permissions as any).requireEmailVerification ? 'bg-red-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          (permissions as any).requireEmailVerification ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Settings */}
            <div className="p-6 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-cyan-100 dark:bg-cyan-900/50 rounded-full text-cyan-600 dark:text-cyan-400">
                  <Building size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">إعدادات النظام</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4">
                    الإعدادات الأساسية للنظام
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Company Name */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        اسم الشركة / النظام
                      </label>
                      <input
                        type="text"
                        value={(permissions as any).companyName || 'المحاسب الذكي'}
                        onBlur={async (e) => {
                          try {
                            await systemSettingsApi.update('companyName', e.target.value, 'string');
                            notify('تم حفظ اسم الشركة ✓', 'success');
                          } catch (err) {
                            notify('فشل حفظ الإعداد!', 'error');
                          }
                        }}
                        onChange={(e) => {
                          togglePermission('companyName', e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Default Language */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        اللغة الافتراضية
                      </label>
                      <select
                        value={(permissions as any).defaultLanguage || 'ar'}
                        onChange={async (e) => {
                          togglePermission('defaultLanguage', e.target.value);
                          try {
                            await systemSettingsApi.update('defaultLanguage', e.target.value, 'string');
                            notify('تم حفظ اللغة الافتراضية ✓', 'success');
                          } catch (err) {
                            notify('فشل حفظ الإعداد!', 'error');
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      >
                        <option value="ar">العربية</option>
                        <option value="en">English</option>
                      </select>
                    </div>

                    {/* Default Currency */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        العملة الافتراضية
                      </label>
                      <select
                        value={(permissions as any).defaultCurrency || 'SAR'}
                        onChange={async (e) => {
                          togglePermission('defaultCurrency', e.target.value);
                          try {
                            await systemSettingsApi.update('defaultCurrency', e.target.value, 'string');
                            notify('تم حفظ العملة الافتراضية ✓', 'success');
                          } catch (err) {
                            notify('فشل حفظ الإعداد!', 'error');
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      >
                        <option value="SAR">ريال سعودي (SAR)</option>
                        <option value="EGP">جنيه مصري (EGP)</option>
                        <option value="AED">درهم إماراتي (AED)</option>
                        <option value="USD">دولار أمريكي (USD)</option>
                        <option value="EUR">يورو (EUR)</option>
                      </select>
                    </div>

                    {/* Company Logo */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        شعار الشركة (للفاتورة)
                      </label>
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Logo Preview */}
                        <div className="flex-shrink-0">
                          {(user?.accountLogo || (permissions as any).companyLogo) ? (
                            <div className="w-24 h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-700">
                              <img 
                                src={user?.accountLogo || (permissions as any).companyLogo} 
                                alt="شعار الشركة" 
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-24 h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-slate-700">
                              <ImageIcon size={32} className="text-slate-400" />
                            </div>
                          )}
                        </div>
                        {/* Logo Upload & URL */}
                        <div className="flex-1 space-y-3">
                          {/* File Upload */}
                          <div>
                            <input
                              type="file"
                              id="logo-upload"
                              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                              className="hidden"
                              disabled={!user?.permissions?.canManageLogo && !user?.isSuperAdmin}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                
                                // التحقق من حجم الملف (حد أقصى 500KB)
                                if (file.size > 500 * 1024) {
                                  notify('حجم الملف كبير جداً! الحد الأقصى 500KB', 'error');
                                  return;
                                }
                                
                                // تحويل إلى Base64
                                const reader = new FileReader();
                                reader.onload = async (event) => {
                                  const base64 = event.target?.result as string;
                                  try {
                                    // حفظ في إعدادات النظام
                                    await systemSettingsApi.update('companyLogo', base64, 'string');
                                    // حفظ في الحساب
                                    if (user?.accountId) {
                                      await accountApi.updateLogo(user.accountId, base64);
                                    }
                                    // تحديث العرض المحلي
                                    togglePermission('companyLogo', base64);
                                    notify('تم رفع شعار الشركة بنجاح ✓', 'success');
                                  } catch (err) {
                                    notify('فشل رفع الشعار!', 'error');
                                  }
                                };
                                reader.readAsDataURL(file);
                                e.target.value = ''; // Reset input
                              }}
                            />
                            <label
                              htmlFor="logo-upload"
                              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                                (!user?.permissions?.canManageLogo && !user?.isSuperAdmin)
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              <Upload size={16} />
                              رفع صورة من الجهاز
                            </label>
                            <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">
                              (PNG, JPG, SVG - حد أقصى 500KB)
                            </span>
                          </div>
                          
                          {/* URL Input */}
                          <div className="flex gap-2">
                            <input
                              type="url"
                              placeholder="أو أدخل رابط URL للشعار..."
                              value={typeof (permissions as any).companyLogo === 'string' && (permissions as any).companyLogo?.startsWith('data:') ? '' : ((permissions as any).companyLogo || '')}
                              disabled={!user?.permissions?.canManageLogo && !user?.isSuperAdmin}
                              onChange={(e) => {
                                togglePermission('companyLogo', e.target.value);
                              }}
                              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:cursor-not-allowed"
                            />
                            <button
                              disabled={!user?.permissions?.canManageLogo && !user?.isSuperAdmin}
                              onClick={async () => {
                                if (!user?.permissions?.canManageLogo && !user?.isSuperAdmin) return;
                                const logoUrl = (permissions as any).companyLogo;
                                if (!logoUrl) {
                                  notify('أدخل رابط الشعار أولاً', 'warning');
                                  return;
                                }
                                try {
                                  await systemSettingsApi.update('companyLogo', logoUrl, 'string');
                                  if (user?.accountId) {
                                    await accountApi.updateLogo(user.accountId, logoUrl);
                                  }
                                  notify('تم حفظ شعار الشركة ✓', 'success');
                                } catch (err) {
                                  notify('فشل حفظ الشعار!', 'error');
                                }
                              }}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-1"
                            >
                              <Save size={16} />
                              حفظ
                            </button>
                          </div>
                          
                          {/* Delete Logo */}
                          {(user?.accountLogo || (permissions as any).companyLogo) && (user?.permissions?.canManageLogo || user?.isSuperAdmin) && (
                            <button
                              onClick={async () => {
                                try {
                                  await systemSettingsApi.update('companyLogo', '', 'string');
                                  if (user?.accountId) {
                                    await accountApi.updateLogo(user.accountId, '');
                                  }
                                  togglePermission('companyLogo', '');
                                  notify('تم حذف الشعار ✓', 'success');
                                } catch (err) {
                                  notify('فشل حذف الشعار!', 'error');
                                }
                              }}
                              className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                            >
                              <Trash2 size={14} />
                              حذف الشعار
                            </button>
                          )}
                          
                          {!user?.permissions?.canManageLogo && !user?.isSuperAdmin && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              ⚠️ ليس لديك صلاحية تغيير الشعار. تواصل مع المدير.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Display Settings - إعدادات العرض */}
            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-full text-indigo-600 dark:text-indigo-400">
                  <Monitor size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">إعدادات العرض</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4">
                    تخصيص طريقة العرض الافتراضية والوضع الافتراضي
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Default View Mode */}
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                        طريقة العرض الافتراضية
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            setDefaultViewMode('grid');
                            try {
                              await systemSettingsApi.update('defaultViewMode', 'grid', 'string');
                              notify('تم تعيين العرض الشبكي كافتراضي ✓', 'success');
                            } catch (err) {
                              notify('فشل حفظ الإعداد!', 'error');
                            }
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            defaultViewMode === 'grid' 
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                              : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                          }`}
                        >
                          <Grid3X3 size={20} />
                          <span className="font-medium">شبكي (Grid)</span>
                        </button>
                        <button
                          onClick={async () => {
                            setDefaultViewMode('table');
                            try {
                              await systemSettingsApi.update('defaultViewMode', 'table', 'string');
                              notify('تم تعيين العرض الجدولي كافتراضي ✓', 'success');
                            } catch (err) {
                              notify('فشل حفظ الإعداد!', 'error');
                            }
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            defaultViewMode === 'table' 
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                              : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                          }`}
                        >
                          <List size={20} />
                          <span className="font-medium">قائمة (Table)</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        سيتم تطبيق هذا الإعداد على جميع الصفحات (العملاء، المنتجات، المصروفات...)
                      </p>
                    </div>

                    {/* Default Theme Mode */}
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                        الوضع الافتراضي
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (isDarkMode) toggleDarkMode();
                            try {
                              await systemSettingsApi.update('defaultTheme', 'light', 'string');
                              notify('تم تعيين الوضع الفاتح كافتراضي ✓', 'success');
                            } catch (err) {
                              notify('فشل حفظ الإعداد!', 'error');
                            }
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            !isDarkMode 
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' 
                              : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-amber-300'
                          }`}
                        >
                          <Sun size={20} />
                          <span className="font-medium">فاتح (Light)</span>
                        </button>
                        <button
                          onClick={async () => {
                            if (!isDarkMode) toggleDarkMode();
                            try {
                              await systemSettingsApi.update('defaultTheme', 'dark', 'string');
                              notify('تم تعيين الوضع الداكن كافتراضي ✓', 'success');
                            } catch (err) {
                              notify('فشل حفظ الإعداد!', 'error');
                            }
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            isDarkMode 
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                              : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                          }`}
                        >
                          <Moon size={20} />
                          <span className="font-medium">داكن (Dark)</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        الوضع الحالي: <span className="font-medium">{isDarkMode ? 'داكن' : 'فاتح'}</span>
                      </p>
                    </div>

                    {/* Date Format Settings */}
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                        <Calendar size={16} className="inline ml-1" />
                        تنسيق التاريخ
                      </label>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={async () => {
                            setDateFormat('DD-MM-YYYY');
                            try {
                              await systemSettingsApi.update('dateFormat', 'DD-MM-YYYY', 'string');
                              notify('تم تعيين تنسيق التاريخ ✓', 'success');
                            } catch (err) {
                              notify('فشل حفظ الإعداد!', 'error');
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg border-2 transition-all ${
                            dateFormat === 'DD-MM-YYYY' 
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                              : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                          }`}
                        >
                          <span className="font-medium">يوم-شهر-سنة</span>
                          <span className="text-sm opacity-70">27-01-2026</span>
                        </button>
                        <button
                          onClick={async () => {
                            setDateFormat('MM-DD-YYYY');
                            try {
                              await systemSettingsApi.update('dateFormat', 'MM-DD-YYYY', 'string');
                              notify('تم تعيين تنسيق التاريخ ✓', 'success');
                            } catch (err) {
                              notify('فشل حفظ الإعداد!', 'error');
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg border-2 transition-all ${
                            dateFormat === 'MM-DD-YYYY' 
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                              : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                          }`}
                        >
                          <span className="font-medium">شهر-يوم-سنة</span>
                          <span className="text-sm opacity-70">01-27-2026</span>
                        </button>
                        <button
                          onClick={async () => {
                            setDateFormat('YYYY-MM-DD');
                            try {
                              await systemSettingsApi.update('dateFormat', 'YYYY-MM-DD', 'string');
                              notify('تم تعيين تنسيق التاريخ ✓', 'success');
                            } catch (err) {
                              notify('فشل حفظ الإعداد!', 'error');
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg border-2 transition-all ${
                            dateFormat === 'YYYY-MM-DD' 
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                              : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                          }`}
                        >
                          <span className="font-medium">سنة-شهر-يوم</span>
                          <span className="text-sm opacity-70">2026-01-27</span>
                        </button>
                      </div>
                    </div>

                    {/* Time Format Settings */}
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                        <Clock size={16} className="inline ml-1" />
                        تنسيق الوقت
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            setTimeFormat('24h');
                            try {
                              await systemSettingsApi.update('timeFormat', '24h', 'string');
                              notify('تم تعيين تنسيق الوقت ✓', 'success');
                            } catch (err) {
                              notify('فشل حفظ الإعداد!', 'error');
                            }
                          }}
                          className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all ${
                            timeFormat === '24h' 
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                              : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                          }`}
                        >
                          <span className="font-medium">24 ساعة</span>
                          <span className="text-sm opacity-70">14:30</span>
                        </button>
                        <button
                          onClick={async () => {
                            setTimeFormat('12h');
                            try {
                              await systemSettingsApi.update('timeFormat', '12h', 'string');
                              notify('تم تعيين تنسيق الوقت ✓', 'success');
                            } catch (err) {
                              notify('فشل حفظ الإعداد!', 'error');
                            }
                          }}
                          className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all ${
                            timeFormat === '12h' 
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                              : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                          }`}
                        >
                          <span className="font-medium">12 ساعة</span>
                          <span className="text-sm opacity-70">2:30 م</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                        ص = صباحاً | م = مساءً
                      </p>
                    </div>

                    {/* Date Display Style Settings */}
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                        <Calendar size={16} className="inline ml-1" />
                        نمط عرض التاريخ
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            setDateDisplayStyle('numeric');
                            try {
                              await systemSettingsApi.update('dateDisplayStyle', 'numeric', 'string');
                              notify('تم تعيين نمط عرض التاريخ ✓', 'success');
                            } catch (err) {
                              notify('فشل حفظ الإعداد!', 'error');
                            }
                          }}
                          className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all ${
                            dateDisplayStyle === 'numeric' 
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                              : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                          }`}
                        >
                          <span className="font-medium">رقمي</span>
                          <span className="text-sm opacity-70">27-01-2026</span>
                        </button>
                        <button
                          onClick={async () => {
                            setDateDisplayStyle('arabic');
                            try {
                              await systemSettingsApi.update('dateDisplayStyle', 'arabic', 'string');
                              notify('تم تعيين نمط عرض التاريخ ✓', 'success');
                            } catch (err) {
                              notify('فشل حفظ الإعداد!', 'error');
                            }
                          }}
                          className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all ${
                            dateDisplayStyle === 'arabic' 
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                              : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                          }`}
                        >
                          <span className="font-medium">عربي نصي</span>
                          <span className="text-sm opacity-70">٢٧ يناير ٢٠٢٦</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                        يؤثر على طريقة عرض التاريخ في جميع أنحاء التطبيق
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Settings */}
            <div className="p-6 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-violet-100 dark:bg-violet-900/50 rounded-full text-violet-600 dark:text-violet-400">
                  <CreditCard size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">إعدادات الفواتير</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4">
                    الإعدادات الافتراضية للفواتير
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Invoice Prefix */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        بادئة رقم الفاتورة
                      </label>
                      <input
                        type="text"
                        value={(permissions as any).invoicePrefix || 'INV-'}
                        onBlur={async (e) => {
                          try {
                            await systemSettingsApi.update('invoicePrefix', e.target.value, 'string');
                            notify('تم حفظ بادئة الفاتورة ✓', 'success');
                          } catch (err) {
                            notify('فشل حفظ الإعداد!', 'error');
                          }
                        }}
                        onChange={(e) => {
                          togglePermission('invoicePrefix', e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Default Tax Rate */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        نسبة الضريبة الافتراضية %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={(permissions as any).defaultTaxRate || 15}
                        onBlur={async (e) => {
                          const value = parseFloat(e.target.value);
                          try {
                            await systemSettingsApi.update('defaultTaxRate', value.toString(), 'decimal');
                            notify('تم حفظ نسبة الضريبة ✓', 'success');
                          } catch (err) {
                            notify('فشل حفظ الإعداد!', 'error');
                          }
                        }}
                        onChange={(e) => {
                          togglePermission('defaultTaxRate', parseFloat(e.target.value));
                        }}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Show Tax on Invoice */}
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div>
                        <h4 className="font-medium text-slate-800 dark:text-white text-sm">إظهار الضريبة</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">في الفواتير</p>
                      </div>
                      <button
                        onClick={async () => {
                          const newValue = (permissions as any).showTaxOnInvoice === false;
                          try {
                            await systemSettingsApi.update('showTaxOnInvoice', newValue.toString(), 'bool');
                            togglePermission('showTaxOnInvoice');
                            notify(`تم ${newValue ? 'إظهار' : 'إخفاء'} الضريبة في الفواتير ✓`, 'success');
                          } catch (e) {
                            notify('فشل حفظ الإعداد!', 'error');
                          }
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          (permissions as any).showTaxOnInvoice !== false ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          (permissions as any).showTaxOnInvoice !== false ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications Settings */}
            <div className="p-6 bg-pink-50 dark:bg-pink-900/20 rounded-xl border border-pink-200 dark:border-pink-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-pink-100 dark:bg-pink-900/50 rounded-full text-pink-600 dark:text-pink-400">
                  <Mail size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">إعدادات الإشعارات</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4">
                    التحكم في طرق الإشعارات
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email Notifications */}
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <Mail className="text-pink-500" size={20} />
                        <div>
                          <h4 className="font-medium text-slate-800 dark:text-white text-sm">إشعارات البريد</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">إرسال إشعارات بالبريد</p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const newValue = (permissions as any).enableEmailNotifications === false;
                          try {
                            await systemSettingsApi.update('enableEmailNotifications', newValue.toString(), 'bool');
                            togglePermission('enableEmailNotifications');
                            notify(`تم ${newValue ? 'تفعيل' : 'تعطيل'} إشعارات البريد ✓`, 'success');
                          } catch (e) {
                            notify('فشل حفظ الإعداد!', 'error');
                          }
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          (permissions as any).enableEmailNotifications !== false ? 'bg-pink-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          (permissions as any).enableEmailNotifications !== false ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* SMS Notifications */}
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <Phone className="text-green-500" size={20} />
                        <div>
                          <h4 className="font-medium text-slate-800 dark:text-white text-sm">إشعارات SMS</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">إرسال رسائل نصية</p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const newValue = !(permissions as any).enableSMSNotifications;
                          try {
                            await systemSettingsApi.update('enableSMSNotifications', newValue.toString(), 'bool');
                            togglePermission('enableSMSNotifications');
                            notify(`تم ${newValue ? 'تفعيل' : 'تعطيل'} إشعارات SMS ✓`, 'success');
                          } catch (e) {
                            notify('فشل حفظ الإعداد!', 'error');
                          }
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          (permissions as any).enableSMSNotifications ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          (permissions as any).enableSMSNotifications ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* === Auto Refresh Settings === */}
            <div className="p-6 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-cyan-100 dark:bg-cyan-900/50 rounded-full text-cyan-600 dark:text-cyan-400">
                  <RefreshCw size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">التحديث التلقائي للبيانات</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4">
                    تحديث البيانات تلقائياً كل فترة زمنية محددة. مفيد عند العمل على أكثر من جهاز.
                  </p>
                  
                  <div className="space-y-4">
                    {/* Enable/Disable Auto Refresh - الزر الرئيسي في الأعلى */}
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border-2 border-cyan-300 dark:border-cyan-700 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${(permissions as any).allowAutoRefresh !== false ? 'bg-cyan-100 dark:bg-cyan-900' : 'bg-slate-100 dark:bg-slate-700'}`}>
                          <RefreshCw className={`${(permissions as any).allowAutoRefresh !== false ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-white">تفعيل التحديث التلقائي</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {(permissions as any).allowAutoRefresh !== false ? '🟢 التحديث التلقائي مفعّل' : '⚪ التحديث التلقائي معطل'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const newValue = !(permissions as any).allowAutoRefresh;
                          try {
                            await systemSettingsApi.update('allowAutoRefresh', newValue.toString(), 'bool');
                            togglePermission('allowAutoRefresh', newValue);
                            notify(`تم ${newValue ? 'تفعيل' : 'تعطيل'} التحديث التلقائي ✓`, 'success');
                          } catch (e) {
                            togglePermission('allowAutoRefresh', newValue);
                            notify(`تم ${newValue ? 'تفعيل' : 'تعطيل'} التحديث التلقائي (محلياً)`, 'info');
                          }
                        }}
                        className={`relative w-14 h-7 rounded-full transition-colors ${
                          (permissions as any).allowAutoRefresh !== false ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          (permissions as any).allowAutoRefresh !== false ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* Refresh Interval */}
                    <div className={`p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-opacity ${!(permissions as any).allowAutoRefresh ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <Clock className="text-cyan-500" size={20} />
                        <div>
                          <h4 className="font-medium text-slate-800 dark:text-white text-sm">فترة التحديث</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">كل كم ثانية يتم تحديث البيانات</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={(permissions as any).autoRefreshInterval ?? 30}
                          onChange={async (e) => {
                            const value = parseInt(e.target.value);
                            try {
                              await systemSettingsApi.update('autoRefreshInterval', value.toString(), 'int');
                              togglePermission('autoRefreshInterval', value);
                              notify(`تم تحديد فترة التحديث: ${value} ثانية ✓`, 'success');
                            } catch (e) {
                              togglePermission('autoRefreshInterval', value);
                              notify(`تم تحديد فترة التحديث (محلياً)`, 'info');
                            }
                          }}
                          className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                          disabled={!(permissions as any).allowAutoRefresh}
                        >
                          <option value={10}>10 ثواني</option>
                          <option value={15}>15 ثانية</option>
                          <option value={30}>30 ثانية</option>
                          <option value={60}>دقيقة واحدة</option>
                          <option value={120}>دقيقتين</option>
                          <option value={300}>5 دقائق</option>
                          <option value={600}>10 دقائق</option>
                        </select>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {(permissions as any).allowAutoRefresh && (permissions as any).autoRefreshInterval > 0 
                            ? '🟢 نشط' 
                            : '⚪ متوقف'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* === Sync Settings === */}
            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-full text-indigo-600 dark:text-indigo-400">
                  <Database size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">إعدادات المزامنة والتحديث</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4">
                    تخصيص طريقة عرض عملية المزامنة والتحديث - جميع البيانات من قاعدة البيانات
                  </p>
                  
                  <div className="space-y-4">
                    {/* إعدادات المزامنة اليدوية */}
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center gap-2 mb-3">
                        <Database className="text-blue-600 dark:text-blue-400" size={18} />
                        <h4 className="font-bold text-blue-800 dark:text-blue-200">🔄 المزامنة اليدوية</h4>
                        <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">زر المزامنة</span>
                      </div>
                      
                      {/* Show Sync Popup */}
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 mb-3">
                        <div className="flex items-center gap-3">
                          <Eye className="text-blue-500" size={20} />
                          <div>
                            <h4 className="font-medium text-slate-800 dark:text-white text-sm">إظهار نافذة تفاصيل المزامنة</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">عرض قائمة العناصر أثناء المزامنة</p>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const newValue = !(permissions as any).showSyncPopup;
                            try {
                              await systemSettingsApi.update('showSyncPopup', newValue.toString(), 'bool');
                              togglePermission('showSyncPopup', newValue);
                              notify(`تم ${newValue ? 'تفعيل' : 'تعطيل'} نافذة المزامنة ✓`, 'success');
                            } catch (e) {
                              togglePermission('showSyncPopup', newValue);
                              notify(`تم ${newValue ? 'تفعيل' : 'تعطيل'} نافذة المزامنة (محلياً)`, 'info');
                            }
                          }}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            (permissions as any).showSyncPopup !== false ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            (permissions as any).showSyncPopup !== false ? 'right-1' : 'left-1'
                          }`} />
                        </button>
                      </div>

                      {/* Sync Duration */}
                      <div className={`p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-opacity ${!(permissions as any).showSyncPopup ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <Clock className="text-blue-500" size={20} />
                          <div>
                            <h4 className="font-medium text-slate-800 dark:text-white text-sm">مدة عرض شريط التقدم</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">الوقت المستغرق لإظهار شريط التقدم في النافذة</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={(permissions as any).syncDuration ?? 1500}
                            onChange={async (e) => {
                              const value = parseInt(e.target.value);
                              try {
                                await systemSettingsApi.update('syncDuration', value.toString(), 'int');
                                togglePermission('syncDuration', value);
                                notify(`تم تحديد مدة المزامنة: ${value / 1000} ثانية ✓`, 'success');
                              } catch (e) {
                                togglePermission('syncDuration', value);
                                notify(`تم تحديد مدة المزامنة (محلياً)`, 'info');
                              }
                            }}
                            className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                            disabled={!(permissions as any).showSyncPopup}
                          >
                            <option value={500}>نصف ثانية (سريع)</option>
                            <option value={1000}>ثانية واحدة</option>
                            <option value={1500}>1.5 ثانية (افتراضي)</option>
                            <option value={2000}>ثانيتين</option>
                            <option value={3000}>3 ثواني</option>
                            <option value={5000}>5 ثواني (بطيء)</option>
                          </select>
                          <span className="text-sm text-slate-500 dark:text-slate-400 min-w-[60px]">
                            {((permissions as any).syncDuration ?? 1500) / 1000}ث
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* إعدادات زر التحديث */}
                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700">
                      <div className="flex items-center gap-2 mb-3">
                        <RefreshCw className="text-emerald-600 dark:text-emerald-400" size={18} />
                        <h4 className="font-bold text-emerald-800 dark:text-emerald-200">🔃 زر التحديث</h4>
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded-full">التحديث اليدوي</span>
                      </div>
                      
                      {/* Show Refresh Popup */}
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 mb-3">
                        <div className="flex items-center gap-3">
                          <Eye className="text-emerald-500" size={20} />
                          <div>
                            <h4 className="font-medium text-slate-800 dark:text-white text-sm">إظهار نافذة تفاصيل التحديث</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">عرض قائمة العناصر أثناء التحديث</p>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const currentValue = (permissions as any).showRefreshPopup === true || (permissions as any).showRefreshPopup === 'true';
                            const newValue = !currentValue;
                            try {
                              await systemSettingsApi.update('showRefreshPopup', newValue.toString(), 'bool');
                              togglePermission('showRefreshPopup', newValue);
                              notify(`تم ${newValue ? 'تفعيل' : 'تعطيل'} نافذة التحديث ✓`, 'success');
                            } catch (e) {
                              togglePermission('showRefreshPopup', newValue);
                              notify(`تم ${newValue ? 'تفعيل' : 'تعطيل'} نافذة التحديث (محلياً)`, 'info');
                            }
                          }}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            (permissions as any).showRefreshPopup === true || (permissions as any).showRefreshPopup === 'true' ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            (permissions as any).showRefreshPopup === true || (permissions as any).showRefreshPopup === 'true' ? 'right-1' : 'left-1'
                          }`} />
                        </button>
                      </div>

                      {/* Refresh Duration */}
                      <div className={`p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-opacity ${!((permissions as any).showRefreshPopup === true || (permissions as any).showRefreshPopup === 'true') ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <Clock className="text-emerald-500" size={20} />
                          <div>
                            <h4 className="font-medium text-slate-800 dark:text-white text-sm">مدة عرض شريط التقدم</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">الوقت المستغرق لإظهار شريط التقدم في النافذة</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={(permissions as any).refreshDuration ?? 1000}
                            onChange={async (e) => {
                              const value = parseInt(e.target.value);
                              try {
                                await systemSettingsApi.update('refreshDuration', value.toString(), 'int');
                                togglePermission('refreshDuration', value);
                                notify(`تم تحديد مدة التحديث: ${value / 1000} ثانية ✓`, 'success');
                              } catch (e) {
                                togglePermission('refreshDuration', value);
                                notify(`تم تحديد مدة التحديث (محلياً)`, 'info');
                              }
                            }}
                            className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                            disabled={!((permissions as any).showRefreshPopup === true || (permissions as any).showRefreshPopup === 'true')}
                          >
                            <option value={300}>0.3 ثانية (فوري)</option>
                            <option value={500}>نصف ثانية</option>
                            <option value={1000}>ثانية واحدة (افتراضي)</option>
                            <option value={1500}>1.5 ثانية</option>
                            <option value={2000}>ثانيتين</option>
                          </select>
                          <span className="text-sm text-slate-500 dark:text-slate-400 min-w-[60px]">
                            {((permissions as any).refreshDuration ?? 1000) / 1000}ث
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ملاحظة */}
                    <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                      <Info size={16} className="shrink-0 mt-0.5 text-slate-500" />
                      <div>
                        <span className="font-medium">ملاحظة:</span> جميع البيانات يتم جلبها من قاعدة البيانات مباشرة عند التحديث أو المزامنة.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ==================== File Name Format Settings ==================== */}
            <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-full text-amber-600 dark:text-amber-400">
                  <FileText size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">تنسيق أسماء الملفات</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4">
                    تخصيص تنسيق اسم الملف عند طباعة أو حفظ الفواتير وكشوف الحساب والتقارير
                  </p>
                  
                  <div className="space-y-4">
                    {/* File Name Format Selector */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3 mb-3">
                        <Printer className="text-amber-500" size={20} />
                        <div>
                          <h4 className="font-medium text-slate-800 dark:text-white text-sm">تنسيق اسم الملف</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">اختر الشكل المناسب لتسمية الملفات</p>
                        </div>
                      </div>
                      <select
                        value={(permissions as any).fileNameFormat || '{app}-{company}-{type}-{customer}-{date}'}
                        onChange={async (e) => {
                          const value = e.target.value;
                          try {
                            await systemSettingsApi.update('fileNameFormat', value, 'string');
                            togglePermission('fileNameFormat', value);
                            notify('تم تحديث تنسيق اسم الملف ✓', 'success');
                          } catch (e) {
                            togglePermission('fileNameFormat', value);
                            notify('تم تحديث تنسيق اسم الملف (محلياً)', 'info');
                          }
                        }}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                      >
                        <option value="{app}-{company}-{type}-{customer}-{date}">التطبيق - الشركة - النوع - العميل - التاريخ</option>
                        <option value="{company}-{type}-{customer}-{datetime}">الشركة - النوع - العميل - التاريخ والوقت</option>
                        <option value="{type}-{customer}-{date}">النوع - العميل - التاريخ</option>
                        <option value="{company}-{customer}-{type}-{date}">الشركة - العميل - النوع - التاريخ</option>
                        <option value="{app}-{type}-{invoice}-{date}">التطبيق - النوع - رقم الفاتورة - التاريخ</option>
                        <option value="{company}-{type}-{date}-{time}">الشركة - النوع - التاريخ - الوقت</option>
                      </select>
                    </div>

                    {/* Preview */}
                    <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">معاينة اسم الملف:</p>
                      <code className="text-sm font-mono text-amber-700 dark:text-amber-300 block break-all">
                        {((permissions as any).fileNameFormat || '{app}-{company}-{type}-{customer}-{date}')
                          .replace('{app}', 'المحاسب_الذكي')
                          .replace('{company}', user?.companyName?.replace(/\s/g, '_') || 'شركتك')
                          .replace('{type}', 'فاتورة')
                          .replace('{customer}', 'اسم_العميل')
                          .replace('{invoice}', 'INV-001')
                          .replace('{date}', new Date().toLocaleDateString('ar-EG').replace(/\//g, '-'))
                          .replace('{time}', new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(/:/g, '-'))
                          .replace('{datetime}', `${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}_${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(/:/g, '-')}`)
                        }.pdf
                      </code>
                    </div>

                    {/* Variables Info */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-medium">المتغيرات المتاحة:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between"><code className="text-amber-600">{'{app}'}</code> <span className="text-slate-500">اسم التطبيق</span></div>
                        <div className="flex justify-between"><code className="text-amber-600">{'{company}'}</code> <span className="text-slate-500">اسم الشركة</span></div>
                        <div className="flex justify-between"><code className="text-amber-600">{'{type}'}</code> <span className="text-slate-500">نوع المستند</span></div>
                        <div className="flex justify-between"><code className="text-amber-600">{'{customer}'}</code> <span className="text-slate-500">اسم العميل</span></div>
                        <div className="flex justify-between"><code className="text-amber-600">{'{invoice}'}</code> <span className="text-slate-500">رقم الفاتورة</span></div>
                        <div className="flex justify-between"><code className="text-amber-600">{'{date}'}</code> <span className="text-slate-500">التاريخ</span></div>
                        <div className="flex justify-between"><code className="text-amber-600">{'{time}'}</code> <span className="text-slate-500">الوقت</span></div>
                        <div className="flex justify-between"><code className="text-amber-600">{'{datetime}'}</code> <span className="text-slate-500">التاريخ والوقت</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ==================== Customer Fields Length Limits ==================== */}
            <div className="p-6 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-rose-100 dark:bg-rose-900/50 rounded-full text-rose-600 dark:text-rose-400">
                  <FileText size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">حدود الحروف لحقول العملاء</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4">
                    تحكم بعدد الحروف المسموح لكل حقل في شاشة العملاء، مع عداد تنازلي يظهر للمستخدم أثناء الإدخال.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={16} className="text-rose-500" />
                        <label className="text-sm font-medium text-slate-800 dark:text-white">اسم العميل</label>
                      </div>
                      <input
                        type="number"
                        min={20}
                        max={200}
                        value={(permissions as any).customerNameMaxLength ?? 120}
                        onChange={async (e) => {
                          const value = Math.min(200, Math.max(20, parseInt(e.target.value) || 120));
                          try {
                            await systemSettingsApi.update('customerNameMaxLength', value.toString(), 'int');
                            togglePermission('customerNameMaxLength' as any, value);
                            notify('تم تحديث حد اسم العميل ✓', 'success');
                          } catch {
                            togglePermission('customerNameMaxLength' as any, value);
                            notify('تم تحديث حد اسم العميل (محلياً)', 'info');
                          }
                        }}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">المدى المسموح: 20 - 200 حرف</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin size={16} className="text-rose-500" />
                        <label className="text-sm font-medium text-slate-800 dark:text-white">العنوان + التفاصيل الإضافية</label>
                      </div>
                      <input
                        type="number"
                        min={40}
                        max={400}
                        value={(permissions as any).customerAddressMaxLength ?? 220}
                        onChange={async (e) => {
                          const value = Math.min(400, Math.max(40, parseInt(e.target.value) || 220));
                          try {
                            await systemSettingsApi.update('customerAddressMaxLength', value.toString(), 'int');
                            togglePermission('customerAddressMaxLength' as any, value);
                            notify('تم تحديث حد العنوان ✓', 'success');
                          } catch {
                            togglePermission('customerAddressMaxLength' as any, value);
                            notify('تم تحديث حد العنوان (محلياً)', 'info');
                          }
                        }}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">المدى المسموح: 40 - 400 حرف</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={16} className="text-rose-500" />
                        <label className="text-sm font-medium text-slate-800 dark:text-white">الملاحظات</label>
                      </div>
                      <input
                        type="number"
                        min={50}
                        max={1000}
                        value={(permissions as any).customerNotesMaxLength ?? 300}
                        onChange={async (e) => {
                          const value = Math.min(1000, Math.max(50, parseInt(e.target.value) || 300));
                          try {
                            await systemSettingsApi.update('customerNotesMaxLength', value.toString(), 'int');
                            togglePermission('customerNotesMaxLength' as any, value);
                            notify('تم تحديث حد الملاحظات ✓', 'success');
                          } catch {
                            togglePermission('customerNotesMaxLength' as any, value);
                            notify('تم تحديث حد الملاحظات (محلياً)', 'info');
                          }
                        }}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">المدى المسموح: 50 - 1000 حرف</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Phone size={16} className="text-rose-500" />
                        <label className="text-sm font-medium text-slate-800 dark:text-white">الهاتف</label>
                      </div>
                      <input
                        type="number"
                        min={8}
                        max={30}
                        value={(permissions as any).customerPhoneMaxLength ?? 20}
                        onChange={async (e) => {
                          const value = Math.min(30, Math.max(8, parseInt(e.target.value) || 20));
                          try {
                            await systemSettingsApi.update('customerPhoneMaxLength', value.toString(), 'int');
                            togglePermission('customerPhoneMaxLength' as any, value);
                            notify('تم تحديث حد الهاتف ✓', 'success');
                          } catch {
                            togglePermission('customerPhoneMaxLength' as any, value);
                            notify('تم تحديث حد الهاتف (محلياً)', 'info');
                          }
                        }}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">المدى المسموح: 8 - 30 حرف</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 md:col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail size={16} className="text-rose-500" />
                        <label className="text-sm font-medium text-slate-800 dark:text-white">البريد الإلكتروني</label>
                      </div>
                      <input
                        type="number"
                        min={30}
                        max={200}
                        value={(permissions as any).customerEmailMaxLength ?? 120}
                        onChange={async (e) => {
                          const value = Math.min(200, Math.max(30, parseInt(e.target.value) || 120));
                          try {
                            await systemSettingsApi.update('customerEmailMaxLength', value.toString(), 'int');
                            togglePermission('customerEmailMaxLength' as any, value);
                            notify('تم تحديث حد البريد الإلكتروني ✓', 'success');
                          } catch {
                            togglePermission('customerEmailMaxLength' as any, value);
                            notify('تم تحديث حد البريد الإلكتروني (محلياً)', 'info');
                          }
                        }}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">المدى المسموح: 30 - 200 حرف</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={16} className="text-rose-500" />
                        <label className="text-sm font-medium text-slate-800 dark:text-white">اسم المنتج</label>
                      </div>
                      <input
                        type="number"
                        min={20}
                        max={200}
                        value={(permissions as any).productNameMaxLength ?? 120}
                        onChange={async (e) => {
                          const value = Math.min(200, Math.max(20, parseInt(e.target.value) || 120));
                          try {
                            await systemSettingsApi.update('productNameMaxLength', value.toString(), 'int');
                            togglePermission('productNameMaxLength' as any, value);
                            notify('تم تحديث حد اسم المنتج ✓', 'success');
                          } catch {
                            togglePermission('productNameMaxLength' as any, value);
                            notify('تم تحديث حد اسم المنتج (محلياً)', 'info');
                          }
                        }}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">المدى المسموح: 20 - 200 حرف</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={16} className="text-rose-500" />
                        <label className="text-sm font-medium text-slate-800 dark:text-white">ملاحظات المنتج</label>
                      </div>
                      <input
                        type="number"
                        min={20}
                        max={500}
                        value={(permissions as any).productNotesMaxLength ?? 300}
                        onChange={async (e) => {
                          const value = Math.min(500, Math.max(20, parseInt(e.target.value) || 300));
                          try {
                            await systemSettingsApi.update('productNotesMaxLength', value.toString(), 'int');
                            togglePermission('productNotesMaxLength' as any, value);
                            notify('تم تحديث حد ملاحظات المنتج ✓', 'success');
                          } catch {
                            togglePermission('productNotesMaxLength' as any, value);
                            notify('تم تحديث حد ملاحظات المنتج (محلياً)', 'info');
                          }
                        }}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">المدى المسموح: 20 - 500 حرف</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 md:col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={16} className="text-rose-500" />
                        <label className="text-sm font-medium text-slate-800 dark:text-white">ملاحظات الفاتورة</label>
                      </div>
                      <input
                        type="number"
                        min={20}
                        max={1000}
                        value={(permissions as any).invoiceNotesMaxLength ?? 300}
                        onChange={async (e) => {
                          const value = Math.min(1000, Math.max(20, parseInt(e.target.value) || 300));
                          try {
                            await systemSettingsApi.update('invoiceNotesMaxLength', value.toString(), 'int');
                            togglePermission('invoiceNotesMaxLength' as any, value);
                            notify('تم تحديث حد ملاحظات الفاتورة ✓', 'success');
                          } catch {
                            togglePermission('invoiceNotesMaxLength' as any, value);
                            notify('تم تحديث حد ملاحظات الفاتورة (محلياً)', 'info');
                          }
                        }}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">المدى المسموح: 20 - 1000 حرف</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ==================== Offline Mode Settings ==================== */}
            <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full text-purple-600 dark:text-purple-400">
                  <Globe size={24} />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      وضع عدم الاتصال (Offline Mode)
                      <span className={`text-xs px-2 py-0.5 rounded-full ${offlineAllowedByPlan ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'}`}>
                        {offlineAllowedByPlan ? 'متاح بالباقة' : 'غير متاح بالباقة'}
                      </span>
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                      تفعيل العمل بدون اتصال بالإنترنت مع مزامنة البيانات تلقائياً عند عودة الاتصال
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      هذا الإعداد على مستوى الحساب ويُطبق على جميع المستخدمين داخل نفس الحساب.
                    </p>
                  </div>

                  {!offlineAllowedByPlan && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                      باقتك الحالية لا تتضمن العمل بدون اتصال. يلزم ترقية الباقة لتفعيل الميزة.
                    </div>
                  )}

                  {!canManageOfflineSettings && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                      يمكنك عرض الإعدادات فقط. تعديل إعدادات Offline متاح للأدمن أو من لديه صلاحية إدارة الإعدادات.
                    </div>
                  )}

                  {/* تفعيل/تعطيل Offline Mode */}
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg">
                    <div>
                      <span className="font-medium text-slate-800 dark:text-white">تفعيل وضع عدم الاتصال</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400">السماح بالعمل عند انقطاع الإنترنت</p>
                    </div>
                    <button
                      onClick={async () => {
                        const newValue = !(permissions as any).allowOfflineMode;
                        await updateOfflineSetting('allowOfflineMode', newValue, 'bool');
                      }}
                      disabled={!offlineAllowedByPlan || !canManageOfflineSettings}
                      className={`relative w-14 h-7 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        (permissions as any).allowOfflineMode !== false ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${
                        (permissions as any).allowOfflineMode !== false ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  {/* إعدادات تفصيلية */}
                  {offlineEffectiveEnabled && (
                    <div className="space-y-3 border-t border-purple-200 dark:border-purple-800 pt-4">
                      {/* صلاحيات الإنشاء */}
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Plus size={16} className="text-green-500" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">السماح بالإنشاء offline</span>
                        </div>
                        <button
                          onClick={() => updateOfflineSetting('allowOfflineCreate', (permissions as any).allowOfflineCreate === false, 'bool')}
                          disabled={!canManageOfflineSettings}
                          className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            (permissions as any).allowOfflineCreate !== false ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                            (permissions as any).allowOfflineCreate !== false ? 'right-0.5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>

                      {/* صلاحيات التعديل */}
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Edit2 size={16} className="text-amber-500" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">السماح بالتعديل offline</span>
                        </div>
                        <button
                          onClick={() => updateOfflineSetting('allowOfflineEdit', (permissions as any).allowOfflineEdit === false, 'bool')}
                          disabled={!canManageOfflineSettings}
                          className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            (permissions as any).allowOfflineEdit !== false ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                            (permissions as any).allowOfflineEdit !== false ? 'right-0.5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>

                      {/* صلاحيات الحذف */}
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Trash2 size={16} className="text-red-500" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">السماح بالحذف offline</span>
                          <span className="text-xs text-red-500">(غير مستحسن)</span>
                        </div>
                        <button
                          onClick={() => updateOfflineSetting('allowOfflineDelete', !(permissions as any).allowOfflineDelete, 'bool')}
                          disabled={!canManageOfflineSettings}
                          className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            (permissions as any).allowOfflineDelete ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                            (permissions as any).allowOfflineDelete ? 'right-0.5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>

                      {/* مؤشر حالة الاتصال */}
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Globe size={16} className="text-blue-500" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">إظهار مؤشر حالة الاتصال</span>
                        </div>
                        <button
                          onClick={() => updateOfflineSetting('showOfflineIndicator', (permissions as any).showOfflineIndicator === false, 'bool')}
                          disabled={!canManageOfflineSettings}
                          className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            (permissions as any).showOfflineIndicator !== false ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                            (permissions as any).showOfflineIndicator !== false ? 'right-0.5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>

                      {/* مزامنة تلقائية */}
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <RefreshCw size={16} className="text-cyan-500" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">مزامنة تلقائية عند عودة الاتصال</span>
                        </div>
                        <button
                          onClick={() => updateOfflineSetting('autoSyncOnReconnect', (permissions as any).autoSyncOnReconnect === false, 'bool')}
                          disabled={!canManageOfflineSettings}
                          className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            (permissions as any).autoSyncOnReconnect !== false ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                            (permissions as any).autoSyncOnReconnect !== false ? 'right-0.5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>

                      {/* إعدادات متقدمة */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                            الحد الأقصى للتغييرات المعلقة
                          </label>
                          <select
                            value={(permissions as any).maxPendingChanges || 100}
                            onChange={(e) => updateOfflineSetting('maxPendingChanges', parseInt(e.target.value), 'int')}
                            disabled={!canManageOfflineSettings}
                            className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                          >
                            <option value={50}>50 تغيير</option>
                            <option value={100}>100 تغيير</option>
                            <option value={200}>200 تغيير</option>
                            <option value={500}>500 تغيير</option>
                          </select>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                            مدة الاحتفاظ بالبيانات (أيام)
                          </label>
                          <select
                            value={(permissions as any).offlineDataRetentionDays || 30}
                            onChange={(e) => updateOfflineSetting('offlineDataRetentionDays', parseInt(e.target.value), 'int')}
                            disabled={!canManageOfflineSettings}
                            className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                          >
                            <option value={7}>7 أيام</option>
                            <option value={14}>14 يوم</option>
                            <option value={30}>30 يوم</option>
                            <option value={60}>60 يوم</option>
                            <option value={90}>90 يوم</option>
                          </select>
                        </div>
                      </div>

                      {/* فترة المزامنة */}
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                        <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                          فترة المزامنة التلقائية
                        </label>
                        <select
                          value={(permissions as any).syncIntervalSeconds || 30}
                          onChange={(e) => updateOfflineSetting('syncIntervalSeconds', parseInt(e.target.value), 'int')}
                          disabled={!canManageOfflineSettings}
                          className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                        >
                          <option value={15}>كل 15 ثانية</option>
                          <option value={30}>كل 30 ثانية</option>
                          <option value={60}>كل دقيقة</option>
                          <option value={120}>كل دقيقتين</option>
                          <option value={300}>كل 5 دقائق</option>
                        </select>
                      </div>

                      {/* لوحة إدارة طابور المزامنة */}
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-purple-100 dark:border-purple-800/60 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-white">لوحة طابور المزامنة (Outbox)</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">إدارة العناصر المعلقة/الفاشلة والتعارضات</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className={`px-2 py-1 rounded-full ${isOnline ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'}`}>
                              {isOnline ? 'متصل' : 'غير متصل'}
                            </span>
                            <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                              pending: {queueItems.filter(i => i.status === 'pending').length}
                            </span>
                            <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              failed: {queueItems.filter(i => i.status === 'failed').length}
                            </span>
                            <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                              conflicts: {queueItems.filter(i => i.errorType === 'conflict').length}
                            </span>
                            <span className="px-2 py-1 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                              syncing: {syncState.isSyncing ? 'نعم' : 'لا'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={handleForceSyncNow}
                            disabled={!isOnline || queueActionLoading !== null}
                            className="px-3 py-1.5 text-xs rounded-md bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            مزامنة الآن
                          </button>
                          <button
                            onClick={handleRetryFailed}
                            disabled={queueActionLoading !== null}
                            className="px-3 py-1.5 text-xs rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            إعادة محاولة الفاشلة
                          </button>
                          <button
                            onClick={handleDiscardConflicts}
                            disabled={queueActionLoading !== null}
                            className="px-3 py-1.5 text-xs rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            حذف المتعارضة
                          </button>
                          <button
                            onClick={() => {
                              window.dispatchEvent(new Event('autoRefreshData'));
                              notify('تم طلب تحديث البيانات من الخادم', 'info');
                            }}
                            disabled={queueActionLoading !== null}
                            className="px-3 py-1.5 text-xs rounded-md bg-slate-600 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            تحديث من الخادم
                          </button>
                        </div>

                        {queueItems.length === 0 ? (
                          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-md p-3">
                            لا توجد عناصر في طابور المزامنة حالياً.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                  <th className="text-right py-2 px-2">الكيان</th>
                                  <th className="text-right py-2 px-2">العملية</th>
                                  <th className="text-right py-2 px-2">الحالة</th>
                                  <th className="text-right py-2 px-2">الخطأ</th>
                                  <th className="text-right py-2 px-2">المحاولات</th>
                                  <th className="text-right py-2 px-2">الوقت</th>
                                  <th className="text-right py-2 px-2">إجراءات</th>
                                </tr>
                              </thead>
                              <tbody>
                                {queueItems.slice(0, 20).map((item) => (
                                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                                    <td className="py-2 px-2 font-medium text-slate-700 dark:text-slate-200">{item.entity}</td>
                                    <td className="py-2 px-2 text-slate-600 dark:text-slate-300">{item.type}</td>
                                    <td className="py-2 px-2">
                                      <span className={`px-2 py-0.5 rounded-full ${
                                        item.status === 'failed'
                                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                          : item.status === 'syncing'
                                          ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'
                                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                                      }`}>
                                        {item.status}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2 text-rose-600 dark:text-rose-300 max-w-[260px] truncate" title={item.lastError || ''}>
                                      {item.errorType === 'conflict' ? 'تعارض بيانات' : (item.lastError || '-')}
                                    </td>
                                    <td className="py-2 px-2 text-slate-600 dark:text-slate-300">{item.retryCount}/{item.maxRetries}</td>
                                    <td className="py-2 px-2 text-slate-500 dark:text-slate-400">{formatDateTime(new Date(item.timestamp).toISOString())}</td>
                                    <td className="py-2 px-2">
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleRetryItem(item.id)}
                                          disabled={queueActionLoading !== null}
                                          className="px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 disabled:opacity-50"
                                        >
                                          Retry
                                        </button>
                                        <button
                                          onClick={() => handleDiscardItem(item.id)}
                                          disabled={queueActionLoading !== null}
                                          className="px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300 disabled:opacity-50"
                                        >
                                          Discard
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Generate Mock Data */}
            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-full text-indigo-600 dark:text-indigo-400">
                  <Sparkles size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">توليد بيانات تجريبية</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4">
                    أداة للمطورين والاختبار. تقوم بإضافة منتجات وعملاء وهمية لتجربة النظام.
                  </p>
                  <button 
                    onClick={() => setShowGenerateModal(true)}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium"
                  >
                    <Play size={18} /> فتح المولد
                  </button>
                </div>
              </div>
            </div>

            {/* Download Backup */}
            <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-full text-emerald-600 dark:text-emerald-400">
                  <Download size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">تحميل نسخة احتياطية (JSON)</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4">
                    حفظ نسخة محلية من البيانات كملف JSON للطوارئ.
                  </p>
                  <button 
                    onClick={handleDownloadBackup}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium"
                  >
                    <Download size={18} /> تحميل الملف
                  </button>
                </div>
              </div>
            </div>

            {/* Restore Backup */}
            <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-full text-amber-600 dark:text-amber-400">
                  <Upload size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">استعادة من نسخة احتياطية</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4">
                    استرجاع البيانات من ملف نسخة احتياطية محلي.
                  </p>
                  <button 
                    onClick={() => setShowRestoreModal(true)}
                    className="px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 font-medium"
                  >
                    <Upload size={18} /> استيراد ملف
                  </button>
                </div>
              </div>
            </div>

            {/* Clear Data */}
            <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full text-red-600 dark:text-red-400">
                  <Trash2 size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-700 dark:text-red-400">تصفير البيانات المحلية</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4">
                    حذف جميع البيانات المحلية (localStorage). البيانات في قاعدة البيانات ستبقى.
                    <br />
                    <span className="text-red-600 text-xs font-bold">تحذير: لا يمكن التراجع عن هذا الإجراء!</span>
                  </p>
                  <button 
                    onClick={() => setShowClearModal(true)}
                    className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 font-medium"
                  >
                    <AlertTriangle size={18} /> تصفير البيانات
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== Activity Logs Tab ==================== */}
        {activeTab === 'logs' && isAdmin && (
          <div className="p-6 space-y-6">
            <div className="p-6 bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Clock size={24} />
                  سجل النشاطات
                </h2>
                <p className="opacity-90">متابعة جميع العمليات والتغييرات في النظام</p>
              </div>
              {/* شريط البحث في السجلات */}
              <div className="relative">
                <Search className="absolute right-3 top-2.5 text-slate-300" size={18} />
                <input
                  type="text"
                  value={logsSearch}
                  onChange={(e) => setLogsSearch(e.target.value)}
                  placeholder="بحث في السجلات..."
                  className="w-64 pr-10 pl-4 py-2 border border-slate-500 rounded-lg bg-slate-800/50 text-white placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                />
                {logsSearch && (
                  <button
                    onClick={() => setLogsSearch('')}
                    className="absolute left-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Period Quick Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">الفترة:</span>
              <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <button
                  onClick={() => {
                    setLogsPeriod('week');
                    const today = new Date();
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    const newFilter = { 
                      ...logsFilter,
                      from: weekAgo.toISOString().split('T')[0], 
                      to: today.toISOString().split('T')[0] 
                    };
                    setLogsFilter(newFilter);
                    setLogsPage(1);
                    loadActivityLogs(1, newFilter);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${logsPeriod === 'week' ? 'bg-blue-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                >
                  أسبوع
                </button>
                <button
                  onClick={() => {
                    setLogsPeriod('month');
                    const today = new Date();
                    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                    const newFilter = { 
                      ...logsFilter,
                      from: monthAgo.toISOString().split('T')[0], 
                      to: today.toISOString().split('T')[0] 
                    };
                    setLogsFilter(newFilter);
                    setLogsPage(1);
                    loadActivityLogs(1, newFilter);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${logsPeriod === 'month' ? 'bg-blue-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                >
                  شهر
                </button>
                <button
                  onClick={() => {
                    setLogsPeriod('year');
                    const today = new Date();
                    const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
                    const newFilter = { 
                      ...logsFilter,
                      from: yearAgo.toISOString().split('T')[0], 
                      to: today.toISOString().split('T')[0] 
                    };
                    setLogsFilter(newFilter);
                    setLogsPage(1);
                    loadActivityLogs(1, newFilter);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${logsPeriod === 'year' ? 'bg-blue-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                >
                  سنة
                </button>
                <button
                  onClick={() => setLogsPeriod('custom')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${logsPeriod === 'custom' ? 'bg-blue-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                >
                  تخصيص
                </button>
              </div>
            </div>

            {/* Filters & View Toggle */}
            <div className="flex flex-wrap gap-3 items-end justify-between">
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">نوع العملية</label>
                  <select
                    value={logsFilter.action || ''}
                    onChange={(e) => setLogsFilter({ ...logsFilter, action: e.target.value || undefined })}
                    className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value="">الكل</option>
                    <option value="تسجيل دخول">تسجيل دخول</option>
                    <option value="إنشاء">إنشاء (عام)</option>
                    <option value="إنشاء منتج">إنشاء منتج</option>
                    <option value="إنشاء عميل">إنشاء عميل</option>
                    <option value="إنشاء فاتورة">إنشاء فاتورة</option>
                    <option value="إنشاء مصروف">إنشاء مصروف</option>
                    <option value="إنشاء وحدة">إنشاء وحدة</option>
                    <option value="تعديل">تعديل (عام)</option>
                    <option value="تعديل منتج">تعديل منتج</option>
                    <option value="تعديل عميل">تعديل عميل</option>
                    <option value="تعديل فاتورة">تعديل فاتورة</option>
                    <option value="حذف">حذف (عام)</option>
                    <option value="حذف منتج">حذف منتج</option>
                    <option value="حذف عميل">حذف عميل</option>
                  </select>
                </div>
                {logsPeriod === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">من تاريخ</label>
                      <DateInput
                        value={logsFilter.from || ''}
                        onChange={(val) => setLogsFilter({ ...logsFilter, from: val || undefined })}
                        className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">إلى تاريخ</label>
                      <DateInput
                        value={logsFilter.to || ''}
                        onChange={(val) => setLogsFilter({ ...logsFilter, to: val || undefined })}
                        className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      />
                    </div>
                    <button
                      onClick={() => { setLogsPage(1); loadActivityLogs(1); }}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                      بحث
                    </button>
                  </>
                )}
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <button
                  onClick={() => setLogsViewMode('table')}
                  className={`p-1.5 rounded transition-all ${logsViewMode === 'table' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                  title="عرض جدول"
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => setLogsViewMode('grid')}
                  className={`p-1.5 rounded transition-all ${logsViewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                  title="عرض شبكي"
                >
                  <Grid3X3 size={18} />
                </button>
              </div>
            </div>

            {/* Logs Content */}
            {logsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredActivityLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">{logsSearch ? 'لا توجد نتائج للبحث' : 'لا توجد سجلات'}</p>
              </div>
            ) : logsViewMode === 'table' ? (
              <div className="overflow-x-auto">
                {/* عداد النتائج */}
                {logsSearch && (
                  <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                    تم العثور على {filteredActivityLogs.length} سجل
                  </div>
                )}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-700">
                      <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">التاريخ</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">العملية</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">الكيان</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">الوصف</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredActivityLogs.map((log) => (
                      <tr key={log.id} data-search-log-id={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${
                            log.action === 'Login' ? 'text-green-600 dark:text-green-400' :
                            log.action === 'Create' ? 'text-blue-600 dark:text-blue-400' :
                            log.action === 'Update' ? 'text-amber-600 dark:text-amber-400' :
                            log.action === 'Delete' ? 'text-red-600 dark:text-red-400' :
                            'text-slate-600 dark:text-slate-400'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {log.entityType} {log.entityName ? `(${log.entityName})` : ''}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {log.description || log.descriptionEn || '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-500 text-xs font-mono">
                          {log.ipAddress || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* عداد النتائج في العرض الشبكي */}
                {logsSearch && (
                  <div className="col-span-full mb-2 text-sm text-slate-500 dark:text-slate-400">
                    تم العثور على {filteredActivityLogs.length} سجل
                  </div>
                )}
                {filteredActivityLogs.map((log) => (
                  <div key={log.id} data-search-log-id={log.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2">
                        {log.action === 'Login' ? <LogIn size={20} className="text-green-600 dark:text-green-400" /> :
                         log.action === 'Create' ? <Plus size={20} className="text-blue-600 dark:text-blue-400" /> :
                         log.action === 'Update' ? <Edit2 size={20} className="text-amber-600 dark:text-amber-400" /> :
                         log.action === 'Delete' ? <Trash2 size={20} className="text-red-600 dark:text-red-400" /> :
                         <Clock size={20} className="text-slate-600 dark:text-slate-400" />}
                      </div>
                      <span className={`text-xs font-medium ${
                        log.action === 'Login' ? 'text-green-600 dark:text-green-400' :
                        log.action === 'Create' ? 'text-blue-600 dark:text-blue-400' :
                        log.action === 'Update' ? 'text-amber-600 dark:text-amber-400' :
                        log.action === 'Delete' ? 'text-red-600 dark:text-red-400' :
                        'text-slate-600 dark:text-slate-400'
                      }`}>
                        {log.action}
                      </span>
                    </div>
                    
                    <h4 className="font-bold text-slate-800 dark:text-white mb-1">{log.entityType}</h4>
                    {log.entityName && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{log.entityName}</p>
                    )}
                    
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                      {log.description || log.descriptionEn || '-'}
                    </p>
                    
                    <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>{formatDateTime(log.createdAt)}</span>
                      <span className="font-mono">{log.ipAddress || '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {logsTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                  disabled={logsPage === 1}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 text-slate-700 dark:text-slate-300"
                >
                  السابق
                </button>
                <span className="px-4 py-2 text-slate-600 dark:text-slate-400">
                  صفحة {logsPage} من {logsTotalPages}
                </span>
                <button
                  onClick={() => setLogsPage(p => Math.min(logsTotalPages, p + 1))}
                  disabled={logsPage === logsTotalPages}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 text-slate-700 dark:text-slate-300"
                >
                  التالي
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================== Permissions Matrix Tab ==================== */}
        {activeTab === 'permissions' && isAdmin && (
          <div className="p-6 space-y-6">
            <div className="p-6 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl text-white">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <Key size={24} />
                مصفوفة الصلاحيات
              </h2>
              <p className="opacity-90">تحكم في صلاحيات الحسابات والمستخدمين والأدوار على مكونات النظام</p>
            </div>

            {/* Entity Type Selection - Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex border-b border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => { setPermEntityType('roles'); setSelectedPermRole(''); }}
                  className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    (!permEntityType || permEntityType === 'roles')
                      ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-b-2 border-violet-600'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Shield size={18} />
                  الأدوار ({roles.length})
                </button>
                <button
                  onClick={() => { setPermEntityType('users'); setSelectedPermRole(''); }}
                  className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    permEntityType === 'users'
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Users size={18} />
                  المستخدمين ({users.length})
                </button>
                <button
                  onClick={() => { setPermEntityType('accounts'); setSelectedPermRole(''); }}
                  className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    permEntityType === 'accounts'
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-b-2 border-emerald-600'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Building2 size={18} />
                  الحسابات ({accounts.length})
                </button>
              </div>

              <div className="p-4">
                {/* Selection Row */}
                <div className="flex flex-wrap gap-4 mb-4">
                  {/* Entity Selector */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                      {(!permEntityType || permEntityType === 'roles') ? '🛡️ اختر الدور' : 
                       permEntityType === 'users' ? '👤 اختر المستخدم' : '🏢 اختر الحساب'}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedPermRole}
                        onChange={(e) => setSelectedPermRole(e.target.value)}
                        className="flex-1 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      >
                        <option value="">
                          -- اختر {(!permEntityType || permEntityType === 'roles') ? 'دور' : permEntityType === 'users' ? 'مستخدم' : 'حساب'} --
                        </option>
                        {/* خيار الكل */}
                        {(!permEntityType || permEntityType === 'roles') && (
                          <option value="all_roles" className="font-bold bg-violet-100">📋 الكل ({roles.length} دور)</option>
                        )}
                        {permEntityType === 'users' && (
                          <option value="all_users" className="font-bold bg-blue-100">👥 الكل ({users.length} مستخدم)</option>
                        )}
                        {permEntityType === 'accounts' && (
                          <option value="all_accounts" className="font-bold bg-emerald-100">🏢 الكل ({accounts.length} حساب)</option>
                        )}
                        {/* القائمة الفردية */}
                        {(!permEntityType || permEntityType === 'roles') && roles.map(role => (
                          <option key={role.id} value={`role_${role.id}`}>
                            {role.name} {role.nameEn ? `(${role.nameEn})` : ''}
                          </option>
                        ))}
                        {permEntityType === 'users' && users.map(user => (
                          <option key={user.id} value={`user_${user.id}`}>
                            {user.fullName || user.username} {user.email ? `- ${user.email}` : ''}
                          </option>
                        ))}
                        {permEntityType === 'accounts' && accounts.map(acc => (
                          <option key={acc.id} value={`account_${acc.id}`}>
                            {acc.name} {acc.code ? `(${acc.code})` : ''}
                          </option>
                        ))}
                      </select>
                      {/* زر عرض الصلاحيات */}
                      {selectedPermRole && (
                        <button
                          onClick={() => setShowPermissionsPreview(true)}
                          className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md"
                          title="عرض ملخص الصلاحيات"
                        >
                          <Eye size={16} />
                          <span className="hidden sm:inline">عرض</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Category Filter */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">📂 تصنيف المكونات</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                    >
                      {MODULE_CATEGORIES.map(cat => {
                        const count = cat.id === 'all' 
                          ? SYSTEM_MODULES.length 
                          : SYSTEM_MODULES.filter(m => m.category === cat.id).length;
                        const icons: Record<string, string> = {
                          all: '📋',
                          pages: '📄',
                          menu: '📑',
                          tabs: '🗂️',
                          actions: '🔘',
                          features: '⚡'
                        };
                        return (
                          <option key={cat.id} value={cat.id}>
                            {icons[cat.id] || '📁'} {cat.name} ({count} مكون)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Category Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                  {MODULE_CATEGORIES.map(cat => {
                    const count = cat.id === 'all' 
                      ? SYSTEM_MODULES.length 
                      : SYSTEM_MODULES.filter(m => m.category === cat.id).length;
                    const icons: Record<string, string> = {
                      all: '📋',
                      pages: '📄',
                      menu: '📑',
                      tabs: '🗂️',
                      actions: '🔘',
                      features: '⚡'
                    };
                    const colors: Record<string, string> = {
                      all: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300',
                      pages: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
                      menu: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
                      tabs: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
                      actions: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
                      features: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300'
                    };
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          selectedCategory === cat.id 
                            ? colors[cat.id] + ' ring-2 ring-offset-1 ring-violet-500' 
                            : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <div className="text-lg">{icons[cat.id] || '📁'}</div>
                        <div className="text-[10px] font-medium">{cat.name}</div>
                        <div className="text-xs font-bold">{count}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Actions Bar - Show when entity selected */}
                {selectedPermRole && (
                  <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg mb-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      إجراءات سريعة 
                      {selectedPermRole.startsWith('all_') && (
                        <span className="text-violet-600 dark:text-violet-400 mr-1">
                          (سيتم تطبيقها على {selectedPermRole === 'all_roles' ? `${roles.length} دور` : selectedPermRole === 'all_users' ? `${users.length} مستخدم` : `${accounts.length} حساب`})
                        </span>
                      )}:
                    </span>
                    <button
                      onClick={() => {
                        const fullAccess = SYSTEM_MODULES.reduce((acc, m) => ({
                          ...acc, [m.id]: { view: true, create: true, edit: true, delete: true, print: true }
                        }), {});
                        
                        // إذا كان "الكل" مختار، نطبق على جميع العناصر
                        if (selectedPermRole === 'all_roles') {
                          const newMatrix = { ...permissionsMatrix };
                          roles.forEach(r => { newMatrix[`role_${r.id}`] = fullAccess; });
                          setPermissionsMatrix(newMatrix);
                          localStorage.setItem('smartAccountant_permissionsMatrix', JSON.stringify(newMatrix));
                        } else if (selectedPermRole === 'all_users') {
                          const newMatrix = { ...permissionsMatrix };
                          users.forEach(u => { newMatrix[`user_${u.id}`] = fullAccess; });
                          setPermissionsMatrix(newMatrix);
                          localStorage.setItem('smartAccountant_permissionsMatrix', JSON.stringify(newMatrix));
                        } else if (selectedPermRole === 'all_accounts') {
                          const newMatrix = { ...permissionsMatrix };
                          accounts.forEach(a => { newMatrix[`account_${a.id}`] = fullAccess; });
                          setPermissionsMatrix(newMatrix);
                          localStorage.setItem('smartAccountant_permissionsMatrix', JSON.stringify(newMatrix));
                        } else {
                          const newMatrix = { ...permissionsMatrix, [selectedPermRole]: fullAccess };
                          setPermissionsMatrix(newMatrix);
                          localStorage.setItem('smartAccountant_permissionsMatrix', JSON.stringify(newMatrix));
                        }
                        notify('تم تطبيق صلاحيات كاملة وحفظها ✓', 'success');
                      }}
                      className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 flex items-center gap-1.5 transition-colors"
                    >
                      <Check size={14} /> صلاحيات كاملة
                    </button>
                    <button
                      onClick={() => {
                        const viewOnly = SYSTEM_MODULES.reduce((acc, m) => ({
                          ...acc, [m.id]: { view: true, create: false, edit: false, delete: false, print: true }
                        }), {});
                        
                        if (selectedPermRole === 'all_roles') {
                          const newMatrix = { ...permissionsMatrix };
                          roles.forEach(r => { newMatrix[`role_${r.id}`] = viewOnly; });
                          setPermissionsMatrix(newMatrix);
                          localStorage.setItem('smartAccountant_permissionsMatrix', JSON.stringify(newMatrix));
                        } else if (selectedPermRole === 'all_users') {
                          const newMatrix = { ...permissionsMatrix };
                          users.forEach(u => { newMatrix[`user_${u.id}`] = viewOnly; });
                          setPermissionsMatrix(newMatrix);
                          localStorage.setItem('smartAccountant_permissionsMatrix', JSON.stringify(newMatrix));
                        } else if (selectedPermRole === 'all_accounts') {
                          const newMatrix = { ...permissionsMatrix };
                          accounts.forEach(a => { newMatrix[`account_${a.id}`] = viewOnly; });
                          setPermissionsMatrix(newMatrix);
                          localStorage.setItem('smartAccountant_permissionsMatrix', JSON.stringify(newMatrix));
                        } else {
                          const newMatrix = { ...permissionsMatrix, [selectedPermRole]: viewOnly };
                          setPermissionsMatrix(newMatrix);
                          localStorage.setItem('smartAccountant_permissionsMatrix', JSON.stringify(newMatrix));
                        }
                        notify('تم تطبيق صلاحية العرض فقط وحفظها ✓', 'success');
                      }}
                      className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 flex items-center gap-1.5 transition-colors"
                    >
                      <Eye size={14} /> عرض فقط
                    </button>
                    <button
                      onClick={() => {
                        const noAccess = SYSTEM_MODULES.reduce((acc, m) => ({
                          ...acc, [m.id]: { view: false, create: false, edit: false, delete: false, print: false }
                        }), {});
                        
                        if (selectedPermRole === 'all_roles') {
                          const newMatrix = { ...permissionsMatrix };
                          roles.forEach(r => { newMatrix[`role_${r.id}`] = noAccess; });
                          setPermissionsMatrix(newMatrix);
                          localStorage.setItem('smartAccountant_permissionsMatrix', JSON.stringify(newMatrix));
                        } else if (selectedPermRole === 'all_users') {
                          const newMatrix = { ...permissionsMatrix };
                          users.forEach(u => { newMatrix[`user_${u.id}`] = noAccess; });
                          setPermissionsMatrix(newMatrix);
                          localStorage.setItem('smartAccountant_permissionsMatrix', JSON.stringify(newMatrix));
                        } else if (selectedPermRole === 'all_accounts') {
                          const newMatrix = { ...permissionsMatrix };
                          accounts.forEach(a => { newMatrix[`account_${a.id}`] = noAccess; });
                          setPermissionsMatrix(newMatrix);
                          localStorage.setItem('smartAccountant_permissionsMatrix', JSON.stringify(newMatrix));
                        } else {
                          const newMatrix = { ...permissionsMatrix, [selectedPermRole]: noAccess };
                          setPermissionsMatrix(newMatrix);
                          localStorage.setItem('smartAccountant_permissionsMatrix', JSON.stringify(newMatrix));
                        }
                        notify('تم إزالة جميع الصلاحيات وحفظها ✓', 'success');
                      }}
                      className="px-3 py-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-medium hover:bg-rose-200 dark:hover:bg-rose-900/50 flex items-center gap-1.5 transition-colors"
                    >
                      <X size={14} /> إزالة الكل
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Permissions Matrix Grid */}
            {selectedPermRole && !selectedPermRole.startsWith('all_') ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Grid Header */}
                <div className="grid grid-cols-6 bg-slate-100 dark:bg-slate-700 text-xs font-medium">
                  <div className="col-span-1 px-4 py-3 text-slate-600 dark:text-slate-300">المكون</div>
                  <div className="px-2 py-3 text-center text-slate-600 dark:text-slate-300">
                    <div className="flex flex-col items-center gap-1">
                      <Eye size={16} className="text-blue-500" />
                      <span>عرض</span>
                    </div>
                  </div>
                  <div className="px-2 py-3 text-center text-slate-600 dark:text-slate-300">
                    <div className="flex flex-col items-center gap-1">
                      <Plus size={16} className="text-emerald-500" />
                      <span>إضافة</span>
                    </div>
                  </div>
                  <div className="px-2 py-3 text-center text-slate-600 dark:text-slate-300">
                    <div className="flex flex-col items-center gap-1">
                      <Edit2 size={16} className="text-amber-500" />
                      <span>تعديل</span>
                    </div>
                  </div>
                  <div className="px-2 py-3 text-center text-slate-600 dark:text-slate-300">
                    <div className="flex flex-col items-center gap-1">
                      <Trash2 size={16} className="text-rose-500" />
                      <span>حذف</span>
                    </div>
                  </div>
                  <div className="px-2 py-3 text-center text-slate-600 dark:text-slate-300">
                    <div className="flex flex-col items-center gap-1">
                      <Printer size={16} className="text-indigo-500" />
                      <span>طباعة</span>
                    </div>
                  </div>
                </div>

                {/* Scrollable Grid Body */}
                <div className="max-h-[400px] overflow-y-auto">
                  {MODULE_CATEGORIES.filter(cat => cat.id !== 'all').map(category => {
                    const categoryModules = SYSTEM_MODULES.filter(m => 
                      (selectedCategory === 'all' || m.category === selectedCategory) && 
                      m.category === category.id
                    );
                    
                    if (categoryModules.length === 0) return null;
                    
                    return (
                      <div key={category.id}>
                        {/* Category Header */}
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-y border-slate-200 dark:border-slate-600 sticky top-0 z-10">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {category.name} ({categoryModules.length})
                          </span>
                        </div>
                        
                        {/* Category Modules */}
                        {categoryModules.map((module, idx) => {
                          const perms = permissionsMatrix[selectedPermRole]?.[module.id] || { view: false, create: false, edit: false, delete: false, print: false };
                          const allChecked = perms.view && perms.create && perms.edit && perms.delete && perms.print;
                          
                          return (
                            <div 
                              key={module.id} 
                              className={`grid grid-cols-6 items-center border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/50'}`}
                            >
                              {/* Module Name with Quick Toggle */}
                              <div className="col-span-1 px-4 py-2.5 flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    const newPerms = allChecked 
                                      ? { view: false, create: false, edit: false, delete: false, print: false }
                                      : { view: true, create: true, edit: true, delete: true, print: true };
                                    setPermissionsMatrix(prev => ({
                                      ...prev,
                                      [selectedPermRole]: {
                                        ...prev[selectedPermRole],
                                        [module.id]: newPerms
                                      }
                                    }));
                                    notify(`تم ${allChecked ? 'إزالة' : 'تفعيل'} جميع صلاحيات ${module.name} - حفظ تلقائي ✓`, 'info');
                                  }}
                                  className={`w-5 h-5 rounded flex items-center justify-center text-white text-xs transition-colors ${
                                    allChecked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                                  }`}
                                  title="تبديل الكل"
                                >
                                  {allChecked && <Check size={12} />}
                                </button>
                                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{module.name}</span>
                              </div>
                              
                              {/* Permission Toggles */}
                              {(['view', 'create', 'edit', 'delete', 'print'] as const).map(perm => {
                                const permLabels = { view: 'عرض', create: 'إضافة', edit: 'تعديل', delete: 'حذف', print: 'طباعة' };
                                return (
                                <div key={perm} className="px-2 py-2.5 flex justify-center">
                                  <button
                                    onClick={() => {
                                      const newValue = !perms[perm];
                                      setPermissionsMatrix(prev => ({
                                        ...prev,
                                        [selectedPermRole]: {
                                          ...prev[selectedPermRole],
                                          [module.id]: {
                                            ...perms,
                                            [perm]: newValue
                                          }
                                        }
                                      }));
                                      notify(`${newValue ? '✅' : '❌'} ${permLabels[perm]} ${module.name} - حفظ تلقائي`, newValue ? 'success' : 'info');
                                    }}
                                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                      perms[perm]
                                        ? perm === 'view' ? 'bg-blue-500 text-white shadow-sm shadow-blue-200 dark:shadow-none'
                                        : perm === 'create' ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200 dark:shadow-none'
                                        : perm === 'edit' ? 'bg-amber-500 text-white shadow-sm shadow-amber-200 dark:shadow-none'
                                        : perm === 'delete' ? 'bg-rose-500 text-white shadow-sm shadow-rose-200 dark:shadow-none'
                                        : 'bg-indigo-500 text-white shadow-sm shadow-indigo-200 dark:shadow-none'
                                        : 'bg-slate-100 dark:bg-slate-600 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-500'
                                    }`}
                                  >
                                    {perms[perm] ? <Check size={16} /> : <X size={16} />}
                                  </button>
                                </div>
                              );})}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Footer */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-600 flex items-center justify-between">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium">
                      {SYSTEM_MODULES.filter(m => selectedCategory === 'all' || m.category === selectedCategory).length}
                    </span>
                    {' '}مكون
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-blue-500" /> عرض
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-500" /> إضافة
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-amber-500" /> تعديل
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-rose-500" /> حذف
                    </span>
                  </div>
                </div>
              </div>
            ) : selectedPermRole && selectedPermRole.startsWith('all_') ? (
              /* عرض خاص لخيار "الكل" - جدول الصلاحيات مع ملخص العناصر */
              <div className="space-y-4">
                {/* ملخص العناصر */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-900/30 dark:to-purple-900/30 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 font-bold">
                      <Shield size={20} />
                      {selectedPermRole === 'all_roles' && `تطبيق جماعي على ${roles.length} دور`}
                      {selectedPermRole === 'all_users' && `تطبيق جماعي على ${users.length} مستخدم`}
                      {selectedPermRole === 'all_accounts' && `تطبيق جماعي على ${accounts.length} حساب`}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      عدّل الصلاحيات أدناه وسيتم تطبيقها على جميع العناصر تلقائياً
                    </p>
                  </div>
                  
                  {/* قائمة العناصر المتأثرة */}
                  <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex flex-wrap gap-2">
                      {selectedPermRole === 'all_roles' && roles.map(role => (
                        <span key={role.id} className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-xs">
                          {role.name}
                        </span>
                      ))}
                      {selectedPermRole === 'all_users' && users.map(user => (
                        <span key={user.id} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                          {user.fullName || user.username}
                        </span>
                      ))}
                      {selectedPermRole === 'all_accounts' && accounts.map(acc => (
                        <span key={acc.id} className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs">
                          {acc.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* جدول الصلاحيات للتعديل الجماعي */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {/* Grid Header */}
                  <div className="grid grid-cols-6 bg-slate-100 dark:bg-slate-700 text-xs font-medium">
                    <div className="col-span-1 px-4 py-3 text-slate-600 dark:text-slate-300">المكون</div>
                    <div className="px-2 py-3 text-center text-slate-600 dark:text-slate-300">
                      <div className="flex flex-col items-center gap-1">
                        <Eye size={16} className="text-blue-500" />
                        <span>عرض</span>
                      </div>
                    </div>
                    <div className="px-2 py-3 text-center text-slate-600 dark:text-slate-300">
                      <div className="flex flex-col items-center gap-1">
                        <Plus size={16} className="text-emerald-500" />
                        <span>إضافة</span>
                      </div>
                    </div>
                    <div className="px-2 py-3 text-center text-slate-600 dark:text-slate-300">
                      <div className="flex flex-col items-center gap-1">
                        <Edit2 size={16} className="text-amber-500" />
                        <span>تعديل</span>
                      </div>
                    </div>
                    <div className="px-2 py-3 text-center text-slate-600 dark:text-slate-300">
                      <div className="flex flex-col items-center gap-1">
                        <Trash2 size={16} className="text-rose-500" />
                        <span>حذف</span>
                      </div>
                    </div>
                    <div className="px-2 py-3 text-center text-slate-600 dark:text-slate-300">
                      <div className="flex flex-col items-center gap-1">
                        <Printer size={16} className="text-indigo-500" />
                        <span>طباعة</span>
                      </div>
                    </div>
                  </div>

                  {/* Scrollable Grid Body */}
                  <div className="max-h-[400px] overflow-y-auto">
                    {MODULE_CATEGORIES.filter(cat => cat.id !== 'all').map(category => {
                      const categoryModules = SYSTEM_MODULES.filter(m => 
                        (selectedCategory === 'all' || m.category === selectedCategory) && 
                        m.category === category.id
                      );
                      
                      if (categoryModules.length === 0) return null;
                      
                      return (
                        <div key={category.id}>
                          {/* Category Header */}
                          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-y border-slate-200 dark:border-slate-600 sticky top-0 z-10">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              {category.name} ({categoryModules.length})
                            </span>
                          </div>
                          
                          {/* Category Modules */}
                          {categoryModules.map((module, idx) => {
                            // للتعديل الجماعي، نأخذ صلاحيات أول عنصر كمرجع
                            const firstKey = selectedPermRole === 'all_roles' ? `role_${roles[0]?.id}` 
                              : selectedPermRole === 'all_users' ? `user_${users[0]?.id}` 
                              : `account_${accounts[0]?.id}`;
                            const perms = permissionsMatrix[firstKey]?.[module.id] || { view: false, create: false, edit: false, delete: false, print: false };
                            const allChecked = perms.view && perms.create && perms.edit && perms.delete && perms.print;
                            
                            return (
                              <div 
                                key={module.id} 
                                className={`grid grid-cols-6 items-center border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/50'}`}
                              >
                                {/* Module Name with Quick Toggle */}
                                <div className="col-span-1 px-4 py-2.5 flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      const newPerms = allChecked 
                                        ? { view: false, create: false, edit: false, delete: false, print: false }
                                        : { view: true, create: true, edit: true, delete: true, print: true };
                                      
                                      // تطبيق على جميع العناصر
                                      const newMatrix = { ...permissionsMatrix };
                                      if (selectedPermRole === 'all_roles') {
                                        roles.forEach(r => {
                                          const key = `role_${r.id}`;
                                          newMatrix[key] = { ...(newMatrix[key] || {}), [module.id]: newPerms };
                                        });
                                      } else if (selectedPermRole === 'all_users') {
                                        users.forEach(u => {
                                          const key = `user_${u.id}`;
                                          newMatrix[key] = { ...(newMatrix[key] || {}), [module.id]: newPerms };
                                        });
                                      } else if (selectedPermRole === 'all_accounts') {
                                        accounts.forEach(a => {
                                          const key = `account_${a.id}`;
                                          newMatrix[key] = { ...(newMatrix[key] || {}), [module.id]: newPerms };
                                        });
                                      }
                                      setPermissionsMatrix(newMatrix);
                                      notify(`تم ${allChecked ? 'إزالة' : 'تفعيل'} جميع صلاحيات ${module.name} للكل - حفظ تلقائي ✓`, 'info');
                                    }}
                                    className={`w-5 h-5 rounded flex items-center justify-center text-white text-xs transition-colors ${
                                      allChecked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                                    }`}
                                    title="تبديل الكل"
                                  >
                                    {allChecked && <Check size={12} />}
                                  </button>
                                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{module.name}</span>
                                </div>
                                
                                {/* Permission Toggles */}
                                {(['view', 'create', 'edit', 'delete', 'print'] as const).map(perm => {
                                  const permLabels = { view: 'عرض', create: 'إضافة', edit: 'تعديل', delete: 'حذف', print: 'طباعة' };
                                  return (
                                  <div key={perm} className="px-2 py-2.5 flex justify-center">
                                    <button
                                      onClick={() => {
                                        const newValue = !perms[perm];
                                        
                                        // تطبيق على جميع العناصر
                                        const newMatrix = { ...permissionsMatrix };
                                        if (selectedPermRole === 'all_roles') {
                                          roles.forEach(r => {
                                            const key = `role_${r.id}`;
                                            newMatrix[key] = { 
                                              ...(newMatrix[key] || {}), 
                                              [module.id]: { 
                                                ...(newMatrix[key]?.[module.id] || { view: false, create: false, edit: false, delete: false, print: false }),
                                                [perm]: newValue 
                                              } 
                                            };
                                          });
                                        } else if (selectedPermRole === 'all_users') {
                                          users.forEach(u => {
                                            const key = `user_${u.id}`;
                                            newMatrix[key] = { 
                                              ...(newMatrix[key] || {}), 
                                              [module.id]: { 
                                                ...(newMatrix[key]?.[module.id] || { view: false, create: false, edit: false, delete: false, print: false }),
                                                [perm]: newValue 
                                              } 
                                            };
                                          });
                                        } else if (selectedPermRole === 'all_accounts') {
                                          accounts.forEach(a => {
                                            const key = `account_${a.id}`;
                                            newMatrix[key] = { 
                                              ...(newMatrix[key] || {}), 
                                              [module.id]: { 
                                                ...(newMatrix[key]?.[module.id] || { view: false, create: false, edit: false, delete: false, print: false }),
                                                [perm]: newValue 
                                              } 
                                            };
                                          });
                                        }
                                        setPermissionsMatrix(newMatrix);
                                        notify(`${newValue ? '✅' : '❌'} ${permLabels[perm]} ${module.name} للكل - حفظ تلقائي`, newValue ? 'success' : 'info');
                                      }}
                                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                        perms[perm]
                                          ? perm === 'view' ? 'bg-blue-500 text-white shadow-sm shadow-blue-200 dark:shadow-none'
                                          : perm === 'create' ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200 dark:shadow-none'
                                          : perm === 'edit' ? 'bg-amber-500 text-white shadow-sm shadow-amber-200 dark:shadow-none'
                                          : perm === 'delete' ? 'bg-rose-500 text-white shadow-sm shadow-rose-200 dark:shadow-none'
                                          : 'bg-indigo-500 text-white shadow-sm shadow-indigo-200 dark:shadow-none'
                                          : 'bg-slate-100 dark:bg-slate-600 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-500'
                                      }`}
                                    >
                                      {perms[perm] ? <Check size={16} /> : <X size={16} />}
                                    </button>
                                  </div>
                                );})}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Footer */}
                  <div className="px-4 py-3 bg-violet-50 dark:bg-violet-900/20 border-t border-slate-200 dark:border-slate-600 flex items-center justify-between">
                    <div className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                      ⚡ أي تغيير سيطبق على جميع {selectedPermRole === 'all_roles' ? `${roles.length} دور` : selectedPermRole === 'all_users' ? `${users.length} مستخدم` : `${accounts.length} حساب`}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Key className="w-10 h-10 text-violet-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">اختر عنصراً لتعديل صلاحياته</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  حدد {(!permEntityType || permEntityType === 'roles') ? 'دور' : permEntityType === 'users' ? 'مستخدم' : 'حساب'} من القائمة أعلاه لعرض وتعديل صلاحياته على مكونات النظام
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================== Account Modal ==================== */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  {editingAccount ? 'تعديل الحساب' : 'إضافة حساب جديد'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {editingAccount ? 'تعديل بيانات الحساب' : 'إنشاء حساب جديد لشركة أو منشأة'}
                </p>
              </div>
              <button
                onClick={() => setShowAccountModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* قسم شعار الحساب */}
              <div className="flex flex-col items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
                  شعار الحساب
                </label>
                <div className="relative group">
                  <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                    {accountFormData.logoUrl ? (
                      <img 
                        src={accountFormData.logoUrl} 
                        alt="شعار الحساب"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <Building size={32} />
                        <span className="text-xs">لا يوجد شعار</span>
                      </div>
                    )}
                  </div>
                  {/* زر تغيير الشعار */}
                  <input
                    type="file"
                    id="account-logo-upload"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={async (e) => {
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
                        setAccountFormData({ ...accountFormData, logoUrl: base64 });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label
                    htmlFor="account-logo-upload"
                    className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    <div className="flex flex-col items-center text-white">
                      <Upload size={20} />
                      <span className="text-xs mt-1">تغيير</span>
                    </div>
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="أو أدخل رابط URL للشعار..."
                    value={accountFormData.logoUrl?.startsWith('data:') ? '' : (accountFormData.logoUrl || '')}
                    onChange={(e) => setAccountFormData({ ...accountFormData, logoUrl: e.target.value })}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm w-64"
                  />
                  {accountFormData.logoUrl && (
                    <button
                      onClick={() => setAccountFormData({ ...accountFormData, logoUrl: '' })}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-sm"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400">(PNG, JPG, SVG - حد أقصى 500KB)</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    اسم الحساب *
                  </label>
                  <input
                    type="text"
                    value={accountFormData.name}
                    onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    placeholder="شركة المحاسب الذكي"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    الاسم بالإنجليزية
                  </label>
                  <input
                    type="text"
                    value={accountFormData.nameEn}
                    onChange={(e) => setAccountFormData({ ...accountFormData, nameEn: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    placeholder="Smart Accountant Co."
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={accountFormData.email}
                    onChange={(e) => setAccountFormData({ ...accountFormData, email: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    placeholder="info@company.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    الهاتف
                  </label>
                  <input
                    type="tel"
                    value={accountFormData.phone}
                    onChange={(e) => setAccountFormData({ ...accountFormData, phone: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    placeholder="+966xxxxxxxxx"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  العنوان
                </label>
                <input
                  type="text"
                  value={accountFormData.address}
                  onChange={(e) => setAccountFormData({ ...accountFormData, address: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  placeholder="المملكة العربية السعودية - الرياض"
                />

                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 rounded-lg space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={openAccountLocationOnMap}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      <MapPin size={13} />
                      فتح الخريطة
                    </button>
                    <button
                      type="button"
                      onClick={detectAccountLocation}
                      disabled={detectingAccountLocation}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-70"
                    >
                      {detectingAccountLocation ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
                      موقعي الحالي
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountFormData({ ...accountFormData, latitude: '', longitude: '' })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                    >
                      مسح الإحداثيات
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">خط العرض (Latitude)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        value={accountFormData.latitude}
                        onChange={(e) => setAccountFormData({ ...accountFormData, latitude: e.target.value })}
                        placeholder="مثال: 24.713552"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">خط الطول (Longitude)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        value={accountFormData.longitude}
                        onChange={(e) => setAccountFormData({ ...accountFormData, longitude: e.target.value })}
                        placeholder="مثال: 46.675297"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <CoordinateMapPicker
                    latitude={accountFormData.latitude}
                    longitude={accountFormData.longitude}
                    label={accountFormData.name || 'موقع الشركة'}
                    onChange={(nextLatitude, nextLongitude) =>
                      setAccountFormData({
                        ...accountFormData,
                        latitude: nextLatitude,
                        longitude: nextLongitude,
                      })
                    }
                  />

                  {!accountCoordinatesPreview.isValid && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{accountCoordinatesPreview.message}</p>
                  )}
                  {accountCoordinatesPreview.isValid && accountCoordinatesPreview.hasCoordinates && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400" dir="ltr">
                      GPS({accountCoordinatesPreview.latitude}, {accountCoordinatesPreview.longitude})
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    العملة
                  </label>
                  <select
                    value={accountFormData.currencySymbol}
                    onChange={(e) => setAccountFormData({ ...accountFormData, currencySymbol: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value="ج.م">جنيه مصري (ج.م)</option>
                    <option value="ر.س">ريال سعودي (ر.س)</option>
                    <option value="د.إ">درهم إماراتي (د.إ)</option>
                    <option value="$">دولار أمريكي ($)</option>
                    <option value="€">يورو (€)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    الرقم الضريبي
                  </label>
                  <input
                    type="text"
                    value={accountFormData.taxNumber}
                    onChange={(e) => setAccountFormData({ ...accountFormData, taxNumber: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    placeholder="300xxxxxxxxx"
                  />
                </div>
              </div>

              {/* Admin User - Only for new accounts */}
              {!editingAccount && (
                <>
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h3 className="font-medium text-slate-800 dark:text-white mb-3">
                      بيانات المدير
                    </h3>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                        اسم المستخدم *
                      </label>
                      <input
                        type="text"
                        value={accountFormData.adminUsername}
                        onChange={(e) => setAccountFormData({ ...accountFormData, adminUsername: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                        placeholder="admin"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                        كلمة المرور *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={accountFormData.adminPassword}
                          onChange={(e) => setAccountFormData({ ...accountFormData, adminPassword: e.target.value })}
                          className="w-full p-2.5 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                          placeholder="••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-2.5 text-slate-400"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                      اسم المدير الكامل
                    </label>
                    <input
                      type="text"
                      value={accountFormData.adminFullName}
                      onChange={(e) => setAccountFormData({ ...accountFormData, adminFullName: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      placeholder="أحمد محمد"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => {
                  setShowAccountModal(false);
                  resetAccountForm();
                }}
                className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                إلغاء
              </button>
              <button
                onClick={editingAccount ? handleUpdateAccount : handleCreateAccount}
                disabled={loading}
                className="flex-1 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {editingAccount ? 'تحديث' : 'إنشاء'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Role Modal ==================== */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {selectedRole ? 'تعديل الدور' : 'إضافة دور جديد'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {selectedRole ? 'تعديل بيانات الدور' : 'إنشاء دور جديد مع صلاحياته'}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  اسم الدور (عربي) *
                </label>
                <input
                  type="text"
                  value={roleFormData.name}
                  onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  placeholder="مثال: محاسب"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  اسم الدور (إنجليزي)
                </label>
                <input
                  type="text"
                  value={roleFormData.nameEn}
                  onChange={(e) => setRoleFormData({ ...roleFormData, nameEn: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  placeholder="Accountant"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  اللون
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={roleFormData.color}
                    onChange={(e) => setRoleFormData({ ...roleFormData, color: e.target.value })}
                    className="w-12 h-10 rounded-lg cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={roleFormData.color}
                    onChange={(e) => setRoleFormData({ ...roleFormData, color: e.target.value })}
                    className="flex-1 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-mono"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  الوصف
                </label>
                <textarea
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white h-20"
                  placeholder="وصف مختصر للدور وصلاحياته..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  resetRoleForm();
                }}
                className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                إلغاء
              </button>
              <button
                onClick={selectedRole ? handleUpdateRole : handleCreateRole}
                disabled={loading}
                className="flex-1 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {selectedRole ? 'تحديث' : 'إنشاء'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Plan Modal ==================== */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Crown className="text-amber-500" />
                {editingPlan ? 'تعديل الخطة' : 'إضافة خطة جديدة'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {editingPlan ? 'تعديل بيانات وميزات الخطة' : 'إنشاء خطة اشتراك جديدة'}
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* البيانات الأساسية */}
              <div className="space-y-4">
                <h3 className="font-medium text-slate-700 dark:text-slate-300 border-b pb-2">البيانات الأساسية</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                      اسم الخطة (عربي) *
                    </label>
                    <input
                      type="text"
                      value={planFormData.name}
                      onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      placeholder="مثال: أساسي"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                      اسم الخطة (إنجليزي)
                    </label>
                    <input
                      type="text"
                      value={planFormData.nameEn}
                      onChange={(e) => setPlanFormData({ ...planFormData, nameEn: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      placeholder="Basic"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">الوصف</label>
                  <textarea
                    value={planFormData.description}
                    onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white h-16"
                    placeholder="وصف مختصر للخطة..."
                  />
                </div>
              </div>

              {/* الأسعار */}
              <div className="space-y-4">
                <h3 className="font-medium text-slate-700 dark:text-slate-300 border-b pb-2">الأسعار</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">السعر الشهري</label>
                    <input
                      type="number"
                      value={planFormData.price}
                      onChange={(e) => setPlanFormData({ ...planFormData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">السعر السنوي</label>
                    <input
                      type="number"
                      value={planFormData.yearlyPrice}
                      onChange={(e) => setPlanFormData({ ...planFormData, yearlyPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">العملة</label>
                    <input
                      type="text"
                      value={planFormData.currency}
                      onChange={(e) => setPlanFormData({ ...planFormData, currency: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      placeholder="ج.م"
                    />
                  </div>
                </div>
              </div>

              {/* الحدود */}
              <div className="space-y-4">
                <h3 className="font-medium text-slate-700 dark:text-slate-300 border-b pb-2">
                  الحدود <span className="text-xs text-slate-400">(-1 = غير محدود)</span>
                </h3>
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">المستخدمين</label>
                    <input
                      type="number"
                      value={planFormData.maxUsers}
                      onChange={(e) => setPlanFormData({ ...planFormData, maxUsers: parseInt(e.target.value) || 0 })}
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">الفواتير/شهر</label>
                    <input
                      type="number"
                      value={planFormData.maxInvoices}
                      onChange={(e) => setPlanFormData({ ...planFormData, maxInvoices: parseInt(e.target.value) || 0 })}
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">العملاء</label>
                    <input
                      type="number"
                      value={planFormData.maxCustomers}
                      onChange={(e) => setPlanFormData({ ...planFormData, maxCustomers: parseInt(e.target.value) || 0 })}
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">المنتجات</label>
                    <input
                      type="number"
                      value={planFormData.maxProducts}
                      onChange={(e) => setPlanFormData({ ...planFormData, maxProducts: parseInt(e.target.value) || 0 })}
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* المظهر */}
              <div className="space-y-4">
                <h3 className="font-medium text-slate-700 dark:text-slate-300 border-b pb-2">المظهر</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">اللون</label>
                    <select
                      value={planFormData.color}
                      onChange={(e) => setPlanFormData({ ...planFormData, color: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    >
                      <option value="slate">رمادي</option>
                      <option value="blue">أزرق</option>
                      <option value="violet">بنفسجي</option>
                      <option value="amber">ذهبي</option>
                      <option value="emerald">أخضر</option>
                      <option value="rose">وردي</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">الأيقونة</label>
                    <select
                      value={planFormData.icon}
                      onChange={(e) => setPlanFormData({ ...planFormData, icon: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    >
                      <option value="Star">نجمة</option>
                      <option value="Zap">برق</option>
                      <option value="Rocket">صاروخ</option>
                      <option value="Crown">تاج</option>
                      <option value="Building">مبنى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">الترتيب</label>
                    <input
                      type="number"
                      value={planFormData.sortOrder}
                      onChange={(e) => setPlanFormData({ ...planFormData, sortOrder: parseInt(e.target.value) || 0 })}
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      min="0"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPopular"
                    checked={planFormData.isPopular}
                    onChange={(e) => setPlanFormData({ ...planFormData, isPopular: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <label htmlFor="isPopular" className="text-sm text-slate-700 dark:text-slate-300">
                    الأكثر شعبية (عرض شارة مميزة)
                  </label>
                </div>
              </div>

              {/* الميزات */}
              <div className="space-y-4">
                <h3 className="font-medium text-slate-700 dark:text-slate-300 border-b pb-2">الميزات</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { key: 'hasBasicReports', label: 'التقارير الأساسية' },
                    { key: 'hasAdvancedReports', label: 'التقارير المتقدمة' },
                    { key: 'hasEmailSupport', label: 'الدعم عبر البريد' },
                    { key: 'hasPrioritySupport', label: 'الدعم ذو الأولوية' },
                    { key: 'hasDedicatedManager', label: 'مدير حساب مخصص' },
                    { key: 'hasBackup', label: 'النسخ الاحتياطي' },
                    { key: 'hasCustomInvoices', label: 'تخصيص الفواتير' },
                    { key: 'hasMultiCurrency', label: 'العملات المتعددة' },
                    { key: 'hasApiAccess', label: 'الوصول لـ API' },
                    { key: 'hasOfflineMode', label: 'العمل بدون اتصال' },
                    { key: 'hasWhiteLabel', label: 'تخصيص كامل (White Label)' },
                  ].map(feature => (
                    <label key={feature.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(planFormData as any)[feature.key]}
                        onChange={(e) => setPlanFormData({ ...planFormData, [feature.key]: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-primary"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{feature.label}</span>
                    </label>
                  ))}
                </div>
                {planFormData.hasBackup && (
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">تردد النسخ الاحتياطي</label>
                    <select
                      value={planFormData.backupFrequency}
                      onChange={(e) => setPlanFormData({ ...planFormData, backupFrequency: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    >
                      <option value="">اختر...</option>
                      <option value="weekly">أسبوعي</option>
                      <option value="daily">يومي</option>
                      <option value="instant">فوري</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3 sticky bottom-0 bg-white dark:bg-slate-800">
              <button
                onClick={() => {
                  setShowPlanModal(false);
                  resetPlanForm();
                }}
                className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                إلغاء
              </button>
              <button
                onClick={editingPlan ? handleUpdatePlan : handleCreatePlan}
                disabled={loading}
                className="flex-1 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {editingPlan ? 'تحديث الخطة' : 'إنشاء الخطة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== User Modal ==================== */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              {/* اختيار الحساب/الشركة - فقط عند الإضافة */}
              {!editingUser && accounts.length > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <label className="block text-sm text-blue-700 dark:text-blue-400 mb-2 font-medium">
                    <Building size={16} className="inline ml-1" />
                    اختر الشركة/الحساب
                  </label>
                  <select
                    value={selectedAccountForUser}
                    onChange={(e) => {
                      const nextAccountId = parseInt(e.target.value, 10) || 1;
                      setSelectedAccountForUser(nextAccountId);
                      setUserFormData(prev => {
                        if (prev.roleIds.length === 0) {
                          return prev;
                        }
                        return { ...prev, roleIds: [] };
                      });
                    }}
                    className="w-full p-2.5 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} {acc.nameEn ? `(${acc.nameEn})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    اسم المستخدم *
                  </label>
                  <input
                    type="text"
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                    disabled={!!editingUser}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white disabled:opacity-50"
                    placeholder="username"
                  />
                </div>
                
                {!editingUser && (
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                      كلمة المرور *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={userFormData.password}
                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                        className="w-full p-2.5 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                        placeholder="••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-2.5 text-slate-400"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  الاسم الكامل *
                </label>
                <input
                  type="text"
                  value={userFormData.fullName}
                  onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  placeholder="أحمد محمد"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    placeholder="email@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    الهاتف
                  </label>
                  <input
                    type="tel"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    placeholder="05xxxxxxxx"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    المسمى الوظيفي
                  </label>
                  <input
                    type="text"
                    value={userFormData.jobTitle}
                    onChange={(e) => setUserFormData({ ...userFormData, jobTitle: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    placeholder="محاسب"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    القسم
                  </label>
                  <input
                    type="text"
                    value={userFormData.department}
                    onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    placeholder="المحاسبة"
                  />
                </div>
              </div>

              {/* Roles Selection */}
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  الأدوار
                </label>
                {rolesLoading ? (
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    جاري تحميل الأدوار...
                  </div>
                ) : roles.length === 0 ? (
                  <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-400 space-y-2">
                    <p>لا توجد أدوار متاحة للحساب المحدد حالياً.</p>
                    {!editingUser && (
                      <button
                        type="button"
                        onClick={() => {
                          void handleCreateDefaultRoleForSelectedAccount();
                        }}
                        disabled={creatingDefaultRole}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {creatingDefaultRole ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        إنشاء دور افتراضي محدود
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {roles.map(role => (
                      <label
                        key={role.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          userFormData.roleIds.includes(role.id)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-200 dark:border-slate-600 hover:border-primary/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={userFormData.roleIds.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUserFormData({
                                ...userFormData,
                                roleIds: [...userFormData.roleIds, role.id]
                              });
                            } else {
                              setUserFormData({
                                ...userFormData,
                                roleIds: userFormData.roleIds.filter(id => id !== role.id)
                              });
                            }
                          }}
                          className="hidden"
                        />
                        <span className="text-sm">{role.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {isAdmin && (
                <label className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userFormData.isSuperAdmin}
                    onChange={(e) => setUserFormData({ ...userFormData, isSuperAdmin: e.target.checked })}
                    className="w-5 h-5 text-amber-600"
                  />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-400">مدير النظام</p>
                    <p className="text-sm text-amber-600 dark:text-amber-500">
                      صلاحيات كاملة على جميع الأقسام
                    </p>
                  </div>
                </label>
              )}

              {!userFormData.isSuperAdmin && userFormData.roleIds.length === 0 && (
                <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-400">
                  اختر دوراً واحداً على الأقل حتى لا يحصل المستخدم على وصول واسع غير مقصود.
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => {
                  setShowUserModal(false);
                  resetUserForm();
                }}
                className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                إلغاء
              </button>
              <button
                onClick={editingUser ? handleUpdateUser : handleCreateUser}
                disabled={loading}
                className="flex-1 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {editingUser ? 'تحديث' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Password Modal ==================== */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                تغيير كلمة المرور
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                للمستخدم: {selectedUser.fullName}
              </p>
            </div>
            
            <div className="p-6">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  placeholder="كلمة المرور الجديدة"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-slate-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                  setSelectedUser(null);
                }}
                className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="flex-1 py-2.5 bg-primary text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                تغيير
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== View/Generate Password Modal ==================== */}
      {showViewPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Eye className="text-purple-500" size={20} />
                عرض / توليد كلمة مرور
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                للمستخدم: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedUser.fullName}</span>
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* User Info */}
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">اسم المستخدم:</span>
                  <span className="font-medium text-slate-800 dark:text-white">{selectedUser.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">البريد:</span>
                  <span className="font-medium text-slate-800 dark:text-white">{selectedUser.email || '-'}</span>
                </div>
              </div>

              {/* Generated Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  كلمة المرور المُولَّدة:
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={generatedPassword}
                      readOnly
                      className="w-full p-3 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white font-mono text-lg tracking-wider"
                    />
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPassword);
                      notify('تم نسخ كلمة المرور! 📋', 'success');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    title="نسخ"
                  >
                    <Download size={18} />
                    نسخ
                  </button>
                </div>
              </div>

              {/* Regenerate Button */}
              <button
                onClick={() => {
                  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
                  let pwd = '';
                  for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
                  setGeneratedPassword(pwd);
                }}
                className="w-full py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 rounded-lg hover:border-purple-500 hover:text-purple-600 flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                توليد كلمة مرور جديدة
              </button>

              {/* Warning */}
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-amber-700 dark:text-amber-400 text-sm flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>ملاحظة:</strong> هذه كلمة مرور مُولَّدة. اضغط "تطبيق" لتعيينها كلمة مرور جديدة للمستخدم، أو "إلغاء" للخروج بدون تغيير.
                  </span>
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => {
                  setShowViewPasswordModal(false);
                  setGeneratedPassword('');
                  setSelectedUser(null);
                }}
                className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    await usersApi.changePassword(selectedUser.id, generatedPassword);
                    notify(`تم تعيين كلمة المرور الجديدة للمستخدم ${selectedUser.fullName}`, 'success');
                    // نسخ كلمة المرور تلقائياً
                    navigator.clipboard.writeText(generatedPassword);
                    notify('تم نسخ كلمة المرور للحافظة! 📋', 'info');
                    setShowViewPasswordModal(false);
                    setGeneratedPassword('');
                    setSelectedUser(null);
                  } catch (error: any) {
                    notify(error.message || 'فشل في تعيين كلمة المرور', 'error');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                <Check size={18} />
                تطبيق وحفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Confirm Modal ==================== */}
      {confirmModal?.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                confirmModal.type === 'danger' ? 'bg-red-100 dark:bg-red-900/30' :
                confirmModal.type === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
                'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                <AlertTriangle className={`w-8 h-8 ${
                  confirmModal.type === 'danger' ? 'text-red-600' :
                  confirmModal.type === 'warning' ? 'text-amber-600' :
                  'text-blue-600'
                }`} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                {confirmModal.title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                {confirmModal.message}
              </p>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`flex-1 py-2.5 text-white rounded-lg ${
                  confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                  confirmModal.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Generate Mock Data Modal ==================== */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Sparkles className="text-indigo-600" /> توليد بيانات تجريبية
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                إضافة منتجات وعملاء وهميين للاختبار
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  عدد المنتجات
                </label>
                <input
                  type="number"
                  value={productCount}
                  onChange={(e) => setProductCount(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={100}
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  عدد العملاء
                </label>
                <input
                  type="number"
                  value={customerCount}
                  onChange={(e) => setCustomerCount(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={100}
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={handleGenerateMockData}
                disabled={isGenerating}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating && <Loader2 size={18} className="animate-spin" />}
                {isGenerating ? 'جاري التوليد...' : 'توليد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Restore Backup Modal ==================== */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Upload className="text-amber-600" /> استعادة نسخة احتياطية
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                الصق محتوى ملف JSON للاستعادة
              </p>
            </div>
            
            <div className="p-6">
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='{"products": [...], "customers": [...]}'
                className="w-full h-48 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-mono text-sm"
              />
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => { setShowRestoreModal(false); setJsonInput(''); }}
                className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={handleRestoreBackup}
                className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                استعادة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Clear Data Modal ==================== */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                تأكيد تصفير البيانات
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                سيتم حذف جميع البيانات المحلية (المنتجات، العملاء، الفواتير، المصروفات).
                <br />
                <span className="text-red-600 font-bold">لا يمكن التراجع!</span>
              </p>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={handleClearData}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                تصفير
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Preview Modal - نافذة عرض ملخص الصلاحيات */}
      {showPermissionsPreview && selectedPermRole && !selectedPermRole.startsWith('all_') && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPermissionsPreview(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={`p-4 border-b border-slate-200 dark:border-slate-700 ${
              permEntityType === 'roles' ? 'bg-gradient-to-r from-violet-500 to-purple-600' :
              permEntityType === 'users' ? 'bg-gradient-to-r from-blue-500 to-cyan-600' :
              'bg-gradient-to-r from-emerald-500 to-teal-600'
            } text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {permEntityType === 'roles' && <Shield size={24} />}
                  {permEntityType === 'users' && <Users size={24} />}
                  {permEntityType === 'accounts' && <Building2 size={24} />}
                  <div>
                    <h3 className="font-bold text-lg">ملخص الصلاحيات</h3>
                    <p className="text-sm opacity-90">
                      {(() => {
                        if (permEntityType === 'roles') {
                          const roleId = parseInt(selectedPermRole.replace('role_', ''));
                          const role = roles.find(r => r.id === roleId);
                          return role ? `الدور: ${role.name}` : selectedPermRole;
                        } else if (permEntityType === 'users') {
                          const userId = parseInt(selectedPermRole.replace('user_', ''));
                          const user = users.find(u => u.id === userId);
                          return user ? `المستخدم: ${user.fullName || user.username}` : selectedPermRole;
                        } else {
                          const accountId = parseInt(selectedPermRole.replace('account_', ''));
                          const account = accounts.find(a => a.id === accountId);
                          return account ? `الحساب: ${account.name}` : selectedPermRole;
                        }
                      })()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPermissionsPreview(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(85vh-120px)] custom-scrollbar">
              {/* إحصائيات سريعة */}
              {(() => {
                const entityPerms = permissionsMatrix[selectedPermRole] || {};
                const totalModules = SYSTEM_MODULES.length;
                const definedPerms = Object.keys(entityPerms).length;
                const allowedView = Object.values(entityPerms).filter(p => p.view).length;
                const allowedCreate = Object.values(entityPerms).filter(p => p.create).length;
                const allowedEdit = Object.values(entityPerms).filter(p => p.edit).length;
                const allowedDelete = Object.values(entityPerms).filter(p => p.delete).length;
                const allowedPrint = Object.values(entityPerms).filter(p => p.print).length;
                
                return (
                  <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{allowedView}</div>
                        <div className="text-xs text-green-700 dark:text-green-300">👁️ مسموح العرض</div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{allowedCreate}</div>
                        <div className="text-xs text-blue-700 dark:text-blue-300">➕ مسموح الإضافة</div>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl text-center">
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{allowedEdit}</div>
                        <div className="text-xs text-amber-700 dark:text-amber-300">✏️ مسموح التعديل</div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-center">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{allowedDelete}</div>
                        <div className="text-xs text-red-700 dark:text-red-300">🗑️ مسموح الحذف</div>
                      </div>
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl text-center">
                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{allowedPrint}</div>
                        <div className="text-xs text-indigo-700 dark:text-indigo-300">🖨️ مسموح الطباعة</div>
                      </div>
                    </div>

                    {/* ملاحظة */}
                    {definedPerms === 0 && (
                      <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-xl text-center mb-4">
                        <p className="text-slate-600 dark:text-slate-300">
                          ⚠️ لا توجد صلاحيات محددة - سيتم استخدام الصلاحيات الافتراضية (الكل مسموح)
                        </p>
                      </div>
                    )}

                    {/* Permissions by Category */}
                    {MODULE_CATEGORIES.filter(cat => cat.id !== 'all').map(category => {
                      const categoryModules = SYSTEM_MODULES.filter(m => m.category === category.id);
                      const icons: Record<string, string> = {
                        pages: '📄',
                        menu: '📑',
                        tabs: '🗂️',
                        actions: '🔘',
                        features: '⚡'
                      };
                      
                      return (
                        <div key={category.id} className="mb-4">
                          <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                            <span>{icons[category.id] || '📁'}</span>
                            {category.name}
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                              ({categoryModules.length} مكون)
                            </span>
                          </h4>
                          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300">
                                  <th className="p-2 text-right font-medium">المكون</th>
                                  <th className="p-2 text-center font-medium w-16">👁️</th>
                                  <th className="p-2 text-center font-medium w-16">➕</th>
                                  <th className="p-2 text-center font-medium w-16">✏️</th>
                                  <th className="p-2 text-center font-medium w-16">🗑️</th>
                                  <th className="p-2 text-center font-medium w-16">🖨️</th>
                                </tr>
                              </thead>
                              <tbody>
                                {categoryModules.map(mod => {
                                  const modPerm = entityPerms[mod.id] || { view: true, create: true, edit: true, delete: true, print: true };
                                  return (
                                    <tr key={mod.id} className="border-t border-slate-200 dark:border-slate-600">
                                      <td className="p-2 text-slate-700 dark:text-slate-300">{mod.name}</td>
                                      <td className="p-2 text-center">
                                        {modPerm.view ? 
                                          <Check size={16} className="text-green-600 mx-auto" /> : 
                                          <X size={16} className="text-red-500 mx-auto" />
                                        }
                                      </td>
                                      <td className="p-2 text-center">
                                        {modPerm.create ? 
                                          <Check size={16} className="text-green-600 mx-auto" /> : 
                                          <X size={16} className="text-red-500 mx-auto" />
                                        }
                                      </td>
                                      <td className="p-2 text-center">
                                        {modPerm.edit ? 
                                          <Check size={16} className="text-green-600 mx-auto" /> : 
                                          <X size={16} className="text-red-500 mx-auto" />
                                        }
                                      </td>
                                      <td className="p-2 text-center">
                                        {modPerm.delete ? 
                                          <Check size={16} className="text-green-600 mx-auto" /> : 
                                          <X size={16} className="text-red-500 mx-auto" />
                                        }
                                      </td>
                                      <td className="p-2 text-center">
                                        {modPerm.print ? 
                                          <Check size={16} className="text-green-600 mx-auto" /> : 
                                          <X size={16} className="text-red-500 mx-auto" />
                                        }
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex justify-end gap-2">
              <button
                onClick={() => setShowPermissionsPreview(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Entities Permissions Preview Modal - نافذة عرض صلاحيات الكل */}
      {showPermissionsPreview && selectedPermRole && selectedPermRole.startsWith('all_') && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPermissionsPreview(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={`p-4 border-b border-slate-200 dark:border-slate-700 ${
              permEntityType === 'roles' ? 'bg-gradient-to-r from-violet-500 to-purple-600' :
              permEntityType === 'users' ? 'bg-gradient-to-r from-blue-500 to-cyan-600' :
              'bg-gradient-to-r from-emerald-500 to-teal-600'
            } text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {permEntityType === 'roles' && <Shield size={24} />}
                  {permEntityType === 'users' && <Users size={24} />}
                  {permEntityType === 'accounts' && <Building2 size={24} />}
                  <div>
                    <h3 className="font-bold text-lg">ملخص صلاحيات الكل</h3>
                    <p className="text-sm opacity-90">
                      {permEntityType === 'roles' ? `جميع الأدوار (${roles.length})` :
                       permEntityType === 'users' ? `جميع المستخدمين (${users.length})` :
                       `جميع الحسابات (${accounts.length})`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPermissionsPreview(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
              {(() => {
                // تحديد الكيانات حسب النوع
                const entities = permEntityType === 'roles' ? roles.map(r => ({ id: r.id, name: r.name, key: `role_${r.id}` })) :
                                 permEntityType === 'users' ? users.map(u => ({ id: u.id, name: u.fullName || u.username, key: `user_${u.id}` })) :
                                 accounts.map(a => ({ id: a.id, name: a.name, key: `account_${a.id}` }));

                return (
                  <div className="space-y-4">
                    {/* جدول المقارنة */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-700">
                            <th className="p-3 text-right font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 sticky right-0 bg-slate-100 dark:bg-slate-700 z-10">
                              {permEntityType === 'roles' ? '🛡️ الدور' :
                               permEntityType === 'users' ? '👤 المستخدم' : '🏢 الحساب'}
                            </th>
                            <th className="p-3 text-center font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 w-20">👁️ عرض</th>
                            <th className="p-3 text-center font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 w-20">➕ إضافة</th>
                            <th className="p-3 text-center font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 w-20">✏️ تعديل</th>
                            <th className="p-3 text-center font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 w-20">🗑️ حذف</th>
                            <th className="p-3 text-center font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 w-20">🖨️ طباعة</th>
                            <th className="p-3 text-center font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 w-24">📊 الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entities.map((entity, idx) => {
                            const entityPerms = permissionsMatrix[entity.key] || {};
                            const totalModules = SYSTEM_MODULES.length;
                            const viewCount = Object.values(entityPerms).filter(p => p.view).length;
                            const createCount = Object.values(entityPerms).filter(p => p.create).length;
                            const editCount = Object.values(entityPerms).filter(p => p.edit).length;
                            const deleteCount = Object.values(entityPerms).filter(p => p.delete).length;
                            const printCount = Object.values(entityPerms).filter(p => p.print).length;
                            const definedCount = Object.keys(entityPerms).length;
                            
                            // حساب النسبة المئوية
                            const avgPercentage = definedCount > 0 
                              ? Math.round(((viewCount + createCount + editCount + deleteCount + printCount) / (definedCount * 5)) * 100)
                              : 100; // افتراضي = كل الصلاحيات

                            return (
                              <tr key={entity.id} className={`border-b border-slate-100 dark:border-slate-700 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-750'} hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors`}>
                                <td className="p-3 font-medium text-slate-700 dark:text-slate-200 sticky right-0 bg-inherit z-10">
                                  <div className="flex items-center gap-2">
                                    <span>{entity.name}</span>
                                    {definedCount === 0 && (
                                      <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">افتراضي</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`font-medium ${viewCount === definedCount && definedCount > 0 ? 'text-green-600' : viewCount === 0 && definedCount > 0 ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {definedCount > 0 ? viewCount : '✓'}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`font-medium ${createCount === definedCount && definedCount > 0 ? 'text-green-600' : createCount === 0 && definedCount > 0 ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {definedCount > 0 ? createCount : '✓'}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`font-medium ${editCount === definedCount && definedCount > 0 ? 'text-green-600' : editCount === 0 && definedCount > 0 ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {definedCount > 0 ? editCount : '✓'}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`font-medium ${deleteCount === definedCount && definedCount > 0 ? 'text-green-600' : deleteCount === 0 && definedCount > 0 ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {definedCount > 0 ? deleteCount : '✓'}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`font-medium ${printCount === definedCount && definedCount > 0 ? 'text-green-600' : printCount === 0 && definedCount > 0 ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {definedCount > 0 ? printCount : '✓'}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-16 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all ${
                                          avgPercentage >= 80 ? 'bg-green-500' :
                                          avgPercentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${avgPercentage}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-8">{avgPercentage}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* ملاحظة */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                      <Info size={18} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">ملاحظة:</p>
                        <p>الأرقام تمثل عدد المكونات التي لها هذه الصلاحية. علامة ✓ تعني أن الصلاحيات الافتراضية مفعلة (الكل مسموح).</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex justify-end gap-2">
              <button
                onClick={() => setShowPermissionsPreview(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
