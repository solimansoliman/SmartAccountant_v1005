-- تحديث أوقات الفواتير الموجودة
-- يضيف وقت عشوائي للفواتير التي لها وقت 00:00:00

USE SmartAccountant_v1005_DB;
GO

-- عرض الفواتير الحالية قبل التحديث
SELECT Id, InvoiceNumber, InvoiceDate, CreatedAt 
FROM Invoices 
ORDER BY Id;
GO

-- تحديث الفواتير بوقت CreatedAt إذا كان متوفراً
UPDATE Invoices
SET InvoiceDate = DATEADD(
    SECOND,
    DATEPART(SECOND, CreatedAt),
    DATEADD(
        MINUTE, 
        DATEPART(MINUTE, CreatedAt),
        DATEADD(
            HOUR, 
            DATEPART(HOUR, CreatedAt),
            InvoiceDate
        )
    )
)
WHERE DATEPART(HOUR, InvoiceDate) = 0 
  AND DATEPART(MINUTE, InvoiceDate) = 0
  AND CreatedAt IS NOT NULL;

-- عرض الفواتير بعد التحديث
SELECT Id, InvoiceNumber, InvoiceDate, CreatedAt 
FROM Invoices 
ORDER BY Id;
GO

PRINT 'تم تحديث أوقات الفواتير بنجاح';
GO
