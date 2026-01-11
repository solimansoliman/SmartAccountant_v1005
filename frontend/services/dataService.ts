/**
 * خدمة البيانات الموحدة - طبقة وسيطة بين الفرونت والباك إند
 * تحاول الاتصال بالـ API أولاً، وإذا فشل تستخدم localStorage
 * 
 * Data Service - Unified layer between Frontend and Backend
 * Tries API first, falls back to localStorage if offline
 */

import { Product, Customer, Invoice, Payment, Expense, User, InvoiceItem } from '../types';
import * as storage from './storageService';
import api, { 
  productsApi, 
  customersApi, 
  invoicesApi, 
  expensesApi,
  unitsApi,
  checkApiConnection,
  ApiProduct,
  ApiCustomer,
  ApiInvoice,
  ApiExpense
} from './apiService';

// ==================== Configuration ====================
let useApiMode = true; // Toggle between API and localStorage
let isApiAvailable = false;

// ==================== Connection Check ====================
export const checkConnection = async (): Promise<boolean> => {
  try {
    isApiAvailable = await checkApiConnection();
    return isApiAvailable;
  } catch {
    isApiAvailable = false;
    return false;
  }
};

export const setApiMode = (enabled: boolean) => {
  useApiMode = enabled;
};

export const isOnlineMode = () => useApiMode && isApiAvailable;

// ==================== Type Converters ====================

// Convert API Product to Frontend Product
const apiProductToLocal = (apiProduct: ApiProduct): Product => ({
  id: apiProduct.id?.toString() || '',
  name: apiProduct.name,
  price: apiProduct.sellingPrice,
  stock: apiProduct.stockQuantity,
  unit: 'قطعة', // Default unit
  description: apiProduct.description,
  notes: apiProduct.description,
  createdAt: apiProduct.createdAt || new Date().toISOString(),
  isDeleted: !apiProduct.isActive,
});

// Convert Frontend Product to API Product
const localProductToApi = (product: Partial<Product>): Partial<ApiProduct> => ({
  code: `PRD${Date.now()}`,
  name: product.name || '',
  nameEn: product.name,
  description: product.notes || product.description,
  costPrice: (product.price || 0) * 0.7, // Estimate cost as 70% of selling price
  sellingPrice: product.price || 0,
  stockQuantity: product.stock || 0,
  minStockLevel: 5,
  taxPercent: 0,
  isActive: !product.isDeleted,
});

// Convert API Customer to Frontend Customer
const apiCustomerToLocal = (apiCustomer: ApiCustomer): Customer => ({
  id: apiCustomer.id?.toString() || '',
  name: apiCustomer.name,
  phone: apiCustomer.phone || '',
  address: apiCustomer.address,
  notes: apiCustomer.notes,
  createdAt: apiCustomer.createdAt || new Date().toISOString(),
  isDeleted: !apiCustomer.isActive,
});

// Convert Frontend Customer to API Customer
const localCustomerToApi = (customer: Partial<Customer>): Partial<ApiCustomer> => ({
  code: `CUS${Date.now()}`,
  name: customer.name || '',
  nameEn: customer.name,
  type: 'Individual',
  phone: customer.phone,
  address: customer.address,
  notes: customer.notes,
  creditLimit: 0,
  balance: 0,
  isActive: !customer.isDeleted,
});

// Convert API Invoice to Frontend Invoice
const apiInvoiceToLocal = (apiInvoice: ApiInvoice): Invoice => ({
  id: apiInvoice.id?.toString() || '',
  customerId: apiInvoice.customerId?.toString() || '',
  customerName: apiInvoice.customer?.name || '',
  date: apiInvoice.invoiceDate, // الاحتفاظ بالتاريخ والوقت الكامل
  items: apiInvoice.items.map(item => ({
    id: item.id?.toString() || '',
    productId: item.productId?.toString(),
    name: item.productName || '',
    quantity: item.quantity,
    unit: 'قطعة',
    price: item.unitPrice,
    total: item.lineTotal,
  })),
  totalAmount: apiInvoice.totalAmount,
  paidAmount: apiInvoice.paidAmount,
  remainingAmount: apiInvoice.totalAmount - apiInvoice.paidAmount,
  type: apiInvoice.paymentMethod === 'Cash' ? 'كاش' as any : 'آجل/دفعات' as any,
  notes: apiInvoice.notes,
  createdAt: new Date(apiInvoice.createdAt || '').getTime(),
  isDeleted: apiInvoice.status === 'Cancelled',
});

