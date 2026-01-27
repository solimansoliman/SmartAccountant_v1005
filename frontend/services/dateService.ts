// خدمة تنسيق التاريخ والوقت
// التنسيق الموحد حسب الإعدادات: DD-MM-YYYY أو MM-DD-YYYY أو YYYY-MM-DD
// نمط العرض: رقمي (27-01-2026) أو عربي نصي (٢٧ يناير ٢٠٢٦)
// الوقت: 24 ساعة أو 12 ساعة (ص/م)

import { getAppSettings } from './storageService';

type DateFormatType = 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD';
type TimeFormatType = '24h' | '12h';
type DateDisplayStyleType = 'numeric' | 'arabic';

// الحصول على إعدادات التنسيق الحالية
const getDateFormatSettings = (): { dateFormat: DateFormatType; timeFormat: TimeFormatType; dateDisplayStyle: DateDisplayStyleType } => {
  try {
    const settings = getAppSettings();
    return {
      dateFormat: settings.dateFormat || 'DD-MM-YYYY',
      timeFormat: settings.timeFormat || '24h',
      dateDisplayStyle: settings.dateDisplayStyle || 'numeric'
    };
  } catch {
    return { dateFormat: 'DD-MM-YYYY', timeFormat: '24h', dateDisplayStyle: 'numeric' };
  }
};

/**
 * تنسيق التاريخ بالعربي النصي
 */
const formatDateArabicStyle = (date: Date): string => {
  return date.toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * تنسيق التاريخ رقمياً حسب الإعدادات
 */
const formatDateBySettings = (date: Date, format: DateFormatType): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  switch (format) {
    case 'DD-MM-YYYY':
      return `${day}-${month}-${year}`;
    case 'MM-DD-YYYY':
      return `${month}-${day}-${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      return `${day}-${month}-${year}`;
  }
};

/**
 * تنسيق الوقت حسب الإعدادات
 */
const formatTimeBySettings = (date: Date, format: TimeFormatType): string => {
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  if (format === '12h') {
    const period = hours24 >= 12 ? 'م' : 'ص';
    const hours12 = hours24 % 12 || 12;
    return `${hours12}:${minutes} ${period}`;
  }
  
  return `${String(hours24).padStart(2, '0')}:${minutes}`;
};

/**
 * تنسيق التاريخ والوقت
 * @param dateString - نص التاريخ
 * @param includeTime - هل يتم تضمين الوقت (افتراضي: true)
 * @returns التاريخ منسق حسب الإعدادات
 */
export const formatDateTime = (dateString: string | Date | null | undefined, includeTime: boolean = true): string => {
  if (!dateString) return '-';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return String(dateString);
    
    const { dateFormat, timeFormat, dateDisplayStyle } = getDateFormatSettings();
    
    // اختيار نمط العرض: عربي نصي أو رقمي
    const formattedDate = dateDisplayStyle === 'arabic' 
      ? formatDateArabicStyle(date) 
      : formatDateBySettings(date, dateFormat);
    
    if (!includeTime) {
      return formattedDate;
    }
    
    const formattedTime = formatTimeBySettings(date, timeFormat);
    return `${formattedDate} ${formattedTime}`;
  } catch {
    return String(dateString);
  }
};

/**
 * تنسيق التاريخ فقط (بدون الوقت)
 * @param dateString - نص التاريخ
 * @returns التاريخ منسق
 */
export const formatDate = (dateString: string | Date | null | undefined): string => {
  return formatDateTime(dateString, false);
};

/**
 * تنسيق الوقت فقط
 * @param dateString - نص التاريخ
 * @returns الوقت منسق حسب الإعدادات
 */
export const formatTime = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '-';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return String(dateString);
    
    const { timeFormat } = getDateFormatSettings();
    return formatTimeBySettings(date, timeFormat);
  } catch {
    return String(dateString);
  }
};

/**
 * تنسيق التاريخ بالعربي
 * @param dateString - نص التاريخ
 * @returns التاريخ منسق بالعربي
 */
export const formatDateArabic = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '-';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return String(dateString);
    
    return date.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return String(dateString);
  }
};

/**
 * الحصول على التاريخ الحالي بالتنسيق المناسب للحقول
 * @returns التاريخ الحالي بصيغة DD-MM-YYYY للعرض
 */
export const getTodayDateString = (): string => {
  const today = new Date();
  return formatDate(today);
};

/**
 * الحصول على التاريخ بصيغة YYYY-MM-DD لحقول الإدخال من نوع date
 * @param date - كائن التاريخ (افتراضي: اليوم)
 * @returns التاريخ بصيغة YYYY-MM-DD
 */
export const getDateInputValue = (date?: Date | null): string => {
  const d = date || new Date();
  if (!d || isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * تحويل التاريخ من صيغة YYYY-MM-DD إلى DD-MM-YYYY للعرض
 * @param dateString - التاريخ بصيغة YYYY-MM-DD
 * @returns التاريخ بصيغة DD-MM-YYYY
 */
export const displayDateFromInput = (dateString: string): string => {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateString;
};
