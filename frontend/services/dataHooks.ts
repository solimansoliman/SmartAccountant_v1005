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
  ApiRevenue,
  PhoneInfo,
  EmailInfo
} from './apiService';
import { useAuth } from '../context/AuthContext';
import syncService, { SyncQueueItem } from './syncService';

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
  code?: string;
  name: string;
  countryId?: number;
  countryName?: string;
  provinceId?: number;
  provinceName?: string;
  cityId?: number;
  cityName?: string;
  phone?: string;
  email?: string;
  primaryEmailId?: number;
  primaryEmailAddress?: string;
  address?: string;
  type?: 'Individual' | 'Company' | 'Government';
  notes?: string;
  balance?: number;
  isVIP?: boolean;
  joinDate?: string;
  isActive?: boolean;
  invoiceCount?: number;
  totalPurchases?: number;
  totalPayments?: number;
  phones?: PhoneInfo[];
  emails?: EmailInfo[];
  createdAt?: string;
  updatedAt?: string;
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
  updatedAt?: string;
}

const createOfflineTempId = () => -(Date.now() + Math.floor(Math.random() * 1000));

const createConflictError = (message: string) => {
  const error: any = new Error(message);
  error.code = 'CONFLICT';
  return error;
};

const isCurrentlyOnline = () => syncService.isOnline() && navigator.onLine;

interface RefreshFetchOptions {
  silent?: boolean;
}

const isSilentAutoRefreshEvent = (event?: Event): boolean => {
  const customEvent = event as CustomEvent<{ silent?: boolean }> | undefined;
  return Boolean(customEvent?.detail?.silent);
};

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
  code: apiCustomer.code,
  name: apiCustomer.name,
  countryId: apiCustomer.countryId,
  countryName: apiCustomer.countryName,
  provinceId: apiCustomer.provinceId,
  provinceName: apiCustomer.provinceName,
  cityId: apiCustomer.cityId,
  cityName: apiCustomer.cityName,
  phone: apiCustomer.phone,
  email: apiCustomer.email,
  primaryEmailId: apiCustomer.primaryEmailId,
  primaryEmailAddress: apiCustomer.primaryEmailAddress,
  address: apiCustomer.address,
  type: apiCustomer.type,
  notes: apiCustomer.notes,
  balance: apiCustomer.balance,
  isVIP: apiCustomer.isVIP,
  joinDate: apiCustomer.joinDate,
  isActive: apiCustomer.isActive,
  invoiceCount: apiCustomer.invoiceCount,
  totalPurchases: apiCustomer.totalPurchases,
  totalPayments: apiCustomer.totalPayments,
  phones: apiCustomer.phones,
  emails: apiCustomer.emails,
  createdAt: apiCustomer.createdAt,
  updatedAt: apiCustomer.updatedAt,
});

const mapFrontendToApiCustomer = (frontendCustomer: Omit<FrontendCustomer, 'id'>): Omit<ApiCustomer, 'id' | 'createdAt'> => ({
  code: `CUST${Date.now()}`,
  name: frontendCustomer.name,
  type: frontendCustomer.type || 'Individual',
  phone: frontendCustomer.phone,
  email: frontendCustomer.email,
  primaryEmailAddress: frontendCustomer.primaryEmailAddress,
  countryId: frontendCustomer.countryId,
  provinceId: frontendCustomer.provinceId,
  cityId: frontendCustomer.cityId,
  address: frontendCustomer.address,
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
    updatedAt: apiInvoice.updatedAt,
    // PaymentMethod: 0=Cash, 1=Credit OR 'Cash'/'Credit' string
    type: (apiInvoice.paymentMethod === 0 || apiInvoice.paymentMethod === 'Cash') ? 'كاش' : 'آجل/دفعات',
  };
};

