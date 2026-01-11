/**
 * Admin API Service - إدارة المستخدمين والصلاحيات
 */

import { getApiUrl } from './configService';

// استخدام الرابط من الإعدادات المحفوظة
const getBaseUrl = () => getApiUrl();

// Types
export interface ApiUser {
  id: number;
  accountId?: number;
  accountName?: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  department: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  failedLoginAttempts: number;
  isLocked: boolean;
  roles: ApiRole[];
}

export interface ApiRole {
  id: number;
  name: string;
  nameEn?: string;
  color?: string;
  icon?: string;
  description?: string;
  isSystemRole?: boolean;
  permissions?: string[];
}

export interface ApiPermission {
  id: number;
  code: string;
  name: string;
  nameEn?: string;
  module: string;
  description?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface CreateUserDto {
  accountId: number;
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  isSuperAdmin?: boolean;
  roleIds?: number[];
  assignedByUserId?: number;
  preferredLanguage?: string;
}

export interface UpdateUserDto {
  fullName?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  avatarUrl?: string;
  preferredLanguage?: string;
  timeZone?: string;
  isSuperAdmin?: boolean;
}

// Helper for API calls
async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'حدث خطأ' }));
    throw new Error(error.message || 'حدث خطأ في الاتصال');
  }

  // Handle empty responses (204 No Content)
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  
  return JSON.parse(text);
}

