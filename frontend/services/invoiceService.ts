import { apiService } from './apiService';

export interface InvoiceItem {
  productId: number;
  productName?: string;
  unitId?: number;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  taxPercent?: number;
}

export interface CreateInvoiceDto {
  invoiceType: string;
  customerId?: number;
  invoiceDate: string;
  dueDate?: string;
  notes?: string;
  discountPercent?: number;
  discountAmount?: number;
  paymentMethod?: string;
  items: InvoiceItem[];
}

export interface Invoice extends CreateInvoiceDto {
  id: number;
  invoiceNumber: string;
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  createdAt: string;
}

/**
 * إنشاء فاتورة جديدة
 */
export const createInvoice = async (invoiceData: CreateInvoiceDto): Promise<Invoice> => {
  // تأكد من أن invoiceType و paymentMethod هي strings كما يتوقع الـ Backend
  const invoiceTypeMap: Record<string, string> = {
    'sales': 'Sales',
    'Sales': 'Sales',
    'salesreturn': 'SalesReturn',
    'SalesReturn': 'SalesReturn',
    'quotation': 'Quotation',
    'Quotation': 'Quotation',
  };

  const paymentMethodMap: Record<string, string> = {
    'cash': 'Cash',
    'Cash': 'Cash',
    'credit': 'Credit',
    'Credit': 'Credit',
    'bank': 'Bank',
    'Bank': 'Bank',
    'check': 'Check',
    'Check': 'Check',
  };

  const payload = {
    ...invoiceData,
    invoiceType: invoiceTypeMap[invoiceData.invoiceType] ?? 'Sales',
    paymentMethod: paymentMethodMap[invoiceData.paymentMethod ?? 'cash'] ?? 'Cash',
  };

  const response = await fetch('/api/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.title || error.error || 'فشل في إنشاء الفاتورة');
  }

  return response.json();
};

/**
 * الحصول على جميع الفواتير
 */
export const getInvoices = async (filters?: {
  type?: number;
  status?: number;
  fromDate?: string;
  toDate?: string;
  customerId?: number;
}): Promise<Invoice[]> => {
  const params = new URLSearchParams();
  
  if (filters?.type !== undefined) params.append('type', filters.type.toString());
  if (filters?.status !== undefined) params.append('status', filters.status.toString());
  if (filters?.fromDate) params.append('fromDate', filters.fromDate);
  if (filters?.toDate) params.append('toDate', filters.toDate);
  if (filters?.customerId) params.append('customerId', filters.customerId.toString());

  const url = `/api/invoices${params.toString() ? '?' + params.toString() : ''}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.title || error.error || 'فشل في جلب الفواتير');
  }
  
  return response.json();
};

/**
 * الحصول على فاتورة بالمعرف
 */
export const getInvoice = async (id: number): Promise<Invoice> => {
  const response = await fetch(`/api/invoices/${id}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.title || error.error || 'فشل في جلب الفاتورة');
  }
  return response.json();
};

/**
 * تأكيد فاتورة
 */
export const confirmInvoice = async (id: number): Promise<void> => {
  const response = await fetch(`/api/invoices/${id}/confirm`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.title || error.error || 'فشل في تأكيد الفاتورة');
  }
};

/**
 * إلغاء فاتورة
 */
export const cancelInvoice = async (id: number): Promise<void> => {
  const response = await fetch(`/api/invoices/${id}/cancel`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.title || error.error || 'فشل في إلغاء الفاتورة');
  }
};

/**
 * حذف فاتورة
 */
export const deleteInvoice = async (id: number): Promise<void> => {
  const response = await fetch(`/api/invoices/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.title || error.error || 'فشل في حذف الفاتورة');
  }
};

/**
 * إضافة دفعة للفاتورة
 */
export const addPayment = async (invoiceId: number, payment: {
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
}): Promise<void> => {
  const response = await fetch(`/api/invoices/${invoiceId}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payment),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.title || error.error || 'فشل في إضافة الدفعة');
  }
};
