
import { Customer, Invoice, Payment, Expense, Product, TransactionType, AppDataBackup, User, InvoiceItem, PaymentType, AppSettings, SystemPermissions, SystemMessage, UserPermissions } from '../types';

const KEYS = {
  PRODUCTS: 'app_products',
  CUSTOMERS: 'app_customers',
  INVOICES: 'app_invoices',
  PAYMENTS: 'app_payments',
  EXPENSES: 'app_expenses',
  USERS: 'app_users',
  CURRENT_USER: 'app_current_user',
  UNITS: 'app_units', 
  SETTINGS: 'app_settings',
  SYSTEM_CONFIG: 'app_system_config_global',
  BROADCASTS: 'app_broadcast_messages', 
  READ_NOTIFICATIONS: 'app_read_notifications',
};

// --- DATA ISOLATION HELPER (Updated for Sub-users) ---
const getStorageKey = (baseKey: string): string => {
  // Global keys that are shared or system-wide (independent of company)
  if (baseKey === KEYS.USERS || baseKey === KEYS.SYSTEM_CONFIG || baseKey === KEYS.BROADCASTS) {
    return baseKey;
  }

  if (baseKey === KEYS.CURRENT_USER) return baseKey;

  try {
    const session = localStorage.getItem(KEYS.CURRENT_USER);
    if (session) {
      const user = JSON.parse(session) as User;
      
      // CRITICAL UPDATE: 
      // If user has a parentId, use parentId as prefix (share data with owner).
      // If user is owner (no parentId), use their own id.
      const storageOwnerId = user.parentId ? user.parentId : user.id;
      
      // Exception: Read notifications are specific to the individual user, not shared
      if (baseKey === KEYS.READ_NOTIFICATIONS) {
          return `${user.id}_${baseKey}`;
      }

      return `${storageOwnerId}_${baseKey}`;
    }
  } catch (e) {
    // Fallback
  }
  
  return baseKey; 
};

// Helpers
const getNumericId = () => Math.floor(100000 + Math.random() * 900000).toString();

const load = <T>(baseKey: string): T[] => {
  try {
    const finalKey = getStorageKey(baseKey);
    const data = localStorage.getItem(finalKey);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error(`Error loading key ${baseKey}`, e);
    return [];
  }
};

