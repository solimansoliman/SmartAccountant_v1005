namespace SmartAccountant.API.Models
{
    /// <summary>
    /// الرسائل بين المستخدمين
    /// </summary>
    public class Message
    {
        public int Id { get; set; }
        
        // ربط بالحساب
        public int AccountId { get; set; }
        public Account? Account { get; set; }
        
        /// <summary>
        /// المرسل
        /// </summary>
        public int SenderId { get; set; }
        public User Sender { get; set; } = null!;
        
        /// <summary>
        /// المستلم (null = رسالة للجميع في الحساب)
        /// </summary>
        public int? ReceiverId { get; set; }
        public User? Receiver { get; set; }
        
        /// <summary>
        /// عنوان الرسالة
        /// </summary>
        public string? Subject { get; set; }
        
        /// <summary>
        /// محتوى الرسالة
        /// </summary>
        public string Content { get; set; } = string.Empty;
        
        /// <summary>
        /// نوع الرسالة
        /// </summary>
        public MessageType Type { get; set; } = MessageType.Direct;
        
        /// <summary>
        /// أولوية الرسالة
        /// </summary>
        public MessagePriority Priority { get; set; } = MessagePriority.Normal;
        
        /// <summary>
        /// هل تم قراءة الرسالة؟
        /// </summary>
        public bool IsRead { get; set; } = false;
        
        /// <summary>
        /// تاريخ القراءة
        /// </summary>
        public DateTime? ReadAt { get; set; }
        
        /// <summary>
        /// الرسالة الأصلية (للردود)
        /// </summary>
        public int? ParentMessageId { get; set; }
        public Message? ParentMessage { get; set; }
        
        /// <summary>
        /// مرفقات
        /// </summary>
        public string? AttachmentUrl { get; set; }
        
        /// <summary>
        /// هل تم حذفها من قبل المرسل؟
        /// </summary>
        public bool IsDeletedBySender { get; set; } = false;
        
        /// <summary>
        /// هل تم حذفها من قبل المستلم؟
        /// </summary>
        public bool IsDeletedByReceiver { get; set; } = false;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation Properties
        public ICollection<Message> Replies { get; set; } = new List<Message>();
    }

    public enum MessageType
    {
        Direct = 1,         // رسالة مباشرة
        Broadcast = 2,      // رسالة للجميع
        Announcement = 3,   // إعلان
        System = 4          // رسالة نظام
    }

    public enum MessagePriority
    {
        Low = 1,
        Normal = 2,
        High = 3,
        Urgent = 4
    }
}
