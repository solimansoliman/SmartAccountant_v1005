USE [SmartAccountant_v1005_DB];

-- Export data using INSERT statements
DECLARE @sql NVARCHAR(MAX) = '';

-- Currencies
SELECT @sql = @sql + 
    'INSERT INTO [Currencies] ([Id], [Code], [Name], [NameEn], [Symbol], [ExchangeRate], [IsDefault], [IsActive], [CreatedAt]) VALUES (' +
    CAST(Id as NVARCHAR(10)) + ', N''' + Code + ''', N''' + Name + ''', ' +
    CASE WHEN NameEn IS NULL THEN 'NULL' ELSE 'N''' + NameEn + '''' END + ', N''' + Symbol + ''', ' +
    CAST(ExchangeRate as NVARCHAR(20)) + ', ' + CAST(IsDefault as NVARCHAR(1)) + ', ' + CAST(IsActive as NVARCHAR(1)) + ', ''' + CONVERT(NVARCHAR, CreatedAt, 120) + ''');' + CHAR(10)
FROM Currencies;

PRINT @sql;
