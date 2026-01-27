
import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Save, Search, Printer, FileText, AlertCircle, Package, Edit2, AlertTriangle, XCircle, Check, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, Eye, X, Loader2, Grid3X3, List, User, Calendar, CreditCard, Banknote, Clock, Store, Filter, RotateCcw } from 'lucide-react';
import { useCustomers, useProducts, useInvoices, useAutoRefresh } from '../services/dataHooks';
import { Invoice, InvoiceItem, PaymentType } from '../types';
import { useNotification } from '../context/NotificationContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, formatDate } from '../services/dateService';
import { printWithFileName } from '../services/fileNameService';
import DateInput from '../components/DateInput';
import { usePagePermission, useModulePermission } from '../services/permissionsHooks';
import AccessDenied from '../components/AccessDenied';

// --- Reusable Searchable Select Component ---
const SearchableSelect = ({ options, value, onChange, placeholder, disabled }: {
  options: { id: string, label: string, subLabel?: string }[],
  value: string,
  onChange: (id: string) => void,
  placeholder: string,
  disabled?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const selected = options.find(o => o.id === value);
  const filtered = options.filter(o => 
    o.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (o.subLabel && o.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="relative">
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 flex justify-between items-center bg-white dark:bg-slate-700 transition-colors ${disabled ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}`}
      >
        <span className={`${selected ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-500 dark:text-slate-400'} truncate block`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[50]" onClick={() => setIsOpen(false)}></div>
          <div className="absolute z-[51] w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl mt-1 max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 border-b border-slate-50 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 sticky top-0">
               <div className="relative">
                 <Search size={14} className="absolute right-3 top-2.5 text-slate-400" />
                 <input 
                   autoFocus
                   type="text"
                   placeholder="بحث..."
                   className="w-full pr-9 pl-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-sm outline-none focus:border-primary text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                 />
               </div>
            </div>
            <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
               {filtered.map(opt => (
                 <div 
                   key={opt.id}
                   onClick={() => {
                     onChange(opt.id);
                     setIsOpen(false);
                     setSearchTerm('');
                   }}
                   className={`p-2 text-sm rounded cursor-pointer flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700 ${value === opt.id ? 'bg-blue-50 dark:bg-blue-900/30 text-primary dark:text-blue-300 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                 >
                    <span className="truncate">{opt.label}</span>
                    {opt.subLabel && <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded whitespace-nowrap">{opt.subLabel}</span>}
                 </div>
               ))}
               {filtered.length === 0 && <p className="text-xs text-slate-400 text-center p-3">لا توجد نتائج</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

type ViewMode = 'grid' | 'table';

const Invoices: React.FC = () => {
  // ==================== Hooks أولاً (React requires all hooks before any return) ====================
  const { notify } = useNotification();
  const { currency, defaultViewMode, autoRefreshEnabled, autoRefreshInterval } = useSettings();
  const { user } = useAuth();
  const [view, setView] = useState<'list' | 'create'>('list');
  
  // View Mode State - يستخدم الإعداد الافتراضي من النظام
  const [listViewMode, setListViewMode] = useState<ViewMode>(defaultViewMode || 'grid');
  
  // API Hooks
  const { customers, loading: customersLoading, refresh: refreshCustomers } = useCustomers();
  const { products, loading: productsLoading, refresh: refreshProducts } = useProducts();
  const { 
    invoices, 
    loading: invoicesLoading,
    refresh: refreshInvoices,
    addInvoice: apiAddInvoice,
    updateInvoice: apiUpdateInvoice,
    deleteInvoice: apiDeleteInvoice,
    unconfirmInvoice: apiUnconfirmInvoice,
    deletePayment: apiDeletePayment
  } = useInvoices();
  
  // Auto Refresh Hook
  const refreshCallbacks = useCallback(() => [
    refreshInvoices,
    refreshCustomers,
    refreshProducts
  ], [refreshInvoices, refreshCustomers, refreshProducts]);
  
  const { 
    countdown, 
    isRefreshing, 
    manualRefresh,
    enabled: autoRefreshActive 
  } = useAutoRefresh(
    refreshCallbacks(),
    autoRefreshInterval,
    autoRefreshEnabled && view === 'list' // فقط عند عرض القائمة
  );
  
  // List View State
  const [listSearchQuery, setListSearchQuery] = useState('');
  
  // Date Filter State
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  
  // Edit & Delete Invoice State (Global)
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);
  
  // View Detail State
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  
  // New States for Confirmation Dialogs
  const [pendingEditInvoiceId, setPendingEditInvoiceId] = useState<string | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [pendingUnconfirmInvoiceId, setPendingUnconfirmInvoiceId] = useState<string | null>(null);
  const [pendingDeletePayment, setPendingDeletePayment] = useState<{invoiceId: number, paymentId: number, amount: number} | null>(null);

  // Edit & Delete Item State (Inside Form)
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.CASH);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [currentPaidAmount, setCurrentPaidAmount] = useState<number>(0);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  
  // Item Input State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);
  const [itemUnit, setItemUnit] = useState('قطعة');
  
  // ==================== صلاحيات الصفحة (بعد كل الـ hooks) ====================
  const pagePerms = usePagePermission('invoices');
  const unconfirmPerm = useModulePermission('btn_unconfirm_invoice');
  const deletePaymentPerm = useModulePermission('btn_delete_payment');
  
  // إذا لم يكن لديه صلاحية عرض الصفحة
  if (pagePerms.checked && !pagePerms.canView) {
    return <AccessDenied />;
  }
  
  // Date Range Helper
  const setDateRange = (type: 'all' | 'week' | 'month' | 'year' | 'custom') => {
    const today = new Date();
    let start = new Date();
    const end = today;
    
    const formatDateValue = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    if (type === 'all') {
      setFilterDateFrom('');
      setFilterDateTo('');
      setFilterPeriod('all');
      return;
    } else if (type === 'week') {
      start = new Date(today);
      start.setDate(today.getDate() - 7);
    } else if (type === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (type === 'year') {
      start = new Date(today.getFullYear(), 0, 1);
    } else if (type === 'custom') {
      // تاريخ مخصص - فترة سنة كاملة كقيمة افتراضية
      start = new Date(today);
      start.setFullYear(today.getFullYear() - 1);
    }
    
    setFilterDateFrom(formatDateValue(start));
    setFilterDateTo(formatDateValue(end));
    setFilterPeriod(type);
  };

  // Loading state
  const isLoading = customersLoading || productsLoading || invoicesLoading;

  // Filtered Invoices for List
  const filteredInvoices = useMemo(() => {
      return invoices.filter(inv => {
        // فلتر البحث
        const matchesSearch = String(inv.id).toLowerCase().includes(listSearchQuery.toLowerCase()) || 
          inv.customerName.toLowerCase().includes(listSearchQuery.toLowerCase());
        
        // فلتر التاريخ
        let matchesDate = true;
        if (filterDateFrom || filterDateTo) {
          const invDate = new Date(inv.date);
          if (filterDateFrom) {
            const fromDate = new Date(filterDateFrom);
            matchesDate = matchesDate && invDate >= fromDate;
          }
          if (filterDateTo) {
            const toDate = new Date(filterDateTo);
            toDate.setHours(23, 59, 59);
            matchesDate = matchesDate && invDate <= toDate;
          }
        }
        
        return matchesSearch && matchesDate;
      });
  }, [invoices, listSearchQuery, filterDateFrom, filterDateTo]);

  // --- Invoice Management Functions ---

  // Step 1: Request to Edit - Shows Confirmation
  const requestEditInvoice = (invoiceId: string) => {
    // التحقق من إمكانية التعديل (فقط المسودات يمكن تعديلها)
    const invoice = invoices.find(i => String(i.id) === invoiceId);
    if (!invoice) {
      notify('الفاتورة غير موجودة', 'error');
      return;
    }
    
    // console.log للتحقق
    console.log('Invoice status:', invoice.status, 'type:', typeof invoice.status);
    
    // إذا كانت الحالة غير 0 (Draft) - لا يمكن التعديل
    // نعتبر undefined أو null كـ Draft (0) للسماح بالتعديل
    const status = invoice.status ?? 0;
    if (status !== 0) {
      const statusNames: Record<number, string> = {
        0: 'مسودة',
        1: 'معلقة', 
        2: 'مؤكدة',
        3: 'ملغاة',
        4: 'مدفوعة',
        5: 'مدفوعة جزئياً',
        6: 'متأخرة',
        7: 'مُسترجعة'
      };
      // رسالة مخصصة حسب الحالة
      if (status === 2 || status === 4 || status === 5) {
        notify(`لا يمكن تعديل الفاتورة (${statusNames[status]}). افتح الفاتورة واضغط "إلغاء التأكيد" أولاً`, 'warning');
      } else {
        notify(`لا يمكن تعديل الفاتورة - حالتها: ${statusNames[status] || 'غير معروفة'}`, 'warning');
      }
      return;
    }
    setPendingEditInvoiceId(invoiceId);
  };

  // Step 2: Confirm Edit - Loads Data
  const confirmEditInvoice = () => {
    if (!pendingEditInvoiceId) return;
    const invoice = invoices.find(i => String(i.id) === pendingEditInvoiceId);
    if (invoice) {
      // تحقق إضافي من الحالة (نعتبر undefined كـ Draft)
      const status = invoice.status ?? 0;
      if (status !== 0) {
        notify('لا يمكن تعديل هذه الفاتورة في حالتها الحالية', 'error');
        setPendingEditInvoiceId(null);
        return;
      }
      setEditingInvoiceId(String(invoice.id));
      setSelectedCustomerId(String(invoice.customerId));
      // تحويل التاريخ لصيغة YYYY-MM-DD المطلوبة لحقل date
      const dateOnly = invoice.date ? invoice.date.split('T')[0] : new Date().toISOString().split('T')[0];
      setDate(dateOnly);
      setPaymentType(invoice.type);
      setItems(invoice.items);
      setCurrentPaidAmount(invoice.paidAmount);
      setInvoiceNotes(invoice.notes || '');
      setView('create');
      notify('تم فتح الفاتورة للتعديل', 'info');
    }
    setPendingEditInvoiceId(null);
  };

  const confirmDeleteInvoice = async () => {
      if (deleteInvoiceId) {
          try {
              await apiDeleteInvoice(Number(deleteInvoiceId));
              notify('تم حذف الفاتورة بنجاح', 'success');
          } catch(e) {
              notify('حدث خطأ أثناء الحذف', 'error');
          }
          setDeleteInvoiceId(null);
      }
  };

  // إلغاء تأكيد الفاتورة (تحويلها لمسودة)
  const confirmUnconfirmInvoice = async () => {
      if (pendingUnconfirmInvoiceId) {
          try {
              await apiUnconfirmInvoice(Number(pendingUnconfirmInvoiceId));
              notify('تم إلغاء تأكيد الفاتورة وتحويلها لمسودة. يمكنك الآن تعديلها', 'success');
              setViewInvoiceId(null); // إغلاق نافذة العرض
          } catch(e: any) {
              notify(e.message || 'حدث خطأ أثناء إلغاء التأكيد', 'error');
          }
          setPendingUnconfirmInvoiceId(null);
      }
  };

  // حذف دفعة من الفاتورة
  const confirmDeletePayment = async () => {
      if (pendingDeletePayment) {
          try {
              await apiDeletePayment(pendingDeletePayment.invoiceId, pendingDeletePayment.paymentId);
              notify('تم حذف الدفعة بنجاح', 'success');
          } catch(e: any) {
              notify(e.message || 'حدث خطأ أثناء حذف الدفعة', 'error');
          }
          setPendingDeletePayment(null);
      }
  };

  // --- Invoice Item Management Functions ---

  const handleProductSelect = (pid: string) => {
    setSelectedProductId(pid);
    
    if (pid) {
        const prod = products.find(p => String(p.id) === pid);
        if (prod) {
            setItemName(prod.name);
            setItemPrice(prod.price);
            // التعامل مع unit كـ object أو string
            const unitName = typeof prod.unit === 'object' && prod.unit ? (prod.unit as any).name : prod.unit;
            setItemUnit(unitName || 'قطعة');
        }
    }
  };

  const saveItem = () => {
    const quantity = Number(itemQty);
    const price = Number(itemPrice);

    if (!itemName || price <= 0 || quantity <= 0) {
        notify('الرجاء إدخال اسم الصنف، السعر، والكمية بشكل صحيح', 'warning');
        return;
    }

    const lineTotal = Number((quantity * price).toFixed(2));

    if (editingItemId) {
        // UPDATE Existing Item
        setItems(prevItems => prevItems.map(item => 
            item.id === editingItemId 
            ? { ...item, productId: selectedProductId || undefined, name: itemName, quantity, price, unit: itemUnit, total: lineTotal }
            : item
        ));
        notify('تم تعديل الصنف بنجاح', 'success');
        cancelEditItem();
    } else {
        // التحقق إذا كان المنتج موجود مسبقاً (بنفس المنتج والسعر)
        const existingItemIndex = items.findIndex(item => 
            (selectedProductId && item.productId === selectedProductId) || 
            (!selectedProductId && item.name === itemName && item.price === price)
        );

        if (existingItemIndex !== -1) {
            // زيادة الكمية على المنتج الموجود
            setItems(prevItems => prevItems.map((item, index) => {
                if (index === existingItemIndex) {
                    const newQty = item.quantity + quantity;
                    const newTotal = Number((newQty * item.price).toFixed(2));
                    return { ...item, quantity: newQty, total: newTotal };
                }
                return item;
            }));
            notify(`تم زيادة الكمية إلى ${items[existingItemIndex].quantity + quantity}`, 'success');
        } else {
            // ADD New Item
            const newItem: InvoiceItem = {
                id: Math.random().toString(36).substr(2, 9),
                productId: selectedProductId || undefined,
                name: itemName,
                quantity: quantity,
                price: price,
                unit: itemUnit,
                total: lineTotal
            };
            setItems([...items, newItem]);
            notify('تم إضافة الصنف للقائمة', 'success');
        }
        
        // Reset inputs only on add
        setSelectedProductId('');
        setItemName('');
        setItemQty(1);
        setItemPrice(0);
    }
  };

  const prepareEditItem = (item: InvoiceItem) => {
      setEditingItemId(item.id);
      setSelectedProductId(item.productId || '');
      setItemName(item.name);
      setItemQty(item.quantity);
      setItemPrice(item.price);
      // التعامل مع unit كـ object أو string
      const unitName = typeof item.unit === 'object' && item.unit ? (item.unit as any).name : item.unit;
      setItemUnit(unitName || 'قطعة');
      notify('يمكنك الآن تعديل بيانات الصنف أعلاه', 'info');
      
      // Scroll to top of form on mobile
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditItem = () => {
      setEditingItemId(null);
      setSelectedProductId('');
      setItemName('');
      setItemQty(1);
      setItemPrice(0);
      setItemUnit('قطعة');
  };

  const confirmDeleteItem = () => {
    if (deleteItemId) {
        setItems(prev => prev.filter(i => i.id !== deleteItemId));
        notify('تم حذف الصنف من الفاتورة', 'warning');
        setDeleteItemId(null);
        
        // If we were editing this item, cancel edit mode
        if (editingItemId === deleteItemId) {
            cancelEditItem();
        }
    }
  };

  // --- Invoice Save/Cancel ---

  const handleCancelInvoice = () => {
      setView('list');
      setEditingInvoiceId(null);
      setItems([]);
      setCurrentPaidAmount(0);
      setSelectedCustomerId('');
      setInvoiceNotes('');
      cancelEditItem();
      setShowSaveConfirmation(false);
  };

  // Step 1: Request Save - Check validity and show dialog
  const handleSaveRequest = () => {
    if (!selectedCustomerId || items.length === 0) {
      notify('الرجاء اختيار عميل وإضافة صنف واحد على الأقل', 'error');
      return;
    }
    
    // If editing, show confirmation dialog
    if (editingInvoiceId) {
        setShowSaveConfirmation(true);
    } else {
        // If new invoice, save directly
        performSaveInvoice();
    }
  };

  // Step 2: Perform Actual Save
  const performSaveInvoice = async () => {
    const customer = customers.find(c => String(c.id) === selectedCustomerId);
    if (!customer) return;

    const finalTotal = items.reduce((sum, item) => sum + item.total, 0);

    // استخدام المبلغ المدفوع المحدد من المستخدم
    const actualPaidAmount = currentPaidAmount;

    // دمج التاريخ المختار مع الوقت الحالي
    const now = new Date();
    const selectedDate = new Date(date);
    selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    const dateTimeString = selectedDate.toISOString();

    try {
      if (editingInvoiceId) {
          await apiUpdateInvoice(Number(editingInvoiceId), {
              customerId: customer.id,
              customerName: customer.name,
              date: dateTimeString,
              items: items,
              totalAmount: finalTotal,
              paidAmount: actualPaidAmount,
              notes: invoiceNotes
          });
          notify(`تم تحديث الفاتورة رقم ${editingInvoiceId} بنجاح`, 'success');
      } else {
          const newInvoice = await apiAddInvoice({
              customerId: customer.id,
              customerName: customer.name,
              date: dateTimeString,
              items: items,
              totalAmount: finalTotal,
              type: paymentType,
              paidAmount: actualPaidAmount,
              notes: invoiceNotes
          });
          notify(`تم حفظ الفاتورة الجديدة رقم ${newInvoice.invoiceNumber || newInvoice.id}`, 'success');
      }

      handleCancelInvoice();
    } catch (err: any) {
      // استخراج رسالة الخطأ بشكل أفضل
      let errorMsg = 'حدث خطأ أثناء الحفظ';
      if (err.message) {
        errorMsg = err.message;
      }
      // إذا كانت الرسالة تحتوي على معلومات عن حالة الفاتورة
      if (errorMsg.includes('لا يمكن تعديل')) {
        errorMsg = '⚠️ ' + errorMsg + '\n\nافتح الفاتورة واضغط "إلغاء التأكيد" أولاً للتمكن من التعديل';
      }
      notify(errorMsg, 'error');
      console.error('خطأ في حفظ الفاتورة:', err);
    }
  };

  // Calculations
  const totalInvoice = items.reduce((sum, item) => sum + item.total, 0);

  // Helper for invoice detail view
  const viewingInvoice = useMemo(() => invoices.find(i => String(i.id) === viewInvoiceId), [invoices, viewInvoiceId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      
      {/* --- MODALS --- */}
      
      {/* 1. Confirm Edit Start Modal */}
      {pendingEditInvoiceId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[120] p-4 print:hidden">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-blue-600 mb-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full"><Edit2 size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">تأكيد التعديل</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
                هل تريد تعديل الفاتورة رقم <span className="font-bold">#{pendingEditInvoiceId}</span>؟
            </p>
            <div className="flex gap-3">
              <button onClick={confirmEditInvoice} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700">نعم، عدل الفاتورة</button>
              <button onClick={() => setPendingEditInvoiceId(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Confirm Save Changes Modal */}
      {showSaveConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[120] p-4 print:hidden">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-emerald-600 mb-4">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-full"><Save size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">حفظ التعديلات</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
                هل أنت متأكد من حفظ التعديلات على الفاتورة؟
            </p>
            <div className="flex gap-3">
              <button onClick={performSaveInvoice} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700">نعم، احفظ</button>
              <button onClick={() => setShowSaveConfirmation(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">تراجع</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Delete Invoice Confirmation */}
      {deleteInvoiceId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 print:hidden">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
                <div className="bg-rose-100 dark:bg-rose-900/30 p-2 rounded-full"><AlertTriangle size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">حذف الفاتورة</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
                هل أنت متأكد من حذف الفاتورة رقم <span className="font-bold">#{deleteInvoiceId}</span>؟
            </p>
            <div className="flex gap-3">
              <button onClick={confirmDeleteInvoice} className="flex-1 bg-rose-600 text-white py-2 rounded-lg font-bold hover:bg-rose-700">تأكيد الحذف</button>
              <button onClick={() => setDeleteInvoiceId(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Delete Item Confirmation */}
      {deleteItemId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4 print:hidden">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full"><AlertCircle size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">حذف الصنف</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
                هل تريد حذف هذا الصنف من الفاتورة؟
            </p>
            <div className="flex gap-3">
              <button onClick={confirmDeleteItem} className="flex-1 bg-rose-600 text-white py-2 rounded-lg font-bold hover:bg-rose-700">نعم، احذف</button>
              <button onClick={() => setDeleteItemId(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">تراجع</button>
            </div>
          </div>
        </div>
      )}

      {/* 4.5. Unconfirm Invoice Confirmation */}
      {pendingUnconfirmInvoiceId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[250] p-4 print:hidden">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full"><RotateCcw size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">إلغاء تأكيد الفاتورة</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-4 text-sm">
                هل تريد إلغاء تأكيد هذه الفاتورة وتحويلها إلى مسودة؟
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mb-4">
                <p className="text-amber-700 dark:text-amber-400 text-xs">
                    <strong>ملاحظة:</strong> سيتم إعادة الكميات للمخزون وتعديل رصيد العميل (إن وجد).
                    ستتمكن من تعديل الفاتورة بعد إلغاء التأكيد.
                </p>
            </div>
            <div className="flex gap-3">
              <button onClick={confirmUnconfirmInvoice} className="flex-1 bg-amber-500 text-white py-2 rounded-lg font-bold hover:bg-amber-600">نعم، إلغاء التأكيد</button>
              <button onClick={() => setPendingUnconfirmInvoiceId(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">تراجع</button>
            </div>
          </div>
        </div>
      )}

      {/* 4.6. Delete Payment Confirmation */}
      {pendingDeletePayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[260] p-4 print:hidden">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
                <div className="bg-rose-100 dark:bg-rose-900/30 p-2 rounded-full"><Trash2 size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">حذف الدفعة</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-4 text-sm">
                هل تريد حذف هذه الدفعة ({pendingDeletePayment.amount.toLocaleString()} {currency})؟
            </p>
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 rounded-lg p-3 mb-4">
                <p className="text-rose-700 dark:text-rose-400 text-xs">
                    <strong>ملاحظة:</strong> سيتم إعادة المبلغ لرصيد العميل وتحديث حالة الفاتورة.
                </p>
            </div>
            <div className="flex gap-3">
              <button onClick={confirmDeletePayment} className="flex-1 bg-rose-600 text-white py-2 rounded-lg font-bold hover:bg-rose-700">نعم، احذف الدفعة</button>
              <button onClick={() => setPendingDeletePayment(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">تراجع</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. View/Print Invoice Detail Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4 print:p-0 print:bg-white print:static">
           <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col animate-in zoom-in-95 duration-200 print:shadow-none print:max-h-full print:rounded-none print:w-full">
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800 print:hidden">
                 <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
                    <FileText size={20}/> تفاصيل الفاتورة
                    {/* شارة حالة الفاتورة */}
                    {viewingInvoice.status !== undefined && viewingInvoice.status !== 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        viewingInvoice.status === 2 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        viewingInvoice.status === 4 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        viewingInvoice.status === 5 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        viewingInvoice.status === 3 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {viewingInvoice.status === 2 ? 'مؤكدة' :
                         viewingInvoice.status === 4 ? 'مدفوعة' :
                         viewingInvoice.status === 5 ? 'دفع جزئي' :
                         viewingInvoice.status === 3 ? 'ملغاة' : 'أخرى'}
                      </span>
                    )}
                 </h3>
                 <div className="flex gap-2">
                    {/* زر إلغاء التأكيد - يظهر للفواتير المؤكدة (وليست مسودة أو ملغاة) مع صلاحية */}
                    {viewingInvoice.status !== undefined && viewingInvoice.status !== 0 && viewingInvoice.status !== 3 && unconfirmPerm.edit && (
                      <button 
                        onClick={() => {
                          if (viewingInvoice.paidAmount > 0) {
                            notify('لا يمكن إلغاء تأكيد فاتورة عليها دفعات. قم بحذف الدفعات أولاً', 'warning');
                          } else {
                            setPendingUnconfirmInvoiceId(String(viewingInvoice.id));
                          }
                        }} 
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
                          viewingInvoice.paidAmount > 0 
                            ? 'bg-slate-400 text-white cursor-not-allowed' 
                            : 'bg-amber-500 text-white hover:bg-amber-600'
                        }`}
                        title={viewingInvoice.paidAmount > 0 ? 'لا يمكن إلغاء التأكيد - الفاتورة عليها دفعات' : 'إلغاء التأكيد لتتمكن من التعديل'}
                      >
                        <RotateCcw size={14}/> إلغاء التأكيد
                      </button>
                    )}
                    <button onClick={() => printWithFileName({ 
                      companyName: user?.companyName, 
                      type: 'فاتورة', 
                      customerName: viewingInvoice.customerName || 'نقدي', 
                      invoiceNumber: viewingInvoice.invoiceNumber 
                    })} className="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 text-sm">
                        <Printer size={16}/> طباعة
                    </button>
                    <button onClick={() => setViewInvoiceId(null)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400">
                        <X size={24}/>
                    </button>
                 </div>
              </div>

              {/* Invoice Content (Printable Area) */}
              <div className="p-5 print:p-3 print:w-full print:text-sm">
                 {/* Print Header - مضغوط مع حدود خفيفة */}
                 <div className="flex items-center justify-between border-b border-slate-300 pb-3 mb-3 print:border-b print:border-gray-300 print:pb-2 print:mb-2">
                     {/* الشعار واسم الشركة */}
                     <div className="flex items-center gap-2">
                       {user?.accountLogo ? (
                         <img src={user.accountLogo} alt="شعار" className="h-12 w-12 object-contain print:h-10 print:w-10" />
                       ) : (
                         <div className="h-12 w-12 bg-slate-50 dark:bg-slate-700 rounded flex items-center justify-center border border-slate-200 dark:border-slate-500 print:h-10 print:w-10 print:border-gray-300">
                           <Store className="text-slate-400" size={24} />
                         </div>
                       )}
                       <div>
                         <h1 className="text-lg font-bold text-slate-900 dark:text-white print:text-black print:text-base">{user?.companyName || 'المحاسب الذكي'}</h1>
                         <p className="text-sm text-slate-500 print:text-gray-500">فاتورة: {viewingInvoice.customerName || 'نقدي'}</p>
                       </div>
                     </div>
                     {/* رقم الفاتورة والتاريخ */}
                     <div className="text-left">
                       <p className="text-lg font-bold text-primary print:text-black">{viewingInvoice.invoiceNumber || `#${viewingInvoice.id}`}</p>
                       <p className="text-sm text-slate-500 print:text-gray-500">{formatDateTime(viewingInvoice.date)}</p>
                     </div>
                 </div>

                 {/* بيانات العميل والفاتورة - صف مضغوط */}
                 <div className="grid grid-cols-2 gap-3 mb-3 text-sm print:mb-2">
                     <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded print:bg-transparent print:p-2">
                         <span className="text-slate-500 print:text-gray-500">العميل: </span>
                         <span className="font-bold text-slate-800 dark:text-white print:text-black">{viewingInvoice.customerName || 'نقدي'}</span>
                         {customers.find(c => c.id === viewingInvoice.customerId)?.phone && <span className="text-slate-500 mr-2">({customers.find(c => c.id === viewingInvoice.customerId)?.phone})</span>}
                     </div>
                     <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded print:bg-transparent print:p-2">
                         <span className="text-slate-500 print:text-gray-500">الدفع: </span>
                         <span className={`font-bold print:text-black flex items-center gap-1.5 ${viewingInvoice.remainingAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                             {viewingInvoice.remainingAmount > 0 
                                 ? (viewingInvoice.paidAmount > 0 
                                     ? <><Clock size={14} className="inline" /> دفع جزئي</>
                                     : <><AlertCircle size={14} className="inline" /> آجل</>) 
                                 : <><Check size={14} className="inline" /> مدفوع بالكامل</>}
                         </span>
                     </div>
                 </div>

                 {/* Items Table - تصميم كلاسيكي مع حدود رفيعة */}
                 <div className="border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden mb-3 print:border print:border-gray-400 print:mb-2 print:rounded-none">
                     <table className="w-full text-right text-sm print:text-xs border-collapse">
                         <thead className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white print:bg-gray-100">
                             <tr>
                                 <th className="p-2.5 border border-slate-300 dark:border-slate-600 print:p-1 print:border-gray-400 w-10 text-center">#</th>
                                 <th className="p-2.5 border border-slate-300 dark:border-slate-600 print:p-1 print:border-gray-400">الصنف</th>
                                 <th className="p-2.5 border border-slate-300 dark:border-slate-600 print:p-1 print:border-gray-400 w-20 text-center">الكمية</th>
                                 <th className="p-2.5 border border-slate-300 dark:border-slate-600 print:p-1 print:border-gray-400 w-24 text-center">السعر</th>
                                 <th className="p-2.5 border border-slate-300 dark:border-slate-600 print:p-1 print:border-gray-400 w-28 text-center">المجموع</th>
                             </tr>
                         </thead>
                         <tbody>
                             {viewingInvoice.items.map((item, idx) => (
                                 <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800 print:hover:bg-transparent">
                                     <td className="p-2.5 border border-slate-200 dark:border-slate-600 print:p-1 print:border-gray-300 text-slate-500 dark:text-slate-400 text-center">{idx + 1}</td>
                                     <td className="p-2.5 border border-slate-200 dark:border-slate-600 print:p-1 print:border-gray-300 font-medium text-slate-800 dark:text-white print:text-black">{item.name}</td>
                                     <td className="p-2.5 border border-slate-200 dark:border-slate-600 print:p-1 print:border-gray-300 text-slate-600 dark:text-slate-300 text-center">{item.quantity} {typeof item.unit === 'object' ? (item.unit as any)?.name : item.unit}</td>
                                     <td className="p-2.5 border border-slate-200 dark:border-slate-600 print:p-1 print:border-gray-300 text-slate-600 dark:text-slate-300 text-center">{item.price.toLocaleString()} {currency}</td>
                                     <td className="p-2.5 border border-slate-200 dark:border-slate-600 print:p-1 print:border-gray-300 font-bold text-slate-800 dark:text-white text-center">{item.total.toLocaleString()} {currency}</td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>

                 {/* Totals - مضغوط مع حدود للطباعة */}
                 <div className="flex justify-between items-start gap-3">
                     {/* ملاحظات */}
                     <div className="flex-1 text-sm">
                       {viewingInvoice.notes && (
                         <p className="text-slate-500 print:text-gray-600"><b>ملاحظات:</b> {viewingInvoice.notes}</p>
                       )}
                     </div>
                     {/* الإجماليات */}
                     <div className="w-52 print:w-44 text-sm print:text-xs">
                         <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden print:border print:border-gray-400 print:rounded-none">
                             <div className="flex justify-between p-2 print:p-1 border-b border-slate-200 dark:border-slate-700 print:border-b print:border-gray-300">
                                 <span className="text-slate-600 print:text-gray-700">الإجمالي:</span>
                                 <span className="font-bold text-slate-900 dark:text-white print:text-black">{viewingInvoice.totalAmount.toLocaleString()} {currency}</span>
                             </div>
                             <div className="flex justify-between items-center p-2 print:p-1 border-b border-slate-200 dark:border-slate-700 print:border-b print:border-gray-300 text-emerald-600 print:text-gray-700">
                                 <span className="flex items-center gap-1"><Check size={14} /> المدفوع:</span>
                                 <span className="print:text-black">{viewingInvoice.paidAmount.toLocaleString()} {currency}</span>
                             </div>
                             <div className={`flex justify-between items-center p-2 print:p-1 border-t-2 border-slate-400 dark:border-slate-500 print:border-t print:border-gray-400 ${viewingInvoice.remainingAmount > 0 ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'} print:bg-gray-100`}>
                                 <span className={`font-bold flex items-center gap-1 ${viewingInvoice.remainingAmount > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'} print:text-black`}>
                                     {viewingInvoice.remainingAmount > 0 ? <AlertCircle size={14} /> : <Check size={14} />} المتبقي:
                                 </span>
                                 <span className={`font-bold ${viewingInvoice.remainingAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} print:text-black`}>
                                     {viewingInvoice.remainingAmount > 0 ? viewingInvoice.remainingAmount.toLocaleString() : '✓ مسددة'} {viewingInvoice.remainingAmount > 0 ? currency : ''}
                                 </span>
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* Payments Section - قسم الدفعات */}
                 {viewingInvoice.payments && viewingInvoice.payments.length > 0 && (
                   <div className="mt-4 print:hidden">
                     <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                       <CreditCard size={16} /> سجل الدفعات ({viewingInvoice.payments.length})
                     </h4>
                     <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                       <table className="w-full text-sm">
                         <thead className="bg-slate-50 dark:bg-slate-800">
                           <tr>
                             <th className="p-2 text-right text-slate-600 dark:text-slate-400">#</th>
                             <th className="p-2 text-right text-slate-600 dark:text-slate-400">المبلغ</th>
                             <th className="p-2 text-right text-slate-600 dark:text-slate-400">التاريخ</th>
                             <th className="p-2 text-right text-slate-600 dark:text-slate-400">طريقة الدفع</th>
                             {pagePerms.canDelete && <th className="p-2 text-center text-slate-600 dark:text-slate-400 w-16">حذف</th>}
                           </tr>
                         </thead>
                         <tbody>
                           {viewingInvoice.payments.map((payment, idx) => (
                             <tr key={payment.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                               <td className="p-2 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                               <td className="p-2 font-medium text-emerald-600 dark:text-emerald-400">{payment.amount.toLocaleString()} {currency}</td>
                               <td className="p-2 text-slate-600 dark:text-slate-300">{formatDate(payment.paymentDate)}</td>
                               <td className="p-2 text-slate-600 dark:text-slate-300">
                                 {payment.paymentMethod === 'Cash' || payment.paymentMethod === 0 ? 'نقدي' : 
                                  payment.paymentMethod === 'BankTransfer' || payment.paymentMethod === 1 ? 'تحويل بنكي' :
                                  payment.paymentMethod === 'Check' || payment.paymentMethod === 2 ? 'شيك' : 'أخرى'}
                               </td>
                               {pagePerms.canDelete && (
                                 <td className="p-2 text-center">
                                   <button
                                     onClick={() => setPendingDeletePayment({
                                       invoiceId: viewingInvoice.id,
                                       paymentId: payment.id,
                                       amount: payment.amount
                                     })}
                                     className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded"
                                     title="حذف الدفعة"
                                   >
                                     <Trash2 size={14} />
                                   </button>
                                 </td>
                               )}
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 )}

                 {/* Footer */}
                 <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-600 text-center text-xs text-slate-400 print:mt-2 print:pt-1.5 print:border-t print:border-gray-200">
                     <p>{user?.companyName || 'المحاسب الذكي'} | {viewingInvoice.customerName || 'نقدي'}</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* --- MAIN VIEW --- */}

      {view === 'list' ? (
        // Hide this entire List View container if an invoice modal is open AND we are printing.
        // This prevents the list from appearing behind the modal content in the printout.
        <div className={`space-y-4 ${viewingInvoice ? 'print:hidden' : ''}`}>
          
          {/* Header Controls: Hidden during print */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">قائمة الفواتير والمبيعات</h2>
              {/* View Mode Toggle */}
              <div className="flex bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-0.5">
                <button
                  onClick={() => setListViewMode('table')}
                  className={`p-1.5 rounded transition-all ${listViewMode === 'table' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                  title="عرض صفوف"
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => setListViewMode('grid')}
                  className={`p-1.5 rounded transition-all ${listViewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                  title="عرض شبكي"
                >
                  <Grid3X3 size={18} />
                </button>
              </div>
              
              {/* Manual Refresh Button */}
              <button
                onClick={manualRefresh}
                disabled={isRefreshing}
                className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
                title="تحديث البيانات"
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                {/* Header Search Input */}
                <div className="relative flex-1 md:w-64">
                    <Search size={18} className="absolute right-3 top-2.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="بحث برقم الفاتورة أو اسم العميل..." 
                      className="w-full pr-10 pl-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:border-primary outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm"
                      value={listSearchQuery}
                      onChange={e => setListSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    <button 
                      onClick={() => printWithFileName({ 
                        companyName: user?.companyName, 
                        type: 'قائمة الفواتير' 
                      })}
                      className="bg-slate-800 dark:bg-slate-700 text-white px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors shadow-sm text-sm"
                    >
                      <Printer size={16} />
                      <span>طباعة</span>
                    </button>

                    {pagePerms.canCreate && (
                      <button 
                        onClick={() => {
                            setEditingInvoiceId(null);
                            setSelectedCustomerId('');
                            setItems([]);
                            setCurrentPaidAmount(0);
                            setInvoiceNotes('');
                            setView('create');
                        }}
                        className="bg-primary hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-200 dark:shadow-none text-sm"
                      >
                        <Plus size={16} />
                        <span>إضافة</span>
                      </button>
                    )}
                </div>
            </div>
          </div>
          
          {/* فلاتر الفترة الزمنية */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 print:hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* أزرار الفترة السريعة */}
              <div className="flex flex-wrap bg-slate-100 dark:bg-slate-700 p-1 rounded-lg gap-0.5">
                <button 
                  onClick={() => setDateRange('all')} 
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${filterPeriod === 'all' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                  الكل
                </button>
                <button 
                  onClick={() => setDateRange('week')} 
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${filterPeriod === 'week' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                  أسبوع
                </button>
                <button 
                  onClick={() => setDateRange('month')} 
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${filterPeriod === 'month' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                  شهر
                </button>
                <button 
                  onClick={() => setDateRange('year')} 
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${filterPeriod === 'year' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                  سنة
                </button>
                <button 
                  onClick={() => setDateRange('custom')} 
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${filterPeriod === 'custom' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                  مخصص
                </button>
              </div>
              
              {/* حقول التاريخ المخصص - تظهر فقط عند اختيار "مخصص" */}
              {filterPeriod === 'custom' && (
                <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-500">من:</span>
                    <DateInput
                      value={filterDateFrom}
                      onChange={setFilterDateFrom}
                      className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-primary w-28"
                      placeholder="يوم-شهر-سنة"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">إلى:</span>
                    <DateInput
                      value={filterDateTo}
                      onChange={setFilterDateTo}
                      className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-primary w-28"
                      placeholder="يوم-شهر-سنة"
                    />
                  </div>
                </div>
              )}
              
              {/* عداد النتائج */}
              <div className="text-xs text-slate-500 sm:mr-auto">
                <span className="font-bold text-primary">{filteredInvoices.length}</span> فاتورة
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 overflow-hidden print:shadow-none print:border-black backdrop-blur-sm">
            {/* List Header for Print Only */}
            <div className="hidden print:block text-center p-4 border-b border-black">
                <h2 className="text-xl font-bold">تقرير الفواتير</h2>
                <p className="text-sm">عدد الفواتير: {filteredInvoices.length}</p>
            </div>

            {/* Table View */}
            {listViewMode === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right min-w-[600px] md:min-w-full text-sm print:text-xs print:border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 print:bg-gray-100 print:text-black">
                    <tr className="text-slate-600 dark:text-slate-400">
                      <th className="p-4 text-center w-[140px] print:hidden no-print">أدوات</th>
                      <th className="p-4 whitespace-nowrap print:p-1.5 print:border print:border-gray-400">رقم الفاتورة</th>
                      <th className="p-4 whitespace-nowrap print:p-1.5 print:border print:border-gray-400">العميل</th>
                      <th className="p-4 whitespace-nowrap print:p-1.5 print:border print:border-gray-400">التاريخ</th>
                      <th className="p-4 whitespace-nowrap print:p-1.5 print:border print:border-gray-400">إجمالي ({currency})</th>
                      <th className="p-4 whitespace-nowrap print:p-1.5 print:border print:border-gray-400">مدفوع</th>
                      <th className="p-4 whitespace-nowrap print:p-1.5 print:border print:border-gray-400">متبقي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 print:divide-y-0">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors print:hover:bg-transparent">
                        <td className="p-4 flex justify-center gap-1 print:hidden no-print">
                           <button 
                            className="flex items-center gap-1 px-2 py-1.5 text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors text-xs font-medium" 
                            title="عرض وطباعة"
                            onClick={() => setViewInvoiceId(String(inv.id))}
                          >
                            <Eye size={14} />
                            <span>عرض</span>
                          </button>
                           {pagePerms.canEdit && (
                            <button 
                              className="flex items-center gap-1 px-2 py-1.5 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-xs font-medium" 
                              title="تعديل الفاتورة"
                              onClick={() => requestEditInvoice(String(inv.id))}
                            >
                              <Edit2 size={14} />
                              <span>تعديل</span>
                            </button>
                          )}
                          {pagePerms.canDelete && (
                            <button 
                              className="flex items-center gap-1 px-2 py-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors text-xs font-medium" 
                              title="حذف الفاتورة"
                              onClick={() => setDeleteInvoiceId(String(inv.id))}
                            >
                              <Trash2 size={14} />
                              <span>حذف</span>
                            </button>
                          )}
                        </td>
                        <td className="p-4 text-primary dark:text-blue-400 font-bold print:text-black print:p-1.5 print:border print:border-gray-300 print:font-normal">{inv.invoiceNumber || `#${inv.id}`}</td>
                        <td className="p-4 font-medium text-slate-800 dark:text-slate-200 print:p-1.5 print:border print:border-gray-300 print:font-normal print:text-black">{inv.customerName}</td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 print:p-1.5 print:border print:border-gray-300 print:text-black">{formatDateTime(inv.date)}</td>
                        <td className="p-4 font-bold text-slate-800 dark:text-white print:p-1.5 print:border print:border-gray-300 print:font-semibold print:text-black print:text-center">{inv.totalAmount.toLocaleString()}</td>
                        <td className="p-4 text-emerald-600 dark:text-emerald-400 print:p-1.5 print:border print:border-gray-300 print:text-black print:text-center">{inv.paidAmount.toLocaleString()}</td>
                        <td className="p-4 text-rose-600 dark:text-rose-400 font-bold print:p-1.5 print:border print:border-gray-300 print:font-semibold print:text-black print:text-center">{inv.remainingAmount.toLocaleString()}</td>
                      </tr>
                    ))}
                    {filteredInvoices.length === 0 && (
                        <tr><td colSpan={7} className="p-8 text-center text-slate-400">لا توجد فواتير مطابقة</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Grid View */}
            {listViewMode === 'grid' && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInvoices.map((inv) => (
                  <div 
                    key={inv.id} 
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition-all group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2">
                        <FileText size={20} className={inv.remainingAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono text-slate-400">{inv.invoiceNumber || `#${inv.id}`}</span>
                        {inv.type === 'كاش' ? (
                          <Banknote size={14} className="text-emerald-500" title="نقدي" />
                        ) : (
                          <CreditCard size={14} className="text-amber-500" title="آجل" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <User size={14} className="text-slate-400" />
                      <h4 className="font-bold text-slate-800 dark:text-white truncate">{inv.customerName}</h4>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar size={12} />
                      {formatDateTime(inv.date)}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                      <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-2">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">الإجمالي</span>
                        <span className="font-bold text-slate-800 dark:text-white text-sm">{inv.totalAmount.toLocaleString()}</span>
                      </div>
                      <div className="rounded-lg p-2 border border-slate-200 dark:border-slate-600">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">مدفوع</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{inv.paidAmount.toLocaleString()}</span>
                      </div>
                      <div className="rounded-lg p-2 border border-slate-200 dark:border-slate-600">
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 block">متبقي</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">{inv.remainingAmount.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
                      <span className={`text-xs font-medium ${inv.remainingAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {inv.remainingAmount > 0 ? `متبقي: ${inv.remainingAmount.toLocaleString()}` : 'مسددة بالكامل'}
                      </span>
                      <div className="flex gap-0.5">
                        <button onClick={() => setViewInvoiceId(String(inv.id))} className="flex items-center gap-0.5 px-1.5 py-1 text-emerald-600 hover:text-emerald-800 dark:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded text-[10px] font-medium" title="عرض">
                          <Eye size={12} />
                          <span>عرض</span>
                        </button>
                        {pagePerms.canEdit && (
                          <button onClick={() => requestEditInvoice(String(inv.id))} className="flex items-center gap-0.5 px-1.5 py-1 text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded text-[10px] font-medium" title="تعديل">
                            <Edit2 size={12} />
                            <span>تعديل</span>
                          </button>
                        )}
                        {pagePerms.canDelete && (
                          <button onClick={() => setDeleteInvoiceId(String(inv.id))} className="flex items-center gap-0.5 px-1.5 py-1 text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded text-[10px] font-medium" title="حذف">
                            <Trash2 size={12} />
                            <span>حذف</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredInvoices.length === 0 && (
                  <div className="col-span-full p-8 text-center text-slate-400">
                    <FileText size={48} className="mx-auto mb-3 opacity-30" />
                    لا توجد فواتير مطابقة
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Create/Edit Invoice View - Enhanced Design */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-left-4 duration-300">
          
          {/* Right Column: Invoice Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800/95 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${editingInvoiceId 
                      ? 'bg-blue-100 dark:bg-blue-900/30' 
                      : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                      {editingInvoiceId 
                        ? <Edit2 size={24} className="text-blue-600 dark:text-blue-400"/> 
                        : <FileText size={24} className="text-emerald-600 dark:text-emerald-400"/>}
                    </div>
                    <div>
                      <h3 className={`font-bold text-xl ${editingInvoiceId 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {editingInvoiceId ? 'تعديل الفاتورة' : 'إنشاء فاتورة جديدة'}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                        {editingInvoiceId ? 'قم بتحديث بيانات الفاتورة' : 'أنشئ فاتورة مبيعات جديدة'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSaveRequest} 
                      className={`px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 ${
                        editingInvoiceId 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25' 
                          : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/25'
                      }`}
                    >
                      <Save size={18} /> {editingInvoiceId ? 'حفظ التعديلات' : 'حفظ الفاتورة'}
                    </button>
                    <button 
                      onClick={handleCancelInvoice} 
                      className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center gap-2"
                    >
                      <XCircle size={18} /> إلغاء
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      <User size={16} className="text-blue-500" />
                      العميل
                    </label>
                    <SearchableSelect 
                      options={customers.map(c => ({ id: String(c.id), label: c.name, subLabel: c.phone || '' }))}
                      value={selectedCustomerId}
                      onChange={setSelectedCustomerId}
                      placeholder="اختر العميل..."
                      disabled={isLoading}
                    />
                  </div>
                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      <Calendar size={16} className="text-amber-500" />
                      تاريخ الفاتورة
                    </label>
                    <DateInput 
                      className="w-full border-2 border-slate-200 dark:border-slate-600 rounded-xl p-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white transition-all"
                      value={date}
                      onChange={setDate}
                      disabled={isLoading}
                    />
                  </div>
                </div>

              {/* Add Item Section */}
              <div className={`bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border-2 ${editingItemId ? 'border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-600'} mb-6`}>
                 <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${editingItemId ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                     <Package size={16} className={editingItemId ? 'text-amber-500' : 'text-purple-500'} />
                     {editingItemId ? 'تعديل الصنف المحدد' : 'إضافة أصناف للفاتورة'}
                 </h4>
                 
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
                     <div className="md:col-span-4">
                         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">المنتج (بحث)</label>
                         <SearchableSelect 
                            options={products.map(p => ({ id: String(p.id), label: p.name, subLabel: `${p.price} ${currency}` }))}
                            value={selectedProductId}
                            onChange={handleProductSelect}
                            placeholder="اختر منتج..."
                            disabled={isLoading}
                         />
                     </div>
                     <div className="md:col-span-3">
                         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">اسم الصنف</label>
                         <input 
                            type="text" 
                            className="w-full border p-2 rounded text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white dark:border-slate-600" 
                            value={itemName} 
                            onChange={e => setItemName(e.target.value)}
                            placeholder="اسم المنتج"
                         />
                     </div>
                     <div className="md:col-span-2">
                         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">الكمية</label>
                         <input 
                            type="number" 
                            className="w-full border p-2 rounded text-center text-sm font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-white dark:border-slate-600" 
                            value={itemQty} 
                            onChange={e => setItemQty(Number(e.target.value))}
                            min="1"
                         />
                     </div>
                     <div className="md:col-span-2">
                         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">السعر</label>
                         <input 
                            type="number" 
                            className="w-full border p-2 rounded text-center text-sm font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-white dark:border-slate-600" 
                            value={itemPrice} 
                            onChange={e => setItemPrice(Number(e.target.value))}
                            min="0"
                         />
                     </div>
                     <div className="md:col-span-1 flex items-end">
                         <button 
                            onClick={saveItem}
                            className={`w-full p-2 rounded text-white flex justify-center items-center transition-colors ${editingItemId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-800 hover:bg-slate-700'}`}
                         >
                             {editingItemId ? <Check size={18}/> : <Plus size={18}/>}
                         </button>
                     </div>
                 </div>
                 {editingItemId && (
                     <div className="flex justify-end">
                         <button onClick={cancelEditItem} className="text-xs text-rose-500 hover:underline flex items-center gap-1">
                             <XCircle size={12}/> إلغاء تعديل الصنف
                         </button>
                     </div>
                 )}
              </div>

              {/* Items List */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="p-3">م</th>
                      <th className="p-3">الصنف</th>
                      <th className="p-3">الكمية</th>
                      <th className="p-3">السعر</th>
                      <th className="p-3">الإجمالي</th>
                      <th className="p-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {items.map((item, idx) => (
                      <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 ${editingItemId === item.id ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`}>
                        <td className="p-3 text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-medium text-slate-800 dark:text-white">{item.name}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{item.quantity} {typeof item.unit === 'object' ? (item.unit as any)?.name : item.unit}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{item.price}</td>
                        <td className="p-3 font-bold text-slate-800 dark:text-white">{item.total.toLocaleString()}</td>
                        <td className="p-3 flex justify-end gap-1">
                          <button onClick={() => prepareEditItem(item)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-600 rounded">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setDeleteItemId(item.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-600 rounded">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">لم يتم إضافة أصناف بعد</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            </div>
          </div>

          {/* Left Column: Summary & Payment */}
          <div className="lg:col-span-1 space-y-6">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 transition-colors">
                 <h4 className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-4">ملخص الفاتورة</h4>
                 <div className="flex justify-between items-center mb-2">
                     <span className="text-slate-600 dark:text-slate-300">عدد الأصناف</span>
                     <span className="font-bold text-slate-800 dark:text-white">{items.length}</span>
                 </div>
                 <div className="flex justify-between items-center mb-6 pt-2 border-t border-slate-200 dark:border-slate-700">
                     <span className="text-xl font-bold text-slate-800 dark:text-white">الإجمالي النهائي</span>
                     <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalInvoice.toLocaleString()} <span className="text-sm text-slate-500 dark:text-slate-400">{currency}</span></span>
                 </div>

                 {/* Only show payment type selector if new invoice */}
                 {!editingInvoiceId && (
                     <div className="mt-4">
                         <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">نوع الفاتورة</label>
                         <div className="flex bg-slate-100 dark:bg-slate-700 rounded p-1">
                             <button 
                                onClick={() => {
                                    setPaymentType(PaymentType.CASH);
                                    setCurrentPaidAmount(totalInvoice); // كاش = مدفوع بالكامل
                                }}
                                className={`flex-1 py-2 text-sm font-bold rounded transition-all ${paymentType === PaymentType.CASH ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                             >
                                 💵 كاش (نقدي)
                             </button>
                             <button 
                                onClick={() => {
                                    setPaymentType(PaymentType.CREDIT);
                                    setCurrentPaidAmount(0); // آجل = يبدأ من صفر
                                }}
                                className={`flex-1 py-2 text-sm font-bold rounded transition-all ${paymentType === PaymentType.CREDIT ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                             >
                                 📋 آجل (دين)
                             </button>
                         </div>
                     </div>
                 )}

                 {/* Payment Input - Only for CREDIT (آجل) invoices */}
                 {!editingInvoiceId && paymentType === PaymentType.CREDIT && (
                     <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
                         <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">💰 المدفوع مقدماً (اختياري)</label>
                         <input 
                            type="number" 
                            className="w-full bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-600 rounded p-2 text-slate-900 dark:text-white text-center font-bold outline-none focus:border-amber-500 transition-colors"
                            value={currentPaidAmount}
                            onChange={e => setCurrentPaidAmount(Math.min(Number(e.target.value), totalInvoice))}
                            placeholder="0.00"
                            max={totalInvoice}
                         />
                         <div className="flex justify-between items-center mt-3 text-sm bg-white dark:bg-slate-800 p-2 rounded">
                             <span className="text-rose-600 dark:text-rose-400 font-bold">الدين المتبقي:</span>
                             <span className="font-bold text-rose-600 dark:text-rose-400 text-lg">{(totalInvoice - currentPaidAmount).toLocaleString()} {currency}</span>
                         </div>
                     </div>
                 )}

                 {/* Cash Payment Input - للكاش مع إمكانية الدفع الجزئي */}
                 {!editingInvoiceId && paymentType === PaymentType.CASH && totalInvoice > 0 && (
                     <div className="mt-4 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-700">
                         <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2">💵 المبلغ المدفوع نقداً</label>
                         <input 
                            type="number" 
                            className="w-full bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-600 rounded p-2 text-slate-900 dark:text-white text-center font-bold outline-none focus:border-emerald-500 transition-colors"
                            value={currentPaidAmount}
                            onChange={e => setCurrentPaidAmount(Math.min(Number(e.target.value), totalInvoice))}
                            placeholder="0.00"
                            max={totalInvoice}
                         />
                         {currentPaidAmount < totalInvoice && currentPaidAmount > 0 && (
                             <div className="flex justify-between items-center mt-3 text-sm bg-white dark:bg-slate-800 p-2 rounded">
                                 <span className="text-rose-600 dark:text-rose-400 font-bold">المتبقي:</span>
                                 <span className="font-bold text-rose-600 dark:text-rose-400 text-lg">{(totalInvoice - currentPaidAmount).toLocaleString()} {currency}</span>
                             </div>
                         )}
                         {currentPaidAmount >= totalInvoice && (
                             <div className="flex items-center justify-center mt-3 text-sm bg-white dark:bg-slate-800 p-2 rounded">
                                 <span className="text-emerald-600 dark:text-emerald-400 font-bold">✅ مدفوع بالكامل</span>
                             </div>
                         )}
                     </div>
                 )}
             </div>

             <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                 <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">ملاحظات الفاتورة</label>
                 <textarea 
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm h-32 resize-none outline-none focus:border-primary bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    placeholder="شروط الدفع، ملاحظات التسليم..."
                    value={invoiceNotes}
                    onChange={e => setInvoiceNotes(e.target.value)}
                 ></textarea>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
