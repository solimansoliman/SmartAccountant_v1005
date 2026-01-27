/**
 * React Hooks للتعامل مع البيانات من API
 * Data Hooks for API Integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  productsApi, 
  customersApi, 
  invoicesApi, 
  expensesApi, 
  unitsApi,
  revenuesApi,
  ApiProduct,
  ApiCustomer,
  ApiInvoice,
  ApiExpense,
  ApiUnit,
  ApiRevenue
} from './apiService';
import { useAuth } from '../context/AuthContext';

// ==================== Frontend Product Type (for UI compatibility) ====================
export interface FrontendProduct {
  id: number;
  name: string;
  price: number;
  stock?: number;
  unit?: string;
  notes?: string;
  code?: string;
  barcode?: string;
}

// ==================== Frontend Customer Type ====================
export interface FrontendCustomer {
  id: number;
  name: string;
  phone?: string;
  notes?: string;
  balance?: number;
}

// ==================== Frontend Invoice Type ====================
// Invoice Status: 0=Draft, 1=Pending, 2=Confirmed, 3=Cancelled, 4=Paid, 5=PartiallyPaid, 6=Overdue, 7=Refunded
export type InvoiceStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface FrontendPayment {
  id: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
}

export interface FrontendInvoice {
  id: number;
  invoiceNumber?: string;
  date: string;
  customerId?: number;
  customerName?: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: string;
  type?: string;
  status: InvoiceStatus; // حالة الفاتورة
  items: {
    id?: number | string;
    productId?: number | string;
    name: string;
    quantity: number;
    price: number;
    unit: string;
    total: number;
  }[];
  payments?: FrontendPayment[];
  notes?: string;
}

// ==================== Mappers ====================
const mapApiToFrontendProduct = (apiProduct: ApiProduct): FrontendProduct => ({
  id: apiProduct.id!,
  name: apiProduct.name,
  price: apiProduct.sellingPrice,
  stock: apiProduct.stockQuantity,
  unit: apiProduct.unit || 'قطعة',
  notes: apiProduct.description,
  code: apiProduct.code,
  barcode: apiProduct.barcode,
});

const mapFrontendToApiProduct = (frontendProduct: Omit<FrontendProduct, 'id'>, accountId: number = 1): Omit<ApiProduct, 'id' | 'createdAt'> => ({
  code: frontendProduct.code || `PRD${Date.now()}`,
  barcode: frontendProduct.barcode,
  name: frontendProduct.name,
  description: frontendProduct.notes,
  unit: frontendProduct.unit || 'قطعة',
  sellingPrice: frontendProduct.price,
  costPrice: frontendProduct.price * 0.7, // Default cost price
  stockQuantity: frontendProduct.stock || 0,
  minStockLevel: 0,
  taxPercent: 0,
  isActive: true,
});

const mapApiToFrontendCustomer = (apiCustomer: ApiCustomer): FrontendCustomer => ({
  id: apiCustomer.id!,
  name: apiCustomer.name,
  phone: apiCustomer.phone,
  notes: apiCustomer.notes,
  balance: apiCustomer.balance,
});

const mapFrontendToApiCustomer = (frontendCustomer: Omit<FrontendCustomer, 'id'>): Omit<ApiCustomer, 'id' | 'createdAt'> => ({
  code: `CUST${Date.now()}`,
  name: frontendCustomer.name,
  type: 'Individual',
  phone: frontendCustomer.phone,
  notes: frontendCustomer.notes,
  creditLimit: 0,
  balance: 0,
  isActive: true,
});

const mapApiToFrontendInvoice = (apiInvoice: ApiInvoice): FrontendInvoice => {
  // تحويل الـ status من string أو number لـ number
  // Status values: 0=Draft, 1=Pending, 2=Confirmed, 3=Cancelled, 4=Paid, 5=PartiallyPaid, 6=Overdue, 7=Refunded
  const statusMap: { [key: string]: number } = {
    'Draft': 0,
    'Pending': 1,
    'Confirmed': 2,
    'Cancelled': 3,
    'Paid': 4,
    'PartialPaid': 5,
    'PartiallyPaid': 5,
    'Overdue': 6,
    'Refunded': 7,
  };
  
  let statusValue: number = 0;
  const rawStatus = (apiInvoice as any).status;
  if (typeof rawStatus === 'number') {
    statusValue = rawStatus;
  } else if (typeof rawStatus === 'string') {
    statusValue = statusMap[rawStatus] ?? 0;
  }
  
  return {
    id: apiInvoice.id!,
    invoiceNumber: apiInvoice.invoiceNumber,
    date: apiInvoice.invoiceDate,
    customerId: apiInvoice.customerId,
    customerName: apiInvoice.customer?.name,
    totalAmount: apiInvoice.totalAmount || 0,
    paidAmount: apiInvoice.paidAmount || 0,
    remainingAmount: (apiInvoice.totalAmount || 0) - (apiInvoice.paidAmount || 0),
    paymentMethod: apiInvoice.paymentMethod,
    status: statusValue as InvoiceStatus, // حالة الفاتورة
    items: (apiInvoice.items || []).map((item: any) => ({
      id: item.id,
      productId: item.productId,
      name: item.productName || item.name || '',
      quantity: item.quantity || 0,
      price: item.unitPrice || item.price || 0,
      unit: item.unit?.name || item.unit || 'قطعة',
      total: item.lineTotal || item.total || (item.quantity * item.unitPrice) || 0,
    })),
    payments: ((apiInvoice as any).payments || []).map((p: any) => ({
      id: p.id,
      amount: p.amount || 0,
      paymentDate: p.paymentDate || p.createdAt,
      paymentMethod: p.paymentMethod || 'Cash',
      notes: p.notes,
    })),
    notes: apiInvoice.notes,
    // PaymentMethod: 0=Cash, 1=Credit OR 'Cash'/'Credit' string
    type: (apiInvoice.paymentMethod === 0 || apiInvoice.paymentMethod === 'Cash') ? 'كاش' : 'آجل/دفعات',
  };
};

// ==================== Products Hook ====================
export const useProducts = () => {
  const [products, setProducts] = useState<FrontendProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchProducts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await productsApi.getAll();
      setProducts(data.map(mapApiToFrontendProduct));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'فشل في جلب المنتجات');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // استماع لحدث التحديث التلقائي
  useEffect(() => {
    const handleAutoRefresh = () => {
      fetchProducts();
    };
    window.addEventListener('autoRefreshData', handleAutoRefresh);
    return () => window.removeEventListener('autoRefreshData', handleAutoRefresh);
  }, [fetchProducts]);

  const addProduct = async (product: Omit<FrontendProduct, 'id'>) => {
    try {
      const apiProduct = mapFrontendToApiProduct(product);
      const newProduct = await productsApi.create(apiProduct);
      const frontendProduct = mapApiToFrontendProduct(newProduct);
      setProducts(prev => [frontendProduct, ...prev]);
      return frontendProduct;
    } catch (err: any) {
      throw new Error(err.message || 'فشل في إضافة المنتج');
    }
  };

  const updateProduct = async (id: number, updates: Partial<FrontendProduct>) => {
    try {
      const existing = products.find(p => p.id === id);
      if (!existing) throw new Error('المنتج غير موجود');
      
      // Get full API product then update
      const apiProduct = await productsApi.getById(id);
      
      // إنشاء كائن التحديث
      const updatedApiProduct: ApiProduct = {
        ...apiProduct,
        name: updates.name !== undefined ? updates.name : apiProduct.name,
        sellingPrice: updates.price !== undefined ? updates.price : apiProduct.sellingPrice,
        stockQuantity: updates.stock !== undefined ? updates.stock : apiProduct.stockQuantity,
        unit: updates.unit !== undefined ? updates.unit : apiProduct.unit,
        description: updates.notes !== undefined ? updates.notes : apiProduct.description,
      };
      
      // عند تغيير الوحدة، نحذف unitId ليبحث Backend عن الوحدة بالاسم
      if (updates.unit !== undefined) {
        delete (updatedApiProduct as any).unitId;
      }
      
      await productsApi.update(id, updatedApiProduct);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (err: any) {
      throw new Error(err.message || 'فشل في تحديث المنتج');
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      await productsApi.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'فشل في حذف المنتج');
    }
  };

  return {
    products,
    loading,
    error,
    refresh: fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
  };
};

// ==================== Customers Hook ====================
export const useCustomers = () => {
  const [customers, setCustomers] = useState<FrontendCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCustomers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await customersApi.getAll();
      setCustomers(data.map(mapApiToFrontendCustomer));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'فشل في جلب العملاء');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // استماع لحدث التحديث التلقائي
  useEffect(() => {
    const handleAutoRefresh = () => {
      fetchCustomers();
    };
    window.addEventListener('autoRefreshData', handleAutoRefresh);
    return () => window.removeEventListener('autoRefreshData', handleAutoRefresh);
  }, [fetchCustomers]);

  const addCustomer = async (customer: Omit<FrontendCustomer, 'id'>) => {
    try {
      const apiCustomer = mapFrontendToApiCustomer(customer);
      const newCustomer = await customersApi.create(apiCustomer);
      const frontendCustomer = mapApiToFrontendCustomer(newCustomer);
      setCustomers(prev => [frontendCustomer, ...prev]);
      return frontendCustomer;
    } catch (err: any) {
      throw new Error(err.message || 'فشل في إضافة العميل');
    }
  };

  const updateCustomer = async (id: number, updates: Partial<FrontendCustomer>) => {
    try {
      const existing = customers.find(c => c.id === id);
      if (!existing) throw new Error('العميل غير موجود');
      
      const apiCustomer = await customersApi.getById(id);
      const updatedApiCustomer: ApiCustomer = {
        ...apiCustomer,
        name: updates.name ?? apiCustomer.name,
        phone: updates.phone ?? apiCustomer.phone,
        notes: updates.notes ?? apiCustomer.notes,
      };
      
      await customersApi.update(id, updatedApiCustomer);
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    } catch (err: any) {
      throw new Error(err.message || 'فشل في تحديث العميل');
    }
  };

  const deleteCustomer = async (id: number) => {
    try {
      await customersApi.delete(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'فشل في حذف العميل');
    }
  };

  return {
    customers,
    loading,
    error,
    refresh: fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  };
};

// ==================== Units Hook ====================
export const useUnits = () => {
  const [units, setUnits] = useState<ApiUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchUnits = useCallback(async () => {
    if (!user) {
      // Default units if not logged in
      setUnits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await unitsApi.getAll();
      setUnits(data);
      setError(null);
    } catch (err: any) {
      // Fallback to default units
      setUnits([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // استماع لحدث التحديث التلقائي
  useEffect(() => {
    const handleAutoRefresh = () => {
      fetchUnits();
    };
    window.addEventListener('autoRefreshData', handleAutoRefresh);
    return () => window.removeEventListener('autoRefreshData', handleAutoRefresh);
  }, [fetchUnits]);

  // Get unit names as string array (for compatibility)
  const defaultUnits = ['قطعة', 'كيلو', 'لتر', 'متر', 'علبة', 'كرتون'];
  const unitNames = units.length > 0 ? units.map(u => u.name) : defaultUnits;

  // Add unit with all fields
  const addUnit = async (name: string, nameEn?: string, symbol?: string) => {
    try {
      const newUnit = await unitsApi.create({
        name,
        nameEn: nameEn || '',
        symbol: symbol || name,
        isBase: true,
        conversionFactor: 1,
        isActive: true,
      });
      setUnits(prev => [...prev, newUnit]);
      return newUnit;
    } catch (err: any) {
      throw new Error(err.message || 'فشل في إضافة الوحدة');
    }
  };

  // Update unit with all fields
  const updateUnit = async (id: number, updates: { name: string; nameEn?: string; symbol: string }) => {
    try {
      const unit = units.find(u => u.id === id);
      if (!unit || !unit.id) throw new Error('الوحدة غير موجودة');
      
      const updatedUnit: ApiUnit = {
        ...unit,
        name: updates.name,
        nameEn: updates.nameEn || '',
        symbol: updates.symbol,
      };
      
      await unitsApi.update(unit.id, updatedUnit);
      setUnits(prev => prev.map(u => u.id === unit.id ? updatedUnit : u));
    } catch (err: any) {
      throw new Error(err.message || 'فشل في تحديث الوحدة');
    }
  };

  // Delete unit by id
  const deleteUnit = async (id: number) => {
    try {
      const unit = units.find(u => u.id === id);
      if (!unit || !unit.id) throw new Error('الوحدة غير موجودة');
      
      await unitsApi.delete(unit.id);
      setUnits(prev => prev.filter(u => u.id !== unit.id));
    } catch (err: any) {
      throw new Error(err.message || 'فشل في حذف الوحدة');
    }
  };

  return {
    units,         // Full unit objects with all fields
    unitNames,     // Just names for compatibility
    loading,
    error,
    refresh: fetchUnits,
    addUnit,
    updateUnit,
    deleteUnit,
  };
};

// ==================== Invoices Hook ====================
export const useInvoices = () => {
  const [invoices, setInvoices] = useState<FrontendInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchInvoices = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await invoicesApi.getAll();
      setInvoices(data.map(mapApiToFrontendInvoice));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'فشل في جلب الفواتير');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // استماع لحدث التحديث التلقائي
  useEffect(() => {
    const handleAutoRefresh = () => {
      fetchInvoices();
    };
    window.addEventListener('autoRefreshData', handleAutoRefresh);
    return () => window.removeEventListener('autoRefreshData', handleAutoRefresh);
  }, [fetchInvoices]);

  const addInvoice = async (invoice: Omit<FrontendInvoice, 'id' | 'invoiceNumber'>) => {
    try {
      // تحويل البنود إلى صيغة API
      const apiItems = invoice.items.map(item => ({
        productId: item.productId ? parseInt(String(item.productId)) : 0,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        lineTotal: item.total,
      }));

      const apiInvoice: Omit<ApiInvoice, 'id' | 'invoiceNumber' | 'createdAt'> = {
        invoiceType: 'Sales',
        invoiceDate: invoice.date,
        customerId: invoice.customerId,
        paymentMethod: invoice.paymentMethod as any,
        subTotal: invoice.totalAmount,
        discountPercent: 0,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        notes: invoice.notes,
        items: apiItems,
      };
      
      const newInvoice = await invoicesApi.create(apiInvoice);
      
      // إعادة جلب الفاتورة من الـ API لضمان وجود بيانات العميل كاملة
      const refreshedInvoice = await invoicesApi.getById(newInvoice.id!);
      const frontendInvoice = mapApiToFrontendInvoice(refreshedInvoice);
      
      setInvoices(prev => [frontendInvoice, ...prev]);
      return frontendInvoice;
    } catch (err: any) {
      throw new Error(err.message || 'فشل في إنشاء الفاتورة');
    }
  };

  const deleteInvoice = async (id: number) => {
    try {
      await invoicesApi.delete(id);
      setInvoices(prev => prev.filter(i => i.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'فشل في حذف الفاتورة');
    }
  };

  const updateInvoice = async (id: number, updates: Partial<FrontendInvoice>) => {
    try {
      const existing = invoices.find(i => i.id === id);
      if (!existing) throw new Error('الفاتورة غير موجودة');
      
      const apiInvoice = await invoicesApi.getById(id);
      
      // تحويل البنود إلى صيغة API إذا كانت موجودة
      let apiItems = apiInvoice.items;
      if (updates.items) {
        apiItems = updates.items.map(item => ({
          productId: item.productId ? parseInt(String(item.productId)) : 0,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          discountPercent: 0,
          discountAmount: 0,
          taxPercent: 0,
          taxAmount: 0,
          lineTotal: item.total,
        }));
      }

      const updatedApiInvoice: ApiInvoice = {
        ...apiInvoice,
        invoiceDate: updates.date ?? apiInvoice.invoiceDate,
        customerId: updates.customerId ?? apiInvoice.customerId,
        // تحديث المبلغ المدفوع إذا تم إرساله
        paidAmount: updates.paidAmount ?? apiInvoice.paidAmount,
        totalAmount: updates.totalAmount ?? apiInvoice.totalAmount,
        subTotal: updates.totalAmount ?? apiInvoice.subTotal,
        notes: updates.notes ?? apiInvoice.notes,
        items: apiItems,
      };
      
      await invoicesApi.update(id, updatedApiInvoice);
      
      // إعادة جلب الفاتورة المحدثة من الـ API لضمان صحة البيانات
      const refreshedInvoice = await invoicesApi.getById(id);
      const mappedInvoice = mapApiToFrontendInvoice(refreshedInvoice);
      setInvoices(prev => prev.map(i => i.id === id ? mappedInvoice : i));
    } catch (err: any) {
      throw new Error(err.message || 'فشل في تحديث الفاتورة');
    }
  };

  const unconfirmInvoice = async (id: number) => {
    try {
      await invoicesApi.unconfirm(id);
      // إعادة جلب الفاتورة المحدثة من الـ API
      const refreshedInvoice = await invoicesApi.getById(id);
      const mappedInvoice = mapApiToFrontendInvoice(refreshedInvoice);
      setInvoices(prev => prev.map(i => i.id === id ? mappedInvoice : i));
    } catch (err: any) {
      throw new Error(err.message || 'فشل في إلغاء تأكيد الفاتورة');
    }
  };

  const deletePayment = async (invoiceId: number, paymentId: number) => {
    try {
      await invoicesApi.deletePayment(invoiceId, paymentId);
      // إعادة جلب الفاتورة المحدثة من الـ API
      const refreshedInvoice = await invoicesApi.getById(invoiceId);
      const mappedInvoice = mapApiToFrontendInvoice(refreshedInvoice);
      setInvoices(prev => prev.map(i => i.id === invoiceId ? mappedInvoice : i));
    } catch (err: any) {
      throw new Error(err.message || 'فشل في حذف الدفعة');
    }
  };

  return {
    invoices,
    loading,
    error,
    refresh: fetchInvoices,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    unconfirmInvoice,
    deletePayment,
  };
};

// ==================== Expenses Hook ====================
export const useExpenses = () => {
  const [expenses, setExpenses] = useState<ApiExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchExpenses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await expensesApi.getAll();
      setExpenses(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'فشل في جلب المصروفات');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // استماع لحدث التحديث التلقائي
  useEffect(() => {
    const handleAutoRefresh = () => {
      fetchExpenses();
    };
    window.addEventListener('autoRefreshData', handleAutoRefresh);
    return () => window.removeEventListener('autoRefreshData', handleAutoRefresh);
  }, [fetchExpenses]);

  const addExpense = async (expense: Omit<ApiExpense, 'id' | 'expenseNumber' | 'createdAt'>) => {
    try {
      const newExpense = await expensesApi.create(expense);
      setExpenses(prev => [newExpense, ...prev]);
      return newExpense;
    } catch (err: any) {
      throw new Error(err.message || 'فشل في إضافة المصروف');
    }
  };

  const deleteExpense = async (id: number) => {
    try {
      await expensesApi.delete(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'فشل في حذف المصروف');
    }
  };

  return {
    expenses,
    loading,
    error,
    refresh: fetchExpenses,
    addExpense,
    deleteExpense,
  };
};

// ==================== Revenues Hook ====================
export interface FrontendRevenue {
  id: number;
  revenueNumber?: string;
  categoryId?: number;
  customerId?: number;
  revenueDate: string;
  description: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  reference?: string;
  status?: string;
  notes?: string;
}

const mapApiToFrontendRevenue = (apiRevenue: ApiRevenue): FrontendRevenue => ({
  id: apiRevenue.id!,
  revenueNumber: apiRevenue.revenueNumber,
  categoryId: apiRevenue.categoryId,
  customerId: apiRevenue.customerId,
  revenueDate: apiRevenue.revenueDate,
  description: apiRevenue.description,
  amount: apiRevenue.amount,
  taxAmount: apiRevenue.taxAmount,
  // استخدام amount + taxAmount كـ totalAmount لأن netAmount قد يكون 0
  totalAmount: apiRevenue.totalAmount || (apiRevenue.amount + (apiRevenue.taxAmount || 0)),
  paymentMethod: apiRevenue.paymentMethod,
  reference: apiRevenue.reference,
  status: apiRevenue.status,
  notes: apiRevenue.notes,
});

export const useRevenues = () => {
  const [revenues, setRevenues] = useState<FrontendRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchRevenues = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await revenuesApi.getAll();
      setRevenues(data.map(mapApiToFrontendRevenue));
      setError(null);
    } catch (err: any) {
      // إذا فشل الـ API نعيد مصفوفة فارغة
      console.warn('فشل في جلب الإيرادات:', err.message);
      setRevenues([]);
      setError(null); // لا نعرض الخطأ للمستخدم
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRevenues();
  }, [fetchRevenues]);

  // استماع لحدث التحديث التلقائي
  useEffect(() => {
    const handleAutoRefresh = () => {
      fetchRevenues();
    };
    window.addEventListener('autoRefreshData', handleAutoRefresh);
    return () => window.removeEventListener('autoRefreshData', handleAutoRefresh);
  }, [fetchRevenues]);

  const addRevenue = async (revenue: Omit<FrontendRevenue, 'id' | 'revenueNumber'>) => {
    try {
      const apiRevenue: Omit<ApiRevenue, 'id' | 'revenueNumber' | 'createdAt'> = {
        categoryId: revenue.categoryId,
        customerId: revenue.customerId,
        revenueDate: revenue.revenueDate,
        description: revenue.description,
        amount: revenue.amount,
        taxAmount: revenue.taxAmount || 0,
        totalAmount: revenue.totalAmount || revenue.amount,
        paymentMethod: revenue.paymentMethod as 'Cash' | 'BankTransfer' | 'Cheque',
        reference: revenue.reference,
        notes: revenue.notes,
      };
      const newRevenue = await revenuesApi.create(apiRevenue);
      const frontendRevenue = mapApiToFrontendRevenue(newRevenue);
      setRevenues(prev => [frontendRevenue, ...prev]);
      return frontendRevenue;
    } catch (err: any) {
      throw new Error(err.message || 'فشل في إضافة الإيراد');
    }
  };

  const deleteRevenue = async (id: number) => {
    try {
      await revenuesApi.delete(id);
      setRevenues(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'فشل في حذف الإيراد');
    }
  };

  return {
    revenues,
    loading,
    error,
    refresh: fetchRevenues,
    addRevenue,
    deleteRevenue,
  };
};

// ==================== Auto Refresh Hook ====================
/**
 * Hook للتحديث التلقائي للبيانات
 * يقوم بتحديث البيانات كل فترة زمنية محددة
 */
