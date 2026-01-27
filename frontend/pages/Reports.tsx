import React, { useState, useMemo, useEffect } from 'react';
import { useCustomers, useProducts, useInvoices, useExpenses, useRevenues } from '../services/dataHooks';
import { TransactionType } from '../types';
import { Printer, Filter, FileBarChart, TrendingUp, TrendingDown, DollarSign, Calendar, Search, PieChart, ArrowDownLeft, ArrowUpRight, Download, Loader2, FileSpreadsheet, FileText, BarChart3, User, Package, X } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, formatDate } from '../services/dateService';
import { printWithFileName } from '../services/fileNameService';
import DateInput from '../components/DateInput';
import { usePagePermission } from '../services/permissionsHooks';
import AccessDenied from '../components/AccessDenied';

const Reports: React.FC = () => {
  const { notify } = useNotification();
  const { currency } = useSettings();
  const { user } = useAuth();
  
  // API Hooks
  const { customers, loading: customersLoading } = useCustomers();
  const { products, loading: productsLoading } = useProducts();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { expenses, loading: expensesLoading } = useExpenses();
  const { revenues, loading: revenuesLoading } = useRevenues();
  
  const isLoading = customersLoading || productsLoading || invoicesLoading || expensesLoading || revenuesLoading;
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [activePeriod, setActivePeriod] = useState<'all' | 'week' | 'month' | 'year' | 'custom'>('month');

  // Filters
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  
  // Search states for dropdowns
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  
  // Ledger filters and search
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'all' | 'invoices' | 'expenses' | 'income'>('all');
  
  // ==================== صلاحيات الصفحة ====================
  const pagePerms = usePagePermission('reports');
  
  // إذا لم يكن لديه صلاحية عرض الصفحة
  if (pagePerms.checked && !pagePerms.canView) {
    return <AccessDenied />;
  }
  
  // Filtered lists for search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone && c.phone.includes(customerSearch))
    );
  }, [customers, customerSearch]);
  
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.customer-dropdown-container')) {
        setShowCustomerDropdown(false);
      }
      if (!target.closest('.product-dropdown-container')) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
     setDateRange('month'); // Initialize
  }, []);

  const setDateRange = (type: 'all' | 'week' | 'month' | 'year') => {
      const today = new Date();
      let start = new Date();
      let end = today;

      if (type === 'all') {
          // الكل - من 5 سنوات مضت حتى اليوم
          start = new Date(today.getFullYear() - 5, 0, 1);
          end = today;
      } else if (type === 'week') {
          // آخر 7 أيام
          start = new Date(today);
          start.setDate(today.getDate() - 7);
      } else if (type === 'month') {
          // من أول الشهر الحالي
          start = new Date(today.getFullYear(), today.getMonth(), 1);
      } else if (type === 'year') {
          // من أول السنة الحالية
          start = new Date(today.getFullYear(), 0, 1);
      }

      const formatDateValue = (d: Date) => {
         const year = d.getFullYear();
         const month = String(d.getMonth() + 1).padStart(2, '0');
         const day = String(d.getDate()).padStart(2, '0');
         return `${year}-${month}-${day}`;
      };

      setStartDate(formatDateValue(start));
      setEndDate(formatDateValue(end));
      setActivePeriod(type);
      setShowReport(true); // Auto refresh
  };

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
      if (type === 'start') setStartDate(value);
      else setEndDate(value);
      setActivePeriod('custom');
  };

  const handleGenerateReport = () => {
    if (!startDate || !endDate) {
      notify('الرجاء تحديد تاريخ البداية والنهاية', 'warning');
      return;
    }
    setShowReport(true);
    notify('تم تحديث بيانات التقرير', 'success');
  };

  // --- DATA PROCESSING ---
  const reportData = useMemo(() => {
    if (!startDate || !endDate || isLoading) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59);

    // 1. Filter Invoices
    let filteredInvoices = invoices.filter(inv => {
      const d = new Date(inv.date);
      return d >= start && d <= end && (selectedCustomerId ? String(inv.customerId) === selectedCustomerId : true);
    });

    // 2. Filter Invoices by Product
    if (selectedProductId) {
        filteredInvoices = filteredInvoices.filter(inv => 
            inv.items.some(item => String(item.productId) === selectedProductId)
        );
    }

    // 3. Filter Expenses - تظهر دائماً في دفتر اليومية
    const filteredExpensesList = expenses.filter(exp => {
      const d = new Date(exp.expenseDate);
      return d >= start && d <= end;
    });
    
    // DEBUG: طباعة بيانات المصروفات للتحقق
    console.log('📊 Reports Debug:', {
      totalExpenses: expenses.length,
      filteredExpenses: filteredExpensesList.length,
      dateRange: { start: start.toISOString(), end: end.toISOString() },
      sampleExpense: expenses[0]
    });

    // Note: ApiExpense doesn't have 'type' field like localStorage version
    // All expenses are treated as regular expenses
    const finalFilteredExpenses = filteredExpensesList;
    
    // هل يتم إخفاء المصروفات من الحسابات عند تحديد عميل/منتج؟
    const hideExpensesFromCalculations = !!selectedCustomerId || !!selectedProductId;
    
    // فلترة الإيرادات الأخرى من جدول Revenues
    const filteredOtherIncome = revenues.filter(rev => {
      const d = new Date(rev.revenueDate);
      return d >= start && d <= end;
    });

    // --- CALCULATIONS ---
    let totalRevenue = 0;
    if (selectedProductId) {
        totalRevenue = filteredInvoices.reduce((sum, inv) => {
            const productItems = inv.items.filter(i => String(i.productId) === selectedProductId);
            return sum + productItems.reduce((s, i) => s + (i.total || 0), 0);
        }, 0);
    } else {
        totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    }

    const totalExpensesVal = finalFilteredExpenses.reduce((sum, exp) => sum + (exp.totalAmount || 0), 0);
    const totalOtherIncomeVal = filteredOtherIncome.reduce((sum, rev) => sum + (rev.totalAmount || 0), 0);
    
    const totalIncome = totalRevenue + totalOtherIncomeVal;
    const netProfit = totalIncome - totalExpensesVal;
    const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0';

    // --- CHART DATA ---
    const dailyData: Record<string, { income: number, expense: number }> = {};
    
    // Helper to add data safely
    const addToDate = (date: string, inc: number, exp: number) => {
        if (!dailyData[date]) dailyData[date] = { income: 0, expense: 0 };
        dailyData[date].income += inc;
        dailyData[date].expense += exp;
    };

    filteredInvoices.forEach(inv => {
        const val = selectedProductId 
            ? inv.items.filter(i => String(i.productId) === selectedProductId).reduce((s, i) => s + i.total, 0)
            : inv.paidAmount;
        addToDate(inv.date, val, 0);
    });
    filteredOtherIncome.forEach(inc => addToDate(inc.expenseDate, inc.amount, 0));
    finalFilteredExpenses.forEach(exp => addToDate(exp.expenseDate, 0, exp.totalAmount));

    const chartData = Object.keys(dailyData).sort().map(date => ({
        date,
        income: dailyData[date].income,
        expense: dailyData[date].expense
    }));

    // --- LEDGER ITEMS ---
    const ledgerItems = [
        ...filteredInvoices.map(i => ({
            date: i.date, 
            type: 'فاتورة مبيعات', 
            ref: i.invoiceNumber || `#${i.id}`,
            desc: `${i.customerName} (${i.type})`, 
            credit: i.paidAmount,
            debit: 0,
            totalAmount: i.totalAmount,
            remaining: i.remainingAmount
        })),
        ...finalFilteredExpenses.map(e => ({
            date: e.expenseDate, 
            type: 'مصروف', 
            ref: e.expenseNumber || '-',
            desc: e.description, 
            credit: 0, 
            debit: e.totalAmount,
            totalAmount: e.totalAmount,
            remaining: 0
        })),
        ...filteredOtherIncome.map(e => ({
            date: e.expenseDate, 
            type: 'إيراد آخر', 
            ref: e.expenseNumber || '-',
            desc: e.description, 
            credit: e.totalAmount, 
            debit: 0,
            totalAmount: e.totalAmount,
            remaining: 0
        }))
    ].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { 
        totalRevenue, totalExpenses: totalExpensesVal, totalOtherIncome: totalOtherIncomeVal, 
        totalIncome, netProfit, profitMargin, chartData, ledgerItems
    };
  }, [startDate, endDate, showReport, selectedCustomerId, selectedProductId, invoices, expenses, isLoading]);

  // --- EXPORT TO CSV ---
  const exportToCSV = () => {
      if (!reportData) return;
      
      const headers = ['التاريخ', 'النوع', 'المرجع', 'الوصف', 'الإجمالي', 'المدفوع (دائن)', 'المتبقي', 'مصروف (مدين)'];
      const rows = reportData.ledgerItems.map(item => [
          item.date,
          item.type,
          item.ref,
          item.desc,
          item.totalAmount,
          item.credit,
          item.remaining,
          item.debit
      ]);

      let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM for Excel Arabic support
      csvContent += headers.join(",") + "\r\n";
      rows.forEach(row => {
          csvContent += row.join(",") + "\r\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `report_${startDate}_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify('تم تصدير التقرير بنجاح', 'success');
  };

  // --- EXPORT TO EXCEL (XLS) ---
  const exportToExcel = () => {
      if (!reportData) return;
      
      // Create HTML table for Excel
      let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="UTF-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>تقرير مالي</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayRightToLeft/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            td, th { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #4472C4; color: white; }
            .income { background-color: #C6EFCE; }
            .expense { background-color: #FFC7CE; }
            .summary { background-color: #E2EFDA; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>${user?.companyName || 'المحاسب الذكي'}</h1>
          <h2>التقرير المالي - من ${startDate} إلى ${endDate}</h2>
          
          <h3>ملخص مالي</h3>
          <table>
            <tr><th>البند</th><th>المبلغ (${currency})</th></tr>
            <tr class="income"><td>إجمالي الإيرادات</td><td>${reportData.totalRevenue.toLocaleString()}</td></tr>
            <tr class="income"><td>إيرادات أخرى</td><td>${reportData.totalOtherIncome.toLocaleString()}</td></tr>
            <tr class="expense"><td>إجمالي المصروفات</td><td>${reportData.totalExpenses.toLocaleString()}</td></tr>
            <tr class="summary"><td>صافي الربح</td><td>${reportData.netProfit.toLocaleString()}</td></tr>
            <tr class="summary"><td>هامش الربح</td><td>${reportData.profitMargin}%</td></tr>
          </table>
          
          <h3>دفتر اليومية</h3>
          <table>
            <tr>
              <th>التاريخ</th>
              <th>النوع</th>
              <th>المرجع</th>
              <th>الوصف</th>
              <th>الإجمالي</th>
              <th>دائن (مدفوع)</th>
              <th>المتبقي</th>
              <th>مدين (مصروف)</th>
            </tr>
            ${reportData.ledgerItems.map(item => `
              <tr class="${item.debit > 0 ? 'expense' : 'income'}">
                <td>${item.date}</td>
                <td>${item.type}</td>
                <td>${item.ref}</td>
                <td>${item.desc}</td>
                <td>${item.totalAmount.toLocaleString()}</td>
                <td>${item.credit.toLocaleString()}</td>
                <td>${item.remaining.toLocaleString()}</td>
                <td>${item.debit.toLocaleString()}</td>
              </tr>
            `).join('')}
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `تقرير_مالي_${startDate}_${endDate}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notify('تم تصدير التقرير إلى Excel', 'success');
  };

  // --- PRINT / PDF ---
  const handlePrint = () => {
      printWithFileName(
          `تقرير_${startDate}_${endDate}`,
          `التقرير المالي - من ${startDate} إلى ${endDate}`
      );
  };

  // --- CHART RENDERING ---
  const renderLineChart = (data: { date: string, income: number, expense: number }[]) => {
      if (data.length === 0) return (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed dark:border-slate-700">
             <FileBarChart size={32} className="mb-2 opacity-50"/>
             <span>لا توجد عمليات مسجلة في هذه الفترة</span>
          </div>
      );

      const height = 250;
      const width = 800;
      const paddingX = 50;
      const paddingY = 30;
      const chartWidth = width - (paddingX * 2);
      const chartHeight = height - (paddingY * 2);

      // Find Max Value
      let maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 100) * 1.1;
      if (maxVal === 0) maxVal = 100; // Prevent divide by zero

      const getX = (index: number) => {
          if (data.length === 1) return width / 2; // Center single point
          return paddingX + (index / (data.length - 1)) * chartWidth;
      };
      const getY = (val: number) => height - paddingY - (val / maxVal) * chartHeight;

      // Generate Points
      const pointsIncome = data.map((d, i) => `${getX(i)},${getY(d.income)}`).join(' ');
      const pointsExpense = data.map((d, i) => `${getX(i)},${getY(d.expense)}`).join(' ');

      // Y Axis Labels
      const yLabels = [0, 1, 2, 3, 4].map(i => {
          const val = Math.round((maxVal / 4) * i);
          return { y: getY(val), val };
      });

      // X Axis Labels
      const labelInterval = Math.ceil(data.length / 6);
      const xLabels = data.filter((_, i) => i === 0 || i === data.length - 1 || i % labelInterval === 0).map((d, i) => {
          const idx = data.findIndex(item => item.date === d.date);
          return { x: getX(idx), label: d.date };
      });

      return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              {/* Grid Lines */}
              {yLabels.map((l, i) => (
                  <g key={i}>
                      <line x1={paddingX} y1={l.y} x2={width - paddingX} y2={l.y} stroke="#e2e8f0" strokeWidth="1" className="stroke-slate-200 dark:stroke-slate-700" strokeDasharray="4"/>
                      <text x={paddingX - 10} y={l.y + 4} textAnchor="end" className="text-[10px] fill-slate-400">{l.val.toLocaleString()}</text>
                  </g>
              ))}

              {/* X Labels */}
              {xLabels.map((l, i) => (
                  <text key={i} x={l.x} y={height - 5} textAnchor="middle" className="text-[10px] fill-slate-500 dark:fill-slate-400">{l.label}</text>
              ))}

              {/* Data Lines or Points */}
              {data.length > 1 ? (
                  <>
                    <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={pointsIncome} strokeLinecap="round" strokeLinejoin="round" />
                    <polyline fill="none" stroke="#f43f5e" strokeWidth="2.5" points={pointsExpense} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5,5" />
                  </>
              ) : (
                  <>
                     <circle cx={getX(0)} cy={getY(data[0].income)} r="6" fill="#10b981" />
                     <circle cx={getX(0)} cy={getY(data[0].expense)} r="6" fill="#f43f5e" />
                  </>
              )}

              {/* Tooltip Hover Areas */}
              {data.map((d, i) => (
                   <g key={i} className="group">
                       <circle cx={getX(i)} cy={getY(d.income)} r="6" fill="transparent" className="hover:fill-emerald-500 cursor-pointer transition-all" />
                       <circle cx={getX(i)} cy={getY(d.expense)} r="6" fill="transparent" className="hover:fill-rose-500 cursor-pointer transition-all" />
                       <title>{`${d.date}\nدخل: ${d.income}\nصرف: ${d.expense}`}</title>
                   </g>
              ))}
          </svg>
      );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">جاري تحميل بيانات التقارير...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       {/* --- HEADER (PRINT ONLY) --- */}
       <div className="hidden print:block pb-4 border-b-2 border-slate-800 mb-4">
           <div className="flex justify-between items-center">
               <div>
                   <h1 className="text-2xl font-extrabold text-slate-900 mb-0.5">{user?.companyName || 'المحاسب الذكي'}</h1>
                   <p className="text-slate-600 font-bold text-sm">تقرير الأداء المالي الشامل</p>
               </div>
               <div className="text-left text-xs text-slate-600">
                   <p><span className="font-bold">تاريخ التقرير:</span> {formatDateTime(new Date())}</p>
                   <p><span className="font-bold">الفترة:</span> من {startDate} إلى {endDate}</p>
                   {selectedCustomerId && <p className="bg-slate-100 px-2 rounded mt-0.5 text-xs">تصفية: {customers.find(c => String(c.id) === selectedCustomerId)?.name}</p>}
                   {selectedProductId && <p className="bg-slate-100 px-2 rounded mt-0.5 text-xs">تصفية: {products.find(p => String(p.id) === selectedProductId)?.name}</p>}
               </div>
           </div>
       </div>

       {/* --- CONTROLS (SCREEN ONLY) --- */}
       <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 print:hidden">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Filter size={18} className="text-primary dark:text-blue-400"/> 
                إعدادات التقرير
            </h2>
            
            {/* Quick Date Filters */}
            <div className="flex flex-wrap bg-slate-100 dark:bg-slate-700 p-1 rounded-lg gap-0.5">
                <button 
                    onClick={() => setDateRange('all')} 
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${activePeriod === 'all' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                    الكل
                </button>
                <button 
                    onClick={() => setDateRange('week')} 
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${activePeriod === 'week' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                    أسبوع
                </button>
                <button 
                    onClick={() => setDateRange('month')} 
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${activePeriod === 'month' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                    شهر
                </button>
                <button 
                    onClick={() => setDateRange('year')} 
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${activePeriod === 'year' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                    سنة
                </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
             {/* Dates */}
             <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">من تاريخ</label>
                <DateInput value={startDate} onChange={(val) => handleCustomDateChange('start', val)} className="w-full border border-slate-200 dark:border-slate-600 p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"/>
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">إلى تاريخ</label>
                <DateInput value={endDate} onChange={(val) => handleCustomDateChange('end', val)} className="w-full border border-slate-200 dark:border-slate-600 p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"/>
             </div>
             
             {/* Customer Filter with Search */}
             <div className="relative customer-dropdown-container">
                 <label className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                   <User size={12} className="text-blue-500" />
                   عميل
                   <span className="text-slate-400 font-normal text-[10px]">(اختياري)</span>
                 </label>
                 <div className="relative">
                   <input
                     type="text"
                     placeholder={selectedCustomerId ? customers.find(c => String(c.id) === selectedCustomerId)?.name : `ابحث في ${customers.length} عميل...`}
                     value={customerSearch}
                     onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                     onFocus={() => setShowCustomerDropdown(true)}
                     className={`w-full border border-slate-200 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary pr-8 text-sm ${selectedCustomerId ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30' : ''}`}
                   />
                   <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                   {selectedCustomerId && (
                     <button 
                       onClick={() => { setSelectedCustomerId(''); setCustomerSearch(''); }}
                       className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 font-bold"
                     >×</button>
                   )}
                 </div>
                 {showCustomerDropdown && (
                   <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                     <div 
                       className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer text-sm text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-600"
                       onClick={() => { setSelectedCustomerId(''); setCustomerSearch(''); setShowCustomerDropdown(false); }}
                     >
                       -- كل العملاء ({customers.length}) --
                     </div>
                     {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                       <div 
                         key={c.id}
                         className={`p-2 hover:bg-blue-50 dark:hover:bg-slate-600 cursor-pointer text-sm ${String(c.id) === selectedCustomerId ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}
                         onClick={() => { setSelectedCustomerId(String(c.id)); setCustomerSearch(''); setShowCustomerDropdown(false); }}
                       >
                         {c.name} {c.phone ? <span className="text-xs text-slate-400">({c.phone})</span> : ''}
                       </div>
                     )) : (
                       <div className="p-3 text-center text-sm text-slate-400">لا توجد نتائج</div>
                     )}
                   </div>
                 )}
             </div>

             {/* Product Filter with Search */}
             <div className="relative product-dropdown-container">
                 <label className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                   <Package size={12} className="text-emerald-500" />
                   منتج
                   <span className="text-slate-400 font-normal text-[10px]">(اختياري)</span>
                 </label>
                 <div className="relative">
                   <input
                     type="text"
                     placeholder={selectedProductId ? products.find(p => String(p.id) === selectedProductId)?.name : `ابحث في ${products.length} منتج...`}
                     value={productSearch}
                     onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                     onFocus={() => setShowProductDropdown(true)}
                     className={`w-full border border-slate-200 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary pr-8 text-sm ${selectedProductId ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' : ''}`}
                   />
                   <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                   {selectedProductId && (
                     <button 
                       onClick={() => { setSelectedProductId(''); setProductSearch(''); }}
                       className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 font-bold"
                     >×</button>
                   )}
                 </div>
                 {showProductDropdown && (
                   <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                     <div 
                       className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer text-sm text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-600"
                       onClick={() => { setSelectedProductId(''); setProductSearch(''); setShowProductDropdown(false); }}
                     >
                       -- كل المنتجات ({products.length}) --
                     </div>
                     {filteredProducts.length > 0 ? filteredProducts.map(p => (
                       <div 
                         key={p.id}
                         className={`p-2 hover:bg-emerald-50 dark:hover:bg-slate-600 cursor-pointer text-sm ${String(p.id) === selectedProductId ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}
                         onClick={() => { setSelectedProductId(String(p.id)); setProductSearch(''); setShowProductDropdown(false); }}
                       >
                         {p.name} <span className="text-xs text-slate-400">- {p.price} {currency}</span>
                       </div>
                     )) : (
                       <div className="p-3 text-center text-sm text-slate-400">لا توجد نتائج</div>
                     )}
                   </div>
                 )}
             </div>
          </div>

          {/* Active Filters Display */}
          {(selectedCustomerId || selectedProductId) && (
            <div className="flex flex-wrap items-center gap-2 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <span className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                  <Filter size={14} /> التصفية النشطة:
                </span>
                {selectedCustomerId && (
                    <span className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5">
                        <User size={12} /> {customers.find(c => String(c.id) === selectedCustomerId)?.name}
                        <button onClick={() => setSelectedCustomerId('')} className="hover:text-red-500 p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"><X size={12}/></button>
                    </span>
                )}
                {selectedProductId && (
                    <span className="bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5">
                        <Package size={12} /> {products.find(p => String(p.id) === selectedProductId)?.name}
                        <button onClick={() => setSelectedProductId('')} className="hover:text-red-500 p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"><X size={12}/></button>
                    </span>
                )}
                <button 
                    onClick={() => { setSelectedCustomerId(''); setSelectedProductId(''); }}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline font-bold flex items-center gap-1"
                >
                    <X size={12}/> مسح كل الفلاتر
                </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 pt-4 border-t border-slate-50 dark:border-slate-700 mt-4">
                {reportData && (
                    <>
                    <button 
                      onClick={exportToCSV} 
                      className="col-span-1 sm:flex-1 bg-slate-600 text-white px-3 py-2 rounded-lg hover:bg-slate-700 flex items-center justify-center gap-2 font-bold transition-colors shadow-sm text-sm"
                    >
                        <FileText size={16}/> CSV
                    </button>
                    <button 
                      onClick={exportToExcel} 
                      className="col-span-1 sm:flex-1 bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2 font-bold transition-colors shadow-sm text-sm"
                    >
                        <FileSpreadsheet size={16}/> Excel
                    </button>
                    </>
                )}

                <button 
                  onClick={handlePrint} 
                  disabled={!showReport} 
                  className={`col-span-1 sm:flex-1 px-3 py-2 rounded-lg border flex items-center justify-center gap-2 font-bold transition-colors text-sm ${showReport ? 'bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-700 dark:hover:bg-slate-600 border-slate-700 dark:border-slate-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-700'}`}
                >
                    <Printer size={16}/> طباعة / PDF
                </button>
          </div>
       </div>

       {/* --- REPORT CONTENT --- */}
       {showReport && reportData ? (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 print:space-y-3 print:flex print:flex-col">
               
               {/* Summary Cards - سطر واحد أفقي */}
               <div className="flex flex-wrap md:flex-nowrap gap-3 md:gap-4 print:gap-1.5 print:order-1">
                   <div className="flex-1 min-w-[120px] bg-white dark:bg-slate-800 p-3 md:p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 print:border-black print:p-2 print:shadow-none print:rounded-md">
                       <p className="text-slate-500 dark:text-slate-400 text-xs mb-0.5 font-bold print:text-[9px]">إيراد المبيعات</p>
                       <p className="text-base md:text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 print:text-black print:text-sm">
                           <TrendingUp size={16} className="print:hidden shrink-0"/> {reportData.totalRevenue.toLocaleString()}
                       </p>
                       {selectedProductId && <span className="text-[9px] text-slate-400">خاص بالمنتج</span>}
                   </div>
                   
                   {!selectedProductId && !selectedCustomerId && (
                    <>
                       <div className="flex-1 min-w-[120px] bg-white dark:bg-slate-800 p-3 md:p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 print:border-black print:p-2 print:shadow-none print:rounded-md">
                           <p className="text-slate-500 dark:text-slate-400 text-xs mb-0.5 font-bold print:text-[9px]">إيرادات أخرى</p>
                           <p className="text-base md:text-xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 print:text-black print:text-sm">
                               <ArrowUpRight size={16} className="print:hidden shrink-0"/> {reportData.totalOtherIncome.toLocaleString()}
                           </p>
                       </div>
                       <div className="flex-1 min-w-[120px] bg-white dark:bg-slate-800 p-3 md:p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 print:border-black print:p-2 print:shadow-none print:rounded-md">
                           <p className="text-slate-500 dark:text-slate-400 text-xs mb-0.5 font-bold print:text-[9px]">المصروفات</p>
                           <p className="text-base md:text-xl font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 print:text-black print:text-sm">
                               <ArrowDownLeft size={16} className="print:hidden shrink-0"/> {reportData.totalExpenses.toLocaleString()}
                           </p>
                       </div>
                    </>
                   )}

                   <div className={`flex-1 min-w-[140px] p-3 md:p-4 rounded-xl shadow-sm border print:p-2 print:shadow-none print:border-black print:rounded-md ${reportData.netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900'}`}>
                       <div className="flex justify-between items-center">
                           <div>
                               <p className={`text-xs mb-0.5 font-bold print:text-[9px] ${reportData.netProfit >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'} print:text-black`}>
                                   {selectedProductId ? 'صافي المبيعات' : 'صافي الربح'}
                               </p>
                               <p className={`text-base md:text-xl font-bold flex items-center gap-1 print:text-sm ${reportData.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'} print:text-black`}>
                                   <DollarSign size={16} className="print:hidden shrink-0"/> {reportData.netProfit.toLocaleString()} <span className="text-[9px] opacity-70">{currency}</span>
                               </p>
                           </div>
                           {!selectedProductId && !selectedCustomerId && (
                               <div className="text-center print:hidden">
                                   <PieChart size={18} className={reportData.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}/>
                                   <span className="text-[10px] font-bold block">{reportData.profitMargin}%</span>
                               </div>
                           )}
                       </div>
                   </div>
               </div>

               {/* Charts Visualization - يظهر في النهاية عند الطباعة */}
               <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 print:border-black print:break-inside-avoid print:order-3 print:mt-4 print:p-4">
                   <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800 dark:text-white print:text-black print:text-sm print:mb-2">
                       <FileBarChart size={20} className="text-slate-500 dark:text-slate-400 print:hidden"/>
                       المسار الزمني (أيام العمليات)
                   </h3>
                   
                   {/* Legend */}
                   <div className="flex justify-center gap-6 mb-4 text-xs dark:text-slate-400 print:text-black print:gap-4 print:mb-2 print:text-[10px]">
                       <div className="flex items-center gap-2 print:gap-1"><div className="w-8 h-1 bg-emerald-500 rounded print:bg-black print:h-0.5 print:w-6"></div> الخط الأخضر: الدخل</div>
                       <div className="flex items-center gap-2 print:gap-1"><div className="w-8 h-1 bg-rose-500 rounded print:bg-gray-400 print:h-0.5 print:border-t print:border-dashed print:w-6"></div> الخط الأحمر: المصروفات</div>
                   </div>

                   {/* Line Chart */}
                   <div className="h-64 border-l border-b border-slate-200 dark:border-slate-700 pl-4 pb-4 print:border-black print:h-40 print:pl-2 print:pb-2">
                       {renderLineChart(reportData.chartData)}
                   </div>
               </div>

               {/* Transaction Ledger Table (Debit/Credit Style) - يظهر أولاً عند الطباعة */}
               <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden print:border print:border-black print:order-2">
                   <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 print:bg-gray-100 print:text-black print:border-black print:p-2">
                       <div className="flex flex-wrap items-center justify-between gap-3">
                           <h3 className="font-bold text-slate-700 dark:text-slate-300 print:text-black print:text-sm">دفتر اليومية (تفاصيل العمليات)</h3>
                           
                           {/* Controls - hidden in print */}
                           <div className="flex flex-wrap items-center gap-2 print:hidden">
                               {/* Search */}
                               <div className="relative">
                                   <Search size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"/>
                                   <input
                                       type="text"
                                       placeholder="بحث..."
                                       value={ledgerSearch}
                                       onChange={e => setLedgerSearch(e.target.value)}
                                       className="pl-2 pr-8 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white w-36 focus:outline-none focus:border-primary"
                                   />
                               </div>
                               
                               {/* Type Filter */}
                               <select
                                   value={ledgerTypeFilter}
                                   onChange={e => setLedgerTypeFilter(e.target.value as any)}
                                   className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-primary"
                               >
                                   <option value="all">كل الأنواع</option>
                                   <option value="invoices">فواتير فقط</option>
                                   <option value="expenses">مصروفات فقط</option>
                                   <option value="income">إيرادات أخرى</option>
                               </select>
                               
                               {/* Print Button */}
                               <button
                                   onClick={() => printWithFileName({ 
                                     companyName: user?.companyName, 
                                     type: 'سجل المعاملات' 
                                   })}
                                   className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors"
                               >
                                   <Printer size={14}/>
                                   طباعة
                               </button>
                               
                               {/* Export CSV */}
                               <button
                                   onClick={exportToCSV}
                                   className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                               >
                                   <Download size={14}/>
                                   تصدير
                               </button>
                           </div>
                       </div>
                       
                       {/* Results count */}
                       <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 print:mt-1 print:text-[10px]">
                           <span className="bg-white dark:bg-slate-700 px-2 py-1 rounded border dark:border-slate-600 print:border-black print:px-1 print:py-0.5">
                               {(() => {
                                   const filtered = reportData.ledgerItems.filter(item => {
                                       const matchesSearch = !ledgerSearch || 
                                           item.desc.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                                           item.ref.toLowerCase().includes(ledgerSearch.toLowerCase());
                                       const matchesType = ledgerTypeFilter === 'all' ||
                                           (ledgerTypeFilter === 'invoices' && item.type === 'فاتورة مبيعات') ||
                                           (ledgerTypeFilter === 'expenses' && item.type === 'مصروف') ||
                                           (ledgerTypeFilter === 'income' && item.type === 'إيراد آخر');
                                       return matchesSearch && matchesType;
                                   });
                                   return `${filtered.length} عملية`;
                               })()}
                           </span>
                           {(ledgerSearch || ledgerTypeFilter !== 'all') && (
                               <button 
                                   onClick={() => { setLedgerSearch(''); setLedgerTypeFilter('all'); }}
                                   className="text-rose-500 hover:text-rose-700 print:hidden"
                               >
                                   إزالة الفلتر
                               </button>
                           )}
                       </div>
                   </div>
                   
                   <div className="overflow-x-auto">
                       <table className="w-full text-right text-sm print:text-[9px]">
                           <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 print:bg-gray-200 print:text-black font-bold">
                               <tr>
                                   <th className="p-3 border-b dark:border-slate-700 print:border-black print:p-1.5 print:text-[9px]">التاريخ</th>
                                   <th className="p-3 border-b dark:border-slate-700 print:border-black print:p-1.5 print:text-[9px]">النوع</th>
                                   <th className="p-3 border-b dark:border-slate-700 print:border-black print:p-1.5 print:text-[9px]">البيان</th>
                                   <th className="p-3 border-b dark:border-slate-700 print:border-black text-left text-blue-700 print:text-black print:p-1.5 print:text-[9px]">الإجمالي</th>
                                   <th className="p-3 border-b dark:border-slate-700 print:border-black text-left text-emerald-700 print:text-black print:p-1.5 print:text-[9px]">دائن</th>
                                   <th className="p-3 border-b dark:border-slate-700 print:border-black text-left text-amber-600 print:text-black print:p-1.5 print:text-[9px]">المتبقي</th>
                                   <th className="p-3 border-b dark:border-slate-700 print:border-black text-left text-rose-700 print:text-black print:p-1.5 print:text-[9px]">مدين</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 dark:divide-slate-700 print:divide-gray-300 text-slate-800 dark:text-slate-200">
                               {reportData.ledgerItems
                                   .filter(item => {
                                       const matchesSearch = !ledgerSearch || 
                                           item.desc.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                                           item.ref.toLowerCase().includes(ledgerSearch.toLowerCase());
                                       const matchesType = ledgerTypeFilter === 'all' ||
                                           (ledgerTypeFilter === 'invoices' && item.type === 'فاتورة مبيعات') ||
                                           (ledgerTypeFilter === 'expenses' && item.type === 'مصروف') ||
                                           (ledgerTypeFilter === 'income' && item.type === 'إيراد آخر');
                                       return matchesSearch && matchesType;
                                   })
                                   .map((item, idx) => (
                                   <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700 print:text-black">
                                       <td className="p-3 print:border-l print:border-gray-300 print:p-1 print:text-[8px]">{item.date}</td>
                                       <td className="p-3 print:border-l print:border-gray-300 text-xs font-bold print:p-1 print:text-[8px]">{item.type}</td>
                                       <td className="p-3 print:border-l print:border-gray-300 print:p-1 print:text-[8px]">
                                           <div className="flex flex-col">
                                               <span>{item.desc}</span>
                                               {item.ref !== '-' && <span className="text-[10px] text-slate-400 print:text-gray-500 print:text-[7px]">{item.ref}</span>}
                                           </div>
                                       </td>
                                       <td className="p-3 text-left font-mono print:border-l print:border-gray-300 text-blue-600 dark:text-blue-400 print:text-black print:p-1 print:text-[8px]">
                                           {item.totalAmount > 0 ? item.totalAmount.toLocaleString() : '-'}
                                       </td>
                                       <td className="p-3 text-left font-mono print:border-l print:border-gray-300 text-emerald-600 dark:text-emerald-400 print:text-black print:p-1 print:text-[8px]">
                                           {item.credit > 0 ? item.credit.toLocaleString() : '-'}
                                       </td>
                                       <td className="p-3 text-left font-mono print:border-l print:border-gray-300 text-amber-600 dark:text-amber-400 font-bold print:text-black print:p-1 print:text-[8px]">
                                           {item.remaining > 0 ? item.remaining.toLocaleString() : '-'}
                                       </td>
                                       <td className="p-3 text-left font-mono print:border-l print:border-gray-300 text-rose-600 dark:text-rose-400 print:text-black print:p-1 print:text-[8px]">
                                           {item.debit > 0 ? item.debit.toLocaleString() : '-'}
                                       </td>
                                   </tr>
                               ))}
                               {/* Footer Totals Row */}
                               {(() => {
                                   const filteredItems = reportData.ledgerItems.filter(item => {
                                       const matchesSearch = !ledgerSearch || 
                                           item.desc.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                                           item.ref.toLowerCase().includes(ledgerSearch.toLowerCase());
                                       const matchesType = ledgerTypeFilter === 'all' ||
                                           (ledgerTypeFilter === 'invoices' && item.type === 'فاتورة مبيعات') ||
                                           (ledgerTypeFilter === 'expenses' && item.type === 'مصروف') ||
                                           (ledgerTypeFilter === 'income' && item.type === 'إيراد آخر');
                                       return matchesSearch && matchesType;
                                   });
                                   return (
                                       <tr className="bg-slate-100 dark:bg-slate-900 font-bold border-t-2 border-slate-300 dark:border-slate-600 print:border-black print:bg-gray-200">
                                           <td colSpan={3} className="p-3 text-center print:p-1.5 print:text-[9px]">الإجماليات</td>
                                           <td className="p-3 text-left text-blue-700 dark:text-blue-400 print:text-black print:p-1.5 print:text-[9px]">{filteredItems.reduce((sum, item) => sum + item.totalAmount, 0).toLocaleString()}</td>
                                           <td className="p-3 text-left text-emerald-700 dark:text-emerald-400 print:text-black print:p-1.5 print:text-[9px]">{filteredItems.reduce((sum, item) => sum + item.credit, 0).toLocaleString()}</td>
                                           <td className="p-3 text-left text-amber-600 dark:text-amber-400 font-bold print:text-black print:p-1.5 print:text-[9px]">{filteredItems.reduce((sum, item) => sum + item.remaining, 0).toLocaleString()}</td>
                                           <td className="p-3 text-left text-rose-700 dark:text-rose-400 print:text-black print:p-1.5 print:text-[9px]">{filteredItems.reduce((sum, item) => sum + item.debit, 0).toLocaleString()}</td>
                                       </tr>
                                   );
                               })()}
                           </tbody>
                       </table>
                   </div>
               </div>
           </div>
       ) : (
           <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-60">
               <PieChart size={64} className="mb-4 text-slate-300 dark:text-slate-600"/>
               <p>قم بتحديد الفترة لعرض التقرير تلقائياً</p>
           </div>
       )}
    </div>
  );
};

export default Reports;