// Convert Frontend Invoice to API Invoice
const localInvoiceToApi = (invoice: Partial<Invoice>): Partial<ApiInvoice> => {
  // إذا كان التاريخ بصيغة YYYY-MM-DD فقط، نضيف الوقت الحالي
  let invoiceDateTime = invoice.date || new Date().toISOString();
  if (invoiceDateTime && invoiceDateTime.length === 10) {
    // التاريخ بصيغة YYYY-MM-DD - نضيف الوقت الحالي
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    invoiceDateTime = `${invoiceDateTime}T${time}`;
  }
  
  return {
    invoiceType: 'Sales',
    status: 'Draft',
    invoiceDate: invoiceDateTime,
    customerId: invoice.customerId ? parseInt(invoice.customerId) : undefined,
  paymentMethod: invoice.type === 'كاش' ? 'Cash' : 'Credit',
  subTotal: invoice.totalAmount || 0,
  discountPercent: 0,
  discountAmount: 0,
  taxAmount: 0,
  totalAmount: invoice.totalAmount || 0,
  paidAmount: invoice.paidAmount || 0,
  notes: invoice.notes,
  items: (invoice.items || []).filter(item => item.productId && parseInt(item.productId) > 0).map(item => ({
    productId: parseInt(item.productId!),
    productName: item.name,
    quantity: item.quantity,
    unitPrice: item.price,
    discountPercent: 0,
    discountAmount: 0,
    taxPercent: 0,
    taxAmount: 0,
    lineTotal: item.total,
  })),
  };
};

// Convert API Expense to Frontend Expense  
const apiExpenseToLocal = (apiExpense: ApiExpense): Expense => ({
  id: apiExpense.id?.toString() || '',
  type: 'مصروفات' as any,
  category: 'عام',
  description: apiExpense.description,
  amount: apiExpense.totalAmount,
  date: apiExpense.expenseDate.split('T')[0],
  createdAt: new Date(apiExpense.createdAt || '').getTime(),
  isDeleted: apiExpense.status === 'Cancelled',
});

// Convert Frontend Expense to API Expense
const localExpenseToApi = (expense: Partial<Expense>): Partial<ApiExpense> => ({
  expenseDate: expense.date || new Date().toISOString().split('T')[0],
  description: expense.description || '',
  amount: expense.amount || 0,
  taxAmount: 0,
  totalAmount: expense.amount || 0,
  paymentMethod: 'Cash',
  status: 'Approved',
  notes: expense.category,
});

// ==================== Products ====================
export const getProducts = async (): Promise<Product[]> => {
  if (isOnlineMode()) {
    try {
      const apiProducts = await productsApi.getAll();
      return apiProducts.map(apiProductToLocal);
    } catch (error) {
      console.warn('API Error, falling back to localStorage:', error);
    }
  }
  return storage.getProducts();
};

export const getProductsSync = (): Product[] => {
  return storage.getProducts();
};

