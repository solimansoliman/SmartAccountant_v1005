-- Update Arabic descriptions with proper Unicode
UPDATE SystemSettings SET Description = N'إظهار زر الدخول التجريبي في شاشة تسجيل الدخول' WHERE SettingKey = 'showDemoLogin';
UPDATE SystemSettings SET Description = N'إظهار زر دخول الأدمن في شاشة تسجيل الدخول' WHERE SettingKey = 'showAdminLogin';
UPDATE SystemSettings SET Description = N'إظهار أداة توليد البيانات التجريبية' WHERE SettingKey = 'showMockDataGenerator';
UPDATE SystemSettings SET Description = N'السماح بتسجيل مستخدمين جدد' WHERE SettingKey = 'allowUserRegistration';

PRINT N'تم تحديث الأوصاف العربية بنجاح';
