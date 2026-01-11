-- =============================================
-- إضافة إعدادات التحديث التلقائي والمزامنة
-- =============================================

-- التحقق من عدم وجود الإعدادات مسبقاً قبل الإضافة
IF NOT EXISTS (SELECT 1 FROM SystemSettings WHERE SettingKey = 'allowAutoRefresh' AND AccountId IS NULL)
BEGIN
    INSERT INTO SystemSettings (AccountId, SettingKey, SettingValue, SettingType, [Description], IsPublic)
    VALUES (NULL, N'allowAutoRefresh', N'true', N'bool', N'تفعيل التحديث التلقائي للبيانات', 1);
    PRINT N'تم إضافة إعداد allowAutoRefresh';
END

IF NOT EXISTS (SELECT 1 FROM SystemSettings WHERE SettingKey = 'autoRefreshInterval' AND AccountId IS NULL)
BEGIN
    INSERT INTO SystemSettings (AccountId, SettingKey, SettingValue, SettingType, [Description], IsPublic)
    VALUES (NULL, N'autoRefreshInterval', N'30', N'int', N'فترة التحديث التلقائي بالثواني', 1);
    PRINT N'تم إضافة إعداد autoRefreshInterval';
END

IF NOT EXISTS (SELECT 1 FROM SystemSettings WHERE SettingKey = 'syncDuration' AND AccountId IS NULL)
BEGIN
    INSERT INTO SystemSettings (AccountId, SettingKey, SettingValue, SettingType, [Description], IsPublic)
    VALUES (NULL, N'syncDuration', N'1500', N'int', N'مدة عملية المزامنة بالمللي ثانية', 1);
    PRINT N'تم إضافة إعداد syncDuration';
END

-- عرض الإعدادات المضافة
SELECT SettingKey, SettingValue, SettingType, [Description], IsPublic
FROM SystemSettings 
WHERE SettingKey IN ('allowAutoRefresh', 'autoRefreshInterval', 'syncDuration')
ORDER BY SettingKey;

PRINT N'';
PRINT N'تم إضافة إعدادات التحديث التلقائي والمزامنة بنجاح!';
GO
