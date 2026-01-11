-- =============================================
-- جدول الاشتراكات
-- يتتبع اشتراكات الحسابات في الخطط المختلفة
-- =============================================

USE SmartAccountant_v1005_DB;
GO

-- إضافة حقل PlanId لجدول الحسابات
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Accounts') AND name = 'PlanId')
BEGIN
    ALTER TABLE Accounts ADD PlanId INT NULL;
    PRINT 'Added PlanId column to Accounts table';
END
GO

-- إضافة FK للخطط
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Accounts_Plans')
BEGIN
    ALTER TABLE Accounts ADD CONSTRAINT FK_Accounts_Plans FOREIGN KEY (PlanId) REFERENCES Plans(Id);
    PRINT 'Added FK_Accounts_Plans constraint';
END
GO

-- تحديث الحسابات الموجودة لتكون على الخطة المجانية
UPDATE Accounts SET PlanId = 1 WHERE PlanId IS NULL;
GO

-- إنشاء جدول الاشتراكات
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Subscriptions')
BEGIN
    CREATE TABLE Subscriptions (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        AccountId INT NOT NULL,
        PlanId INT NOT NULL,
        
        -- تواريخ الاشتراك
        StartDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        EndDate DATETIME2 NOT NULL,
        
        -- حالة الاشتراك
        Status NVARCHAR(50) NOT NULL DEFAULT 'active', -- active, expired, cancelled, pending
        
        -- نوع الاشتراك (شهري/سنوي)
        BillingCycle NVARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, yearly
        
        -- السعر المدفوع
        Amount DECIMAL(18,2) NOT NULL,
        Currency NVARCHAR(10) NOT NULL DEFAULT N'ج.م',
        
        -- معلومات الدفع
        PaymentMethod NVARCHAR(50) NULL, -- credit_card, bank_transfer, cash, paypal
        PaymentReference NVARCHAR(200) NULL,
        InvoiceNumber NVARCHAR(50) NULL,
        
        -- الترقية/التخفيض
        PreviousPlanId INT NULL,
        UpgradedFromSubscriptionId INT NULL,
        
        -- تجديد تلقائي
        AutoRenew BIT NOT NULL DEFAULT 1,
        RenewalReminderSent BIT NOT NULL DEFAULT 0,
        
        -- ملاحظات
        Notes NVARCHAR(500) NULL,
        CancelReason NVARCHAR(500) NULL,
        CancelledAt DATETIME2 NULL,
        CancelledByUserId INT NULL,
        
        -- التتبع
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedByUserId INT NULL,
        UpdatedAt DATETIME2 NULL,
        
        -- العلاقات
        CONSTRAINT FK_Subscriptions_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id) ON DELETE CASCADE,
        CONSTRAINT FK_Subscriptions_Plans FOREIGN KEY (PlanId) REFERENCES Plans(Id),
        CONSTRAINT FK_Subscriptions_PreviousPlan FOREIGN KEY (PreviousPlanId) REFERENCES Plans(Id)
    );
    
    -- إنشاء الفهارس
    CREATE INDEX IX_Subscriptions_AccountId ON Subscriptions(AccountId);
    CREATE INDEX IX_Subscriptions_PlanId ON Subscriptions(PlanId);
    CREATE INDEX IX_Subscriptions_Status ON Subscriptions(Status);
    CREATE INDEX IX_Subscriptions_EndDate ON Subscriptions(EndDate);
    
    PRINT 'Created Subscriptions table';
END
GO

