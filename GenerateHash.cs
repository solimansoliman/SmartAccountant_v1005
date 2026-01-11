using System;

class Program
{
    static void Main()
    {
        string password = "admin123";
        string hash = BCrypt.Net.BCrypt.HashPassword(password);
        Console.WriteLine(hash);
        
        // Verify
        bool valid = BCrypt.Net.BCrypt.Verify(password, hash);
        Console.WriteLine(\"Verification: \" + valid);
    }
}
