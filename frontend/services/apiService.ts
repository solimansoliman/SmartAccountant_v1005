/// <reference types="vite/client" />

/**
 * خدمة API للربط مع الباك إند
 * Smart Accountant API Service
 */

import { getApiUrl } from './configService';
import syncService, { SyncQueueItem } from './syncService';

// استخدام الرابط من الإعدادات المحفوظة أو القيمة الافتراضية
export const getBaseUrl = () => getApiUrl();

// ==================== Auth Types ====================
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  fullName: string;
  companyName: string;
  email: string;
  phone?: string;
  currencyId?: number;
  currencySymbol?: string;
}

export interface PermissionsDto {
  canManageProducts: boolean;
  canManageCustomers: boolean;
  canCreateInvoices: boolean;
  canManageExpenses: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  canManageUsers?: boolean;
  canManageLogo?: boolean;  // صلاحية إدارة شعار الشركة
}

export interface RoleDto {
  id: number;
  name: string;
  nameEn?: string;
  color?: string;
  icon?: string;
}

export interface AuthUserDto {
  id: number;
  username: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  role: string;
  isSuperAdmin: boolean;
  accountId: number;
  accountName: string;
  accountLogo?: string;  // شعار الشركة
  currency: string;
  currencyId: number;
  roles: RoleDto[];
  permissionCodes: string[];
  permissions: PermissionsDto;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: AuthUserDto;
  token: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  accountId: number;
  userId: number;
}

