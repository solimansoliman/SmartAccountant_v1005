import React, { useState, useMemo, useEffect } from 'react';
import { TransactionType } from '../types';
import { useExpenses } from '../services/dataHooks';
import { transactionTypesApi, ApiTransactionType } from '../services/apiService';
import { TrendingDown, ShoppingCart, TrendingUp, Loader2, Calendar, List, Grid3X3, DollarSign, Tag, CreditCard, Trash2, Edit2, X, AlertTriangle, Search, Printer, Download } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, formatDate } from '../services/dateService';
import { printWithFileName } from '../services/fileNameService';
import DateInput from '../components/DateInput';
import { usePagePermission } from '../services/permissionsHooks';
import AccessDenied from '../components/AccessDenied';

// نوع الفلتر يشمل "الكل" بالإضافة للأنواع الأخرى
type FilterType = 'ALL' | TransactionType;

// ربط كود النوع مع TransactionType
// الأكواد من قاعدة البيانات: OP_EXPENSE, SALARY, RENT = مصروفات
// CASH_PURCHASE, CREDIT_PURCHASE = مشتريات
// OTHER_REV = إيرادات أخرى
const codeToType: Record<string, TransactionType> = {
  // مصروفات
  'EXPENSE': TransactionType.EXPENSE,
  'OP_EXPENSE': TransactionType.EXPENSE,
  'SALARY': TransactionType.EXPENSE,
  'RENT': TransactionType.EXPENSE,
  // مشتريات
  'PURCHASE': TransactionType.PURCHASE,
  'CASH_PURCHASE': TransactionType.PURCHASE,
  'CREDIT_PURCHASE': TransactionType.PURCHASE,
  // إيرادات أخرى
  'OTHER_INCOME': TransactionType.OTHER_INCOME,
  'OTHER_REV': TransactionType.OTHER_INCOME
};

const typeToCode: Record<TransactionType, string> = {
  [TransactionType.EXPENSE]: 'OP_EXPENSE',
  [TransactionType.PURCHASE]: 'CASH_PURCHASE',
  [TransactionType.OTHER_INCOME]: 'OTHER_REV',
  [TransactionType.INCOME]: 'CASH_SALE'
};

type ViewMode = 'grid' | 'table';

