// تحويل invoiceType من string إلى رقم
const invoiceData = {
  invoice: {
    // ...بيانات الفاتورة...
    invoiceType: 0, // 0 = Sales, 1 = Purchase (حسب الـ enum في الـ API)
  }
};

// أو إذا كان invoiceType string:
const invoiceTypeMap: Record<string, number> = {
  'sales': 0,
  'purchase': 1
};

const data = {
  invoice: {
    ...formData,
    invoiceType: invoiceTypeMap[formData.invoiceType] ?? 0
  }
};