// Types matching backend models
export interface ApiProduct {
  id?: number;
  code: string;
  barcode?: string;
  name: string;
  nameEn?: string;
  description?: string;
  imageUrl?: string;
  unitId?: number;
  unit?: string;
  categoryId?: number;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockLevel: number;
  taxPercent: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PhoneInfo {
  id: number;
  phoneNumber: string;
  phoneType: string;
  isPrimary: boolean;
  isSecondary: boolean;
  isActive: boolean;
}

export interface EmailInfo {
  id: number;
  emailAddress: string;
  emailType: string;
  isPrimary: boolean;
  isActive: boolean;
}

export interface ApiCustomer {
  id?: number;
  code: string;
  name: string;
  nameEn?: string;
  type: 'Individual' | 'Company' | 'Government';
  phone?: string;
  email?: string;
  primaryEmailId?: number;
  primaryEmailAddress?: string;
  countryId?: number;
  countryName?: string;
  provinceId?: number;
  provinceName?: string;
  cityId?: number;
  cityName?: string;
  address?: string;
  city?: string;
  taxNumber?: string;
  creditLimit: number;
  balance: number;
  notes?: string;
  isActive: boolean;
  isVIP?: boolean;
  joinDate?: string;
  invoiceCount?: number;
  totalPurchases?: number;
  totalPayments?: number;
  phones?: PhoneInfo[];
  emails?: EmailInfo[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiInvoiceItem {
  id?: number;
  invoiceId?: number;
  productId: number;
  productName?: string;
  unitId?: number;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
}

export interface ApiInvoice {
  id?: number;
  invoiceNumber?: string;
  invoiceType: 'Sales' | 'SalesReturn' | 'Quotation';
  status?: 'Draft' | 'Confirmed' | 'PartialPaid' | 'Paid' | 'Cancelled';
  invoiceDate: string;
  customerId?: number;
  customer?: ApiCustomer;
  userId?: number;
  paymentMethod: 'Cash' | 'Credit' | 'Card' | 'BankTransfer' | 'Cheque';
  subTotal: number;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  items: ApiInvoiceItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiExpense {
  id?: number;
  expenseNumber?: string;
  categoryId?: number;
  transactionTypeId?: number;
  transactionTypeCode?: string;
  transactionTypeName?: string;
  transactionTypeColor?: string;
  expenseDate: string;
  description: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: 'Cash' | 'BankTransfer' | 'Cheque';
  reference?: string;
  status?: 'Pending' | 'Approved' | 'Paid' | 'Cancelled';
  notes?: string;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiTransactionType {
  id: number;
  accountId: number;
  name: string;
  nameEn?: string;
  code: string;
  description?: string;
  color?: string;
  icon?: string;
  isSystem: boolean;
  displayOrder: number;
  isActive: boolean;
  expenseCount?: number;
}

export interface ApiRevenue {
  id?: number;
  revenueNumber?: string;
  categoryId?: number;
  customerId?: number;
  revenueDate: string;
  description: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: 'Cash' | 'BankTransfer' | 'Cheque';
  reference?: string;
  status?: 'Pending' | 'Confirmed' | 'Cancelled';
  notes?: string;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

const mapApiRevenue = (raw: any): ApiRevenue => {
  const amount = Number(raw?.amount ?? raw?.Amount ?? 0) || 0;
  const taxAmount = Number(raw?.taxAmount ?? raw?.TaxAmount ?? 0) || 0;
  const totalAmount = Number(
    raw?.totalAmount
    ?? raw?.netAmount
    ?? raw?.TotalAmount
    ?? raw?.NetAmount
    ?? (amount + taxAmount)
  ) || (amount + taxAmount);

  return {
    id: raw?.id ?? raw?.Id,
    revenueNumber: raw?.revenueNumber ?? raw?.RevenueNumber,
    categoryId: raw?.categoryId ?? raw?.CategoryId,
    customerId: raw?.customerId ?? raw?.CustomerId ?? raw?.payerId ?? raw?.PayerId,
    revenueDate: raw?.revenueDate ?? raw?.RevenueDate ?? '',
    description: raw?.description ?? raw?.Description ?? '',
    amount,
    taxAmount,
    totalAmount,
    paymentMethod: (raw?.paymentMethod ?? raw?.PaymentMethod ?? 'Cash') as ApiRevenue['paymentMethod'],
    reference: raw?.reference ?? raw?.Reference ?? raw?.referenceNumber ?? raw?.ReferenceNumber,
    status: raw?.status ?? raw?.Status,
    notes: raw?.notes ?? raw?.Notes,
    userId: raw?.userId ?? raw?.UserId ?? raw?.createdByUserId ?? raw?.CreatedByUserId,
    createdAt: raw?.createdAt ?? raw?.CreatedAt,
    updatedAt: raw?.updatedAt ?? raw?.UpdatedAt,
  };
};

const mapApiRevenueList = (raw: any): ApiRevenue[] => {
  if (Array.isArray(raw)) {
    return raw.map(mapApiRevenue);
  }

  const wrappedList = raw?.items ?? raw?.data ?? raw?.value ?? raw?.Value;
  if (Array.isArray(wrappedList)) {
    return wrappedList.map(mapApiRevenue);
  }

  return [];
};

export interface ApiUnit {
  id?: number;
  name: string;
  nameEn?: string;
  symbol: string;
  isBase: boolean;
  baseUnitId?: number;
  conversionFactor: number;
  isActive: boolean;
}

export interface ApiPayment {
  id?: number;
  invoiceId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: 'Cash' | 'Card' | 'BankTransfer' | 'Cheque';
  reference?: string;
  chequeNumber?: string;
  notes?: string;
  userId?: number;
  createdAt?: string;
}

export interface ApiSalesSummary {
  fromDate: string;
  toDate: string;
  totalInvoices: number;
  totalSales: number;
  totalTax: number;
  totalDiscount: number;
  totalPaid: number;
  totalUnpaid: number;
  dailySales: { date: string; count: number; total: number }[];
}

// Generic API Response handler
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    console.log('🔴 API Error Response:', response.status, errorText); // Debug log
    let errorMessage = errorText || `HTTP error ${response.status}`;
    
    // محاولة تحليل الخطأ كـ JSON لاستخراج الرسالة
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.message) {
        errorMessage = errorJson.message;
      } else if (errorJson.error) {
        errorMessage = errorJson.error;
      } else if (errorJson.title) {
        // ASP.NET Core validation errors
        errorMessage = errorJson.title;
        if (errorJson.errors) {
          const errorDetails = Object.values(errorJson.errors).flat().join(', ');
          if (errorDetails) errorMessage += ': ' + errorDetails;
        }
      } else if (typeof errorJson === 'string') {
        errorMessage = errorJson;
      }
    } catch {
      // إذا لم يكن JSON، استخدم النص كما هو (رسالة عربية مباشرة)
      if (errorText && errorText.trim()) {
        errorMessage = errorText.trim();
      }
    }
    
    // إضافة رسائل مفهومة للأخطاء الشائعة
    if (response.status === 400 && !errorMessage.includes('لا يمكن')) {
      errorMessage = errorMessage || 'طلب غير صالح - تحقق من البيانات المدخلة';
    } else if (response.status === 404) {
      errorMessage = errorMessage || 'العنصر غير موجود';
    } else if (response.status === 500) {
      errorMessage = 'خطأ في الخادم - حاول مرة أخرى لاحقاً';
    }
    
    throw new ApiError(response.status, errorMessage);
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return {} as T;
}

// ✅ تحقق من انتهاء صلاحية Token
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // تحويل من ثواني لميلي ثانية
    return Date.now() >= exp;
  } catch {
    return true; // إذا كان Token غير صالح، اعتبره منتهي
  }
}

// ✅ تسجيل الخروج التلقائي عند انتهاء Token
function handleTokenExpiry(): void {
  console.log('🔴 Token expired - logging out');
  sessionStorage.removeItem('smart_accountant_session');
  sessionStorage.removeItem('smart_accountant_user');
  localStorage.removeItem('smart_accountant_session');
  localStorage.removeItem('smart_accountant_user');
  
  // إعادة التوجيه لصفحة تسجيل الدخول
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    window.location.href = '/login?expired=true';
  }
}

