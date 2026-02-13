-- تحديث كلمة المرور للمستخدم admin
UPDATE Users 
SET PasswordHash = '$2a$12$pFwGdhfkQvzgYtXztOi2B.UvG8ortaSm.ooAyTMmQEHAOe3KAIEZi' 
WHERE Username = 'admin';

-- التحقق من التحديث
SELECT Username, PasswordHash FROM Users WHERE Username = 'admin';
