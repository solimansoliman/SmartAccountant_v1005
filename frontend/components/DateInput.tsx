import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps {
  value: string; // YYYY-MM-DD format internally
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * مكون إدخال التاريخ بتنسيق يوم-شهر-سنة (DD-MM-YYYY)
 * يحتفظ بالقيمة الداخلية بصيغة YYYY-MM-DD للتوافق مع الـ API
 */
const DateInput: React.FC<DateInputProps> = ({ 
  value, 
  onChange, 
  className = '', 
  placeholder = 'يوم-شهر-سنة',
  disabled = false 
}) => {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  
  // تحويل من YYYY-MM-DD إلى DD-MM-YYYY للعرض
  const formatForDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  // تحويل من DD-MM-YYYY إلى YYYY-MM-DD للتخزين
  const formatForStorage = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const [displayValue, setDisplayValue] = useState(formatForDisplay(value));

  useEffect(() => {
    setDisplayValue(formatForDisplay(value));
  }, [value]);

  const handleDisplayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    
    // إزالة أي شيء غير رقم أو شرطة
    input = input.replace(/[^\d-]/g, '');
    
    // إضافة الشرطات تلقائياً
    if (input.length === 2 && !input.includes('-')) {
      input = input + '-';
    } else if (input.length === 5 && input.split('-').length === 2) {
      input = input + '-';
    }
    
    // تحديد الحد الأقصى للطول
    if (input.length <= 10) {
      setDisplayValue(input);
      
      // إذا كان التنسيق مكتمل DD-MM-YYYY
      if (input.length === 10) {
        const storageFormat = formatForStorage(input);
        // التحقق من صحة التاريخ
        const testDate = new Date(storageFormat);
        if (!isNaN(testDate.getTime())) {
          onChange(storageFormat);
        }
      }
    }
  };

  const handleHiddenDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setDisplayValue(formatForDisplay(newValue));
  };

  const openDatePicker = () => {
    if (hiddenInputRef.current && !disabled) {
      hiddenInputRef.current.showPicker();
    }
  };

  return (
    <div className="relative inline-flex items-center w-full">
      <input
        type="text"
        value={displayValue}
        onChange={handleDisplayChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`${className} pr-7`}
        dir="ltr"
        style={{ textAlign: 'left' }}
      />
      <button
        type="button"
        onClick={openDatePicker}
        disabled={disabled}
        className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary dark:hover:text-slate-300"
        title="فتح التقويم"
      >
        <Calendar size={14} />
      </button>
      <input
        ref={hiddenInputRef}
        type="date"
        value={value}
        onChange={handleHiddenDateChange}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        tabIndex={-1}
      />
    </div>
  );
};

export default DateInput;
