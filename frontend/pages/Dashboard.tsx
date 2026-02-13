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
  const { currency } = useSettings();
  const { user } = useAuth();
  
  // Account Usage State
  const [accountUsage, setAccountUsage] = useState<AccountUsageDto | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  
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
  const { revenues, loading: revenuesLoading, error: revenuesError, refresh: refreshRevenues } = useRevenues();
  
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
        } catch (error: any) {
          // تجاهل أخطاء الصلاحيات والأخطاء 500
          if (error?.status === 403 || error?.status === 401 || error?.status === 500) {
            console.log('Cannot load account usage - user may not have permissions');
          } else {
            console.error('Error loading account usage:', error);
          }
        } finally {
          setUsageLoading(false);
        }
      }
    };
    loadAccountUsage();
  }, [user?.accountId]);

  // Handle manual refresh
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
    }
  };

  // إذا لم يكن لديه صلاحية عرض الصفحة
  if (pagePerms.checked && !pagePerms.canView) {
    return <AccessDenied />;
  }

  // Calculate stats from API data
  const normalizeExpenseTypeToken = (value: unknown): string => {
    return String(value || '')
      .trim()
      .replace(/[\s-]+/g, '_')
      .toUpperCase();
  };

  const normalizeHintText = (value: unknown): string => {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[\s_-]+/g, ' ');
  };

  const hasOtherIncomeHint = (value: unknown): boolean => {
    const text = normalizeHintText(value);
    if (!text) return false;

    const hints = [
      'ايراد',
      'دخل',
      'ربح',
      'مكسب',
      'بيع اصل',
      'بيع اصول',
      'استرداد',
      'عموله',
      'revenue',
      'income',
      'profit',
      'gain',
      'asset sale',
      'refund',
      'commission',
    ];

    return hints.some(hint => text.includes(hint));
  };

  const resolveExpenseKind = (exp: any): 'expense' | 'purchase' | 'other_income' => {
    const notesAndDescription = `${String(exp?.notes || '')} ${String(exp?.description || '')}`;
    const notesNormalized = normalizeExpenseTypeToken(notesAndDescription);

    // Prioritize explicit tags/hints in notes/description for legacy mis-labeled rows.
    const notesHasPurchase = notesNormalized.includes('[PURCHASE]') || notesNormalized.includes('[مشتريات]') || notesNormalized.includes('PURCHASE');
    const notesHasOtherIncomeTag = notesNormalized.includes('[OTHER_INCOME]') || notesNormalized.includes('[إيرادات_أخرى]') || notesNormalized.includes('[ايرادات_اخرى]');
    if (notesHasPurchase) return 'purchase';
    if (notesHasOtherIncomeTag || hasOtherIncomeHint(notesAndDescription)) return 'other_income';

    const candidates = [
      exp?.transactionTypeCode,
      exp?.TransactionTypeCode,
      exp?.transactionType?.code,
      exp?.transactionTypeName,
      exp?.TransactionTypeName,
      exp?.transactionType?.name,
      exp?.type,
      exp?.notes,
      exp?.description,
    ];

    for (const candidate of candidates) {
      const normalized = normalizeExpenseTypeToken(candidate);
      if (!normalized) continue;

      if (normalized.includes('PURCHASE') || normalized.includes('مشتريات'.toUpperCase())) {
        return 'purchase';
      }

      const hasOther = normalized.includes('OTHER') || normalized.includes('اخرى'.toUpperCase()) || normalized.includes('أخرى'.toUpperCase());
      const hasRevenue = normalized.includes('REV') || normalized.includes('INCOME') || normalized.includes('إيراد'.toUpperCase()) || normalized.includes('ايراد'.toUpperCase());
      if (hasOther && hasRevenue) {
        return 'other_income';
      }

      // بعض البيانات القديمة تحتوي "REVENUE" أو "INCOME" فقط بدون "OTHER"
      if (hasRevenue) {
        return 'other_income';
      }

      if (normalized.includes('EXPENSE') || normalized.includes('مصروف'.toUpperCase())) {
        return 'expense';
      }
    }

    // Fallback for rows that still have unclear type values.
    if (hasOtherIncomeHint(notesAndDescription)) return 'other_income';

    return 'expense';
  };

  const isActiveInvoice = (inv: any): boolean => {
    const numericStatus = Number(inv?.status);
    if (Number.isFinite(numericStatus)) {
      // 0=Draft, 3=Cancelled
      return numericStatus !== 0 && numericStatus !== 3;
    }

    const textStatus = String(inv?.status || '').trim().toLowerCase();
    if (!textStatus) return true;
    return textStatus !== 'draft' && textStatus !== 'cancelled' && textStatus !== 'canceled';
  };

  const isActiveExpense = (exp: any): boolean => {
    const status = String(exp?.status || '').trim().toLowerCase();
    if (!status) return true;
    return status !== 'cancelled' && status !== 'canceled' && status !== 'ملغى';
  };

  const validInvoices = useMemo(() => invoices.filter(isActiveInvoice), [invoices]);
  const validExpenses = useMemo(() => expenses.filter(isActiveExpense), [expenses]);

  const stats = useMemo(() => {
    const totalRevenue = validInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalCollected = validInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

    const classifiedExpenses = validExpenses.reduce(
      (acc, exp) => {
        const amount = Number(exp.totalAmount || exp.amount || 0) || 0;
        const kind = resolveExpenseKind(exp);
        if (kind === 'purchase') acc.totalPurchases += amount;
        else if (kind === 'other_income') acc.totalOtherIncomeFromExpenses += amount;
        else acc.totalExpenses += amount;
        return acc;
      },
      { totalExpenses: 0, totalPurchases: 0, totalOtherIncomeFromExpenses: 0 }
    );

    const totalOtherIncomeFromRevenues = revenues.reduce((sum, rev) => {
      return sum + (Number(rev.totalAmount || rev.amount || 0) || 0);
    }, 0);

    const totalExpenses = classifiedExpenses.totalExpenses;
    const totalPurchases = classifiedExpenses.totalPurchases;
    const totalOtherIncome = classifiedExpenses.totalOtherIncomeFromExpenses + totalOtherIncomeFromRevenues;
    const outstandingDebts = validInvoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);
    const netProfit = totalRevenue + totalOtherIncome - totalExpenses - totalPurchases;
    
    return {
      totalRevenue,
      totalCollected,
      totalExpenses,
      totalPurchases,
      netProfit,
      outstandingDebts,
      totalOtherIncome
    };
  }, [validInvoices, validExpenses, revenues]);

  // Revenue Breakdown
  const revenueBreakdown = useMemo(() => {
    // تحديد نوع الفاتورة بناءً على المبلغ المتبقي (لأن type قد يكون فارغ)
    // فاتورة آجلة = لها مبلغ متبقي أكبر من 0
    // فاتورة نقدية = المبلغ المتبقي = 0 (مدفوعة بالكامل)
    const cashInvoices = validInvoices.filter(i => (i.remainingAmount || 0) <= 0);
    const creditInvoices = validInvoices.filter(i => (i.remainingAmount || 0) > 0);
    
    // مبيعات فورية = إجمالي الفواتير المسددة بالكامل
    const directSales = cashInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    // مبيعات آجلة = إجمالي الفواتير التي ما زال عليها متبقي
    const collections = creditInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    const otherIncomeFromExpenses = validExpenses.reduce((sum, exp) => {
      return resolveExpenseKind(exp) === 'other_income'
        ? sum + (Number(exp.totalAmount || exp.amount || 0) || 0)
        : sum;
    }, 0);

    const otherIncomeFromRevenues = revenues.reduce((sum, rev) => {
      return sum + (Number(rev.totalAmount || rev.amount || 0) || 0);
    }, 0);

    const otherIncome = otherIncomeFromExpenses + otherIncomeFromRevenues;
    
    return {
      directSales,
      collections,
      otherIncome
    };
  }, [validInvoices, validExpenses, revenues]);

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

    validInvoices.forEach(inv => {
      const month = getMonthFromDateStr(inv.date);
      if(month >= 0 && month < 12) data[month].revenue += inv.totalAmount;
    });

    // المصروفات والمشتريات (بدون الإيرادات الأخرى)
    validExpenses.forEach(exp => {
      const month = getMonthFromDateStr(exp.expenseDate);
      if(month >= 0 && month < 12) {
          const amount = Number(exp.totalAmount || exp.amount || 0) || 0;
          const kind = resolveExpenseKind(exp);
          if (kind === 'other_income') {
              data[month].otherIncome += amount;
          } else {
              data[month].expense += amount;
          }
      }
    });

    // إضافة الإيرادات الأخرى من جدول الإيرادات
    revenues.forEach(rev => {
      const month = getMonthFromDateStr(rev.revenueDate);
      if(month >= 0 && month < 12) {
          data[month].otherIncome += Number(rev.totalAmount || rev.amount || 0) || 0;
      }
    });

    return data;
  }, [validInvoices, validExpenses, revenues]);

  // تفاصيل الإيرادات الأخرى
  const otherIncomeDetails = useMemo(() => {
    const fromExpenses = validExpenses
      .filter(exp => resolveExpenseKind(exp) === 'other_income')
      .map(exp => ({
        id: `exp-${exp.id}`,
        description: exp.description,
        amount: Number(exp.totalAmount || exp.amount || 0) || 0,
        date: exp.expenseDate
      }));

    const fromRevenues = revenues.map(rev => ({
      id: `rev-${rev.id}`,
      description: rev.description,
      amount: Number(rev.totalAmount || rev.amount || 0) || 0,
      date: rev.revenueDate
    }));

    return [...fromExpenses, ...fromRevenues]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [validExpenses, revenues]);

  // Invoice Counts Breakdown
  const invoiceStats = useMemo(() => {
      // الفواتير الآجلة = الفواتير التي لها مبلغ متبقي > 0
        const creditInvoices = validInvoices.filter(i => (i.remainingAmount || 0) > 0);
        const cashInvoices = validInvoices.filter(i => (i.remainingAmount || 0) === 0);
        return { total: validInvoices.length, cash: cashInvoices.length, credit: creditInvoices.length };
      }, [validInvoices]);

  // Performance Indicators
  const performanceIndicators = useMemo(() => {
    const profitMargin = stats.totalRevenue > 0 ? ((stats.netProfit / stats.totalRevenue) * 100) : 0;
    const collectionRate = validInvoices.length > 0 
      ? ((validInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0) / validInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)) * 100) || 0
      : 0;
    const avgInvoiceValue = validInvoices.length > 0 
      ? validInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0) / validInvoices.length 
      : 0;
    const lowStockProducts = products.filter((p: any) => p.stock <= (p.minStockLevel || 5)).length;
    
    return {
      profitMargin: profitMargin.toFixed(1),
      collectionRate: collectionRate.toFixed(1),
      avgInvoiceValue,
      lowStockProducts,
      totalSales: validInvoices.length,
      activeCustomers: customers.filter((c: any) => c.isActive !== false).length
    };
  }, [stats, validInvoices, products, customers]);

  // حساب الفترة الزمنية للبيانات
  const dataPeriod = useMemo(() => {
    const allDates: Date[] = [];
    
    validInvoices.forEach(inv => {
      if (inv.date) allDates.push(new Date(inv.date));
    });
    validExpenses.forEach(exp => {
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
  }, [validInvoices, validExpenses]);

  // Find max value for scaling chart based on actual data only
  const maxChartValue = Math.max(
    1,
    ...monthlyData.map(d => Math.max(d.revenue, d.expense, d.otherIncome))
  );

  const getChartBarHeight = (value: number) => {
    if (!Number.isFinite(value) || value <= 0 || maxChartValue <= 0) return 0;
    const rawPercent = (value / maxChartValue) * 100;
    return Math.max(rawPercent, 2.2);
  };

  // Top Products Calculation
  const topProducts = useMemo(() => {
      const counts: Record<string, number> = {};
        validInvoices.forEach(inv => {
          inv.items.forEach(item => {
              counts[item.name] = (counts[item.name] || 0) + item.quantity;
          });
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      }, [validInvoices]);

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
            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-xs md:text-sm font-medium mb-0.5 sm:mb-1 leading-tight line-clamp-2 sm:truncate">{title}</p>
            <h3 className={`text-sm sm:text-xl md:text-3xl font-black ${color} leading-none tracking-tight tabular-nums`} style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
              {value.toLocaleString('en-US')}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs sm:text-xs md:text-xs text-slate-400 dark:text-slate-500 font-medium">{currency}</span>
            </div>
          </div>
          <div className={`p-1 sm:p-2 md:p-3 rounded-md sm:rounded-lg md:rounded-xl bg-opacity-10 dark:bg-opacity-30 ${color.replace('text', 'bg')} shrink-0`}>
            <Icon className={`${color} w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5`} />
          </div>
      </div>
      {children && <div className="mt-1.5 sm:mt-3 md:mt-4 pt-1.5 sm:pt-2 md:pt-3 border-t border-slate-100 dark:border-slate-700/50 z-10">{children}</div>}
    </div>
  );

  // Calculation for the comparison bar
  const totalIncomeAll = stats.totalRevenue + stats.totalOtherIncome;
  const totalExpenseAll = stats.totalExpenses + stats.totalPurchases;
  const totalVolume = totalIncomeAll + totalExpenseAll || 1; // avoid divide by zero

  const comparisonSegments = (() => {
    const baseSegments = [
      {
        key: 'sales-revenue',
        label: 'إيرادات المبيعات',
        value: Math.max(0, stats.totalRevenue),
        colorClass: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
        dotClass: 'bg-emerald-500',
        textClass: 'text-emerald-600 dark:text-emerald-400',
        bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
      },
      {
        key: 'other-income',
        label: 'الإيرادات الأخرى',
        value: Math.max(0, stats.totalOtherIncome),
        colorClass: 'bg-gradient-to-r from-cyan-400 to-cyan-600',
        dotClass: 'bg-cyan-500',
        textClass: 'text-cyan-600 dark:text-cyan-400',
        bgClass: 'bg-cyan-50 dark:bg-cyan-900/20',
      },
      {
        key: 'expenses',
        label: 'المصروفات',
        value: Math.max(0, stats.totalExpenses),
        colorClass: 'bg-gradient-to-r from-rose-400 to-rose-600',
        dotClass: 'bg-rose-500',
        textClass: 'text-rose-600 dark:text-rose-400',
        bgClass: 'bg-rose-50 dark:bg-rose-900/20',
      },
      {
        key: 'purchases',
        label: 'المشتريات',
        value: Math.max(0, stats.totalPurchases),
        colorClass: 'bg-gradient-to-r from-orange-400 to-orange-600',
        dotClass: 'bg-orange-500',
        textClass: 'text-orange-600 dark:text-orange-400',
        bgClass: 'bg-orange-50 dark:bg-orange-900/20',
      },
    ];

    const total = baseSegments.reduce((sum, seg) => sum + seg.value, 0);
    return baseSegments.map(seg => {
      const percent = total > 0 ? (seg.value / total) * 100 : 0;
      return {
        ...seg,
        percent,
        width: percent,
      };
    });
  })();

  return (
    <div className="space-y-4 md:space-y-6 px-1 md:px-0">
      {revenuesError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-xs sm:text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">تعذر جلب بيانات الإيرادات</p>
            <p className="opacity-90">يتم عرض اللوحة الآن بدون جزء الإيرادات الأخرى. يمكنك الضغط على تحديث لإعادة المحاولة.</p>
          </div>
          <button
            onClick={() => refreshRevenues?.()}
            disabled={revenuesLoading}
            className="shrink-0 px-2 py-1 rounded-md border border-amber-300 bg-white text-amber-800 hover:bg-amber-100 disabled:opacity-60 disabled:cursor-not-allowed"
            title="إعادة محاولة جلب الإيرادات"
          >
            {revenuesLoading ? 'جاري المحاولة...' : 'إعادة المحاولة'}
          </button>
        </div>
      )}

      {/* رأس الصفحة المدمج - سطر واحد */}
      <div className="flex items-center justify-between gap-1">
        {/* العنوان */}
        <div className="flex items-center gap-1 md:gap-2 min-w-0">
          <Activity className="text-primary shrink-0 w-4 h-4 md:w-5 md:h-5" />
          <h2 className="text-xs sm:text-sm md:text-xl font-bold text-slate-800 dark:text-white truncate">لوحة البيانات</h2>
        </div>
        
        {/* المعلومات والأزرار */}
        <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 shrink-0">
          <div className="hidden sm:flex text-xs sm:text-xs md:text-xs bg-blue-50 dark:bg-blue-900/30 px-1 sm:px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-blue-600 dark:text-blue-400 whitespace-nowrap items-center gap-0.5">
            📊 {dataPeriod.text}
          </div>
          <div className={`text-xs sm:text-xs md:text-xs px-1 sm:px-1.5 md:px-2 py-0.5 md:py-1 rounded-full font-semibold flex items-center gap-0.5 ${stats.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
            {stats.netProfit >= 0 ? <TrendingUp className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> : <ArrowDownRight className="w-2 h-2 sm:w-2.5 sm:h-2.5" />}
            <span className="hidden sm:inline">{stats.netProfit >= 0 ? 'إيجابي' : 'مراجعة'}</span>
          </div>
          <div className="text-xs sm:text-xs md:text-xs bg-slate-100 dark:bg-slate-800 px-1 sm:px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {formatDate(new Date())}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-cyan-50 dark:bg-cyan-900/30 rounded-full shadow-sm text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-700 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-all shrink-0 text-xs sm:text-xs md:text-xs font-medium"
            title="تحديث لوحة البيانات"
          >
            <RefreshCw className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
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

      <div className="sm:hidden flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800 text-xs text-cyan-700 dark:text-cyan-300">
        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span>{isRefreshing ? 'جاري التحديث...' : 'التحديث التلقائي يعمل من الشريط الجانبي'}</span>
      </div>

      {/* Comparison Progress Bar (Generalized from Reports) */}
      {isWidgetVisible('revenue-comparison') && (
      <div className="bg-white dark:bg-slate-800/80 p-2 sm:p-3 md:p-6 rounded-lg sm:rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
            <h3 className="text-xs sm:text-xs md:text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 sm:gap-2">
                <PieChart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary"/> ملخص الأداء
            </h3>
            <span className="text-xs sm:text-xs md:text-xs bg-slate-100 dark:bg-slate-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-slate-500 dark:text-slate-400">
              📅 {formatDateArabic(new Date())}
            </span>
          </div>
          <div className="h-5 sm:h-6 md:h-6 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden flex shadow-inner">
            {comparisonSegments.map(seg => (
              <div
                key={seg.key}
                className={`h-full ${seg.colorClass} transition-all duration-1000 ease-out flex items-center justify-center`}
                style={{ width: `${seg.width}%` }}
                title={`${seg.label}: ${seg.value.toLocaleString()} ${currency}\nالنسبة: ${seg.percent.toFixed(1)}%`}
              >
                {seg.percent >= 10 && (
                  <span className="text-xs sm:text-xs md:text-xs text-white font-bold px-0.5">
                    {seg.percent.toFixed(0)}%
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-1.5 sm:gap-2 md:gap-3 mt-2 sm:mt-3 text-xs sm:text-xs md:text-xs">
            {comparisonSegments.map(seg => (
              <div
                key={`legend-${seg.key}`}
                className={`flex items-center justify-between gap-1 ${seg.textClass} ${seg.bgClass} rounded px-2 py-1`}
                title={`${seg.label}: ${seg.value.toLocaleString()} ${currency} (${seg.percent.toFixed(1)}%)`}
              >
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${seg.dotClass} shrink-0`}></span>
                  <span>{seg.label}</span>
                </span>
                <span className="flex items-center gap-1">
                  <b className="tabular-nums">{seg.value.toLocaleString()}</b>
                  <span className="text-xs sm:text-xs opacity-80">{seg.percent.toFixed(1)}%</span>
                </span>
              </div>
            ))}
            <div className={`col-span-2 lg:col-span-1 flex items-center justify-between gap-1 rounded px-2 py-1 ${stats.netProfit >= 0 ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'}`}>
              <span>الصافي</span>
              <b className="tabular-nums">{stats.netProfit > 0 ? '+' : ''}{stats.netProfit.toLocaleString()}</b>
            </div>
          </div>
      </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
        
        {/* Total Revenue with Breakdown */}
        <StatCard 
          title="الإيرادات" 
          value={totalIncomeAll} 
          color="text-emerald-600 dark:text-emerald-400" 
          icon={Wallet}
          period={dataPeriod.text}
        >
            <div className="space-y-1 sm:space-y-1.5">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-0.5 text-xs sm:text-xs md:text-xs"><Banknote className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500"/> فوري</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-xs" style={{fontFamily: 'system-ui'}}>{revenueBreakdown.directSales.toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-0.5 text-xs sm:text-xs md:text-xs"><RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-500"/> آجل</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-xs sm:text-xs" style={{fontFamily: 'system-ui'}}>{revenueBreakdown.collections.toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 border-t border-dashed dark:border-slate-600 pt-1">
                    <span className="flex items-center gap-0.5 text-xs sm:text-xs md:text-xs"><TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-violet-500"/> أخرى</span>
                    <span className="font-bold text-violet-600 dark:text-violet-400 text-xs sm:text-xs" style={{fontFamily: 'system-ui'}}>{revenueBreakdown.otherIncome.toLocaleString('en-US')}</span>
                </div>
            </div>
        </StatCard>

        <StatCard 
          title="الديون المستحقة" 
          value={stats.outstandingDebts} 
          color="text-amber-600 dark:text-amber-400" 
          icon={CreditCard}
          period={dataPeriod.text}
        >
             <div className="space-y-1 sm:space-y-1.5">
               <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                 <span className="text-xs sm:text-xs md:text-xs">فواتير آجلة</span>
                 <span className="font-bold text-amber-600 dark:text-amber-400 text-xs sm:text-xs" style={{fontFamily: 'system-ui'}}>{invoiceStats.credit}</span>
               </div>
               <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                 <span className="text-xs sm:text-xs md:text-xs">نسبة التحصيل</span>
                 <span className={`font-bold text-xs sm:text-xs ${Number(performanceIndicators.collectionRate) >= 70 ? 'text-emerald-600' : 'text-orange-600'}`} style={{fontFamily: 'system-ui'}}>{performanceIndicators.collectionRate}%</span>
               </div>
             </div>
        </StatCard>

        <StatCard 
          title="المصروفات" 
          value={totalExpenseAll} 
          color="text-rose-600 dark:text-rose-400" 
          icon={ArrowDownRight}
          period={dataPeriod.text}
        >
            <div className="space-y-1 sm:space-y-1.5">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-0.5 text-xs sm:text-xs md:text-xs"><Receipt className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-500"/> تشغيل</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 text-xs sm:text-xs" style={{fontFamily: 'system-ui'}}>{stats.totalExpenses.toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-0.5 text-xs sm:text-xs md:text-xs"><ShoppingCart className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-500"/> مشتريات</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400 text-xs sm:text-xs" style={{fontFamily: 'system-ui'}}>{stats.totalPurchases.toLocaleString('en-US')}</span>
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
                <span className="text-xs sm:text-xs md:text-xs">هامش الربح</span>
                <span className={`font-bold text-xs sm:text-xs ${Number(performanceIndicators.profitMargin) >= 20 ? 'text-emerald-600' : Number(performanceIndicators.profitMargin) >= 0 ? 'text-amber-600' : 'text-rose-600'}`} style={{fontFamily: 'system-ui'}}>{performanceIndicators.profitMargin}%</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span className="text-xs sm:text-xs md:text-xs">متوسط الفاتورة</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-xs" style={{fontFamily: 'system-ui'}}>{performanceIndicators.avgInvoiceValue.toLocaleString('en-US', {maximumFractionDigits: 0})}</span>
              </div>
            </div>
        </StatCard>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-4 md:gap-6">
        {/* Simple Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-2 sm:p-3 md:p-6 rounded-lg sm:rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
           <div className="flex items-center justify-between mb-2 sm:mb-4 md:mb-6">
             <h3 className="text-xs sm:text-sm md:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-1 sm:gap-2">
               <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary dark:text-blue-400"/>
               <span className="truncate">الأداء الشهري</span>
             </h3>
             <span className="text-xs sm:text-xs md:text-xs bg-slate-100 dark:bg-slate-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-slate-500 dark:text-slate-400">
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
                        className="w-1/3 bg-emerald-500 rounded-t-sm hover:bg-emerald-600 transition-all relative" 
                        style={{ height: `${getChartBarHeight(d.revenue)}%` }}
                      ></div>
                      {/* Other Income Bar */}
                      <div 
                        className="w-1/3 bg-blue-500 rounded-t-sm hover:bg-blue-600 transition-all relative" 
                        style={{ height: `${getChartBarHeight(d.otherIncome)}%` }}
                      ></div>
                      {/* Expense Bar */}
                      <div 
                        className="w-1/3 bg-rose-500 rounded-t-sm hover:bg-rose-600 transition-all relative" 
                        style={{ height: `${getChartBarHeight(d.expense)}%` }}
                      ></div>
                   </div>
                   <span className="text-xs sm:text-xs md:text-xs text-slate-500 dark:text-slate-400 font-medium">{i + 1}</span>
                </div>
              ))}
           </div>
           <div className="mt-2 sm:mt-3 md:mt-4 flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-6 text-xs sm:text-xs md:text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1"><div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-sm"></div> مبيعات</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gradient-to-r from-blue-400 to-blue-600 rounded-sm"></div> أخرى</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gradient-to-r from-rose-400 to-rose-600 rounded-sm"></div> مصروفات</div>
           </div>
        </div>

        {/* Top Products / Inventory Summary */}
        <div className="space-y-2 sm:space-y-4 md:space-y-6">
            <div className="bg-white dark:bg-slate-800 p-2 sm:p-3 md:p-6 rounded-lg sm:rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="text-xs sm:text-sm md:text-lg font-bold text-slate-800 dark:text-white mb-2 sm:mb-3 md:mb-4 flex items-center gap-1 sm:gap-2">
                    <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-yellow-500" />
                    الأكثر مبيعاً
                </h3>
                <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
                    {topProducts.map(([name, count], idx) => (
                        <div key={name} className="flex justify-between items-center text-xs sm:text-xs md:text-sm">
                            <span className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                                <span className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-xs sm:text-xs md:text-xs font-bold shadow-sm shrink-0 ${
                                  idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' : 
                                  idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                                  idx === 2 ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white' :
                                  'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>{idx + 1}</span>
                                <span className="text-slate-800 dark:text-slate-200 truncate max-w-[80px] sm:max-w-none">{name}</span>
                            </span>
                            <span className="font-bold text-primary dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1 sm:px-1.5 md:px-2 py-0.5 rounded text-xs sm:text-xs md:text-xs whitespace-nowrap">{count}</span>
                        </div>
                    ))}
                    {topProducts.length === 0 && <p className="text-slate-400 text-center text-xs sm:text-xs md:text-sm py-2 sm:py-3 md:py-4">لا توجد بيانات</p>}
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 p-2 sm:p-3 md:p-5 rounded-lg sm:rounded-xl shadow-sm border border-slate-200 dark:border-transparent dark:shadow-lg">
                <h3 className="text-xs sm:text-xs md:text-sm font-bold mb-2 sm:mb-3 md:mb-4 flex items-center gap-1 sm:gap-2 text-slate-700 dark:text-white dark:opacity-90">
                    <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-500 dark:text-white" />
                    مؤشرات الأداء
                </h3>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:gap-3">
                  <div className="bg-slate-50 dark:bg-white/10 p-1.5 sm:p-2 md:p-3 rounded-md sm:rounded-lg border border-slate-100 dark:border-transparent">
                    <p className="text-xs sm:text-xs md:text-xs text-slate-500 dark:text-white/70">هامش الربح</p>
                    <p className={`text-xs sm:text-sm md:text-lg font-bold ${Number(performanceIndicators.profitMargin) >= 20 ? 'text-emerald-600 dark:text-emerald-400' : Number(performanceIndicators.profitMargin) >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{performanceIndicators.profitMargin}%</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/10 p-1.5 sm:p-2 md:p-3 rounded-md sm:rounded-lg border border-slate-100 dark:border-transparent">
                    <p className="text-xs sm:text-xs md:text-xs text-slate-500 dark:text-white/70">نسبة التحصيل</p>
                    <p className={`text-xs sm:text-sm md:text-lg font-bold ${Number(performanceIndicators.collectionRate) >= 80 ? 'text-emerald-600 dark:text-emerald-400' : Number(performanceIndicators.collectionRate) >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{performanceIndicators.collectionRate}%</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/10 p-1.5 sm:p-2 md:p-3 rounded-md sm:rounded-lg border border-slate-100 dark:border-transparent">
                    <p className="text-xs sm:text-xs md:text-xs text-slate-500 dark:text-white/70">متوسط الفاتورة</p>
                    <p className="text-xs sm:text-sm md:text-lg font-bold text-blue-600 dark:text-blue-400">{performanceIndicators.avgInvoiceValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/10 p-1.5 sm:p-2 md:p-3 rounded-md sm:rounded-lg border border-slate-100 dark:border-transparent">
                    <p className="text-xs sm:text-xs md:text-xs text-slate-500 dark:text-white/70">عدد المبيعات</p>
                    <p className="text-xs sm:text-sm md:text-lg font-bold text-violet-600 dark:text-violet-400">{performanceIndicators.totalSales}</p>
                  </div>
                </div>
            </div>

            {/* General Stats Grid (New) */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:gap-4">
               {/* Products Count */}
               <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 p-1.5 sm:p-2 md:p-4 rounded-lg sm:rounded-xl shadow-sm border border-teal-100 dark:border-teal-800 col-span-2">
                  <h3 className="text-xs sm:text-xs md:text-xs font-bold text-teal-600 dark:text-teal-400 mb-0.5 sm:mb-1 flex items-center gap-0.5 sm:gap-1"><Package className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> المنتجات</h3>
                  <div className="flex justify-between items-end">
                      <p className="text-base sm:text-xl md:text-2xl font-bold text-teal-700 dark:text-teal-300">{products.length} <span className="text-xs sm:text-xs md:text-xs font-normal text-teal-500">صنف</span></p>
                      {performanceIndicators.lowStockProducts > 0 ? (
                        <div className="text-xs sm:text-xs md:text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1 sm:px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <AlertTriangle className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> {performanceIndicators.lowStockProducts} منخفض
                        </div>
                      ) : (
                        <div className="text-xs sm:text-xs md:text-xs text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30 px-1 sm:px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <CheckCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> مخزون جيد
                        </div>
                      )}
                  </div>
               </div>

               {/* Other Income Details */}
               <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 p-1.5 sm:p-2 md:p-4 rounded-lg sm:rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-800 col-span-2">
                  <h3 className="text-xs sm:text-xs md:text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1 sm:mb-2 flex items-center gap-0.5 sm:gap-1"><TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> الإيرادات الأخرى</h3>
                  <div className="space-y-1 sm:space-y-1.5">
                    {otherIncomeDetails.length > 0 ? (
                      otherIncomeDetails.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-xs sm:text-xs bg-white/50 dark:bg-white/5 p-1 sm:p-1.5 rounded-md sm:rounded-lg">
                          <span className="text-slate-700 dark:text-slate-300 truncate flex-1 max-w-[100px] sm:max-w-none">{item.description}</span>
                          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                            <span className="hidden sm:inline text-xs sm:text-xs text-slate-500 dark:text-slate-400">{formatDate(item.date)}</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-1 sm:px-1.5 py-0.5 rounded text-xs sm:text-xs">{item.amount.toLocaleString('en-US')}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-center text-xs sm:text-xs py-1.5 sm:py-2">لا توجد</p>
                    )}
                    {otherIncomeDetails.length > 0 && (
                      <div className="flex justify-between items-center pt-1 sm:pt-1.5 border-t border-indigo-200 dark:border-indigo-700 mt-1">
                        <span className="text-xs sm:text-xs md:text-xs font-bold text-indigo-700 dark:text-indigo-300">المجموع</span>
                        <span className="font-bold text-indigo-700 dark:text-indigo-300 text-xs sm:text-xs">{otherIncomeDetails.reduce((sum, item) => sum + item.amount, 0).toLocaleString('en-US')}</span>
                      </div>
                    )}
                  </div>
               </div>

               {/* Customers Count */}
               <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 p-1.5 sm:p-2 md:p-4 rounded-lg sm:rounded-xl shadow-sm border border-violet-100 dark:border-violet-800 col-span-2">
                  <h3 className="text-xs sm:text-xs md:text-xs font-bold text-violet-600 dark:text-violet-400 mb-0.5 sm:mb-1 flex items-center gap-0.5 sm:gap-1"><Users className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> العملاء</h3>
                  <div className="flex justify-between items-end">
                      <p className="text-base sm:text-xl md:text-2xl font-bold text-violet-700 dark:text-violet-300">{customers.length} <span className="text-xs sm:text-xs md:text-xs font-normal text-violet-500">عميل</span></p>
                      <div className="text-xs sm:text-xs md:text-xs text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-1 sm:px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <CheckCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> {performanceIndicators.activeCustomers} نشط
                      </div>
                  </div>
               </div>

               {/* Invoices Breakdown */}
               <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800 p-1.5 sm:p-2 md:p-4 rounded-lg sm:rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 col-span-2 space-y-1 sm:space-y-2">
                   <h3 className="text-xs sm:text-xs md:text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 sm:mb-1.5 flex items-center gap-0.5 sm:gap-1"><FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> الفواتير</h3>
                   
                   <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-1 sm:pb-1.5">
                      <span className="text-xs sm:text-xs font-bold text-slate-700 dark:text-slate-300">العدد الكلي</span>
                      <span className="text-xs sm:text-xs font-bold bg-primary/10 text-primary px-1.5 sm:px-2 py-0.5 rounded-full">{invoiceStats.total}</span>
                   </div>

                   <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-xs md:text-xs flex items-center gap-0.5 text-slate-600 dark:text-slate-400"><Banknote className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-emerald-500"/> كاش</span>
                      <span className="text-xs sm:text-xs md:text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1 sm:px-1.5 py-0.5 rounded">{invoiceStats.cash}</span>
                   </div>

                   <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-xs md:text-xs flex items-center gap-0.5 text-slate-600 dark:text-slate-400"><Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-amber-500"/> آجل</span>
                      <span className="text-xs sm:text-xs md:text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1 sm:px-1.5 py-0.5 rounded">{invoiceStats.credit}</span>
                   </div>
               </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;