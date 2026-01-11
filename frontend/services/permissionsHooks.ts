/**
 * React Hook للتحقق من صلاحيات المكونات
 * useModulePermissions Hook
 * 
 * يستمع للتغييرات في مصفوفة الصلاحيات ويحدث تلقائياً
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ModulePermission, 
  getPermissionsMatrix, 
  getCurrentUserPermission,
  MODULE_IDS 
} from './permissionsService';

// Event name for permissions changes
export const PERMISSIONS_CHANGED_EVENT = 'permissionsMatrixChanged';

/**
 * إرسال إشعار بتغيير الصلاحيات
 * يجب استدعاء هذه الدالة عند حفظ تغييرات في مصفوفة الصلاحيات
 */
export const notifyPermissionsChanged = () => {
  window.dispatchEvent(new CustomEvent(PERMISSIONS_CHANGED_EVENT));
};

/**
 * Hook للتحقق من صلاحيات المستخدم الحالي على مكون معين
 * يستمع للتغييرات في مصفوفة الصلاحيات
 * 
 * @example
 * const { canView, canCreate, canEdit, canDelete, loading } = useModulePermission('products');
 * 
 * if (!canView) return <div>ليس لديك صلاحية لعرض هذه الصفحة</div>;
 * 
 * {canCreate && <button>إضافة جديد</button>}
 */
export const useModulePermission = (moduleId: string): ModulePermission & { loading: boolean } => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<ModulePermission>({
    view: true,
    create: true,
    edit: true,
    delete: true
  });
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // استمع للتغييرات في الصلاحيات
  useEffect(() => {
    const handlePermissionsChanged = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    
    window.addEventListener(PERMISSIONS_CHANGED_EVENT, handlePermissionsChanged);
    // أيضاً استمع لتغييرات localStorage من نوافذ أخرى
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'smartAccountant_permissionsMatrix') {
        handlePermissionsChanged();
      }
    };
    window.addEventListener('storage', handleStorage);
    
    return () => {
      window.removeEventListener(PERMISSIONS_CHANGED_EVENT, handlePermissionsChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (user) {
      const userId = user.id ? parseInt(user.id, 10) : undefined;
      const perm = getCurrentUserPermission(
        userId,
        (user as any).roleIds,
        user.accountId,
        moduleId
      );
      setPermission(perm);
    }
    setLoading(false);
  }, [user, moduleId, refreshTrigger]);

  return { ...permission, loading };
};

/**
 * Hook للتحقق من صلاحيات متعددة
 * يستمع للتغييرات في مصفوفة الصلاحيات
 */
export const useMultiplePermissions = (moduleIds: string[]): Record<string, ModulePermission> => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, ModulePermission>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // استمع للتغييرات في الصلاحيات
  useEffect(() => {
    const handlePermissionsChanged = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    
    window.addEventListener(PERMISSIONS_CHANGED_EVENT, handlePermissionsChanged);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'smartAccountant_permissionsMatrix') {
        handlePermissionsChanged();
      }
    };
    window.addEventListener('storage', handleStorage);
    
    return () => {
      window.removeEventListener(PERMISSIONS_CHANGED_EVENT, handlePermissionsChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (user) {
      const userId = user.id ? parseInt(user.id, 10) : undefined;
      const perms: Record<string, ModulePermission> = {};
      moduleIds.forEach(moduleId => {
        perms[moduleId] = getCurrentUserPermission(
          userId,
          (user as any).roleIds,
          user.accountId,
          moduleId
        );
      });
      setPermissions(perms);
    }
  }, [user, moduleIds.join(','), refreshTrigger]);

  return permissions;
};

/**
 * Hook للتحقق من صلاحيات القوائم الجانبية
 * يستمع للتغييرات في مصفوفة الصلاحيات
 */
export const useMenuPermissions = () => {
  const { user } = useAuth();
  const [allowedMenus, setAllowedMenus] = useState<string[]>([
    'menu_dashboard',
    'menu_products',
    'menu_customers',
    'menu_invoices',
    'menu_expenses',
    'menu_reports',
    'menu_settings',
    'menu_notifications',
    'menu_messages'
  ]); // ابدأ بكل شيء مسموح
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // استمع للتغييرات في الصلاحيات
  useEffect(() => {
    const handlePermissionsChanged = () => {
      console.log('🔄 Permissions changed - refreshing menu permissions');
      setRefreshTrigger(prev => prev + 1);
    };
    
    window.addEventListener(PERMISSIONS_CHANGED_EVENT, handlePermissionsChanged);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'smartAccountant_permissionsMatrix') {
        handlePermissionsChanged();
      }
    };
    window.addEventListener('storage', handleStorage);
    
    return () => {
      window.removeEventListener(PERMISSIONS_CHANGED_EVENT, handlePermissionsChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    const menuIds = [
      'menu_dashboard',
      'menu_products',
      'menu_customers',
      'menu_invoices',
      'menu_expenses',
      'menu_reports',
      'menu_settings',
      'menu_notifications',
      'menu_messages'
    ];
    
    if (user) {
      const userId = user.id ? parseInt(user.id, 10) : undefined;
      
      const allowed = menuIds.filter(menuId => {
        const perm = getCurrentUserPermission(
          userId,
          (user as any).roleIds,
          user.accountId,
          menuId
        );
        return perm.view;
      });
      
      console.log('📋 Menu permissions updated:', allowed);
      setAllowedMenus(allowed);
    } else {
      // إذا لم يوجد مستخدم، أظهر كل القوائم
      setAllowedMenus(menuIds);
    }
  }, [user, refreshTrigger]);

  return {
    allowedMenus,
    canShowMenu: (menuId: string) => allowedMenus.includes(menuId),
    canShowDashboard: allowedMenus.includes('menu_dashboard'),
    canShowProducts: allowedMenus.includes('menu_products'),
    canShowCustomers: allowedMenus.includes('menu_customers'),
    canShowInvoices: allowedMenus.includes('menu_invoices'),
    canShowExpenses: allowedMenus.includes('menu_expenses'),
    canShowReports: allowedMenus.includes('menu_reports'),
    canShowSettings: allowedMenus.includes('menu_settings'),
    canShowNotifications: allowedMenus.includes('menu_notifications'),
    canShowMessages: allowedMenus.includes('menu_messages'),
  };
};

