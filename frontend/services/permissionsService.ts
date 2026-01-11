/**
 * خدمة إدارة صلاحيات المكونات
 * Module Permissions Service
 * 
 * هذه الخدمة تتحقق من صلاحيات المستخدم على المكونات المختلفة
 */

// أنواع الصلاحيات
export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  print: boolean;
}

// الصلاحيات الافتراضية (كل شيء مسموح)
const DEFAULT_PERMISSION: ModulePermission = {
  view: true,
  create: true,
  edit: true,
  delete: true,
  print: true
};

// مفتاح التخزين
const STORAGE_KEY = 'smartAccountant_permissionsMatrix';

/**
 * جلب مصفوفة الصلاحيات من التخزين المحلي
 */
export const getPermissionsMatrix = (): Record<string, Record<string, ModulePermission>> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load permissions matrix:', e);
  }
  return {};
};

/**
 * حفظ مصفوفة الصلاحيات
 */
export const savePermissionsMatrix = (matrix: Record<string, Record<string, ModulePermission>>): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix));
  } catch (e) {
    console.error('Failed to save permissions matrix:', e);
  }
};

/**
 * جلب صلاحيات مكون معين لمستخدم/دور/حساب
 * @param entityKey - مفتاح الكيان (مثل: user_1, role_2, account_3)
 * @param moduleId - معرف المكون (مثل: products, invoices, btn_add_product)
 */
export const getModulePermission = (entityKey: string, moduleId: string): ModulePermission => {
  const matrix = getPermissionsMatrix();
  return matrix[entityKey]?.[moduleId] || DEFAULT_PERMISSION;
};

/**
 * التحقق من صلاحية محددة لمكون
 * @param entityKey - مفتاح الكيان
 * @param moduleId - معرف المكون
 * @param permission - نوع الصلاحية (view, create, edit, delete)
 */
export const hasPermission = (
  entityKey: string, 
  moduleId: string, 
  permission: keyof ModulePermission
): boolean => {
  const perm = getModulePermission(entityKey, moduleId);
  return perm[permission];
};

/**
 * التحقق من صلاحية العرض
 */
export const canView = (entityKey: string, moduleId: string): boolean => {
  return hasPermission(entityKey, moduleId, 'view');
};

/**
 * التحقق من صلاحية الإضافة
 */
export const canCreate = (entityKey: string, moduleId: string): boolean => {
  return hasPermission(entityKey, moduleId, 'create');
};

/**
 * التحقق من صلاحية التعديل
 */
export const canEdit = (entityKey: string, moduleId: string): boolean => {
  return hasPermission(entityKey, moduleId, 'edit');
};

/**
 * التحقق من صلاحية الحذف
 */
export const canDelete = (entityKey: string, moduleId: string): boolean => {
  return hasPermission(entityKey, moduleId, 'delete');
};

/**
 * جلب صلاحيات المستخدم الحالي
 * يبحث بالترتيب: user > roles > account
 */
export const getCurrentUserPermission = (
  userId: number | undefined,
  roleIds: number[] | undefined,
  accountId: number | undefined,
  moduleId: string
): ModulePermission => {
  const matrix = getPermissionsMatrix();
  
  // 1. أولاً: التحقق من صلاحيات المستخدم المباشرة
  if (userId) {
    const userKey = `user_${userId}`;
    if (matrix[userKey]?.[moduleId]) {
      return matrix[userKey][moduleId];
    }
  }
  
  // 2. ثانياً: التحقق من صلاحيات الأدوار
  if (roleIds && roleIds.length > 0) {
    for (const roleId of roleIds) {
      const roleKey = `role_${roleId}`;
      if (matrix[roleKey]?.[moduleId]) {
        return matrix[roleKey][moduleId];
      }
    }
  }
  
  // 3. ثالثاً: التحقق من صلاحيات الحساب
  if (accountId) {
    const accountKey = `account_${accountId}`;
    if (matrix[accountKey]?.[moduleId]) {
      return matrix[accountKey][moduleId];
    }
  }
  
  // 4. الافتراضي: كل الصلاحيات مفتوحة
  return DEFAULT_PERMISSION;
};

/**
 * Hook للتحقق من صلاحيات المستخدم الحالي
 * استخدمه في المكونات: const { canView, canCreate, canEdit, canDelete } = useModulePermission('products')
 */
export const checkUserModulePermission = (
  user: { id?: number; roleIds?: number[]; accountId?: number } | null,
  moduleId: string
): ModulePermission => {
  if (!user) {
    return DEFAULT_PERMISSION;
  }
  return getCurrentUserPermission(user.id, user.roleIds, user.accountId, moduleId);
};

// قائمة المكونات المتاحة للصلاحيات
export const MODULE_IDS = {
  // الصفحات
  DASHBOARD: 'dashboard',
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  INVOICES: 'invoices',
  EXPENSES: 'expenses',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  
  // القوائم
  MENU_DASHBOARD: 'menu_dashboard',
  MENU_PRODUCTS: 'menu_products',
  MENU_CUSTOMERS: 'menu_customers',
  MENU_INVOICES: 'menu_invoices',
  MENU_EXPENSES: 'menu_expenses',
  MENU_REPORTS: 'menu_reports',
  MENU_SETTINGS: 'menu_settings',
  
  // التبويبات
  SETTINGS_GENERAL: 'settings_general',
  SETTINGS_USERS: 'settings_users',
  SETTINGS_SYNC: 'settings_sync',
  SETTINGS_TOOLS: 'settings_tools',
  SETTINGS_PERMISSIONS: 'settings_permissions',
  SETTINGS_ADMIN: 'settings_admin',
  
  // الأزرار
  BTN_ADD_PRODUCT: 'btn_add_product',
  BTN_ADD_CUSTOMER: 'btn_add_customer',
  BTN_ADD_INVOICE: 'btn_add_invoice',
  BTN_ADD_EXPENSE: 'btn_add_expense',
  BTN_UNCONFIRM_INVOICE: 'btn_unconfirm_invoice',
  BTN_DELETE_PAYMENT: 'btn_delete_payment',
  BTN_PRINT: 'btn_print',
  BTN_EXPORT: 'btn_export',
  BTN_BACKUP: 'btn_backup',
  BTN_RESTORE: 'btn_restore',
  BTN_CLEAR_DATA: 'btn_clear_data',
  
  // الميزات
  FEATURE_DARK_MODE: 'feature_dark_mode',
  FEATURE_NOTIFICATIONS: 'feature_notifications',
  FEATURE_MESSAGES: 'feature_messages',
  FEATURE_ACTIVITY_LOGS: 'feature_activity_logs',
  FEATURE_PAYMENTS: 'feature_payments',
  FEATURE_OFFLINE_MODE: 'feature_offline_mode',
  FEATURE_OFFLINE_CREATE: 'feature_offline_create',
  FEATURE_OFFLINE_EDIT: 'feature_offline_edit',
  FEATURE_OFFLINE_DELETE: 'feature_offline_delete',
  FEATURE_OFFLINE_SYNC: 'feature_offline_sync',
};

export default {
  getPermissionsMatrix,
  savePermissionsMatrix,
  getModulePermission,
  hasPermission,
  canView,
  canCreate,
  canEdit,
  canDelete,
  getCurrentUserPermission,
  checkUserModulePermission,
  MODULE_IDS
};
