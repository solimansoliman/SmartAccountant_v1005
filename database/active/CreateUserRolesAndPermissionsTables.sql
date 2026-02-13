-- ============================================
-- Create UserRoles Table
-- ============================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'UserRoles')
BEGIN
    CREATE TABLE UserRoles (
        Id INT PRIMARY KEY IDENTITY(1,1),
        UserId INT NOT NULL,
        RoleId INT NOT NULL,
        AssignedAt DATETIME2 NULL,
        AssignedByUserId INT NULL,
        
        -- Foreign Keys
        CONSTRAINT FK_UserRoles_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
        CONSTRAINT FK_UserRoles_Roles FOREIGN KEY (RoleId) REFERENCES Roles(Id) ON DELETE CASCADE,
        CONSTRAINT FK_UserRoles_Users_AssignedBy FOREIGN KEY (AssignedByUserId) REFERENCES Users(Id) ON DELETE SET NULL
    );
    
    CREATE INDEX IX_UserRoles_UserId ON UserRoles(UserId);
    CREATE INDEX IX_UserRoles_RoleId ON UserRoles(RoleId);
    
    PRINT '✓ UserRoles table created successfully';
END
ELSE
BEGIN
    PRINT '✓ UserRoles table already exists';
END;

-- ============================================
-- Create Permissions Table if not exists
-- ============================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Permissions')
BEGIN
    CREATE TABLE Permissions (
        Id INT PRIMARY KEY IDENTITY(1,1),
        Code NVARCHAR(50) NOT NULL UNIQUE,
        Name NVARCHAR(100) NOT NULL,
        Description NVARCHAR(500),
        Category NVARCHAR(50),
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE()
    );
    
    PRINT '✓ Permissions table created successfully';
END
ELSE
BEGIN
    PRINT '✓ Permissions table already exists';
END;

-- ============================================
-- Create RolePermissions Table if not exists
-- ============================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RolePermissions')
BEGIN
    CREATE TABLE RolePermissions (
        Id INT PRIMARY KEY IDENTITY(1,1),
        RoleId INT NOT NULL,
        PermissionId INT NOT NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        
        -- Foreign Keys
        CONSTRAINT FK_RolePermissions_Roles FOREIGN KEY (RoleId) REFERENCES Roles(Id) ON DELETE CASCADE,
        CONSTRAINT FK_RolePermissions_Permissions FOREIGN KEY (PermissionId) REFERENCES Permissions(Id) ON DELETE CASCADE,
        CONSTRAINT UQ_RolePermissions UNIQUE (RoleId, PermissionId)
    );
    
    CREATE INDEX IX_RolePermissions_RoleId ON RolePermissions(RoleId);
    CREATE INDEX IX_RolePermissions_PermissionId ON RolePermissions(PermissionId);
    
    PRINT '✓ RolePermissions table created successfully';
END
ELSE
BEGIN
    PRINT '✓ RolePermissions table already exists';
END;

-- ============================================
-- Add NameEn and NameEn to Roles if missing
-- ============================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Roles' AND COLUMN_NAME = 'NameEn')
BEGIN
    ALTER TABLE Roles ADD NameEn NVARCHAR(100);
    PRINT '✓ Added NameEn column to Roles table';
END;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Roles' AND COLUMN_NAME = 'Color')
BEGIN
    ALTER TABLE Roles ADD Color NVARCHAR(50);
    PRINT '✓ Added Color column to Roles table';
END;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Roles' AND COLUMN_NAME = 'Icon')
BEGIN
    ALTER TABLE Roles ADD Icon NVARCHAR(50);
    PRINT '✓ Added Icon column to Roles table';
END;

-- ============================================
-- Seed default permissions if needed
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Permissions)
BEGIN
    INSERT INTO Permissions (Code, Name, Description, Category) VALUES
    ('products.view', 'View Products', 'Can view product list and details', 'Products'),
    ('products.create', 'Create Products', 'Can create new products', 'Products'),
    ('products.edit', 'Edit Products', 'Can edit existing products', 'Products'),
    ('products.delete', 'Delete Products', 'Can delete products', 'Products'),
    ('customers.view', 'View Customers', 'Can view customer list and details', 'Customers'),
    ('customers.create', 'Create Customers', 'Can create new customers', 'Customers'),
    ('customers.edit', 'Edit Customers', 'Can edit existing customers', 'Customers'),
    ('customers.delete', 'Delete Customers', 'Can delete customers', 'Customers'),
    ('invoices.view', 'View Invoices', 'Can view invoice list and details', 'Invoices'),
    ('invoices.create', 'Create Invoices', 'Can create new invoices', 'Invoices'),
    ('invoices.edit', 'Edit Invoices', 'Can edit existing invoices', 'Invoices'),
    ('invoices.delete', 'Delete Invoices', 'Can delete invoices', 'Invoices'),
    ('expenses.view', 'View Expenses', 'Can view expense list and details', 'Expenses'),
    ('expenses.create', 'Create Expenses', 'Can create new expenses', 'Expenses'),
    ('expenses.edit', 'Edit Expenses', 'Can edit existing expenses', 'Expenses'),
    ('expenses.delete', 'Delete Expenses', 'Can delete expenses', 'Expenses'),
    ('reports.view', 'View Reports', 'Can view reports', 'Reports'),
    ('settings.view', 'View Settings', 'Can view system settings', 'Settings'),
    ('settings.edit', 'Edit Settings', 'Can edit system settings', 'Settings'),
    ('users.view', 'View Users', 'Can view user list and details', 'Users'),
    ('users.create', 'Create Users', 'Can create new users', 'Users'),
    ('users.edit', 'Edit Users', 'Can edit existing users', 'Users'),
    ('users.delete', 'Delete Users', 'Can delete users', 'Users'),
    ('account.logo', 'Manage Account Logo', 'Can manage account logo', 'Account');
    
    PRINT '✓ Permissions seeded successfully';
END;

-- ============================================
-- Get Role with missing NameEn and update it
-- ============================================
IF EXISTS (SELECT 1 FROM Roles WHERE NameEn IS NULL)
BEGIN
    UPDATE Roles 
    SET 
        NameEn = Name,
        Color = CASE WHEN IsSystemRole = 1 THEN '#FF0000' ELSE '#0066CC' END,
        Icon = CASE WHEN IsSystemRole = 1 THEN 'admin' ELSE 'user' END
    WHERE NameEn IS NULL;
    
    PRINT '✓ Updated Roles with NameEn, Color, and Icon';
END;

PRINT '✓ All tables created successfully';