-- إدراج اشتراكات افتراضية للحسابات الموجودة (على الخطة المجانية)
IF NOT EXISTS (SELECT TOP 1 * FROM Subscriptions)
BEGIN
    INSERT INTO Subscriptions (AccountId, PlanId, StartDate, EndDate, Status, BillingCycle, Amount, Currency, AutoRenew, Notes)
    SELECT 
        a.Id,
        ISNULL(a.PlanId, 1), -- الخطة المجانية
        GETUTCDATE(),
        DATEADD(YEAR, 100, GETUTCDATE()), -- الخطة المجانية لا تنتهي
        'active',
        'monthly',
        0,
        N'ج.م',
        0, -- لا تجديد تلقائي للمجانية
        N'اشتراك افتراضي مجاني'
    FROM Accounts a
    WHERE NOT EXISTS (SELECT 1 FROM Subscriptions s WHERE s.AccountId = a.Id);
    
    PRINT 'Created default subscriptions for existing accounts';
END
GO

-- إضافة صلاحيات الاشتراكات
IF NOT EXISTS (SELECT * FROM Permissions WHERE Module = 'subscriptions')
BEGIN
    INSERT INTO Permissions (Code, Name, NameEn, Module, [Type], [Description], SortOrder)
    VALUES 
    (N'subscriptions.view', N'عرض الاشتراكات', N'View Subscriptions', N'subscriptions', 0, N'عرض قائمة الاشتراكات', 150),
    (N'subscriptions.create', N'إنشاء اشتراك', N'Create Subscription', N'subscriptions', 1, N'إنشاء اشتراك جديد', 151),
    (N'subscriptions.edit', N'تعديل اشتراك', N'Edit Subscription', N'subscriptions', 2, N'تعديل الاشتراكات', 152),
    (N'subscriptions.cancel', N'إلغاء اشتراك', N'Cancel Subscription', N'subscriptions', 3, N'إلغاء الاشتراكات', 153);
    
    PRINT 'Added subscriptions permissions';
END
GO

-- عرض Stored Procedure للحصول على استخدام الحساب مقارنة بالخطة
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetAccountUsage')
    DROP PROCEDURE sp_GetAccountUsage;
GO

CREATE PROCEDURE sp_GetAccountUsage
    @AccountId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @PlanId INT;
    SELECT @PlanId = PlanId FROM Accounts WHERE Id = @AccountId;
    
    SELECT 
        a.Id AS AccountId,
        a.Name AS AccountName,
        p.Name AS PlanName,
        p.NameEn AS PlanNameEn,
        
        -- الاستخدام الحالي
        (SELECT COUNT(*) FROM Users WHERE AccountId = @AccountId AND IsActive = 1) AS CurrentUsers,
        (SELECT COUNT(*) FROM Invoices WHERE AccountId = @AccountId AND MONTH(InvoiceDate) = MONTH(GETDATE()) AND YEAR(InvoiceDate) = YEAR(GETDATE())) AS CurrentMonthInvoices,
        (SELECT COUNT(*) FROM Customers WHERE AccountId = @AccountId) AS CurrentCustomers,
        (SELECT COUNT(*) FROM Products WHERE AccountId = @AccountId) AS CurrentProducts,
        
        -- حدود الخطة
        p.MaxUsers,
        p.MaxInvoices,
        p.MaxCustomers,
        p.MaxProducts,
        
        -- ميزات الخطة
        p.HasBasicReports,
        p.HasAdvancedReports,
        p.HasEmailSupport,
        p.HasPrioritySupport,
        p.HasDedicatedManager,
        p.HasBackup,
        p.BackupFrequency,
        p.HasCustomInvoices,
        p.HasMultiCurrency,
        p.HasApiAccess,
        p.HasWhiteLabel,
        
        -- معلومات الاشتراك
        s.StartDate AS SubscriptionStart,
        s.EndDate AS SubscriptionEnd,
        s.Status AS SubscriptionStatus,
        s.AutoRenew,
        DATEDIFF(DAY, GETUTCDATE(), s.EndDate) AS DaysRemaining
        
    FROM Accounts a
    LEFT JOIN Plans p ON a.PlanId = p.Id
    LEFT JOIN Subscriptions s ON s.AccountId = a.Id AND s.Status = 'active'
    WHERE a.Id = @AccountId;
END
GO

PRINT 'Created sp_GetAccountUsage stored procedure';
GO