export const useAutoRefresh = (
  refreshCallbacks: (() => Promise<void>)[],
  intervalSeconds: number,
  enabled: boolean = true
) => {
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(intervalSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const doRefresh = useCallback(async () => {
    if (isRefreshing || !enabled || intervalSeconds <= 0) return;
    
    setIsRefreshing(true);
    try {
      await Promise.all(refreshCallbacks.map(cb => cb()));
      setLastRefresh(new Date());
      setCountdown(intervalSeconds);
    } catch (err) {
      console.error('Auto refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshCallbacks, intervalSeconds, enabled, isRefreshing]);

  // Manual refresh
  const manualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all(refreshCallbacks.map(cb => cb()));
      setLastRefresh(new Date());
      setCountdown(intervalSeconds);
    } catch (err) {
      console.error('Manual refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshCallbacks, intervalSeconds]);

  useEffect(() => {
    // Clear existing intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    if (!enabled || intervalSeconds <= 0) {
      setCountdown(0);
      return;
    }

    // Set countdown initial value
    setCountdown(intervalSeconds);

    // Main refresh interval
    intervalRef.current = setInterval(() => {
      doRefresh();
    }, intervalSeconds * 1000);

    // Countdown interval (every second)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : intervalSeconds));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [intervalSeconds, enabled, doRefresh]);

  return {
    lastRefresh,
    isRefreshing,
    countdown,
    manualRefresh,
    enabled: enabled && intervalSeconds > 0,
  };
};

export default {
  useProducts,
  useCustomers,
  useUnits,
  useInvoices,
  useExpenses,
  useRevenues,
  useAutoRefresh,
};
