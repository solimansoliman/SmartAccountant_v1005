
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UserPlus, Search, FileText, Wallet, Calendar, Phone, User, Trash2, AlertTriangle, Edit2, Save, XCircle, StickyNote, Loader2, Grid3X3, List, Plus, Printer, Eye, X, CreditCard, Banknote, Store, Filter } from 'lucide-react';
import { useCustomers, useInvoices } from '../services/dataHooks';
import { useNotification } from '../context/NotificationContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { paymentsApi, ApiPaymentDto } from '../services/apiService';
import { formatDateTime, formatDate } from '../services/dateService';
import { printWithFileName } from '../services/fileNameService';
import DateInput from '../components/DateInput';
import { usePagePermission } from '../services/permissionsHooks';
import AccessDenied from '../components/AccessDenied';

type ViewMode = 'grid' | 'table';

const Customers: React.FC = () => {
  // ==================== Hooks أولاً (React requires all hooks before any return) ====================
  const { notify } = useNotification();
  const { currency, defaultViewMode } = useSettings();
  const { user } = useAuth();
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Date Filter State
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  
  // View Mode State - يستخدم الإعداد الافتراضي من النظام
  const [listViewMode, setListViewMode] = useState<ViewMode>(defaultViewMode || 'grid');
  
  // API Hooks
  const { 
    customers, 
    loading: customersLoading, 
    error: customersError,
    addCustomer: apiAddCustomer,
    updateCustomer: apiUpdateCustomer,
    deleteCustomer: apiDeleteCustomer
  } = useCustomers();
  
  const { invoices, loading: invoicesLoading } = useInvoices();
  
  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null);
  
  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form State (Add / Edit)
  const [formCustName, setFormCustName] = useState('');
  const [formCustPhone, setFormCustPhone] = useState('');
  const [formCustNotes, setFormCustNotes] = useState('');
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  // Confirmation States
  const [pendingEditCustomer, setPendingEditCustomer] = useState<typeof customers[0] | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // Details View State
  const customerInvoices = useMemo(() => {
    if (!selectedCustomer) return [];
    return invoices.filter(i => i.customerId === selectedCustomer.id);
  }, [selectedCustomer, invoices]);
  
  // Payment Modal State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payInvoiceId, setPayInvoiceId] = useState<number | null>(null);
  const [payMaxAmount, setPayMaxAmount] = useState<number>(0); // المبلغ المتبقي المستحق
  const [payInvoiceNumber, setPayInvoiceNumber] = useState<string>(''); // رقم الفاتورة للعرض
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [customerPayments, setCustomerPayments] = useState<ApiPaymentDto[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // ==================== صلاحيات الصفحة (بعد كل الـ hooks) ====================
  const pagePerms = usePagePermission('customers');
  
  // إذا لم يكن لديه صلاحية عرض الصفحة
  if (pagePerms.checked && !pagePerms.canView) {
    return <AccessDenied />;
  }
  
  // Date Range Helper
  const setDateRange = (type: 'all' | 'week' | 'month' | 'year') => {
    const today = new Date();
    let start = new Date();
    const end = today;
    
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
    }
    
    const formatDateValue = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    setFilterDateFrom(formatDateValue(start));
    setFilterDateTo(formatDateValue(end));
    setFilterPeriod(type);
  };

  // Fetch customer payments when selected
  const fetchCustomerPayments = useCallback(async (customerId: number) => {
    setPaymentsLoading(true);
    try {
      const payments = await paymentsApi.getByCustomer(customerId);
      setCustomerPayments(payments);
    } catch (err) {
      console.error('فشل في جلب الدفعات:', err);
      setCustomerPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerPayments(selectedCustomer.id);
    } else {
      setCustomerPayments([]);
    }
  }, [selectedCustomer, fetchCustomerPayments]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // فلتر البحث
      const matchesSearch = c.name.includes(searchQuery) || 
        (c.phone && c.phone.includes(searchQuery));
      
      // فلتر التاريخ - بناءً على تاريخ آخر فاتورة للعميل
      let matchesDate = true;
      if (filterDateFrom || filterDateTo) {
        // جلب فواتير هذا العميل
        const customerInvs = invoices.filter(inv => inv.customerId === c.id);
        if (customerInvs.length === 0) {
          matchesDate = false; // إذا لا توجد فواتير، لا يظهر في الفلتر
        } else {
          // التحقق من وجود فاتورة واحدة على الأقل ضمن الفترة
          matchesDate = customerInvs.some(inv => {
            const invDate = new Date(inv.date);
            let inRange = true;
            if (filterDateFrom) {
              const fromDate = new Date(filterDateFrom);
              inRange = inRange && invDate >= fromDate;
            }
            if (filterDateTo) {
              const toDate = new Date(filterDateTo);
              toDate.setHours(23, 59, 59);
              inRange = inRange && invDate <= toDate;
            }
            return inRange;
          });
        }
      }
      
      return matchesSearch && matchesDate;
    });
  }, [customers, searchQuery, filterDateFrom, filterDateTo, invoices]);

  // Handle Form Submission (Start request)
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustName) {
        notify('اسم العميل مطلوب', 'error');
        return;
    }
    
    if (editingCustomerId) {
        setShowSaveConfirmation(true);
    } else {
        performSaveCustomer();
    }
  };

  const performSaveCustomer = async () => {
    setFormLoading(true);
    try {
        if (editingCustomerId) {
            await apiUpdateCustomer(editingCustomerId, { 
                name: formCustName, 
                phone: formCustPhone,
                notes: formCustNotes
            });
            notify('تم تعديل بيانات العميل بنجاح', 'success');
            setEditingCustomerId(null);
        } else {
            await apiAddCustomer({ 
                name: formCustName, 
                phone: formCustPhone,
                notes: formCustNotes
            });
            notify('تم إضافة العميل بنجاح', 'success');
        }
        
        setFormCustName('');
        setFormCustPhone('');
        setFormCustNotes('');
        setView('list');
    } catch (err: any) {
        notify(err.message || 'حدث خطأ أثناء الحفظ', 'error');
    } finally {
        setFormLoading(false);
        setShowSaveConfirmation(false);
    }
  };

  // Start Editing Flow
  const requestEditCustomer = (customer: typeof customers[0]) => {
      setPendingEditCustomer(customer);
  };

  const confirmEditCustomer = () => {
      if (pendingEditCustomer) {
          setEditingCustomerId(pendingEditCustomer.id);
          setFormCustName(pendingEditCustomer.name);
          setFormCustPhone(pendingEditCustomer.phone || '');
          setFormCustNotes(pendingEditCustomer.notes || '');
          notify(`بدء تعديل بيانات العميل: ${pendingEditCustomer.name}`, 'info');
          setPendingEditCustomer(null);
          setView('create');
      }
  };

  const cancelEdit = () => {
      setEditingCustomerId(null);
      setFormCustName('');
      setFormCustPhone('');
      setFormCustNotes('');
      setView('list');
  };

  const openDetails = (customer: typeof customers[0]) => {
    setSelectedCustomer(customer);
    setView('detail');
  };

  const confirmDelete = async () => {
      if (deleteId) {
          try {
              await apiDeleteCustomer(deleteId);
              notify('تم حذف العميل بنجاح', 'success');
          } catch(err: any) {
              notify(err.message || 'حدث خطأ أثناء الحذف', 'error');
          }
          setDeleteId(null);
      }
  };

  const handleAddPayment = async () => {
    if (payAmount <= 0) {
      notify('يرجى إدخال مبلغ صحيح', 'warning');
      return;
    }
    if (!selectedCustomer) {
      notify('يرجى اختيار عميل', 'error');
      return;
    }

    setPaymentLoading(true);
    try {
      await paymentsApi.create({
        customerId: selectedCustomer.id,
        invoiceId: payInvoiceId || undefined,
        amount: payAmount,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'Cash',
        paymentType: 'Receipt',
        notes: payInvoiceId ? `دفعة على فاتورة ${payInvoiceNumber}` : 'دفعة على الحساب',
      });
      notify(`تم تسجيل دفعة بمبلغ ${payAmount.toLocaleString()} ${currency}`, 'success');
      setShowPayModal(false);
      setPayAmount(0);
      setPayInvoiceId(null);
      setPayInvoiceNumber('');
      setPayMaxAmount(0);
      // تحديث الدفعات
      fetchCustomerPayments(selectedCustomer.id);
    } catch (err: any) {
      notify(err.message || 'فشل في تسجيل الدفعة', 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  const customerTotalDue = useMemo(() => {
     return customerInvoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);
  }, [customerInvoices]);

  // Loading state
  if (customersLoading || invoicesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">جاري تحميل بيانات العملاء...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (customersError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <p className="text-rose-500 font-bold mb-2">حدث خطأ</p>
          <p className="text-slate-500 dark:text-slate-400">{customersError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      
      {/* 1. Edit Confirmation Modal */}
      {pendingEditCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-blue-600 mb-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full"><Edit2 size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">تعديل بيانات العميل</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
                هل تريد تعديل بيانات العميل: <span className="font-bold">{pendingEditCustomer.name}</span>؟
            </p>
            <div className="flex gap-3">
              <button onClick={confirmEditCustomer} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors">نعم، ابدأ التعديل</button>
              <button onClick={() => setPendingEditCustomer(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Save Changes Modal */}
      {showSaveConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-emerald-600 mb-4">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-full"><Save size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">حفظ التغييرات</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">هل أنت متأكد من حفظ التعديلات على بيانات العميل؟</p>
            <div className="flex gap-3">
              <button onClick={performSaveCustomer} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-bold hover:bg-emerald-700 transition-colors">تأكيد الحفظ</button>
              <button onClick={() => setShowSaveConfirmation(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">تراجع</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
                <div className="bg-rose-100 dark:bg-rose-900/30 p-2 rounded-full"><AlertTriangle size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">تأكيد حذف العميل</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm leading-relaxed">
                هل أنت متأكد من حذف هذا العميل؟<br/>
                <span className="text-xs text-rose-500 block mt-1">سيتم حذف العميل لكن ستبقى الفواتير مرتبطة به.</span>
            </p>
            <div className="flex gap-3">
              <button onClick={confirmDelete} className="flex-1 bg-rose-600 text-white py-2.5 rounded-lg font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200">نعم، احذف</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN VIEW --- */}

      {view === 'list' ? (
        <div className="space-y-4">
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">قائمة العملاء</h2>
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
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                {/* Header Search Input */}
                <div className="relative flex-1 md:w-64">
                    <Search size={18} className="absolute right-3 top-2.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="بحث بالاسم أو رقم الهاتف..." 
                      className="w-full pr-10 pl-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:border-primary outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    <button 
                      onClick={() => printWithFileName({ 
                        companyName: user?.companyName, 
                        type: 'قائمة العملاء' 
                      })}
                      className="bg-slate-800 dark:bg-slate-700 text-white px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors shadow-sm text-sm"
                    >
                      <Printer size={16} />
                      <span>طباعة</span>
                    </button>

                    {pagePerms.canCreate && (
                      <button 
                        onClick={() => {
                            setEditingCustomerId(null);
                            setFormCustName('');
                            setFormCustPhone('');
                            setFormCustNotes('');
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
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-2 sm:p-4 print:hidden">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-4">
              {/* أزرار الفترة السريعة */}
              <div className="flex bg-slate-100 dark:bg-slate-700 p-0.5 sm:p-1 rounded-lg overflow-x-auto">
                <button 
                  onClick={() => setDateRange('all')} 
                  className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all whitespace-nowrap ${filterPeriod === 'all' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                  الكل
                </button>
                <button 
                  onClick={() => setDateRange('week')} 
                  className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all whitespace-nowrap ${filterPeriod === 'week' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                  الأسبوع
                </button>
                <button 
                  onClick={() => setDateRange('month')} 
                  className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all whitespace-nowrap ${filterPeriod === 'month' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                  الشهر
                </button>
                <button 
                  onClick={() => setDateRange('year')} 
                  className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all whitespace-nowrap ${filterPeriod === 'year' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                  السنة
                </button>
                <button 
                  onClick={() => setFilterPeriod('custom')} 
                  className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all whitespace-nowrap ${filterPeriod === 'custom' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                  مخصص
                </button>
              </div>
              
              {/* حقول التاريخ المخصص - تظهر فقط عند اختيار "تاريخ مخصص" */}
              {filterPeriod === 'custom' && (
                <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                  <Calendar size={14} className="text-primary hidden sm:block" />
                  <span className="text-[10px] sm:text-xs text-slate-500">من:</span>
                  <DateInput
                    value={filterDateFrom}
                    onChange={setFilterDateFrom}
                    className="px-2 py-1 sm:py-1.5 text-[10px] sm:text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-primary w-24 sm:w-32"
                    placeholder="يوم-شهر-سنة"
                  />
                  <span className="text-[10px] sm:text-xs text-slate-500">إلى:</span>
                  <DateInput
                    value={filterDateTo}
                    onChange={setFilterDateTo}
                    className="px-2 py-1 sm:py-1.5 text-[10px] sm:text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-primary w-24 sm:w-32"
                    placeholder="يوم-شهر-سنة"
                  />
                </div>
              )}
              
              {/* عداد النتائج */}
              <div className="text-[10px] sm:text-xs text-slate-500 sm:mr-auto w-full sm:w-auto text-center sm:text-right pt-1 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-700">
                عدد العملاء: <span className="font-bold text-primary">{filteredCustomers.length}</span>
                {filterPeriod !== 'all' && <span className="text-slate-400 mr-1 sm:mr-2 hidden sm:inline">(عملاء لديهم فواتير في الفترة المحددة)</span>}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 overflow-hidden print:shadow-none print:border-black backdrop-blur-sm">
            {/* List Header for Print Only */}
            <div className="hidden print:block text-center p-4 border-b border-black">
                <h2 className="text-xl font-bold">قائمة العملاء</h2>
                <p className="text-sm">عدد العملاء: {filteredCustomers.length}</p>
            </div>

            {/* Table View */}
            {listViewMode === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right min-w-[600px] md:min-w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 print:bg-gray-200 print:text-black">
                    <tr className="text-slate-600 dark:text-slate-400">
                      <th className="p-4 whitespace-nowrap">رقم</th>
                      <th className="p-4 whitespace-nowrap">الاسم</th>
                      <th className="p-4 whitespace-nowrap">الهاتف</th>
                      <th className="p-4 whitespace-nowrap">ملاحظات</th>
                      <th className="p-4 text-center w-[140px] print:hidden no-print">أدوات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 print:divide-black">
                    {filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <td className="p-4 text-primary dark:text-blue-400 font-bold print:text-black">#{c.id}</td>
                        <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{c.name}</td>
                        <td className="p-4 text-slate-500 dark:text-slate-400" dir="ltr">{c.phone || '-'}</td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{c.notes || '-'}</td>
                        <td className="p-4 print:hidden no-print">
                          <div className="flex justify-center gap-1">
                           <button 
                            className="flex items-center gap-1 px-2 py-1.5 text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors text-xs font-medium" 
                            title="كشف حساب"
                            onClick={() => openDetails(c)}
                          >
                            <Eye size={14} />
                            <span>كشف حساب</span>
                          </button>
                           {pagePerms.canEdit && (
                            <button 
                              className="flex items-center gap-1 px-2 py-1.5 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-xs font-medium" 
                              title="تعديل"
                              onClick={() => requestEditCustomer(c)}
                            >
                              <Edit2 size={14} />
                              <span>تعديل</span>
                            </button>
                          )}
                          {pagePerms.canDelete && (
                            <button 
                              className="flex items-center gap-1 px-2 py-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors text-xs font-medium" 
                              title="حذف"
                              onClick={() => setDeleteId(c.id)}
                            >
                              <Trash2 size={14} />
                              <span>حذف</span>
                            </button>
                          )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">لا يوجد عملاء مطابقين</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Grid View */}
            {listViewMode === 'grid' && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.map((c) => {
                  const custInvoices = invoices.filter(i => i.customerId === c.id);
                  const totalDue = custInvoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);
                  
                  return (
                    <div 
                      key={c.id} 
                      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition-all group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-2">
                          <User size={20} className={totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono text-slate-400">#{c.id}</span>
                        </div>
                      </div>
                      
                      <h4 className="font-bold text-slate-800 dark:text-white truncate mb-1">{c.name}</h4>
                      
                      {c.phone && (
                        <div className="flex items-center gap-2 mb-2 text-xs text-slate-500 dark:text-slate-400" dir="ltr">
                          <Phone size={12} />
                          {c.phone}
                        </div>
                      )}
                      
                      {c.notes && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 truncate" title={c.notes}>
                          {c.notes}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 mb-3 text-center">
                        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-2">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">الفواتير</span>
                          <span className="font-bold text-slate-800 dark:text-white text-sm">{custInvoices.length}</span>
                        </div>
                        <div className="rounded-lg p-2 border border-slate-200 dark:border-slate-600">
                          <span className={`text-[10px] block ${totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>المديونية</span>
                          <span className={`font-bold text-sm ${totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{totalDue.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
                        <span className={`text-xs font-medium ${totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {totalDue > 0 ? `عليه: ${totalDue.toLocaleString()}` : 'لا يوجد ديون'}
                        </span>
                        <div className="flex gap-0.5">
                          <button onClick={() => openDetails(c)} className="flex items-center gap-0.5 px-1.5 py-1 text-emerald-600 hover:text-emerald-800 dark:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded text-[10px] font-medium" title="كشف حساب">
                            <Eye size={12} />
                            <span>كشف حساب</span>
                          </button>
                          {pagePerms.canEdit && (
                            <button onClick={() => requestEditCustomer(c)} className="flex items-center gap-0.5 px-1.5 py-1 text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded text-[10px] font-medium" title="تعديل">
                              <Edit2 size={12} />
                              <span>تعديل</span>
                            </button>
                          )}
                          {pagePerms.canDelete && (
                            <button onClick={() => setDeleteId(c.id)} className="flex items-center gap-0.5 px-1.5 py-1 text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded text-[10px] font-medium" title="حذف">
                              <Trash2 size={12} />
                              <span>حذف</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredCustomers.length === 0 && (
                  <div className="col-span-full p-8 text-center text-slate-400">
                    <User size={48} className="mx-auto mb-3 opacity-30" />
                    لا يوجد عملاء مطابقين
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      ) : view === 'create' ? (
        /* Create/Edit Customer View - Enhanced Design */
        <div className="max-w-2xl mx-auto animate-in slide-in-from-left-4 duration-300">
          <div className="bg-white dark:bg-slate-800/95 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${editingCustomerId 
                    ? 'bg-blue-100 dark:bg-blue-900/30' 
                    : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                    {editingCustomerId 
                      ? <Edit2 size={24} className="text-blue-600 dark:text-blue-400"/> 
                      : <UserPlus size={24} className="text-emerald-600 dark:text-emerald-400"/>}
                  </div>
                  <div>
                    <h3 className={`font-bold text-xl ${editingCustomerId 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {editingCustomerId ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                      {editingCustomerId ? 'قم بتحديث بيانات العميل' : 'أضف عميلاً جديداً إلى قائمتك'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={cancelEdit} 
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-5">
              {/* Customer Name */}
              <div className="group">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <User size={16} className="text-emerald-500" />
                  اسم العميل
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    className="w-full border-2 border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3.5 pr-11 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-400 outline-none bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
                    value={formCustName}
                    onChange={e => setFormCustName(e.target.value)}
                    placeholder="مثال: محمد أحمد علي..."
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <User size={18} />
                  </div>
                </div>
              </div>

              {/* Phone Number */}
              <div className="group">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <Phone size={16} className="text-blue-500" />
                  رقم الهاتف
                  <span className="text-slate-400 text-xs font-normal">(اختياري)</span>
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    className="w-full border-2 border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3.5 pr-11 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 outline-none bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
                    value={formCustPhone}
                    onChange={e => setFormCustPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Phone size={18} />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="group">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <StickyNote size={16} className="text-amber-500" />
                  ملاحظات
                  <span className="text-slate-400 text-xs font-normal">(اختياري)</span>
                </label>
                <textarea 
                  className="w-full border-2 border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-400 outline-none bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 resize-none h-28 transition-all"
                  value={formCustNotes}
                  onChange={e => setFormCustNotes(e.target.value)}
                  placeholder="عنوان، تفاصيل إضافية، ملاحظات خاصة..."
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button 
                  type="submit" 
                  disabled={formLoading}
                  className={`flex-1 text-white py-3.5 rounded-xl transition-all font-bold flex items-center justify-center gap-2.5 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed ${
                    editingCustomerId 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25' 
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25'
                  }`}
                >
                  {formLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      {editingCustomerId ? 'حفظ التعديلات' : 'حفظ العميل'}
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  onClick={cancelEdit}
                  className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 px-6 py-3.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 font-semibold flex items-center gap-2 transition-all"
                >
                  <XCircle size={18} />
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>

      ) : (
        /* Customer Detail View */
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between no-print">
            <button 
                onClick={() => setView('list')}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 bg-white dark:bg-slate-800 px-3 py-2 rounded shadow-sm"
            >
                &rarr; العودة للقائمة
            </button>
            <div className="flex gap-2">
                <button onClick={() => printWithFileName({ 
                  companyName: user?.companyName, 
                  type: 'كشف حساب', 
                  customerName: selectedCustomer?.name 
                })} className="bg-slate-800 dark:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-700 dark:hover:bg-slate-600">
                    <Printer size={18} /> طباعة كشف الحساب
                </button>
            </div>
          </div>

          {selectedCustomer && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 print:shadow-none print:border-0 overflow-hidden">
                {/* محتوى الكشف القابل للطباعة */}
                <div className="p-4 print:p-2 print:w-full print:text-[10px]">
                  {/* رأس الكشف - مضغوط */}
                  <div className="border border-slate-300 dark:border-slate-600 rounded print:border-gray-400 mb-3 print:mb-2">
                    {/* الصف الأول: الشعار + الشركة + كشف حساب */}
                    <div className="flex items-center justify-between p-2 border-b border-slate-200 dark:border-slate-600 print:border-gray-300 print:p-1.5">
                      <div className="flex items-center gap-2">
                        {user?.accountLogo ? (
                          <img src={user.accountLogo} alt="شعار" className="h-10 w-10 object-contain print:h-8 print:w-8" />
                        ) : (
                          <Store className="text-slate-500" size={24} />
                        )}
                        <div>
                          <h1 className="text-base font-bold text-slate-800 dark:text-white print:text-black print:text-sm">{user?.companyName || 'المحاسب الذكي'}</h1>
                          {user?.companyPhone && <p className="text-slate-500 text-xs print:text-[9px]" dir="ltr">{user.companyPhone}</p>}
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-slate-800 dark:text-white print:text-black print:text-sm">كشف حساب</p>
                        <p className="text-xs text-slate-500 print:text-[9px]">{formatDateTime(new Date())}</p>
                      </div>
                    </div>
                    
                    {/* الصف v1005: بيانات العميل + الملخص المالي */}
                    <div className="flex items-center justify-between p-2 print:p-1.5 text-sm print:text-[10px]">
                      <div>
                        <span className="text-slate-500">العميل: </span>
                        <span className="font-bold text-slate-800 dark:text-white print:text-black">{selectedCustomer.name}</span>
                        {selectedCustomer.phone && <span className="text-slate-400 mr-2" dir="ltr">({selectedCustomer.phone})</span>}
                      </div>
                      <div className="flex items-center gap-4 print:gap-2">
                        <div><span className="text-slate-500">الإجمالي: </span><span className="font-bold">{customerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}</span></div>
                        <div><span className="text-slate-500">المدفوع: </span><span className="font-bold text-emerald-600">{customerInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0).toLocaleString()}</span></div>
                        <div><span className="text-slate-500">المديونية: </span><span className={`font-bold ${customerTotalDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{customerTotalDue.toLocaleString()} {currency}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* جدول الفواتير المستحقة */}
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1 print:text-black print:text-[10px] print:mb-0.5">الفواتير المستحقة</p>
                  <div className="border border-slate-300 dark:border-slate-600 rounded overflow-hidden mb-3 print:border-gray-400 print:mb-2">
                    <table className="w-full text-right text-sm print:text-[10px] border-collapse">
                      <thead className="border-b border-slate-300 dark:border-slate-600 print:border-gray-400">
                        <tr className="text-slate-600 dark:text-slate-300 print:text-black">
                          <th className="p-1.5 print:p-1 w-10 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">#</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">التاريخ</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">النوع</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">البيان</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">المبلغ</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">مدفوع</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">متبقي</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">الرصيد</th>
                          <th className="p-1.5 print:p-1 no-print w-14 font-semibold">سداد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let runningBalance = 0;
                          return customerInvoices.filter(i => i.remainingAmount > 0).map((inv, idx) => {
                            runningBalance += inv.remainingAmount;
                            const invoiceType = inv.invoiceType === 0 ? 'مبيعات' : inv.invoiceType === 1 ? 'مرتجع' : inv.invoiceType === 2 ? 'عرض سعر' : 'فاتورة';
                            return (
                              <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-700 print:border-gray-200">
                                <td className="p-1.5 print:p-1 text-slate-500 text-xs border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.invoiceNumber || inv.id}</td>
                                <td className="p-1.5 print:p-1 text-slate-700 dark:text-slate-300 print:text-black border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{formatDateTime(inv.date)}</td>
                                <td className="p-1.5 print:p-1 text-slate-500 text-xs border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{invoiceType}</td>
                                <td className="p-1.5 print:p-1 text-slate-500 truncate max-w-[100px] print:max-w-[60px] border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.notes || '-'}</td>
                                <td className="p-1.5 print:p-1 font-medium text-slate-800 dark:text-white print:text-black border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.totalAmount.toLocaleString()}</td>
                                <td className="p-1.5 print:p-1 text-emerald-600 border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.paidAmount.toLocaleString()}</td>
                                <td className="p-1.5 print:p-1 font-bold text-rose-600 border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.remainingAmount.toLocaleString()}</td>
                                <td className="p-1.5 print:p-1 font-bold text-slate-800 dark:text-white print:text-black border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{runningBalance.toLocaleString()}</td>
                                <td className="p-1.5 print:p-1 no-print">
                                  <button 
                                    onClick={() => {
                                      setPayInvoiceId(inv.id);
                                      setPayInvoiceNumber(inv.invoiceNumber || `#${inv.id}`);
                                      setPayMaxAmount(inv.remainingAmount || 0);
                                      setPayAmount(inv.remainingAmount || 0);
                                      setShowPayModal(true);
                                    }}
                                    className="bg-primary text-white px-2 py-0.5 rounded text-xs hover:bg-blue-700"
                                  >
                                    سداد
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                        {customerInvoices.filter(i => i.remainingAmount > 0).length === 0 && (
                          <tr><td colSpan={9} className="p-2 text-center text-slate-400 text-sm print:p-1">✓ لا توجد ديون</td></tr>
                        )}
                      </tbody>
                      {customerInvoices.filter(i => i.remainingAmount > 0).length > 0 && (
                        <tfoot className="border-t border-slate-300 dark:border-slate-500 print:border-gray-400 font-bold">
                          <tr>
                            <td colSpan={4} className="p-1.5 print:p-1 text-slate-600 print:text-black border-l border-slate-200 dark:border-slate-600 print:border-gray-300">الإجمالي</td>
                            <td className="p-1.5 print:p-1 border-l border-slate-200 dark:border-slate-600 print:border-gray-300">{customerInvoices.filter(i => i.remainingAmount > 0).reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}</td>
                            <td className="p-1.5 print:p-1 text-emerald-600 border-l border-slate-200 dark:border-slate-600 print:border-gray-300">{customerInvoices.filter(i => i.remainingAmount > 0).reduce((sum, inv) => sum + inv.paidAmount, 0).toLocaleString()}</td>
                            <td className="p-1.5 print:p-1 text-rose-600 border-l border-slate-200 dark:border-slate-600 print:border-gray-300">{customerTotalDue.toLocaleString()}</td>
                            <td className="p-1.5 print:p-1 border-l border-slate-200 dark:border-slate-600 print:border-gray-300"></td>
                            <td className="p-1.5 print:p-1 no-print"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* جدول سجل الدفعات */}
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1 print:text-black print:text-[10px] print:mb-0.5">سجل الدفعات</p>
                  <div className="border border-slate-300 dark:border-slate-600 rounded overflow-hidden mb-3 print:border-gray-400 print:mb-2">
                    <table className="w-full text-right text-sm print:text-[10px] border-collapse">
                      <thead className="border-b border-slate-300 dark:border-slate-600 print:border-gray-400">
                        <tr className="text-slate-600 dark:text-slate-300 print:text-black">
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">التاريخ</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">المبلغ</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">رقم الفاتورة</th>
                          <th className="p-1.5 print:p-1 font-semibold">ملاحظات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentsLoading ? (
                          <tr><td colSpan={4} className="p-2 text-center"><Loader2 className="animate-spin h-4 w-4 text-primary mx-auto" /></td></tr>
                        ) : customerPayments.length > 0 ? (
                          customerPayments.map((pay) => (
                            <tr key={pay.id} className="border-b border-slate-100 dark:border-slate-700 print:border-gray-200">
                              <td className="p-1.5 print:p-1 text-slate-700 dark:text-slate-300 print:text-black border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{pay.paymentDate ? formatDateTime(pay.paymentDate) : '-'}</td>
                              <td className="p-1.5 print:p-1 font-bold text-emerald-600 border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{pay.amount.toLocaleString()} {currency}</td>
                              <td className="p-1.5 print:p-1 text-slate-500 text-xs border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{pay.invoiceNumber || (pay.invoiceId ? `#${pay.invoiceId}` : '-')}</td>
                              <td className="p-1.5 print:p-1 text-slate-500 truncate max-w-[120px] print:max-w-[80px]">{pay.notes || pay.description || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={4} className="p-2 text-center text-slate-400 text-sm print:p-1">لا يوجد سجل مدفوعات</td></tr>
                        )}
                      </tbody>
                      {customerPayments.length > 0 && (
                        <tfoot className="border-t border-slate-300 dark:border-slate-500 print:border-gray-400 font-bold">
                          <tr>
                            <td className="p-1.5 print:p-1 text-slate-600 print:text-black border-l border-slate-200 dark:border-slate-600 print:border-gray-300">إجمالي المدفوعات</td>
                            <td className="p-1.5 print:p-1 text-emerald-600 border-l border-slate-200 dark:border-slate-600 print:border-gray-300">{customerPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()} {currency}</td>
                            <td colSpan={2} className="p-1.5 print:p-1"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* ملاحظات + تذييل */}
                  <div className="flex items-center justify-between text-xs text-slate-500 print:text-[9px] pt-2 border-t border-dashed border-slate-200 dark:border-slate-700 print:border-gray-300 print:pt-1">
                    {selectedCustomer.notes && <p><b>ملاحظات:</b> {selectedCustomer.notes}</p>}
                    <p className="mr-auto">{user?.companyName} | {formatDateTime(new Date())}</p>
                  </div>
                </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">تسجيل دفعة جديدة</h3>
                {payInvoiceId && (
                <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded mb-4 text-sm text-slate-600 dark:text-slate-300">
                   يتم سداد دين الفاتورة رقم <span className="font-bold">#{payInvoiceId}</span>
                </div>
                )}
                
                {/* عرض المبلغ المستحق والمتبقي */}
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-amber-700 dark:text-amber-300 text-sm">المبلغ المستحق:</span>
                        <span className="text-amber-800 dark:text-amber-200 font-bold text-lg">{payMaxAmount.toLocaleString()} {currency}</span>
                    </div>
                    {payAmount > 0 && payAmount <= payMaxAmount && (
                        <div className="flex justify-between items-center pt-2 border-t border-amber-200 dark:border-amber-700">
                            <span className="text-emerald-600 dark:text-emerald-400 text-sm">المتبقي بعد الدفع:</span>
                            <span className="text-emerald-700 dark:text-emerald-300 font-bold text-lg">{(payMaxAmount - payAmount).toLocaleString()} {currency}</span>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">المبلغ المراد دفعه ({currency})</label>
                        <input 
                            type="number" 
                            className={`w-full border p-3 rounded-lg text-lg font-bold text-center focus:border-primary outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white dark:border-slate-600 ${payAmount > payMaxAmount ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/30' : ''}`}
                            value={payAmount}
                            max={payMaxAmount}
                            onChange={e => {
                                const val = Number(e.target.value);
                                if (val <= payMaxAmount) {
                                    setPayAmount(val);
                                } else {
                                    setPayAmount(payMaxAmount);
                                }
                            }}
                        />
                        {payAmount > payMaxAmount && (
                            <p className="text-rose-500 text-xs mt-1">لا يمكن إدخال مبلغ أكبر من المستحق</p>
                        )}
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button 
                          onClick={handleAddPayment} 
                          disabled={paymentLoading || payAmount <= 0 || payAmount > payMaxAmount}
                          className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg hover:bg-emerald-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {paymentLoading && <Loader2 className="animate-spin h-4 w-4" />}
                          تأكيد الدفع
                        </button>
                        <button onClick={() => setShowPayModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">إلغاء</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