export const addProduct = async (product: Omit<Product, 'id' | 'createdAt'>): Promise<Product | null> => {
  if (isOnlineMode()) {
    try {
      const apiProduct = await productsApi.create(localProductToApi(product) as any);
      return apiProductToLocal(apiProduct);
    } catch (error) {
      console.warn('API Error, falling back to localStorage:', error);
    }
  }
  return storage.addProduct(product);
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<boolean> => {
  if (isOnlineMode()) {
    try {
      const existing = await productsApi.getById(parseInt(id));
      await productsApi.update(parseInt(id), { ...existing, ...localProductToApi(updates) } as any);
      return true;
    } catch (error) {
      console.warn('API Error, falling back to localStorage:', error);
    }
  }
  storage.updateProduct(id, updates);
  return true;
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  if (isOnlineMode()) {
    try {
      await productsApi.delete(parseInt(id));
      return true;
    } catch (error) {
      console.warn('API Error, falling back to localStorage:', error);
    }
  }
  storage.deleteProduct(id);
  return true;
};

// ==================== Customers ====================
export const getCustomers = async (): Promise<Customer[]> => {
  if (isOnlineMode()) {
    try {
      const apiCustomers = await customersApi.getAll();
      return apiCustomers.map(apiCustomerToLocal);
    } catch (error) {
      console.warn('API Error, falling back to localStorage:', error);
    }
  }
  return storage.getCustomers();
};

export const getCustomersSync = (): Customer[] => {
  return storage.getCustomers();
};

export const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer | null> => {
  if (isOnlineMode()) {
    try {
      const apiCustomer = await customersApi.create(localCustomerToApi(customer) as any);
      return apiCustomerToLocal(apiCustomer);
    } catch (error) {
      console.warn('API Error, falling back to localStorage:', error);
    }
  }
  return storage.addCustomer(customer);
};

export const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<boolean> => {
  if (isOnlineMode()) {
    try {
      const existing = await customersApi.getById(parseInt(id));
      await customersApi.update(parseInt(id), { ...existing, ...localCustomerToApi(updates) } as any);
      return true;
    } catch (error) {
      console.warn('API Error, falling back to localStorage:', error);
    }
  }
  storage.updateCustomer(id, updates);
  return true;
};

export const deleteCustomer = async (id: string): Promise<boolean> => {
  if (isOnlineMode()) {
    try {
      await customersApi.delete(parseInt(id));
      return true;
    } catch (error) {
      console.warn('API Error, falling back to localStorage:', error);
    }
  }
  storage.deleteCustomer(id);
  return true;
};

// ==================== Invoices ====================
export const getInvoices = async (): Promise<Invoice[]> => {
  if (isOnlineMode()) {
    try {
      const apiInvoices = await invoicesApi.getAll();
      return apiInvoices.map(apiInvoiceToLocal);
    } catch (error) {
      console.warn('API Error, falling back to localStorage:', error);
    }
  }
  return storage.getInvoices();
};

export const getInvoicesSync = (): Invoice[] => {
  return storage.getInvoices();
};

export const addInvoice = async (invoice: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice | null> => {
  if (isOnlineMode()) {
    try {
      const apiInvoice = await invoicesApi.create(localInvoiceToApi(invoice) as any);
      return apiInvoiceToLocal(apiInvoice);
    } catch (error) {
      console.warn('API Error, falling back to localStorage:', error);
    }
  }
  return storage.addInvoice(invoice);
};

export const updateInvoice = async (id: string, updates: Partial<Invoice>): Promise<boolean> => {
  // Note: API doesn't support direct invoice update, only status changes
  storage.updateInvoice(id, updates);
  return true;
};

export const deleteInvoice = async (id: string): Promise<boolean> => {
  if (isOnlineMode()) {
    try {
      await invoicesApi.delete(parseInt(id));
      return true;
    } catch (error) {
      console.warn('API Error, falling back to localStorage:', error);
    }
  }
  storage.deleteInvoice(id);
  return true;
};

// ==================== Expenses ====================
export const getExpenses = async (): Promise<Expense[]> => {
  if (isOnlineMode()) {
    try {
      const apiExpenses = await expensesApi.getAll();
      return apiExpenses.map(apiExpenseToLocal);
    } catch (error) {
      console.warn('API Error, falling back to localStorage:', error);
    }
  }
  return storage.getExpenses();
};

export const getExpensesSync = (): Expense[] => {
  return storage.getExpenses();
};

export const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense | null> => {
  if (isOnlineMode()) {
    try {
      const apiExpense = await expensesApi.create(localExpenseToApi(expense) as any);
      return apiExpenseToLocal(apiExpense);
    } catch (error) {
      console.warn('API Error, falling back to localStorage:', error);
    }
  }
  return storage.addExpense(expense);
};

export const updateExpense = async (id: string, updates: Partial<Expense>): Promise<boolean> => {
  if (isOnlineMode()) {
    try {
      const existing = await expensesApi.getById(parseInt(id));
      await expensesApi.update(parseInt(id), { ...existing, ...localExpenseToApi(updates) } as any);
      return true;
    } catch (error) {
      console.warn('API Error, falling back to localStorage:', error);
    }
  }
  storage.updateExpense(id, updates);
  return true;
};

export const deleteExpense = async (id: string): Promise<boolean> => {
  if (isOnlineMode()) {
    try {
      await expensesApi.delete(parseInt(id));
      return true;
    } catch (error) {
      console.warn('API Error, falling back to localStorage:', error);
    }
  }
  storage.deleteExpense(id);
  return true;
};

// ==================== Payments ====================
export const getPayments = async (): Promise<Payment[]> => {
  return storage.getPayments();
};

export const getPaymentsSync = (): Payment[] => {
  return storage.getPayments();
};

export const addPayment = async (payment: Omit<Payment, 'id'>): Promise<Payment | null> => {
  if (isOnlineMode() && payment.invoiceId) {
    try {
      await invoicesApi.addPayment(parseInt(payment.invoiceId), {
        amount: payment.amount,
        paymentDate: payment.date,
        paymentMethod: 'Cash',
        notes: payment.notes,
      });
    } catch (error) {
      console.warn('API Error, falling back to localStorage:', error);
    }
  }
  return storage.addPayment(payment);
};

// ==================== Units ====================
export const getUnits = async (): Promise<string[]> => {
  if (isOnlineMode()) {
    try {
      const apiUnits = await unitsApi.getAll();
      return apiUnits.map(u => u.name);
    } catch (error) {
      console.warn('API Error, falling back to localStorage:', error);
    }
  }
  return storage.getUnits();
};

export const getUnitsSync = (): string[] => {
  return storage.getUnits();
};

export const saveUnits = (units: string[]) => {
  storage.saveUnits(units);
};

// ==================== Auth (Keep using localStorage) ====================
export const loginUser = storage.loginUser;
export const registerUser = storage.registerUser;
export const getSession = storage.getSession;
export const saveSession = storage.saveSession;
export const clearSession = storage.clearSession;
export const getUsers = storage.getUsers;

// ==================== Dashboard Stats ====================
export const getDashboardStats = async () => {
  const [invoices, expenses] = await Promise.all([
    getInvoices(),
    getExpenses(),
  ]);

  const totalRevenue = invoices
    .filter(inv => !inv.isDeleted)
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  
  const totalExpenses = expenses
    .filter(exp => !exp.isDeleted && exp.type === 'مصروفات')
    .reduce((sum, exp) => sum + exp.amount, 0);
  
  const totalPurchases = expenses
    .filter(exp => !exp.isDeleted && exp.type === 'مشتريات')
    .reduce((sum, exp) => sum + exp.amount, 0);
  
  const outstandingDebts = invoices
    .filter(inv => !inv.isDeleted)
    .reduce((sum, inv) => sum + inv.remainingAmount, 0);

  const totalOtherIncome = expenses
    .filter(exp => !exp.isDeleted && (exp.type === 'إيرادات' || exp.type === 'إيرادات أخرى'))
    .reduce((sum, exp) => sum + exp.amount, 0);

  return {
    totalRevenue,
    totalExpenses,
    totalPurchases,
    netProfit: totalRevenue + totalOtherIncome - totalExpenses - totalPurchases,
    outstandingDebts,
    totalOtherIncome,
  };
};

// ==================== Re-export everything from storageService ====================
export {
  getAppSettings,
  saveAppSettings,
  getSystemPermissions,
  saveSystemPermissions,
  getUserMessages,
  markMessageAsRead,
  markAllMessagesAsRead,
  sendSystemMessage,
  clearAllData,
  generateMockData,
  getStats,
  addSubUser,
  deleteSubUser,
  updateSubUser,
  updateUserProfile,
  saveAllUsers,
  getEmployeesForOwner,
  createBackup,
  restoreBackup,
} from './storageService';

// ==================== Initialize ====================
// Check API connection on startup
checkConnection().then(available => {
  console.log(`API Connection: ${available ? '✅ متصل' : '❌ غير متصل - وضع Offline'}`);
});

export default {
  // Products
  getProducts,
  getProductsSync,
  addProduct,
  updateProduct,
  deleteProduct,
  // Customers
  getCustomers,
  getCustomersSync,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  // Invoices
  getInvoices,
  getInvoicesSync,
  addInvoice,
  updateInvoice,
  deleteInvoice,
  // Expenses
  getExpenses,
  getExpensesSync,
  addExpense,
  updateExpense,
  deleteExpense,
  // Payments
  getPayments,
  getPaymentsSync,
  addPayment,
  // Units
  getUnits,
  getUnitsSync,
  saveUnits,
  // Auth
  loginUser,
  registerUser,
  getSession,
  saveSession,
  clearSession,
  // Stats
  getDashboardStats,
  // Connection
  checkConnection,
  setApiMode,
  isOnlineMode,
};
