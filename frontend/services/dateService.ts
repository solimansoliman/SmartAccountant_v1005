// خدمة تنسيق التاريخ والوقت
// التنسيق الموحد: 08-01-2026 12:30 (يوم-شهر-سنة)

/**
 * تنسيق التاريخ والوقت
 * @param dateString - نص التاريخ
 * @param includeTime - هل يتم تضمين الوقت (افتراضي: true)
 * @returns التاريخ منسق بصيغة يوم-شهر-سنة
 */
export const formatDateTime = (dateString: string | Date | null | undefined, includeTime: boolean = true): string => {
  if (!dateString) return '-';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return String(dateString);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    if (!includeTime) {
      return `${day}-${month}-${year}`;
    }
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}-${month}-${year} ${hours}:${minutes}`;
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
 * @returns الوقت منسق
 */
export const formatTime = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '-';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return String(dateString);
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
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
