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
-- Add missing columns to Roles table
-- ============================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Roles' AND COLUMN_NAME = 'NameEn')
BEGIN
    ALTER TABLE Roles ADD NameEn NVARCHAR(100);
    PRINT '✓ Added NameEn column to Roles table';
END
ELSE
BEGIN
    PRINT '✓ NameEn column already exists in Roles';
END;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Roles' AND COLUMN_NAME = 'Color')
BEGIN
    ALTER TABLE Roles ADD Color NVARCHAR(50);
    PRINT '✓ Added Color column to Roles table';
END
ELSE
BEGIN
    PRINT '✓ Color column already exists in Roles';
END;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Roles' AND COLUMN_NAME = 'Icon')
BEGIN
    ALTER TABLE Roles ADD Icon NVARCHAR(50);
    PRINT '✓ Added Icon column to Roles table';
END
ELSE
BEGIN
    PRINT '✓ Icon column already exists in Roles';
END;

-- ============================================
-- Set default values for new columns
-- ============================================
UPDATE Roles SET NameEn = Name WHERE NameEn IS NULL;
UPDATE Roles SET Color = '#FF0000' WHERE Color IS NULL AND IsSystemRole = 1;
UPDATE Roles SET Color = '#0066CC' WHERE Color IS NULL;
UPDATE Roles SET Icon = 'admin' WHERE Icon IS NULL AND IsSystemRole = 1;
UPDATE Roles SET Icon = 'user' WHERE Icon IS NULL;

PRINT 'Tables setup complete';