const Expenses: React.FC = () => {
  // ==================== Hooks أولاً (React requires all hooks before any return) ====================
  const { notify } = useNotification();
  const { currency, defaultViewMode } = useSettings();
  const { user } = useAuth();
  
  // View Mode State - يستخدم الإعداد الافتراضي من النظام
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode || 'grid');
  
  // API Hooks
  const { expenses, loading, addExpense: apiAddExpense, deleteExpense: apiDeleteExpense } = useExpenses();
  const [transactionTypes, setTransactionTypes] = useState<ApiTransactionType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  
  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<TransactionType>(TransactionType.EXPENSE);
  const [filterTab, setFilterTab] = useState<FilterType>('ALL'); // فلتر العرض
  
  // Search and date filter
  const [searchQuery, setSearchQuery] = useState('');
  // التاريخ الافتراضي: من سنة ماضية إلى اليوم
  const today = new Date();
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(oneYearAgo);
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);
  
  // Form
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  
  // صلاحيات الصفحة
  const pagePerms = usePagePermission('expenses');
  
  // جلب أنواع المعاملات - يجب أن يكون قبل أي return
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const types = await transactionTypesApi.getAll(1);
        setTransactionTypes(types);
      } catch (err) {
        console.error('Error fetching transaction types:', err);
      } finally {
        setTypesLoading(false);
      }
    };
    fetchTypes();
  }, []);
  
  // ==================== التحقق من الصلاحيات (بعد كل الـ hooks) ====================
  // إذا لم يكن لديه صلاحية عرض الصفحة
  if (pagePerms.checked && !pagePerms.canView) {
    return <AccessDenied />;
  }

  // الحصول على TransactionTypeId من الكود
  const getTypeIdByCode = (code: string): number | undefined => {
    return transactionTypes.find(t => t.code === code)?.id;
  };

  // تحديد نوع المعاملة من الـ API response
  const getTransactionTypeFromExpense = (expense: any): TransactionType => {
    // أولاً: التحقق من transactionTypeCode من الـ API (بحرف كبير أو صغير)
    const typeCode = expense.transactionTypeCode || expense.TransactionTypeCode;
    if (typeCode && codeToType[typeCode]) {
      return codeToType[typeCode];
    }
    // ثانياً: التحقق من transactionType.code (إذا كان الـ API يرسل الكائن كاملاً)
    if (expense.transactionType?.code && codeToType[expense.transactionType.code]) {
      return codeToType[expense.transactionType.code];
    }
    // ثالثاً: التحقق من notes (للتوافق مع البيانات القديمة)
    const notes = expense.notes || expense.description || '';
    if (notes.includes('[مشتريات]') || notes.includes('[PURCHASE]')) return TransactionType.PURCHASE;
    if (notes.includes('[إيرادات أخرى]') || notes.includes('[OTHER_INCOME]')) return TransactionType.OTHER_INCOME;
    return TransactionType.EXPENSE;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) {
        notify('يرجى ملء الحقول المطلوبة (المبلغ والبيان)', 'warning');
        return;
    }
    
    // الحصول على TransactionTypeId
    const transactionTypeCode = typeToCode[activeTab];
    const transactionTypeId = getTypeIdByCode(transactionTypeCode);
    
    setSubmitting(true);
    try {
      await apiAddExpense({
        expenseDate: date,
        description: description,
        amount: parseFloat(amount),
        taxAmount: 0,
        totalAmount: parseFloat(amount),
        paymentMethod: 'Cash',
        notes: category || 'عام',
        transactionTypeId: transactionTypeId,
        transactionTypeCode: transactionTypeCode
      } as any);

      setAmount('');
      setDescription('');
      setCategory('');
      notify(`تم تسجيل ${activeTab} بنجاح`, 'success');
    } catch (err: any) {
      notify(err.message || 'حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // تحويل وفلترة المصروفات حسب النوع
  const allItems = useMemo(() => {
    console.log('=== DEBUG: Raw expenses from API ===');
    expenses.forEach((e, i) => {
      console.log(`Expense ${i}:`, {
        id: e.id,
        transactionTypeCode: (e as any).transactionTypeCode,
        TransactionTypeCode: (e as any).TransactionTypeCode,
        transactionType: (e as any).transactionType,
        description: e.description
      });
    });
    
    return expenses.map(e => {
      const transactionType = getTransactionTypeFromExpense(e);
      const notes = e.notes || (e as any).category || 'عام';
      // إزالة علامة النوع من العرض (للبيانات القديمة)
      const cleanCategory = notes.replace(/\[(مصروفات|مشتريات|إيرادات أخرى|EXPENSE|PURCHASE|OTHER_INCOME)\]\s*/g, '').trim() || 'عام';
      
      console.log(`Mapped expense ${e.id}: typeCode=${(e as any).transactionTypeCode}, mappedType=${transactionType}`);
      
      return {
        id: e.id,
        expenseNumber: e.expenseNumber || `#${e.id}`,
        date: e.expenseDate || (e as any).date || '',
        description: e.description || '',
        category: cleanCategory,
        amount: e.totalAmount ?? e.amount ?? 0,
        paymentMethod: e.paymentMethod || 'Cash',
        status: e.status || 'Paid',
        transactionType: transactionType
      };
    });
  }, [expenses]);

  // فلترة القائمة حسب التبويب المختار والبحث والتاريخ
  const filteredList = useMemo(() => {
    console.log('=== DEBUG Filter ===');
    console.log('filterTab:', filterTab, 'type:', typeof filterTab);
    console.log('TransactionType.EXPENSE:', TransactionType.EXPENSE);
    console.log('TransactionType.PURCHASE:', TransactionType.PURCHASE);
    console.log('TransactionType.OTHER_INCOME:', TransactionType.OTHER_INCOME);
    console.log('allItems types:', allItems.map(i => ({ id: i.id, type: i.transactionType })));
    
    let result = filterTab === 'ALL' ? allItems : allItems.filter(item => item.transactionType === filterTab);
    
    // فلتر البحث
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.expenseNumber.toLowerCase().includes(query)
      );
    }
    
    // فلتر التاريخ
    if (dateFrom) {
      result = result.filter(item => item.date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(item => item.date <= dateTo);
    }
    
    console.log('Filtered count:', result.length);
    return result;
  }, [allItems, filterTab, searchQuery, dateFrom, dateTo]);
  
  const totalAmount = filteredList.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['الرقم', 'النوع', 'التاريخ', 'البيان', 'التصنيف', 'طريقة الدفع', 'المبلغ'];
    const rows = filteredList.map(item => [
      item.expenseNumber,
      getTypeBadge(item.transactionType).label,
      item.date,
      item.description,
      item.category,
      getPaymentMethodLabel(item.paymentMethod),
      item.amount
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += headers.join(",") + "\r\n";
    rows.forEach(row => {
      csvContent += row.join(",") + "\r\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('تم تصدير البيانات بنجاح', 'success');
  };

  // Print function
  const handlePrint = () => {
    printWithFileName({ 
      companyName: user?.companyName, 
      type: filterTab === 'ALL' ? 'المعاملات المالية' : filterTab === TransactionType.EXPENSE ? 'المصروفات' : filterTab === TransactionType.PURCHASE ? 'المشتريات' : 'الإيرادات الأخرى' 
    });
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setFilterTab('ALL');
  };

  // إحصائيات لكل نوع
  const stats = useMemo(() => ({
    expenses: allItems.filter(i => i.transactionType === TransactionType.EXPENSE).reduce((s, e) => s + e.amount, 0),
    purchases: allItems.filter(i => i.transactionType === TransactionType.PURCHASE).reduce((s, e) => s + e.amount, 0),
    otherIncome: allItems.filter(i => i.transactionType === TransactionType.OTHER_INCOME).reduce((s, e) => s + e.amount, 0),
    all: allItems.reduce((s, e) => s + e.amount, 0)
  }), [allItems]);

  // Helper for payment method display
  const getPaymentMethodLabel = (method: string): string => {
    switch (method) {
      case 'Cash': return 'نقدي';
      case 'BankTransfer': return 'تحويل';
      case 'Cheque': return 'شيك';
      default: return method;
    }
  };

  // Helper for status display
  const getStatusLabel = (status: string): { label: string; color: string } => {
    switch (status) {
      case 'Pending': return { label: 'معلق', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' };
      case 'Approved': return { label: 'معتمد', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' };
      case 'Paid': return { label: 'مدفوع', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' };
      case 'Cancelled': return { label: 'ملغى', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' };
      default: return { label: status, color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' };
    }
  };

  // Helper for Colors
  const getTabColor = (type: TransactionType | FilterType) => {
      switch(type) {
          case TransactionType.EXPENSE: return 'text-rose-600 dark:text-rose-400';
          case TransactionType.PURCHASE: return 'text-blue-600 dark:text-blue-400';
          case TransactionType.OTHER_INCOME: return 'text-emerald-600 dark:text-emerald-400';
          case 'ALL': return 'text-slate-700 dark:text-slate-200';
          default: return 'text-slate-600 dark:text-slate-400';
      }
  };

  // لون خلفية النوع في الجدول
  const getTypeBadge = (type: TransactionType) => {
    switch(type) {
      case TransactionType.EXPENSE: return { label: 'مصروفات', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' };
      case TransactionType.PURCHASE: return { label: 'مشتريات', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' };
      case TransactionType.OTHER_INCOME: return { label: 'إيرادات أخرى', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' };
      default: return { label: 'أخرى', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' };
    }
  };

  const getIcon = () => {
      switch(activeTab) {
          case TransactionType.EXPENSE: return <TrendingDown size={20} className="text-rose-500 dark:text-rose-400"/>;
          case TransactionType.PURCHASE: return <ShoppingCart size={20} className="text-blue-500 dark:text-blue-400"/>;
          case TransactionType.OTHER_INCOME: return <TrendingUp size={20} className="text-emerald-500 dark:text-emerald-400"/>;
      }
  };

  const getFilterIcon = () => {
      switch(filterTab) {
          case TransactionType.EXPENSE: return <TrendingDown size={16} className="text-rose-500"/>;
          case TransactionType.PURCHASE: return <ShoppingCart size={16} className="text-blue-500"/>;
          case TransactionType.OTHER_INCOME: return <TrendingUp size={16} className="text-emerald-500"/>;
          default: return <List size={16} className="text-slate-500"/>;
      }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">جاري تحميل المصروفات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">مصروفات ومشتريات وإيرادات أخرى</h2>
        {/* View Mode Toggle */}
        <div className="flex bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded transition-all ${viewMode === 'table' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
            title="عرض صفوف"
          >
            <List size={18} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
            title="عرض شبكي"
          >
            <Grid3X3 size={18} />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex p-1 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-x-auto">
            <button 
              onClick={() => setActiveTab(TransactionType.EXPENSE)}
              className={`flex-1 py-2 px-1 text-xs md:text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === TransactionType.EXPENSE ? 'bg-white dark:bg-slate-600 shadow text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}
            >
              مصروفات
            </button>
            <button 
               onClick={() => setActiveTab(TransactionType.PURCHASE)}
               className={`flex-1 py-2 px-1 text-xs md:text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === TransactionType.PURCHASE ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}
            >
              مشتريات
            </button>
            <button 
               onClick={() => setActiveTab(TransactionType.OTHER_INCOME)}
               className={`flex-1 py-2 px-1 text-xs md:text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === TransactionType.OTHER_INCOME ? 'bg-white dark:bg-slate-600 shadow text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}
            >
              إيرادات أخرى
            </button>
          </div>

          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
              {getIcon()}
              تسجيل {activeTab}
            </h3>
            
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">المبلغ ({currency})</label>
              <input 
                type="number" 
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 focus:border-primary outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">البيان (الوصف)</label>
              <input 
                type="text" 
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 focus:border-primary outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={activeTab === TransactionType.OTHER_INCOME ? "مثل: بيع كراتين فارغة، استرداد..." : "وصف العملية"}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">التصنيف (اختياري)</label>
              <input 
                type="text" 
                placeholder="مثال: كهرباء، إيجار، بضاعة مورد فلان"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 focus:border-primary outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                value={category}
                onChange={e => setCategory(e.target.value)}
              />
            </div>

            <div>
               <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">التاريخ</label>
               <DateInput 
                 className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 focus:border-primary outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                 value={date}
                 onChange={setDate}
               />
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className={`w-full text-white py-2.5 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${submitting ? 'opacity-50 cursor-not-allowed' : ''} ${activeTab === TransactionType.OTHER_INCOME ? 'bg-emerald-600 hover:bg-emerald-700' : (activeTab === TransactionType.EXPENSE ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700')}`}
            >
              {submitting && <Loader2 className="animate-spin" size={18} />}
              حفظ
            </button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 space-y-4">
           {/* تبويبات الفلترة */}
           <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
             <button 
               onClick={() => setFilterTab('ALL')}
               className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 py-2 text-xs md:text-sm font-medium rounded-md transition-all ${filterTab === 'ALL' ? 'bg-white dark:bg-slate-600 shadow text-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
             >
               <List size={14} className="md:w-4 md:h-4" />
               <span className="hidden sm:inline">الكل</span>
               <span className="bg-slate-200 dark:bg-slate-500 px-1.5 py-0.5 rounded text-[10px] md:text-xs">{allItems.length}</span>
             </button>
             <button 
               onClick={() => setFilterTab(TransactionType.EXPENSE)}
               className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 py-2 text-xs md:text-sm font-medium rounded-md transition-all ${filterTab === TransactionType.EXPENSE ? 'bg-white dark:bg-slate-600 shadow text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400 hover:text-rose-600'}`}
             >
               <TrendingDown size={14} className="md:w-4 md:h-4" />
               <span className="hidden sm:inline">مصروفات</span>
               <span className="bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 px-1.5 py-0.5 rounded text-[10px] md:text-xs">{allItems.filter(i => i.transactionType === TransactionType.EXPENSE).length}</span>
             </button>
             <button 
               onClick={() => setFilterTab(TransactionType.PURCHASE)}
               className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 py-2 text-xs md:text-sm font-medium rounded-md transition-all ${filterTab === TransactionType.PURCHASE ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-blue-600'}`}
             >
               <ShoppingCart size={14} className="md:w-4 md:h-4" />
               <span className="hidden sm:inline">مشتريات</span>
               <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px] md:text-xs">{allItems.filter(i => i.transactionType === TransactionType.PURCHASE).length}</span>
             </button>
             <button 
               onClick={() => setFilterTab(TransactionType.OTHER_INCOME)}
               className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 py-2 text-xs md:text-sm font-medium rounded-md transition-all ${filterTab === TransactionType.OTHER_INCOME ? 'bg-white dark:bg-slate-600 shadow text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600'}`}
             >
               <TrendingUp size={14} className="md:w-4 md:h-4" />
               <span className="hidden sm:inline">إيرادات</span>
               <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 rounded text-[10px] md:text-xs">{allItems.filter(i => i.transactionType === TransactionType.OTHER_INCOME).length}</span>
             </button>
           </div>

           {/* ملخص الإجماليات */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
             <div className={`bg-white dark:bg-slate-800 p-3 rounded-lg border ${filterTab === 'ALL' ? 'border-slate-300 dark:border-slate-500' : 'border-slate-100 dark:border-slate-700'}`}>
               <p className="text-xs text-slate-500 dark:text-slate-400">إجمالي الكل</p>
               <p className="text-lg font-bold text-slate-700 dark:text-white">{stats.all.toLocaleString('ar-SA')} <span className="text-xs">{currency}</span></p>
             </div>
             <div className={`bg-white dark:bg-slate-800 p-3 rounded-lg border ${filterTab === TransactionType.EXPENSE ? 'border-rose-300 dark:border-rose-500' : 'border-slate-100 dark:border-slate-700'}`}>
               <p className="text-xs text-rose-500">المصروفات</p>
               <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{stats.expenses.toLocaleString('ar-SA')} <span className="text-xs">{currency}</span></p>
             </div>
             <div className={`bg-white dark:bg-slate-800 p-3 rounded-lg border ${filterTab === TransactionType.PURCHASE ? 'border-blue-300 dark:border-blue-500' : 'border-slate-100 dark:border-slate-700'}`}>
               <p className="text-xs text-blue-500">المشتريات</p>
               <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.purchases.toLocaleString('ar-SA')} <span className="text-xs">{currency}</span></p>
             </div>
             <div className={`bg-white dark:bg-slate-800 p-3 rounded-lg border ${filterTab === TransactionType.OTHER_INCOME ? 'border-emerald-300 dark:border-emerald-500' : 'border-slate-100 dark:border-slate-700'}`}>
               <p className="text-xs text-emerald-500">إيرادات أخرى</p>
               <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.otherIncome.toLocaleString('ar-SA')} <span className="text-xs">{currency}</span></p>
             </div>
           </div>

           {/* شريط البحث والفلاتر والأدوات */}
           <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 print:hidden">
             <div className="flex flex-wrap items-center gap-3">
               {/* البحث */}
               <div className="relative flex-1 min-w-[200px]">
                 <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                 <input
                   type="text"
                   placeholder="بحث في البيان أو التصنيف أو الرقم..."
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   className="w-full pl-3 pr-10 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-primary"
                 />
               </div>
               
               {/* فلتر التاريخ */}
               <div className="flex items-center gap-2">
                 <span className="text-xs text-slate-500">من:</span>
                 <DateInput
                   value={dateFrom}
                   onChange={setDateFrom}
                   className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-primary w-32"
                   placeholder="يوم-شهر-سنة"
                 />
                 <span className="text-xs text-slate-500">إلى:</span>
                 <DateInput
                   value={dateTo}
                   onChange={setDateTo}
                   className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-primary w-32"
                   placeholder="يوم-شهر-سنة"
                 />
               </div>
               
               {/* أزرار الأدوات */}
               <div className="flex items-center gap-2">
                 {(searchQuery || dateFrom || dateTo || filterTab !== 'ALL') && (
                   <button
                     onClick={clearFilters}
                     className="flex items-center gap-1 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                   >
                     <X size={14}/>
                     إزالة الفلاتر
                   </button>
                 )}
                 <button
                   onClick={handlePrint}
                   className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors"
                 >
                   <Printer size={14}/>
                   طباعة
                 </button>
                 <button
                   onClick={exportToCSV}
                   className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                 >
                   <Download size={14}/>
                   تصدير
                 </button>
               </div>
             </div>
             
             {/* عرض عدد النتائج */}
             <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
               عرض {filteredList.length} من {allItems.length} سجل
               {filteredList.length > 0 && (
                 <span className="mr-2">| الإجمالي: <span className="font-bold text-slate-700 dark:text-white">{totalAmount.toLocaleString('ar-SA')} {currency}</span></span>
               )}
             </div>
           </div>

           {/* الجدول */}
           <div className="bg-white dark:bg-slate-800/90 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 overflow-hidden backdrop-blur-sm">
             <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
               <div className="flex items-center gap-2">
                 {getFilterIcon()}
                 <span className="font-medium text-slate-700 dark:text-slate-200">
                   {filterTab === 'ALL' ? 'جميع المعاملات' : filterTab}
                 </span>
                 <span className="text-sm text-slate-400">({filteredList.length} سجل)</span>
               </div>
               <span className={`text-lg font-bold ${getTabColor(filterTab)}`}>{totalAmount.toLocaleString('ar-SA')} {currency}</span>
             </div>
             
             {/* Table View */}
             {viewMode === 'table' && (
               <div className="overflow-x-auto">
                 <table className="w-full text-right text-sm">
                   <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                     <tr>
                       <th className="p-3 whitespace-nowrap">#</th>
                       <th className="p-3 whitespace-nowrap">النوع</th>
                       <th className="p-3 whitespace-nowrap">التاريخ</th>
                       <th className="p-3 whitespace-nowrap">البيان</th>
                       <th className="p-3 whitespace-nowrap">التصنيف</th>
                       <th className="p-3 whitespace-nowrap">طريقة الدفع</th>
                       <th className="p-3 whitespace-nowrap">المبلغ</th>
                       <th className="p-3 whitespace-nowrap">إجراءات</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                     {filteredList.map((item) => {
                       const typeBadge = getTypeBadge(item.transactionType);
                       return (
                         <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                           <td className="p-3 text-slate-400 text-xs">{item.expenseNumber}</td>
                           <td className="p-3">
                             <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${typeBadge.color}`}>{typeBadge.label}</span>
                           </td>
                           <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                             <div className="flex items-center gap-2">
                               <Calendar size={14} className="text-slate-400" />
                               {formatDate(item.date)}
                             </div>
                           </td>
                           <td className="p-3 font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate" title={item.description}>{item.description || '-'}</td>
                           <td className="p-3">
                             <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs text-slate-600 dark:text-slate-300">{item.category || 'عام'}</span>
                           </td>
                           <td className="p-3">
                             <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs">{getPaymentMethodLabel(item.paymentMethod)}</span>
                           </td>
                           <td className={`p-3 font-bold whitespace-nowrap ${getTabColor(item.transactionType)}`}>
                             {(item.amount || 0).toLocaleString('ar-SA')} {currency}
                           </td>
                           <td className="p-3">
                             {pagePerms.canDelete && (
                               <button
                                 onClick={() => setDeleteId(item.id)}
                                 className="flex items-center gap-1 px-2 py-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors text-xs font-medium"
                                 title="حذف"
                               >
                                 <Trash2 size={14} />
                                 <span>حذف</span>
                               </button>
                             )}
                           </td>
                         </tr>
                       );
                     })}
                     {filteredList.length === 0 && (
                       <tr><td colSpan={8} className="p-6 text-center text-slate-400">لا توجد سجلات</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
             )}

             {/* Grid View */}
             {viewMode === 'grid' && (
               <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                 {filteredList.map((item) => {
                   const typeBadge = getTypeBadge(item.transactionType);
                   const typeIcon = item.transactionType === TransactionType.EXPENSE ? TrendingDown :
                                    item.transactionType === TransactionType.PURCHASE ? ShoppingCart : TrendingUp;
                   const TypeIcon = typeIcon;
                   const gradientClass = item.transactionType === TransactionType.EXPENSE 
                     ? 'from-rose-50 to-white dark:from-rose-900/20 dark:to-slate-800/90 border-rose-200 dark:border-rose-700/50'
                     : item.transactionType === TransactionType.PURCHASE 
                       ? 'from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-800/90 border-blue-200 dark:border-blue-700/50'
                       : 'from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800/90 border-emerald-200 dark:border-emerald-700/50';
                   const iconColor = item.transactionType === TransactionType.EXPENSE ? 'text-rose-500' :
                                     item.transactionType === TransactionType.PURCHASE ? 'text-blue-500' : 'text-emerald-500';
                   
                   return (
                     <div 
                       key={item.id} 
                       className={`bg-gradient-to-br rounded-xl border-2 p-4 hover:shadow-lg transition-all ${gradientClass}`}
                     >
                       <div className="flex justify-between items-start mb-3">
                         <div className={`p-2 rounded-lg ${typeBadge.color.replace('text-', 'bg-').split(' ')[0]}/20`}>
                           <TypeIcon size={20} className={iconColor} />
                         </div>
                         <span className={`px-2 py-1 rounded text-xs ${typeBadge.color}`}>{typeBadge.label}</span>
                       </div>
                       
                       <h4 className="font-bold text-slate-800 dark:text-white mb-2 line-clamp-2">{item.description || '-'}</h4>
                       
                       <div className="space-y-2 mb-3">
                         <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                           <Calendar size={12} />
                           {formatDate(item.date)}
                         </div>
                         {item.category && (
                           <div className="flex items-center gap-2 text-xs">
                             <Tag size={12} className="text-slate-400" />
                             <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{item.category}</span>
                           </div>
                         )}
                         <div className="flex items-center gap-2 text-xs">
                           <CreditCard size={12} className="text-slate-400" />
                           <span className="text-slate-500 dark:text-slate-400">{getPaymentMethodLabel(item.paymentMethod)}</span>
                         </div>
                       </div>
                       
                       <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                         <div className="flex justify-between items-center">
                           {pagePerms.canDelete && (
                             <button
                               onClick={() => setDeleteId(item.id)}
                               className="flex items-center gap-0.5 px-1.5 py-1 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors text-[10px] font-medium"
                               title="حذف"
                             >
                               <Trash2 size={12} />
                               <span>حذف</span>
                             </button>
                           )}
                           {!pagePerms.canDelete && <div></div>}
                           <span className={`text-lg font-bold ${getTabColor(item.transactionType)}`}>
                             {(item.amount || 0).toLocaleString('ar-SA')} <span className="text-xs">{currency}</span>
                           </span>
                         </div>
                       </div>
                     </div>
                   );
                 })}
                 {filteredList.length === 0 && (
                   <div className="col-span-full p-8 text-center text-slate-400">
                     <DollarSign size={48} className="mx-auto mb-3 opacity-30" />
                     لا توجد سجلات
                   </div>
                 )}
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-full">
                <AlertTriangle className="text-rose-600 dark:text-rose-400" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">تأكيد الحذف</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">هل أنت متأكد من حذف هذا السجل؟</p>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg mb-4">
              {(() => {
                const item = filteredList.find(i => i.id === deleteId);
                if (!item) return null;
                const typeBadge = getTypeBadge(item.transactionType);
                return (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">النوع:</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${typeBadge.color}`}>{typeBadge.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">البيان:</span>
                      <span className="text-slate-800 dark:text-white font-medium">{item.description}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">المبلغ:</span>
                      <span className={`font-bold ${getTabColor(item.transactionType)}`}>{item.amount.toLocaleString()} {currency}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setDeleteLoading(true);
                  try {
                    await apiDeleteExpense(deleteId);
                    notify('تم حذف السجل بنجاح', 'success');
                    setDeleteId(null);
                  } catch (err: any) {
                    notify(err.message || 'فشل في الحذف', 'error');
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
                disabled={deleteLoading}
                className="flex-1 bg-rose-600 text-white py-2.5 rounded-lg hover:bg-rose-700 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteLoading && <Loader2 className="animate-spin h-4 w-4" />}
                حذف
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;