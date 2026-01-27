import React, { useMemo, useEffect, useState } from 'react';
import { ArrowDownRight, TrendingUp, Package, PieChart, Users, FileText, Banknote, Clock, Wallet, RefreshCw, Loader2, ShoppingCart, Receipt, Target, Award, AlertTriangle, CheckCircle, Activity, Settings2, CreditCard } from 'lucide-react';
import { useCustomers, useProducts, useInvoices, useExpenses, useRevenues } from '../services/dataHooks';
import { useSettings } from '../context/SettingsContext';
import { formatDateArabic, formatDate } from '../services/dateService';
import { usePagePermission } from '../services/permissionsHooks';
import AccessDenied from '../components/AccessDenied';
import { useAuth } from '../context/AuthContext';
import { accountApi, AccountUsageDto } from '../services/adminApi';
import WidgetSettingsPanel from '../components/WidgetSettingsPanel';
import { useDashboardWidgets } from '../services/useDashboardWidgets';

const Dashboard: React.FC = () => {
  const { currency, autoRefreshEnabled, autoRefreshInterval } = useSettings();
  const { user } = useAuth();
  
  // Account Usage State
  const [accountUsage, setAccountUsage] = useState<AccountUsageDto | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  
  // Auto Refresh Countdown (local to Dashboard)
  const [refreshCountdown, setRefreshCountdown] = useState(autoRefreshInterval || 30);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Widget Customization
  const { 
    widgets,
    handleToggleVisibility, 
    handleReset 
  } = useDashboardWidgets();
  const [showWidgetSettings, setShowWidgetSettings] = useState(false);
  
  // API Hooks
  const { customers, loading: customersLoading, refresh: refreshCustomers } = useCustomers();
  const { products, loading: productsLoading, refresh: refreshProducts } = useProducts();
  const { invoices, loading: invoicesLoading, refresh: refreshInvoices } = useInvoices();
  const { expenses, loading: expensesLoading, refresh: refreshExpenses } = useExpenses();
  const { revenues, loading: revenuesLoading, refresh: refreshRevenues } = useRevenues();
  
  // ==================== صلاحيات الصفحة ====================
  const pagePerms = usePagePermission('dashboard');
  
  const isLoading = customersLoading || productsLoading || invoicesLoading || expensesLoading || revenuesLoading;

  // Helper to check widget visibility
  const isWidgetVisible = (widgetType: string) => {
    const widget = widgets.find(w => w.type === widgetType);
    return widget?.visible ?? true;
  };

  // Load account usage
  useEffect(() => {
    const loadAccountUsage = async () => {
      if (user?.accountId) {
        try {
          setUsageLoading(true);
          const usage = await accountApi.getUsage(user.accountId);
          setAccountUsage(usage);
        } catch (error) {
          console.error('Error loading account usage:', error);
        } finally {
          setUsageLoading(false);
        }
      }
    };
    loadAccountUsage();
  }, [user?.accountId]);

  // Auto Refresh Timer for Dashboard
  useEffect(() => {
    if (!autoRefreshEnabled || autoRefreshInterval <= 0) {
      setRefreshCountdown(autoRefreshInterval > 0 ? autoRefreshInterval : 30);
      return;
    }
    
    const interval = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          // تحديث البيانات
          handleRefresh();
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, autoRefreshInterval]);

  // Handle manual/auto refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshCustomers?.(),
        refreshProducts?.(),
        refreshInvoices?.(),
        refreshExpenses?.(),
        refreshRevenues?.()
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
      setRefreshCountdown(autoRefreshInterval || 30);
    }
  };

  // إذا لم يكن لديه صلاحية عرض الصفحة
  if (pagePerms.checked && !pagePerms.canView) {
    return <AccessDenied />;
  }

  // Calculate stats from API data
  const stats = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    // المصروفات = كل شيء ليس مشتريات ولا إيرادات أخرى
    const totalExpenses = expenses
      .filter(exp => !exp.transactionTypeCode?.includes('PURCHASE') && exp.transactionTypeCode !== 'OTHER_REV')
      .reduce((sum, exp) => sum + (exp.totalAmount || 0), 0);
    // المشتريات = كل ما يحتوي على PURCHASE
    const totalPurchases = expenses
      .filter(exp => exp.transactionTypeCode?.includes('PURCHASE'))
      .reduce((sum, exp) => sum + (exp.totalAmount || 0), 0);
    const outstandingDebts = invoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);
    // الإيرادات الأخرى من جدول Expenses (متوافق مع صفحة المصروفات)
    const totalOtherIncome = expenses
      .filter(exp => exp.transactionTypeCode === 'OTHER_REV')
      .reduce((sum, exp) => sum + (exp.totalAmount || 0), 0);
    const netProfit = totalRevenue + totalOtherIncome - totalExpenses - totalPurchases;
    
    return {
      totalRevenue,
      totalExpenses,
      totalPurchases,
      netProfit,
      outstandingDebts,
      totalOtherIncome
    };
  }, [invoices, expenses]);

  // Revenue Breakdown
  const revenueBreakdown = useMemo(() => {
    // تحديد نوع الفاتورة بناءً على المبلغ المتبقي (لأن type قد يكون فارغ)
    // فاتورة آجلة = لها مبلغ متبقي أكبر من 0
    // فاتورة نقدية = المبلغ المتبقي = 0 (مدفوعة بالكامل)
    const cashInvoices = invoices.filter(i => (i.remainingAmount || 0) <= 0);
    const creditInvoices = invoices.filter(i => (i.remainingAmount || 0) > 0);
    
    // مبيعات فورية = المدفوع من الفواتير النقدية
    const directSales = cashInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    // تحصيل آجل = المدفوع من الفواتير الآجلة (التي لا زال عليها متبقي)
    const collections = creditInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    // الإيرادات الأخرى من Expenses (متوافق مع صفحة المصروفات)
    const otherIncome = expenses
      .filter(exp => exp.transactionTypeCode === 'OTHER_REV')
      .reduce((sum, exp) => sum + (exp.totalAmount || 0), 0);
    
    return {
      directSales,
      collections,
      otherIncome
    };
  }, [invoices, expenses]);

  // Robust Monthly Chart Data Calculation
  const monthlyData = useMemo(() => {
    const data = new Array(12).fill(0).map(() => ({ revenue: 0, expense: 0, otherIncome: 0 }));
    
    // Robust date parsing for 'YYYY-MM-DD'
    const getMonthFromDateStr = (dateStr: string) => {
        if (!dateStr) return -1;
        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length >= 2) {
                const month = parseInt(parts[1], 10) - 1; // 0-indexed
                if (!isNaN(month)) return month;
            }
        }
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return d.getMonth();
        }
        return -1;
    };

    invoices.forEach(inv => {
      const month = getMonthFromDateStr(inv.date);
      if(month >= 0 && month < 12) data[month].revenue += inv.totalAmount;
    });

    // المصروفات والمشتريات (بدون الإيرادات الأخرى)
    expenses.forEach(exp => {
      const month = getMonthFromDateStr(exp.expenseDate);
      if(month >= 0 && month < 12) {
          // لا تحسب الإيرادات الأخرى ضمن المصروفات
          if (exp.transactionTypeCode !== 'OTHER_REV') {
              data[month].expense += Number(exp.totalAmount) || 0;
          }
      }
    });

    // إضافة الإيرادات الأخرى للمخطط الشهري (من Expenses مع نوع OTHER_REV)
    expenses
      .filter(exp => exp.transactionTypeCode === 'OTHER_REV')
      .forEach(exp => {
        const month = getMonthFromDateStr(exp.expenseDate);
        if(month >= 0 && month < 12) {
            data[month].otherIncome += Number(exp.totalAmount) || 0;
        }
      });

    return data;
  }, [invoices, expenses]);

  // تفاصيل الإيرادات الأخرى
  const otherIncomeDetails = useMemo(() => {
    return expenses
      .filter(exp => exp.transactionTypeCode === 'OTHER_REV')
      .map(exp => ({
        id: exp.id,
        description: exp.description,
        amount: exp.totalAmount || 0,
        date: exp.expenseDate
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses]);

  // Invoice Counts Breakdown
  const invoiceStats = useMemo(() => {
      // الفواتير الآجلة = الفواتير التي لها مبلغ متبقي > 0
      const creditInvoices = invoices.filter(i => (i.remainingAmount || 0) > 0);
      const cashInvoices = invoices.filter(i => (i.remainingAmount || 0) === 0);
      return { total: invoices.length, cash: cashInvoices.length, credit: creditInvoices.length };
  }, [invoices]);

  // Performance Indicators
  const performanceIndicators = useMemo(() => {
    const profitMargin = stats.totalRevenue > 0 ? ((stats.netProfit / stats.totalRevenue) * 100) : 0;
    const collectionRate = invoices.length > 0 
      ? ((invoices.reduce((sum, inv) => sum + inv.paidAmount, 0) / invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)) * 100) || 0
      : 0;
    const avgInvoiceValue = invoices.length > 0 
      ? invoices.reduce((sum, inv) => sum + inv.totalAmount, 0) / invoices.length 
      : 0;
    const lowStockProducts = products.filter((p: any) => p.stock <= (p.minStockLevel || 5)).length;
    
    return {
      profitMargin: profitMargin.toFixed(1),
      collectionRate: collectionRate.toFixed(1),
      avgInvoiceValue,
      lowStockProducts,
      totalSales: invoices.length,
      activeCustomers: customers.filter((c: any) => c.isActive !== false).length
    };
  }, [stats, invoices, products, customers]);

  // حساب الفترة الزمنية للبيانات
  const dataPeriod = useMemo(() => {
    const allDates: Date[] = [];
    
    invoices.forEach(inv => {
      if (inv.date) allDates.push(new Date(inv.date));
    });
    expenses.forEach(exp => {
      if (exp.expenseDate) allDates.push(new Date(exp.expenseDate));
    });
    
    if (allDates.length === 0) {
      return { from: null, to: null, text: 'لا توجد بيانات' };
    }
    
    const sortedDates = allDates.sort((a, b) => a.getTime() - b.getTime());
    const from = sortedDates[0];
    const to = sortedDates[sortedDates.length - 1];
    
    return {
      from,
      to,
      text: `${formatDate(from)} - ${formatDate(to)}`
    };
  }, [invoices, expenses]);

  // Find max value for scaling chart
  const maxChartValue = Math.max(
    ...monthlyData.map(d => Math.max(d.revenue, d.expense, d.otherIncome)), 
    500 // Minimum scale fallback
  );

  // Top Products Calculation
  const topProducts = useMemo(() => {
      const counts: Record<string, number> = {};
      invoices.forEach(inv => {
          inv.items.forEach(item => {
              counts[item.name] = (counts[item.name] || 0) + item.quantity;
          });
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
  }, [invoices]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  // Stats Card Component
  const StatCard = ({ title, value, color, icon: Icon, children, period }: any) => (
    <div className="bg-white dark:bg-slate-800/80 p-2 sm:p-3 md:p-5 rounded-lg sm:rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 flex flex-col justify-between transition-all hover:shadow-md active:scale-[0.98] md:hover:scale-[1.02] duration-200 h-full relative overflow-hidden backdrop-blur-sm">
      <div className="flex items-start justify-between gap-1 sm:gap-2 mb-1 sm:mb-2 z-10">
          <div className="flex-1 min-w-0">
            <p className="text-slate-600 dark:text-slate-300 text-[9px] sm:text-xs md:text-sm font-medium mb-0.5 sm:mb-1 leading-tight truncate">{title}</p>
            <h3 className={`text-base sm:text-xl md:text-3xl font-black ${color} leading-none tracking-tight tabular-nums`} style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
              {value.toLocaleString('en-US')}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[7px] sm:text-[9px] md:text-xs text-slate-400 dark:text-slate-500 font-medium">{currency}</span>
            </div>
          </div>
          <div className={`p-1 sm:p-2 md:p-3 rounded-md sm:rounded-lg md:rounded-xl bg-opacity-10 dark:bg-opacity-30 ${color.replace('text', 'bg')} shrink-0`}>
            <Icon className={`${color} w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5`} />
          </div>
      </div>
      {children && <div className="mt-1.5 sm:mt-3 md:mt-4 pt-1.5 sm:pt-2 md:pt-3 border-t border-slate-100 dark:border-slate-700/50 z-10">{children}</div>}
    </div>
  );

  // Calculation for the comparison bar
  const totalIncomeAll = stats.totalRevenue + stats.totalOtherIncome;
  const totalExpenseAll = stats.totalExpenses + stats.totalPurchases;
  const totalVolume = totalIncomeAll + totalExpenseAll || 1; // avoid divide by zero

  return (
    <div className="space-y-4 md:space-y-6 px-1 md:px-0">
      {/* رأس الصفحة المدمج - سطر واحد */}
      <div className="flex items-center justify-between gap-1">
        {/* العنوان */}
        <div className="flex items-center gap-1 md:gap-2 min-w-0">
          <Activity className="text-primary shrink-0 w-4 h-4 md:w-5 md:h-5" />
          <h2 className="text-xs sm:text-sm md:text-xl font-bold text-slate-800 dark:text-white truncate">لوحة البيانات</h2>
        </div>
        
        {/* المعلومات والأزرار */}
        <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 shrink-0">
          <div className="hidden sm:flex text-[7px] sm:text-[8px] md:text-[10px] bg-blue-50 dark:bg-blue-900/30 px-1 sm:px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-blue-600 dark:text-blue-400 whitespace-nowrap items-center gap-0.5">
            📊 {dataPeriod.text}
          </div>
          <div className={`text-[7px] sm:text-[8px] md:text-[11px] px-1 sm:px-1.5 md:px-2 py-0.5 md:py-1 rounded-full font-semibold flex items-center gap-0.5 ${stats.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
            {stats.netProfit >= 0 ? <TrendingUp className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> : <ArrowDownRight className="w-2 h-2 sm:w-2.5 sm:h-2.5" />}
            <span className="hidden sm:inline">{stats.netProfit >= 0 ? 'إيجابي' : 'مراجعة'}</span>
          </div>
          <div className="text-[7px] sm:text-[8px] md:text-[11px] bg-slate-100 dark:bg-slate-800 px-1 sm:px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {formatDate(new Date())}
          </div>
          {/* Auto Refresh Indicator */}
          {autoRefreshEnabled && autoRefreshInterval > 0 && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="relative flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-cyan-50 dark:bg-cyan-900/30 rounded-full shadow-sm text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-700 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-all shrink-0 overflow-hidden text-[7px] sm:text-[9px] md:text-[10px] font-medium"
              title={`تحديث تلقائي خلال ${refreshCountdown}ث`}
            >
              {/* Progress Background */}
              <div 
                className="absolute inset-0 bg-cyan-200 dark:bg-cyan-700/50 transition-all duration-1000 ease-linear"
                style={{ width: `${((autoRefreshInterval - refreshCountdown) / autoRefreshInterval) * 100}%` }}
              />
              <RefreshCw className={`w-2.5 h-2.5 sm:w-3 sm:h-3 relative z-10 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="relative z-10 tabular-nums">{refreshCountdown}</span>
            </button>
          )}
          <button
            onClick={() => setShowWidgetSettings(true)}
            className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 bg-white dark:bg-slate-800 rounded-full shadow-sm text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-all shrink-0"
            title="تخصيص"
          >
            <Settings2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-blue-500" />
          </button>
        </div>
      </div>

      {/* Widget Settings Panel */}
      <WidgetSettingsPanel
        isOpen={showWidgetSettings}
        onClose={() => setShowWidgetSettings(false)}
        widgets={widgets}
        onToggleVisibility={handleToggleVisibility}
        onReset={handleReset}
      />

      {/* Mobile Auto Refresh Bar */}
      {autoRefreshEnabled && autoRefreshInterval > 0 && (
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="sm:hidden relative w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800 overflow-hidden"
        >
          {/* Progress Bar */}
          <div 
            className="absolute inset-y-0 right-0 bg-cyan-200/50 dark:bg-cyan-700/30 transition-all duration-1000 ease-linear"
            style={{ width: `${((autoRefreshInterval - refreshCountdown) / autoRefreshInterval) * 100}%` }}
          />
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 relative z-10 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-[11px] font-medium text-cyan-700 dark:text-cyan-300 relative z-10">
            {isRefreshing ? 'جاري التحديث...' : `تحديث تلقائي خلال ${refreshCountdown} ثانية`}
          </span>
        </button>
      )}

      {/* Comparison Progress Bar (Generalized from Reports) */}
      {isWidgetVisible('revenue-comparison') && (
      <div className="bg-white dark:bg-slate-800/80 p-2 sm:p-3 md:p-6 rounded-lg sm:rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
            <h3 className="text-[10px] sm:text-xs md:text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 sm:gap-2">
                <PieChart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary"/> ملخص الأداء
            </h3>
            <span className="text-[7px] sm:text-[9px] md:text-[11px] bg-slate-100 dark:bg-slate-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-slate-500 dark:text-slate-400">
              📅 {formatDateArabic(new Date())}
            </span>
          </div>
          <div className="h-5 sm:h-6 md:h-6 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden flex shadow-inner">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000 ease-out flex items-center justify-center" style={{width: `${(totalIncomeAll / totalVolume) * 100}%`}}>
                {totalIncomeAll > 0 && <span className="text-[7px] sm:text-[8px] md:text-[10px] text-white font-bold px-0.5">{((totalIncomeAll / totalVolume) * 100).toFixed(0)}%</span>}
              </div>
              <div className="h-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-1000 ease-out flex items-center justify-center" style={{width: `${(totalExpenseAll / totalVolume) * 100}%`}}>
                {totalExpenseAll > 0 && <span className="text-[7px] sm:text-[8px] md:text-[10px] text-white font-bold px-0.5">{((totalExpenseAll / totalVolume) * 100).toFixed(0)}%</span>}
              </div>
          </div>
          <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3 mt-2 sm:mt-3 text-[8px] sm:text-[10px] md:text-xs">
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 shrink-0"></div>
              <span className="truncate"><b>{totalIncomeAll.toLocaleString()}</b></span>
            </div>
            <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-rose-500 shrink-0"></div>
              <span className="truncate"><b>{totalExpenseAll.toLocaleString()}</b></span>
            </div>
            <div className={`flex items-center justify-end gap-1 ${stats.netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
              <span className="font-bold truncate">{stats.netProfit > 0 ? '+' : ''}{stats.netProfit.toLocaleString()}</span>
            </div>
          </div>
      </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
        
        {/* Total Revenue with Breakdown */}
        <StatCard 
          title="إجمالي المقبوضات (الكاش)" 
          value={totalIncomeAll} 
          color="text-emerald-600 dark:text-emerald-400" 
          icon={Wallet}
          period={dataPeriod.text}
        >
            <div className="space-y-1 sm:space-y-1.5">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-0.5 text-[8px] sm:text-[10px] md:text-xs"><Banknote className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500"/> فوري</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs" style={{fontFamily: 'system-ui'}}>{revenueBreakdown.directSales.toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-0.5 text-[8px] sm:text-[10px] md:text-xs"><RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-500"/> آجل</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-[10px] sm:text-xs" style={{fontFamily: 'system-ui'}}>{revenueBreakdown.collections.toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 border-t border-dashed dark:border-slate-600 pt-1">
                    <span className="flex items-center gap-0.5 text-[8px] sm:text-[10px] md:text-xs"><TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-violet-500"/> أخرى</span>
                    <span className="font-bold text-violet-600 dark:text-violet-400 text-[10px] sm:text-xs" style={{fontFamily: 'system-ui'}}>{revenueBreakdown.otherIncome.toLocaleString('en-US')}</span>
                </div>
            </div>
        </StatCard>

        <StatCard 
          title="الديون المستحقة (للمحل)" 
          value={stats.outstandingDebts} 
          color="text-amber-600 dark:text-amber-400" 
          icon={CreditCard}
          period={dataPeriod.text}
        >
             <div className="space-y-1 sm:space-y-1.5">
               <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                 <span className="text-[8px] sm:text-[10px] md:text-xs">فواتير آجلة</span>
                 <span className="font-bold text-amber-600 dark:text-amber-400 text-[10px] sm:text-xs" style={{fontFamily: 'system-ui'}}>{invoiceStats.credit}</span>
               </div>
               <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                 <span className="text-[8px] sm:text-[10px] md:text-xs">نسبة التحصيل</span>
                 <span className={`font-bold text-[10px] sm:text-xs ${Number(performanceIndicators.collectionRate) >= 70 ? 'text-emerald-600' : 'text-orange-600'}`} style={{fontFamily: 'system-ui'}}>{performanceIndicators.collectionRate}%</span>
               </div>
             </div>
        </StatCard>

        <StatCard 
          title="المصروفات والمشتريات" 
          value={totalExpenseAll} 
          color="text-rose-600 dark:text-rose-400" 
          icon={ArrowDownRight}
          period={dataPeriod.text}
        >
            <div className="space-y-1 sm:space-y-1.5">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-0.5 text-[8px] sm:text-[10px] md:text-xs"><Receipt className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-500"/> تشغيل</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 text-[10px] sm:text-xs" style={{fontFamily: 'system-ui'}}>{stats.totalExpenses.toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-0.5 text-[8px] sm:text-[10px] md:text-xs"><ShoppingCart className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-500"/> مشتريات</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400 text-[10px] sm:text-xs" style={{fontFamily: 'system-ui'}}>{stats.totalPurchases.toLocaleString('en-US')}</span>
                </div>
            </div>
        </StatCard>

        <StatCard 
          title="صافي الربح" 
          value={stats.netProfit} 
          color={stats.netProfit >= 0 ? "text-primary dark:text-blue-400" : "text-rose-600 dark:text-rose-400"} 
          icon={stats.netProfit >= 0 ? Award : AlertTriangle}
          period={dataPeriod.text}
        >
            <div className="space-y-1 sm:space-y-1.5">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span className="text-[8px] sm:text-[10px] md:text-xs">هامش الربح</span>
                <span className={`font-bold text-[10px] sm:text-xs ${Number(performanceIndicators.profitMargin) >= 20 ? 'text-emerald-600' : Number(performanceIndicators.profitMargin) >= 0 ? 'text-amber-600' : 'text-rose-600'}`} style={{fontFamily: 'system-ui'}}>{performanceIndicators.profitMargin}%</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span className="text-[8px] sm:text-[10px] md:text-xs">متوسط الفاتورة</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-[10px] sm:text-xs" style={{fontFamily: 'system-ui'}}>{performanceIndicators.avgInvoiceValue.toLocaleString('en-US', {maximumFractionDigits: 0})}</span>
              </div>
            </div>
        </StatCard>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-4 md:gap-6">
        {/* Simple Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-2 sm:p-3 md:p-6 rounded-lg sm:rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
           <div className="flex items-center justify-between mb-2 sm:mb-4 md:mb-6">
             <h3 className="text-[10px] sm:text-sm md:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-1 sm:gap-2">
               <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary dark:text-blue-400"/>
               <span className="truncate">الأداء الشهري</span>
             </h3>
             <span className="text-[7px] sm:text-[9px] md:text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-slate-500 dark:text-slate-400">
               {new Date().getFullYear()}
             </span>
           </div>
           <div className="h-32 sm:h-48 md:h-64 flex items-end gap-0.5 sm:gap-1 md:gap-4 justify-between px-0.5 sm:px-2">
              {monthlyData.map((d, i) => (
                <div key={i} className="flex flex-col justify-end items-center gap-1 h-full flex-1 group relative">
                   {/* Tooltip */}
                   <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap shadow-lg pointer-events-none">
                      <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> مبيعات: {d.revenue.toLocaleString()}</div>
                      <div className="flex items-center gap-1 mt-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> إيرادات أخرى: {d.otherIncome.toLocaleString()}</div>
                      <div className="flex items-center gap-1 mt-1"><div className="w-2 h-2 bg-rose-500 rounded-full"></div> مصروف: {d.expense.toLocaleString()}</div>
                   </div>
                   
                   <div className="w-full flex gap-0.5 items-end justify-center h-full">
                      {/* Revenue Bar */}
                      <div 
                        className="w-1/3 bg-emerald-500 rounded-t-sm hover:bg-emerald-600 transition-all relative min-h-[4px]" 
                        style={{ height: `${(d.revenue / maxChartValue) * 100}%` }}
                      ></div>
                      {/* Other Income Bar */}
                      <div 
                        className="w-1/3 bg-blue-500 rounded-t-sm hover:bg-blue-600 transition-all relative min-h-[4px]" 
                        style={{ height: `${(d.otherIncome / maxChartValue) * 100}%` }}
                      ></div>
                      {/* Expense Bar */}
                      <div 
                        className="w-1/3 bg-rose-500 rounded-t-sm hover:bg-rose-600 transition-all relative min-h-[4px]" 
                        style={{ height: `${(d.expense / maxChartValue) * 100}%` }}
                      ></div>
                   </div>
                   <span className="text-[6px] sm:text-[9px] md:text-xs text-slate-500 dark:text-slate-400 font-medium">{i + 1}</span>
                </div>
              ))}
           </div>
           <div className="mt-2 sm:mt-3 md:mt-4 flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-6 text-[8px] sm:text-[10px] md:text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1"><div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-sm"></div> مبيعات</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gradient-to-r from-blue-400 to-blue-600 rounded-sm"></div> أخرى</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gradient-to-r from-rose-400 to-rose-600 rounded-sm"></div> مصروفات</div>
           </div>
        </div>

        {/* Top Products / Inventory Summary */}
        <div className="space-y-2 sm:space-y-4 md:space-y-6">
            <div className="bg-white dark:bg-slate-800 p-2 sm:p-3 md:p-6 rounded-lg sm:rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="text-[10px] sm:text-sm md:text-lg font-bold text-slate-800 dark:text-white mb-2 sm:mb-3 md:mb-4 flex items-center gap-1 sm:gap-2">
                    <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-yellow-500" />
                    الأكثر مبيعاً
                </h3>
                <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
                    {topProducts.map(([name, count], idx) => (
                        <div key={name} className="flex justify-between items-center text-[10px] sm:text-xs md:text-sm">
                            <span className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                                <span className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] md:text-[10px] font-bold shadow-sm shrink-0 ${
                                  idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' : 
                                  idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                                  idx === 2 ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white' :
                                  'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>{idx + 1}</span>
                                <span className="text-slate-800 dark:text-slate-200 truncate max-w-[80px] sm:max-w-none">{name}</span>
                            </span>
                            <span className="font-bold text-primary dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1 sm:px-1.5 md:px-2 py-0.5 rounded text-[8px] sm:text-[10px] md:text-xs whitespace-nowrap">{count}</span>
                        </div>
                    ))}
                    {topProducts.length === 0 && <p className="text-slate-400 text-center text-[10px] sm:text-xs md:text-sm py-2 sm:py-3 md:py-4">لا توجد بيانات</p>}
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 p-2 sm:p-3 md:p-5 rounded-lg sm:rounded-xl shadow-sm border border-slate-200 dark:border-transparent dark:shadow-lg">
                <h3 className="text-[10px] sm:text-xs md:text-sm font-bold mb-2 sm:mb-3 md:mb-4 flex items-center gap-1 sm:gap-2 text-slate-700 dark:text-white dark:opacity-90">
                    <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-500 dark:text-white" />
                    مؤشرات الأداء
                </h3>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:gap-3">
                  <div className="bg-slate-50 dark:bg-white/10 p-1.5 sm:p-2 md:p-3 rounded-md sm:rounded-lg border border-slate-100 dark:border-transparent">
                    <p className="text-[7px] sm:text-[9px] md:text-[10px] text-slate-500 dark:text-white/70">هامش الربح</p>
                    <p className={`text-xs sm:text-sm md:text-lg font-bold ${Number(performanceIndicators.profitMargin) >= 20 ? 'text-emerald-600 dark:text-emerald-400' : Number(performanceIndicators.profitMargin) >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{performanceIndicators.profitMargin}%</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/10 p-1.5 sm:p-2 md:p-3 rounded-md sm:rounded-lg border border-slate-100 dark:border-transparent">
                    <p className="text-[7px] sm:text-[9px] md:text-[10px] text-slate-500 dark:text-white/70">نسبة التحصيل</p>
                    <p className={`text-xs sm:text-sm md:text-lg font-bold ${Number(performanceIndicators.collectionRate) >= 80 ? 'text-emerald-600 dark:text-emerald-400' : Number(performanceIndicators.collectionRate) >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{performanceIndicators.collectionRate}%</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/10 p-1.5 sm:p-2 md:p-3 rounded-md sm:rounded-lg border border-slate-100 dark:border-transparent">
                    <p className="text-[7px] sm:text-[9px] md:text-[10px] text-slate-500 dark:text-white/70">متوسط الفاتورة</p>
                    <p className="text-xs sm:text-sm md:text-lg font-bold text-blue-600 dark:text-blue-400">{performanceIndicators.avgInvoiceValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/10 p-1.5 sm:p-2 md:p-3 rounded-md sm:rounded-lg border border-slate-100 dark:border-transparent">
                    <p className="text-[7px] sm:text-[9px] md:text-[10px] text-slate-500 dark:text-white/70">عدد المبيعات</p>
                    <p className="text-xs sm:text-sm md:text-lg font-bold text-violet-600 dark:text-violet-400">{performanceIndicators.totalSales}</p>
                  </div>
                </div>
            </div>

            {/* General Stats Grid (New) */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:gap-4">
               {/* Products Count */}
               <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 p-1.5 sm:p-2 md:p-4 rounded-lg sm:rounded-xl shadow-sm border border-teal-100 dark:border-teal-800 col-span-2">
                  <h3 className="text-[8px] sm:text-[10px] md:text-xs font-bold text-teal-600 dark:text-teal-400 mb-0.5 sm:mb-1 flex items-center gap-0.5 sm:gap-1"><Package className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> المنتجات</h3>
                  <div className="flex justify-between items-end">
                      <p className="text-base sm:text-xl md:text-2xl font-bold text-teal-700 dark:text-teal-300">{products.length} <span className="text-[8px] sm:text-[10px] md:text-xs font-normal text-teal-500">صنف</span></p>
                      {performanceIndicators.lowStockProducts > 0 ? (
                        <div className="text-[7px] sm:text-[9px] md:text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1 sm:px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <AlertTriangle className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> {performanceIndicators.lowStockProducts} منخفض
                        </div>
                      ) : (
                        <div className="text-[7px] sm:text-[9px] md:text-[10px] text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30 px-1 sm:px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <CheckCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> مخزون جيد
                        </div>
                      )}
                  </div>
               </div>

               {/* Other Income Details */}
               <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 p-1.5 sm:p-2 md:p-4 rounded-lg sm:rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-800 col-span-2">
                  <h3 className="text-[8px] sm:text-[10px] md:text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1 sm:mb-2 flex items-center gap-0.5 sm:gap-1"><TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> الإيرادات الأخرى</h3>
                  <div className="space-y-1 sm:space-y-1.5">
                    {otherIncomeDetails.length > 0 ? (
                      otherIncomeDetails.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-[9px] sm:text-xs bg-white/50 dark:bg-white/5 p-1 sm:p-1.5 rounded-md sm:rounded-lg">
                          <span className="text-slate-700 dark:text-slate-300 truncate flex-1 max-w-[100px] sm:max-w-none">{item.description}</span>
                          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                            <span className="hidden sm:inline text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400">{formatDate(item.date)}</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[10px]">{item.amount.toLocaleString('en-US')}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-center text-[9px] sm:text-xs py-1.5 sm:py-2">لا توجد</p>
                    )}
                    {otherIncomeDetails.length > 0 && (
                      <div className="flex justify-between items-center pt-1 sm:pt-1.5 border-t border-indigo-200 dark:border-indigo-700 mt-1">
                        <span className="text-[8px] sm:text-[10px] md:text-xs font-bold text-indigo-700 dark:text-indigo-300">المجموع</span>
                        <span className="font-bold text-indigo-700 dark:text-indigo-300 text-[10px] sm:text-xs">{otherIncomeDetails.reduce((sum, item) => sum + item.amount, 0).toLocaleString('en-US')}</span>
                      </div>
                    )}
                  </div>
               </div>

               {/* Customers Count */}
               <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 p-1.5 sm:p-2 md:p-4 rounded-lg sm:rounded-xl shadow-sm border border-violet-100 dark:border-violet-800 col-span-2">
                  <h3 className="text-[8px] sm:text-[10px] md:text-xs font-bold text-violet-600 dark:text-violet-400 mb-0.5 sm:mb-1 flex items-center gap-0.5 sm:gap-1"><Users className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> العملاء</h3>
                  <div className="flex justify-between items-end">
                      <p className="text-base sm:text-xl md:text-2xl font-bold text-violet-700 dark:text-violet-300">{customers.length} <span className="text-[8px] sm:text-[10px] md:text-xs font-normal text-violet-500">عميل</span></p>
                      <div className="text-[7px] sm:text-[9px] md:text-[10px] text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-1 sm:px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <CheckCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> {performanceIndicators.activeCustomers} نشط
                      </div>
                  </div>
               </div>

               {/* Invoices Breakdown */}
               <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800 p-1.5 sm:p-2 md:p-4 rounded-lg sm:rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 col-span-2 space-y-1 sm:space-y-2">
                   <h3 className="text-[8px] sm:text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 sm:mb-1.5 flex items-center gap-0.5 sm:gap-1"><FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> الفواتير</h3>
                   
                   <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-1 sm:pb-1.5">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300">العدد الكلي</span>
                      <span className="text-[10px] sm:text-xs font-bold bg-primary/10 text-primary px-1.5 sm:px-2 py-0.5 rounded-full">{invoiceStats.total}</span>
                   </div>

                   <div className="flex justify-between items-center">
                      <span className="text-[8px] sm:text-[10px] md:text-xs flex items-center gap-0.5 text-slate-600 dark:text-slate-400"><Banknote className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-emerald-500"/> كاش</span>
                      <span className="text-[8px] sm:text-[10px] md:text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1 sm:px-1.5 py-0.5 rounded">{invoiceStats.cash}</span>
                   </div>

                   <div className="flex justify-between items-center">
                      <span className="text-[8px] sm:text-[10px] md:text-xs flex items-center gap-0.5 text-slate-600 dark:text-slate-400"><Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-amber-500"/> آجل</span>
                      <span className="text-[8px] sm:text-[10px] md:text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1 sm:px-1.5 py-0.5 rounded">{invoiceStats.credit}</span>
                   </div>
               </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;