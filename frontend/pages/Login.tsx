
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Wallet, Lock, User, Eye, EyeOff, Sparkles, ShieldCheck, Loader2, CircleHelp, LogIn, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { systemSettingsApi } from '../services/adminApi';
import AccessibleModal from '../components/AccessibleModal';

const DEFAULT_REGISTER_FIELD_LIMITS = {
  username: 50,
  name: 100,
  companyName: 120,
  email: 100,
  password: 64,
};

const REGISTER_FIELD_BOUNDS = {
  username: { min: 12, max: 80 },
  name: { min: 30, max: 150 },
  companyName: { min: 30, max: 180 },
  email: { min: 40, max: 200 },
  password: { min: 20, max: 128 },
};

const toBoundedInt = (raw: unknown, min: number, max: number, fallback: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
};

const Login: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpView, setHelpView] = useState<'login' | 'register'>('login');
  const [registerFieldLimits, setRegisterFieldLimits] = useState(DEFAULT_REGISTER_FIELD_LIMITS);
  
  // إعدادات الأزرار من قاعدة البيانات
  const [loginSettings, setLoginSettings] = useState({
    showDemoLogin: false, // افتراضياً مخفي حتى نقرأ من API
    showAdminLogin: false,
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // جلب الإعدادات من قاعدة البيانات عند تحميل الصفحة
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await systemSettingsApi.getPublicSettings();
        const safeSettings = settings as Record<string, unknown>;

        setLoginSettings({
          showDemoLogin: settings.showDemoLogin === true || settings.showDemoLogin === 'true',
          showAdminLogin: settings.showAdminLogin === true || settings.showAdminLogin === 'true',
        });

        setRegisterFieldLimits({
          username: toBoundedInt(safeSettings.registerUsernameMaxLength, REGISTER_FIELD_BOUNDS.username.min, REGISTER_FIELD_BOUNDS.username.max, DEFAULT_REGISTER_FIELD_LIMITS.username),
          name: toBoundedInt(safeSettings.registerFullNameMaxLength, REGISTER_FIELD_BOUNDS.name.min, REGISTER_FIELD_BOUNDS.name.max, DEFAULT_REGISTER_FIELD_LIMITS.name),
          companyName: toBoundedInt(safeSettings.registerCompanyNameMaxLength, REGISTER_FIELD_BOUNDS.companyName.min, REGISTER_FIELD_BOUNDS.companyName.max, DEFAULT_REGISTER_FIELD_LIMITS.companyName),
          email: toBoundedInt(safeSettings.registerEmailMaxLength, REGISTER_FIELD_BOUNDS.email.min, REGISTER_FIELD_BOUNDS.email.max, DEFAULT_REGISTER_FIELD_LIMITS.email),
          password: toBoundedInt(safeSettings.registerPasswordMaxLength, REGISTER_FIELD_BOUNDS.password.min, REGISTER_FIELD_BOUNDS.password.max, DEFAULT_REGISTER_FIELD_LIMITS.password),
        });
      } catch (err) {
        console.error('فشل في تحميل الإعدادات:', err);
        // في حال فشل الاتصال، نبقي الأزرار مخفية
      } finally {
        setSettingsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // Show error notifications
  useEffect(() => {
    if (error) {
      notify(error, 'error');
      clearError();
    }
  }, [error, notify, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!identifier.trim() || !password.trim()) {
        notify('الرجاء إدخال اسم المستخدم وكلمة المرور', 'warning');
        return;
    }

    const success = await login(identifier, password);
    if (success) {
      notify(`مرحباً بك! تم تسجيل الدخول بنجاح`, 'success');
      navigate('/');
    }
  };

  const fillDemoData = () => {
      setIdentifier('demo');
      setPassword('');
      notify('تم تعبئة اسم مستخدم تجريبي. أدخل كلمة المرور يدوياً.', 'info');
  };

  const fillAdminData = () => {
      setIdentifier('admin');
      setPassword('');
      notify('تم تعبئة اسم المستخدم الإداري فقط. أدخل كلمة المرور يدوياً.', 'warning');
  };

  const openHelp = (view: 'login' | 'register') => {
    setHelpView(view);
    setShowHelpModal(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-primary p-8 text-center text-white">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
            <Wallet size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">المحاسب الذكي</h1>
          <p className="text-blue-100 mt-2 text-sm">سجل الدخول لإدارة أعمالك</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">اسم المستخدم / البريد الإلكتروني</label>
              <div className="relative">
                <User className="absolute right-3 top-3 text-slate-400" size={20} />
                <input 
                  type="text"
                  className="w-full pr-10 pl-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                  placeholder="admin"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 text-slate-400" size={20} />
                <input 
                  type={showPassword ? "text" : "password"}
                  className="w-full pr-10 pl-12 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-700 transition-colors shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </button>

            <button
              type="button"
              onClick={() => openHelp('login')}
              className="w-full border border-blue-200 bg-blue-50 text-blue-700 py-2.5 rounded-lg font-semibold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <CircleHelp size={18} />
              كيف تسجل الدخول؟
            </button>
          </form>
          
          {/* أزرار الدخول السريع - تظهر فقط إذا كان أحدها مفعل في قاعدة البيانات */}
          {settingsLoaded && (loginSettings.showDemoLogin || loginSettings.showAdminLogin) && (
            <div className={`grid ${loginSettings.showDemoLogin && loginSettings.showAdminLogin ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mt-4`}>
              {loginSettings.showDemoLogin && (
                  <button 
                      type="button"
                      onClick={fillDemoData}
                      disabled={isLoading}
                      className="flex flex-col items-center justify-center gap-1 text-xs text-emerald-600 font-bold bg-emerald-50 py-2 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200 disabled:opacity-50"
                  >
                      <Sparkles size={16} />
                      <span>دخول تجريبي</span>
                  </button>
              )}
              {loginSettings.showAdminLogin && (
                  <button 
                      type="button"
                      onClick={fillAdminData}
                      disabled={isLoading}
                      className="flex flex-col items-center justify-center gap-1 text-xs text-rose-600 font-bold bg-rose-50 py-2 rounded-lg hover:bg-rose-100 transition-colors border border-rose-200 disabled:opacity-50"
                  >
                      <ShieldCheck size={16} />
                      <span>دخول الأدمن</span>
                  </button>
              )}
            </div>
          )}

          <div className="mt-6 text-center pt-6 border-t border-slate-100">
            <p className="text-slate-500 text-sm mb-3">ليس لديك حساب؟</p>
            <Link to="/register" className="text-primary font-bold hover:underline">
              تسجيل حساب جديد
            </Link>
          </div>
        </div>
      </div>

      <AccessibleModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title="مساعدة تسجيل الدخول"
        maxWidthClassName="max-w-2xl"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setHelpView('login')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${helpView === 'login' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              خطوات تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => setHelpView('register')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${helpView === 'register' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              شرح إنشاء الحساب
            </button>
          </div>

          {helpView === 'login' ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <LogIn size={16} />
                  1) أدخل اسم المستخدم أو البريد
                </p>
                <p className="text-xs text-slate-600 mt-1">يمكنك تسجيل الدخول بأي منهما حسب ما استخدمته عند إنشاء الحساب.</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-sm font-bold text-slate-800">2) أدخل كلمة المرور</p>
                <p className="text-xs text-slate-600 mt-1">استخدم زر العين لإظهار/إخفاء كلمة المرور قبل الإرسال.</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-sm font-bold text-slate-800">3) اضغط تسجيل الدخول</p>
                <p className="text-xs text-slate-600 mt-1">إذا ظهرت رسالة خطأ، راجع اسم المستخدم وكلمة المرور ثم حاول مرة أخرى.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                <p className="text-sm font-bold text-blue-800 flex items-center gap-2">
                  <UserPlus size={16} />
                  عند إنشاء الحساب، املأ الحقول التالية:
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-slate-200">
                  <p className="text-sm font-semibold text-slate-800">اسم المستخدم (للدخول - أحرف/أرقام و . _ -) <span className="text-xs text-slate-500">0/{registerFieldLimits.username}</span></p>
                  <p className="text-xs text-slate-500 mt-1">مثال: healthy_food01</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200">
                  <p className="text-sm font-semibold text-slate-800">الاسم الشخصي (الاسم الحقيقي لصاحب الحساب) <span className="text-xs text-slate-500">0/{registerFieldLimits.name}</span></p>
                  <p className="text-xs text-slate-500 mt-1">مثال: أحمد سالم</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200">
                  <p className="text-sm font-semibold text-slate-800">اسم الشركة / المتجر (يظهر على الفواتير والتقارير) <span className="text-xs text-slate-500">0/{registerFieldLimits.companyName}</span></p>
                  <p className="text-xs text-slate-500 mt-1">مثال: هلثي فود</p>
                  <p className="text-xs text-slate-500">أو: helthFFom</p>
                  <p className="text-xs text-slate-500">بدون كلمة شركة</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200">
                  <p className="text-sm font-semibold text-slate-800">البريد الإلكتروني (للتواصل واسترجاع الحساب) <span className="text-xs text-slate-500">0/{registerFieldLimits.email}</span></p>
                  <p className="text-xs text-slate-500 mt-1">مثال: owner@healthyfood.com</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 sm:col-span-2">
                  <p className="text-sm font-semibold text-slate-800">كلمة المرور (يفضل حروفا وارقاما لزيادة الامان) <span className="text-xs text-slate-500">0/{registerFieldLimits.password}</span></p>
                  <p className="text-xs text-slate-500 mt-1">مثال: Hf2026safe</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">نفس عدادات شاشة التسجيل الرسمية، والحدود تُحدَّث حسب إعدادات المدير.</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              فهمت
            </button>
          </div>
        </div>
      </AccessibleModal>
    </div>
  );
};

export default Login;
