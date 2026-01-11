/**
 * Plan Limits Hook
 * React hook للتحقق من حدود الخطط
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { 
  getAccountUsage, 
  canAddUser, 
  canAddInvoice, 
  canAddCustomer, 
  canAddProduct,
  getUsageWarnings,
  clearUsageCache,
  LimitCheckResult
} from './planLimitsService';
import { AccountUsageDto } from './adminApi';

export interface UsePlanLimitsReturn {
  usage: AccountUsageDto | null;
  loading: boolean;
  error: string | null;
  warnings: string[];
  
  // Check functions
  checkUserLimit: () => Promise<LimitCheckResult>;
  checkInvoiceLimit: () => Promise<LimitCheckResult>;
  checkCustomerLimit: () => Promise<LimitCheckResult>;
  checkProductLimit: () => Promise<LimitCheckResult>;
  
  // Refresh
  refresh: () => Promise<void>;
  
  // Helper to check and show warning
  checkAndWarn: (type: 'user' | 'invoice' | 'customer' | 'product') => Promise<boolean>;
}

export const usePlanLimits = (): UsePlanLimitsReturn => {
  const { user } = useAuth();
  const { notify } = useNotification();
  
  const [usage, setUsage] = useState<AccountUsageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const loadUsage = useCallback(async (forceRefresh = false) => {
    if (!user?.accountId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const [usageData, warningsList] = await Promise.all([
        getAccountUsage(user.accountId, forceRefresh),
        getUsageWarnings(user.accountId)
      ]);
      
      setUsage(usageData);
      setWarnings(warningsList);
    } catch (err) {
      setError('فشل في تحميل بيانات الاستخدام');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.accountId]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const checkUserLimit = useCallback(async (): Promise<LimitCheckResult> => {
    if (!user?.accountId) {
      return { allowed: true, current: 0, max: -1, percentage: 0, isUnlimited: true };
    }
    return canAddUser(user.accountId);
  }, [user?.accountId]);

  const checkInvoiceLimit = useCallback(async (): Promise<LimitCheckResult> => {
    if (!user?.accountId) {
      return { allowed: true, current: 0, max: -1, percentage: 0, isUnlimited: true };
    }
    return canAddInvoice(user.accountId);
  }, [user?.accountId]);

  const checkCustomerLimit = useCallback(async (): Promise<LimitCheckResult> => {
    if (!user?.accountId) {
      return { allowed: true, current: 0, max: -1, percentage: 0, isUnlimited: true };
    }
    return canAddCustomer(user.accountId);
  }, [user?.accountId]);

  const checkProductLimit = useCallback(async (): Promise<LimitCheckResult> => {
    if (!user?.accountId) {
      return { allowed: true, current: 0, max: -1, percentage: 0, isUnlimited: true };
    }
    return canAddProduct(user.accountId);
  }, [user?.accountId]);

  const refresh = useCallback(async () => {
    clearUsageCache();
    await loadUsage(true);
  }, [loadUsage]);

  const checkAndWarn = useCallback(async (type: 'user' | 'invoice' | 'customer' | 'product'): Promise<boolean> => {
    let result: LimitCheckResult;
    
    switch (type) {
      case 'user':
        result = await checkUserLimit();
        break;
      case 'invoice':
        result = await checkInvoiceLimit();
        break;
      case 'customer':
        result = await checkCustomerLimit();
        break;
      case 'product':
        result = await checkProductLimit();
        break;
    }
    
    if (!result.allowed) {
      notify(result.message || 'لقد وصلت للحد الأقصى. يرجى ترقية خطتك.', 'error');
      return false;
    }
    
    if (result.message && result.percentage >= 70) {
      notify(result.message, 'warning');
    }
    
    return true;
  }, [checkUserLimit, checkInvoiceLimit, checkCustomerLimit, checkProductLimit, notify]);

  return {
    usage,
    loading,
    error,
    warnings,
    checkUserLimit,
    checkInvoiceLimit,
    checkCustomerLimit,
    checkProductLimit,
    refresh,
    checkAndWarn
  };
};

export default usePlanLimits;
