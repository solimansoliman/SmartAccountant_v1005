/**
 * خدمة تنسيق أسماء الملفات للطباعة والحفظ
 * File Name Formatting Service for Print & Save
 */

import { getSystemPermissions } from './storageService';

export interface FileNameOptions {
  appName?: string;        // اسم التطبيق
  companyName?: string;    // اسم الشركة
  type?: string;           // نوع المستند (فاتورة، كشف حساب، تقرير)
  customerName?: string;   // اسم العميل
  invoiceNumber?: string;  // رقم الفاتورة
  customText?: string;     // نص مخصص
}

/**
 * تنسيق التاريخ والوقت للملف
 */
const formatDateTimeForFile = (): { date: string; time: string; datetime: string } => {
  const now = new Date();
  
  const date = now.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-');
  
  const time = now.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(/:/g, '-');
  
  return {
    date,
    time,
    datetime: `${date}_${time}`
  };
};

/**
 * تنظيف اسم الملف من الأحرف غير المسموحة
 */
const sanitizeFileName = (name: string): string => {
  return name
    .replace(/[<>:"/\\|?*]/g, '') // إزالة الأحرف غير المسموحة
    .replace(/\s+/g, '_')         // استبدال المسافات بشرطة سفلية
    .trim();
};

/**
 * توليد اسم الملف بناءً على التنسيق المحدد
 */
export const generateFileName = (options: FileNameOptions): string => {
  const permissions = getSystemPermissions();
  const format = permissions.fileNameFormat || '{app}-{company}-{type}-{customer}-{date}';
  
  const { date, time, datetime } = formatDateTimeForFile();
  
  // القيم الافتراضية
  const values: Record<string, string> = {
    app: options.appName || 'المحاسب_الذكي',
    company: options.companyName || 'شركة',
    type: options.type || 'مستند',
    customer: options.customerName || '',
    invoice: options.invoiceNumber || '',
    date: date,
    time: time,
    datetime: datetime,
    custom: options.customText || ''
  };
  
  // استبدال المتغيرات في التنسيق
  let fileName = format;
  Object.entries(values).forEach(([key, value]) => {
    fileName = fileName.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  
  // تنظيف الاسم وإزالة الشرطات المتكررة
  fileName = sanitizeFileName(fileName)
    .replace(/-{2,}/g, '-')  // إزالة الشرطات المتكررة
    .replace(/^-|-$/g, '');   // إزالة الشرطات من البداية والنهاية
  
  return fileName;
};

/**
 * توليد اسم ملف للفاتورة
 */
export const generateInvoiceFileName = (
  companyName: string,
  customerName: string,
  invoiceNumber?: string
): string => {
  return generateFileName({
    appName: 'المحاسب_الذكي',
    companyName,
    type: 'فاتورة',
    customerName: customerName || 'نقدي',
    invoiceNumber
  });
};

/**
 * توليد اسم ملف لكشف الحساب
 */
export const generateStatementFileName = (
  companyName: string,
  customerName: string
): string => {
  return generateFileName({
    appName: 'المحاسب_الذكي',
    companyName,
    type: 'كشف_حساب',
    customerName
  });
};

/**
 * توليد اسم ملف للتقارير
 */
export const generateReportFileName = (
  companyName: string,
  reportType: string
): string => {
  return generateFileName({
    appName: 'المحاسب_الذكي',
    companyName,
    type: reportType,
    customerName: ''
  });
};

/**
 * تعيين عنوان الصفحة للطباعة (يظهر كاسم الملف عند حفظ PDF)
 */
export const setDocumentTitleForPrint = (fileName: string): string => {
  const originalTitle = document.title;
  document.title = fileName;
  return originalTitle;
};

/**
 * استعادة عنوان الصفحة الأصلي بعد الطباعة
 */
export const restoreDocumentTitle = (originalTitle: string): void => {
  document.title = originalTitle;
};

/**
 * طباعة مع تعيين اسم الملف تلقائياً
 */
export const printWithFileName = (options: FileNameOptions): void => {
  const fileName = generateFileName(options);
  const originalTitle = setDocumentTitleForPrint(fileName);
  
  // انتظار قليل ثم الطباعة
  setTimeout(() => {
    window.print();
    // استعادة العنوان بعد الطباعة
    setTimeout(() => {
      restoreDocumentTitle(originalTitle);
    }, 1000);
  }, 100);
};

// التنسيقات المتاحة للاختيار
export const FILE_NAME_FORMATS = [
  { value: '{app}-{company}-{type}-{customer}-{date}', label: 'التطبيق - الشركة - النوع - العميل - التاريخ' },
  { value: '{company}-{type}-{customer}-{datetime}', label: 'الشركة - النوع - العميل - التاريخ والوقت' },
  { value: '{type}-{customer}-{date}', label: 'النوع - العميل - التاريخ' },
  { value: '{company}-{customer}-{type}-{date}', label: 'الشركة - العميل - النوع - التاريخ' },
  { value: '{app}-{type}-{invoice}-{date}', label: 'التطبيق - النوع - رقم الفاتورة - التاريخ' },
  { value: '{company}-{type}-{date}-{time}', label: 'الشركة - النوع - التاريخ - الوقت' },
];

export default {
  generateFileName,
  generateInvoiceFileName,
  generateStatementFileName,
  generateReportFileName,
  setDocumentTitleForPrint,
  restoreDocumentTitle,
  printWithFileName,
  FILE_NAME_FORMATS
};

