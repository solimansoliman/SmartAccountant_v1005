
export enum PaymentType {
  CASH = 'كاش',
  CREDIT = 'آجل/دفعات',
}

export enum TransactionType {
  INCOME = 'إيرادات',
  EXPENSE = 'مصروفات',
  PURCHASE = 'مشتريات',
  OTHER_INCOME = 'إيرادات أخرى',
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type UserRole = 'user' | 'sys_admin';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

export interface SystemMessage {
  id: string;
  title: string;
  content: string;
  date: string;
  sender: string; 
  isRead?: boolean; 
  targetUserId?: string; 
}

// Permissions for Sub-users
export interface UserPermissions {
  canManageProducts: boolean;
  canManageCustomers: boolean;
  canCreateInvoices: boolean;
  canManageExpenses: boolean;
  canViewReports: boolean;
  canManageSettings: boolean; // Usually false for employees
}

export interface User {
  id: string;
  parentId?: string; // If present, this user is an employee of parentId
  name: string;
  email: string;
  companyName: string; // For employees, this matches the parent's company
  password?: string;
  role: UserRole;
  permissions?: UserPermissions; // Specific permissions for this user
  createdAt: string;
  isActive?: boolean; 
  subscriptionExpiry?: string; 
  isDeleted?: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock?: number;
  unit?: string;
  description?: string;
  notes?: string;
  createdAt: string;
  isDeleted?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  createdAt: string;
  isDeleted?: boolean;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unit?: string;
  price: number;
  total: number;
}

export interface Invoice {
  id: string; 
  customerId: string;
  customerName: string;
  date: string; // YYYY-MM-DD
  items: InvoiceItem[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  type: PaymentType;
  notes?: string;
  createdAt: number;
  isDeleted?: boolean;
}

export interface Payment {
  id: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  date: string;
  notes?: string;
  isDeleted?: boolean;
}

export interface Expense {
  id: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  date: string;
  createdAt: number;
  isDeleted?: boolean;
}

export interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  totalPurchases: number;
  netProfit: number;
  outstandingDebts: number;
  totalOtherIncome: number;
}

export interface AppDataBackup {
  version: string;
  timestamp: string;
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
}

export interface AppSettings {
  currency: string;
  availableCurrencies: string[];
  darkMode: boolean;
  autoSync: boolean; 
  defaultViewMode: 'grid' | 'table'; // طريقة العرض الافتراضية
  nationalities: string[]; // قائمة الجنسيات
}

export interface SystemPermissions {
  // إعدادات شاشة الدخول
  showDemoLogin: boolean; 
  showAdminLogin: boolean;
  allowUserRegistration: boolean;
  showForgotPassword: boolean;
  showRememberMe: boolean;
  
  // إعدادات الأمان
  maxLoginAttempts: number;
  sessionTimeout: number;
  requireEmailVerification: boolean;
  
  // إعدادات النظام
  defaultLanguage: string;
  defaultCurrency: string;
  companyName: string;
  companyLogo: string;
  
  // إعدادات الفواتير
  invoicePrefix: string;
  defaultTaxRate: number;
  showTaxOnInvoice: boolean;
  
  // إعدادات الإشعارات
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
  
  // إعدادات الوحدات
  showMockDataGenerator: boolean;
  showDashboard: boolean;       
  showInventoryModule: boolean;
  showCustomersModule: boolean; 
  showInvoicesModule: boolean;  
  showExpensesModule: boolean;
  showReportsModule: boolean;
  showSettingsModule: boolean;  
  showDataSync: boolean; 
  allowUserBackup: boolean;
  allowClearData: boolean;
  
  // إعدادات التحديث التلقائي
  allowAutoRefresh: boolean;
  autoRefreshInterval: number; // بالثواني (0 = معطل)
  
  // إعدادات المزامنة
  syncDuration: number; // مدة عملية المزامنة بالمللي ثانية
  showSyncPopup: boolean; // إظهار نافذة تفاصيل المزامنة
  
  // إعدادات تنسيق اسم الملفات للطباعة والحفظ
  fileNameFormat: string; // تنسيق اسم الملف: {app}-{company}-{customer}-{date}-{time}
  
  // ==================== إعدادات وضع عدم الاتصال (Offline Mode) ====================
  allowOfflineMode: boolean;           // السماح بالعمل بدون اتصال
  offlineDataRetentionDays: number;    // مدة الاحتفاظ بالبيانات المحلية (بالأيام)
  autoSyncOnReconnect: boolean;        // مزامنة تلقائية عند عودة الاتصال
  showOfflineIndicator: boolean;       // إظهار مؤشر حالة الاتصال
  allowOfflineCreate: boolean;         // السماح بإنشاء سجلات جديدة offline
  allowOfflineEdit: boolean;           // السماح بالتعديل offline
  allowOfflineDelete: boolean;         // السماح بالحذف offline
  maxPendingChanges: number;           // الحد الأقصى للتغييرات المعلقة
  syncIntervalSeconds: number;         // فترة المزامنة التلقائية (بالثواني)
}

// ==================== صلاحيات الحساب (Account-Level Permissions) ====================
export interface AccountPermissions {
  // الصلاحيات الأساسية
  canAccessSystem: boolean;            // الوصول للنظام
  canManageUsers: boolean;             // إدارة المستخدمين
  canManageRoles: boolean;             // إدارة الأدوار
  canViewReports: boolean;             // عرض التقارير
  canExportData: boolean;              // تصدير البيانات
  canImportData: boolean;              // استيراد البيانات
  
  // صلاحيات Offline Mode
  offlineModeEnabled: boolean;         // تفعيل وضع عدم الاتصال
  offlineCreateAllowed: boolean;       // السماح بالإنشاء offline
  offlineEditAllowed: boolean;         // السماح بالتعديل offline
  offlineDeleteAllowed: boolean;       // السماح بالحذف offline
  offlineSyncPriority: 'low' | 'normal' | 'high';  // أولوية المزامنة
  
  // صلاحيات البيانات
  maxStorageQuotaMB: number;           // الحد الأقصى للتخزين (MB)
  dataRetentionDays: number;           // مدة الاحتفاظ بالبيانات
  canAccessAllAccounts: boolean;       // الوصول لجميع الحسابات (للسوبر أدمن)
  
  // صلاحيات متقدمة
  canManageSystemSettings: boolean;    // إدارة إعدادات النظام
  canViewActivityLogs: boolean;        // عرض سجل النشاطات
  canManageBackups: boolean;           // إدارة النسخ الاحتياطي
  apiAccessEnabled: boolean;           // الوصول لـ API
  webhooksEnabled: boolean;            // تفعيل Webhooks
}

