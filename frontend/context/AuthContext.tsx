import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, AuthUserDto, LoginResponse, RegisterRequest } from '../services/apiService';

// Session storage keys
const SESSION_KEY = 'smart_accountant_session';
const USER_KEY = 'smart_accountant_user';

// User type for frontend (mapped from AuthUserDto)
export interface AuthUser {
  id: string;
  parentId?: string;
  roleIds?: number[];
  roleNames?: string[];
  username?: string;
  name: string;
  email: string;
  companyName: string;
  role: 'user' | 'sys_admin';
  permissions?: {
    canManageProducts: boolean;
    canManageCustomers: boolean;
    canCreateInvoices: boolean;
    canManageExpenses: boolean;
    canViewReports: boolean;
    canManageSettings: boolean;
    canManageLogo?: boolean;  // صلاحية إدارة شعار الشركة
  };
  createdAt: string;
  isActive?: boolean;
  subscriptionExpiry?: string;
  // API specific fields
  accountId?: number;
  currency?: string;
  token?: string;
  avatarUrl?: string;
  isSuperAdmin?: boolean;
  accountLogo?: string;  // شعار الشركة
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

interface RegisterData {
  username: string;
  name: string;
  email: string;
  companyName: string;
  password: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Convert API user to frontend user
const mapApiUserToAuthUser = (apiUser: AuthUserDto, token?: string): AuthUser => ({
  id: apiUser.id.toString(),
  roleIds: apiUser.roles.map(role => role.id),
  roleNames: apiUser.roles.map(role => role.name || role.nameEn || '').filter(Boolean),
  username: apiUser.username,
  name: apiUser.fullName,
  email: apiUser.email,
  companyName: apiUser.accountName,
  role: apiUser.isSuperAdmin ? 'sys_admin' : 'user',
  permissions: {
    canManageProducts: apiUser.permissions.canManageProducts,
    canManageCustomers: apiUser.permissions.canManageCustomers,
    canCreateInvoices: apiUser.permissions.canCreateInvoices,
    canManageExpenses: apiUser.permissions.canManageExpenses,
    canViewReports: apiUser.permissions.canViewReports,
    canManageSettings: apiUser.permissions.canManageSettings,
    canManageLogo: apiUser.permissions.canManageLogo,
  },
  createdAt: new Date().toISOString(),
  isActive: true,
  accountId: apiUser.accountId,
  currency: apiUser.currency,
  token: token,
  avatarUrl: apiUser.avatarUrl,
  isSuperAdmin: apiUser.isSuperAdmin,
  accountLogo: apiUser.accountLogo,
});

// ✅ Save session to sessionStorage (أكثر أماناً) مع نسخة احتياطية في localStorage
const saveSession = (user: AuthUser, token: string) => {
  // حفظ في sessionStorage (أكثر أماناً - يُحذف عند إغلاق المتصفح)
  sessionStorage.setItem(SESSION_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  // نسخة احتياطية في localStorage للـ "تذكرني"
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// ✅ Get session from storage (sessionStorage أولاً ثم localStorage)
const getStoredSession = (): { user: AuthUser; token: string } | null => {
  try {
    // جلب من sessionStorage أولاً (أكثر أماناً)
    let token = sessionStorage.getItem(SESSION_KEY);
    let userStr = sessionStorage.getItem(USER_KEY);
    
    // إذا لم يوجد في sessionStorage، جرب localStorage
    if (!token || !userStr) {
      token = localStorage.getItem(SESSION_KEY);
      userStr = localStorage.getItem(USER_KEY);
      
      // إذا وجد في localStorage، انسخه لـ sessionStorage
      if (token && userStr) {
        sessionStorage.setItem(SESSION_KEY, token);
        sessionStorage.setItem(USER_KEY, userStr);
      }
    }
    
    if (token && userStr) {
      // ✅ التحقق من صلاحية Token (JWT)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000;
        if (Date.now() >= exp) {
          console.log('🔴 Token expired on load');
          clearStoredSession();
          return null;
        }
      } catch {
        // Token غير صالح
        clearStoredSession();
        return null;
      }
      
      return { user: JSON.parse(userStr), token };
    }
  } catch (e) {
    console.error('Error reading session:', e);
  }
  return null;
};

// ✅ Clear session from both storages
const clearStoredSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USER_KEY);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const stored = getStoredSession();
      if (stored) {
        try {
          // Validate session with API
          const apiUser = await authApi.getCurrentUser(parseInt(stored.user.id));
          const updatedUser = mapApiUserToAuthUser(apiUser, stored.token);
          setUser(updatedUser);
          saveSession(updatedUser, stored.token);
        } catch (e) {
          // Session invalid, clear it
          console.warn('Session validation failed:', e);
          clearStoredSession();
        }
      }
      setIsLoading(false);
    };
    checkSession();
  }, []);

  const login = useCallback(async (identifier: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response: LoginResponse = await authApi.login(identifier, password);
      
      if (response.success) {
        const authUser = mapApiUserToAuthUser(response.user, response.token);
        // Clear old data before setting new user to prevent account mixing
        const oldAccountId = user?.accountId;
        setUser(authUser);
        saveSession(authUser, response.token);
        // Broadcast account context change to reload account-scoped caches/settings
        if (oldAccountId && oldAccountId !== authUser.accountId) {
          console.log(`🔄 Switching accounts: ${oldAccountId} → ${authUser.accountId}`);
        }
        window.dispatchEvent(new CustomEvent('accountChanged', {
          detail: {
            oldAccountId: oldAccountId ?? null,
            newAccountId: authUser.accountId ?? null,
          }
        }));
        setIsLoading(false);
        return true;
      } else {
        setError(response.message || 'فشل تسجيل الدخول');
        setIsLoading(false);
        return false;
      }
    } catch (e: any) {
      console.error('Login error:', e);
      const errorMessage = e.message || 'اسم المستخدم أو كلمة المرور غير صحيحة';
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  }, [user]);

  const register = useCallback(async (userData: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const request: RegisterRequest = {
        username: userData.username.trim(),
        password: userData.password,
        fullName: userData.name,
        companyName: userData.companyName,
        email: userData.email,
        phone: userData.phone,
        currencyId: 1, // Default to EGP
        currencySymbol: 'ج.م',
      };
      
      const response = await authApi.register(request);
      
      if (response.success) {
        // Auto login after registration
        const loginResult = await login(userData.username.trim(), userData.password);
        return loginResult;
      } else {
        setError(response.message || 'فشل إنشاء الحساب');
        setIsLoading(false);
        return false;
      }
    } catch (e: any) {
      console.error('Register error:', e);
      setError(e.message || 'حدث خطأ أثناء إنشاء الحساب');
      setIsLoading(false);
      return false;
    }
  }, [login]);

  const logout = useCallback(() => {
    const oldAccountId = user?.accountId ?? null;

    setUser(null);
    clearStoredSession();

    // Keep cached/offline queues intact to avoid accidental data loss.
    window.dispatchEvent(new CustomEvent('accountChanged', {
      detail: {
        oldAccountId,
        newAccountId: null,
      }
    }));
  }, [user?.accountId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading,
      error,
      login, 
      register, 
      logout,
      clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;