import React, { useMemo, useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, DollarSign, ShoppingBag, CreditCard, TrendingUp, Package, PieChart, Users, FileText, Banknote, Clock, Wallet, RefreshCw, Loader2, ShoppingCart, Receipt, Target, Award, AlertTriangle, CheckCircle, Activity, Crown, Zap, Settings2, Eye, EyeOff, LayoutGrid } from 'lucide-react';
import { useCustomers, useProducts, useInvoices, useExpenses, useRevenues } from '../services/dataHooks';
import { PaymentType } from '../types';
import { useSettings } from '../context/SettingsContext';
import { formatDateArabic } from '../services/dateService';
import { usePagePermission } from '../services/permissionsHooks';
import AccessDenied from '../components/AccessDenied';
import { useAuth } from '../context/AuthContext';
import { accountApi, AccountUsageDto } from '../services/adminApi';
import { Link } from 'react-router-dom';
import WidgetSettingsPanel from '../components/WidgetSettingsPanel';
import { useDashboardWidgets } from '../services/useDashboardWidgets';

const Dashboard: React.FC = () => {
  const { currency } = useSettings();
  const { user } = useAuth();
  
  // Account Usage State
  const [accountUsage, setAccountUsage] = useState<AccountUsageDto | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  
  // Widget Customization
  const { 
    widgets, 
    visibleWidgets, 
    editMode, 
    toggleEditMode, 
    handleToggleVisibility, 
    handleReset 
  } = useDashboardWidgets();
  const [showWidgetSettings, setShowWidgetSettings] = useState(false);
  
  // API Hooks
  const { customers, loading: customersLoading } = useCustomers();
  const { products, loading: productsLoading } = useProducts();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { expenses, loading: expensesLoading } = useExpenses();
  const { revenues, loading: revenuesLoading } = useRevenues();
  
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

  // إذا لم يكن لديه صلاحية عرض الصفحة
  if (pagePerms.checked && !pagePerms.canView) {
    return <AccessDenied />;
  }

  // Calculate stats from API data
  const stats = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    // المصروفات = كل شيء ليس مشتريات
    const totalExpenses = expenses
      .filter(exp => !exp.transactionTypeCode?.includes('PURCHASE'))
      .reduce((sum, exp) => sum + (exp.totalAmount || 0), 0);
    // المشتريات = كل ما يحتوي على PURCHASE
    const totalPurchases = expenses
      .filter(exp => exp.transactionTypeCode?.includes('PURCHASE'))
      .reduce((sum, exp) => sum + (exp.totalAmount || 0), 0);
    const outstandingDebts = invoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);
    // الإيرادات الأخرى من جدول Revenues
    const totalOtherIncome = revenues.reduce((sum, rev) => sum + (rev.totalAmount || 0), 0);
    const netProfit = totalRevenue + totalOtherIncome - totalExpenses - totalPurchases;
    
    return {
      totalRevenue,
      totalExpenses,
      totalPurchases,
      netProfit,
      outstandingDebts,
      totalOtherIncome
    };
  }, [invoices, expenses, revenues]);

  // Revenue Breakdown
  const revenueBreakdown = useMemo(() => {
    const cashInvoices = invoices.filter(i => i.type === PaymentType.CASH);
    const creditInvoices = invoices.filter(i => i.type === PaymentType.CREDIT);
    
    const directSales = cashInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const collections = creditInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const otherIncome = revenues.reduce((sum, rev) => sum + (rev.totalAmount || 0), 0);
    
    return {
      directSales,
      collections,
      otherIncome
    };
  }, [invoices, revenues]);

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

    expenses.forEach(exp => {
      const month = getMonthFromDateStr(exp.expenseDate);
      if(month >= 0 && month < 12) {
          data[month].expense += Number(exp.totalAmount) || 0;
      }
    });

    // إضافة الإيرادات الأخرى للمخطط الشهري
    revenues.forEach(rev => {
      const month = getMonthFromDateStr(rev.revenueDate);
      if(month >= 0 && month < 12) {
          data[month].otherIncome += Number(rev.totalAmount) || 0;
      }
    });

    return data;
  }, [invoices, expenses, revenues]);

  // Invoice Counts Breakdown
  const invoiceStats = useMemo(() => {
      const cash = invoices.filter(i => i.type === PaymentType.CASH).length;
      const credit = invoices.filter(i => i.type === PaymentType.CREDIT).length;
      return { total: invoices.length, cash, credit };
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

  // Recent Invoices
  const recentInvoices = useMemo(() => invoices.slice(0, 5), [invoices]);

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
  const StatCard = ({ title, value, color, icon: Icon, children }: any) => (
    <div className="bg-white dark:bg-slate-800/80 p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 flex flex-col justify-between transition-transform hover:scale-[1.02] duration-200 h-full relative overflow-hidden backdrop-blur-sm">
      <div className="flex items-start justify-between mb-2 z-10">
          <div className="flex-1 min-w-0">
            <p className="text-slate-600 dark:text-slate-300 text-xs md:text-sm font-medium mb-1">{title}</p>
            <h3 className={`text-xl md:text-2xl font-extrabold ${color}`}>{value.toLocaleString()} <span className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500">{currency}</span></h3>
          </div>
          <div className={`p-2 md:p-3 rounded-xl bg-opacity-10 dark:bg-opacity-30 ${color.replace('text', 'bg')} shrink-0`}>
            <Icon className={color} size={20} />
          </div>
      </div>
      {children && <div className="mt-3 md:mt-4 pt-2 md:pt-3 border-t border-slate-100 dark:border-slate-700/50 z-10">{children}</div>}
    </div>
  );

  // Calculation for the comparison bar
  const totalIncomeAll = stats.totalRevenue + stats.totalOtherIncome;
  const totalExpenseAll = stats.totalExpenses + stats.totalPurchases;
  const totalVolume = totalIncomeAll + totalExpenseAll || 1; // avoid divide by zero

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Activity className="text-primary" size={28} />
            لوحة التحكم
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            نظرة عامة شاملة على أداء محلك التجاري - العملة: {currency}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Customize Button */}
          <button
            onClick={() => setShowWidgetSettings(true)}
            className="flex items-center gap-2 text-sm bg-white dark:bg-slate-800 px-3 py-2 rounded-full shadow-sm text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-500 transition-all"
            title="تخصيص لوحة التحكم"
          >
            <Settings2 size={16} className="text-blue-500" />
            <span className="hidden md:inline">تخصيص</span>
          </button>
          <div className={`text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1 ${stats.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
            {stats.netProfit >= 0 ? <TrendingUp size={14} /> : <ArrowDownRight size={14} />}
            {stats.netProfit >= 0 ? 'أداء إيجابي' : 'يحتاج مراجعة'}
          </div>
          <div className="text-sm bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
            📅 {formatDateArabic(new Date())}
          </div>
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

      {/* Comparison Progress Bar (Generalized from Reports) */}
      {isWidgetVisible('revenue-comparison') && (
      <div className="bg-white dark:bg-slate-800/80 p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm">
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-4 flex items-center gap-2">
              <PieChart size={16} className="text-primary"/> ملخص الأداء المالي
          </h3>
          <div className="h-8 md:h-6 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden flex shadow-inner">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000 ease-out flex items-center justify-center" style={{width: `${(totalIncomeAll / totalVolume) * 100}%`}}>
                {totalIncomeAll > 0 && <span className="text-[9px] md:text-[10px] text-white font-bold px-1">{((totalIncomeAll / totalVolume) * 100).toFixed(0)}%</span>}
              </div>
              <div className="h-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-1000 ease-out flex items-center justify-center" style={{width: `${(totalExpenseAll / totalVolume) * 100}%`}}>
                {totalExpenseAll > 0 && <span className="text-[9px] md:text-[10px] text-white font-bold px-1">{((totalExpenseAll / totalVolume) * 100).toFixed(0)}%</span>}
              </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between mt-3 gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></div>
              <span>الدخل: <b>{totalIncomeAll.toLocaleString()}</b> {currency}</span>
            </div>
            <div className={`flex items-center gap-2 ${stats.netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
              <span>صافي الربح: <b>{stats.netProfit > 0 ? '+' : ''}{stats.netProfit.toLocaleString()}</b> {currency}</span>
            </div>
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <div className="w-3 h-3 rounded-full bg-rose-500 shrink-0"></div>
              <span>المصروفات: <b>{totalExpenseAll.toLocaleString()}</b> {currency}</span>
            </div>
          </div>
      </div>
      )}

      {/* Plan Usage Card */}
      {accountUsage && isWidgetVisible('plan-usage') && (
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 p-4 md:p-6 rounded-xl shadow-sm border border-violet-200 dark:border-violet-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Crown className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  خطة {accountUsage.planName}
                  {accountUsage.daysRemaining <= 7 && accountUsage.daysRemaining > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
                      ينتهي خلال {accountUsage.daysRemaining} يوم
                    </span>
                  )}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  استخدام الموارد هذا الشهر
                </p>
              </div>
            </div>
            <Link 
              to="/pricing" 
              className="flex items-center gap-2 text-sm bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
            >
              <Zap size={16} />
              ترقية الخطة
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Users */}
            <div className="bg-white/50 dark:bg-slate-800/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Users size={12} /> المستخدمين
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  {accountUsage.currentUsers}/{accountUsage.maxUsers === -1 ? '∞' : accountUsage.maxUsers}
                </span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    accountUsage.usersPercentage >= 90 ? 'bg-rose-500' : 
                    accountUsage.usersPercentage >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(accountUsage.usersPercentage, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Invoices */}
            <div className="bg-white/50 dark:bg-slate-800/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <FileText size={12} /> الفواتير/شهر
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  {accountUsage.currentMonthInvoices}/{accountUsage.maxInvoices === -1 ? '∞' : accountUsage.maxInvoices}
                </span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    accountUsage.invoicesPercentage >= 90 ? 'bg-rose-500' : 
                    accountUsage.invoicesPercentage >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(accountUsage.invoicesPercentage, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Customers */}
            <div className="bg-white/50 dark:bg-slate-800/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Users size={12} /> العملاء
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  {accountUsage.currentCustomers}/{accountUsage.maxCustomers === -1 ? '∞' : accountUsage.maxCustomers}
                </span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    accountUsage.customersPercentage >= 90 ? 'bg-rose-500' : 
                    accountUsage.customersPercentage >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(accountUsage.customersPercentage, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Products */}
            <div className="bg-white/50 dark:bg-slate-800/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Package size={12} /> المنتجات
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  {accountUsage.currentProducts}/{accountUsage.maxProducts === -1 ? '∞' : accountUsage.maxProducts}
                </span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    accountUsage.productsPercentage >= 90 ? 'bg-rose-500' : 
                    accountUsage.productsPercentage >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(accountUsage.productsPercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Revenue with Breakdown */}
        <StatCard 
          title="إجمالي المقبوضات (الكاش)" 
          value={totalIncomeAll} 
          color="text-emerald-600 dark:text-emerald-400" 
          icon={Wallet}
        >
            <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1"><Banknote size={12} className="text-emerald-500"/> مبيعات فورية</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{revenueBreakdown.directSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1"><RefreshCw size={12} className="text-blue-500"/> تحصيل آجل</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{revenueBreakdown.collections.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 border-t border-dashed dark:border-slate-600 pt-1">
                    <span className="flex items-center gap-1"><TrendingUp size={12} className="text-violet-500"/> إيرادات أخرى</span>
                    <span className="font-bold text-violet-600 dark:text-violet-400">{revenueBreakdown.otherIncome.toLocaleString()}</span>
                </div>
            </div>
        </StatCard>

        <StatCard 
          title="الديون المستحقة (للمحل)" 
          value={stats.outstandingDebts} 
          color="text-amber-600 dark:text-amber-400" 
          icon={CreditCard} 
        >
             <div className="space-y-2 text-xs">
               <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                 <span>فواتير آجلة</span>
                 <span className="font-bold text-amber-600 dark:text-amber-400">{invoiceStats.credit}</span>
               </div>
               <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                 <span>نسبة التحصيل</span>
                 <span className={`font-bold ${Number(performanceIndicators.collectionRate) >= 70 ? 'text-emerald-600' : 'text-orange-600'}`}>{performanceIndicators.collectionRate}%</span>
               </div>
             </div>
        </StatCard>

        <StatCard 
          title="المصروفات والمشتريات" 
          value={totalExpenseAll} 
          color="text-rose-600 dark:text-rose-400" 
          icon={ArrowDownRight} 
        >
            <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1"><Receipt size={12} className="text-rose-500"/> مصروفات تشغيل</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">{stats.totalExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1"><ShoppingCart size={12} className="text-orange-500"/> مشتريات بضاعة</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">{stats.totalPurchases.toLocaleString()}</span>
                </div>
            </div>
        </StatCard>

        <StatCard 
          title="صافي الربح" 
          value={stats.netProfit} 
          color={stats.netProfit >= 0 ? "text-primary dark:text-blue-400" : "text-rose-600 dark:text-rose-400"} 
          icon={stats.netProfit >= 0 ? Award : AlertTriangle} 
        >
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>هامش الربح</span>
                <span className={`font-bold ${Number(performanceIndicators.profitMargin) >= 20 ? 'text-emerald-600' : Number(performanceIndicators.profitMargin) >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>{performanceIndicators.profitMargin}%</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>متوسط الفاتورة</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{performanceIndicators.avgInvoiceValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
              </div>
            </div>
        </StatCard>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simple Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
           <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
             <TrendingUp size={20} className="text-primary dark:text-blue-400"/>
             الأداء المالي الشهري (السنة الحالية)
           </h3>
           <div className="h-64 flex items-end gap-2 md:gap-4 justify-between px-2">
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
                   <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium">{i + 1}</span>
                </div>
              ))}
           </div>
           <div className="mt-4 flex justify-center gap-6 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-sm"></div> المبيعات</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-sm"></div> إيرادات أخرى</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gradient-to-r from-rose-400 to-rose-600 rounded-sm"></div> المصروفات</div>
           </div>
        </div>

        {/* Top Products / Inventory Summary */}
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Award size={20} className="text-yellow-500" />
                    المنتجات الأكثر مبيعاً
                </h3>
                <div className="space-y-3">
                    {topProducts.map(([name, count], idx) => (
                        <div key={name} className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${
                                  idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' : 
                                  idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                                  idx === 2 ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white' :
                                  'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>{idx + 1}</span>
                                <span className="text-slate-800 dark:text-slate-200">{name}</span>
                            </span>
                            <span className="font-bold text-primary dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded text-xs">{count} وحدة</span>
                        </div>
                    ))}
                    {topProducts.length === 0 && <p className="text-slate-400 text-center text-sm py-4">لا توجد بيانات مبيعات كافية</p>}
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-transparent dark:shadow-lg">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-slate-700 dark:text-white dark:opacity-90">
                    <Target size={16} className="text-indigo-500 dark:text-white" />
                    مؤشرات الأداء
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-white/10 p-3 rounded-lg border border-slate-100 dark:border-transparent">
                    <p className="text-[10px] text-slate-500 dark:text-white/70">هامش الربح</p>
                    <p className={`text-lg font-bold ${Number(performanceIndicators.profitMargin) >= 20 ? 'text-emerald-600 dark:text-emerald-400' : Number(performanceIndicators.profitMargin) >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{performanceIndicators.profitMargin}%</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/10 p-3 rounded-lg border border-slate-100 dark:border-transparent">
                    <p className="text-[10px] text-slate-500 dark:text-white/70">نسبة التحصيل</p>
                    <p className={`text-lg font-bold ${Number(performanceIndicators.collectionRate) >= 80 ? 'text-emerald-600 dark:text-emerald-400' : Number(performanceIndicators.collectionRate) >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{performanceIndicators.collectionRate}%</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/10 p-3 rounded-lg border border-slate-100 dark:border-transparent">
                    <p className="text-[10px] text-slate-500 dark:text-white/70">متوسط الفاتورة</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{performanceIndicators.avgInvoiceValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/10 p-3 rounded-lg border border-slate-100 dark:border-transparent">
                    <p className="text-[10px] text-slate-500 dark:text-white/70">عدد المبيعات</p>
                    <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{performanceIndicators.totalSales}</p>
                  </div>
                </div>
            </div>

            {/* General Stats Grid (New) */}
            <div className="grid grid-cols-2 gap-4">
               {/* Products Count */}
               <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 p-4 rounded-xl shadow-sm border border-teal-100 dark:border-teal-800 col-span-2">
                  <h3 className="text-xs font-bold text-teal-600 dark:text-teal-400 mb-1 flex items-center gap-1"><Package size={14}/> إجمالي المنتجات</h3>
                  <div className="flex justify-between items-end">
                      <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">{products.length} <span className="text-xs font-normal text-teal-500">صنف</span></p>
                      {performanceIndicators.lowStockProducts > 0 ? (
                        <div className="text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded flex items-center gap-1">
                          <AlertTriangle size={10} /> {performanceIndicators.lowStockProducts} منخفض
                        </div>
                      ) : (
                        <div className="text-[10px] text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30 px-2 py-1 rounded flex items-center gap-1">
                          <CheckCircle size={10} /> مخزون جيد
                        </div>
                      )}
                  </div>
               </div>

               {/* Customers Count */}
               <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 p-4 rounded-xl shadow-sm border border-violet-100 dark:border-violet-800 col-span-2">
                  <h3 className="text-xs font-bold text-violet-600 dark:text-violet-400 mb-1 flex items-center gap-1"><Users size={14}/> إجمالي العملاء</h3>
                  <div className="flex justify-between items-end">
                      <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{customers.length} <span className="text-xs font-normal text-violet-500">عميل</span></p>
                      <div className="text-[10px] text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-2 py-1 rounded flex items-center gap-1">
                        <CheckCircle size={10} /> {performanceIndicators.activeCustomers} نشط
                      </div>
                  </div>
               </div>

               {/* Invoices Breakdown */}
               <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 col-span-2 space-y-3">
                   <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1"><FileText size={14}/> تفاصيل الفواتير</h3>
                   
                   <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">العدد الكلي</span>
                      <span className="text-sm font-bold bg-primary/10 text-primary px-3 py-0.5 rounded-full">{invoiceStats.total}</span>
                   </div>

                   <div className="flex justify-between items-center">
                      <span className="text-xs flex items-center gap-1 text-slate-600 dark:text-slate-400"><Banknote size={12} className="text-emerald-500"/> كاش (نقدي)</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">{invoiceStats.cash}</span>
                   </div>

                   <div className="flex justify-between items-center">
                      <span className="text-xs flex items-center gap-1 text-slate-600 dark:text-slate-400"><Clock size={12} className="text-amber-500"/> آجل (ذمم)</span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">{invoiceStats.credit}</span>
                   </div>
               </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;