const mapFrontendToApiInvoicePayload = (
  invoice: Pick<FrontendInvoice, 'date' | 'customerId' | 'totalAmount' | 'paidAmount' | 'notes' | 'items' | 'paymentMethod' | 'type'>
): Omit<ApiInvoice, 'id' | 'invoiceNumber' | 'createdAt'> => {
  const isCredit = invoice.type === 'آجل/دفعات' || invoice.paymentMethod === 'Credit';

  return {
    invoiceType: 'Sales',
    invoiceDate: invoice.date,
    customerId: invoice.customerId,
    paymentMethod: isCredit ? 'Credit' : 'Cash',
    subTotal: invoice.totalAmount,
    discountPercent: 0,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: invoice.totalAmount,
    paidAmount: invoice.paidAmount,
    notes: invoice.notes,
    items: (invoice.items || []).map(item => ({
      productId: item.productId ? parseInt(String(item.productId)) : 0,
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

// ==================== Products Hook ====================
export const useProducts = () => {
  const [products, setProducts] = useState<FrontendProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchProducts = useCallback(async (options: RefreshFetchOptions = {}) => {
    if (!user) {
      setProducts([]);
      return;
    }
    if (!options.silent) {
      setLoading(true);
    }
    try {
      const data = await productsApi.getAll();
      setProducts(data.map(mapApiToFrontendProduct));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'فشل في جلب المنتجات');
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }, [user?.id, user?.accountId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // استماع لحدث التحديث التلقائي
  useEffect(() => {
    const handleAutoRefresh = (event: Event) => {
      fetchProducts({ silent: isSilentAutoRefreshEvent(event) });
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

  const fetchCustomers = useCallback(async (options: RefreshFetchOptions = {}) => {
    if (!user) {
      setCustomers([]);
      return;
    }
    if (!options.silent) {
      setLoading(true);
    }
    try {
      const data = await customersApi.getAll();
      setCustomers(data.map(mapApiToFrontendCustomer));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'فشل في جلب العملاء');
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }, [user?.id, user?.accountId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // استماع لحدث التحديث التلقائي
  useEffect(() => {
    const handleAutoRefresh = (event: Event) => {
      fetchCustomers({ silent: isSilentAutoRefreshEvent(event) });
    };
    window.addEventListener('autoRefreshData', handleAutoRefresh);
    return () => window.removeEventListener('autoRefreshData', handleAutoRefresh);
  }, [fetchCustomers]);

  useEffect(() => {
    const processor = async (item: SyncQueueItem) => {
      if (item.type === 'create') {
        const created = await customersApi.create(item.data.payload);
        return {
          ...mapApiToFrontendCustomer(created),
          __localId: item.data.localId,
        };
      }

      if (item.type === 'update') {
        const expectedUpdatedAt = item.data.expectedUpdatedAt as string | undefined;
        if (expectedUpdatedAt) {
          const current = await customersApi.getById(item.data.id);
          if (current.updatedAt && current.updatedAt !== expectedUpdatedAt) {
            throw createConflictError('تم تعديل العميل على الخادم قبل مزامنة تعديلك. راجع أحدث نسخة ثم أعد المحاولة.');
          }
        }

        const updated = await customersApi.update(item.data.id, item.data.payload);
        return mapApiToFrontendCustomer(updated);
      }

      if (item.type === 'delete') {
        await customersApi.delete(item.data.id);
        return { id: item.data.id };
      }

      throw new Error(`Unsupported customer sync operation: ${item.type}`);
    };

    syncService.registerProcessor('customers', processor);

    const unsubscribe = syncService.onDataChange((entity, action, data: any) => {
      if (entity !== 'customers') return;

      if (action === 'create') {
        const localId = data?.__localId;
        const serverCustomer: FrontendCustomer = data;

        setCustomers(prev => {
          if (typeof localId === 'number') {
            const replaced = prev.map(c => (c.id === localId ? serverCustomer : c));
            const hasReplaced = replaced.some(c => c.id === serverCustomer.id);
            return hasReplaced ? replaced : [serverCustomer, ...replaced];
          }

          const alreadyExists = prev.some(c => c.id === serverCustomer.id);
          return alreadyExists ? prev : [serverCustomer, ...prev];
        });
        return;
      }

      if (action === 'update') {
        const updatedCustomer: FrontendCustomer = data;
        setCustomers(prev => prev.map(c => (c.id === updatedCustomer.id ? updatedCustomer : c)));
        return;
      }

      if (action === 'delete') {
        const deletedId = Number(data?.id);
        if (Number.isFinite(deletedId)) {
          setCustomers(prev => prev.filter(c => c.id !== deletedId));
        }
      }
    });

    return () => {
      unsubscribe();
      syncService.unregisterProcessor('customers');
    };
  }, []);

  const addCustomer = async (customer: any) => {
    // تأكد من أن البيانات الأساسية موجودة
    const apiCustomer = {
      ...customer,
      code: customer.code || `CUST${Date.now()}`,
      type: customer.type || 'Individual',
      creditLimit: customer.creditLimit || 0,
      balance: customer.balance || 0,
      isActive: true
    };

    if (!isCurrentlyOnline()) {
      const tempId = createOfflineTempId();
      const tempCustomer: FrontendCustomer = {
        id: tempId,
        code: apiCustomer.code,
        name: apiCustomer.name,
        type: apiCustomer.type,
        countryId: apiCustomer.countryId,
        provinceId: apiCustomer.provinceId,
        cityId: apiCustomer.cityId,
        address: apiCustomer.address,
        phone: apiCustomer.phone,
        primaryEmailAddress: apiCustomer.primaryEmailAddress,
        notes: apiCustomer.notes,
        balance: apiCustomer.balance,
        isVIP: apiCustomer.isVIP,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setCustomers(prev => [tempCustomer, ...prev]);
      syncService.queueChange('customers', 'create', {
        localId: tempId,
        payload: apiCustomer,
      });
      return tempCustomer;
    }

    try {
      const newCustomer = await customersApi.create(apiCustomer);
      const frontendCustomer = mapApiToFrontendCustomer(newCustomer);
      setCustomers(prev => [frontendCustomer, ...prev]);
      return frontendCustomer;
    } catch (err: any) {
      throw new Error(err.message || 'فشل في إضافة العميل');
    }
  };

  const updateCustomer = async (id: number, updates: Partial<FrontendCustomer>) => {
    const existing = customers.find(c => c.id === id);
    if (!existing) throw new Error('العميل غير موجود');

    const mergedCustomer: FrontendCustomer = {
      ...existing,
      ...updates,
      updatedAt: existing.updatedAt,
    };

    const updatedApiCustomer: any = {
      name: mergedCustomer.name,
      countryId: mergedCustomer.countryId,
      provinceId: mergedCustomer.provinceId,
      cityId: mergedCustomer.cityId,
      address: mergedCustomer.address,
      type: mergedCustomer.type,
      phone: mergedCustomer.phone,
      primaryEmailAddress: mergedCustomer.primaryEmailAddress,
      notes: mergedCustomer.notes,
      isVIP: mergedCustomer.isVIP,
    };

    if (!isCurrentlyOnline()) {
      setCustomers(prev => prev.map(c => (c.id === id ? mergedCustomer : c)));
      syncService.queueChange('customers', 'update', {
        id,
        payload: updatedApiCustomer,
        expectedUpdatedAt: existing.updatedAt,
      });
      return;
    }

    try {
      const updateResponse = await customersApi.update(id, updatedApiCustomer);
      const updatedFrontendCustomer = mapApiToFrontendCustomer(updateResponse);

      // Update state with complete data from server
      setCustomers(prev => prev.map(c => c.id === id ? updatedFrontendCustomer : c));
    } catch (err: any) {
      throw new Error(err.message || 'فشل في تحديث العميل');
    }
  };

  const deleteCustomer = async (id: number) => {
    if (!isCurrentlyOnline()) {
      setCustomers(prev => prev.filter(c => c.id !== id));
      syncService.queueChange('customers', 'delete', { id });
      return;
    }

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

  const fetchUnits = useCallback(async (options: RefreshFetchOptions = {}) => {
    if (!user) {
      // Default units if not logged in
      setUnits([]);
      setLoading(false);
      return;
    }
    if (!options.silent) {
      setLoading(true);
    }
    try {
      const data = await unitsApi.getAll();
      setUnits(data);
      setError(null);
    } catch (err: any) {
      // Fallback to default units
      setUnits([]);
      setError(null);
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }, [user?.id, user?.accountId]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // استماع لحدث التحديث التلقائي
  useEffect(() => {
    const handleAutoRefresh = (event: Event) => {
      fetchUnits({ silent: isSilentAutoRefreshEvent(event) });
    };
    window.addEventListener('autoRefreshData', handleAutoRefresh);
    return () => window.removeEventListener('autoRefreshData', handleAutoRefresh);
  }, [fetchUnits]);

  // Get unit names as string array (for compatibility)
  const defaultUnits = ['قطعة', 'كيلو', 'لتر', 'متر', 'علبة', 'كرتون'];
  const apiUnitNames = units
    .map(u => (u.name || '').trim())
    .filter(name => name.length > 0);
  const unitNames = Array.from(new Set([...defaultUnits, ...apiUnitNames]));

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

  const fetchInvoices = useCallback(async (options: RefreshFetchOptions = {}) => {
    if (!user) {
      setInvoices([]);
      return;
    }
    if (!options.silent) {
      setLoading(true);
    }
    try {
      const data = await invoicesApi.getAll();
      setInvoices(data.map(mapApiToFrontendInvoice));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'فشل في جلب الفواتير');
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }, [user?.id, user?.accountId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // استماع لحدث التحديث التلقائي
  useEffect(() => {
    const handleAutoRefresh = (event: Event) => {
      fetchInvoices({ silent: isSilentAutoRefreshEvent(event) });
    };
    window.addEventListener('autoRefreshData', handleAutoRefresh);
    return () => window.removeEventListener('autoRefreshData', handleAutoRefresh);
  }, [fetchInvoices]);

  useEffect(() => {
    const invoiceProcessor = async (item: SyncQueueItem) => {
      if (item.type === 'create') {
        const created = await invoicesApi.create(item.data.payload);
        const refreshed = await invoicesApi.getById(created.id!);
        return {
          ...mapApiToFrontendInvoice(refreshed),
          __localId: item.data.localId,
        };
      }

      if (item.type === 'update') {
        const expectedUpdatedAt = item.data.expectedUpdatedAt as string | undefined;
        if (expectedUpdatedAt) {
          const current = await invoicesApi.getById(item.data.id);
          if (current.updatedAt && current.updatedAt !== expectedUpdatedAt) {
            throw createConflictError('تم تعديل الفاتورة على الخادم قبل مزامنة تعديلك. راجع أحدث نسخة ثم أعد المحاولة.');
          }
        }

        await invoicesApi.update(item.data.id, item.data.payload);
        const refreshed = await invoicesApi.getById(item.data.id);
        return mapApiToFrontendInvoice(refreshed);
      }

      if (item.type === 'delete') {
        await invoicesApi.delete(item.data.id);
        return { id: item.data.id };
      }

      throw new Error(`Unsupported invoices sync operation: ${item.type}`);
    };

    const paymentProcessor = async (item: SyncQueueItem) => {
      if (item.type !== 'delete') {
        throw new Error(`Unsupported invoicePayments sync operation: ${item.type}`);
      }

      const expectedUpdatedAt = item.data.expectedUpdatedAt as string | undefined;
      if (expectedUpdatedAt) {
        const current = await invoicesApi.getById(item.data.invoiceId);
        if (current.updatedAt && current.updatedAt !== expectedUpdatedAt) {
          throw createConflictError('تم تعديل الفاتورة على الخادم قبل مزامنة حذف الدفعة. راجع أحدث نسخة ثم أعد المحاولة.');
        }
      }

      await invoicesApi.deletePayment(item.data.invoiceId, item.data.paymentId);
      const refreshed = await invoicesApi.getById(item.data.invoiceId);
      return mapApiToFrontendInvoice(refreshed);
    };

    syncService.registerProcessor('invoices', invoiceProcessor);
    syncService.registerProcessor('invoicePayments', paymentProcessor);

    const unsubscribe = syncService.onDataChange((entity, action, data: any) => {
      if (entity === 'invoices') {
        if (action === 'create') {
          const localId = data?.__localId;
          const serverInvoice: FrontendInvoice = data;

          setInvoices(prev => {
            if (typeof localId === 'number') {
              const replaced = prev.map(i => (i.id === localId ? serverInvoice : i));
              const hasServerInvoice = replaced.some(i => i.id === serverInvoice.id);
              return hasServerInvoice ? replaced : [serverInvoice, ...replaced];
            }

            const exists = prev.some(i => i.id === serverInvoice.id);
            return exists ? prev : [serverInvoice, ...prev];
          });
          return;
        }

        if (action === 'update') {
          const updatedInvoice: FrontendInvoice = data;
          setInvoices(prev => prev.map(i => (i.id === updatedInvoice.id ? updatedInvoice : i)));
          return;
        }

        if (action === 'delete') {
          const deletedId = Number(data?.id);
          if (Number.isFinite(deletedId)) {
            setInvoices(prev => prev.filter(i => i.id !== deletedId));
          }
        }
        return;
      }

      if (entity === 'invoicePayments') {
        const refreshedInvoice: FrontendInvoice = data;
        setInvoices(prev => prev.map(i => (i.id === refreshedInvoice.id ? refreshedInvoice : i)));
      }
    });

    return () => {
      unsubscribe();
      syncService.unregisterProcessor('invoices');
      syncService.unregisterProcessor('invoicePayments');
    };
  }, []);

  const addInvoice = async (invoice: Omit<FrontendInvoice, 'id' | 'invoiceNumber'>) => {
    const apiInvoice = mapFrontendToApiInvoicePayload(invoice as any);

    if (!isCurrentlyOnline()) {
      const tempId = createOfflineTempId();
      const tempInvoice: FrontendInvoice = {
        id: tempId,
        invoiceNumber: `OFF-${Math.abs(tempId)}`,
        date: invoice.date,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        remainingAmount: Math.max(0, invoice.totalAmount - invoice.paidAmount),
        paymentMethod: apiInvoice.paymentMethod,
        type: invoice.type,
        status: invoice.paidAmount >= invoice.totalAmount && invoice.totalAmount > 0 ? 4 : (invoice.paidAmount > 0 ? 5 : 0),
        items: invoice.items,
        notes: invoice.notes,
        updatedAt: new Date().toISOString(),
      };

      setInvoices(prev => [tempInvoice, ...prev]);
      syncService.queueChange('invoices', 'create', {
        localId: tempId,
        payload: apiInvoice,
      });
      return tempInvoice;
    }

    try {
      const newInvoice = await invoicesApi.create(apiInvoice);

      // حاول إعادة الجلب لتحميل العلاقات، مع fallback إذا كانت بيئة الـ API غير متوافقة بالكامل.
      let invoiceSource = newInvoice;
      try {
        if (newInvoice.id) {
          invoiceSource = await invoicesApi.getById(newInvoice.id);
        }
      } catch (refreshError) {
        console.warn('Invoice created but refresh by id failed, using create response as fallback.', refreshError);
      }

      const frontendInvoice = mapApiToFrontendInvoice(invoiceSource as ApiInvoice);
      if (!frontendInvoice.customerName && invoice.customerName) {
        frontendInvoice.customerName = invoice.customerName;
      }

      setInvoices(prev => [frontendInvoice, ...prev]);
      return frontendInvoice;
    } catch (err: any) {
      throw new Error(err.message || 'فشل في إنشاء الفاتورة');
    }
  };

  const deleteInvoice = async (id: number) => {
    if (!isCurrentlyOnline()) {
      setInvoices(prev => prev.filter(i => i.id !== id));
      syncService.queueChange('invoices', 'delete', { id });
      return;
    }

    try {
      await invoicesApi.delete(id);
      setInvoices(prev => prev.filter(i => i.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'فشل في حذف الفاتورة');
    }
  };

  const updateInvoice = async (id: number, updates: Partial<FrontendInvoice>) => {
    const existing = invoices.find(i => i.id === id);
    if (!existing) throw new Error('الفاتورة غير موجودة');

    const mergedInvoice: FrontendInvoice = {
      ...existing,
      ...updates,
      items: updates.items ?? existing.items,
      updatedAt: existing.updatedAt,
    };

    const apiPayload = mapFrontendToApiInvoicePayload({
      date: mergedInvoice.date,
      customerId: mergedInvoice.customerId,
      totalAmount: mergedInvoice.totalAmount,
      paidAmount: mergedInvoice.paidAmount,
      notes: mergedInvoice.notes,
      items: mergedInvoice.items,
      paymentMethod: mergedInvoice.paymentMethod,
      type: mergedInvoice.type,
    });

    if (!isCurrentlyOnline()) {
      setInvoices(prev => prev.map(i => (i.id === id ? mergedInvoice : i)));
      syncService.queueChange('invoices', 'update', {
        id,
        payload: apiPayload,
        expectedUpdatedAt: existing.updatedAt,
      });
      return;
    }

    try {
      await invoicesApi.update(id, apiPayload as any);

      // إعادة الجلب إن أمكن، وإلا اعتمد نسخة merged محلياً حتى لا يفشل الحفظ على المستخدم.
      try {
        const refreshedInvoice = await invoicesApi.getById(id);
        const mappedInvoice = mapApiToFrontendInvoice(refreshedInvoice);
        setInvoices(prev => prev.map(i => i.id === id ? mappedInvoice : i));
      } catch (refreshError) {
        console.warn('Invoice updated but refresh by id failed, applying local merged fallback.', refreshError);
        setInvoices(prev => prev.map(i => (i.id === id ? mergedInvoice : i)));
      }
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
    if (!isCurrentlyOnline()) {
      setInvoices(prev => prev.map(inv => {
        if (inv.id !== invoiceId) return inv;
        const payments = inv.payments || [];
        const nextPayments = payments.filter(p => p.id !== paymentId);
        const nextPaidAmount = nextPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const nextRemainingAmount = Math.max(0, inv.totalAmount - nextPaidAmount);

        return {
          ...inv,
          payments: nextPayments,
          paidAmount: nextPaidAmount,
          remainingAmount: nextRemainingAmount,
          status: nextPaidAmount >= inv.totalAmount && inv.totalAmount > 0 ? 4 : (nextPaidAmount > 0 ? 5 : 2),
        };
      }));

      const current = invoices.find(i => i.id === invoiceId);
      syncService.queueChange('invoicePayments', 'delete', {
        invoiceId,
        paymentId,
        expectedUpdatedAt: current?.updatedAt,
      });
      return;
    }

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

  const fetchExpenses = useCallback(async (options: RefreshFetchOptions = {}) => {
    if (!user) {
      setExpenses([]);
      return;
    }
    if (!options.silent) {
      setLoading(true);
    }
    try {
      const data = await expensesApi.getAll();
      setExpenses(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'فشل في جلب المصروفات');
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }, [user?.id, user?.accountId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // استماع لحدث التحديث التلقائي
  useEffect(() => {
    const handleAutoRefresh = (event: Event) => {
      fetchExpenses({ silent: isSilentAutoRefreshEvent(event) });
    };
    window.addEventListener('autoRefreshData', handleAutoRefresh);
    return () => window.removeEventListener('autoRefreshData', handleAutoRefresh);
  }, [fetchExpenses]);

  useEffect(() => {
    const processor = async (item: SyncQueueItem) => {
      if (item.type === 'create') {
        const created = await expensesApi.create(item.data.payload);
        return {
          ...created,
          __localId: item.data.localId,
        };
      }

      if (item.type === 'delete') {
        await expensesApi.delete(item.data.id);
        return { id: item.data.id };
      }

      throw new Error(`Unsupported expenses sync operation: ${item.type}`);
    };

    syncService.registerProcessor('expenses', processor);

    const unsubscribe = syncService.onDataChange((entity, action, data: any) => {
      if (entity !== 'expenses') return;

      if (action === 'create') {
        const localId = data?.__localId;
        const serverExpense: ApiExpense = data;

        setExpenses(prev => {
          if (typeof localId === 'number') {
            const replaced = prev.map(e => (e.id === localId ? serverExpense : e));
            const hasServerExpense = replaced.some(e => e.id === serverExpense.id);
            return hasServerExpense ? replaced : [serverExpense, ...replaced];
          }

          const exists = prev.some(e => e.id === serverExpense.id);
          return exists ? prev : [serverExpense, ...prev];
        });
        return;
      }

      if (action === 'delete') {
        const deletedId = Number(data?.id);
        if (Number.isFinite(deletedId)) {
          setExpenses(prev => prev.filter(e => e.id !== deletedId));
        }
      }
    });

    return () => {
      unsubscribe();
      syncService.unregisterProcessor('expenses');
    };
  }, []);

  const addExpense = async (expense: Omit<ApiExpense, 'id' | 'expenseNumber' | 'createdAt'>) => {
    if (!isCurrentlyOnline()) {
      const tempId = createOfflineTempId();
      const tempExpense: ApiExpense = {
        id: tempId,
        expenseDate: expense.expenseDate,
        categoryId: expense.categoryId,
        transactionTypeId: expense.transactionTypeId,
        transactionTypeCode: expense.transactionTypeCode,
        amount: expense.amount,
        taxAmount: expense.taxAmount,
        totalAmount: expense.totalAmount,
        paymentMethod: expense.paymentMethod,
        description: expense.description,
        notes: expense.notes,
        status: expense.status || 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setExpenses(prev => [tempExpense, ...prev]);
      syncService.queueChange('expenses', 'create', {
        localId: tempId,
        payload: expense,
      });
      return tempExpense;
    }

    try {
      const newExpense = await expensesApi.create(expense);
      setExpenses(prev => [newExpense, ...prev]);
      return newExpense;
    } catch (err: any) {
      throw new Error(err.message || 'فشل في إضافة المصروف');
    }
  };

  const deleteExpense = async (id: number) => {
    if (!isCurrentlyOnline()) {
      setExpenses(prev => prev.filter(e => e.id !== id));
      syncService.queueChange('expenses', 'delete', { id });
      return;
    }

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

  const fetchRevenues = useCallback(async (options: RefreshFetchOptions = {}) => {
    if (!user) {
      setRevenues([]);
      setError(null);
      setLoading(false);
      return;
    }
    if (!options.silent) {
      setLoading(true);
    }
    try {
      const data = await revenuesApi.getAll();
      const normalized = Array.isArray(data) ? data : [];
      setRevenues(normalized.map(mapApiToFrontendRevenue));
      setError(null);
    } catch (err: any) {
      console.warn('فشل في جلب الإيرادات:', err.message);
      setRevenues([]);
      setError(err?.message || 'فشل في جلب الإيرادات');
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }, [user?.id, user?.accountId]);

  useEffect(() => {
    fetchRevenues();
  }, [fetchRevenues]);

  // استماع لحدث التحديث التلقائي
  useEffect(() => {
    const handleAutoRefresh = (event: Event) => {
      fetchRevenues({ silent: isSilentAutoRefreshEvent(event) });
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
