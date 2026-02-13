import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAppSettings, saveAppSettings, getSystemPermissions, saveSystemPermissions } from '../services/storageService';
import { AppSettings, SystemPermissions } from '../types';
import { accountApi, systemSettingsApi } from '../services/adminApi';
import {
  getEffectiveBrandIdentity,
  BRAND_ASSIGNMENTS_KEY,
  BRAND_IDENTITIES_KEY,
  BRAND_IDENTITY_CHANGED_EVENT,
} from '../services/brandIdentityService';

type ViewMode = 'grid' | 'table';
type DarkModePreference = 'light' | 'dark' | 'auto' | 'system';
type DateFormat = 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD';
type TimeFormat = '24h' | '12h';
type DateDisplayStyle = 'numeric' | 'arabic';

const hexToRgbChannels = (hex: string, fallback: string): string => {
  const safeHex = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : fallback;
  const r = parseInt(safeHex.slice(1, 3), 16);
  const g = parseInt(safeHex.slice(3, 5), 16);
  const b = parseInt(safeHex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
};

interface SettingsContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  availableCurrencies: string[];
  addCurrency: (currency: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  // New: Dark Mode Preference
  darkModePreference: DarkModePreference;
  setDarkModePreference: (pref: DarkModePreference) => void;
  autoSync: boolean;
  setAutoSync: (enabled: boolean) => void;
  permissions: SystemPermissions;
  togglePermission: (key: keyof SystemPermissions, value?: any) => void;
  // New: View Mode
  defaultViewMode: ViewMode;
  setDefaultViewMode: (mode: ViewMode) => void;
  // New: Nationalities
  nationalities: string[];
  addNationality: (nationality: string) => void;
  removeNationality: (nationality: string) => void;
  // New: Auto Refresh Settings
  autoRefreshEnabled: boolean;
  autoRefreshInterval: number;
  setAutoRefreshInterval: (seconds: number) => void;
  toggleAutoRefresh: (enabled?: boolean) => void;
  // New: Sync Duration
  syncDuration: number;
  setSyncDuration: (ms: number) => void;
  // New: Date & Time Format
  dateFormat: DateFormat;
  setDateFormat: (format: DateFormat) => void;
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
  dateDisplayStyle: DateDisplayStyle;
  setDateDisplayStyle: (style: DateDisplayStyle) => void;
  // Loading state
  isLoadingSettings: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // App Settings
  const [settings, setSettings] = useState<AppSettings>(getAppSettings());
  
  // System Permissions (Reactive State)
  const [permissions, setPermissionsState] = useState<SystemPermissions>(getSystemPermissions());

  // Loading state for API settings
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Calculated dark mode based on preference
  const [effectiveDarkMode, setEffectiveDarkMode] = useState(settings.darkMode);

  // Check time-based auto dark mode
  useEffect(() => {
    const checkAutoDarkMode = () => {
      const pref = (settings as any).darkModePreference || 'light';
      
      if (pref === 'auto') {
        // وقت تلقائي: ليلي من 6 مساءً حتى 6 صباحاً
        const hour = new Date().getHours();
        const isNight = hour >= 18 || hour < 6;
        setEffectiveDarkMode(isNight);
      } else if (pref === 'system') {
        // حسب نظام التشغيل
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setEffectiveDarkMode(prefersDark);
      } else {
        setEffectiveDarkMode(pref === 'dark');
      }
    };

    checkAutoDarkMode();
    
    // تحديث كل دقيقة للوضع التلقائي
    const interval = setInterval(checkAutoDarkMode, 60000);
    
    // الاستماع لتغيير تفضيلات النظام
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => checkAutoDarkMode();
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      clearInterval(interval);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [settings]);

  const loadSettingsFromApi = React.useCallback(async () => {
    try {
      const apiSettings = await systemSettingsApi.getPublicSettings();
      const localPerms = getSystemPermissions();
      const updatedPermissions: SystemPermissions = { ...localPerms };
      const toBoolean = (value: any, fallback: boolean) => {
        if (value === undefined || value === null) return fallback;
        return value === true || value === 'true' || value === 1 || value === '1';
      };

      if (apiSettings && typeof apiSettings === 'object') {
        if (apiSettings.allowAutoRefresh !== undefined && apiSettings.allowAutoRefresh !== null) {
          updatedPermissions.allowAutoRefresh = toBoolean(apiSettings.allowAutoRefresh, updatedPermissions.allowAutoRefresh);
        }
        if (apiSettings.autoRefreshInterval !== undefined && apiSettings.autoRefreshInterval !== null) {
          updatedPermissions.autoRefreshInterval = Number(apiSettings.autoRefreshInterval) || updatedPermissions.autoRefreshInterval;
        }
        if (apiSettings.syncDuration !== undefined && apiSettings.syncDuration !== null) {
          updatedPermissions.syncDuration = Number(apiSettings.syncDuration) || updatedPermissions.syncDuration;
        }
        if (apiSettings.showSyncPopup !== undefined && apiSettings.showSyncPopup !== null) {
          updatedPermissions.showSyncPopup = toBoolean(apiSettings.showSyncPopup, updatedPermissions.showSyncPopup);
        }
        if (apiSettings.refreshDuration !== undefined && apiSettings.refreshDuration !== null) {
          updatedPermissions.refreshDuration = Number(apiSettings.refreshDuration) || updatedPermissions.refreshDuration;
        }
        if (apiSettings.showRefreshPopup !== undefined && apiSettings.showRefreshPopup !== null) {
          updatedPermissions.showRefreshPopup = toBoolean(apiSettings.showRefreshPopup, updatedPermissions.showRefreshPopup);
        }

        if ((apiSettings as any).customerNameMaxLength !== undefined && (apiSettings as any).customerNameMaxLength !== null) {
          updatedPermissions.customerNameMaxLength = Number((apiSettings as any).customerNameMaxLength) || updatedPermissions.customerNameMaxLength;
        }
        if ((apiSettings as any).customerAddressMaxLength !== undefined && (apiSettings as any).customerAddressMaxLength !== null) {
          updatedPermissions.customerAddressMaxLength = Number((apiSettings as any).customerAddressMaxLength) || updatedPermissions.customerAddressMaxLength;
        }
        if ((apiSettings as any).customerNotesMaxLength !== undefined && (apiSettings as any).customerNotesMaxLength !== null) {
          updatedPermissions.customerNotesMaxLength = Number((apiSettings as any).customerNotesMaxLength) || updatedPermissions.customerNotesMaxLength;
        }
        if ((apiSettings as any).customerPhoneMaxLength !== undefined && (apiSettings as any).customerPhoneMaxLength !== null) {
          updatedPermissions.customerPhoneMaxLength = Number((apiSettings as any).customerPhoneMaxLength) || updatedPermissions.customerPhoneMaxLength;
        }
        if ((apiSettings as any).customerEmailMaxLength !== undefined && (apiSettings as any).customerEmailMaxLength !== null) {
          updatedPermissions.customerEmailMaxLength = Number((apiSettings as any).customerEmailMaxLength) || updatedPermissions.customerEmailMaxLength;
        }
        if ((apiSettings as any).productNameMaxLength !== undefined && (apiSettings as any).productNameMaxLength !== null) {
          updatedPermissions.productNameMaxLength = Number((apiSettings as any).productNameMaxLength) || updatedPermissions.productNameMaxLength;
        }
        if ((apiSettings as any).productNotesMaxLength !== undefined && (apiSettings as any).productNotesMaxLength !== null) {
          updatedPermissions.productNotesMaxLength = Number((apiSettings as any).productNotesMaxLength) || updatedPermissions.productNotesMaxLength;
        }
        if ((apiSettings as any).invoiceNotesMaxLength !== undefined && (apiSettings as any).invoiceNotesMaxLength !== null) {
          updatedPermissions.invoiceNotesMaxLength = Number((apiSettings as any).invoiceNotesMaxLength) || updatedPermissions.invoiceNotesMaxLength;
        }
        if ((apiSettings as any).registerUsernameMaxLength !== undefined && (apiSettings as any).registerUsernameMaxLength !== null) {
          updatedPermissions.registerUsernameMaxLength = Number((apiSettings as any).registerUsernameMaxLength) || updatedPermissions.registerUsernameMaxLength;
        }
        if ((apiSettings as any).registerFullNameMaxLength !== undefined && (apiSettings as any).registerFullNameMaxLength !== null) {
          updatedPermissions.registerFullNameMaxLength = Number((apiSettings as any).registerFullNameMaxLength) || updatedPermissions.registerFullNameMaxLength;
        }
        if ((apiSettings as any).registerCompanyNameMaxLength !== undefined && (apiSettings as any).registerCompanyNameMaxLength !== null) {
          updatedPermissions.registerCompanyNameMaxLength = Number((apiSettings as any).registerCompanyNameMaxLength) || updatedPermissions.registerCompanyNameMaxLength;
        }
        if ((apiSettings as any).registerEmailMaxLength !== undefined && (apiSettings as any).registerEmailMaxLength !== null) {
          updatedPermissions.registerEmailMaxLength = Number((apiSettings as any).registerEmailMaxLength) || updatedPermissions.registerEmailMaxLength;
        }
        if ((apiSettings as any).registerPasswordMaxLength !== undefined && (apiSettings as any).registerPasswordMaxLength !== null) {
          updatedPermissions.registerPasswordMaxLength = Number((apiSettings as any).registerPasswordMaxLength) || updatedPermissions.registerPasswordMaxLength;
        }

        if ((apiSettings as any).allowOfflineMode !== undefined && (apiSettings as any).allowOfflineMode !== null) {
          updatedPermissions.allowOfflineMode = toBoolean((apiSettings as any).allowOfflineMode, updatedPermissions.allowOfflineMode);
        }
        if ((apiSettings as any).offlineDataRetentionDays !== undefined && (apiSettings as any).offlineDataRetentionDays !== null) {
          updatedPermissions.offlineDataRetentionDays = Number((apiSettings as any).offlineDataRetentionDays) || updatedPermissions.offlineDataRetentionDays;
        }
        if ((apiSettings as any).autoSyncOnReconnect !== undefined && (apiSettings as any).autoSyncOnReconnect !== null) {
          updatedPermissions.autoSyncOnReconnect = toBoolean((apiSettings as any).autoSyncOnReconnect, updatedPermissions.autoSyncOnReconnect);
        }
        if ((apiSettings as any).showOfflineIndicator !== undefined && (apiSettings as any).showOfflineIndicator !== null) {
          updatedPermissions.showOfflineIndicator = toBoolean((apiSettings as any).showOfflineIndicator, updatedPermissions.showOfflineIndicator);
        }
        if ((apiSettings as any).allowOfflineCreate !== undefined && (apiSettings as any).allowOfflineCreate !== null) {
          updatedPermissions.allowOfflineCreate = toBoolean((apiSettings as any).allowOfflineCreate, updatedPermissions.allowOfflineCreate);
        }
        if ((apiSettings as any).allowOfflineEdit !== undefined && (apiSettings as any).allowOfflineEdit !== null) {
          updatedPermissions.allowOfflineEdit = toBoolean((apiSettings as any).allowOfflineEdit, updatedPermissions.allowOfflineEdit);
        }
        if ((apiSettings as any).allowOfflineDelete !== undefined && (apiSettings as any).allowOfflineDelete !== null) {
          updatedPermissions.allowOfflineDelete = toBoolean((apiSettings as any).allowOfflineDelete, updatedPermissions.allowOfflineDelete);
        }
        if ((apiSettings as any).maxPendingChanges !== undefined && (apiSettings as any).maxPendingChanges !== null) {
          updatedPermissions.maxPendingChanges = Number((apiSettings as any).maxPendingChanges) || updatedPermissions.maxPendingChanges;
        }
        if ((apiSettings as any).syncIntervalSeconds !== undefined && (apiSettings as any).syncIntervalSeconds !== null) {
          updatedPermissions.syncIntervalSeconds = Number((apiSettings as any).syncIntervalSeconds) || updatedPermissions.syncIntervalSeconds;
        }
      }

      let accountId: number | null = null;
      try {
        const userRaw = sessionStorage.getItem('smart_accountant_user') || localStorage.getItem('smart_accountant_user');
        if (userRaw) {
          const parsed = JSON.parse(userRaw);
          const parsedAccountId = Number(parsed?.accountId);
          if (Number.isFinite(parsedAccountId) && parsedAccountId > 0) {
            accountId = parsedAccountId;
          }
        }
      } catch {
        // ignore parse errors
      }

      if (accountId) {
        try {
          const usage = await accountApi.getUsage(accountId);
          updatedPermissions.allowOfflineByPlan = usage.hasOfflineMode !== false;
        } catch (error: any) {
          // تجاهل أخطاء الصلاحيات والأخطاء 500
          if (error?.status === 403 || error?.status === 401 || error?.status === 500) {
            console.log('Cannot load offline mode from plan - using default');
            updatedPermissions.allowOfflineByPlan = updatedPermissions.allowOfflineByPlan ?? true;
          } else {
            throw error;
          }
        }
      } else {
        updatedPermissions.allowOfflineByPlan = updatedPermissions.allowOfflineByPlan ?? true;
      }

      updatedPermissions.effectiveOfflineModeEnabled =
        (updatedPermissions.allowOfflineByPlan !== false) && (updatedPermissions.allowOfflineMode !== false);

      setPermissionsState(updatedPermissions);
      saveSystemPermissions(updatedPermissions);
    } catch {
      console.log('Using local settings (API unavailable)');
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  // Load settings from API on mount and account switch
  useEffect(() => {
    loadSettingsFromApi();

    const handleAccountChanged = () => {
      setIsLoadingSettings(true);
      loadSettingsFromApi();
    };

    window.addEventListener('accountChanged', handleAccountChanged as EventListener);
    return () => {
      window.removeEventListener('accountChanged', handleAccountChanged as EventListener);
    };
  }, [loadSettingsFromApi]);

  // Apply Dark Mode Class to HTML
  useEffect(() => {
    if (effectiveDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [effectiveDarkMode]);

  const applyBrandIdentity = useCallback(() => {
    const identity = getEffectiveBrandIdentity();
    const root = document.documentElement;

    root.style.setProperty('--brand-primary-rgb', hexToRgbChannels(identity.palette.primary, '#1e40af'));
    root.style.setProperty('--brand-secondary-rgb', hexToRgbChannels(identity.palette.secondary, '#475569'));
    root.style.setProperty('--brand-success-rgb', hexToRgbChannels(identity.palette.success, '#059669'));
    root.style.setProperty('--brand-danger-rgb', hexToRgbChannels(identity.palette.danger, '#dc2626'));
    root.style.setProperty('--brand-warning-rgb', hexToRgbChannels(identity.palette.warning, '#d97706'));
    root.setAttribute('data-brand-identity', identity.id);
  }, []);

  useEffect(() => {
    applyBrandIdentity();

    const handleIdentityChanged = () => applyBrandIdentity();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === BRAND_IDENTITIES_KEY || e.key === BRAND_ASSIGNMENTS_KEY) {
        applyBrandIdentity();
      }
    };

    window.addEventListener(BRAND_IDENTITY_CHANGED_EVENT, handleIdentityChanged as EventListener);
    window.addEventListener('accountChanged', handleIdentityChanged as EventListener);
    window.addEventListener('storage', handleStorage);

    // Period-based assignments can change over time; refresh every minute.
    const interval = setInterval(applyBrandIdentity, 60000);

    return () => {
      clearInterval(interval);
      window.removeEventListener(BRAND_IDENTITY_CHANGED_EVENT, handleIdentityChanged as EventListener);
      window.removeEventListener('accountChanged', handleIdentityChanged as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [applyBrandIdentity]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    saveAppSettings(newSettings);
  };

  const setCurrency = (currency: string) => {
    updateSettings({ currency });
  };

  const addCurrency = (currency: string) => {
    if (!settings.availableCurrencies.includes(currency)) {
      updateSettings({ availableCurrencies: [...settings.availableCurrencies, currency] });
    }
  };

  const toggleDarkMode = () => {
    updateSettings({ darkMode: !effectiveDarkMode, darkModePreference: !effectiveDarkMode ? 'dark' : 'light' });
  };

  const setDarkModePreference = (pref: DarkModePreference) => {
    updateSettings({ darkModePreference: pref, darkMode: pref === 'dark' });
  };

  const setAutoSync = (enabled: boolean) => {
      updateSettings({ autoSync: enabled });
  };

  // View Mode Logic
  const setDefaultViewMode = (mode: ViewMode) => {
    updateSettings({ defaultViewMode: mode });
  };

  // Nationalities Logic
  const addNationality = (nationality: string) => {
    if (!settings.nationalities.includes(nationality)) {
      updateSettings({ nationalities: [...settings.nationalities, nationality] });
    }
  };

  const removeNationality = (nationality: string) => {
    updateSettings({ nationalities: settings.nationalities.filter(n => n !== nationality) });
  };

  // Date & Time Format Logic
  const setDateFormat = (format: DateFormat) => {
    updateSettings({ dateFormat: format });
  };

  const setTimeFormat = (format: TimeFormat) => {
    updateSettings({ timeFormat: format });
  };

  const setDateDisplayStyle = (style: DateDisplayStyle) => {
    updateSettings({ dateDisplayStyle: style });
  };

  // Permission Logic - supports boolean toggle or direct value assignment
  const togglePermission = (key: keyof SystemPermissions, value?: any) => {
    const newValue = value !== undefined ? value : !permissions[key];
    const newPerms = { ...permissions, [key]: newValue };
    setPermissionsState(newPerms);
    saveSystemPermissions(newPerms);
  };

  // Auto Refresh Logic
  const setAutoRefreshInterval = (seconds: number) => {
    togglePermission('autoRefreshInterval', seconds);
  };

  const toggleAutoRefresh = (enabled?: boolean) => {
    const newValue = enabled !== undefined ? enabled : !permissions.allowAutoRefresh;
    togglePermission('allowAutoRefresh', newValue);
  };

  // Sync Duration Logic
  const setSyncDuration = (ms: number) => {
    togglePermission('syncDuration', ms);
  };

  return (
    <SettingsContext.Provider 
      value={{ 
        currency: settings.currency, 
        setCurrency, 
        availableCurrencies: settings.availableCurrencies, 
        addCurrency,
        isDarkMode: effectiveDarkMode,
        toggleDarkMode,
        darkModePreference: (settings as any).darkModePreference || 'light',
        setDarkModePreference,
        autoSync: settings.autoSync,
        setAutoSync,
        permissions,
        togglePermission,
        // New: View Mode
        defaultViewMode: settings.defaultViewMode || 'grid',
        setDefaultViewMode,
        // New: Nationalities
        nationalities: settings.nationalities || [],
        addNationality,
        removeNationality,
        // New: Auto Refresh
        autoRefreshEnabled: permissions.allowAutoRefresh ?? true,
        autoRefreshInterval: permissions.autoRefreshInterval ?? 30,
        setAutoRefreshInterval,
        toggleAutoRefresh,
        // New: Sync Duration
        syncDuration: permissions.syncDuration ?? 1500,
        setSyncDuration,
        // New: Date & Time Format
        dateFormat: settings.dateFormat || 'DD-MM-YYYY',
        setDateFormat,
        timeFormat: settings.timeFormat || '24h',
        setTimeFormat,
        dateDisplayStyle: settings.dateDisplayStyle || 'numeric',
        setDateDisplayStyle,
        // Loading state
        isLoadingSettings
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};