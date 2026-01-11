import React, { useState, useEffect } from 'react';
import { 
  Crown, Check, X, Zap, Star, Rocket, Building, 
  Loader2, ArrowRight, Sparkles, Shield, Clock,
  Users, FileText, Package, UserCircle
} from 'lucide-react';
import { plansApi, ApiPlan } from '../services/adminApi';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

// أيقونات الخطط
const planIcons: Record<string, React.ElementType> = {
  Star, Zap, Rocket, Crown, Building
};

// ألوان الخطط
const planColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  slate: { 
    bg: 'bg-slate-50 dark:bg-slate-800', 
    text: 'text-slate-600 dark:text-slate-300', 
    border: 'border-slate-200 dark:border-slate-700',
    gradient: 'from-slate-400 to-slate-600'
  },
  blue: { 
    bg: 'bg-blue-50 dark:bg-blue-900/20', 
    text: 'text-blue-600 dark:text-blue-400', 
    border: 'border-blue-200 dark:border-blue-800',
    gradient: 'from-blue-400 to-blue-600'
  },
  violet: { 
    bg: 'bg-violet-50 dark:bg-violet-900/20', 
    text: 'text-violet-600 dark:text-violet-400', 
    border: 'border-violet-200 dark:border-violet-800',
    gradient: 'from-violet-400 to-violet-600'
  },
  amber: { 
    bg: 'bg-amber-50 dark:bg-amber-900/20', 
    text: 'text-amber-600 dark:text-amber-400', 
    border: 'border-amber-200 dark:border-amber-800',
    gradient: 'from-amber-400 to-amber-600'
  },
  emerald: { 
    bg: 'bg-emerald-50 dark:bg-emerald-900/20', 
    text: 'text-emerald-600 dark:text-emerald-400', 
    border: 'border-emerald-200 dark:border-emerald-800',
    gradient: 'from-emerald-400 to-emerald-600'
  },
  rose: { 
    bg: 'bg-rose-50 dark:bg-rose-900/20', 
    text: 'text-rose-600 dark:text-rose-400', 
    border: 'border-rose-200 dark:border-rose-800',
    gradient: 'from-rose-400 to-rose-600'
  },
};