function extractIdentityFromToken(token: string): { accountId?: string; userId?: string } {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const accountId = payload?.AccountId ?? payload?.accountId;
    const userId = payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
      ?? payload?.nameid
      ?? payload?.sub
      ?? payload?.UserId
      ?? payload?.userId;

    return {
      accountId: accountId != null ? String(accountId) : undefined,
      userId: userId != null ? String(userId) : undefined,
    };
  } catch {
    return {};
  }
}

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // ✅ استخدام sessionStorage أولاً (أكثر أماناً) ثم localStorage
  const token = sessionStorage.getItem('smart_accountant_session') 
             || localStorage.getItem('smart_accountant_session');
  const userStr = sessionStorage.getItem('smart_accountant_user')
               || localStorage.getItem('smart_accountant_user');
  let tokenIdentity: { accountId?: string; userId?: string } = {};
  
  if (token) {
    // ✅ التحقق من صلاحية Token قبل إرساله
    if (isTokenExpired(token)) {
      handleTokenExpiry();
      return headers;
    }
    headers['Authorization'] = `Bearer ${token}`;
    tokenIdentity = extractIdentityFromToken(token);
  }
  
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      const accountId = user?.accountId ?? user?.AccountId ?? user?.account?.id;
      const userId = user?.id ?? user?.userId ?? user?.UserId ?? user?.uid;

      if (accountId != null && accountId !== '') {
        headers['X-Account-Id'] = accountId.toString();
      }

      if (userId != null && userId !== '') {
        headers['X-User-Id'] = userId.toString();
      }
    } catch {
      // Ignore parse errors
    }
  }

  if (!headers['X-Account-Id'] && tokenIdentity.accountId) {
    headers['X-Account-Id'] = tokenIdentity.accountId;
  }

  if (!headers['X-User-Id'] && tokenIdentity.userId) {
    headers['X-User-Id'] = tokenIdentity.userId;
  }
  
  return headers;
}

// ==================== Products API ====================
export const productsApi = {
  getAll: async (params?: { categoryId?: number; search?: string }): Promise<ApiProduct[]> => {
    const queryParams = new URLSearchParams();
    if (params?.categoryId) queryParams.append('categoryId', params.categoryId.toString());
    if (params?.search) queryParams.append('search', params.search);
    
    const url = `${getBaseUrl()}/products${queryParams.toString() ? '?' + queryParams : ''}`;
    const response = await fetch(url, { headers: getHeaders() });
    return handleResponse<ApiProduct[]>(response);
  },

  getById: async (id: number): Promise<ApiProduct> => {
    const response = await fetch(`${getBaseUrl()}/products/${id}`, { headers: getHeaders() });
    return handleResponse<ApiProduct>(response);
  },

  getByBarcode: async (barcode: string): Promise<ApiProduct> => {
    const response = await fetch(`${getBaseUrl()}/products/barcode/${barcode}`, { headers: getHeaders() });
    return handleResponse<ApiProduct>(response);
  },

  create: async (product: Omit<ApiProduct, 'id' | 'createdAt'>): Promise<ApiProduct> => {
    const response = await fetch(`${getBaseUrl()}/products`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(product),
    });
    return handleResponse<ApiProduct>(response);
  },

  update: async (id: number, product: ApiProduct): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(product),
    });
    return handleResponse<void>(response);
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  getLowStock: async (): Promise<ApiProduct[]> => {
    const response = await fetch(`${getBaseUrl()}/products/low-stock`, { headers: getHeaders() });
    return handleResponse<ApiProduct[]>(response);
  },

  getCategories: async (): Promise<any[]> => {
    const response = await fetch(`${getBaseUrl()}/products/categories`, { headers: getHeaders() });
    return handleResponse<any[]>(response);
  },
};

// ==================== Customers API ====================
export const customersApi = {
  getAll: async (search?: string): Promise<ApiCustomer[]> => {
    const url = search 
      ? `${getBaseUrl()}/customers?search=${encodeURIComponent(search)}`
      : `${getBaseUrl()}/customers`;
    const response = await fetch(url, { headers: getHeaders() });
    return handleResponse<ApiCustomer[]>(response);
  },

  getById: async (id: number): Promise<ApiCustomer> => {
    const response = await fetch(`${getBaseUrl()}/customers/${id}`, { headers: getHeaders() });
    return handleResponse<ApiCustomer>(response);
  },

  create: async (customer: Omit<ApiCustomer, 'id' | 'createdAt'>): Promise<ApiCustomer> => {
    const response = await fetch(`${getBaseUrl()}/customers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(customer),
    });
    return handleResponse<ApiCustomer>(response);
  },

  update: async (id: number, customer: ApiCustomer): Promise<ApiCustomer> => {
    const response = await fetch(`${getBaseUrl()}/customers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(customer),
    });
    return handleResponse<ApiCustomer>(response);
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/customers/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  getBalance: async (id: number): Promise<any> => {
    const response = await fetch(`${getBaseUrl()}/customers/${id}/balance`, { headers: getHeaders() });
    return handleResponse<any>(response);
  },
};

