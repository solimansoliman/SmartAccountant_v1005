import React, { useState, useEffect } from 'react';
import { 
  Crown, Check, X, Zap, Building2, Users, Star, Rocket, 
  ShieldCheck, Clock, CreditCard, ArrowRight, Sparkles,
  BarChart3, FileText, Receipt, Package, UserCheck, Settings,
  Globe, HeadphonesIcon, Database, Lock, Infinity, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { accountApi, plansApi, ApiPlan } from '../services/adminApi';

// تعريف الخطط للعرض
interface DisplayPlan {
  id: number;
  name: string;
  nameEn: string;
  description: string;
  price: number;
  yearlyPrice: number;
  period: string;
  currency: string;
  color: string;
  icon: React.ReactNode;
  popular?: boolean;
  features: {
    name: string;
    included: boolean;
    limit?: string;
  }[];
}

// أيقونات الخطط
const planIcons: Record<string, React.ReactNode> = {
  'star': <Star className="w-6 h-6" />,
  'zap': <Zap className="w-6 h-6" />,
  'rocket': <Rocket className="w-6 h-6" />,
  'crown': <Crown className="w-6 h-6" />,
  'building': <Building2 className="w-6 h-6" />,
};

// تحويل البيانات من API إلى صيغة العرض
const convertApiPlanToDisplay = (apiPlan: ApiPlan): DisplayPlan => {
  const features: { name: string; included: boolean; limit?: string }[] = [];
  
  // عدد المستخدمين
  if (apiPlan.maxUsers === -1) {
    features.push({ name: 'عدد المستخدمين', included: true, limit: 'غير محدود' });
  } else {
    features.push({ name: 'عدد المستخدمين', included: true, limit: `${apiPlan.maxUsers} ${apiPlan.maxUsers === 1 ? 'مستخدم' : 'مستخدمين'}` });
  }
  
  // عدد الفواتير
  if (apiPlan.maxInvoices === -1) {
    features.push({ name: 'عدد الفواتير', included: true, limit: 'غير محدود' });
  } else {
    features.push({ name: 'عدد الفواتير', included: true, limit: `${apiPlan.maxInvoices} فاتورة/شهر` });
  }
  
  // عدد العملاء
  if (apiPlan.maxCustomers === -1) {
    features.push({ name: 'عدد العملاء', included: true, limit: 'غير محدود' });
  } else {
    features.push({ name: 'عدد العملاء', included: true, limit: `${apiPlan.maxCustomers} عميل` });
  }
  
  // عدد المنتجات
  if (apiPlan.maxProducts === -1) {
    features.push({ name: 'عدد المنتجات', included: true, limit: 'غير محدود' });
  } else {
    features.push({ name: 'عدد المنتجات', included: true, limit: `${apiPlan.maxProducts} منتج` });
  }
  
  // التقارير
  if (apiPlan.hasAdvancedReports) {
    features.push({ name: 'التقارير المتقدمة', included: true });
  } else if (apiPlan.hasBasicReports) {
    features.push({ name: 'التقارير الأساسية', included: true });
  } else {
    features.push({ name: 'التقارير', included: false });
  }
  
  // الدعم
  if (apiPlan.hasDedicatedManager) {
    features.push({ name: 'مدير حساب مخصص', included: true });
  } else if (apiPlan.hasPrioritySupport) {
    features.push({ name: 'الدعم ذو الأولوية', included: true });
  } else if (apiPlan.hasEmailSupport) {
    features.push({ name: 'الدعم عبر البريد', included: true });
  } else {
    features.push({ name: 'الدعم الفني', included: false });
  }
  
  // النسخ الاحتياطي
  if (apiPlan.hasBackup) {
    features.push({ name: 'النسخ الاحتياطي', included: true, limit: apiPlan.backupFrequency || undefined });
  } else {
    features.push({ name: 'النسخ الاحتياطي', included: false });
  }
  
  // تخصيص الفواتير
  features.push({ name: apiPlan.hasWhiteLabel ? 'تخصيص كامل' : 'تخصيص الفواتير', included: apiPlan.hasCustomInvoices });
  
  // العملات المتعددة
  features.push({ name: 'العملات المتعددة', included: apiPlan.hasMultiCurrency });
  
  // API Access
  features.push({ name: 'API Access', included: apiPlan.hasApiAccess });
  
  return {
    id: apiPlan.id,
    name: apiPlan.name,
    nameEn: apiPlan.nameEn || apiPlan.name,
    description: apiPlan.description || '',
    price: apiPlan.price,
    yearlyPrice: apiPlan.yearlyPrice || apiPlan.price * 10,
    period: 'شهرياً',
    currency: apiPlan.currency,
    color: apiPlan.color || 'slate',
    icon: planIcons[apiPlan.icon?.toLowerCase() || 'star'] || <Star className="w-6 h-6" />,
    popular: apiPlan.isPopular,
    features,
  };
};

// ألوان الخطط
const planColors: Record<string, { bg: string; text: string; border: string; button: string; light: string }> = {
  slate: {
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    button: 'bg-slate-600 hover:bg-slate-700',
    light: 'bg-slate-100 dark:bg-slate-700',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    button: 'bg-blue-600 hover:bg-blue-700',
    light: 'bg-blue-100 dark:bg-blue-900/30',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-800',
    button: 'bg-violet-600 hover:bg-violet-700',
    light: 'bg-violet-100 dark:bg-violet-900/30',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    button: 'bg-amber-600 hover:bg-amber-700',
    light: 'bg-amber-100 dark:bg-amber-900/30',
  },
};

const Plans: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [plans, setPlans] = useState<DisplayPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<number>(0);
  const [subscriptionExpiry, setSubscriptionExpiry] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // تحميل الخطط من API
  useEffect(() => {
    const loadPlans = async () => {
      try {
        setLoading(true);
        const apiPlans = await plansApi.getAll();
        const displayPlans = apiPlans
          .filter(p => p.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(convertApiPlanToDisplay);
        setPlans(displayPlans);
      } catch (error) {
        console.error('Failed to load plans:', error);
        notify('فشل في تحميل الخطط', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadPlans();
  }, []);

  // تحميل بيانات الخطة الحالية
  useEffect(() => {
    const loadCurrentPlan = async () => {
      if (user?.accountId && plans.length > 0) {
        try {
          const account = await accountApi.get(parseInt(user.accountId.toString()));
          // البحث عن الخطة بالاسم
          const found = plans.find(p => 
            p.name === account.plan || p.nameEn === account.plan
          );
          if (found) {
            setCurrentPlan(found.id);
          }
          setSubscriptionExpiry(account.subscriptionExpiry || null);
        } catch (error) {
          console.error('Failed to load plan:', error);
        }
      }
    };
    loadCurrentPlan();
  }, [user?.accountId, plans]);

  // حساب السعر بناءً على دورة الفوترة
  const getPrice = (plan: DisplayPlan) => {
    if (billingCycle === 'yearly') {
      return plan.yearlyPrice;
    }
    return plan.price;
  };

  // حساب التوفير السنوي
  const getYearlySavings = (plan: DisplayPlan) => {
    return (plan.price * 12) - plan.yearlyPrice;
  };

  // التعامل مع اختيار خطة
  const handleSelectPlan = async (planId: number) => {
    if (planId === currentPlan) {
      notify('أنت مشترك بالفعل في هذه الخطة', 'info');
      return;
    }

    const currentPlanIndex = plans.findIndex(p => p.id === currentPlan);
    const selectedPlanIndex = plans.findIndex(p => p.id === planId);

    if (selectedPlanIndex < currentPlanIndex) {
      if (!confirm('هل تريد تخفيض خطتك؟ قد تفقد بعض الميزات.')) {
        return;
      }
    }

    setActionLoading(true);
    
    // محاكاة عملية الدفع
    setTimeout(() => {
      setActionLoading(false);
      notify('تم توجيهك لصفحة الدفع...', 'info');
      // هنا يمكن إضافة التكامل مع بوابة الدفع
    }, 1000);
  };

  // تنسيق التاريخ
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-blue-600 to-violet-600 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-full mb-6">
            <Sparkles size={18} />
            <span className="text-sm">اختر الخطة المناسبة لعملك</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">خطط الأسعار</h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto">
            نقدم لك خططاً مرنة تناسب جميع أحجام الأعمال. ابدأ مجاناً وقم بالترقية عندما تحتاج.
          </p>

          {/* دورة الفوترة */}
          <div className="mt-8 inline-flex items-center gap-3 p-1.5 bg-white/10 backdrop-blur rounded-full">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-primary shadow-lg'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              شهري
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-white text-primary shadow-lg'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              سنوي
              <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                وفر 17%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="max-w-6xl mx-auto px-4 py-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">جاري تحميل الخطط...</p>
          </div>
        </div>
      )}

      {/* الخطة الحالية */}
      {!loading && plans.length > 0 && (() => {
        const currentPlanData = plans.find(p => p.id === currentPlan);
        if (!currentPlanData || currentPlanData.price === 0) return null;
        const colors = planColors[currentPlanData.color] || planColors.slate;
        return (
          <div className="max-w-6xl mx-auto px-4 -mt-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${colors.light} flex items-center justify-center ${colors.text}`}>
                  {currentPlanData.icon}
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">خطتك الحالية</p>
                  <p className="font-bold text-slate-800 dark:text-white">{currentPlanData.name}</p>
                </div>
              </div>
              {subscriptionExpiry && (
                <div className="text-left">
                  <p className="text-sm text-slate-500 dark:text-slate-400">تنتهي في</p>
                  <p className="font-medium text-slate-800 dark:text-white">{formatDate(subscriptionExpiry)}</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Plans Grid */}
      {!loading && plans.length > 0 && (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const colors = planColors[plan.color] || planColors.slate;
            const isCurrentPlan = plan.id === currentPlan;
            const price = getPrice(plan);
            const savings = getYearlySavings(plan);

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 transition-all duration-300 hover:shadow-xl ${
                  plan.popular
                    ? 'border-violet-400 dark:border-violet-500 shadow-lg scale-105'
                    : isCurrentPlan
                    ? `${colors.border} shadow-md`
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                } bg-white dark:bg-slate-800`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium rounded-full shadow-lg">
                      الأكثر شعبية
                    </span>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <span className={`px-3 py-1 ${colors.light} ${colors.text} text-xs font-medium rounded-full`}>
                      خطتك الحالية
                    </span>
                  </div>
                )}

                <div className="p-6">
                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <div className={`w-14 h-14 mx-auto rounded-xl ${colors.light} flex items-center justify-center ${colors.text} mb-4`}>
                      {plan.icon}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">{plan.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-slate-800 dark:text-white">
                        {price === 0 ? 'مجاني' : price}
                      </span>
                      {price > 0 && (
                        <>
                          <span className="text-lg text-slate-500 dark:text-slate-400">{plan.currency}</span>
                          <span className="text-sm text-slate-400 dark:text-slate-500">
                            /{billingCycle === 'yearly' ? 'سنة' : 'شهر'}
                          </span>
                        </>
                      )}
                    </div>
                    {billingCycle === 'yearly' && savings > 0 && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        توفير {savings} {plan.currency} سنوياً
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <X size={18} className="text-slate-300 dark:text-slate-600 mt-0.5 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${
                          feature.included 
                            ? 'text-slate-700 dark:text-slate-300' 
                            : 'text-slate-400 dark:text-slate-500'
                        }`}>
                          {feature.name}
                          {feature.limit && feature.included && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">
                              ({feature.limit})
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={actionLoading || isCurrentPlan}
                    className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                      isCurrentPlan
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        : plan.popular
                        ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/30'
                        : `${colors.button} text-white`
                    }`}
                  >
                    {isCurrentPlan ? (
                      <>
                        <ShieldCheck size={18} />
                        خطتك الحالية
                      </>
                    ) : (() => {
                      const currentIdx = plans.findIndex(p => p.id === currentPlan);
                      const planIdx = plans.findIndex(p => p.id === plan.id);
                      if (planIdx > currentIdx) {
                        return (
                          <>
                            ترقية الآن
                            <ArrowRight size={18} />
                          </>
                        );
                      } else if (planIdx < currentIdx) {
                        return 'تخفيض الخطة';
                      }
                      return (
                        <>
                          ابدأ مجاناً
                          <ArrowRight size={18} />
                        </>
                      );
                    })()}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* ميزات إضافية */}
      <div className="bg-white dark:bg-slate-800 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">
              جميع الخطط تتضمن
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              ميزات أساسية متاحة في جميع الخطط
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Lock />, title: 'أمان عالي', desc: 'تشفير SSL وحماية البيانات' },
              { icon: <Globe />, title: 'وصول من أي مكان', desc: 'عبر الويب والموبايل' },
              { icon: <Database />, title: 'تخزين سحابي', desc: 'بياناتك آمنة دائماً' },
              { icon: <HeadphonesIcon />, title: 'دعم فني', desc: 'فريق دعم متاح لمساعدتك' },
            ].map((item, idx) => (
              <div key={idx} className="text-center p-6">
                <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white text-center mb-8">
          الأسئلة الشائعة
        </h2>
        <div className="space-y-4">
          {[
            {
              q: 'هل يمكنني تغيير خطتي لاحقاً؟',
              a: 'نعم، يمكنك الترقية أو تخفيض خطتك في أي وقت. سيتم تعديل الفاتورة تلقائياً.',
            },
            {
              q: 'ما هي طرق الدفع المتاحة؟',
              a: 'نقبل بطاقات الائتمان (فيزا، ماستركارد)، التحويل البنكي، وخدمات الدفع المحلية.',
            },
            {
              q: 'هل هناك فترة تجريبية؟',
              a: 'نعم، يمكنك تجربة الخطة المتقدمة مجاناً لمدة 14 يوماً بدون الحاجة لبطاقة ائتمان.',
            },
            {
              q: 'ماذا يحدث عند انتهاء الاشتراك؟',
              a: 'ستتحول تلقائياً للخطة المجانية مع الاحتفاظ ببياناتك. يمكنك التجديد في أي وقت.',
            },
          ].map((faq, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-white mb-2">{faq.q}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-br from-primary to-violet-600 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">جاهز للبدء؟</h2>
          <p className="text-blue-100 mb-8">
            انضم لآلاف الشركات التي تستخدم المحاسب الذكي لإدارة أعمالها
          </p>
          <button
            onClick={() => handleSelectPlan(2)}
            className="px-8 py-4 bg-white text-primary font-bold rounded-xl hover:shadow-xl transition-all inline-flex items-center gap-2"
          >
            ابدأ التجربة المجانية
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Plans;
