/**
 * Configuration Service - إدارة إعدادات التطبيق
 * يوفر إدارة مركزية لإعدادات الاتصال بالخادم
 */

const CONFIG_KEY = 'smartAccountant_config';

interface AppConfig {
  apiUrl: string;
  lastUpdated: string;
}

const DEFAULT_CONFIG: AppConfig = {
  apiUrl: 'http://localhost:5000/api',
  lastUpdated: new Date().toISOString(),
};

/**
 * الحصول على الإعدادات الحالية
 */
export function getConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading config:', error);
  }
  return DEFAULT_CONFIG;
}

/**
 * حفظ الإعدادات
 */
export function saveConfig(config: Partial<AppConfig>): AppConfig {
  const current = getConfig();
  const updated: AppConfig = {
    ...current,
    ...config,
    lastUpdated: new Date().toISOString(),
  };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
  
  // إطلاق حدث لإعلام باقي التطبيق بالتغيير
  window.dispatchEvent(new CustomEvent('configChanged', { detail: updated }));
  
  return updated;
}

/**
 * الحصول على رابط API الحالي
 */
export function getApiUrl(): string {
  return getConfig().apiUrl;
}

/**
 * تحديث رابط API
 */
export function setApiUrl(url: string): void {
  saveConfig({ apiUrl: url });
}

/**
 * اختبار الاتصال بالخادم
 */
export async function testConnection(url?: string): Promise<{ success: boolean; message: string; latency?: number }> {
  const targetUrl = url || getApiUrl();
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${targetUrl}/products?accountId=1`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      return { success: true, message: 'الاتصال ناجح', latency };
    } else {
      return { success: false, message: `خطأ: ${response.status} ${response.statusText}` };
    }
  } catch (error: any) {
    return { success: false, message: error.message || 'لا يمكن الوصول للخادم' };
  }
}

/**
 * إعادة تعيين الإعدادات للقيم الافتراضية
 */
export function resetConfig(): AppConfig {
  localStorage.removeItem(CONFIG_KEY);
  return DEFAULT_CONFIG;
}

/**
 * Hook للاستماع لتغييرات الإعدادات
 */
export function onConfigChange(callback: (config: AppConfig) => void): () => void {
  const handler = (event: CustomEvent<AppConfig>) => {
    callback(event.detail);
  };
  
  window.addEventListener('configChanged', handler as EventListener);
  
  return () => {
    window.removeEventListener('configChanged', handler as EventListener);
  };
}

export default {
  getConfig,
  saveConfig,
  getApiUrl,
  setApiUrl,
  testConnection,
  resetConfig,
  onConfigChange,
};