// ==================== Invoices API ====================
export const invoicesApi = {
  getAll: async (params?: {
    type?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    customerId?: number;
  }): Promise<ApiInvoice[]> => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);
    if (params?.customerId) queryParams.append('customerId', params.customerId.toString());
    
    const url = `${getBaseUrl()}/invoices${queryParams.toString() ? '?' + queryParams : ''}`;
    const response = await fetch(url, { headers: getHeaders() });
    return handleResponse<ApiInvoice[]>(response);
  },

  getById: async (id: number): Promise<ApiInvoice> => {
    const response = await fetch(`${getBaseUrl()}/invoices/${id}`, { headers: getHeaders() });
    return handleResponse<ApiInvoice>(response);
  },

  create: async (invoice: Omit<ApiInvoice, 'id' | 'invoiceNumber' | 'createdAt'>): Promise<ApiInvoice> => {
    const response = await fetch(`${getBaseUrl()}/invoices`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(invoice),
    });
    return handleResponse<ApiInvoice>(response);
  },

  update: async (id: number, invoice: ApiInvoice): Promise<ApiInvoice> => {
    const response = await fetch(`${getBaseUrl()}/invoices/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(invoice),
    });
    return handleResponse<ApiInvoice>(response);
  },

  confirm: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/invoices/${id}/confirm`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  unconfirm: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/invoices/${id}/unconfirm`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  cancel: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/invoices/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/invoices/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  addPayment: async (invoiceId: number, payment: Omit<ApiPayment, 'id' | 'invoiceId' | 'createdAt'>): Promise<ApiPayment> => {
    const response = await fetch(`${getBaseUrl()}/invoices/${invoiceId}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payment),
    });
    return handleResponse<ApiPayment>(response);
  },

  deletePayment: async (invoiceId: number, paymentId: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/invoices/${invoiceId}/payments/${paymentId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  getSummary: async (fromDate: string, toDate: string): Promise<ApiSalesSummary> => {
    const url = `${getBaseUrl()}/invoices/summary?fromDate=${fromDate}&toDate=${toDate}`;
    const response = await fetch(url, { headers: getHeaders() });
    return handleResponse<ApiSalesSummary>(response);
  },
};

// ==================== Transaction Types API ====================
export const transactionTypesApi = {
  getAll: async (accountId: number = 1): Promise<ApiTransactionType[]> => {
    const response = await fetch(`${getBaseUrl()}/transactiontypes?accountId=${accountId}`, { headers: getHeaders() });
    return handleResponse<ApiTransactionType[]>(response);
  },

  getById: async (id: number): Promise<ApiTransactionType> => {
    const response = await fetch(`${getBaseUrl()}/transactiontypes/${id}`, { headers: getHeaders() });
    return handleResponse<ApiTransactionType>(response);
  },

  create: async (type: Partial<ApiTransactionType>): Promise<ApiTransactionType> => {
    const response = await fetch(`${getBaseUrl()}/transactiontypes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(type),
    });
    return handleResponse<ApiTransactionType>(response);
  },

  update: async (id: number, type: Partial<ApiTransactionType>): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/transactiontypes/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(type),
    });
    return handleResponse<void>(response);
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/transactiontypes/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  seed: async (accountId: number, userId?: number): Promise<ApiTransactionType[]> => {
    const url = `${getBaseUrl()}/transactiontypes/seed/${accountId}${userId ? '?userId=' + userId : ''}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<ApiTransactionType[]>(response);
  },
};

// ==================== Expenses API ====================
export const expensesApi = {
  getAll: async (params?: {
    categoryId?: number;
    transactionTypeId?: number;
    transactionTypeCode?: string;
    fromDate?: string;
    toDate?: string;
    status?: string;
  }): Promise<ApiExpense[]> => {
    const queryParams = new URLSearchParams();
    if (params?.categoryId) queryParams.append('categoryId', params.categoryId.toString());
    if (params?.transactionTypeId) queryParams.append('transactionTypeId', params.transactionTypeId.toString());
    if (params?.transactionTypeCode) queryParams.append('transactionTypeCode', params.transactionTypeCode);
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);
    if (params?.status) queryParams.append('status', params.status);
    
    const url = `${getBaseUrl()}/expenses${queryParams.toString() ? '?' + queryParams : ''}`;
    const response = await fetch(url, { headers: getHeaders() });
    return handleResponse<ApiExpense[]>(response);
  },

  getById: async (id: number): Promise<ApiExpense> => {
    const response = await fetch(`${getBaseUrl()}/expenses/${id}`, { headers: getHeaders() });
    return handleResponse<ApiExpense>(response);
  },

  create: async (expense: Omit<ApiExpense, 'id' | 'expenseNumber' | 'createdAt'>): Promise<ApiExpense> => {
    const response = await fetch(`${getBaseUrl()}/expenses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(expense),
    });
    return handleResponse<ApiExpense>(response);
  },

  update: async (id: number, expense: ApiExpense): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/expenses/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(expense),
    });
    return handleResponse<void>(response);
  },

  approve: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/expenses/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  getCategories: async (): Promise<any[]> => {
    const response = await fetch(`${getBaseUrl()}/expenses/categories`, { headers: getHeaders() });
    return handleResponse<any[]>(response);
  },

  getSummary: async (fromDate: string, toDate: string): Promise<any> => {
    const url = `${getBaseUrl()}/expenses/summary?fromDate=${fromDate}&toDate=${toDate}`;
    const response = await fetch(url, { headers: getHeaders() });
    return handleResponse<any>(response);
  },
};

// ==================== Revenues API ====================
export const revenuesApi = {
  getAll: async (params?: {
    categoryId?: number;
    fromDate?: string;
    toDate?: string;
  }): Promise<ApiRevenue[]> => {
    const queryParams = new URLSearchParams();
    if (typeof params?.categoryId === 'number') queryParams.append('categoryId', params.categoryId.toString());
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);
    
    const url = `${getBaseUrl()}/revenues${queryParams.toString() ? '?' + queryParams : ''}`;
    const response = await fetch(url, { headers: getHeaders() });
    const raw = await handleResponse<any>(response);
    return mapApiRevenueList(raw);
  },

  getById: async (id: number): Promise<ApiRevenue> => {
    const response = await fetch(`${getBaseUrl()}/revenues/${id}`, { headers: getHeaders() });
    const raw = await handleResponse<any>(response);
    return mapApiRevenue(raw);
  },

  create: async (revenue: Omit<ApiRevenue, 'id' | 'revenueNumber' | 'createdAt'>): Promise<ApiRevenue> => {
    const response = await fetch(`${getBaseUrl()}/revenues`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(revenue),
    });
    const raw = await handleResponse<any>(response);
    return mapApiRevenue(raw);
  },

  update: async (id: number, revenue: ApiRevenue): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/revenues/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(revenue),
    });
    return handleResponse<void>(response);
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/revenues/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  getCategories: async (): Promise<any[]> => {
    const response = await fetch(`${getBaseUrl()}/revenues/categories`, { headers: getHeaders() });
    return handleResponse<any[]>(response);
  },

  getSummary: async (fromDate: string, toDate: string): Promise<any> => {
    const url = `${getBaseUrl()}/revenues/summary?fromDate=${fromDate}&toDate=${toDate}`;
    const response = await fetch(url, { headers: getHeaders() });
    return handleResponse<any>(response);
  },
};

// ==================== Units API ====================
export const unitsApi = {
  getAll: async (): Promise<ApiUnit[]> => {
    const response = await fetch(`${getBaseUrl()}/units`, { headers: getHeaders() });
    return handleResponse<ApiUnit[]>(response);
  },

  getById: async (id: number): Promise<ApiUnit> => {
    const response = await fetch(`${getBaseUrl()}/units/${id}`, { headers: getHeaders() });
    return handleResponse<ApiUnit>(response);
  },

  create: async (unit: Omit<ApiUnit, 'id'>): Promise<ApiUnit> => {
    const response = await fetch(`${getBaseUrl()}/units`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(unit),
    });
    return handleResponse<ApiUnit>(response);
  },

  update: async (id: number, unit: ApiUnit): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/units/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(unit),
    });
    return handleResponse<void>(response);
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/units/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },
};

// ==================== Helper: Check API Connection ====================
export const checkApiConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${getBaseUrl()}/products`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return response.ok;
  } catch {
    return false;
  }
};

// ==================== Auth API ====================
export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await fetch(`${getBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, password }),
    });
    return handleResponse<LoginResponse>(response);
  },

  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await fetch(`${getBaseUrl()}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<RegisterResponse>(response);
  },

  getCurrentUser: async (userId: number): Promise<AuthUserDto> => {
    const response = await fetch(`${getBaseUrl()}/auth/me`, {
      method: 'GET',
      headers: {
        ...getHeaders(),
        'X-User-Id': userId.toString(),
      },
    });
    return handleResponse<AuthUserDto>(response);
  },

  changePassword: async (userId: number, currentPassword: string, newPassword: string): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/auth/change-password`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'X-User-Id': userId.toString(),
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return handleResponse<void>(response);
  },
};

// ==================== Account API ====================
export const accountApi = {
  updateLogo: async (accountId: number, logoUrl: string): Promise<{ success: boolean; message: string; logoUrl: string }> => {
    const response = await fetch(`${getBaseUrl()}/accounts/${accountId}/logo`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ logoUrl }),
    });
    return handleResponse<{ success: boolean; message: string; logoUrl: string }>(response);
  },
};

// ==================== Currencies API ====================
export const currenciesApi = {
  getAll: async (): Promise<any[]> => {
    const response = await fetch(`${getBaseUrl()}/currencies`, { headers: getHeaders() });
    return handleResponse<any[]>(response);
  },
};

// ==================== Payments API ====================
export interface ApiPaymentDto {
  id?: number;
  paymentNumber?: string;
  paymentType?: string;
  invoiceId?: number;
  invoiceNumber?: string;
  customerId?: number;
  customerName?: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  referenceNumber?: string;
  bankName?: string;
  checkNumber?: string;
  checkDate?: string;
  description?: string;
  status?: string;
  notes?: string;
  createdAt?: string;
}

const mapQueuedPaymentToDto = (item: SyncQueueItem): ApiPaymentDto => {
  const payload = item.data?.payload || {};
  const localId = item.data?.localId ?? Number(String(item.id).replace(/\D/g, '').slice(0, 9));
  return {
    id: Number.isFinite(localId) ? localId : undefined,
    paymentNumber: payload.paymentNumber,
    paymentType: payload.paymentType,
    invoiceId: payload.invoiceId,
    customerId: payload.customerId,
    amount: Number(payload.amount || 0),
    paymentDate: payload.paymentDate || new Date(item.timestamp).toISOString(),
    paymentMethod: payload.paymentMethod,
    referenceNumber: payload.referenceNumber,
    bankName: payload.bankName,
    checkNumber: payload.checkNumber,
    checkDate: payload.checkDate,
    description: payload.description,
    status: payload.status || 'PendingSync',
    notes: payload.notes,
    createdAt: new Date(item.timestamp).toISOString(),
  };
};

const getQueuedPayments = (params?: { customerId?: number; invoiceId?: number; fromDate?: string; toDate?: string }): ApiPaymentDto[] => {
  const queued = syncService
    .getQueueItems()
    .filter(i => i.entity === 'payments' && i.type === 'create' && (i.status === 'pending' || i.status === 'failed'))
    .map(mapQueuedPaymentToDto);

  return queued.filter(p => {
    if (params?.customerId && p.customerId !== params.customerId) return false;
    if (params?.invoiceId && p.invoiceId !== params.invoiceId) return false;
    if (params?.fromDate && p.paymentDate < params.fromDate) return false;
    if (params?.toDate && p.paymentDate > params.toDate) return false;
    return true;
  });
};

const createPaymentOnline = async (payment: Partial<ApiPaymentDto>): Promise<ApiPaymentDto> => {
  const response = await fetch(`${getBaseUrl()}/payments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payment),
  });
  return handleResponse<ApiPaymentDto>(response);
};