// ==================== Profile API ====================
export const profileApi = {
  update: async (userId: number, data: { fullName?: string; password?: string }): Promise<void> => {
    await apiCall(`${getBaseUrl()}/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ fullName: data.fullName }),
    });
    
    // If password provided, update it separately
    if (data.password && data.password.length >= 6) {
      await apiCall(`${getBaseUrl()}/admin/users/${userId}/password`, {
        method: 'PUT',
        body: JSON.stringify({ newPassword: data.password }),
      });
    }
  },
};

// ==================== Users API ====================
export const usersApi = {
  getAll: async (params: {
    accountId?: number;
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
    roleId?: number;
  } = {}): Promise<PaginatedResponse<ApiUser>> => {
    const query = new URLSearchParams();
    if (params.accountId) query.set('accountId', params.accountId.toString());
    if (params.page) query.set('page', params.page.toString());
    if (params.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params.search) query.set('search', params.search);
    if (params.isActive !== undefined) query.set('isActive', params.isActive.toString());
    if (params.roleId) query.set('roleId', params.roleId.toString());

    return apiCall(`${getBaseUrl()}/admin/users?${query}`);
  },

  getById: async (id: number): Promise<ApiUser> => {
    return apiCall(`${getBaseUrl()}/admin/users/${id}`);
  },

  create: async (data: CreateUserDto): Promise<{ id: number; message: string }> => {
    return apiCall(`${getBaseUrl()}/admin/users`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: UpdateUserDto): Promise<void> => {
    await apiCall(`${getBaseUrl()}/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  changePassword: async (id: number, newPassword: string): Promise<{ message: string }> => {
    return apiCall(`${getBaseUrl()}/admin/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    });
  },

  toggleStatus: async (id: number, isActive: boolean): Promise<{ message: string }> => {
    return apiCall(`${getBaseUrl()}/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(isActive),
    });
  },

  toggleLock: async (id: number, lock: boolean, lockUntil?: string): Promise<{ message: string }> => {
    return apiCall(`${getBaseUrl()}/admin/users/${id}/lock`, {
      method: 'PUT',
      body: JSON.stringify({ lock, lockUntil }),
    });
  },

  updateRoles: async (id: number, roleIds: number[], assignedByUserId?: number): Promise<{ message: string }> => {
    return apiCall(`${getBaseUrl()}/admin/users/${id}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roleIds, assignedByUserId }),
    });
  },

  delete: async (id: number): Promise<{ message: string }> => {
    return apiCall(`${getBaseUrl()}/admin/users/${id}`, {
      method: 'DELETE',
    });
  },
};

// ==================== Roles API ====================
export const rolesApi = {
  getAll: async (accountId?: number): Promise<ApiRole[]> => {
    const query = accountId ? `?accountId=${accountId}` : '';
    return apiCall(`${getBaseUrl()}/roles${query}`);
  },

  getById: async (id: number): Promise<ApiRole> => {
    return apiCall(`${getBaseUrl()}/roles/${id}`);
  },

  create: async (data: Partial<ApiRole> & { accountId: number }): Promise<{ id: number; message: string }> => {
    return apiCall(`${getBaseUrl()}/roles`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<ApiRole>): Promise<void> => {
    await apiCall(`${getBaseUrl()}/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updatePermissions: async (id: number, permissionIds: number[]): Promise<{ message: string }> => {
    return apiCall(`${getBaseUrl()}/roles/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissionIds }),
    });
  },

  delete: async (id: number): Promise<{ message: string }> => {
    return apiCall(`${getBaseUrl()}/roles/${id}`, {
      method: 'DELETE',
    });
  },

  toggleStatus: async (id: number, isActive: boolean): Promise<{ success: boolean; message: string; isActive: boolean }> => {
    return apiCall(`${getBaseUrl()}/roles/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },
};

// ==================== Permissions API ====================
export const permissionsApi = {
  getAll: async (): Promise<ApiPermission[]> => {
    return apiCall(`${getBaseUrl()}/permissions`);
  },

  getByModule: async (module: string): Promise<ApiPermission[]> => {
    return apiCall(`${getBaseUrl()}/permissions?module=${module}`);
  },

  getGrouped: async (): Promise<Record<string, ApiPermission[]>> => {
    return apiCall(`${getBaseUrl()}/permissions/grouped`);
  },
};

// ==================== Account Settings API ====================
export interface ApiAccount {
  id: number;
  name: string;
  nameEn?: string;
  email?: string;
  phone?: string;
  address?: string;
  currency: string;
  currencyId?: number;
  taxNumber?: string;
  logoUrl?: string;
  plan: string;
  planId?: number;
  isActive: boolean;
  usersCount: number;
  createdAt: string;
  subscriptionExpiry?: string;
}

// Account Usage DTO
export interface AccountUsageDto {
  accountId: number;
  accountName: string;
  planId?: number;
  planName: string;
  planNameEn?: string;
  
  // Current Usage
  currentUsers: number;
  currentMonthInvoices: number;
  currentCustomers: number;
  currentProducts: number;
  
  // Plan Limits
  maxUsers: number;
  maxInvoices: number;
  maxCustomers: number;
  maxProducts: number;
  
  // Percentages
  usersPercentage: number;
  invoicesPercentage: number;
  customersPercentage: number;
  productsPercentage: number;
  
  // Features
  hasBasicReports: boolean;
  hasAdvancedReports: boolean;
  hasEmailSupport: boolean;
  hasPrioritySupport: boolean;
  hasDedicatedManager: boolean;
  hasBackup: boolean;
  backupFrequency?: string;
  hasCustomInvoices: boolean;
  hasMultiCurrency: boolean;
  hasApiAccess: boolean;
  hasWhiteLabel: boolean;
  
  // Subscription Info
  subscriptionStart?: string;
  subscriptionEnd?: string;
  subscriptionStatus: string;
  autoRenew: boolean;
  daysRemaining: number;
}

export interface CreateAccountDto {
  name: string;
  nameEn?: string;
  email?: string;
  phone?: string;
  address?: string;
  currencyId?: number;
  currencySymbol?: string;
  taxNumber?: string;
  adminUsername: string;
  adminPassword: string;
  adminFullName: string;
}

export interface UpdateAccountDto {
  name?: string;
  nameEn?: string;
  email?: string;
  phone?: string;
  address?: string;
  currencyId?: number;
  currencySymbol?: string;
  taxNumber?: string;
  logoUrl?: string;
}

export const accountApi = {
  getAll: async (): Promise<ApiAccount[]> => {
    return apiCall(`${getBaseUrl()}/accounts`);
  },

  get: async (id: number): Promise<ApiAccount> => {
    return apiCall(`${getBaseUrl()}/accounts/${id}`);
  },

  create: async (data: CreateAccountDto): Promise<{ id: number }> => {
    return apiCall(`${getBaseUrl()}/accounts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: UpdateAccountDto): Promise<void> => {
    await apiCall(`${getBaseUrl()}/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateLogo: async (id: number, logoUrl: string): Promise<{ success: boolean; message: string; logoUrl: string }> => {
    return apiCall(`${getBaseUrl()}/accounts/${id}/logo`, {
      method: 'PUT',
      body: JSON.stringify({ logoUrl }),
    });
  },

  toggleStatus: async (id: number, isActive: boolean): Promise<{ success: boolean; message: string; isActive: boolean }> => {
    return apiCall(`${getBaseUrl()}/accounts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  delete: async (id: number): Promise<void> => {
    await apiCall(`${getBaseUrl()}/accounts/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * الحصول على استخدام الحساب مقارنة بحدود الخطة
   */
  getUsage: async (id: number): Promise<AccountUsageDto> => {
    return apiCall(`${getBaseUrl()}/accounts/${id}/usage`);
  },
};

// ==================== System Settings API ====================
export interface SystemSettingDto {
  id: number;
  settingKey: string;
  settingValue: string;
  settingType: string;
  description?: string;
  isPublic: boolean;
  updatedAt: string;
}

export const systemSettingsApi = {
  /**
   * جلب الإعدادات العامة المتاحة للجميع (بدون مصادقة)
   */
  getPublicSettings: async (): Promise<Record<string, boolean | string | number>> => {
    return apiCall(`${getBaseUrl()}/systemsettings/public`);
  },

  /**
   * جلب جميع الإعدادات (للأدمن فقط)
   */
  getAll: async (): Promise<SystemSettingDto[]> => {
    return apiCall(`${getBaseUrl()}/systemsettings`);
  },

  /**
   * تحديث إعداد معين
   */
  update: async (key: string, value: string, type?: string, description?: string, isPublic?: boolean): Promise<void> => {
    await apiCall(`${getBaseUrl()}/systemsettings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value, type, description, isPublic }),
    });
  },

  /**
   * تحديث عدة إعدادات دفعة واحدة
   */
  updateBulk: async (settings: Record<string, string>): Promise<void> => {
    await apiCall(`${getBaseUrl()}/systemsettings/bulk`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },
};

// ==================== Plans API ====================
export interface ApiPlan {
  id: number;
  name: string;
  nameEn?: string;
  description?: string;
  price: number;
  yearlyPrice?: number;
  currency: string;
  color: string;
  icon: string;
  isPopular: boolean;
  sortOrder: number;
  isActive: boolean;
  maxUsers: number;
  maxInvoices: number;
  maxCustomers: number;
  maxProducts: number;
  hasBasicReports: boolean;
  hasAdvancedReports: boolean;
  hasEmailSupport: boolean;
  hasPrioritySupport: boolean;
  hasDedicatedManager: boolean;
  hasBackup: boolean;
  backupFrequency?: string;
  hasCustomInvoices: boolean;
  hasMultiCurrency: boolean;
  hasApiAccess: boolean;
  hasWhiteLabel: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanDto {
  name: string;
  nameEn?: string;
  description?: string;
  price: number;
  yearlyPrice?: number;
  currency?: string;
  color?: string;
  icon?: string;
  isPopular?: boolean;
  sortOrder?: number;
  isActive?: boolean;
  maxUsers?: number;
  maxInvoices?: number;
  maxCustomers?: number;
  maxProducts?: number;
  hasBasicReports?: boolean;
  hasAdvancedReports?: boolean;
  hasEmailSupport?: boolean;
  hasPrioritySupport?: boolean;
  hasDedicatedManager?: boolean;
  hasBackup?: boolean;
  backupFrequency?: string;
  hasCustomInvoices?: boolean;
  hasMultiCurrency?: boolean;
  hasApiAccess?: boolean;
  hasWhiteLabel?: boolean;
}

export const plansApi = {
  /**
   * الحصول على جميع الخطط
   */
  getAll: async (includeInactive: boolean = false): Promise<ApiPlan[]> => {
    const query = includeInactive ? '?includeInactive=true' : '';
    return apiCall(`${getBaseUrl()}/plans${query}`);
  },

  /**
   * الحصول على خطة بالمعرف
   */
  get: async (id: number): Promise<ApiPlan> => {
    return apiCall(`${getBaseUrl()}/plans/${id}`);
  },

  /**
   * إنشاء خطة جديدة
   */
  create: async (data: CreatePlanDto): Promise<ApiPlan> => {
    return apiCall(`${getBaseUrl()}/plans`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * تحديث خطة
   */
  update: async (id: number, data: Partial<CreatePlanDto>): Promise<ApiPlan> => {
    return apiCall(`${getBaseUrl()}/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * حذف خطة
   */
  delete: async (id: number): Promise<void> => {
    await apiCall(`${getBaseUrl()}/plans/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * تفعيل/تعطيل خطة
   */
  toggleStatus: async (id: number): Promise<{ message: string; isActive: boolean }> => {
    return apiCall(`${getBaseUrl()}/plans/${id}/toggle-status`, {
      method: 'PUT',
    });
  },
};

export default {
  users: usersApi,
  roles: rolesApi,
  permissions: permissionsApi,
  account: accountApi,
  systemSettings: systemSettingsApi,
  plans: plansApi,
};

