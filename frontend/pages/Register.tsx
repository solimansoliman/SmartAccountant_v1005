import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Wallet, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import { systemSettingsApi } from '../services/adminApi';

const FIELD_MIN_LIMITS = {
  username: 3,
  name: 2,
  companyName: 2,
  email: 5,
  password: 6,
};

const DEFAULT_FIELD_MAX_LIMITS = {
  username: 50,
  name: 100,
  companyName: 120,
  email: 100,
  password: 64,
};

const FIELD_MAX_BOUNDS = {
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

interface FloatingFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  hint: string;
  type?: string;
  autoComplete?: string;
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}

const FloatingField: React.FC<FloatingFieldProps> = ({
  id,
  label,
  value,
  onChange,
  maxLength,
  hint,
  type = 'text',
  autoComplete,
  disabled,
  inputMode,
}) => {
  const remaining = maxLength - value.length;
  const isNearLimit = remaining <= 10;

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          autoComplete={autoComplete}
          disabled={disabled}
          inputMode={inputMode}
          placeholder=" "
          className="peer w-full rounded-xl border border-slate-200 bg-white px-3 pt-5 pb-2.5 text-sm text-slate-900 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
        />
        <label
          htmlFor={id}
          className="pointer-events-none absolute right-3 top-1.5 bg-white px-1 text-[11px] text-slate-500 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:translate-y-0 peer-focus:bg-white peer-focus:px-1 peer-focus:text-[11px] peer-focus:text-blue-600"
        >
          {label}
        </label>
        <span className={`absolute left-3 top-2 text-[11px] font-medium ${isNearLimit ? 'text-amber-600' : 'text-slate-400'}`}>
          {value.length}/{maxLength}
        </span>
      </div>
      {hint.trim().length > 0 && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
};

const Register: React.FC = () => {
  const { register, isLoading, error, clearError } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    companyName: '',
    email: '',
    password: ''
  });
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const lastNotifiedErrorRef = useRef<string | null>(null);
  const [fieldMaxLimits, setFieldMaxLimits] = useState(DEFAULT_FIELD_MAX_LIMITS);

  useEffect(() => {
    const loadRegisterLimits = async () => {
      try {
        const settings = await systemSettingsApi.getPublicSettings();
        setFieldMaxLimits({
          username: toBoundedInt((settings as any).registerUsernameMaxLength, FIELD_MAX_BOUNDS.username.min, FIELD_MAX_BOUNDS.username.max, DEFAULT_FIELD_MAX_LIMITS.username),
          name: toBoundedInt((settings as any).registerFullNameMaxLength, FIELD_MAX_BOUNDS.name.min, FIELD_MAX_BOUNDS.name.max, DEFAULT_FIELD_MAX_LIMITS.name),
          companyName: toBoundedInt((settings as any).registerCompanyNameMaxLength, FIELD_MAX_BOUNDS.companyName.min, FIELD_MAX_BOUNDS.companyName.max, DEFAULT_FIELD_MAX_LIMITS.companyName),
          email: toBoundedInt((settings as any).registerEmailMaxLength, FIELD_MAX_BOUNDS.email.min, FIELD_MAX_BOUNDS.email.max, DEFAULT_FIELD_MAX_LIMITS.email),
          password: toBoundedInt((settings as any).registerPasswordMaxLength, FIELD_MAX_BOUNDS.password.min, FIELD_MAX_BOUNDS.password.max, DEFAULT_FIELD_MAX_LIMITS.password),
        });
      } catch {
        // استخدم القيم الافتراضية إذا لم تتوفر الإعدادات من السيرفر.
      }
    };

    loadRegisterLimits();
  }, []);

  // Show error notifications
  useEffect(() => {
    if (error) {
      const normalizedError = error.includes('اسم المستخدم موجود مسبقاً')
        ? 'اسم المستخدم موجود مسبقاً. اختر اسم مستخدم آخر أو سجّل الدخول مباشرة.'
        : error;

      if (lastNotifiedErrorRef.current !== error) {
        notify(normalizedError, 'error');
        lastNotifiedErrorRef.current = error;
      }
      clearError();
      return;
    }

    lastNotifiedErrorRef.current = null;
  }, [error, notify, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Explicit Validation
    if (!formData.username || !formData.name || !formData.companyName || !formData.email || !formData.password) {
        notify('الرجاء ملء جميع الحقول المطلوبة', 'warning');
        return;
    }

    const usernameLength = formData.username.trim().length;
    if (usernameLength < FIELD_MIN_LIMITS.username || usernameLength > fieldMaxLimits.username) {
      notify(`اسم المستخدم يجب أن يكون بين ${FIELD_MIN_LIMITS.username} و ${fieldMaxLimits.username} حرفاً`, 'warning');
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!usernameRegex.test(formData.username.trim())) {
      notify('اسم المستخدم يقبل الأحرف والأرقام و . _ - فقط', 'warning');
      return;
    }

    const nameLength = formData.name.trim().length;
    if (nameLength < FIELD_MIN_LIMITS.name || nameLength > fieldMaxLimits.name) {
      notify(`الاسم الشخصي يجب أن يكون بين ${FIELD_MIN_LIMITS.name} و ${fieldMaxLimits.name} حرفاً`, 'warning');
      return;
    }

    const companyLength = formData.companyName.trim().length;
    if (companyLength < FIELD_MIN_LIMITS.companyName || companyLength > fieldMaxLimits.companyName) {
      notify(`اسم الشركة/المتجر يجب أن يكون بين ${FIELD_MIN_LIMITS.companyName} و ${fieldMaxLimits.companyName} حرفاً`, 'warning');
      return;
    }

    const emailLength = formData.email.trim().length;
    if (emailLength < FIELD_MIN_LIMITS.email || emailLength > fieldMaxLimits.email) {
      notify(`البريد الإلكتروني يجب أن يكون بين ${FIELD_MIN_LIMITS.email} و ${fieldMaxLimits.email} حرفاً`, 'warning');
      return;
    }

    if (formData.password.length < FIELD_MIN_LIMITS.password || formData.password.length > fieldMaxLimits.password) {
        notify(`كلمة المرور يجب أن تكون بين ${FIELD_MIN_LIMITS.password} و ${fieldMaxLimits.password} حرفاً`, 'warning');
        return;
    }

    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setShowSubmitConfirm(false);

    const success = await register(formData);
    if (success) {
      notify('تم إنشاء الحساب بنجاح! مرحباً بك', 'success');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-slate-800 p-8 text-center text-white">
          <div className="mx-auto bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
            <Wallet size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">إنشاء حساب جديد</h1>
          <p className="text-slate-300 mt-2 text-sm">نموذج مبسّط مع عداد أحرف لكل حقل</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FloatingField
                id="register-username"
                label="اسم المستخدم (للدخول - أحرف/أرقام و . _ -)"
                value={formData.username}
                onChange={(value) => setFormData({ ...formData, username: value })}
                maxLength={fieldMaxLimits.username}
                hint=""
                autoComplete="username"
                disabled={isLoading}
              />

              <FloatingField
                id="register-fullname"
                label="الاسم الشخصي (الاسم الحقيقي لصاحب الحساب)"
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                maxLength={fieldMaxLimits.name}
                hint=""
                autoComplete="name"
                disabled={isLoading}
              />

              <FloatingField
                id="register-company"
                label="اسم الشركة / المتجر (يظهر على الفواتير والتقارير)"
                value={formData.companyName}
                onChange={(value) => setFormData({ ...formData, companyName: value })}
                maxLength={fieldMaxLimits.companyName}
                hint=""
                autoComplete="organization"
                disabled={isLoading}
              />

              <FloatingField
                id="register-email"
                label="البريد الإلكتروني (للتواصل واسترجاع الحساب)"
                type="email"
                value={formData.email}
                onChange={(value) => setFormData({ ...formData, email: value })}
                maxLength={fieldMaxLimits.email}
                hint=""
                autoComplete="email"
                inputMode="email"
                disabled={isLoading}
              />
            </div>

            <FloatingField
              id="register-password"
              label="كلمة المرور (يفضل حروفا وارقاما لزيادة الامان)"
              type="password"
              value={formData.password}
              onChange={(value) => setFormData({ ...formData, password: value })}
              maxLength={fieldMaxLimits.password}
              hint=""
              autoComplete="new-password"
              disabled={isLoading}
            />

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

      <ConfirmDialog
        isOpen={showSubmitConfirm}
        title="تأكيد إنشاء الحساب"
        message="هل أنت متأكد من صحة البيانات لإنشاء الحساب؟"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
        confirmText="إنشاء الحساب"
        cancelText="مراجعة البيانات"
        isLoading={isLoading}
      />
    </div>
  );
};

export default Register;