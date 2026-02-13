using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using SmartAccountant.API.Data;
using SmartAccountant.API.Services;
using System.Text.Json.Serialization;
using System.Text;

// Fix Arabic encoding
Console.OutputEncoding = Encoding.UTF8;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.WriteIndented = false;
        // ✅ جعل الأحرف العربية قابلة للقراءة بدلاً من escape sequences
        options.JsonSerializerOptions.Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// Database - Using SQL Server
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
        .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

// Activity Log Service
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IActivityLogService, ActivityLogService>();
builder.Services.AddScoped<ICustomerInputLimitsService, CustomerInputLimitsService>();

// ✅ JWT Service - للمصادقة الآمنة
builder.Services.AddScoped<IJwtService, JwtService>();

// ✅ JWT Authentication - تأمين حقيقي
var jwtSettings = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSettings["Key"] ?? throw new InvalidOperationException("JWT Key is not configured!");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero // لا تسامح في انتهاء الصلاحية
    };
    
    // للتعامل مع أخطاء المصادقة
    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            if (context.Exception.GetType() == typeof(SecurityTokenExpiredException))
            {
                context.Response.Headers.Append("Token-Expired", "true");
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// ✅ CORS - محسّن للأمان
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            // في بيئة التطوير - السماح للـ localhost فقط
            policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:4173",
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:3002",
                "http://localhost:3003",
                "http://localhost:3004",
                "http://localhost:3005",
                "http://localhost:3006",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:4173",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3001",
                "http://127.0.0.1:3002",
                "http://127.0.0.1:3003",
                "http://127.0.0.1:3004",
                "http://127.0.0.1:3005",
                "http://127.0.0.1:3006",
                "http://192.168.137.1:4173",
                "http://192.168.137.1:3000",
                "http://192.168.137.1:3001",
                "http://192.168.137.1:3002",
                "http://192.168.137.1:3003",
                "http://192.168.137.1:3004",
                "http://192.168.137.1:3005",
                "http://192.168.137.1:3006"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
        }
        else
        {
            // في بيئة الإنتاج - دومينات محددة فقط من الإعدادات
            var allowedOrigins = builder.Configuration
                .GetSection("AllowedOrigins")
                .Get<string[]>() ?? Array.Empty<string>();
            
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// ✅ Security Headers - حماية إضافية
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");

// ✅ Authentication & Authorization - ترتيب مهم!
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Initialize Database and Seed data
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    try
    {
        logger.LogInformation("Initializing database...");
        
        // Create tables manually with raw SQL to avoid FK constraint issues
        logger.LogInformation("Creating database tables via raw SQL...");
        try
        {
            // Create tables directly with raw SQL for minimal schema
            await context.Database.ExecuteSqlRawAsync(@"
                IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Currencies')
                CREATE TABLE [Currencies] (
                    [Id] INT IDENTITY(1,1) PRIMARY KEY,
                    [Code] NVARCHAR(10) NOT NULL UNIQUE,
                    [Name] NVARCHAR(100) NOT NULL,
                        [NameEn] NVARCHAR(100) NULL,
                        [Symbol] NVARCHAR(10) NOT NULL,
                        [SubUnit] NVARCHAR(50) NULL,
                        [Country] NVARCHAR(100) NULL,
                        [CountryCode] NVARCHAR(5) NULL,
                        [Flag] NVARCHAR(20) NULL,
                        [ExchangeRate] DECIMAL(18,6) DEFAULT 1,
                        [DecimalPlaces] INT DEFAULT 2,
                        [IsActive] BIT DEFAULT 1,
                        [IsDefault] BIT DEFAULT 0,
                        [CreatedAt] DATETIME2 DEFAULT GETUTCDATE()
                    );

                    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Accounts')
                    CREATE TABLE [Accounts] (
                        [Id] INT IDENTITY(1,1) PRIMARY KEY,
                        [Name] NVARCHAR(200) NOT NULL,
                        [NameEn] NVARCHAR(200) NULL,
                        [Email] NVARCHAR(200) NULL,
                        [Phone] NVARCHAR(50) NULL,
                        [Address] NVARCHAR(500) NULL,
                        [City] NVARCHAR(100) NULL,
                        [State] NVARCHAR(100) NULL,
                        [ZipCode] NVARCHAR(20) NULL,
                        [LogoUrl] NVARCHAR(500) NULL,
                        [CurrencySymbol] NVARCHAR(10) NULL,
                        [CurrencyId] INT NULL,
                        [TaxNumber] NVARCHAR(50) NULL,
                        [TaxId] NVARCHAR(50) NULL,
                        [IsActive] BIT DEFAULT 1,
                        [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
                        [UpdatedAt] DATETIME2 NULL,
                        [SubscriptionExpiry] DATETIME2 NULL,
                        [Plan] INT DEFAULT 0,
                        [PlanId] INT NULL,
                        [MaxMessageLength] INT DEFAULT 1000,
                        [MaxNotificationLength] INT DEFAULT 500,
                        [LastDataExportDate] DATETIME2 NULL,
                        [ScheduledDeletionDate] DATETIME2 NULL,
                        [ConsentGiven] BIT DEFAULT 0,
                        CONSTRAINT [FK_Accounts_Currencies] FOREIGN KEY ([CurrencyId]) REFERENCES [Currencies]([Id]) ON DELETE SET NULL
                    );

                    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Users')
                    CREATE TABLE [Users] (
                        [Id] INT IDENTITY(1,1) PRIMARY KEY,
                        [AccountId] INT NOT NULL,
                        [Username] NVARCHAR(50) NOT NULL,
                        [PasswordHash] NVARCHAR(500) NOT NULL,
                        [FullName] NVARCHAR(100) NOT NULL,
                        [Email] NVARCHAR(100) NULL,
                        [Phone] NVARCHAR(20) NULL,
                        [AvatarUrl] NVARCHAR(500) NULL,
                        [RoleType] INT DEFAULT 0,
                        [IsSuperAdmin] BIT DEFAULT 0,
                        [IsActive] BIT DEFAULT 1,
                        [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
                        [LastLoginAt] DATETIME2 NULL,
                        [LastLoginIp] NVARCHAR(50) NULL,
                        [FailedLoginAttempts] INT DEFAULT 0,
                        [LockoutEnd] DATETIME2 NULL,
                        [Department] NVARCHAR(100) NULL,
                        [JobTitle] NVARCHAR(100) NULL,
                        [EmailVerified] BIT DEFAULT 0,
                        [PhoneVerified] BIT DEFAULT 0,
                        [PreferredLanguage] NVARCHAR(10) DEFAULT 'ar',
                        [TimeZone] NVARCHAR(100) DEFAULT 'UTC',
                        [MaxMessageLength] INT DEFAULT 1000,
                        [MaxNotificationLength] INT DEFAULT 500,
                        [CanCreateInvoices] BIT DEFAULT 0,
                        [CanManageCustomers] BIT DEFAULT 0,
                        [CanManageProducts] BIT DEFAULT 0,
                        [CanManageExpenses] BIT DEFAULT 0,
                        [CanViewReports] BIT DEFAULT 0,
                        [CanManageSettings] BIT DEFAULT 0,
                        [CanManageUsers] BIT DEFAULT 0,
                        CONSTRAINT [FK_Users_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]) ON DELETE NO ACTION,
                        CONSTRAINT [UQ_Users_Username_Account] UNIQUE ([AccountId], [Username])
                    );

                    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SystemSettings')
                    CREATE TABLE [SystemSettings] (
                        [Id] INT IDENTITY(1,1) PRIMARY KEY,
                        [AccountId] INT NULL,
                        [SettingKey] NVARCHAR(200) NOT NULL,
                        [SettingValue] NVARCHAR(MAX) NULL,
                        [SettingType] NVARCHAR(50) NULL,
                        [Description] NVARCHAR(500) NULL,
                        [IsPublic] BIT DEFAULT 0,
                        [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
                        [UpdatedAt] DATETIME2 NULL,
                        CONSTRAINT [FK_SystemSettings_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]) ON DELETE CASCADE,
                        CONSTRAINT [UQ_SystemSettings] UNIQUE ([AccountId], [SettingKey])
                    );
                ");
                
                logger.LogInformation("Essential tables created successfully");
        }
        catch (Exception ex)
        {
            logger.LogWarning($"Table creation via raw SQL encountered an issue: {ex.Message}");
        }

        // Runtime schema compatibility patch (legacy DBs)
        try
        {
            logger.LogInformation("Applying runtime schema compatibility patch...");

            await context.Database.ExecuteSqlRawAsync(@"
                -- ============================
                -- PhoneNumbers compatibility
                -- ============================
                IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PhoneNumbers')
                BEGIN
                    CREATE TABLE [PhoneNumbers] (
                        [Id] INT IDENTITY(1,1) PRIMARY KEY,
                        [AccountId] INT NOT NULL,
                        [EntityType] NVARCHAR(50) NOT NULL,
                        [EntityId] INT NOT NULL,
                        [PhoneNumber] NVARCHAR(30) NOT NULL,
                        [CountryCode] NVARCHAR(5) NULL,
                        [PhoneType] NVARCHAR(20) NOT NULL DEFAULT 'mobile',
                        [Label] NVARCHAR(50) NULL,
                        [IsPrimary] BIT NOT NULL DEFAULT 0,
                        [IsVerified] BIT NOT NULL DEFAULT 0,
                        [VerifiedAt] DATETIME2 NULL,
                        [IsWhatsApp] BIT NOT NULL DEFAULT 0,
                        [IsTelegram] BIT NOT NULL DEFAULT 0,
                        [CanReceiveSMS] BIT NOT NULL DEFAULT 1,
                        [CanReceiveCalls] BIT NOT NULL DEFAULT 1,
                        [Notes] NVARCHAR(500) NULL,
                        [IsActive] BIT NOT NULL DEFAULT 1,
                        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        [UpdatedAt] DATETIME2 NULL,
                        [CreatedByUserId] INT NULL
                    );
                END
                ELSE
                BEGIN
                    IF COL_LENGTH('PhoneNumbers', 'Phone') IS NULL
                    BEGIN
                        ALTER TABLE [PhoneNumbers] ADD [Phone] NVARCHAR(30) NULL;
                    END

                    IF COL_LENGTH('PhoneNumbers', 'PhoneNumber') IS NULL
                    BEGIN
                        ALTER TABLE [PhoneNumbers] ADD [PhoneNumber] NVARCHAR(30) NULL;
                    END

                    IF COL_LENGTH('PhoneNumbers', 'Phone') IS NOT NULL AND COL_LENGTH('PhoneNumbers', 'PhoneNumber') IS NOT NULL
                    BEGIN
                        UPDATE [PhoneNumbers]
                        SET [PhoneNumber] = [Phone]
                        WHERE [PhoneNumber] IS NULL AND [Phone] IS NOT NULL;

                        UPDATE [PhoneNumbers]
                        SET [Phone] = [PhoneNumber]
                        WHERE [Phone] IS NULL AND [PhoneNumber] IS NOT NULL;
                    END

                    IF EXISTS (
                        SELECT 1
                        FROM sys.columns
                        WHERE object_id = OBJECT_ID('PhoneNumbers')
                          AND name = 'Phone'
                          AND is_nullable = 0
                    )
                    BEGIN
                        ALTER TABLE [PhoneNumbers] ALTER COLUMN [Phone] NVARCHAR(30) NULL;
                    END

                    IF COL_LENGTH('PhoneNumbers', 'CountryCode') IS NULL ALTER TABLE [PhoneNumbers] ADD [CountryCode] NVARCHAR(5) NULL;
                    IF COL_LENGTH('PhoneNumbers', 'Label') IS NULL ALTER TABLE [PhoneNumbers] ADD [Label] NVARCHAR(50) NULL;
                    IF COL_LENGTH('PhoneNumbers', 'IsVerified') IS NULL ALTER TABLE [PhoneNumbers] ADD [IsVerified] BIT NOT NULL DEFAULT(0);
                    IF COL_LENGTH('PhoneNumbers', 'VerifiedAt') IS NULL ALTER TABLE [PhoneNumbers] ADD [VerifiedAt] DATETIME2 NULL;
                    IF COL_LENGTH('PhoneNumbers', 'IsWhatsApp') IS NULL ALTER TABLE [PhoneNumbers] ADD [IsWhatsApp] BIT NOT NULL DEFAULT(0);
                    IF COL_LENGTH('PhoneNumbers', 'IsTelegram') IS NULL ALTER TABLE [PhoneNumbers] ADD [IsTelegram] BIT NOT NULL DEFAULT(0);
                    IF COL_LENGTH('PhoneNumbers', 'CanReceiveSMS') IS NULL ALTER TABLE [PhoneNumbers] ADD [CanReceiveSMS] BIT NOT NULL DEFAULT(1);
                    IF COL_LENGTH('PhoneNumbers', 'CanReceiveCalls') IS NULL ALTER TABLE [PhoneNumbers] ADD [CanReceiveCalls] BIT NOT NULL DEFAULT(1);
                    IF COL_LENGTH('PhoneNumbers', 'Notes') IS NULL ALTER TABLE [PhoneNumbers] ADD [Notes] NVARCHAR(500) NULL;
                    IF COL_LENGTH('PhoneNumbers', 'UpdatedAt') IS NULL ALTER TABLE [PhoneNumbers] ADD [UpdatedAt] DATETIME2 NULL;
                END

                -- ============================
                -- Emails compatibility
                -- ============================
                IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Emails')
                BEGIN
                    CREATE TABLE [Emails] (
                        [Id] INT IDENTITY(1,1) PRIMARY KEY,
                        [AccountId] INT NOT NULL,
                        [EntityType] NVARCHAR(50) NOT NULL,
                        [EntityId] INT NOT NULL,
                        [EmailAddress] NVARCHAR(200) NOT NULL,
                        [EmailType] NVARCHAR(20) NOT NULL DEFAULT 'work',
                        [Label] NVARCHAR(50) NULL,
                        [IsPrimary] BIT NOT NULL DEFAULT 0,
                        [IsVerified] BIT NOT NULL DEFAULT 0,
                        [VerifiedAt] DATETIME2 NULL,
                        [VerificationToken] NVARCHAR(200) NULL,
                        [VerificationExpiry] DATETIME2 NULL,
                        [CanReceiveInvoices] BIT NOT NULL DEFAULT 1,
                        [CanReceiveMarketing] BIT NOT NULL DEFAULT 0,
                        [CanReceiveNotifications] BIT NOT NULL DEFAULT 1,
                        [UnsubscribedAt] DATETIME2 NULL,
                        [BounceCount] INT NOT NULL DEFAULT 0,
                        [LastBounceAt] DATETIME2 NULL,
                        [Notes] NVARCHAR(500) NULL,
                        [IsActive] BIT NOT NULL DEFAULT 1,
                        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        [UpdatedAt] DATETIME2 NULL,
                        [CreatedByUserId] INT NULL
                    );
                END
                ELSE
                BEGIN
                    IF COL_LENGTH('Emails', 'EmailAddress') IS NULL ALTER TABLE [Emails] ADD [EmailAddress] NVARCHAR(200) NULL;
                    IF COL_LENGTH('Emails', 'EmailType') IS NULL ALTER TABLE [Emails] ADD [EmailType] NVARCHAR(20) NOT NULL DEFAULT('work');
                    IF COL_LENGTH('Emails', 'Label') IS NULL ALTER TABLE [Emails] ADD [Label] NVARCHAR(50) NULL;
                    IF COL_LENGTH('Emails', 'IsPrimary') IS NULL ALTER TABLE [Emails] ADD [IsPrimary] BIT NOT NULL DEFAULT(0);
                    IF COL_LENGTH('Emails', 'IsVerified') IS NULL ALTER TABLE [Emails] ADD [IsVerified] BIT NOT NULL DEFAULT(0);
                    IF COL_LENGTH('Emails', 'VerifiedAt') IS NULL ALTER TABLE [Emails] ADD [VerifiedAt] DATETIME2 NULL;
                    IF COL_LENGTH('Emails', 'VerificationToken') IS NULL ALTER TABLE [Emails] ADD [VerificationToken] NVARCHAR(200) NULL;
                    IF COL_LENGTH('Emails', 'VerificationExpiry') IS NULL ALTER TABLE [Emails] ADD [VerificationExpiry] DATETIME2 NULL;
                    IF COL_LENGTH('Emails', 'CanReceiveInvoices') IS NULL ALTER TABLE [Emails] ADD [CanReceiveInvoices] BIT NOT NULL DEFAULT(1);
                    IF COL_LENGTH('Emails', 'CanReceiveMarketing') IS NULL ALTER TABLE [Emails] ADD [CanReceiveMarketing] BIT NOT NULL DEFAULT(0);
                    IF COL_LENGTH('Emails', 'CanReceiveNotifications') IS NULL ALTER TABLE [Emails] ADD [CanReceiveNotifications] BIT NOT NULL DEFAULT(1);
                    IF COL_LENGTH('Emails', 'UnsubscribedAt') IS NULL ALTER TABLE [Emails] ADD [UnsubscribedAt] DATETIME2 NULL;
                    IF COL_LENGTH('Emails', 'BounceCount') IS NULL ALTER TABLE [Emails] ADD [BounceCount] INT NOT NULL DEFAULT(0);
                    IF COL_LENGTH('Emails', 'LastBounceAt') IS NULL ALTER TABLE [Emails] ADD [LastBounceAt] DATETIME2 NULL;
                    IF COL_LENGTH('Emails', 'Notes') IS NULL ALTER TABLE [Emails] ADD [Notes] NVARCHAR(500) NULL;
                    IF COL_LENGTH('Emails', 'UpdatedAt') IS NULL ALTER TABLE [Emails] ADD [UpdatedAt] DATETIME2 NULL;
                    IF COL_LENGTH('Emails', 'CreatedByUserId') IS NULL ALTER TABLE [Emails] ADD [CreatedByUserId] INT NULL;
                END

                -- ============================
                -- Invoices compatibility
                -- ============================
                IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Invoices')
                BEGIN
                    CREATE TABLE [Invoices] (
                        [Id] INT IDENTITY(1,1) PRIMARY KEY,
                        [AccountId] INT NOT NULL,
                        [InvoiceNumber] NVARCHAR(50) NOT NULL,
                        [InvoiceType] INT NOT NULL DEFAULT 1,
                        [InvoiceDate] DATETIME2 NOT NULL,
                        [DueDate] DATETIME2 NULL,
                        [CustomerId] INT NULL,
                        [UserId] INT NULL,
                        [SubTotal] DECIMAL(18,2) NOT NULL DEFAULT 0,
                        [DiscountAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
                        [DiscountPercent] DECIMAL(5,2) NOT NULL DEFAULT 0,
                        [TaxAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
                        [TotalAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
                        [PaidAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
                        [PaymentMethod] INT NOT NULL DEFAULT 1,
                        [Status] INT NOT NULL DEFAULT 1,
                        [Notes] NVARCHAR(MAX) NULL,
                        [QrCode] NVARCHAR(MAX) NULL,
                        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        [UpdatedAt] DATETIME2 NULL,
                        [CreatedByUserId] INT NULL,
                        [UpdatedByUserId] INT NULL
                    );
                END
                ELSE
                BEGIN
                    IF COL_LENGTH('Invoices', 'InvoiceType') IS NULL ALTER TABLE [Invoices] ADD [InvoiceType] INT NOT NULL DEFAULT(1);
                    IF COL_LENGTH('Invoices', 'UserId') IS NULL ALTER TABLE [Invoices] ADD [UserId] INT NULL;
                    IF COL_LENGTH('Invoices', 'SubTotal') IS NULL ALTER TABLE [Invoices] ADD [SubTotal] DECIMAL(18,2) NOT NULL DEFAULT(0);
                    IF COL_LENGTH('Invoices', 'DiscountPercent') IS NULL ALTER TABLE [Invoices] ADD [DiscountPercent] DECIMAL(5,2) NOT NULL DEFAULT(0);
                    IF COL_LENGTH('Invoices', 'PaidAmount') IS NULL ALTER TABLE [Invoices] ADD [PaidAmount] DECIMAL(18,2) NOT NULL DEFAULT(0);
                    IF COL_LENGTH('Invoices', 'PaymentMethod') IS NULL ALTER TABLE [Invoices] ADD [PaymentMethod] INT NOT NULL DEFAULT(1);
                    IF COL_LENGTH('Invoices', 'QrCode') IS NULL ALTER TABLE [Invoices] ADD [QrCode] NVARCHAR(MAX) NULL;
                    IF COL_LENGTH('Invoices', 'UpdatedByUserId') IS NULL ALTER TABLE [Invoices] ADD [UpdatedByUserId] INT NULL;

                    IF COL_LENGTH('Invoices', 'Status') IS NULL ALTER TABLE [Invoices] ADD [Status] INT NOT NULL DEFAULT(1);

                    IF EXISTS (
                        SELECT 1
                        FROM sys.columns c
                        INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
                        WHERE c.object_id = OBJECT_ID('Invoices')
                          AND c.name = 'Status'
                          AND t.name IN ('nvarchar', 'varchar', 'nchar', 'char')
                    )
                    BEGIN
                        DECLARE @StatusDefaultConstraint NVARCHAR(128);
                        SELECT @StatusDefaultConstraint = dc.name
                        FROM sys.default_constraints dc
                        INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
                        WHERE dc.parent_object_id = OBJECT_ID('Invoices')
                          AND c.name = 'Status';

                        IF @StatusDefaultConstraint IS NOT NULL
                            EXEC('ALTER TABLE [Invoices] DROP CONSTRAINT [' + @StatusDefaultConstraint + ']');

                        UPDATE [Invoices]
                        SET [Status] =
                            CASE
                                WHEN TRY_CONVERT(INT, [Status]) IS NOT NULL THEN CONVERT(NVARCHAR(20), TRY_CONVERT(INT, [Status]))
                                WHEN UPPER(LTRIM(RTRIM(ISNULL([Status], '')))) = 'DRAFT' THEN '1'
                                WHEN UPPER(LTRIM(RTRIM(ISNULL([Status], '')))) = 'CONFIRMED' THEN '2'
                                WHEN UPPER(LTRIM(RTRIM(ISNULL([Status], '')))) = 'PAID' THEN '3'
                                WHEN UPPER(LTRIM(RTRIM(ISNULL([Status], '')))) IN ('PARTIALPAID', 'PARTIAL_PAID') THEN '4'
                                WHEN UPPER(LTRIM(RTRIM(ISNULL([Status], '')))) IN ('CANCELLED', 'CANCELED') THEN '5'
                                WHEN UPPER(LTRIM(RTRIM(ISNULL([Status], '')))) = 'REFUNDED' THEN '6'
                                ELSE '1'
                            END;

                        ALTER TABLE [Invoices] ALTER COLUMN [Status] INT NOT NULL;
                        ALTER TABLE [Invoices] ADD CONSTRAINT [DF_Invoices_Status] DEFAULT(1) FOR [Status];
                    END

                    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Invoices') AND name = 'Status' AND is_nullable = 1)
                    BEGIN
                        UPDATE [Invoices] SET [Status] = ISNULL([Status], 1);
                        ALTER TABLE [Invoices] ALTER COLUMN [Status] INT NOT NULL;
                    END

                    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Invoices') AND name = 'CustomerId' AND is_nullable = 0)
                    BEGIN
                        ALTER TABLE [Invoices] ALTER COLUMN [CustomerId] INT NULL;
                    END
                END

                -- ============================
                -- InvoiceItems compatibility
                -- ============================
                IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InvoiceItems')
                BEGIN
                    CREATE TABLE [InvoiceItems] (
                        [Id] INT IDENTITY(1,1) PRIMARY KEY,
                        [InvoiceId] INT NOT NULL,
                        [ProductId] INT NOT NULL,
                        [UnitId] INT NULL,
                        [ProductName] NVARCHAR(200) NOT NULL DEFAULT '',
                        [Quantity] DECIMAL(18,3) NOT NULL DEFAULT 0,
                        [UnitPrice] DECIMAL(18,2) NOT NULL DEFAULT 0,
                        [DiscountPercent] DECIMAL(5,2) NOT NULL DEFAULT 0,
                        [DiscountAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
                        [TaxPercent] DECIMAL(5,2) NOT NULL DEFAULT 0,
                        [TaxAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
                        [LineTotal] DECIMAL(18,2) NOT NULL DEFAULT 0,
                        [Notes] NVARCHAR(MAX) NULL
                    );
                END
                ELSE
                BEGIN
                    IF COL_LENGTH('InvoiceItems', 'ProductName') IS NULL ALTER TABLE [InvoiceItems] ADD [ProductName] NVARCHAR(200) NOT NULL DEFAULT('');
                    IF COL_LENGTH('InvoiceItems', 'UnitId') IS NULL ALTER TABLE [InvoiceItems] ADD [UnitId] INT NULL;
                    IF COL_LENGTH('InvoiceItems', 'DiscountPercent') IS NULL ALTER TABLE [InvoiceItems] ADD [DiscountPercent] DECIMAL(5,2) NOT NULL DEFAULT(0);
                    IF COL_LENGTH('InvoiceItems', 'DiscountAmount') IS NULL ALTER TABLE [InvoiceItems] ADD [DiscountAmount] DECIMAL(18,2) NOT NULL DEFAULT(0);
                    IF COL_LENGTH('InvoiceItems', 'TaxPercent') IS NULL ALTER TABLE [InvoiceItems] ADD [TaxPercent] DECIMAL(5,2) NOT NULL DEFAULT(0);
                    IF COL_LENGTH('InvoiceItems', 'TaxAmount') IS NULL ALTER TABLE [InvoiceItems] ADD [TaxAmount] DECIMAL(18,2) NOT NULL DEFAULT(0);
                    IF COL_LENGTH('InvoiceItems', 'LineTotal') IS NULL ALTER TABLE [InvoiceItems] ADD [LineTotal] DECIMAL(18,2) NOT NULL DEFAULT(0);
                    IF COL_LENGTH('InvoiceItems', 'Notes') IS NULL ALTER TABLE [InvoiceItems] ADD [Notes] NVARCHAR(MAX) NULL;
                END

                -- ============================
                -- Payments compatibility
                -- ============================
                IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Payments')
                BEGIN
                    CREATE TABLE [Payments] (
                        [Id] INT IDENTITY(1,1) PRIMARY KEY,
                        [AccountId] INT NOT NULL,
                        [PaymentNumber] NVARCHAR(50) NULL,
                        [PaymentType] NVARCHAR(50) NULL,
                        [InvoiceId] INT NULL,
                        [ExpenseId] INT NULL,
                        [CustomerId] INT NULL,
                        [Amount] DECIMAL(18,2) NOT NULL DEFAULT 0,
                        [CurrencyId] INT NULL,
                        [ExchangeRate] DECIMAL(18,2) NOT NULL DEFAULT 1,
                        [PaymentDate] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        [PaymentMethod] NVARCHAR(50) NOT NULL DEFAULT 'Cash',
                        [ReferenceNumber] NVARCHAR(100) NULL,
                        [BankName] NVARCHAR(100) NULL,
                        [CheckNumber] NVARCHAR(50) NULL,
                        [CheckDate] DATETIME2 NULL,
                        [Description] NVARCHAR(MAX) NULL,
                        [AttachmentUrl] NVARCHAR(MAX) NULL,
                        [Status] NVARCHAR(50) NULL,
                        [Notes] NVARCHAR(MAX) NULL,
                        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        [UpdatedAt] DATETIME2 NULL,
                        [CreatedByUserId] INT NULL
                    );
                END
                ELSE
                BEGIN
                    IF COL_LENGTH('Payments', 'AccountId') IS NULL ALTER TABLE [Payments] ADD [AccountId] INT NOT NULL DEFAULT(1);
                    IF COL_LENGTH('Payments', 'PaymentNumber') IS NULL ALTER TABLE [Payments] ADD [PaymentNumber] NVARCHAR(50) NULL;
                    IF COL_LENGTH('Payments', 'PaymentType') IS NULL ALTER TABLE [Payments] ADD [PaymentType] NVARCHAR(50) NULL;
                    IF COL_LENGTH('Payments', 'InvoiceId') IS NULL ALTER TABLE [Payments] ADD [InvoiceId] INT NULL;
                    IF COL_LENGTH('Payments', 'ExpenseId') IS NULL ALTER TABLE [Payments] ADD [ExpenseId] INT NULL;
                    IF COL_LENGTH('Payments', 'CustomerId') IS NULL ALTER TABLE [Payments] ADD [CustomerId] INT NULL;
                    IF COL_LENGTH('Payments', 'Amount') IS NULL ALTER TABLE [Payments] ADD [Amount] DECIMAL(18,2) NOT NULL DEFAULT(0);
                    IF COL_LENGTH('Payments', 'CurrencyId') IS NULL ALTER TABLE [Payments] ADD [CurrencyId] INT NULL;
                    IF COL_LENGTH('Payments', 'ExchangeRate') IS NULL ALTER TABLE [Payments] ADD [ExchangeRate] DECIMAL(18,2) NOT NULL DEFAULT(1);
                    IF COL_LENGTH('Payments', 'PaymentDate') IS NULL ALTER TABLE [Payments] ADD [PaymentDate] DATETIME2 NOT NULL DEFAULT(GETUTCDATE());
                    IF COL_LENGTH('Payments', 'PaymentMethod') IS NULL ALTER TABLE [Payments] ADD [PaymentMethod] NVARCHAR(50) NOT NULL DEFAULT('Cash');
                    IF COL_LENGTH('Payments', 'ReferenceNumber') IS NULL ALTER TABLE [Payments] ADD [ReferenceNumber] NVARCHAR(100) NULL;
                    IF COL_LENGTH('Payments', 'BankName') IS NULL ALTER TABLE [Payments] ADD [BankName] NVARCHAR(100) NULL;
                    IF COL_LENGTH('Payments', 'CheckNumber') IS NULL ALTER TABLE [Payments] ADD [CheckNumber] NVARCHAR(50) NULL;
                    IF COL_LENGTH('Payments', 'CheckDate') IS NULL ALTER TABLE [Payments] ADD [CheckDate] DATETIME2 NULL;
                    IF COL_LENGTH('Payments', 'Description') IS NULL ALTER TABLE [Payments] ADD [Description] NVARCHAR(MAX) NULL;
                    IF COL_LENGTH('Payments', 'AttachmentUrl') IS NULL ALTER TABLE [Payments] ADD [AttachmentUrl] NVARCHAR(MAX) NULL;
                    IF COL_LENGTH('Payments', 'Status') IS NULL ALTER TABLE [Payments] ADD [Status] NVARCHAR(50) NULL;
                    IF COL_LENGTH('Payments', 'Notes') IS NULL ALTER TABLE [Payments] ADD [Notes] NVARCHAR(MAX) NULL;
                    IF COL_LENGTH('Payments', 'CreatedAt') IS NULL ALTER TABLE [Payments] ADD [CreatedAt] DATETIME2 NOT NULL DEFAULT(GETUTCDATE());
                    IF COL_LENGTH('Payments', 'UpdatedAt') IS NULL ALTER TABLE [Payments] ADD [UpdatedAt] DATETIME2 NULL;
                    IF COL_LENGTH('Payments', 'CreatedByUserId') IS NULL ALTER TABLE [Payments] ADD [CreatedByUserId] INT NULL;
                END

                -- ============================
                -- TransactionTypes compatibility
                -- ============================
                IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TransactionTypes')
                BEGIN
                    CREATE TABLE [TransactionTypes] (
                        [Id] INT IDENTITY(1,1) PRIMARY KEY,
                        [AccountId] INT NOT NULL,
                        [Name] NVARCHAR(100) NOT NULL,
                        [NameEn] NVARCHAR(100) NULL,
                        [Code] NVARCHAR(50) NOT NULL,
                        [Description] NVARCHAR(500) NULL,
                        [Color] NVARCHAR(20) NULL,
                        [Icon] NVARCHAR(50) NULL,
                        [IsActive] BIT NOT NULL DEFAULT 1,
                        [IsSystem] BIT NOT NULL DEFAULT 0,
                        [DisplayOrder] INT NOT NULL DEFAULT 0,
                        [CreatedByUserId] INT NULL,
                        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        [UpdatedAt] DATETIME2 NULL
                    );
                END
                ELSE
                BEGIN
                    IF COL_LENGTH('TransactionTypes', 'AccountId') IS NULL ALTER TABLE [TransactionTypes] ADD [AccountId] INT NOT NULL DEFAULT(1);
                    IF COL_LENGTH('TransactionTypes', 'Name') IS NULL ALTER TABLE [TransactionTypes] ADD [Name] NVARCHAR(100) NOT NULL DEFAULT(N'Expense');
                    IF COL_LENGTH('TransactionTypes', 'NameEn') IS NULL ALTER TABLE [TransactionTypes] ADD [NameEn] NVARCHAR(100) NULL;
                    IF COL_LENGTH('TransactionTypes', 'Code') IS NULL ALTER TABLE [TransactionTypes] ADD [Code] NVARCHAR(50) NOT NULL DEFAULT('OP_EXPENSE');
                    IF COL_LENGTH('TransactionTypes', 'Description') IS NULL ALTER TABLE [TransactionTypes] ADD [Description] NVARCHAR(500) NULL;
                    IF COL_LENGTH('TransactionTypes', 'Color') IS NULL ALTER TABLE [TransactionTypes] ADD [Color] NVARCHAR(20) NULL;
                    IF COL_LENGTH('TransactionTypes', 'Icon') IS NULL ALTER TABLE [TransactionTypes] ADD [Icon] NVARCHAR(50) NULL;
                    IF COL_LENGTH('TransactionTypes', 'IsActive') IS NULL ALTER TABLE [TransactionTypes] ADD [IsActive] BIT NOT NULL DEFAULT(1);
                    IF COL_LENGTH('TransactionTypes', 'IsSystem') IS NULL ALTER TABLE [TransactionTypes] ADD [IsSystem] BIT NOT NULL DEFAULT(0);
                    IF COL_LENGTH('TransactionTypes', 'DisplayOrder') IS NULL ALTER TABLE [TransactionTypes] ADD [DisplayOrder] INT NOT NULL DEFAULT(0);
                    IF COL_LENGTH('TransactionTypes', 'CreatedByUserId') IS NULL ALTER TABLE [TransactionTypes] ADD [CreatedByUserId] INT NULL;
                    IF COL_LENGTH('TransactionTypes', 'CreatedAt') IS NULL ALTER TABLE [TransactionTypes] ADD [CreatedAt] DATETIME2 NOT NULL DEFAULT(GETUTCDATE());
                    IF COL_LENGTH('TransactionTypes', 'UpdatedAt') IS NULL ALTER TABLE [TransactionTypes] ADD [UpdatedAt] DATETIME2 NULL;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TransactionTypes_AccountId_Code' AND object_id = OBJECT_ID('TransactionTypes'))
                BEGIN
                    CREATE UNIQUE INDEX [IX_TransactionTypes_AccountId_Code] ON [TransactionTypes]([AccountId], [Code]);
                END

                INSERT INTO [TransactionTypes] ([AccountId], [Name], [NameEn], [Code], [Description], [Color], [Icon], [IsActive], [IsSystem], [DisplayOrder], [CreatedAt])
                SELECT a.[Id], N'مصروفات تشغيلية', N'Operating Expenses', 'OP_EXPENSE', N'Default operating expense type', '#dc2626', 'TrendingDown', 1, 1, 1, GETUTCDATE()
                FROM [Accounts] a
                WHERE NOT EXISTS (
                    SELECT 1 FROM [TransactionTypes] t WHERE t.[AccountId] = a.[Id] AND t.[Code] = 'OP_EXPENSE'
                );

                -- ============================
                -- ExpenseCategories compatibility
                -- ============================
                IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ExpenseCategories')
                BEGIN
                    CREATE TABLE [ExpenseCategories] (
                        [Id] INT IDENTITY(1,1) PRIMARY KEY,
                        [AccountId] INT NOT NULL,
                        [Name] NVARCHAR(100) NOT NULL,
                        [NameEn] NVARCHAR(100) NULL,
                        [Code] NVARCHAR(50) NULL,
                        [ParentCategoryId] INT NULL,
                        [IsActive] BIT NOT NULL DEFAULT 1
                    );
                END
                ELSE
                BEGIN
                    IF COL_LENGTH('ExpenseCategories', 'AccountId') IS NULL ALTER TABLE [ExpenseCategories] ADD [AccountId] INT NOT NULL DEFAULT(1);
                    IF COL_LENGTH('ExpenseCategories', 'Name') IS NULL ALTER TABLE [ExpenseCategories] ADD [Name] NVARCHAR(100) NOT NULL DEFAULT(N'General Expense');
                    IF COL_LENGTH('ExpenseCategories', 'NameEn') IS NULL ALTER TABLE [ExpenseCategories] ADD [NameEn] NVARCHAR(100) NULL;
                    IF COL_LENGTH('ExpenseCategories', 'Code') IS NULL ALTER TABLE [ExpenseCategories] ADD [Code] NVARCHAR(50) NULL;
                    IF COL_LENGTH('ExpenseCategories', 'ParentCategoryId') IS NULL ALTER TABLE [ExpenseCategories] ADD [ParentCategoryId] INT NULL;
                    IF COL_LENGTH('ExpenseCategories', 'IsActive') IS NULL ALTER TABLE [ExpenseCategories] ADD [IsActive] BIT NOT NULL DEFAULT(1);
                END

                INSERT INTO [ExpenseCategories] ([AccountId], [Name], [NameEn], [Code], [IsActive])
                SELECT a.[Id], N'مصاريف تشغيلية', N'Operating Expenses', 'EXP-DEFAULT', 1
                FROM [Accounts] a
                WHERE NOT EXISTS (
                    SELECT 1 FROM [ExpenseCategories] c WHERE c.[AccountId] = a.[Id]
                );

                -- ============================
                -- RevenueCategories compatibility
                -- ============================
                IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RevenueCategories')
                BEGIN
                    CREATE TABLE [RevenueCategories] (
                        [Id] INT IDENTITY(1,1) PRIMARY KEY,
                        [AccountId] INT NOT NULL,
                        [Name] NVARCHAR(100) NOT NULL,
                        [NameEn] NVARCHAR(100) NULL,
                        [Code] NVARCHAR(50) NULL,
                        [ParentCategoryId] INT NULL,
                        [IsActive] BIT NOT NULL DEFAULT 1
                    );
                END
                ELSE
                BEGIN
                    IF COL_LENGTH('RevenueCategories', 'AccountId') IS NULL ALTER TABLE [RevenueCategories] ADD [AccountId] INT NOT NULL DEFAULT(1);
                    IF COL_LENGTH('RevenueCategories', 'Name') IS NULL ALTER TABLE [RevenueCategories] ADD [Name] NVARCHAR(100) NOT NULL DEFAULT(N'General Revenue');
                    IF COL_LENGTH('RevenueCategories', 'NameEn') IS NULL ALTER TABLE [RevenueCategories] ADD [NameEn] NVARCHAR(100) NULL;
                    IF COL_LENGTH('RevenueCategories', 'Code') IS NULL ALTER TABLE [RevenueCategories] ADD [Code] NVARCHAR(50) NULL;
                    IF COL_LENGTH('RevenueCategories', 'ParentCategoryId') IS NULL ALTER TABLE [RevenueCategories] ADD [ParentCategoryId] INT NULL;
                    IF COL_LENGTH('RevenueCategories', 'IsActive') IS NULL ALTER TABLE [RevenueCategories] ADD [IsActive] BIT NOT NULL DEFAULT(1);
                END

                INSERT INTO [RevenueCategories] ([AccountId], [Name], [NameEn], [Code], [IsActive])
                SELECT a.[Id], N'إيرادات عامة', N'General Revenue', 'REV-DEFAULT', 1
                FROM [Accounts] a
                WHERE NOT EXISTS (
                    SELECT 1 FROM [RevenueCategories] c WHERE c.[AccountId] = a.[Id]
                );

                -- ============================
                -- Expenses compatibility
                -- ============================
                IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Expenses')
                BEGIN
                    CREATE TABLE [Expenses] (
                        [Id] INT IDENTITY(1,1) PRIMARY KEY,
                        [AccountId] INT NOT NULL,
                        [TransactionTypeId] INT NULL,
                        [ExpenseNumber] NVARCHAR(50) NOT NULL,
                        [ExpenseDate] DATETIME2 NOT NULL,
                        [CategoryId] INT NULL,
                        [Amount] DECIMAL(18,2) NOT NULL DEFAULT 0,
                        [TaxAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
                        [NetAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
                        [CurrencyId] INT NULL,
                        [ExchangeRate] DECIMAL(18,6) NOT NULL DEFAULT 1,
                        [DueDate] DATETIME2 NULL,
                        [Payee] NVARCHAR(200) NULL,
                        [PayeeType] NVARCHAR(50) NULL,
                        [PayeeId] INT NULL,
                        [PaymentMethod] NVARCHAR(50) NULL,
                        [PaymentDate] DATETIME2 NULL,
                        [ReferenceNumber] NVARCHAR(100) NULL,
                        [Description] NVARCHAR(MAX) NULL,
                        [AttachmentUrl] NVARCHAR(MAX) NULL,
                        [Status] NVARCHAR(50) NOT NULL DEFAULT 'Pending',
                        [IsRecurring] BIT NOT NULL DEFAULT 0,
                        [RecurrencePattern] NVARCHAR(100) NULL,
                        [NextRecurrenceDate] DATETIME2 NULL,
                        [Notes] NVARCHAR(MAX) NULL,
                        [InternalNotes] NVARCHAR(MAX) NULL,
                        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        [UpdatedAt] DATETIME2 NULL,
                        [DeletedAt] DATETIME2 NULL,
                        [CreatedByUserId] INT NULL,
                        [ApprovedByUserId] INT NULL,
                        [ApprovedAt] DATETIME2 NULL,
                        [RejectedByUserId] INT NULL,
                        [RejectedAt] DATETIME2 NULL,
                        [RejectionReason] NVARCHAR(500) NULL
                    );
                END
                ELSE
                BEGIN
                    IF COL_LENGTH('Expenses', 'AccountId') IS NULL ALTER TABLE [Expenses] ADD [AccountId] INT NOT NULL DEFAULT(1);
                    IF COL_LENGTH('Expenses', 'TransactionTypeId') IS NULL ALTER TABLE [Expenses] ADD [TransactionTypeId] INT NULL;
                    IF COL_LENGTH('Expenses', 'ExpenseNumber') IS NULL ALTER TABLE [Expenses] ADD [ExpenseNumber] NVARCHAR(50) NOT NULL DEFAULT('EXP-LEGACY');
                    IF COL_LENGTH('Expenses', 'ExpenseDate') IS NULL ALTER TABLE [Expenses] ADD [ExpenseDate] DATETIME2 NOT NULL DEFAULT(GETUTCDATE());
                    IF COL_LENGTH('Expenses', 'CategoryId') IS NULL ALTER TABLE [Expenses] ADD [CategoryId] INT NULL;
                    IF COL_LENGTH('Expenses', 'Amount') IS NULL ALTER TABLE [Expenses] ADD [Amount] DECIMAL(18,2) NOT NULL DEFAULT(0);
                    IF COL_LENGTH('Expenses', 'TaxAmount') IS NULL ALTER TABLE [Expenses] ADD [TaxAmount] DECIMAL(18,2) NOT NULL DEFAULT(0);
                    IF COL_LENGTH('Expenses', 'NetAmount') IS NULL ALTER TABLE [Expenses] ADD [NetAmount] DECIMAL(18,2) NOT NULL DEFAULT(0);
                    IF COL_LENGTH('Expenses', 'CurrencyId') IS NULL ALTER TABLE [Expenses] ADD [CurrencyId] INT NULL;
                    IF COL_LENGTH('Expenses', 'ExchangeRate') IS NULL ALTER TABLE [Expenses] ADD [ExchangeRate] DECIMAL(18,6) NOT NULL DEFAULT(1);
                    IF COL_LENGTH('Expenses', 'DueDate') IS NULL ALTER TABLE [Expenses] ADD [DueDate] DATETIME2 NULL;
                    IF COL_LENGTH('Expenses', 'Payee') IS NULL ALTER TABLE [Expenses] ADD [Payee] NVARCHAR(200) NULL;
                    IF COL_LENGTH('Expenses', 'PayeeType') IS NULL ALTER TABLE [Expenses] ADD [PayeeType] NVARCHAR(50) NULL;
                    IF COL_LENGTH('Expenses', 'PayeeId') IS NULL ALTER TABLE [Expenses] ADD [PayeeId] INT NULL;
                    IF COL_LENGTH('Expenses', 'PaymentMethod') IS NULL ALTER TABLE [Expenses] ADD [PaymentMethod] NVARCHAR(50) NULL;
                    IF COL_LENGTH('Expenses', 'PaymentDate') IS NULL ALTER TABLE [Expenses] ADD [PaymentDate] DATETIME2 NULL;
                    IF COL_LENGTH('Expenses', 'ReferenceNumber') IS NULL ALTER TABLE [Expenses] ADD [ReferenceNumber] NVARCHAR(100) NULL;
                    IF COL_LENGTH('Expenses', 'Description') IS NULL ALTER TABLE [Expenses] ADD [Description] NVARCHAR(MAX) NULL;
                    IF COL_LENGTH('Expenses', 'AttachmentUrl') IS NULL ALTER TABLE [Expenses] ADD [AttachmentUrl] NVARCHAR(MAX) NULL;
                    IF COL_LENGTH('Expenses', 'Status') IS NULL ALTER TABLE [Expenses] ADD [Status] NVARCHAR(50) NOT NULL DEFAULT('Pending');
                    IF COL_LENGTH('Expenses', 'IsRecurring') IS NULL ALTER TABLE [Expenses] ADD [IsRecurring] BIT NOT NULL DEFAULT(0);
                    IF COL_LENGTH('Expenses', 'RecurrencePattern') IS NULL ALTER TABLE [Expenses] ADD [RecurrencePattern] NVARCHAR(100) NULL;
                    IF COL_LENGTH('Expenses', 'NextRecurrenceDate') IS NULL ALTER TABLE [Expenses] ADD [NextRecurrenceDate] DATETIME2 NULL;
                    IF COL_LENGTH('Expenses', 'Notes') IS NULL ALTER TABLE [Expenses] ADD [Notes] NVARCHAR(MAX) NULL;
                    IF COL_LENGTH('Expenses', 'InternalNotes') IS NULL ALTER TABLE [Expenses] ADD [InternalNotes] NVARCHAR(MAX) NULL;
                    IF COL_LENGTH('Expenses', 'CreatedAt') IS NULL ALTER TABLE [Expenses] ADD [CreatedAt] DATETIME2 NOT NULL DEFAULT(GETUTCDATE());
                    IF COL_LENGTH('Expenses', 'UpdatedAt') IS NULL ALTER TABLE [Expenses] ADD [UpdatedAt] DATETIME2 NULL;
                    IF COL_LENGTH('Expenses', 'DeletedAt') IS NULL ALTER TABLE [Expenses] ADD [DeletedAt] DATETIME2 NULL;
                    IF COL_LENGTH('Expenses', 'CreatedByUserId') IS NULL ALTER TABLE [Expenses] ADD [CreatedByUserId] INT NULL;
                    IF COL_LENGTH('Expenses', 'ApprovedByUserId') IS NULL ALTER TABLE [Expenses] ADD [ApprovedByUserId] INT NULL;
                    IF COL_LENGTH('Expenses', 'ApprovedAt') IS NULL ALTER TABLE [Expenses] ADD [ApprovedAt] DATETIME2 NULL;
                    IF COL_LENGTH('Expenses', 'RejectedByUserId') IS NULL ALTER TABLE [Expenses] ADD [RejectedByUserId] INT NULL;
                    IF COL_LENGTH('Expenses', 'RejectedAt') IS NULL ALTER TABLE [Expenses] ADD [RejectedAt] DATETIME2 NULL;
                    IF COL_LENGTH('Expenses', 'RejectionReason') IS NULL ALTER TABLE [Expenses] ADD [RejectionReason] NVARCHAR(500) NULL;
                END

                -- ============================
                -- Revenues compatibility
                -- ============================
                IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Revenues')
                BEGIN
                    CREATE TABLE [Revenues] (
                        [Id] INT IDENTITY(1,1) PRIMARY KEY,
                        [AccountId] INT NOT NULL,
                        [RevenueNumber] NVARCHAR(50) NOT NULL,
                        [CategoryId] INT NOT NULL,
                        [Amount] DECIMAL(18,2) NOT NULL DEFAULT 0,
                        [TaxAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
                        [NetAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
                        [CurrencyId] INT NULL,
                        [ExchangeRate] DECIMAL(18,6) NOT NULL DEFAULT 1,
                        [RevenueDate] DATETIME2 NOT NULL,
                        [Description] NVARCHAR(MAX) NULL,
                        [Payer] NVARCHAR(200) NULL,
                        [PayerType] NVARCHAR(50) NULL,
                        [PayerId] INT NULL,
                        [PaymentMethod] NVARCHAR(50) NOT NULL DEFAULT 'Cash',
                        [ReferenceNumber] NVARCHAR(100) NULL,
                        [InvoiceId] INT NULL,
                        [AttachmentUrl] NVARCHAR(MAX) NULL,
                        [Notes] NVARCHAR(MAX) NULL,
                        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        [UpdatedAt] DATETIME2 NULL,
                        [DeletedAt] DATETIME2 NULL,
                        [CreatedByUserId] INT NULL
                    );
                END
                ELSE
                BEGIN
                    IF COL_LENGTH('Revenues', 'AccountId') IS NULL ALTER TABLE [Revenues] ADD [AccountId] INT NOT NULL DEFAULT(1);
                    IF COL_LENGTH('Revenues', 'RevenueNumber') IS NULL ALTER TABLE [Revenues] ADD [RevenueNumber] NVARCHAR(50) NOT NULL DEFAULT('REV-LEGACY');
                    IF COL_LENGTH('Revenues', 'CategoryId') IS NULL ALTER TABLE [Revenues] ADD [CategoryId] INT NOT NULL DEFAULT(1);
                    IF COL_LENGTH('Revenues', 'Amount') IS NULL ALTER TABLE [Revenues] ADD [Amount] DECIMAL(18,2) NOT NULL DEFAULT(0);
                    IF COL_LENGTH('Revenues', 'TaxAmount') IS NULL ALTER TABLE [Revenues] ADD [TaxAmount] DECIMAL(18,2) NOT NULL DEFAULT(0);
                    IF COL_LENGTH('Revenues', 'NetAmount') IS NULL ALTER TABLE [Revenues] ADD [NetAmount] DECIMAL(18,2) NOT NULL DEFAULT(0);
                    IF COL_LENGTH('Revenues', 'CurrencyId') IS NULL ALTER TABLE [Revenues] ADD [CurrencyId] INT NULL;
                    IF COL_LENGTH('Revenues', 'ExchangeRate') IS NULL ALTER TABLE [Revenues] ADD [ExchangeRate] DECIMAL(18,6) NOT NULL DEFAULT(1);
                    IF COL_LENGTH('Revenues', 'RevenueDate') IS NULL ALTER TABLE [Revenues] ADD [RevenueDate] DATETIME2 NOT NULL DEFAULT(GETUTCDATE());
                    IF COL_LENGTH('Revenues', 'Description') IS NULL ALTER TABLE [Revenues] ADD [Description] NVARCHAR(MAX) NULL;
                    IF COL_LENGTH('Revenues', 'Payer') IS NULL ALTER TABLE [Revenues] ADD [Payer] NVARCHAR(200) NULL;
                    IF COL_LENGTH('Revenues', 'PayerType') IS NULL ALTER TABLE [Revenues] ADD [PayerType] NVARCHAR(50) NULL;
                    IF COL_LENGTH('Revenues', 'PayerId') IS NULL ALTER TABLE [Revenues] ADD [PayerId] INT NULL;
                    IF COL_LENGTH('Revenues', 'PaymentMethod') IS NULL ALTER TABLE [Revenues] ADD [PaymentMethod] NVARCHAR(50) NOT NULL DEFAULT('Cash');
                    IF COL_LENGTH('Revenues', 'ReferenceNumber') IS NULL ALTER TABLE [Revenues] ADD [ReferenceNumber] NVARCHAR(100) NULL;
                    IF COL_LENGTH('Revenues', 'InvoiceId') IS NULL ALTER TABLE [Revenues] ADD [InvoiceId] INT NULL;
                    IF COL_LENGTH('Revenues', 'AttachmentUrl') IS NULL ALTER TABLE [Revenues] ADD [AttachmentUrl] NVARCHAR(MAX) NULL;
                    IF COL_LENGTH('Revenues', 'Notes') IS NULL ALTER TABLE [Revenues] ADD [Notes] NVARCHAR(MAX) NULL;
                    IF COL_LENGTH('Revenues', 'CreatedAt') IS NULL ALTER TABLE [Revenues] ADD [CreatedAt] DATETIME2 NOT NULL DEFAULT(GETUTCDATE());
                    IF COL_LENGTH('Revenues', 'UpdatedAt') IS NULL ALTER TABLE [Revenues] ADD [UpdatedAt] DATETIME2 NULL;
                    IF COL_LENGTH('Revenues', 'DeletedAt') IS NULL ALTER TABLE [Revenues] ADD [DeletedAt] DATETIME2 NULL;
                    IF COL_LENGTH('Revenues', 'CreatedByUserId') IS NULL ALTER TABLE [Revenues] ADD [CreatedByUserId] INT NULL;
                END
            ");

            logger.LogInformation("Runtime schema compatibility patch completed");
        }
        catch (Exception ex)
        {
            logger.LogWarning($"Runtime schema compatibility patch warning: {ex.Message}");
        }
        
        // Seed initial data
        try
        {
            logger.LogInformation("Seeding initial data...");
            SeedData.Initialize(context);
            logger.LogInformation("Seed data completed!");
        }
        catch (Exception ex)
        {
            logger.LogWarning($"Seed data note: {ex.Message}");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Database initialization error.");
    }
}

app.Run();
