/**
 * Global Search Component
 * البحث الشامل - للبحث في كل شيء من مكان واحد
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, X, Package, Users, FileText, Receipt, 
  Settings, BarChart3, Bell, MessageSquare, Crown,
  ArrowRight, Command, Loader2, Clock, TrendingUp
} from 'lucide-react';
import { useCustomers, useProducts, useInvoices, useExpenses } from '../services/dataHooks';

interface SearchResult {
  id: string | number;
  type: 'product' | 'customer' | 'invoice' | 'expense' | 'page' | 'action' | 'recent';
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  url?: string;
  action?: () => void;
  highlight?: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

// الصفحات والإجراءات المتاحة
const PAGES: SearchResult[] = [
  { id: 'dashboard', type: 'page', title: 'لوحة التحكم', subtitle: 'الرئيسية', icon: TrendingUp, url: '/' },
  { id: 'products', type: 'page', title: 'المنتجات', subtitle: 'إدارة المنتجات والمخزون', icon: Package, url: '/products' },
  { id: 'customers', type: 'page', title: 'العملاء', subtitle: 'إدارة العملاء', icon: Users, url: '/customers' },
  { id: 'invoices', type: 'page', title: 'الفواتير', subtitle: 'إدارة الفواتير', icon: FileText, url: '/invoices' },
  { id: 'expenses', type: 'page', title: 'المصروفات', subtitle: 'تتبع المصروفات', icon: Receipt, url: '/expenses' },
  { id: 'reports', type: 'page', title: 'التقارير', subtitle: 'التقارير والتحليلات', icon: BarChart3, url: '/reports' },
  { id: 'settings', type: 'page', title: 'الإعدادات', subtitle: 'إعدادات النظام', icon: Settings, url: '/settings' },
  { id: 'notifications', type: 'page', title: 'الإشعارات', subtitle: 'مركز الإشعارات', icon: Bell, url: '/notifications' },
  { id: 'messages', type: 'page', title: 'الرسائل', subtitle: 'صندوق الرسائل', icon: MessageSquare, url: '/messages' },
  { id: 'pricing', type: 'page', title: 'الخطط والأسعار', subtitle: 'ترقية الاشتراك', icon: Crown, url: '/pricing' },
];

const ACTIONS: SearchResult[] = [
  { id: 'new-invoice', type: 'action', title: 'فاتورة جديدة', subtitle: 'إنشاء فاتورة', icon: FileText, url: '/invoices?action=new' },
  { id: 'new-customer', type: 'action', title: 'عميل جديد', subtitle: 'إضافة عميل', icon: Users, url: '/customers?action=new' },
  { id: 'new-product', type: 'action', title: 'منتج جديد', subtitle: 'إضافة منتج', icon: Package, url: '/products?action=new' },
  { id: 'new-expense', type: 'action', title: 'مصروف جديد', subtitle: 'تسجيل مصروف', icon: Receipt, url: '/expenses?action=new' },
];

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // بيانات البحث
  const { customers, loading: customersLoading } = useCustomers();
  const { products, loading: productsLoading } = useProducts();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { expenses, loading: expensesLoading } = useExpenses();

  const isLoading = customersLoading || productsLoading || invoicesLoading || expensesLoading;

  // تحميل البحث الأخير من localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // حفظ البحث الأخير
  const saveRecentSearch = useCallback((search: string) => {
    if (!search.trim()) return;
    const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  }, [recentSearches]);

  // Focus على الإدخال عند الفتح
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // نتائج البحث
  const results = useMemo((): SearchResult[] => {
    const q = query.toLowerCase().trim();
    
    if (!q) {
      // عرض الصفحات والإجراءات الشائعة
      return [
        ...ACTIONS.slice(0, 4),
        ...PAGES.slice(0, 6),
      ];
    }

    const matches: SearchResult[] = [];

    // البحث في الصفحات
    PAGES.forEach(page => {
      if (page.title.includes(q) || page.subtitle?.includes(q)) {
        matches.push({ ...page, highlight: q });
      }
    });

    // البحث في الإجراءات
    ACTIONS.forEach(action => {
      if (action.title.includes(q) || action.subtitle?.includes(q)) {
        matches.push({ ...action, highlight: q });
      }
    });

    // البحث في المنتجات
    products.forEach(product => {
      if (product.name.toLowerCase().includes(q) || product.code?.toLowerCase().includes(q)) {
        matches.push({
          id: `product-${product.id}`,
          type: 'product',
          title: product.name,
          subtitle: `${product.price} - كود: ${product.code || 'N/A'}`,
          icon: Package,
          url: `/products?search=${encodeURIComponent(product.name)}`,
          highlight: q
        });
      }
    });

    // البحث في العملاء
    customers.forEach(customer => {
      if (customer.name.toLowerCase().includes(q) || customer.phone?.includes(q)) {
        matches.push({
          id: `customer-${customer.id}`,
          type: 'customer',
          title: customer.name,
          subtitle: customer.phone || 'بدون رقم',
          icon: Users,
          url: `/customers?search=${encodeURIComponent(customer.name)}`,
          highlight: q
        });
      }
    });

    // البحث في الفواتير
    invoices.forEach(invoice => {
      const searchText = `${invoice.invoiceNumber} ${invoice.customerName}`.toLowerCase();
      if (searchText.includes(q)) {
        matches.push({
          id: `invoice-${invoice.id}`,
          type: 'invoice',
          title: `فاتورة #${invoice.invoiceNumber || invoice.id}`,
          subtitle: `${invoice.customerName} - ${invoice.totalAmount?.toLocaleString()}`,
          icon: FileText,
          url: `/invoices?search=${encodeURIComponent(invoice.invoiceNumber || '')}`,
          highlight: q
        });
      }
    });

    // البحث في المصروفات
    expenses.forEach(expense => {
      if (expense.description?.toLowerCase().includes(q)) {
        matches.push({
          id: `expense-${expense.id}`,
          type: 'expense',
          title: expense.description || 'مصروف',
          subtitle: `${expense.totalAmount?.toLocaleString()}`,
          icon: Receipt,
          url: `/expenses?search=${encodeURIComponent(expense.description || '')}`,
          highlight: q
        });
      }
    });

    return matches.slice(0, 15);
  }, [query, products, customers, invoices, expenses]);

  // التنقل بالأسهم
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  // اختيار نتيجة
  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(result.title);
    if (result.url) {
      navigate(result.url);
    }
    if (result.action) {
      result.action();
    }
    onClose();
  };

  // أيقونة النوع
  const getTypeLabel = (type: SearchResult['type']) => {
    const labels = {
      product: 'منتج',
      customer: 'عميل',
      invoice: 'فاتورة',
      expense: 'مصروف',
      page: 'صفحة',
      action: 'إجراء',
      recent: 'سابق'
    };
    return labels[type];
  };

  const getTypeColor = (type: SearchResult['type']) => {
    const colors = {
      product: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      customer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      invoice: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
      expense: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
      page: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
      action: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      recent: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
    };
    return colors[type];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Search Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700">
          <Search className="text-slate-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="ابحث في كل شيء... (منتجات، عملاء، فواتير، صفحات)"
            className="flex-1 bg-transparent text-slate-800 dark:text-white placeholder-slate-400 outline-none text-lg"
            autoComplete="off"
          />
          {isLoading && <Loader2 className="animate-spin text-slate-400" size={20} />}
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Command size={12} />
            <span>K</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <Search size={48} className="mx-auto mb-4 opacity-30" />
              <p>لا توجد نتائج لـ "{query}"</p>
              <p className="text-sm mt-2">جرب البحث بكلمات مختلفة</p>
            </div>
          ) : (
            <div className="p-2">
              {/* Recent Searches */}
              {!query && recentSearches.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 px-3 py-2 flex items-center gap-2">
                    <Clock size={12} />
                    البحث السابق
                  </p>
                  <div className="flex flex-wrap gap-2 px-3">
                    {recentSearches.map((search, i) => (
                      <button
                        key={i}
                        onClick={() => setQuery(search)}
                        className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {!query && (
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 px-3 py-2">
                  إجراءات سريعة
                </p>
              )}

              {/* Results List */}
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    index === selectedIndex 
                      ? 'bg-primary/10 dark:bg-primary/20' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${getTypeColor(result.type)}`}>
                    <result.icon size={18} />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="font-medium text-slate-800 dark:text-white">
                      {result.title}
                    </p>
                    {result.subtitle && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {result.subtitle}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(result.type)}`}>
                    {getTypeLabel(result.type)}
                  </span>
                  <ArrowRight size={16} className="text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">↓</kbd>
              للتنقل
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">Enter</kbd>
              للاختيار
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">Esc</kbd>
              للإغلاق
            </span>
          </div>
          <span>البحث الشامل</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
