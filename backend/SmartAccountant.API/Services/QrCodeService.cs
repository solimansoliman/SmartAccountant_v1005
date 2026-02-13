using QRCoder;
using System.Security.Cryptography;
using System.Text;

namespace SmartAccountant.API.Services
{
    /// <summary>
    /// خدمة إنشاء ومعالجة رموز QR للفواتير
    /// </summary>
    public class QrCodeService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<QrCodeService> _logger;

        public QrCodeService(IConfiguration configuration, ILogger<QrCodeService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// إنشاء رمز QR للفاتورة
        /// </summary>
        /// <param name="invoiceId">معرّف الفاتورة</param>
        /// <param name="invoiceNumber">رقم الفاتورة</param>
        /// <returns>بيانات صورة QR بصيغة PNG</returns>
        public byte[] GenerateInvoiceQrCode(int invoiceId, string invoiceNumber)
        {
            try
            {
                // بناء الرابط الفريد
                var baseUrl = _configuration["AppSettings:BaseUrl"] ?? "https://smartaccountant.com";
                
                // إنشاء hash للأمان
                var hash = GenerateHash(invoiceId, invoiceNumber);
                
                // الرابط النهائي
                var qrContent = $"{baseUrl}/verify-invoice/{invoiceId}?ref={hash}";

                _logger.LogInformation($"Generating QR Code for Invoice {invoiceNumber}: {qrContent}");

                // إنشاء QR Code
                using (var qrGenerator = new QRCodeGenerator())
                {
                    var qrCodeData = qrGenerator.CreateQrCode(qrContent, QRCodeGenerator.ECCLevel.H);
                    using (var qrCode = new PngByteQRCode(qrCodeData))
                    {
                        var qrCodeImage = qrCode.GetGraphic(10); // 10 pixels per module
                        return qrCodeImage;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error generating QR code for invoice {invoiceNumber}: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// إنشاء رمز QR مع إرجاع الرابط أيضاً
        /// </summary>
        public (byte[] qrImage, string qrUrl) GenerateInvoiceQrCodeWithUrl(int invoiceId, string invoiceNumber)
        {
            var baseUrl = _configuration["AppSettings:BaseUrl"] ?? "https://smartaccountant.com";
            var hash = GenerateHash(invoiceId, invoiceNumber);
            var qrUrl = $"{baseUrl}/verify-invoice/{invoiceId}?ref={hash}";
            var qrImage = GenerateInvoiceQrCode(invoiceId, invoiceNumber);

            return (qrImage, qrUrl);
        }

        /// <summary>
        /// توليد hash آمن للتحقق من الصحة
        /// يتم استخدام التاريخ الحالي لضمان hash مختلف يومياً
        /// </summary>
        private string GenerateHash(int invoiceId, string invoiceNumber)
        {
            // استخدم التاريخ الحالي (بدون وقت) حتى يتم تحديث hash يومياً
            var todayDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var input = $"{invoiceId}:{invoiceNumber}:{todayDate}";

            using (var sha256 = SHA256.Create())
            {
                var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
                // أخذ أول 8 أحرف من الـ Base64 للاختصار
                var base64Hash = Convert.ToBase64String(hashBytes);
                return base64Hash.Substring(0, Math.Min(8, base64Hash.Length));
            }
        }

        /// <summary>
        /// التحقق من صحة الـ Hash
        /// </summary>
        public bool VerifyHash(int invoiceId, string invoiceNumber, string hash)
        {
            try
            {
                var expectedHash = GenerateHash(invoiceId, invoiceNumber);
                var isValid = hash == expectedHash;

                if (!isValid)
                {
                    _logger.LogWarning($"Invalid hash for invoice {invoiceNumber}. Expected: {expectedHash}, Got: {hash}");
                }

                return isValid;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error verifying hash for invoice {invoiceNumber}: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// الحصول على رابط QR الكامل فقط (بدون إنشاء الصورة)
        /// </summary>
        public string GetQrUrl(int invoiceId, string invoiceNumber)
        {
            var baseUrl = _configuration["AppSettings:BaseUrl"] ?? "https://smartaccountant.com";
            var hash = GenerateHash(invoiceId, invoiceNumber);
            return $"{baseUrl}/verify-invoice/{invoiceId}?ref={hash}";
        }
    }
}
