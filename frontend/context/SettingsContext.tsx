import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAppSettings, saveAppSettings, getSystemPermissions, saveSystemPermissions } from '../services/storageService';
import { AppSettings, SystemPermissions } from '../types';
import { systemSettingsApi } from '../services/adminApi';

type ViewMode = 'grid' | 'table';
type DarkModePreference = 'light' | 'dark' | 'auto' | 'system';
type DateFormat = 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD';
type TimeFormat = '24h' | '12h';
type DateDisplayStyle = 'numeric' | 'arabic';

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

  // Load settings from API on mount
  useEffect(() => {
    const loadSettingsFromApi = async () => {
      try {
        const apiSettings = await systemSettingsApi.getPublicSettings();
        if (apiSettings) {
          const localPerms = getSystemPermissions(); // القيم المحلية
          const updatedPermissions = { ...localPerms }; // نبدأ من القيم المحلية
          
          // Map API settings to permissions - فقط إذا كانت القيمة موجودة في API
          // وتختلف عن القيمة الافتراضية المحلية
          if (apiSettings.allowAutoRefresh !== undefined && apiSettings.allowAutoRefresh !== null) {
            const apiValue = apiSettings.allowAutoRefresh === true || apiSettings.allowAutoRefresh === 'true';
            // استخدم قيمة API فقط إذا تم تعيينها صراحة
            updatedPermissions.allowAutoRefresh = apiValue;
          }
          if (apiSettings.autoRefreshInterval !== undefined && apiSettings.autoRefreshInterval !== null) {
            updatedPermissions.autoRefreshInterval = Number(apiSettings.autoRefreshInterval) || 30;
          }
          if (apiSettings.syncDuration !== undefined && apiSettings.syncDuration !== null) {
            updatedPermissions.syncDuration = Number(apiSettings.syncDuration) || 1500;
          }
          if (apiSettings.showSyncPopup !== undefined && apiSettings.showSyncPopup !== null) {
            const apiValue = apiSettings.showSyncPopup === true || apiSettings.showSyncPopup === 'true';
            updatedPermissions.showSyncPopup = apiValue;
          }
          // إعدادات التحديث (Refresh)
          if (apiSettings.refreshDuration !== undefined && apiSettings.refreshDuration !== null) {
            updatedPermissions.refreshDuration = Number(apiSettings.refreshDuration) || 1000;
          }
          if (apiSettings.showRefreshPopup !== undefined && apiSettings.showRefreshPopup !== null) {
            const apiValue = apiSettings.showRefreshPopup === true || apiSettings.showRefreshPopup === 'true';
            updatedPermissions.showRefreshPopup = apiValue;
          }
          
          setPermissionsState(updatedPermissions);
          saveSystemPermissions(updatedPermissions);
        }
      } catch (error) {
        console.log('Using local settings (API unavailable)');
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettingsFromApi();
  }, []);

  // Apply Dark Mode Class to HTML
  useEffect(() => {
    if (effectiveDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [effectiveDarkMode]);

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