const Pricing: React.FC = () => {
  const { notify } = useNotification();
  const { user } = useAuth();
  
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<ApiPlan | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await plansApi.getAll(false); // فقط الخطط النشطة
      setPlans(data.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (error) {
      console.error('Error loading plans:', error);
      notify('فشل في تحميل الخطط', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: ApiPlan) => {
    setSelectedPlan(plan);
    setShowConfirmModal(true);
  };

  const handleConfirmSubscription = async () => {
    if (!selectedPlan) return;
    
    // TODO: تنفيذ عملية الاشتراك الفعلية
    notify(`تم اختيار خطة ${selectedPlan.name} بنجاح! سيتم التواصل معك قريباً.`, 'success');
    setShowConfirmModal(false);
    setSelectedPlan(null);
  };

  const getPrice = (plan: ApiPlan) => {
    if (billingCycle === 'yearly' && plan.yearlyPrice) {
      return plan.yearlyPrice;
    }
    return plan.price;
  };

  const getSavings = (plan: ApiPlan) => {
    if (plan.yearlyPrice && plan.price > 0) {
      const yearlyMonthly = plan.yearlyPrice / 12;
      const savings = ((plan.price - yearlyMonthly) / plan.price * 100);
      return savings > 0 ? savings.toFixed(0) : null;
    }
    return null;
  };

  const formatLimit = (limit: number) => {
    if (limit === -1) return 'غير محدود';
    return limit.toLocaleString();
  };

  const PlanIcon = ({ icon, color }: { icon: string; color: string }) => {
    const IconComponent = planIcons[icon] || Star;
    const colorClass = planColors[color] || planColors.blue;
    return (
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClass.gradient} flex items-center justify-center shadow-lg`}>
        <IconComponent className="text-white" size={28} />
      </div>
    );
  };

  const FeatureItem = ({ available, text }: { available: boolean; text: string }) => (
    <div className={`flex items-center gap-3 py-2 ${available ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
      {available ? (
        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <X size={12} className="text-slate-400" />
        </div>
      )}
      <span className="text-sm">{text}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">جاري تحميل الخطط...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
          <Sparkles size={16} />
          اختر الخطة المناسبة لك
        </div>
        <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-4">
          خطط الأسعار
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          اختر الخطة التي تناسب احتياجات عملك. جميع الخطط تتضمن تحديثات مجانية ودعم فني.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-primary' : 'text-slate-500'}`}>
            شهري
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              billingCycle === 'yearly' ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-1'
            }`} />
          </button>
          <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-primary' : 'text-slate-500'}`}>
            سنوي
            <span className="mr-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
              وفر حتى 20%
            </span>
          </span>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const colorStyle = planColors[plan.color] || planColors.blue;
          const savings = getSavings(plan);
          
          return (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-slate-800 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                plan.isPopular 
                  ? `${colorStyle.border} shadow-lg ring-2 ring-${plan.color}-500/20` 
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              {/* Popular Badge */}
              {plan.isPopular && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r ${colorStyle.gradient} text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg`}>
                  الأكثر شعبية
                </div>
              )}

              <div className="p-6">
                {/* Plan Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <PlanIcon icon={plan.icon} color={plan.color} />
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-4">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {plan.description || plan.nameEn}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-800 dark:text-white">
                      {getPrice(plan).toLocaleString()}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-sm">
                      {plan.currency}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 text-sm">
                      / {billingCycle === 'yearly' ? 'سنة' : 'شهر'}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && savings && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                      توفير {savings}% مقارنة بالدفع الشهري
                    </p>
                  )}
                </div>

                {/* Limits */}
                <div className="space-y-3 pb-6 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3 text-sm">
                    <Users size={16} className={colorStyle.text} />
                    <span className="text-slate-600 dark:text-slate-300">
                      <strong>{formatLimit(plan.maxUsers)}</strong> مستخدم
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <FileText size={16} className={colorStyle.text} />
                    <span className="text-slate-600 dark:text-slate-300">
                      <strong>{formatLimit(plan.maxInvoices)}</strong> فاتورة/شهر
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <UserCircle size={16} className={colorStyle.text} />
                    <span className="text-slate-600 dark:text-slate-300">
                      <strong>{formatLimit(plan.maxCustomers)}</strong> عميل
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Package size={16} className={colorStyle.text} />
                    <span className="text-slate-600 dark:text-slate-300">
                      <strong>{formatLimit(plan.maxProducts)}</strong> منتج
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="py-6 space-y-1">
                  <FeatureItem available={plan.hasBasicReports} text="التقارير الأساسية" />
                  <FeatureItem available={plan.hasAdvancedReports} text="التقارير المتقدمة" />
                  <FeatureItem available={plan.hasEmailSupport} text="الدعم عبر البريد" />
                  <FeatureItem available={plan.hasPrioritySupport} text="الدعم ذو الأولوية" />
                  <FeatureItem available={plan.hasDedicatedManager} text="مدير حساب مخصص" />
                  <FeatureItem available={plan.hasBackup} text={`نسخ احتياطي ${plan.backupFrequency === 'instant' ? 'فوري' : plan.backupFrequency === 'daily' ? 'يومي' : 'أسبوعي'}`} />
                  <FeatureItem available={plan.hasCustomInvoices} text="تخصيص الفواتير" />
                  <FeatureItem available={plan.hasMultiCurrency} text="العملات المتعددة" />
                  <FeatureItem available={plan.hasApiAccess} text="الوصول لـ API" />
                  <FeatureItem available={plan.hasWhiteLabel} text="إزالة العلامة التجارية" />
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full py-3 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                    plan.isPopular
                      ? `bg-gradient-to-r ${colorStyle.gradient} text-white hover:shadow-lg hover:shadow-${plan.color}-500/25`
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {plan.price === 0 ? 'ابدأ مجاناً' : 'اختر الخطة'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Features Comparison - Optional */}
      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">
          لماذا تختار SmartAccountant؟
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white mb-2">أمان عالي</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              بياناتك محمية بأحدث تقنيات التشفير والأمان
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Clock className="text-emerald-600 dark:text-emerald-400" size={24} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white mb-2">دعم 24/7</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              فريق دعم متاح على مدار الساعة لمساعدتك
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="text-violet-600 dark:text-violet-400" size={24} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white mb-2">تحديثات مستمرة</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ميزات جديدة وتحسينات تضاف باستمرار
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center mb-6">
              <PlanIcon icon={selectedPlan.icon} color={selectedPlan.color} />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-4">
                تأكيد اختيار الخطة
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                أنت على وشك الاشتراك في خطة <strong>{selectedPlan.name}</strong>
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-300">المبلغ</span>
                <span className="text-xl font-bold text-slate-800 dark:text-white">
                  {getPrice(selectedPlan).toLocaleString()} {selectedPlan.currency}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className="text-slate-500">الدورة</span>
                <span className="text-slate-600 dark:text-slate-300">
                  {billingCycle === 'yearly' ? 'سنوي' : 'شهري'}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 px-4 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmSubscription}
                className="flex-1 py-3 px-4 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
              >
                تأكيد الاشتراك
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pricing;