/**
 * Hook للتحقق من صلاحيات الأزرار
 * يستمع للتغييرات في مصفوفة الصلاحيات
 */
export const useButtonPermissions = () => {
  const { user } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // استمع للتغييرات في الصلاحيات
  useEffect(() => {
    const handlePermissionsChanged = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    
    window.addEventListener(PERMISSIONS_CHANGED_EVENT, handlePermissionsChanged);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'smartAccountant_permissionsMatrix') {
        handlePermissionsChanged();
      }
    };
    window.addEventListener('storage', handleStorage);
    
    return () => {
      window.removeEventListener(PERMISSIONS_CHANGED_EVENT, handlePermissionsChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);
  
  const checkButton = useCallback((buttonId: string): boolean => {
    if (!user) return true;
    const userId = user.id ? parseInt(user.id, 10) : undefined;
    const perm = getCurrentUserPermission(
      userId,
      (user as any).roleIds,
      user.accountId,
      buttonId
    );
    return perm.view;
  }, [user, refreshTrigger]);

  return {
    canAddProduct: checkButton('btn_add_product'),
    canAddCustomer: checkButton('btn_add_customer'),
    canAddInvoice: checkButton('btn_add_invoice'),
    canAddExpense: checkButton('btn_add_expense'),
    canPrint: checkButton('btn_print'),
    canExport: checkButton('btn_export'),
    canBackup: checkButton('btn_backup'),
    canRestore: checkButton('btn_restore'),
    canClearData: checkButton('btn_clear_data'),
    checkButton
  };
};

/**
 * Hook للتحقق من صلاحيات صفحة معينة
 * يستمع للتغييرات في مصفوفة الصلاحيات
 */
export const usePagePermission = (pageModuleId: string) => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<ModulePermission>({
    view: true,
    create: true,
    edit: true,
    delete: true
  });
  const [checked, setChecked] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // استمع للتغييرات في الصلاحيات
  useEffect(() => {
    const handlePermissionsChanged = () => {
      console.log('🔄 Permissions changed - refreshing page permission for:', pageModuleId);
      setRefreshTrigger(prev => prev + 1);
    };
    
    window.addEventListener(PERMISSIONS_CHANGED_EVENT, handlePermissionsChanged);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'smartAccountant_permissionsMatrix') {
        handlePermissionsChanged();
      }
    };
    window.addEventListener('storage', handleStorage);
    
    return () => {
      window.removeEventListener(PERMISSIONS_CHANGED_EVENT, handlePermissionsChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, [pageModuleId]);

  useEffect(() => {
    // التحقق من الصلاحيات فقط إذا كان المستخدم موجوداً
    if (user) {
      const userId = user.id ? parseInt(user.id, 10) : undefined;
      const perm = getCurrentUserPermission(
        userId,
        (user as any).roleIds,
        user.accountId,
        pageModuleId
      );
      console.log(`📋 Page permission for ${pageModuleId}:`, perm, 'user:', userId);
      setPermission(perm);
      setChecked(true);
    } else {
      // إذا لم يكن هناك مستخدم، أظهر كل شيء (سيتم التوجيه لصفحة تسجيل الدخول)
      setPermission({
        view: true,
        create: true,
        edit: true,
        delete: true,
        print: true
      });
      setChecked(true);
    }
  }, [user, pageModuleId, refreshTrigger]);

  return {
    ...permission,
    canView: permission.view,
    canCreate: permission.create,
    canEdit: permission.edit,
    canDelete: permission.delete,
    canPrint: permission.print,
    checked
  };
};

export { MODULE_IDS };

export default {
  useModulePermission,
  useMultiplePermissions,
  useMenuPermissions,
  useButtonPermissions,
  usePagePermission,
  notifyPermissionsChanged,
  PERMISSIONS_CHANGED_EVENT,
  MODULE_IDS
};