const save = <T>(baseKey: string, data: T[]) => {
  try {
    const finalKey = getStorageKey(baseKey);
    localStorage.setItem(finalKey, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving key ${baseKey}`, e);
  }
};

// --- NOTIFICATIONS SYSTEM ---
export const sendSystemMessage = (title: string, content: string, sender: string, targetUserId?: string) => {
  try {
    const messagesStr = localStorage.getItem(KEYS.BROADCASTS);
    const messages: SystemMessage[] = messagesStr ? JSON.parse(messagesStr) : [];
    
    // Ensure empty string is treated as undefined/global
    const finalTarget = targetUserId === "" ? undefined : targetUserId;

    const newMessage: SystemMessage = {
      id: Date.now().toString(),
      title,
      content,
      date: new Date().toISOString(),
      sender,
      targetUserId: finalTarget
    };
    
    const updatedMessages = [newMessage, ...messages].slice(0, 50);
    localStorage.setItem(KEYS.BROADCASTS, JSON.stringify(updatedMessages));
    return true;
  } catch (e) {
    return false;
  }
};

export const getUserMessages = (): SystemMessage[] => {
  try {
    const currentUser = getSession();
    if (!currentUser) return [];

    const broadcastStr = localStorage.getItem(KEYS.BROADCASTS);
    const allMessages: SystemMessage[] = broadcastStr ? JSON.parse(broadcastStr) : [];

    const readIdsStr = localStorage.getItem(getStorageKey(KEYS.READ_NOTIFICATIONS));
    const readIds: string[] = readIdsStr ? JSON.parse(readIdsStr) : [];

    return allMessages
      .filter(msg => {
          // Show if:
          // 1. Message is global (!targetUserId)
          // 2. Message is specifically for this user
          return !msg.targetUserId || msg.targetUserId === currentUser.id;
      })
      .map(msg => ({
        ...msg,
        isRead: readIds.includes(msg.id)
      }));

  } catch (e) {
    return [];
  }
};

export const markMessageAsRead = (messageId: string) => {
  try {
    const finalKey = getStorageKey(KEYS.READ_NOTIFICATIONS);
    const readIdsStr = localStorage.getItem(finalKey);
    const readIds: string[] = readIdsStr ? JSON.parse(readIdsStr) : [];
    
    if (!readIds.includes(messageId)) {
      readIds.push(messageId);
      localStorage.setItem(finalKey, JSON.stringify(readIds));
    }
  } catch (e) { console.error(e); }
};

export const markAllMessagesAsRead = () => {
  try {
    const messages = getUserMessages();
    const ids = messages.map(m => m.id);
    const finalKey = getStorageKey(KEYS.READ_NOTIFICATIONS);
    localStorage.setItem(finalKey, JSON.stringify(ids));
  } catch (e) { console.error(e); }
};

// --- SYSTEM PERMISSIONS ---
const DEFAULT_PERMISSIONS: SystemPermissions = {
  // إعدادات شاشة الدخول
  showDemoLogin: true, 
  showAdminLogin: true,
  allowUserRegistration: true,
  showForgotPassword: true,
  showRememberMe: true,
  
  // إعدادات الأمان
  maxLoginAttempts: 5,
  sessionTimeout: 30,
  requireEmailVerification: false,
  
  // إعدادات النظام
  defaultLanguage: 'ar',
  defaultCurrency: 'SAR',
  companyName: 'المحاسب الذكي',
  companyLogo: '',
  
  // إعدادات الفواتير
  invoicePrefix: 'INV-',
  defaultTaxRate: 15,
  showTaxOnInvoice: true,
  
  // إعدادات الإشعارات
  enableEmailNotifications: true,
  enableSMSNotifications: false,
  
  // إعدادات الوحدات
  showMockDataGenerator: true,
  showDashboard: true,
  showInventoryModule: true,
  showCustomersModule: true,
  showInvoicesModule: true,
  showExpensesModule: true,
  showReportsModule: true,
  showSettingsModule: true,
  showDataSync: true, 
  allowUserBackup: true,
  allowClearData: false,
  
  // إعدادات التحديث التلقائي
  allowAutoRefresh: true,
  autoRefreshInterval: 30, // بالثواني (0 = معطل)
  
  // إعدادات المزامنة
  syncDuration: 1500, // مدة عملية المزامنة بالمللي ثانية
  showSyncPopup: true, // إظهار نافذة تفاصيل المزامنة
  
  // إعدادات تنسيق اسم الملفات للطباعة والحفظ
  fileNameFormat: '{app}-{company}-{type}-{customer}-{date}', // التنسيق الافتراضي
  
  // إعدادات وضع عدم الاتصال (Offline Mode)
  allowOfflineMode: true,              // السماح بالعمل بدون اتصال
  offlineDataRetentionDays: 30,        // مدة الاحتفاظ بالبيانات المحلية (بالأيام)
  autoSyncOnReconnect: true,           // مزامنة تلقائية عند عودة الاتصال
  showOfflineIndicator: true,          // إظهار مؤشر حالة الاتصال
  allowOfflineCreate: true,            // السماح بإنشاء سجلات جديدة offline
  allowOfflineEdit: true,              // السماح بالتعديل offline
  allowOfflineDelete: false,           // السماح بالحذف offline (معطل افتراضياً للأمان)
  maxPendingChanges: 100,              // الحد الأقصى للتغييرات المعلقة
  syncIntervalSeconds: 30,             // فترة المزامنة التلقائية (بالثواني)
};

export const getSystemPermissions = (): SystemPermissions => {
  try {
    const data = localStorage.getItem(KEYS.SYSTEM_CONFIG);
    return data ? { ...DEFAULT_PERMISSIONS, ...JSON.parse(data) } : DEFAULT_PERMISSIONS;
  } catch {
    return DEFAULT_PERMISSIONS;
  }
};

export const saveSystemPermissions = (perms: SystemPermissions) => {
  localStorage.setItem(KEYS.SYSTEM_CONFIG, JSON.stringify(perms));
};

// --- SETTINGS MANAGEMENT ---
const DEFAULT_NATIONALITIES: string[] = [
  'سعودي', 'مصري', 'سوري', 'يمني', 'أردني', 'فلسطيني', 'لبناني', 'عراقي', 'سوداني',
  'ليبي', 'تونسي', 'جزائري', 'مغربي', 'إماراتي', 'كويتي', 'بحريني', 'عماني', 'قطري',
  'هندي', 'باكستاني', 'بنغالي', 'فلبيني', 'إندونيسي', 'نيبالي', 'سريلانكي',
  'إثيوبي', 'أمريكي', 'بريطاني', 'فرنسي', 'ألماني', 'تركي', 'إيراني', 'أفغاني', 'أخرى'
];

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'ج.م',
  availableCurrencies: ['ج.م', '$', '€', 'ر.س', 'د.إ'],
  darkMode: false,
  autoSync: true,
  defaultViewMode: 'grid', // الافتراضي: شبكي
  nationalities: DEFAULT_NATIONALITIES,
};

export const getAppSettings = (): AppSettings => {
  try {
    const finalKey = getStorageKey(KEYS.SETTINGS); 
    const data = localStorage.getItem(finalKey);
    const saved = data ? JSON.parse(data) : {};
    return { ...DEFAULT_SETTINGS, ...saved, nationalities: saved.nationalities || DEFAULT_NATIONALITIES };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveAppSettings = (settings: AppSettings) => {
  const finalKey = getStorageKey(KEYS.SETTINGS);
  localStorage.setItem(finalKey, JSON.stringify(settings));
};

// --- UNITS MANAGEMENT ---
export const getUnits = (): string[] => {
  const finalKey = getStorageKey(KEYS.UNITS);
  const data = localStorage.getItem(finalKey);
  if (data === null) {
     return ['قطعة', 'كيلو', 'علبة', 'كرتونة', 'متر', 'لتر', 'ساعة', 'خدمة', 'دستة', 'جوال'];
  }
  try { return JSON.parse(data); } catch { return []; }
};

export const saveUnits = (units: string[]) => {
  save(KEYS.UNITS, units);
};


// --- USER AUTHENTICATION & MANAGEMENT ---
export const getUsers = (): User[] => {
  try {
    const data = localStorage.getItem(KEYS.USERS);
    let users: User[] = data ? JSON.parse(data) : [];

    const adminExists = users.some(u => u.role === 'sys_admin');
    if (!adminExists) {
        // Create Admin with Full Permissions Explicitly
        const defaultAdmin: User = {
            id: 'sys-admin-master',
            name: 'System Administrator',
            companyName: 'Root Admin',
            email: 'admin', 
            password: 'admin123',
            role: 'sys_admin',
            isActive: true,
            subscriptionExpiry: '2099-12-31',
            createdAt: new Date().toISOString(),
            permissions: {
                canManageProducts: true,
                canManageCustomers: true,
                canCreateInvoices: true,
                canManageExpenses: true,
                canViewReports: true,
                canManageSettings: true
            }
        };
        users.push(defaultAdmin);
        localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    }
    // Filter out soft deleted users? Usually system users are hard deleted or just deactivated. 
    // We will keep them all but filter isActive in login.
    return users.filter(u => !u.isDeleted);
  } catch { return []; }
};

// Helper: Get all employees for a specific owner
export const getEmployeesForOwner = (ownerId: string): User[] => {
    const allUsers = getUsers();
    return allUsers.filter(u => u.parentId === ownerId);
};

export const saveAllUsers = (users: User[]) => {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
};

export const registerUser = (user: Omit<User, 'id' | 'createdAt' | 'role'>): User => {
  const users = getUsers();
  if (users.find(u => u.email === user.email)) {
    throw new Error('البريد الإلكتروني مسجل مسبقاً');
  }
  
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  const newUser: User = { 
    ...user, 
    id: getNumericId(),
    role: 'user', 
    isActive: true,
    subscriptionExpiry: trialEnd.toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    // Owner has full permissions by definition
    permissions: {
      canManageProducts: true,
      canManageCustomers: true,
      canCreateInvoices: true,
      canManageExpenses: true,
      canViewReports: true,
      canManageSettings: true
    }
  };
  
  // Use raw localStorage to include deleted ones in uniqueness check if needed, but simple append is fine
  const allUsersRaw = localStorage.getItem(KEYS.USERS);
  const allUsers = allUsersRaw ? JSON.parse(allUsersRaw) : [];
  localStorage.setItem(KEYS.USERS, JSON.stringify([...allUsers, newUser]));
  
  return newUser;
};

// New Function: Add Sub User (Employee)
// parentUser argument: The User object who will be the parent.
export const addSubUser = (parentUser: User, subUserData: { name: string, email: string, password: string, permissions: UserPermissions }) => {
    const users = getUsers();
    if (users.find(u => u.email === subUserData.email)) {
        throw new Error('البريد الإلكتروني مسجل مسبقاً');
    }

    const newSubUser: User = {
        id: getNumericId(),
        parentId: parentUser.parentId || parentUser.id, 
        name: subUserData.name,
        email: subUserData.email,
        password: subUserData.password,
        companyName: parentUser.companyName, 
        role: 'user',
        permissions: subUserData.permissions,
        isActive: true,
        createdAt: new Date().toISOString(),
    };

    const allUsersRaw = localStorage.getItem(KEYS.USERS);
    const allUsers = allUsersRaw ? JSON.parse(allUsersRaw) : [];
    localStorage.setItem(KEYS.USERS, JSON.stringify([...allUsers, newSubUser]));
    
    return newSubUser;
};

// New Function: Update Sub User
export const updateSubUser = (userId: string, updates: Partial<User>) => {
    const allUsersRaw = localStorage.getItem(KEYS.USERS);
    const users: User[] = allUsersRaw ? JSON.parse(allUsersRaw) : [];
    const updatedUsers = users.map(u => u.id === userId ? { ...u, ...updates } : u);
    localStorage.setItem(KEYS.USERS, JSON.stringify(updatedUsers));
};

// New Function: Delete Sub User (Soft Delete)
export const deleteSubUser = (userId: string) => {
    const allUsersRaw = localStorage.getItem(KEYS.USERS);
    const users: User[] = allUsersRaw ? JSON.parse(allUsersRaw) : [];
    const updatedUsers = users.map(u => u.id === userId ? { ...u, isDeleted: true } : u);
    localStorage.setItem(KEYS.USERS, JSON.stringify(updatedUsers));
};

export const loginUser = (identifier: string, password: string): User | null => {
  if (identifier === 'Healthy Food' && password === '12345678') {
    return {
      id: 'default-demo-user',
      name: 'Demo Manager',
      companyName: 'Healthy Food Inc.',
      email: 'demo@healthyfood.com',
      role: 'user',
      isActive: true,
      subscriptionExpiry: '2030-01-01',
      createdAt: new Date().toISOString(),
      permissions: { canManageProducts: true, canManageCustomers: true, canCreateInvoices: true, canManageExpenses: true, canViewReports: true, canManageSettings: true }
    };
  }

  const users = getUsers(); // This returns non-deleted users
  const user = users.find(u => (u.email === identifier || u.companyName === identifier) && u.password === password);
  
  if (user) {
    if (user.isActive === false) {
        throw new Error('تم تعطيل هذا الحساب.');
    }
    
    // If sub-user, check parent's status
    if (user.parentId) {
        const parent = users.find(u => u.id === user.parentId);
        if (parent) {
            if (parent.isActive === false) throw new Error('تم تعطيل الحساب الرئيسي.');
            if (parent.subscriptionExpiry && new Date(parent.subscriptionExpiry) < new Date()) {
                throw new Error('انتهت فترة اشتراك الحساب الرئيسي.');
            }
        }
    } else {
        // If owner, check own subscription
        if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) < new Date()) {
            throw new Error('انتهت فترة الاشتراك لهذا الحساب.');
        }
    }
    
    return user;
  }
  return null;
};

export const updateUserProfile = (userId: string, updates: Partial<User>) => {
  const allUsersRaw = localStorage.getItem(KEYS.USERS);
  const users: User[] = allUsersRaw ? JSON.parse(allUsersRaw) : [];
  const updatedUsers = users.map(u => u.id === userId ? { ...u, ...updates } : u);
  localStorage.setItem(KEYS.USERS, JSON.stringify(updatedUsers));

  const currentUser = getSession();
  if (currentUser && currentUser.id === userId) {
    saveSession({ ...currentUser, ...updates });
  }
};

export const saveSession = (user: User) => {
  localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
};

export const getSession = (): User | null => {
  const data = localStorage.getItem(KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
};

export const clearSession = () => {
  localStorage.removeItem(KEYS.CURRENT_USER);
};


// --- PRODUCTS ---
export const getProducts = (): Product[] => {
    const all = load<Product>(KEYS.PRODUCTS);
    return all.filter(p => !p.isDeleted);
};

export const addProduct = (product: Omit<Product, 'id' | 'createdAt'>): Product => {
  const products = load<Product>(KEYS.PRODUCTS); // Load raw including deleted to append
  const newProduct: Product = { ...product, id: getNumericId(), createdAt: new Date().toISOString() };
  save(KEYS.PRODUCTS, [newProduct, ...products]);
  return newProduct;
};

export const deleteProduct = (id: string) => {
  const products = load<Product>(KEYS.PRODUCTS);
  // Soft Delete
  const updated = products.map(p => p.id === id ? { ...p, isDeleted: true } : p);
  save(KEYS.PRODUCTS, updated);
};

export const updateProduct = (id: string, updates: Partial<Product>) => {
  const products = load<Product>(KEYS.PRODUCTS);
  const updated = products.map(p => p.id === id ? { ...p, ...updates } : p);
  save(KEYS.PRODUCTS, updated);
};

// --- CUSTOMERS ---
export const getCustomers = (): Customer[] => {
    const all = load<Customer>(KEYS.CUSTOMERS);
    return all.filter(c => !c.isDeleted);
};

export const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt'>): Customer => {
  const customers = load<Customer>(KEYS.CUSTOMERS);
  const newCustomer: Customer = { ...customer, id: getNumericId(), createdAt: new Date().toISOString() };
  save(KEYS.CUSTOMERS, [newCustomer, ...customers]); 
  return newCustomer;
};

export const updateCustomer = (id: string, updates: Partial<Customer>) => {
  const customers = load<Customer>(KEYS.CUSTOMERS);
  const updated = customers.map(c => c.id === id ? { ...c, ...updates } : c);
  save(KEYS.CUSTOMERS, updated);
};

export const deleteCustomer = (id: string) => {
  const customers = load<Customer>(KEYS.CUSTOMERS);
  // Soft Delete
  const updated = customers.map(c => c.id === id ? { ...c, isDeleted: true } : c);
  save(KEYS.CUSTOMERS, updated);
};

// --- INVOICES ---
export const getInvoices = (): Invoice[] => {
    const all = load<Invoice>(KEYS.INVOICES);
    return all.filter(i => !i.isDeleted);
};

export const addInvoice = (invoice: Omit<Invoice, 'id' | 'createdAt' | 'paidAmount' | 'remainingAmount'>): Invoice => {
  const invoices = load<Invoice>(KEYS.INVOICES);
  const newInvoice: Invoice = {
    ...invoice,
    id: getNumericId(),
    createdAt: Date.now(),
    paidAmount: 0,
    remainingAmount: invoice.totalAmount,
  };
  save(KEYS.INVOICES, [newInvoice, ...invoices]);
  return newInvoice;
};

export const updateInvoice = (id: string, updates: Partial<Invoice>) => {
  const invoices = load<Invoice>(KEYS.INVOICES);
  const updatedInvoices = invoices.map(inv => {
    if (inv.id === id) {
      const newTotal = updates.totalAmount !== undefined ? updates.totalAmount : inv.totalAmount;
      const paid = inv.paidAmount;
      return {
        ...inv,
        ...updates,
        remainingAmount: newTotal - paid
      };
    }
    return inv;
  });
  save(KEYS.INVOICES, updatedInvoices);
};

export const deleteInvoice = (id: string) => {
  const invoices = load<Invoice>(KEYS.INVOICES);
  // Soft Delete
  const updated = invoices.map(i => i.id === id ? { ...i, isDeleted: true } : i);
  save(KEYS.INVOICES, updated);
};

// --- PAYMENTS ---
export const getPayments = (): Payment[] => {
    const all = load<Payment>(KEYS.PAYMENTS);
    return all.filter(p => !p.isDeleted);
};

export const addPayment = (payment: Omit<Payment, 'id'>): Payment => {
  const payments = load<Payment>(KEYS.PAYMENTS);
  const newPayment: Payment = { ...payment, id: getNumericId() };
  save(KEYS.PAYMENTS, [newPayment, ...payments]);

  const invoices = load<Invoice>(KEYS.INVOICES);
  const updatedInvoices = invoices.map(inv => {
    if (inv.id === payment.invoiceId) {
      const newPaid = inv.paidAmount + payment.amount;
      return {
        ...inv,
        paidAmount: newPaid,
        remainingAmount: inv.totalAmount - newPaid
      };
    }
    return inv;
  });
  save(KEYS.INVOICES, updatedInvoices);

  return newPayment;
};

// --- EXPENSES ---
export const getExpenses = (): Expense[] => {
    const all = load<Expense>(KEYS.EXPENSES);
    return all.filter(e => !e.isDeleted);
};

export const addExpense = (expense: Omit<Expense, 'id' | 'createdAt'>): Expense => {
  const expenses = load<Expense>(KEYS.EXPENSES);
  const newExpense: Expense = { ...expense, id: getNumericId(), createdAt: Date.now() };
  save(KEYS.EXPENSES, [newExpense, ...expenses]);
  return newExpense;
};

export const updateExpense = (id: string, updates: Partial<Expense>): void => {
  const expenses = load<Expense>(KEYS.EXPENSES);
  const updated = expenses.map(e => e.id === id ? { ...e, ...updates } : e);
  save(KEYS.EXPENSES, updated);
};

export const deleteExpense = (id: string): void => {
  const expenses = load<Expense>(KEYS.EXPENSES);
  const updated = expenses.map(e => e.id === id ? { ...e, isDeleted: true } : e);
  save(KEYS.EXPENSES, updated);
};

// --- STATS ---
export const getStats = () => {
  // These getters now ignore isDeleted items, so stats are accurate based on active data
  const invoices = getInvoices();
  const expensesList = getExpenses();

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0); 
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0); 
  const outstandingDebts = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
  
  const totalExpenses = expensesList
    .filter(e => e.type === TransactionType.EXPENSE)
    .reduce((sum, e) => sum + e.amount, 0);
    
  const totalPurchases = expensesList
    .filter(e => e.type === TransactionType.PURCHASE)
    .reduce((sum, e) => sum + e.amount, 0);
    
  const totalOtherIncome = expensesList
    .filter(e => e.type === TransactionType.OTHER_INCOME)
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    totalRevenue,
    totalExpenses,
    totalPurchases,
    totalOtherIncome,
    netProfit: (totalRevenue + totalOtherIncome) - (totalExpenses + totalPurchases),
    outstandingDebts,
    totalInvoiced
  };
};

// --- MOCK DATA ---
export const generateMockData = (productCount: number = 10, customerCount: number = 5): boolean => {
  try {
    // We load RAW data to append, although using getters is safer to avoid duplication of logic, 
    // but here we just append new items.
    const existingProducts = load<Product>(KEYS.PRODUCTS);
    const existingCustomers = load<Customer>(KEYS.CUSTOMERS);
    const existingInvoices = load<Invoice>(KEYS.INVOICES);
    const existingPayments = load<Payment>(KEYS.PAYMENTS);
    const existingExpenses = load<Expense>(KEYS.EXPENSES);

    const newProducts: Product[] = [];
    const newCustomers: Customer[] = [];
    const newInvoices: Invoice[] = [];
    const newPayments: Payment[] = [];
    const newExpenses: Expense[] = [];

    // 1. Generate Products
    const units = ['كيلو', 'قطعة', 'علبة', 'لتر', 'كرتونة'];
    const productPrefixes = ['أرز', 'سكر', 'زيت', 'مكرونة', 'شاي', 'جبنة', 'عصير', 'بسكويت', 'لحم', 'دجاج'];
    const productSuffixes = ['فاخر', 'ممتاز', 'اكسترا', 'الأسرة', 'المدينة', 'الريف', 'طازج', 'مستورد'];
    
    for (let i = 0; i < productCount; i++) {
        const prefix = productPrefixes[Math.floor(Math.random() * productPrefixes.length)];
        const suffix = productSuffixes[Math.floor(Math.random() * productSuffixes.length)];
        const randomPrice = Math.floor(Math.random() * 200) + 10;
        const randomStock = Math.floor(Math.random() * 100) + 5;
        const randomUnit = units[Math.floor(Math.random() * units.length)];

        newProducts.push({
            id: getNumericId(),
            name: `${prefix} ${suffix} #${Math.floor(Math.random() * 10000)}`,
            price: randomPrice,
            stock: randomStock,
            unit: randomUnit,
            notes: 'منتج تجريبي تم توليده آلياً',
            createdAt: new Date().toISOString()
        });
    }

    // 2. Generate Customers
    const firstNames = ['أحمد', 'محمد', 'محمود', 'علي', 'إبراهيم', 'سعيد', 'خالد', 'يوسف', 'حسن', 'عمر'];
    const lastNames = ['السيد', 'علي', 'حسين', 'كامل', 'سالم', 'مهران', 'النجار', 'الحداد', 'عباس', 'رضوان'];
    
    for (let i = 0; i < customerCount; i++) {
        newCustomers.push({
            id: getNumericId(),
            name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
            phone: `05${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
            notes: 'عميل تجريبي',
            createdAt: new Date().toISOString()
        });
    }

    // 3. Generate Invoices
    if (newProducts.length > 0 && newCustomers.length > 0) {
      newCustomers.forEach(customer => {
        const invoiceCountForCustomer = Math.floor(Math.random() * 3);
        
        for(let k=0; k < invoiceCountForCustomer; k++) {
            const numItems = Math.floor(Math.random() * 5) + 1;
            const items: InvoiceItem[] = [];
            let totalInvoiceAmount = 0;

            const shuffledProducts = [...newProducts].sort(() => 0.5 - Math.random());
            const selectedProducts = shuffledProducts.slice(0, numItems);

            for(const product of selectedProducts) {
                const qty = Math.floor(Math.random() * 10) + 1;
                const lineTotal = product.price * qty;
                totalInvoiceAmount += lineTotal;
                
                items.push({
                    id: Math.random().toString(36).substr(2, 9),
                    productId: product.id,
                    name: product.name,
                    quantity: qty,
                    price: product.price,
                    unit: product.unit,
                    total: lineTotal
                });
            }

            const isCash = Math.random() > 0.4;
            const type = isCash ? PaymentType.CASH : PaymentType.CREDIT;
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));
            const dateStr = date.toISOString().split('T')[0];
            const invoiceId = getNumericId();
            
            let paidAmount = 0;

            if (isCash) {
                paidAmount = totalInvoiceAmount;
                newPayments.push({
                    id: getNumericId(),
                    invoiceId: invoiceId,
                    customerId: customer.id,
                    amount: totalInvoiceAmount,
                    date: dateStr,
                    notes: 'دفع نقدي كامل (توليد تلقائي)'
                });
            } else {
                if (Math.random() > 0.5) {
                    const downPayment = Math.floor(totalInvoiceAmount * 0.3);
                    paidAmount = downPayment;
                    newPayments.push({
                        id: getNumericId(),
                        invoiceId: invoiceId,
                        customerId: customer.id,
                        amount: downPayment,
                        date: dateStr,
                        notes: 'دفعة مقدمة (توليد تلقائي)'
                    });
                }
            }

            newInvoices.push({
                id: invoiceId,
                customerId: customer.id,
                customerName: customer.name,
                date: dateStr,
                items: items,
                totalAmount: totalInvoiceAmount,
                paidAmount: paidAmount,
                remainingAmount: totalInvoiceAmount - paidAmount,
                type: type,
                notes: 'فاتورة تجريبية',
                createdAt: Date.now()
            });
        }
      });
    }

    // 4. Generate Expenses
    const expenseTypes = [
        { desc: 'فاتورة كهرباء', cat: 'خدمات', amount: 450, type: TransactionType.EXPENSE },
        { desc: 'صيانة تكييف', cat: 'صيانة', amount: 200, type: TransactionType.EXPENSE },
        { desc: 'نقل بضاعة', cat: 'نقل', amount: 150, type: TransactionType.EXPENSE },
        { desc: 'ضيافة عملاء', cat: 'نثرية', amount: 50, type: TransactionType.EXPENSE },
        { desc: 'بيع كراتين فارغة', cat: 'إيراد متنوع', amount: 120, type: TransactionType.OTHER_INCOME },
    ];
    
    for(let i=0; i<3; i++) {
        const exp = expenseTypes[Math.floor(Math.random() * expenseTypes.length)];
        newExpenses.push({
            id: getNumericId(),
            type: exp.type, 
            amount: exp.amount, 
            description: exp.desc + ' (توليد تلقائي)', 
            category: exp.cat, 
            date: new Date().toISOString().split('T')[0],
            createdAt: Date.now()
        });
    }
    
    save(KEYS.PRODUCTS, [...newProducts, ...existingProducts]);
    save(KEYS.CUSTOMERS, [...newCustomers, ...existingCustomers]);
    save(KEYS.INVOICES, [...newInvoices, ...existingInvoices]);
    save(KEYS.PAYMENTS, [...newPayments, ...existingPayments]);
    save(KEYS.EXPENSES, [...newExpenses, ...existingExpenses]);

    return true;
  } catch (error) {
    console.error("Mock Data Generation Error:", error);
    return false;
  }
};

// --- DATA MANAGEMENT ---
export const createBackup = (): string => {
  // Use getters to backup ONLY active data (or raw to backup everything including deleted?)
  // Usually backup should contain active data.
  const backup: AppDataBackup = {
    version: '5.0',
    timestamp: new Date().toISOString(),
    products: getProducts(),
    customers: getCustomers(),
    invoices: getInvoices(),
    payments: getPayments(),
    expenses: getExpenses()
  };
  return JSON.stringify(backup, null, 2);
};

export const restoreBackup = (jsonString: string): boolean => {
  try {
    const data: AppDataBackup = JSON.parse(jsonString);
    if (!data.products) throw new Error('Invalid backup file');
    
    save(KEYS.PRODUCTS, data.products);
    save(KEYS.CUSTOMERS, data.customers || []);
    save(KEYS.INVOICES, data.invoices || []);
    save(KEYS.PAYMENTS, data.payments || []);
    save(KEYS.EXPENSES, data.expenses || []);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const clearAllData = () => {
  // Soft Delete Function implementation
  // This affects ONLY the data associated with the current user's storage key scope.
  const keysToClear = [KEYS.PRODUCTS, KEYS.CUSTOMERS, KEYS.INVOICES, KEYS.PAYMENTS, KEYS.EXPENSES];
  
  keysToClear.forEach(key => {
      const list = load<any>(key);
      const updated = list.map(item => ({ ...item, isDeleted: true }));
      save(key, updated);
  });
};