let paymentsProcessorRegistered = false;
const ensurePaymentsProcessorRegistered = () => {
  if (paymentsProcessorRegistered) return;

  syncService.registerProcessor('payments', async (item: SyncQueueItem) => {
    if (item.type !== 'create') {
      throw new Error(`Unsupported payments sync operation: ${item.type}`);
    }

    const created = await createPaymentOnline(item.data.payload);
    return {
      ...created,
      __localId: item.data.localId,
    };
  });

  paymentsProcessorRegistered = true;
};

ensurePaymentsProcessorRegistered();

export const paymentsApi = {
  getAll: async (params?: { customerId?: number; invoiceId?: number; fromDate?: string; toDate?: string }): Promise<{ payments: ApiPaymentDto[]; totalCount: number; totalAmount: number }> => {
    if (!syncService.isOnline() || !navigator.onLine) {
      const queuedPayments = getQueuedPayments(params);
      return {
        payments: queuedPayments,
        totalCount: queuedPayments.length,
        totalAmount: queuedPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      };
    }

    const queryParams = new URLSearchParams();
    if (params?.customerId) queryParams.append('customerId', params.customerId.toString());
    if (params?.invoiceId) queryParams.append('invoiceId', params.invoiceId.toString());
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);
    
    const url = `${getBaseUrl()}/payments${queryParams.toString() ? '?' + queryParams : ''}`;
    try {
      const response = await fetch(url, { headers: getHeaders() });
      return handleResponse<{ payments: ApiPaymentDto[]; totalCount: number; totalAmount: number }>(response);
    } catch {
      const queuedPayments = getQueuedPayments(params);
      return {
        payments: queuedPayments,
        totalCount: queuedPayments.length,
        totalAmount: queuedPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      };
    }
  },

  getById: async (id: number): Promise<ApiPaymentDto> => {
    const response = await fetch(`${getBaseUrl()}/payments/${id}`, { headers: getHeaders() });
    return handleResponse<ApiPaymentDto>(response);
  },

  create: async (payment: Partial<ApiPaymentDto>): Promise<ApiPaymentDto> => {
    if (!navigator.onLine) {
      throw new Error('لا يوجد اتصال بالإنترنت. لم يتم حفظ الدفعة في قاعدة البيانات.');
    }

    try {
      return await createPaymentOnline(payment);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error('تعذر حفظ الدفعة في قاعدة البيانات. تحقق من الاتصال ثم أعد المحاولة.');
    }
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/payments/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  getByCustomer: async (customerId: number): Promise<ApiPaymentDto[]> => {
    const result = await paymentsApi.getAll({ customerId });
    return result.payments;
  },
};

