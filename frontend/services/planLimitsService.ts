/**
 * Plan Limits Service
 * خدمة التحقق من حدود الخطط وإنفاذها
 */

import { accountApi, AccountUsageDto } from './adminApi';

// Cache for account usage
let usageCache: { data: AccountUsageDto | null; timestamp: number } = {
  data: null,
  timestamp: 0
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * الحصول على استخدام الحساب مع التخزين المؤقت
 */
export const getAccountUsage = async (accountId: number, forceRefresh = false): Promise<AccountUsageDto | null> => {
  const now = Date.now();
  
  if (!forceRefresh && usageCache.data && (now - usageCache.timestamp) < CACHE_DURATION) {
    return usageCache.data;
  }
  
  try {
    const usage = await accountApi.getUsage(accountId);
    usageCache = { data: usage, timestamp: now };
    return usage;
  } catch (error) {
    console.error('Error fetching account usage:', error);
    return null;
  }
};

/**
 * مسح التخزين المؤقت
 */
export const clearUsageCache = () => {
  usageCache = { data: null, timestamp: 0 };
};

/**
 * التحقق مما إذا كان يمكن إضافة المزيد من عنصر معين
 */
export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  max: number;
  percentage: number;
  message?: string;
  isUnlimited: boolean;
}

export const checkLimit = (
  current: number,
  max: number,
  resourceNameAr: string
): LimitCheckResult => {
  const isUnlimited = max === -1;
  const percentage = isUnlimited ? 0 : (current / max) * 100;
  const allowed = isUnlimited || current < max;
  
  let message: string | undefined;
  
  if (!allowed) {
    message = `لقد وصلت للحد الأقصى من ${resourceNameAr} (${max}). يرجى ترقية خطتك لإضافة المزيد.`;
  } else if (percentage >= 90 && !isUnlimited) {
    message = `تحذير: استخدمت ${percentage.toFixed(0)}% من حد ${resourceNameAr}. يتبقى ${max - current} فقط.`;
  } else if (percentage >= 70 && !isUnlimited) {
    message = `ملاحظة: استخدمت ${percentage.toFixed(0)}% من حد ${resourceNameAr}.`;
  }
  
  return {
    allowed,
    current,
    max,
    percentage,
    message,
    isUnlimited
  };
};

/**
 * التحقق من حد المستخدمين
 */
export const canAddUser = async (accountId: number): Promise<LimitCheckResult> => {
  const usage = await getAccountUsage(accountId);
  if (!usage) {
    return { allowed: true, current: 0, max: -1, percentage: 0, isUnlimited: true };
  }
  return checkLimit(usage.currentUsers, usage.maxUsers, 'المستخدمين');
};

/**
 * التحقق من حد الفواتير
 */
export const canAddInvoice = async (accountId: number): Promise<LimitCheckResult> => {
  const usage = await getAccountUsage(accountId);
  if (!usage) {
    return { allowed: true, current: 0, max: -1, percentage: 0, isUnlimited: true };
  }
  return checkLimit(usage.currentMonthInvoices, usage.maxInvoices, 'الفواتير الشهرية');
};

/**
 * التحقق من حد العملاء
 */
export const canAddCustomer = async (accountId: number): Promise<LimitCheckResult> => {
  const usage = await getAccountUsage(accountId);
  if (!usage) {
    return { allowed: true, current: 0, max: -1, percentage: 0, isUnlimited: true };
  }
  return checkLimit(usage.currentCustomers, usage.maxCustomers, 'العملاء');
};

/**
 * التحقق من حد المنتجات
 */
export const canAddProduct = async (accountId: number): Promise<LimitCheckResult> => {
  const usage = await getAccountUsage(accountId);
  if (!usage) {
    return { allowed: true, current: 0, max: -1, percentage: 0, isUnlimited: true };
  }
  return checkLimit(usage.currentProducts, usage.maxProducts, 'المنتجات');
};

/**
 * التحقق من ميزة معينة
 */
export const hasFeature = async (accountId: number, feature: keyof Pick<
  AccountUsageDto,
  'hasBasicReports' | 'hasAdvancedReports' | 'hasEmailSupport' | 'hasPrioritySupport' |
  'hasDedicatedManager' | 'hasBackup' | 'hasCustomInvoices' | 'hasMultiCurrency' |
  'hasApiAccess' | 'hasWhiteLabel'
>): Promise<boolean> => {
  const usage = await getAccountUsage(accountId);
  if (!usage) return false;
  return usage[feature];
};

/**
 * الحصول على رسالة تحذيرية إذا كان الاستخدام عالياً
 */
export const getUsageWarnings = async (accountId: number): Promise<string[]> => {
  const usage = await getAccountUsage(accountId);
  if (!usage) return [];
  
  const warnings: string[] = [];
  
  const checks = [
    { current: usage.currentUsers, max: usage.maxUsers, name: 'المستخدمين' },
    { current: usage.currentMonthInvoices, max: usage.maxInvoices, name: 'الفواتير الشهرية' },
    { current: usage.currentCustomers, max: usage.maxCustomers, name: 'العملاء' },
    { current: usage.currentProducts, max: usage.maxProducts, name: 'المنتجات' },
  ];
  
  checks.forEach(check => {
    const result = checkLimit(check.current, check.max, check.name);
    if (result.message && result.percentage >= 70) {
      warnings.push(result.message);
    }
  });
  
  // تحذير انتهاء الاشتراك
  if (usage.daysRemaining <= 7 && usage.daysRemaining > 0) {
    warnings.push(`تحذير: اشتراكك ينتهي خلال ${usage.daysRemaining} يوم. يرجى التجديد لتجنب انقطاع الخدمة.`);
  } else if (usage.daysRemaining <= 0 && usage.subscriptionStatus !== 'none') {
    warnings.push('تنبيه: انتهت صلاحية اشتراكك. بعض الميزات قد تكون محدودة.');
  }
  
  return warnings;
};

export default {
  getAccountUsage,
  clearUsageCache,
  checkLimit,
  canAddUser,
  canAddInvoice,
  canAddCustomer,
  canAddProduct,
  hasFeature,
  getUsageWarnings
};
