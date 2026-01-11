
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Wallet, Lock, User, Eye, EyeOff, Sparkles, ShieldCheck, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { systemSettingsApi } from '../services/adminApi';

const Login: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
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
        setLoginSettings({
          showDemoLogin: settings.showDemoLogin === true || settings.showDemoLogin === 'true',
          showAdminLogin: settings.showAdminLogin === true || settings.showAdminLogin === 'true',
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
      // Use real admin credentials from database
      setIdentifier('admin');
      setPassword('admin123');
      notify('تم ملء بيانات الدخول (admin / admin123)', 'info');
  };

  const fillAdminData = () => {
      setIdentifier('admin');
      setPassword('admin123');
      notify('تم ملء بيانات مدير النظام (admin / admin123)', 'warning');
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
    </div>
  );
};

export default Login;