// ==================== Notifications API ====================
export interface ApiNotification {
  id: number;
  title: string;
  message: string;
  body?: string;
  type: 'Info' | 'Success' | 'Warning' | 'Error' | 'Reminder' | 'Alert' | 'Invoice' | 'Payment' | 'Stock' | 'System';
  link?: string;
  actionUrl?: string;
  icon?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
}

export const notificationsApi = {
  getAll: async (params?: { unreadOnly?: boolean; page?: number; pageSize?: number }): Promise<ApiNotification[]> => {
    const queryParams = new URLSearchParams();
    if (params?.unreadOnly) queryParams.append('unreadOnly', 'true');
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    
    const url = `${getBaseUrl()}/notifications${queryParams.toString() ? '?' + queryParams : ''}`;
    const response = await fetch(url, { headers: getHeaders() });
    const raw = await handleResponse<any[]>(response);
    return (raw || []).map((item) => ({
      ...item,
      message: item?.message ?? item?.body ?? '',
      link: item?.link ?? item?.actionUrl,
    })) as ApiNotification[];
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await fetch(`${getBaseUrl()}/notifications/unread-count`, { headers: getHeaders() });
    return handleResponse<number>(response);
  },

  markAsRead: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  markAllAsRead: async (): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/notifications/read-all`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/notifications/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  deleteAll: async (): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/notifications/clear-all`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  create: async (notification: {
    userId: number;
    title: string;
    message: string;
    type?: ApiNotification['type'];
    link?: string;
    icon?: string;
  }): Promise<ApiNotification> => {
    const typeMap: Record<ApiNotification['type'], number> = {
      Info: 0,
      Success: 1,
      Warning: 2,
      Error: 3,
      Reminder: 4,
      Alert: 5,
      Invoice: 6,
      Payment: 7,
      Stock: 8,
      System: 9,
    };

    const payload = {
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: typeMap[notification.type || 'Info'],
      link: notification.link,
      icon: notification.icon,
    };

    const response = await fetch(`${getBaseUrl()}/notifications`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const raw = await handleResponse<any>(response);
    return {
      ...raw,
      message: raw?.message ?? raw?.body ?? '',
      link: raw?.link ?? raw?.actionUrl,
    } as ApiNotification;
  },

  broadcast: async (notification: {
    title: string;
    message: string;
    type?: ApiNotification['type'];
    link?: string;
    icon?: string;
  }): Promise<{ sentTo: number }> => {
    const typeMap: Record<ApiNotification['type'], number> = {
      Info: 0,
      Success: 1,
      Warning: 2,
      Error: 3,
      Reminder: 4,
      Alert: 5,
      Invoice: 6,
      Payment: 7,
      Stock: 8,
      System: 9,
    };

    const payload = {
      title: notification.title,
      message: notification.message,
      type: typeMap[notification.type || 'Info'],
      link: notification.link,
      icon: notification.icon,
    };

    const response = await fetch(`${getBaseUrl()}/notifications/broadcast`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const result = await handleResponse<any>(response);
    return {
      sentTo: Number(result?.sentTo ?? result?.SentTo ?? 0),
    };
  },
};

// ==================== Messages API ====================
export interface ApiMessage {
  id: number;
  senderUserId?: number;
  senderName?: string;
  recipientUserId: number;
  recipientName?: string;
  subject: string;
  content: string;
  isRead: boolean;
  readAt?: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  createdAt: string;
}

export interface ApiMessageUser {
  id: number;
  fullName?: string;
  username: string;
  email?: string;
  accountId?: number;
  role?: string;
  isActive?: boolean;
}

export interface ApiMessageAccount {
  id: number;
  name: string;
  nameEn?: string;
}

export interface ApiMessageLimits {
  maxMessageLength: number;
  maxNotificationLength: number;
}

const mapApiMessage = (raw: any): ApiMessage => ({
  id: raw?.id ?? raw?.Id,
  senderUserId: raw?.senderUserId ?? raw?.senderId ?? raw?.SenderUserId ?? raw?.SenderId,
  senderName: raw?.senderName ?? raw?.SenderName,
  recipientUserId: raw?.recipientUserId ?? raw?.receiverId ?? raw?.recipientId ?? raw?.ReceiverId ?? raw?.RecipientUserId ?? 0,
  recipientName: raw?.recipientName ?? raw?.receiverName ?? raw?.RecipientName ?? raw?.ReceiverName,
  subject: raw?.subject ?? raw?.Subject ?? '',
  content: raw?.content ?? raw?.Content ?? '',
  isRead: Boolean(raw?.isRead ?? raw?.IsRead),
  readAt: raw?.readAt ?? raw?.ReadAt,
  priority: (raw?.priority ?? raw?.Priority ?? 'Normal') as ApiMessage['priority'],
  createdAt: raw?.createdAt ?? raw?.CreatedAt ?? new Date().toISOString(),
});

export const messagesApi = {
  getAll: async (params?: { folder?: 'inbox' | 'sent'; unreadOnly?: boolean }): Promise<ApiMessage[]> => {
    const folder = params?.folder || 'inbox';
    const endpoint = folder === 'sent' ? '/messages/sent' : '/messages/inbox';
    
    const url = `${getBaseUrl()}${endpoint}`;
    const response = await fetch(url, { headers: getHeaders() });
    const raw = await handleResponse<any[]>(response);
    return (raw || []).map(mapApiMessage);
  },

  getById: async (id: number): Promise<ApiMessage> => {
    const response = await fetch(`${getBaseUrl()}/messages/${id}`, { headers: getHeaders() });
    const raw = await handleResponse<any>(response);
    return mapApiMessage(raw);
  },

  send: async (message: { recipientUserId?: number; subject: string; content: string; priority?: string }): Promise<ApiMessage> => {
    // تحويل الأولوية من نص إلى رقم
    const priorityMap: Record<string, number> = { 'Low': 1, 'Normal': 2, 'High': 3, 'Urgent': 4 };
    const payload: any = {
      subject: message.subject,
      content: message.content,
      priority: priorityMap[message.priority || 'Normal'] || 2,
    };

    if (typeof message.recipientUserId === 'number' && Number.isFinite(message.recipientUserId) && message.recipientUserId > 0) {
      payload.receiverId = message.recipientUserId;
    }

    const response = await fetch(`${getBaseUrl()}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const raw = await handleResponse<any>(response);
    return mapApiMessage(raw);
  },

  markAsRead: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/messages/${id}/read`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/messages/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await fetch(`${getBaseUrl()}/messages/unread-count`, { headers: getHeaders() });
    return handleResponse<number>(response);
  },

  getUsers: async (): Promise<ApiMessageUser[]> => {
    const response = await fetch(`${getBaseUrl()}/messages/users`, { headers: getHeaders() });
    return handleResponse<ApiMessageUser[]>(response);
  },

  getAllUsers: async (): Promise<ApiMessageUser[]> => {
    const response = await fetch(`${getBaseUrl()}/messages/all-users`, { headers: getHeaders() });
    return handleResponse<ApiMessageUser[]>(response);
  },

  getAccounts: async (): Promise<ApiMessageAccount[]> => {
    const response = await fetch(`${getBaseUrl()}/messages/accounts`, { headers: getHeaders() });
    return handleResponse<ApiMessageAccount[]>(response);
  },

  getLimits: async (): Promise<ApiMessageLimits> => {
    const response = await fetch(`${getBaseUrl()}/messages/limits`, { headers: getHeaders() });
    return handleResponse<ApiMessageLimits>(response);
  },
};

// ==================== Logos API ====================
export interface LogoDto {
  id: number;
  accountId: number;
  name?: string;
  logoType?: string;
  storageType?: string;
  imageUrl?: string;
  imageData?: string;
  mimeType?: string;
  fileSize: number;
  width: number;
  height: number;
  isActive: boolean;
  showLogo: boolean;
  displayOrder: number;
  altText?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateLogoRequest {
  name?: string;
  logoType?: string;
  storageType?: string;
  imageUrl?: string;
  imageData?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  isActive?: boolean;
  showLogo?: boolean;
  displayOrder?: number;
  altText?: string;
  notes?: string;
}

export interface LogoSettingsDto {
  id: number;
  accountId: number;
  preferredStorageType?: string;
  enableLogoDisplay: boolean;
  maxFileSizeKb: number;
  allowedMimeTypes?: string;
  activePrimaryLogoId?: number;
  activeFaviconId?: number;
}

export const logosApi = {
  getAll: async (): Promise<LogoDto[]> => {
    const response = await fetch(`${getBaseUrl()}/logos`, { headers: getHeaders() });
    return handleResponse<LogoDto[]>(response);
  },

  getActive: async (type: string = 'Primary'): Promise<{ showLogo: boolean; logo?: LogoDto; message?: string }> => {
    const response = await fetch(`${getBaseUrl()}/logos/active?type=${type}`, { headers: getHeaders() });
    return handleResponse<{ showLogo: boolean; logo?: LogoDto; message?: string }>(response);
  },

  getById: async (id: number): Promise<LogoDto> => {
    const response = await fetch(`${getBaseUrl()}/logos/${id}`, { headers: getHeaders() });
    return handleResponse<LogoDto>(response);
  },

  create: async (data: CreateLogoRequest): Promise<LogoDto> => {
    const response = await fetch(`${getBaseUrl()}/logos`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<LogoDto>(response);
  },

  update: async (id: number, data: Partial<CreateLogoRequest>): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/logos/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<void>(response);
  },

  toggleDisplay: async (id: number): Promise<{ showLogo: boolean }> => {
    const response = await fetch(`${getBaseUrl()}/logos/${id}/toggle-display`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return handleResponse<{ showLogo: boolean }>(response);
  },

  changeStorageType: async (id: number, storageType: string): Promise<{ storageType: string }> => {
    const response = await fetch(`${getBaseUrl()}/logos/${id}/storage-type`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ storageType }),
    });
    return handleResponse<{ storageType: string }>(response);
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/logos/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(response);
  },

  // إعدادات الشعارات
  getSettings: async (): Promise<LogoSettingsDto> => {
    const response = await fetch(`${getBaseUrl()}/logos/settings`, { headers: getHeaders() });
    return handleResponse<LogoSettingsDto>(response);
  },

  updateSettings: async (data: Partial<LogoSettingsDto>): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/logos/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<void>(response);
  },

  toggleAccountLogoDisplay: async (): Promise<{ enableLogoDisplay: boolean }> => {
    const response = await fetch(`${getBaseUrl()}/logos/settings/toggle-display`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return handleResponse<{ enableLogoDisplay: boolean }>(response);
  },
};

export default {
  auth: authApi,
  products: productsApi,
  customers: customersApi,
  invoices: invoicesApi,
  expenses: expensesApi,
  revenues: revenuesApi,
  units: unitsApi,
  currencies: currenciesApi,
  payments: paymentsApi,
  notifications: notificationsApi,
  messages: messagesApi,
  logos: logosApi,
  checkConnection: checkApiConnection,
};
