import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Mail, Send, Inbox, CheckCheck, Trash2, Loader2, AlertTriangle, Clock, User, ChevronLeft, X, Plus, Search, RefreshCw, Users, Building2, Globe } from 'lucide-react';
import { messagesApi, ApiMessage, getBaseUrl } from '../services/apiService';
import { useNotification } from '../context/NotificationContext';
import { formatDateTime, formatDate, formatTime } from '../services/dateService';
import { usePagePermission } from '../services/permissionsHooks';
import AccessDenied from '../components/AccessDenied';

interface UserItem {
  id: number;
  fullName?: string;
  username: string;
  email?: string;
  accountId?: number;
  isActive?: boolean;
}

interface AccountItem {
  id: number;
  name: string;
  nameEn?: string;
}

type SendMode = 'single' | 'all' | 'account';

const Messages: React.FC = () => {
  const { notify } = useNotification();
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<'inbox' | 'sent'>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<ApiMessage | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Compose form
  const [users, setUsers] = useState<UserItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [sendMode, setSendMode] = useState<SendMode>('single');
  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Normal' | 'High' | 'Urgent'>('Normal');
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // حدود عدد الحروف
  const [maxMessageLength, setMaxMessageLength] = useState<number>(1000);
  const [maxNotificationLength, setMaxNotificationLength] = useState<number>(500);
  
  // ==================== صلاحيات الصفحة ====================
  const pagePerms = usePagePermission('messages');

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await messagesApi.getAll({ folder });
      setMessages(data);
    } catch (err: any) {
      console.warn('فشل في جلب الرسائل:', err.message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [folder]);

  // جلب حدود عدد الحروف
  const fetchLimits = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'X-Account-Id': localStorage.getItem('accountId') || '1',
        'X-User-Id': localStorage.getItem('userId') || '',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${getBaseUrl()}/messages/limits`, { headers });
      if (response.ok) {
        const data = await response.json();
        setMaxMessageLength(data.maxMessageLength || 1000);
        setMaxNotificationLength(data.maxNotificationLength || 500);
      }
    } catch (err) {
      console.warn('فشل في جلب حدود الحروف');
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      // جلب المستخدمين من API الرسائل
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'X-Account-Id': localStorage.getItem('accountId') || '1',
        'X-User-Id': localStorage.getItem('userId') || '',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${getBaseUrl()}/messages/all-users`, { headers });
      if (response.ok) {
        const data = await response.json();
        setUsers(data || []);
      } else {
        console.warn('فشل في جلب المستخدمين');
        setUsers([]);
      }
    } catch (err) {
      console.warn('فشل في جلب المستخدمين');
      setUsers([]);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      // جلب الحسابات من API الرسائل
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'X-Account-Id': localStorage.getItem('accountId') || '1',
        'X-User-Id': localStorage.getItem('userId') || '',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${getBaseUrl()}/messages/accounts`, { headers });
      if (response.ok) {
        const data = await response.json();
        setAccounts(data || []);
      } else {
        console.warn('فشل في جلب الحسابات');
        setAccounts([]);
      }
    } catch (err) {
      console.warn('فشل في جلب الحسابات');
      setAccounts([]);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    fetchLimits();
  }, [fetchMessages, fetchLimits]);

  useEffect(() => {
    if (showCompose) {
      fetchUsers();
      fetchAccounts();
    }
  }, [showCompose, fetchUsers, fetchAccounts]);

  // حساب عدد الحروف المتبقية
  const remainingChars = useMemo(() => {
    if (maxMessageLength === 0) return -1; // بدون حد
    return maxMessageLength - content.length;
  }, [content, maxMessageLength]);

  const isOverLimit = remainingChars !== -1 && remainingChars < 0;

  // تجميع المستخدمين حسب الحساب
  const usersGroupedByAccount = useMemo(() => {
    const grouped: Record<number, { account: AccountItem | null; users: UserItem[] }> = {};
    
    users.forEach(user => {
      const accountId = user.accountId || 0;
      if (!grouped[accountId]) {
        const account = accounts.find(a => a.id === accountId);
        grouped[accountId] = { account: account || null, users: [] };
      }
      grouped[accountId].users.push(user);
    });
    
    return grouped;
  }, [users, accounts]);

  // المستخدمين حسب الحساب المحدد
  const usersOfSelectedAccount = useMemo(() => {
    if (!selectedAccountId) return [];
    return users.filter(u => u.accountId === selectedAccountId);
  }, [users, selectedAccountId]);

  // ==================== التحقق من الصلاحيات (بعد كل الـ hooks) ====================
  if (pagePerms.checked && !pagePerms.canView) {
    return <AccessDenied />;
  }

  const handleSelectMessage = async (message: ApiMessage) => {
    setSelectedMessage(message);
    if (!message.isRead && folder === 'inbox') {
      try {
        await messagesApi.markAsRead(message.id);
        setMessages(prev => prev.map(m => m.id === message.id ? { ...m, isRead: true } : m));
      } catch (err) {
        console.warn('فشل في تحديث حالة الرسالة');
      }
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      notify('يرجى ملء الموضوع والرسالة', 'warning');
      return;
    }

    // التحقق من حد الحروف
    if (isOverLimit) {
      notify(`تجاوزت الحد الأقصى لعدد الحروف (${maxMessageLength} حرف)`, 'error');
      return;
    }

    if (sendMode === 'single' && !recipientId) {
      notify('يرجى اختيار المستلم', 'warning');
      return;
    }

    if (sendMode === 'account' && !selectedAccountId) {
      notify('يرجى اختيار الحساب', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      if (sendMode === 'single' && recipientId) {
        await messagesApi.send({
          recipientUserId: recipientId,
          subject,
          content,
          priority,
        });
        notify('تم إرسال الرسالة بنجاح', 'success');
      } else if (sendMode === 'all') {
        let sentCount = 0;
        for (const user of users) {
          try {
            await messagesApi.send({
              recipientUserId: user.id,
              subject,
              content,
              priority,
            });
            sentCount++;
          } catch (err) {
            console.warn(`فشل إرسال لـ ${user.fullName}`);
          }
        }
        notify(`تم إرسال الرسالة إلى ${sentCount} مستخدم`, 'success');
      } else if (sendMode === 'account' && selectedAccountId) {
        const accountUsers = usersOfSelectedAccount;
        let sentCount = 0;
        for (const user of accountUsers) {
          try {
            await messagesApi.send({
              recipientUserId: user.id,
              subject,
              content,
              priority,
            });
            sentCount++;
          } catch (err) {
            console.warn(`فشل إرسال لـ ${user.fullName}`);
          }
        }
        notify(`تم إرسال الرسالة إلى ${sentCount} مستخدم`, 'success');
      }

      setShowCompose(false);
      resetComposeForm();
      if (folder === 'sent') fetchMessages();
    } catch (err: any) {
      notify(err.message || 'فشل في إرسال الرسالة', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const resetComposeForm = () => {
    setSendMode('single');
    setRecipientId(null);
    setSelectedAccountId(null);
    setSubject('');
    setContent('');
    setPriority('Normal');
    setUserSearchQuery('');
  };

  const handleDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await messagesApi.delete(id);
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage?.id === id) setSelectedMessage(null);
      notify('تم حذف الرسالة', 'success');
      setDeleteId(null);
    } catch (err: any) {
      notify(err.message || 'فشل في حذف الرسالة', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getPriorityColor = (p: ApiMessage['priority']) => {
    switch (p) {
      case 'Urgent': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      case 'High': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Low': return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getPriorityLabel = (p: ApiMessage['priority']) => {
    switch (p) {
      case 'Urgent': return 'عاجل';
      case 'High': return 'مرتفع';
      case 'Low': return 'منخفض';
      default: return 'عادي';
    }
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return formatTime(dateStr);
    }
    return formatDate(dateStr);
  };

  const unreadCount = messages.filter(m => !m.isRead && folder === 'inbox').length;

  const filteredMessages = messages.filter(m => 
    m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (folder === 'inbox' ? m.senderName : m.recipientName)?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !selectedMessage) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">جاري تحميل الرسائل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <Mail className="text-indigo-600 dark:text-indigo-400" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">الرسائل</h2>
            {unreadCount > 0 && folder === 'inbox' && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {unreadCount} رسالة غير مقروءة
              </p>
            )}
          </div>
        </div>
        
        <button
          onClick={() => setShowCompose(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} />
          رسالة جديدة
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - Messages List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Folder Tabs */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => { setFolder('inbox'); setSelectedMessage(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                folder === 'inbox' 
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow' 
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Inbox size={16} />
              الوارد
              {unreadCount > 0 && (
                <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </button>
            <button
              onClick={() => { setFolder('sent'); setSelectedMessage(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                folder === 'sent' 
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow' 
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Send size={16} />
              المرسل
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث في الرسائل..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Messages List */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[500px] overflow-y-auto">
              {filteredMessages.length === 0 ? (
                <div className="p-8 text-center">
                  <Mail className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={40} />
                  <p className="text-slate-400">لا توجد رسائل</p>
                </div>
              ) : (
                filteredMessages.map(message => (
                  <div
                    key={message.id}
                    onClick={() => handleSelectMessage(message)}
                    className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                      selectedMessage?.id === message.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                    } ${!message.isRead && folder === 'inbox' ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full">
                        <User size={16} className="text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-medium text-sm ${!message.isRead && folder === 'inbox' ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                            {folder === 'inbox' ? message.senderName : message.recipientName}
                          </span>
                          <span className="text-xs text-slate-400">{formatMessageDate(message.createdAt)}</span>
                        </div>
                        <p className={`text-sm truncate ${!message.isRead && folder === 'inbox' ? 'font-bold text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                          {message.subject}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${getPriorityColor(message.priority)}`}>
                            {getPriorityLabel(message.priority)}
                          </span>
                          {message.isRead && folder === 'inbox' && (
                            <CheckCheck size={14} className="text-emerald-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Message Content */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 h-full">
              {/* Message Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedMessage(null)}
                      className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                      <User size={20} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white">
                        {folder === 'inbox' ? selectedMessage.senderName : selectedMessage.recipientName}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock size={14} />
                        {formatDateTime(selectedMessage.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(selectedMessage.priority)}`}>
                      {getPriorityLabel(selectedMessage.priority)}
                    </span>
                    <button
                      onClick={() => setDeleteId(selectedMessage.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-4">
                  {selectedMessage.subject}
                </h2>
              </div>
              
              {/* Message Body */}
              <div className="p-6">
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {selectedMessage.content}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 h-full flex items-center justify-center p-12">
              <div className="text-center">
                <Mail className="mx-auto mb-4 text-slate-300 dark:text-slate-600" size={64} />
                <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">اختر رسالة للعرض</h3>
                <p className="text-sm text-slate-400">أو اضغط على "رسالة جديدة" لإنشاء رسالة</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">رسالة جديدة</h3>
              <button onClick={() => { setShowCompose(false); resetComposeForm(); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Send Mode Tabs */}
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">نوع الإرسال</label>
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <button
                    onClick={() => { setSendMode('single'); setSelectedAccountId(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      sendMode === 'single' 
                        ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow' 
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <User size={16} />
                    مستخدم واحد
                  </button>
                  <button
                    onClick={() => { setSendMode('account'); setRecipientId(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      sendMode === 'account' 
                        ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow' 
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Building2 size={16} />
                    حساب كامل
                  </button>
                  <button
                    onClick={() => { setSendMode('all'); setRecipientId(null); setSelectedAccountId(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      sendMode === 'all' 
                        ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow' 
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Globe size={16} />
                    الجميع
                  </button>
                </div>
              </div>

              {/* Recipient Selection - Single User */}
              {sendMode === 'single' && (
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">المستلم *</label>
                  
                  {/* Search Users */}
                  <div className="relative mb-2">
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ابحث عن مستخدم بالاسم أو البريد..."
                      value={userSearchQuery}
                      onChange={e => setUserSearchQuery(e.target.value)}
                      className="w-full pr-9 pl-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-indigo-500 outline-none text-sm"
                    />
                  </div>

                  {/* Users List */}
                  <div className="border border-slate-200 dark:border-slate-600 rounded-lg max-h-48 overflow-y-auto">
                    {Object.entries(usersGroupedByAccount).map(([accountId, { account, users: accountUsers }]) => {
                      const usersToShow = userSearchQuery 
                        ? accountUsers.filter(u => 
                            u.fullName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            u.username?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            u.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
                          )
                        : accountUsers;
                      
                      if (usersToShow.length === 0) return null;
                      
                      return (
                        <div key={accountId}>
                          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 sticky top-0">
                            <Building2 size={12} />
                            {account?.name || 'الحساب الرئيسي'}
                          </div>
                          {usersToShow.map(user => (
                            <div
                              key={user.id}
                              onClick={() => setRecipientId(user.id)}
                              className={`px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 ${
                                recipientId === user.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                recipientId === user.id ? 'bg-indigo-600' : 'bg-slate-400'
                              }`}>
                                {(user.fullName || user.username)?.[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-slate-800 dark:text-white">
                                  {user.fullName || user.username}
                                </div>
                                <div className="text-xs text-slate-400">{user.email}</div>
                              </div>
                              {recipientId === user.id && (
                                <CheckCheck size={16} className="text-indigo-600" />
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                  
                  {recipientId && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
                      <User size={14} />
                      تم اختيار: {users.find(u => u.id === recipientId)?.fullName || users.find(u => u.id === recipientId)?.username}
                    </div>
                  )}
                </div>
              )}

              {/* Account Selection - Send to Account */}
              {sendMode === 'account' && (
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">اختر الحساب *</label>
                  <select
                    value={selectedAccountId || ''}
                    onChange={e => setSelectedAccountId(Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-indigo-500 outline-none"
                  >
                    <option value="">اختر الحساب...</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} {acc.nameEn ? `(${acc.nameEn})` : ''}
                      </option>
                    ))}
                  </select>
                  
                  {selectedAccountId && (
                    <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-indigo-700 dark:text-indigo-300">
                        <Users size={16} />
                        سيتم إرسال الرسالة إلى {usersOfSelectedAccount.length} مستخدم
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {usersOfSelectedAccount.slice(0, 5).map(u => (
                          <span key={u.id} className="text-xs bg-white dark:bg-slate-700 px-2 py-1 rounded-full text-slate-600 dark:text-slate-300">
                            {u.fullName || u.username}
                          </span>
                        ))}
                        {usersOfSelectedAccount.length > 5 && (
                          <span className="text-xs text-slate-500">+{usersOfSelectedAccount.length - 5} آخرين</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Send to All Info */}
              {sendMode === 'all' && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <AlertTriangle size={20} />
                    <span className="font-medium">إرسال للجميع</span>
                  </div>
                  <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                    سيتم إرسال هذه الرسالة إلى جميع المستخدمين ({users.length} مستخدم) في النظام.
                  </p>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">الموضوع *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="موضوع الرسالة"
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">الأولوية</label>
                <div className="flex gap-2">
                  {(['Low', 'Normal', 'High', 'Urgent'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        priority === p 
                          ? getPriorityColor(p)
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {getPriorityLabel(p)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-slate-600 dark:text-slate-400">الرسالة *</label>
                  {maxMessageLength > 0 && (
                    <span className={`text-xs font-medium ${
                      isOverLimit 
                        ? 'text-rose-600 dark:text-rose-400' 
                        : remainingChars <= 50 
                          ? 'text-amber-600 dark:text-amber-400' 
                          : 'text-slate-400'
                    }`}>
                      {remainingChars >= 0 ? (
                        <>متبقي {remainingChars} حرف</>
                      ) : (
                        <>تجاوزت بـ {Math.abs(remainingChars)} حرف</>
                      )}
                    </span>
                  )}
                </div>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  rows={5}
                  maxLength={maxMessageLength > 0 ? maxMessageLength + 50 : undefined}
                  className={`w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-indigo-500 outline-none resize-none ${
                    isOverLimit 
                      ? 'border-rose-500 dark:border-rose-500 focus:border-rose-500' 
                      : 'border-slate-200 dark:border-slate-600'
                  }`}
                />
                {/* شريط تقدم عدد الحروف */}
                {maxMessageLength > 0 && (
                  <div className="mt-1 h-1 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        isOverLimit 
                          ? 'bg-rose-500' 
                          : remainingChars <= 50 
                            ? 'bg-amber-500' 
                            : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min((content.length / maxMessageLength) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSend}
                  disabled={actionLoading || isOverLimit}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-bold disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      {sendMode === 'single' ? 'إرسال' : sendMode === 'all' ? 'إرسال للجميع' : 'إرسال للحساب'}
                    </>
                  )}
                </button>
                <button
                  onClick={() => { setShowCompose(false); resetComposeForm(); }}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-full">
                <AlertTriangle className="text-rose-600 dark:text-rose-400" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">تأكيد الحذف</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">هل أنت متأكد من حذف هذه الرسالة؟</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={actionLoading}
                className="flex-1 bg-rose-600 text-white py-2.5 rounded-lg hover:bg-rose-700 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading && <Loader2 className="animate-spin h-4 w-4" />}
                حذف
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
