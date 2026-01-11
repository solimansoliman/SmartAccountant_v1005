import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Wallet, User, Mail, Lock, Building, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const { register, isLoading, error, clearError } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    password: ''
  });

  // Show error notifications
  useEffect(() => {
    if (error) {
      notify(error, 'error');
      clearError();
    }
  }, [error, notify, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Explicit Validation
    if (!formData.name || !formData.companyName || !formData.email || !formData.password) {
        notify('الرجاء ملء جميع الحقول المطلوبة', 'warning');
        return;
    }

    if (formData.password.length < 6) {
        notify('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'warning');
        return;
    }
    
    // Confirmation Check
    if(!confirm('هل أنت متأكد من صحة البيانات لإنشاء الحساب؟')) return;

    const success = await register(formData);
    if (success) {
      notify('تم إنشاء الحساب بنجاح! مرحباً بك', 'success');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-800 p-8 text-center text-white">
          <div className="mx-auto bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
            <Wallet size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">إنشاء حساب جديد</h1>
          <p className="text-slate-300 mt-2 text-sm">انضم لنظام المحاسب الذكي</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الشخصي</label>
              <div className="relative">
                <User className="absolute right-3 top-3 text-slate-400" size={18} />
                <input 
                  type="text"
                  className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white text-slate-900 placeholder:text-slate-400"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم الشركة / المتجر</label>
              <div className="relative">
                <Building className="absolute right-3 top-3 text-slate-400" size={18} />
                <input 
                  type="text"
                  className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white text-slate-900 placeholder:text-slate-400"
                  value={formData.companyName}
                  onChange={e => setFormData({...formData, companyName: e.target.value})}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-3 text-slate-400" size={18} />
                <input 
                  type="email"
                  className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white text-slate-900 placeholder:text-slate-400"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 text-slate-400" size={18} />
                <input 
                  type="password"
                  className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white text-slate-900 placeholder:text-slate-400"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  disabled={isLoading}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  جاري إنشاء الحساب...
                </>
              ) : (
                'تسجيل الحساب'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-slate-500 text-sm hover:text-slate-800">
              لديك حساب بالفعل؟ تسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;