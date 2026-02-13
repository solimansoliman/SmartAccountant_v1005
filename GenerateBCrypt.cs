using BCrypt.Net;

class Program {
    static void Main() {
        string password = "admin123";
        string hashed = BCrypt.HashPassword(password, 12);
        Console.WriteLine($"BCrypt hash for '{password}':");
        Console.WriteLine(hashed);
        Console.WriteLine();
        Console.WriteLine("Verification test:");
        bool verified = BCrypt.Verify(password, hashed);
        Console.WriteLine($"Password verification: {verified}");
    }
}
