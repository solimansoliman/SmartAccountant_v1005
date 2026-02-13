
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UserPlus, Search, FileText, Wallet, Calendar, Phone, User, Trash2, AlertTriangle, Edit2, Save, XCircle, StickyNote, Loader2, Grid3X3, List, Plus, Printer, Eye, X, CreditCard, Banknote, Store, Filter, Mail, Copy, Star, MapPin } from 'lucide-react';
import { useCustomers, useInvoices } from '../services/dataHooks';
import { useNotification } from '../context/NotificationContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { paymentsApi, invoicesApi, ApiPaymentDto } from '../services/apiService';
import { formatDate, formatTime } from '../services/dateService';
import { printWithFileName } from '../services/fileNameService';
import DateInput from '../components/DateInput';
import { usePagePermission } from '../services/permissionsHooks';
import AccessDenied from '../components/AccessDenied';
import CoordinateMapPicker from '../components/CoordinateMapPicker';
import {
  buildMapUrl,
  composeAddressWithCoordinates,
  parseAddressCoordinates,
  removeCoordinateTokenFromAddress,
  validateCoordinateInputs,
} from '../services/geoAddressService';

type ViewMode = 'grid' | 'table';

type VerifiedPaymentMarker = {
  customerId: number;
  paymentId: number;
  amount: number;
  verifiedAt: string;
  remainingBefore: number;
  remainingAfter: number;
};

const CONTACT_PLACEHOLDER_PHONE = '0100000000000';
const CONTACT_PLACEHOLDER_EMAIL = 'mail@test';

const resolveMaxLength = (value: unknown, fallbackValue: number, minValue: number, maxValue: number) => {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return fallbackValue;
  }
  return Math.min(maxValue, Math.max(minValue, Math.floor(parsedValue)));
};

type GeoOption = { id: number; name: string };

const normalizeGeoSearchText = (value: string) => {
  return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
};

const GeoSearchSelect = ({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  loading = false
}: {
  options: GeoOption[];
  value: number | null;
  onChange: (nextId: number | null) => void;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedOption = useMemo(
    () => options.find(option => option.id === value) || null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const normalizedSearchTerm = normalizeGeoSearchText(searchTerm);
    if (!normalizedSearchTerm) {
      return options;
    }

    return options.filter(option => normalizeGeoSearchText(option.name).includes(normalizedSearchTerm));
  }, [options, searchTerm]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
      setSearchTerm('');
    }
  }, [disabled]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setIsOpen(prev => !prev);
          }
        }}
        className={`w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-right flex items-center justify-between bg-white dark:bg-slate-700/50 transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 cursor-pointer'
        }`}
      >
        <span className={`truncate ${selectedOption ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
          {selectedOption?.name || placeholder}
        </span>
        <span className={`text-[10px] text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-[50]" onClick={() => setIsOpen(false)}></div>
          <div className="absolute z-[51] w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl mt-1 overflow-hidden">
            <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40">
              <div className="relative">
                <Search size={14} className="absolute right-3 top-2.5 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder="اكتب للبحث..."
                  className="w-full pr-9 pl-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-sm outline-none focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto p-1">
              {selectedOption && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setIsOpen(false);
                  }}
                  className="w-full text-right px-2.5 py-2 rounded-md text-xs text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                >
                  مسح الاختيار
                </button>
              )}

              {loading ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-3">جاري تحميل البيانات...</p>
              ) : filteredOptions.length > 0 ? (
                filteredOptions.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onChange(option.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-right px-2.5 py-2 rounded-md text-sm transition-colors ${
                      value === option.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {option.name}
                  </button>
                ))
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-3">لا توجد نتائج مطابقة</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const Customers: React.FC = () => {
  // ==================== Hooks أولاً (React requires all hooks before any return) ====================
  const { notify } = useNotification();
  const { currency, defaultViewMode, permissions } = useSettings();
  const { user } = useAuth();
  const [view, setView] = useState<'list' | 'create' | 'detail' | 'statement'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Date Filter State
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  
  // View Mode State - يستخدم الإعداد الافتراضي من النظام
  const [listViewMode, setListViewMode] = useState<ViewMode>(defaultViewMode || 'grid');
  
  // API Hooks
  const { 
    customers, 
    loading: customersLoading, 
    error: customersError,
    addCustomer: apiAddCustomer,
    updateCustomer: apiUpdateCustomer,
    deleteCustomer: apiDeleteCustomer,
    refresh: refreshCustomers
  } = useCustomers();
  
  const { invoices, loading: invoicesLoading, refresh: refreshInvoices } = useInvoices();
  
  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null);
  const [fullDataCustomer, setFullDataCustomer] = useState<typeof customers[0] | null>(null);
  
  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form State (Add / Edit)
  const [formCustName, setFormCustName] = useState('');
  const [formCustCountryId, setFormCustCountryId] = useState<number | null>(null);
  const [formCustProvinceId, setFormCustProvinceId] = useState<number | null>(null);
  const [formCustCityId, setFormCustCityId] = useState<number | null>(null);
  const [formCustAddress, setFormCustAddress] = useState('');
  const [formCustLatitude, setFormCustLatitude] = useState('');
  const [formCustLongitude, setFormCustLongitude] = useState('');
  const [formCustType, setFormCustType] = useState<'Individual' | 'Company' | 'Government'>('Individual');
  const [formCustNotes, setFormCustNotes] = useState('');
  const [formCustIsVIP, setFormCustIsVIP] = useState(false);
  const [formCustEmail, setFormCustEmail] = useState('');
  
  // Geographic Data
  const [countries, setCountries] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  
  // Confirmation States
  const [pendingEditCustomer, setPendingEditCustomer] = useState<typeof customers[0] | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // Phone Management States
  const [customerPhones, setCustomerPhones] = useState<any[]>([]);
  const [phonesByCustomerId, setPhonesByCustomerId] = useState<Record<number, any[]>>({});
  const [phonesLoading, setPhonesLoading] = useState(false);
  const [showAddPhoneModal, setShowAddPhoneModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newPhoneType, setNewPhoneType] = useState('Mobile');
  const [newPhoneIsPrimary, setNewPhoneIsPrimary] = useState(true);
  const [addPhoneLoading, setAddPhoneLoading] = useState(false);
  const [deletePhoneId, setDeletePhoneId] = useState<number | null>(null);
  const [deletePhoneData, setDeletePhoneData] = useState<any>(null);
  const [editingPhoneId, setEditingPhoneId] = useState<number | null>(null);
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editPhoneType, setEditPhoneType] = useState('Mobile');
  const [editPhoneIsPrimary, setEditPhoneIsPrimary] = useState(false);
  const [editPhoneLoading, setEditPhoneLoading] = useState(false);

  // Email Management States
  const [customerEmails, setCustomerEmails] = useState<any[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [showAddEmailModal, setShowAddEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [addEmailLoading, setAddEmailLoading] = useState(false);
  const [deleteEmailId, setDeleteEmailId] = useState<number | null>(null);
  const [deleteEmailData, setDeleteEmailData] = useState<any>(null);
  const [editingEmailId, setEditingEmailId] = useState<number | null>(null);
  const [editEmailAddress, setEditEmailAddress] = useState('');
  const [editEmailType, setEditEmailType] = useState('work');
  const [editEmailIsPrimary, setEditEmailIsPrimary] = useState(false);
  const [editEmailLoading, setEditEmailLoading] = useState(false);
  const [statementScope, setStatementScope] = useState<'selected' | 'all'>('selected');
  const [statementPeriod, setStatementPeriod] = useState<'all' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [statementDateFrom, setStatementDateFrom] = useState('');
  const [statementDateTo, setStatementDateTo] = useState('');
  const [statementCustomerId, setStatementCustomerId] = useState<number | null>(null);
  const [statementCustomerSearch, setStatementCustomerSearch] = useState('');
  const [statementAllCustomersSearch, setStatementAllCustomersSearch] = useState('');
  const [showStatementCustomerSuggestions, setShowStatementCustomerSuggestions] = useState(false);
  const [statementPayments, setStatementPayments] = useState<ApiPaymentDto[]>([]);
  const [statementPaymentsLoading, setStatementPaymentsLoading] = useState(false);

  // Details View State
  const customerInvoices = useMemo(() => {
    if (!selectedCustomer) return [];
    return invoices.filter(i => i.customerId === selectedCustomer.id);
  }, [selectedCustomer, invoices]);

  const dueInvoices = useMemo(() => {
    return customerInvoices.filter(i => i.remainingAmount > 0);
  }, [customerInvoices]);

  const paidInvoices = useMemo(() => {
    return customerInvoices.filter(i => (i.remainingAmount || 0) <= 0 && (i.paidAmount || 0) > 0);
  }, [customerInvoices]);

  const customersById = useMemo(() => {
    return new Map(customers.map(customer => [customer.id, customer.name]));
  }, [customers]);
  
  // Clean up modals on mount
  useEffect(() => {
    setPendingEditCustomer(null);
    setShowSaveConfirmation(false);
    setDeleteId(null);
    setFullDataCustomer(null);
    setEditingPhoneId(null);
    setDeletePhoneId(null);
    setDeletePhoneData(null);
    setEditingEmailId(null);
    setDeleteEmailId(null);
    setDeleteEmailData(null);
  }, []);
  
  // Fetch Countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setGeoLoading(true);
        const accountId = user?.accountId || 1;
        const response = await fetch('http://localhost:5000/api/geographics/countries', {
          headers: { 'X-Account-Id': accountId.toString() }
        });
        if (response.ok) {
          const data = await response.json();
          // API returns array directly, not wrapped in { value: ... }
          const countriesList = Array.isArray(data) ? data : (data.value || []);
          setCountries(countriesList);
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      } finally {
        setGeoLoading(false);
      }
    };
    fetchCountries();
  }, []);

  // Fetch Provinces when Country changes
  useEffect(() => {
    const loadProvinces = async () => {
      if (!formCustCountryId) {
        setProvinces([]);
        setCities([]);
        return;
      }
      
      try {
        const accountId = user?.accountId || 1;
        const response = await fetch(`http://localhost:5000/api/geographics/provinces?countryId=${formCustCountryId}`, {
          headers: { 'X-Account-Id': accountId.toString() }
        });
        
        if (!response.ok) {
          console.error('Failed to fetch provinces:', response.status);
          return;
        }
        
        const data = await response.json();
        const provincesList = Array.isArray(data) ? data : (data.value || []);
        setProvinces(provincesList);
        
      } catch (error) {
        console.error('Error fetching provinces:', error);
      }
    };
    
    loadProvinces();
  }, [formCustCountryId, user?.accountId]);

  // Fetch Cities when Province changes
  useEffect(() => {
    if (formCustProvinceId) {
      const fetchCities = async () => {
        try {
          const accountId = user?.accountId || 1;
          const response = await fetch(`http://localhost:5000/api/geographics/cities?provinceId=${formCustProvinceId}`, {
            headers: { 'X-Account-Id': accountId.toString() }
          });
          if (response.ok) {
            const data = await response.json();
            // API returns array directly, not wrapped in { value: ... }
            const citiesList = Array.isArray(data) ? data : (data.value || []);
            setCities(citiesList);
            // Only clear city if it doesn't match the current province (when manually changing province)
            // Preserve existing city if it's already set (for edit mode)
            if (formCustCityId) {
              const cityExists = citiesList.some(c => c.id === formCustCityId);
              if (!cityExists) {
                setFormCustCityId(null);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching cities:', error);
        }
      };
      fetchCities();
    } else {
      setCities([]);
      setFormCustCityId(null);
    }
  }, [formCustProvinceId]);
  
  // Payment Modal State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payInvoiceId, setPayInvoiceId] = useState<number | null>(null);
  const [payMaxAmount, setPayMaxAmount] = useState<number>(0); // المبلغ المتبقي المستحق
  const [payInvoiceNumber, setPayInvoiceNumber] = useState<string>(''); // رقم الفاتورة للعرض
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [customerPayments, setCustomerPayments] = useState<ApiPaymentDto[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [verifiedInvoicePayments, setVerifiedInvoicePayments] = useState<Record<number, VerifiedPaymentMarker>>({});
  const verifiedPaymentsStorageKey = useMemo(
    () => `customers_verified_invoice_payments_v1_${user?.accountId ?? 'default'}`,
    [user?.accountId],
  );

  useEffect(() => {
    try {
      const rawValue = localStorage.getItem(verifiedPaymentsStorageKey);
      if (!rawValue) {
        setVerifiedInvoicePayments({});
        return;
      }

      const parsed = JSON.parse(rawValue) as Record<string, Partial<VerifiedPaymentMarker>>;
      const normalized: Record<number, VerifiedPaymentMarker> = {};

      Object.entries(parsed || {}).forEach(([invoiceIdKey, marker]) => {
        const invoiceId = Number(invoiceIdKey);
        const customerId = Number(marker?.customerId || 0);
        const paymentId = Number(marker?.paymentId || 0);

        if (!Number.isFinite(invoiceId) || invoiceId <= 0 || customerId <= 0 || paymentId <= 0) {
          return;
        }

        normalized[invoiceId] = {
          customerId,
          paymentId,
          amount: Number(marker?.amount || 0),
          verifiedAt: String(marker?.verifiedAt || ''),
          remainingBefore: Number(marker?.remainingBefore || 0),
          remainingAfter: Number(marker?.remainingAfter || 0),
        };
      });

      setVerifiedInvoicePayments(normalized);
    } catch {
      setVerifiedInvoicePayments({});
    }
  }, [verifiedPaymentsStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(verifiedPaymentsStorageKey, JSON.stringify(verifiedInvoicePayments));
    } catch {
      // Ignore storage errors (quota/private mode).
    }
  }, [verifiedPaymentsStorageKey, verifiedInvoicePayments]);

  const customerNameMaxLength = resolveMaxLength((permissions as any).customerNameMaxLength, 120, 20, 200);
  const customerAddressMaxLength = resolveMaxLength((permissions as any).customerAddressMaxLength, 220, 40, 400);
  const customerNotesMaxLength = resolveMaxLength((permissions as any).customerNotesMaxLength, 300, 50, 1000);
  const customerPhoneMaxLength = resolveMaxLength((permissions as any).customerPhoneMaxLength, 20, 8, 30);
  const customerEmailMaxLength = resolveMaxLength((permissions as any).customerEmailMaxLength, 120, 30, 200);

  const customerNameRemaining = customerNameMaxLength - formCustName.length;
  const customerAddressRemaining = customerAddressMaxLength - formCustAddress.length;
  const customerNotesRemaining = customerNotesMaxLength - formCustNotes.length;
  const customerPhoneRemaining = customerPhoneMaxLength - newPhone.length;
  const customerEmailRemaining = customerEmailMaxLength - formCustEmail.length;

  const normalizePhonePrimaryState = (phones: any[], preferredPrimaryId?: number) => {
    if (preferredPrimaryId !== undefined) {
      return phones.map((phone) => {
        const isPrimary = phone?.id === preferredPrimaryId;
        return {
          ...phone,
          isPrimary,
          isSecondary: !isPrimary,
        };
      });
    }

    let primaryAssigned = false;
    return phones.map((phone) => {
      const wantsPrimary = Boolean(phone?.isPrimary ?? phone?.IsPrimary);
      const isPrimary = wantsPrimary && !primaryAssigned;
      if (isPrimary) {
        primaryAssigned = true;
      }
      return {
        ...phone,
        isPrimary,
        isSecondary: !isPrimary,
      };
    });
  };

  // ==================== صلاحيات الصفحة (بعد كل الـ hooks) ====================
  const pagePerms = usePagePermission('customers');
  
  // إذا لم يكن لديه صلاحية عرض الصفحة
  if (pagePerms.checked && !pagePerms.canView) {
    return <AccessDenied />;
  }
  
  // Date Range Helper
  const setDateRange = (type: 'all' | 'week' | 'month' | 'year') => {
    const today = new Date();
    let start = new Date();
    const end = today;
    
    if (type === 'all') {
      setFilterDateFrom('');
      setFilterDateTo('');
      setFilterPeriod('all');
      return;
    } else if (type === 'week') {
      start = new Date(today);
      start.setDate(today.getDate() - 7);
    } else if (type === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (type === 'year') {
      start = new Date(today.getFullYear(), 0, 1);
    }
    
    const formatDateValue = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    setFilterDateFrom(formatDateValue(start));
    setFilterDateTo(formatDateValue(end));
    setFilterPeriod(type);
  };

  const setStatementDateRange = (type: 'all' | 'week' | 'month' | 'year') => {
    const today = new Date();
    let start = new Date();
    const end = today;

    if (type === 'all') {
      setStatementDateFrom('');
      setStatementDateTo('');
      setStatementPeriod('all');
      return;
    } else if (type === 'week') {
      start = new Date(today);
      start.setDate(today.getDate() - 7);
    } else if (type === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (type === 'year') {
      start = new Date(today.getFullYear(), 0, 1);
    }

    const formatDateValue = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setStatementDateFrom(formatDateValue(start));
    setStatementDateTo(formatDateValue(end));
    setStatementPeriod(type);
  };

  const fetchCustomerPayments = useCallback(async (customerId: number) => {
    setPaymentsLoading(true);
    try {
      const payments = await paymentsApi.getByCustomer(customerId);
      setCustomerPayments(payments);
    } catch (err) {
      console.error('فشل في جلب الدفعات:', err);
      setCustomerPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerPayments(selectedCustomer.id);
    } else {
      setCustomerPayments([]);
    }
  }, [selectedCustomer, fetchCustomerPayments]);

  const normalizedStatementFromDate = useMemo(() => {
    if (!statementDateFrom) return null;
    const value = new Date(statementDateFrom);
    if (Number.isNaN(value.getTime())) return null;
    value.setHours(0, 0, 0, 0);
    return value;
  }, [statementDateFrom]);

  const normalizedStatementToDate = useMemo(() => {
    if (!statementDateTo) return null;
    const value = new Date(statementDateTo);
    if (Number.isNaN(value.getTime())) return null;
    value.setHours(23, 59, 59, 999);
    return value;
  }, [statementDateTo]);

  const statementSelectedCustomer = useMemo(() => {
    if (!statementCustomerId) {
      return null;
    }
    return customers.find(customer => customer.id === statementCustomerId) || null;
  }, [customers, statementCustomerId]);

  const filteredStatementCustomerSuggestions = useMemo(() => {
    const normalizedSearch = statementCustomerSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return customers.slice(0, 20);
    }

    return customers
      .filter(customer => {
        const customerName = (customer.name || '').toLowerCase();
        const customerPhone = (customer.phone || '').toLowerCase();
        return customerName.includes(normalizedSearch) || customerPhone.includes(normalizedSearch);
      })
      .slice(0, 20);
  }, [customers, statementCustomerSearch]);

  const statementScopedInvoices = useMemo(() => {
    const baseInvoices = statementScope === 'all'
      ? invoices
      : statementCustomerId
        ? invoices.filter(invoice => invoice.customerId === statementCustomerId)
        : [];

    const normalizedAllSearch = statementAllCustomersSearch.trim().toLowerCase();

    return baseInvoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.date);
      if (!Number.isNaN(invoiceDate.getTime())) {
        if (normalizedStatementFromDate && invoiceDate < normalizedStatementFromDate) {
          return false;
        }
        if (normalizedStatementToDate && invoiceDate > normalizedStatementToDate) {
          return false;
        }
      }

      if (statementScope === 'all' && normalizedAllSearch) {
        const customerName = (invoice.customerName || (typeof invoice.customerId === 'number' ? customersById.get(invoice.customerId) : '') || '').toLowerCase();
        return customerName.includes(normalizedAllSearch);
      }

      return true;
    });
  }, [
    statementScope,
    invoices,
    statementCustomerId,
    normalizedStatementFromDate,
    normalizedStatementToDate,
    statementAllCustomersSearch,
    customersById,
  ]);

  const statementDueInvoices = useMemo(() => {
    return statementScopedInvoices.filter(invoice => invoice.remainingAmount > 0);
  }, [statementScopedInvoices]);

  const statementPaidInvoices = useMemo(() => {
    return statementScopedInvoices.filter(invoice => (invoice.remainingAmount || 0) <= 0 && (invoice.paidAmount || 0) > 0);
  }, [statementScopedInvoices]);

  const fetchStatementPayments = useCallback(async (params: { customerId?: number; fromDate?: string; toDate?: string } = {}) => {
    setStatementPaymentsLoading(true);
    try {
      const result = await paymentsApi.getAll(params);
      setStatementPayments(result.payments);
    } catch (error) {
      console.error('فشل في جلب دفعات كشف الحساب:', error);
      setStatementPayments([]);
    } finally {
      setStatementPaymentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view !== 'statement') {
      return;
    }

    if (statementScope === 'selected' && !statementCustomerId) {
      setStatementPayments([]);
      return;
    }

    fetchStatementPayments({
      customerId: statementScope === 'selected' ? statementCustomerId || undefined : undefined,
      fromDate: statementDateFrom || undefined,
      toDate: statementDateTo || undefined,
    });
  }, [
    view,
    statementScope,
    statementCustomerId,
    statementDateFrom,
    statementDateTo,
    fetchStatementPayments,
  ]);

  const extractPhoneValue = (phoneItem: any) => {
    return (
      phoneItem?.phoneNumber ||
      phoneItem?.PhoneNumber ||
      phoneItem?.Phone ||
      phoneItem?.phone ||
      phoneItem?.number ||
      ''
    ).toString().trim();
  };

  const extractPhoneEntityId = (phoneItem: any) => {
    const rawEntityId = phoneItem?.entityId ?? phoneItem?.EntityId ?? phoneItem?.customerId ?? phoneItem?.CustomerId;
    const entityId = Number(rawEntityId);
    return Number.isFinite(entityId) ? entityId : null;
  };

  const customerIdsKey = useMemo(() => {
    return customers.map(c => c.id).sort((firstId, secondId) => firstId - secondId).join(',');
  }, [customers]);

  useEffect(() => {
    const loadCustomersPhonesMap = async () => {
      if (!user?.accountId || customers.length === 0) {
        setPhonesByCustomerId({});
        return;
      }

      try {
        const response = await fetch('http://localhost:5000/api/phonenumbers?entityType=Customer', {
          headers: { 'X-Account-Id': user.accountId.toString() }
        });

        if (!response.ok) {
          setPhonesByCustomerId({});
          return;
        }

        const payload = await response.json();
        const phonesList = Array.isArray(payload) ? payload : (payload.data || []);
        const customerIdsSet = new Set(customers.map(customer => customer.id));
        const nextPhonesByCustomerId: Record<number, any[]> = {};

        phonesList.forEach((phoneItem: any) => {
          const entityId = extractPhoneEntityId(phoneItem);
          if (!entityId || !customerIdsSet.has(entityId)) {
            return;
          }

          if (!nextPhonesByCustomerId[entityId]) {
            nextPhonesByCustomerId[entityId] = [];
          }

          nextPhonesByCustomerId[entityId].push(phoneItem);
        });

        setPhonesByCustomerId(nextPhonesByCustomerId);
      } catch {
        setPhonesByCustomerId({});
      }
    };

    loadCustomersPhonesMap();
  }, [user?.accountId, customerIdsKey]);

  const getCustomerSortValue = (customer: typeof customers[number]) => {
    const createdAtValue = customer.createdAt ? new Date(customer.createdAt).getTime() : NaN;
    if (!Number.isNaN(createdAtValue) && createdAtValue > 0) {
      return createdAtValue;
    }

    const joinDateValue = customer.joinDate ? new Date(customer.joinDate).getTime() : NaN;
    if (!Number.isNaN(joinDateValue) && joinDateValue > 0) {
      return joinDateValue;
    }

    return 0;
  };

  const getCustomerLocationText = (customer: typeof customers[number]) => {
    return [customer.countryName, customer.provinceName, customer.cityName].filter(Boolean).join(' • ');
  };

  const buildLocationText = (country?: string | null, province?: string | null, city?: string | null) => {
    return [country, province, city]
      .map(value => (value || '').toString().trim())
      .filter(Boolean)
      .join(' - ');
  };

  const normalizeAddressText = (address?: string) => {
    const rawAddress = removeCoordinateTokenFromAddress(address || '');
    if (!rawAddress) {
      return '';
    }

    return rawAddress.replace(/^\s*(العنوان|عنوان|address)\s*[:：-]?\s*/i, '').trim();
  };

  const stripLeadingLocationFromAddress = (addressText: string, locationText: string) => {
    const normalizedAddress = (addressText || '').trim();
    const normalizedLocation = (locationText || '').trim();

    if (!normalizedAddress || !normalizedLocation) {
      return normalizedAddress;
    }

    const locationVariants = [
      normalizedLocation,
      normalizedLocation.replace(/\s*-\s*/g, ' • '),
      normalizedLocation.replace(/\s*-\s*/g, ' ')
    ].filter(Boolean);

    let result = normalizedAddress;
    for (const variant of locationVariants) {
      if (result.startsWith(variant)) {
        result = result.slice(variant.length).trim().replace(/^[\s\-•،,:|]+/, '').trim();
        break;
      }
    }

    return result;
  };

  const buildDetailedAddress = (country?: string | null, province?: string | null, city?: string | null, address?: string) => {
    const locationText = buildLocationText(country, province, city);
    const normalizedAddress = normalizeAddressText(address);
    const addressDetailsOnly = stripLeadingLocationFromAddress(normalizedAddress, locationText);

    return [locationText, addressDetailsOnly].filter(Boolean).join(' - ').trim();
  };

  const getAddressDetailsOnly = (country?: string | null, province?: string | null, city?: string | null, address?: string) => {
    const locationText = buildLocationText(country, province, city);
    const normalizedAddress = normalizeAddressText(address);
    return stripLeadingLocationFromAddress(normalizedAddress, locationText);
  };

  const selectedCountryName = useMemo(
    () => countries.find(c => c.id === formCustCountryId)?.name || '',
    [countries, formCustCountryId]
  );

  const selectedProvinceName = useMemo(
    () => provinces.find(p => p.id === formCustProvinceId)?.name || '',
    [provinces, formCustProvinceId]
  );

  const selectedCityName = useMemo(
    () => cities.find(c => c.id === formCustCityId)?.name || '',
    [cities, formCustCityId]
  );

  const formDetailedAddressPreview = useMemo(
    () => buildDetailedAddress(selectedCountryName, selectedProvinceName, selectedCityName, formCustAddress),
    [selectedCountryName, selectedProvinceName, selectedCityName, formCustAddress]
  );

  const formCoordinatesPreview = useMemo(
    () => validateCoordinateInputs(formCustLatitude, formCustLongitude),
    [formCustLatitude, formCustLongitude]
  );

  const selectedCustomerDetailedAddress = selectedCustomer
    ? buildDetailedAddress(selectedCustomer.countryName, selectedCustomer.provinceName, selectedCustomer.cityName, selectedCustomer.address)
    : '';

  const openCustomerLocationOnMap = () => {
    const fallbackQuery = [
      buildDetailedAddress(selectedCountryName, selectedProvinceName, selectedCityName, formCustAddress),
      formCustName,
    ]
      .filter(Boolean)
      .join(' - ');

    const mapUrl = buildMapUrl(formCustLatitude, formCustLongitude, fallbackQuery);
    window.open(mapUrl, '_blank', 'noopener,noreferrer');
  };

  const detectCustomerLocation = () => {
    if (!navigator.geolocation) {
      notify('المتصفح لا يدعم تحديد الموقع الجغرافي.', 'error');
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormCustLatitude(position.coords.latitude.toFixed(6));
        setFormCustLongitude(position.coords.longitude.toFixed(6));
        notify('تم تحديد إحداثيات الموقع الحالي.', 'success');
        setDetectingLocation(false);
      },
      () => {
        notify('تعذر تحديد الموقع الحالي. تأكد من منح صلاحية الموقع.', 'error');
        setDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  const normalizeNotesText = (notes?: string) => {
    const rawNotes = (notes || '').trim();
    if (!rawNotes) {
      return '';
    }

    return rawNotes.replace(/^\s*(ملاحظات|ملاحظة|notes?)\s*[:：-]?\s*/i, '').trim();
  };

  const renderColoredDateTime = (dateValue: string | Date | null | undefined, wrapperClassName: string = '') => {
    const dateText = formatDate(dateValue);
    const timeText = formatTime(dateValue);
    const hasTime = !!timeText && timeText !== '-';

    return (
      <span className={`inline-flex items-center gap-1.5 ${wrapperClassName}`.trim()}>
        <span className="text-slate-600 dark:text-slate-300 print:text-black">{dateText}</span>
        {hasTime && (
          <>
            <span className="text-slate-300 dark:text-slate-600 print:text-gray-400">|</span>
            <span className="text-sky-500 dark:text-sky-300 print:text-black">{timeText}</span>
          </>
        )}
      </span>
    );
  };

  const getCustomerPhoneDetails = (customer: typeof customers[number]) => {
    const customerAny = customer as any;
    const phonesFromMap = Array.isArray(phonesByCustomerId[customer.id]) ? phonesByCustomerId[customer.id] : [];
    const phonesFromModel = Array.isArray(customerAny.phones) ? customerAny.phones : [];
    const phonesFromLegacy = Array.isArray(customerAny.phoneNumbers) ? customerAny.phoneNumbers : [];
    const allPhones = [...phonesFromMap, ...phonesFromModel, ...phonesFromLegacy];

    const uniquePhones = Array.from(
      new Set(allPhones.map(extractPhoneValue).filter((phone: string) => phone.length > 0))
    );

    const primaryPhoneItem = allPhones.find((phoneItem: any) => phoneItem?.isPrimary || phoneItem?.IsPrimary);
    const primaryPhoneFromList = primaryPhoneItem ? extractPhoneValue(primaryPhoneItem) : '';
    const fallbackPhone = (customer.phone || '').toString().trim();
    const resolvedPrimaryPhone = primaryPhoneFromList || uniquePhones[0] || fallbackPhone;
    const hasPhone = resolvedPrimaryPhone.length > 0;
    const primaryPhone = hasPhone ? resolvedPrimaryPhone : CONTACT_PLACEHOLDER_PHONE;
    const extraPhonesCount = uniquePhones.filter((phone: string) => phone !== primaryPhone).length;
    const phonesTitle = uniquePhones.length > 0 ? uniquePhones.join(', ') : fallbackPhone;

    return {
      primaryPhone,
      hasPhone,
      extraPhonesCount,
      phonesTitle,
    };
  };

  const filteredCustomers = useMemo(() => {
    const normalizedSearchQuery = (searchQuery || '').toLowerCase().trim();

    return customers.filter(c => {
      // فلتر البحث
      const customerName = (c.name || '').toLowerCase();
      const customerNameEn = (c.nameEn || '').toLowerCase();
      const customerLocationText = getCustomerLocationText(c);
      const customerAddressText = normalizeAddressText(c.address);

      const locationRawSearchText = (customerLocationText || '').toLowerCase();
      const locationPlainSearchText = (customerLocationText || '')
        .replace(/[•|،,\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      const addressSearchText = (customerAddressText || '').toLowerCase();
      const fullAddressSearchText = `${customerLocationText || ''} ${customerAddressText || ''}`
        .replace(/[•|،,\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      const matchesSearch = !normalizedSearchQuery ||
        customerName.includes(normalizedSearchQuery) ||
        customerNameEn.includes(normalizedSearchQuery) ||
        locationRawSearchText.includes(normalizedSearchQuery) ||
        locationPlainSearchText.includes(normalizedSearchQuery) ||
        addressSearchText.includes(normalizedSearchQuery) ||
        fullAddressSearchText.includes(normalizedSearchQuery);
      
      // فلتر التاريخ - بناءً على تاريخ آخر فاتورة للعميل
      let matchesDate = true;
      if (filterDateFrom || filterDateTo) {
        // جلب فواتير هذا العميل
        const customerInvs = invoices.filter(inv => inv.customerId === c.id);
        if (customerInvs.length === 0) {
          matchesDate = false; // إذا لا توجد فواتير، لا يظهر في الفلتر
        } else {
          // التحقق من وجود فاتورة واحدة على الأقل ضمن الفترة
          matchesDate = customerInvs.some(inv => {
            const invDate = new Date(inv.date);
            let inRange = true;
            if (filterDateFrom) {
              const fromDate = new Date(filterDateFrom);
              inRange = inRange && invDate >= fromDate;
            }
            if (filterDateTo) {
              const toDate = new Date(filterDateTo);
              toDate.setHours(23, 59, 59);
              inRange = inRange && invDate <= toDate;
            }
            return inRange;
          });
        }
      }
      
      return matchesSearch && matchesDate;
    }).sort((firstCustomer, secondCustomer) => {
      const firstSortValue = getCustomerSortValue(firstCustomer);
      const secondSortValue = getCustomerSortValue(secondCustomer);

      if (secondSortValue !== firstSortValue) {
        return secondSortValue - firstSortValue;
      }

      return secondCustomer.id - firstCustomer.id;
    });
  }, [customers, searchQuery, filterDateFrom, filterDateTo, invoices]);

  // Handle Form Submission (Start request)
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustName) {
        notify('اسم العميل مطلوب', 'error');
        return;
    }

    if (formCustName.length > customerNameMaxLength) {
      notify(`اسم العميل يتجاوز الحد المسموح (${customerNameMaxLength})`, 'error');
      return;
    }

    if (formCustAddress.length > customerAddressMaxLength) {
      notify(`تفاصيل العنوان تتجاوز الحد المسموح (${customerAddressMaxLength})`, 'error');
      return;
    }

    if (formCustNotes.length > customerNotesMaxLength) {
      notify(`الملاحظات تتجاوز الحد المسموح (${customerNotesMaxLength})`, 'error');
      return;
    }

    if (newPhone.trim().length > customerPhoneMaxLength) {
      notify(`رقم الهاتف يتجاوز الحد المسموح (${customerPhoneMaxLength})`, 'error');
      return;
    }

    if (formCustEmail.trim().length > customerEmailMaxLength) {
      notify(`البريد الإلكتروني يتجاوز الحد المسموح (${customerEmailMaxLength})`, 'error');
      return;
    }

    const coordinateValidation = validateCoordinateInputs(formCustLatitude, formCustLongitude);
    if (!coordinateValidation.isValid) {
      notify(coordinateValidation.message || 'الإحداثيات غير صحيحة.', 'error');
      return;
    }
    
    if (editingCustomerId) {
        setShowSaveConfirmation(true);
    } else {
        performSaveCustomer();
    }
  };

  const performSaveCustomer = async () => {
    setFormLoading(true);
    let saveSucceeded = false;
    try {
        const resolvedAddressWithCoordinates = composeAddressWithCoordinates(
          formCustAddress,
          formCustLatitude,
          formCustLongitude
        );

        let customerId: number;
        
        // إضافة الهاتف الحالي إلى قائمة الهواتف إذا لم يكن مضافاً
        let finalPhones = [...customerPhones];
        let preferredPrimaryPhoneId: number | undefined;
        if (newPhone.trim() && !finalPhones.some(p => (p.phone || p.number) === newPhone)) {
            const draftPhoneId = Date.now();
            finalPhones.push({ id: draftPhoneId, phone: newPhone, phoneType: newPhoneType, isPrimary: newPhoneIsPrimary, isSecondary: !newPhoneIsPrimary });
            if (newPhoneIsPrimary) {
              preferredPrimaryPhoneId = draftPhoneId;
            }
        }
        finalPhones = normalizePhonePrimaryState(finalPhones, preferredPrimaryPhoneId);
        
        // إضافة البريد الإلكتروني الحالي إلى قائمة البريد إذا لم يكن مضافاً
        let finalEmails = [...customerEmails];
        if (newEmail.trim() && !finalEmails.some(e => (e.emailAddress || e.email) === newEmail)) {
            finalEmails.push({ id: Date.now(), emailAddress: newEmail, isPrimary: customerEmails.length === 0 });
        }
        
        const parseApiError = async (response: Response, fallbackMessage: string) => {
          try {
            const errorData = await response.json();
            return errorData?.message || errorData?.error || fallbackMessage;
          } catch {
            return fallbackMessage;
          }
        };

        if (editingCustomerId) {
            // في حالة التعديل
            const customerIdToEdit = editingCustomerId;

            await apiUpdateCustomer(editingCustomerId, { 
                name: formCustName,
                countryId: formCustCountryId,
                provinceId: formCustProvinceId,
                cityId: formCustCityId,
              address: resolvedAddressWithCoordinates,
                type: formCustType,
                notes: formCustNotes,
                isVIP: formCustIsVIP,
                primaryEmailAddress: formCustEmail
            });
            
            // Handle phone changes
            const accountId = user?.accountId || 1;
            const userId = user?.id || 1;

            // Fetch current phones from API to compare accurately
            const currentPhonesResponse = await fetch(`http://localhost:5000/api/phonenumbers?entityType=Customer&entityId=${customerIdToEdit}`, {
              headers: {
                'X-Account-Id': accountId.toString(),
                'X-User-Id': userId.toString()
              }
            });
            const currentPhonesData = currentPhonesResponse.ok ? await currentPhonesResponse.json() : [];
            const currentPhones = Array.isArray(currentPhonesData) ? currentPhonesData : (currentPhonesData.data || []);
            const currentPhoneIds = new Set(currentPhones.map((p: any) => p.id));

            const finalPhonesClean = finalPhones.filter(p => (p.phone || p.number || '').toString().trim() !== '');
            const finalExistingPhoneIds = new Set(
              finalPhonesClean
                .filter(p => p.id && currentPhoneIds.has(p.id))
                .map(p => p.id)
            );
            
            // Remove deleted phones (those in currentPhones but not in finalPhones)
            for (const existingPhone of currentPhones) {
              if (!finalExistingPhoneIds.has(existingPhone.id)) {
                try {
                  await fetch(`http://localhost:5000/api/phonenumbers/${existingPhone.id}`, {
                    method: 'DELETE',
                    headers: {
                      'X-Account-Id': accountId.toString(),
                      'X-User-Id': userId.toString()
                    }
                  });
                } catch (err) {
                  console.error('Error deleting phone:', err);
                }
              }
            }
            
            // Update or add phones
            for (let i = 0; i < finalPhonesClean.length; i++) {
              const phone = finalPhonesClean[i];
              const isExisting = !!(phone.id && currentPhoneIds.has(phone.id));
              
              if (isExisting && phone.id) {
                // Update existing phone
                try {
                  const updateResponse = await fetch(`http://localhost:5000/api/phonenumbers/${phone.id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Account-Id': accountId.toString()
                    },
                    body: JSON.stringify({
                      Phone: phone.phone || phone.number,
                      PhoneType: phone.phoneType || phone.type || 'Mobile',
                      IsPrimary: Boolean(phone.isPrimary ?? phone.IsPrimary)
                    })
                  });
                  if (!updateResponse.ok) {
                    const message = await parseApiError(updateResponse, 'فشل تحديث الهاتف');
                    throw new Error(message);
                  }
                } catch (phoneErr) {
                  console.error('Error updating phone:', phoneErr);
                  throw phoneErr;
                }
              } else {
                try {
                  const phoneResponse = await fetch('http://localhost:5000/api/phonenumbers', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Account-Id': accountId.toString()
                    },
                    body: JSON.stringify({
                      AccountId: accountId,
                      EntityType: 'Customer',
                      EntityId: customerIdToEdit,
                      Phone: phone.phone || phone.number,
                      PhoneType: phone.phoneType || phone.type || 'Mobile',
                      IsPrimary: Boolean(phone.isPrimary ?? phone.IsPrimary)
                    })
                  });
                  if (!phoneResponse.ok) {
                    const message = await parseApiError(phoneResponse, 'فشل إضافة الهاتف');
                    throw new Error(message);
                  }
                } catch (phoneErr) {
                  console.error('Error adding phone:', phoneErr);
                  throw phoneErr;
                }
              }
            }

            // Handle email changes
            const currentEmailsResponse = await fetch(`http://localhost:5000/api/emails?entityType=Customer&entityId=${customerIdToEdit}`, {
              headers: {
                'X-Account-Id': accountId.toString(),
                'X-User-Id': userId.toString()
              }
            });
            const currentEmailsData = currentEmailsResponse.ok ? await currentEmailsResponse.json() : [];
            const currentEmails = Array.isArray(currentEmailsData) ? currentEmailsData : (currentEmailsData.data || []);
            const currentEmailIds = new Set(currentEmails.map((e: any) => e.id));

            const finalEmailsClean = finalEmails.filter(e => (e.emailAddress || e.email || '').toString().trim() !== '');
            const finalExistingEmailIds = new Set(
              finalEmailsClean
                .filter(e => e.id && currentEmailIds.has(e.id))
                .map(e => e.id)
            );

            for (const existingEmail of currentEmails) {
              if (!finalExistingEmailIds.has(existingEmail.id)) {
                try {
                  await fetch(`http://localhost:5000/api/emails/${existingEmail.id}`, {
                    method: 'DELETE',
                    headers: {
                      'X-Account-Id': accountId.toString(),
                      'X-User-Id': userId.toString()
                    }
                  });
                } catch (err) {
                  console.error('Error deleting email:', err);
                }
              }
            }

            for (let i = 0; i < finalEmailsClean.length; i++) {
              const email = finalEmailsClean[i];
              const isExisting = !!(email.id && currentEmailIds.has(email.id));

              if (isExisting && email.id) {
                try {
                  const updateEmailResponse = await fetch(`http://localhost:5000/api/emails/${email.id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Account-Id': accountId.toString()
                    },
                    body: JSON.stringify({
                      EmailAddress: email.emailAddress || email.email,
                      EmailType: email.emailType || email.type || 'work',
                      IsPrimary: i === 0
                    })
                  });
                  if (!updateEmailResponse.ok) {
                    const message = await parseApiError(updateEmailResponse, 'فشل تحديث البريد الإلكتروني');
                    throw new Error(message);
                  }
                } catch (emailErr) {
                  console.error('Error updating email:', emailErr);
                  throw emailErr;
                }
              } else {
                try {
                  const emailResponse = await fetch('http://localhost:5000/api/emails', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Account-Id': accountId.toString()
                    },
                    body: JSON.stringify({
                      AccountId: accountId,
                      EntityType: 'Customer',
                      EntityId: customerIdToEdit,
                      EmailAddress: email.emailAddress || email.email,
                      EmailType: email.emailType || email.type || 'work',
                      IsPrimary: i === 0
                    })
                  });
                  if (!emailResponse.ok) {
                    const message = await parseApiError(emailResponse, 'فشل إضافة البريد الإلكتروني');
                    throw new Error(message);
                  }
                } catch (emailErr) {
                  console.error('Error adding email:', emailErr);
                  throw emailErr;
                }
              }
            }
            
            notify('تم تعديل بيانات العميل بنجاح', 'success');

            if (refreshCustomers) {
              await refreshCustomers();
            }

            // بعد التعديل: العودة للقائمة بدلاً من شاشة كشف الحساب
            setSelectedCustomer(null);
            setView('list');
            
            setEditingCustomerId(null);
            saveSucceeded = true;
        } else {
            // في حالة الإضافة الجديدة
            const newCustomer = await apiAddCustomer({ 
                name: formCustName,
                countryId: formCustCountryId,
                provinceId: formCustProvinceId,
                cityId: formCustCityId,
              address: resolvedAddressWithCoordinates,
                type: formCustType,
                notes: formCustNotes,
                isVIP: formCustIsVIP,
                primaryEmailAddress: formCustEmail
            });
            customerId = newCustomer.id;
            
            // Add all phones
            if (finalPhones.length > 0) {
                const accountId = user?.accountId || 1;
                for (let i = 0; i < finalPhones.length; i++) {
                    const phone = finalPhones[i];
                    try {
                        const phoneResponse = await fetch('http://localhost:5000/api/phonenumbers', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Account-Id': accountId.toString()
                            },
                            body: JSON.stringify({
                                AccountId: accountId,
                                EntityType: 'Customer',
                                EntityId: customerId,
                                Phone: phone.phone || phone.number,
                                PhoneType: phone.phoneType || phone.type || 'mobile',
                                IsPrimary: Boolean(phone.isPrimary ?? phone.IsPrimary)
                            })
                        });
                        if (!phoneResponse.ok) {
                            const errorData = await phoneResponse.json();
                            console.error('Error adding phone for new customer - Server response:', errorData);
                        }
                    } catch (phoneErr) {
                        console.error('Error adding phone for new customer:', phoneErr);
                    }
                }
            }
            
            // Add all emails
            if (finalEmails.length > 0) {
                const accountId = user?.accountId || 1;
                for (let i = 0; i < finalEmails.length; i++) {
                    const email = finalEmails[i];
                    try {
                        const emailResponse = await fetch('http://localhost:5000/api/emails', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Account-Id': accountId.toString()
                            },
                            body: JSON.stringify({
                                AccountId: accountId,
                                EntityType: 'Customer',
                                EntityId: customerId,
                                EmailAddress: email.emailAddress || email.email,
                                IsPrimary: i === 0
                            })
                        });
                        if (!emailResponse.ok) {
                            const errorData = await emailResponse.json();
                            console.error('Error adding email for new customer - Server response:', errorData);
                        }
                    } catch (emailErr) {
                        console.error('Error adding email for new customer:', emailErr);
                    }
                }
            }
            
            notify('تم إضافة العميل بنجاح', 'success');

            // Refresh the customer list
            if (refreshCustomers) {
              await refreshCustomers();
            }

            // بعد الإضافة: العودة للقائمة وعدم فتح كشف الحساب تلقائياً
            setSelectedCustomer(null);
            setView('list');
            saveSucceeded = true;
        }
        
        setFormCustName('');
        setFormCustCountryId(null);
        setFormCustProvinceId(null);
        setFormCustCityId(null);
        setFormCustAddress('');
        setFormCustLatitude('');
        setFormCustLongitude('');
        setFormCustType('Individual');
        setFormCustNotes('');
        setFormCustIsVIP(false);
        setFormCustEmail('');
        setCustomerPhones([]);
        setCustomerEmails([]);
        setNewPhone('');
        setNewEmail('');
        setNewPhoneType('Mobile');
        setNewPhoneIsPrimary(true);
        setShowAdvancedOptions(false);
        setEditingPhoneId(null);
        setEditingEmailId(null);
    } catch (err: any) {
        notify(err.message || 'حدث خطأ أثناء الحفظ', 'error');
    } finally {
        // حماية إضافية: بعد أي حفظ ناجح لا نسمح بالانتقال لكشف الحساب تلقائياً
        if (saveSucceeded) {
          setSelectedCustomer(null);
          setEditingCustomerId(null);
          setView('list');
        }
        setFormLoading(false);
        setShowSaveConfirmation(false);
    }
  };

  // Start Editing Flow
  const requestEditCustomer = (customer: typeof customers[0]) => {
      setPendingEditCustomer(customer);
  };

  const confirmEditCustomer = async () => {
      if (pendingEditCustomer) {
          const parsedCustomerAddress = parseAddressCoordinates(pendingEditCustomer.address || '');
          setEditingCustomerId(pendingEditCustomer.id);
          setFormCustName(pendingEditCustomer.name);
          setFormCustCountryId(pendingEditCustomer.countryId || null);
          setFormCustProvinceId(pendingEditCustomer.provinceId || null);
          setFormCustCityId(pendingEditCustomer.cityId || null);
          setFormCustAddress(
            getAddressDetailsOnly(
              pendingEditCustomer.countryName,
              pendingEditCustomer.provinceName,
              pendingEditCustomer.cityName,
              parsedCustomerAddress.cleanAddress
            )
          );
          setFormCustLatitude(parsedCustomerAddress.latitude);
          setFormCustLongitude(parsedCustomerAddress.longitude);
          setFormCustType(pendingEditCustomer.type || 'Individual');
          setFormCustNotes(pendingEditCustomer.notes || '');
          setFormCustIsVIP(pendingEditCustomer.isVIP || false);
          setFormCustEmail(pendingEditCustomer.primaryEmailAddress || '');
          
          // Load fresh phones from server (not from old customer list)
          const freshPhones = await fetchCustomerPhones(pendingEditCustomer.id);
          if (freshPhones && freshPhones.length > 0) {
            setCustomerPhones(freshPhones);
            setNewPhoneIsPrimary(false);
          } else {
            setCustomerPhones([]);
            setNewPhoneIsPrimary(true);
          }

          // Load fresh emails from server (not from old customer list)
          const freshEmails = await fetchCustomerEmails(pendingEditCustomer.id);
          if (freshEmails && freshEmails.length > 0) {
            setCustomerEmails(freshEmails);
          } else {
            setCustomerEmails([]);
          }
          
            // لا نعرض إشعار هنا لتجنب كثرة التنبيهات أثناء التنقل بين الشاشات
          setPendingEditCustomer(null);
          setView('create');
      }
  };

  const cancelEdit = () => {
      setEditingCustomerId(null);
      setFormCustName('');
      setFormCustCountryId(null);
      setFormCustProvinceId(null);
      setFormCustCityId(null);
      setFormCustAddress('');
      setFormCustLatitude('');
      setFormCustLongitude('');
      setFormCustType('Individual');
      setFormCustNotes('');
      setFormCustIsVIP(false);
      setFormCustEmail('');
      setCustomerPhones([]);
      setCustomerEmails([]);
      setNewPhone('');
      setNewEmail('');
      setNewPhoneType('Mobile');
        setNewPhoneIsPrimary(true);
      setShowAdvancedOptions(false);
      setView('list');
  };

  const openDetails = (customer: typeof customers[0]) => {
    setSelectedCustomer(customer);
    setView('detail');
    // Load fresh data from server
    if (customer.id) {
      fetchCustomerPhones(customer.id);
      fetchCustomerEmails(customer.id);
    }
  };

  // Fetch customer phones - using generic endpoint
  const fetchCustomerPhones = async (customerId: number) => {
    setPhonesLoading(true);
    try {
      const accountId = user?.accountId || 1;
      const response = await fetch(`http://localhost:5000/api/phonenumbers?entityType=Customer&entityId=${customerId}`, {
        headers: { 'X-Account-Id': accountId.toString() }
      });
      if (response.ok) {
        const data = await response.json();
        const phonesList = Array.isArray(data) ? data : (data.data || []);
        // Mark all fetched phones as existing
        const phonesWithFlag = phonesList.map((p: any) => ({ ...p, isExisting: true }));
        setCustomerPhones(phonesWithFlag);
        setPhonesByCustomerId(prev => ({ ...prev, [customerId]: phonesWithFlag }));
        // Also update selectedCustomer phones
        if (selectedCustomer && selectedCustomer.id === customerId) {
          setSelectedCustomer(prev => ({
            ...prev,
            phones: phonesWithFlag
          }));
        }
        return phonesWithFlag;
      }
    } catch (error) {
      console.error('Error fetching customer phones:', error);
      setCustomerPhones([]);
      return [];
    } finally {
      setPhonesLoading(false);
    }
  };

  // Fetch customer emails - using generic endpoint
  const fetchCustomerEmails = async (customerId: number) => {
    setEmailsLoading(true);
    try {
      const accountId = user?.accountId || 1;
      const response = await fetch(`http://localhost:5000/api/emails?entityType=Customer&entityId=${customerId}`, {
        headers: { 'X-Account-Id': accountId.toString() }
      });
      if (response.ok) {
        const data = await response.json();
        const emailsList = Array.isArray(data) ? data : (data.data || []);
        // Mark all fetched emails as existing
        const emailsWithFlag = emailsList.map((e: any) => ({ ...e, isExisting: true }));
        setCustomerEmails(emailsWithFlag);
        // Also update selectedCustomer emails
        if (selectedCustomer && selectedCustomer.id === customerId) {
          setSelectedCustomer(prev => ({
            ...prev,
            emails: emailsWithFlag
          }));
        }
        return emailsWithFlag;
      }
    } catch (error) {
      console.error('Error fetching customer emails:', error);
      setCustomerEmails([]);
      return [];
    } finally {
      setEmailsLoading(false);
    }
  };

  // Add customer phone
  const handleAddPhone = async () => {
    if (!newPhone || !selectedCustomer) {
      notify('يرجى إدخال رقم الهاتف', 'warning');
      return;
    }

    setAddPhoneLoading(true);
    try {
      const accountId = user?.accountId || 1;
      console.log('Adding phone:', { customerId: selectedCustomer.id, phoneNumber: newPhone, phoneType: newPhoneType, isPrimary: newPhoneIsPrimary });
      const response = await fetch('http://localhost:5000/api/phonenumbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Account-Id': accountId.toString()
        },
        body: JSON.stringify({
          AccountId: accountId,
          EntityType: 'Customer',
          EntityId: selectedCustomer.id,
          Phone: newPhone,
          PhoneType: newPhoneType,
          IsPrimary: newPhoneIsPrimary
        })
      });

      console.log('Response status:', response.status);
      if (response.ok) {
        notify('تم إضافة الهاتف بنجاح', 'success');
        setNewPhone('');
        setNewPhoneType('Mobile');
        setNewPhoneIsPrimary(false);
        setShowAddPhoneModal(false);
        const updatedPhones = await fetchCustomerPhones(selectedCustomer.id);
        if (selectedCustomer) {
          setSelectedCustomer((prevCustomer): any => ({
            ...prevCustomer,
            phones: updatedPhones || []
          }));
        }
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        notify(errorData.error || errorData.message || 'حدث خطأ في إضافة الهاتف', 'error');
      }
    } catch (error) {
      console.error('Error adding phone:', error);
      notify('حدث خطأ في إضافة الهاتف', 'error');
    } finally {
      setAddPhoneLoading(false);
    }
  };

  // Delete customer phone
  const handleDeletePhone = async (phoneId: number) => {
    try {
      console.log('handleDeletePhone called with phoneId:', phoneId);
      console.log('deletePhoneData:', deletePhoneData);
      console.log('selectedCustomer:', selectedCustomer);
      
      if (!deletePhoneData) {
        notify('بيانات الهاتف غير موجودة', 'error');
        return;
      }

      // If the ID is likely a temp ID (very large number from Date.now()), just remove from UI
      if (phoneId > 1000000000000) {
        // Just remove from customerPhones and UI - no API call needed
        setCustomerPhones(prev => prev.filter(p => p.id !== phoneId));
        if (selectedCustomer) {
          setSelectedCustomer((prevCustomer): any => ({
            ...prevCustomer,
            phones: (prevCustomer?.phones || []).filter((p: any) => p.id !== phoneId)
          }));
        }
        notify('تم حذف الهاتف من القائمة', 'success');
        setDeletePhoneId(null);
        setDeletePhoneData(null);
        return;
      }

      const accountId = user?.accountId || 1;
      console.log('Deleting phone:', phoneId);
      
      const response = await fetch(`http://localhost:5000/api/phonenumbers/${phoneId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Account-Id': accountId.toString(),
          'Authorization': `Bearer ${sessionStorage.getItem('smart_accountant_session') || localStorage.getItem('smart_accountant_session') || ''}`
        }
      });

      console.log('Delete response status:', response.status);
      if (response.ok) {
        notify('تم حذف الهاتف بنجاح', 'success');
        
        // تحديث الهواتف في كل من customerPhones و selectedCustomer
        setCustomerPhones(prev => prev.filter(p => p.id !== phoneId));
        
        if (selectedCustomer) {
          setSelectedCustomer((prevCustomer): any => ({
            ...prevCustomer,
            phones: (prevCustomer?.phones || []).filter((p: any) => p.id !== phoneId)
          }));
        }
        
        setDeletePhoneId(null);
        setDeletePhoneData(null);
      } else {
        const errorData = await response.json();
        console.error('Delete error response:', errorData);
        notify(errorData.error || errorData.message || 'فشل حذف الهاتف', 'error');
      }
    } catch (error) {
      console.error('Error deleting phone:', error);
      notify('حدث خطأ في حذف الهاتف: ' + (error as any).message, 'error');
    }
  };

  // Edit customer phone
  const handleEditPhone = async () => {
    if (!editPhoneNumber || editingPhoneId === null) {
      notify('يرجى إدخال رقم الهاتف', 'warning');
      return;
    }

    // Check if phone is new (hasn't been saved to DB yet)
    const phoneToEdit = customerPhones.find(p => p.id === editingPhoneId);
    if (!phoneToEdit) {
      console.error('Phone not found in customerPhones. ID:', editingPhoneId);
      console.log('Available phones:', customerPhones.map(p => ({ id: p.id, phone: p.phone || p.phoneNumber })));
      notify('رقم الهاتف غير موجود', 'error');
      return;
    }

    const isTemporaryPhone = editingPhoneId > 1000000000000;

    // If the ID is likely a temp ID (very large number from Date.now()), edit locally in state
    if (isTemporaryPhone) {
      // Update the phone in the customerPhones state (local edit before saving)
      const updatedPhones = normalizePhonePrimaryState(customerPhones.map(p => 
        p.id === editingPhoneId 
          ? { ...p, phone: editPhoneNumber, phoneType: editPhoneType, isPrimary: editPhoneIsPrimary, isSecondary: !editPhoneIsPrimary }
          : p
      ), editPhoneIsPrimary ? editingPhoneId : undefined);
      setCustomerPhones(updatedPhones);
      
      // Also update selectedCustomer
      if (selectedCustomer) {
        setSelectedCustomer((prevCustomer): any => ({
          ...prevCustomer,
          phones: updatedPhones
        }));
      }
      
      // Close modal immediately
      setEditingPhoneId(null);
      setEditPhoneNumber('');
      setEditPhoneType('mobile');
      setEditPhoneIsPrimary(false);
      
      notify('تم تحديث الهاتف المؤقت', 'success');
      return;
    }

    // For existing phones, validate that ID exists in database
    console.log('Attempting to edit existing phone ID:', editingPhoneId, 'Phone data:', phoneToEdit);

    // For existing phones, update immediately in local state first
    const updatedPhones = normalizePhonePrimaryState(customerPhones.map(p =>
      p.id === editingPhoneId
        ? { ...p, phone: editPhoneNumber, phoneType: editPhoneType, isPrimary: editPhoneIsPrimary, isSecondary: !editPhoneIsPrimary, isExisting: true }
        : p
    ), editPhoneIsPrimary ? editingPhoneId : undefined);
    setCustomerPhones(updatedPhones);
    
    // Also update selectedCustomer immediately
    if (selectedCustomer) {
      setSelectedCustomer((prevCustomer): any => ({
        ...prevCustomer,
        phones: updatedPhones
      }));
    }
    
    // Store the phone ID before resetting state
    const phoneIdToUpdate = editingPhoneId;
    
    // Close modal immediately for better UX
    setEditingPhoneId(null);
    setEditPhoneNumber('');
    setEditPhoneType('mobile');
    setEditPhoneIsPrimary(false);

    // Send to server asynchronously
    setEditPhoneLoading(true);
    try {
      const accountId = user?.accountId || 1;
      
      console.log('Sending PUT request for phone ID:', phoneIdToUpdate);
      const response = await fetch(`http://localhost:5000/api/phonenumbers/${phoneIdToUpdate}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Account-Id': accountId.toString()
        },
        body: JSON.stringify({
          Phone: editPhoneNumber,
          PhoneType: editPhoneType,
          IsPrimary: editPhoneIsPrimary,
          Notes: phoneToEdit?.notes || ''
        })
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        notify('تم تحديث الهاتف بنجاح', 'success');
        
        // Refresh from server to ensure consistency
        if (selectedCustomer) {
          await fetchCustomerPhones(selectedCustomer.id);
        }
      } else {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        notify(errorData.error || errorData.message || 'حدث خطأ في تحديث الهاتف', 'error');
        // Re-fetch to sync with server in case of error
        if (selectedCustomer) {
          await fetchCustomerPhones(selectedCustomer.id);
        }
      }
    } catch (error) {
      console.error('Error updating phone:', error);
      notify('حدث خطأ في تحديث الهاتف', 'error');
      // Re-fetch to sync with server in case of error
      if (selectedCustomer) {
        await fetchCustomerPhones(selectedCustomer.id);
      }
    } finally {
      setEditPhoneLoading(false);
    }
  };

  // Start editing phone
  const startEditPhone = (phone: any) => {
    setEditingPhoneId(phone.id);
    // Support both API field names (phone/phoneType from generic API)
    setEditPhoneNumber(phone.phone || phone.phoneNumber || phone.number || '');
    setEditPhoneType(phone.phoneType || phone.type || 'mobile');
    setEditPhoneIsPrimary(phone.isPrimary || false);
  };

  // Add customer email
  const handleAddEmail = async () => {
    if (!newEmail || !selectedCustomer) {
      notify('يرجى إدخال عنوان البريد الإلكتروني', 'warning');
      return;
    }

    setAddEmailLoading(true);
    try {
      const accountId = user?.accountId || 1;
      const response = await fetch('http://localhost:5000/api/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Account-Id': accountId.toString(),
          'Authorization': `Bearer ${sessionStorage.getItem('smart_accountant_session') || localStorage.getItem('smart_accountant_session') || ''}`
        },
        body: JSON.stringify({
          AccountId: accountId,
          EntityType: 'Customer',
          EntityId: selectedCustomer.id,
          EmailAddress: newEmail,
          IsPrimary: false
        })
      });

      if (response.ok) {
        notify('تم إضافة البريد الإلكتروني بنجاح', 'success');
        setNewEmail('');
        setShowAddEmailModal(false);
        const updatedEmails = await fetchCustomerEmails(selectedCustomer.id);
        
        // تحديث selectedCustomer
        setSelectedCustomer((prevCustomer): any => ({
          ...prevCustomer,
          emails: updatedEmails || []
        }));
      } else {
        const errorData = await response.json();
        notify(errorData.error || errorData.message || 'فشل إضافة البريد الإلكتروني', 'error');
      }
    } catch (error) {
      console.error('Error adding email:', error);
      notify('حدث خطأ في إضافة البريد الإلكتروني', 'error');
    } finally {
      setAddEmailLoading(false);
    }
  };

  // Delete customer email
  const handleDeleteEmail = async (emailId: number) => {
    try {
      console.log('handleDeleteEmail called with emailId:', emailId);
      console.log('deleteEmailData:', deleteEmailData);

      if (!deleteEmailData) {
        notify('بيانات البريد الإلكتروني غير موجودة', 'error');
        return;
      }

      // If the ID is likely a temp ID (very large number from Date.now()), just remove from UI
      if (emailId > 1000000000000) {
        // Just remove from customerEmails and UI - no API call needed
        setCustomerEmails(prev => prev.filter(e => e.id !== emailId));
        if (selectedCustomer) {
          setSelectedCustomer((prevCustomer): any => ({
            ...prevCustomer,
            emails: (prevCustomer?.emails || []).filter((e: any) => e.id !== emailId)
          }));
        }
        notify('تم حذف البريد من القائمة', 'success');
        setDeleteEmailId(null);
        setDeleteEmailData(null);
        return;
      }

      const accountId = user?.accountId || 1;
      const response = await fetch(`http://localhost:5000/api/emails/${emailId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Account-Id': accountId.toString(),
          'Authorization': `Bearer ${sessionStorage.getItem('smart_accountant_session') || localStorage.getItem('smart_accountant_session') || ''}`
        }
      });

      if (response.ok) {
        notify('تم حذف البريد الإلكتروني بنجاح', 'success');
        
        // تحديث الايميلات في كل من customerEmails و selectedCustomer
        setCustomerEmails(prev => prev.filter(e => e.id !== emailId));
        
        if (selectedCustomer) {
          setSelectedCustomer((prevCustomer): any => ({
            ...prevCustomer,
            emails: (prevCustomer?.emails || []).filter((e: any) => e.id !== emailId)
          }));
        }
        
        setDeleteEmailId(null);
        setDeleteEmailData(null);
      } else {
        const errorData = await response.json();
        console.error('Delete error response:', errorData);
        notify(errorData.error || errorData.message || 'فشل حذف البريد الإلكتروني', 'error');
      }
    } catch (error) {
      console.error('Error deleting email:', error);
      notify('حدث خطأ في حذف البريد الإلكتروني: ' + (error as any).message, 'error');
    }
  };

  // Edit customer email
  const handleEditEmail = async () => {
    if (!editEmailAddress || editingEmailId === null) {
      notify('يرجى إدخال عنوان البريد الإلكتروني', 'warning');
      return;
    }

    // Check if email is found in state
    const emailToEdit = customerEmails.find(e => e.id === editingEmailId);
    if (!emailToEdit) {
      console.error('Email not found in customerEmails. ID:', editingEmailId);
      console.log('Available emails:', customerEmails.map(e => ({ id: e.id, email: e.email })));
      notify('البريد الإلكتروني غير موجود', 'error');
      return;
    }

    const isTemporaryEmail = editingEmailId > 1000000000000;

    // If the ID is likely a temp ID (very large number from Date.now()), edit locally in state
    if (isTemporaryEmail) {
      // Update the email in the customerEmails state (local edit before saving)
      const updatedEmails = customerEmails.map(e => 
        e.id === editingEmailId 
          ? { ...e, email: editEmailAddress, emailType: editEmailType, isPrimary: editEmailIsPrimary }
          : e
      );
      setCustomerEmails(updatedEmails);
      
      // Also update selectedCustomer
      if (selectedCustomer) {
        setSelectedCustomer((prevCustomer): any => ({
          ...prevCustomer,
          emails: updatedEmails
        }));
      }
      
      // Close modal immediately
      setEditingEmailId(null);
      setEditEmailAddress('');
      setEditEmailType('personal');
      setEditEmailIsPrimary(false);
      
      notify('تم تحديث البريد الإلكتروني المؤقت', 'success');
      return;
    }

    // For existing emails, validate that ID exists in database
    console.log('Attempting to edit existing email ID:', editingEmailId, 'Email data:', emailToEdit);

    // For existing emails, update immediately in local state first
    const updatedEmails = customerEmails.map(e =>
      e.id === editingEmailId
        ? { ...e, email: editEmailAddress, emailType: editEmailType, isPrimary: editEmailIsPrimary, isExisting: true }
        : e
    );
    setCustomerEmails(updatedEmails);
    
    // Also update selectedCustomer immediately
    if (selectedCustomer) {
      setSelectedCustomer((prevCustomer): any => ({
        ...prevCustomer,
        emails: updatedEmails
      }));
    }
    
    // Store the email ID before resetting state
    const emailIdToUpdate = editingEmailId;
    
    // Close modal immediately for better UX
    setEditingEmailId(null);
    setEditEmailAddress('');
    setEditEmailType('personal');
    setEditEmailIsPrimary(false);

    // Send to server asynchronously
    setEditEmailLoading(true);
    try {
      const accountId = user?.accountId || 1;
      
      console.log('Sending PUT request for email ID:', emailIdToUpdate);
      const response = await fetch(`http://localhost:5000/api/emails/${emailIdToUpdate}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Account-Id': accountId.toString()
        },
        body: JSON.stringify({
          EmailAddress: editEmailAddress,
          EmailType: editEmailType,
          IsPrimary: editEmailIsPrimary,
          Notes: emailToEdit?.notes || ''
        })
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        notify('تم تحديث البريد الإلكتروني بنجاح', 'success');
        
        // Refresh from server to ensure consistency
        if (selectedCustomer) {
          await fetchCustomerEmails(selectedCustomer.id);
        }
      } else {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        notify(errorData.error || errorData.message || 'حدث خطأ في تحديث البريد الإلكتروني', 'error');
        // Re-fetch to sync with server in case of error
        if (selectedCustomer) {
          await fetchCustomerEmails(selectedCustomer.id);
        }
      }
    } catch (error) {
      console.error('Error updating email:', error);
      notify('حدث خطأ في تحديث البريد الإلكتروني', 'error');
      // Re-fetch to sync with server in case of error
      if (selectedCustomer) {
        await fetchCustomerEmails(selectedCustomer.id);
      }
    } finally {
      setEditEmailLoading(false);
    }
  };

  // Start editing email
  const startEditEmail = (email: any) => {
    setEditingEmailId(email.id);
    setEditEmailAddress(email.emailAddress || email.email);
    setEditEmailType(email.emailType || email.type || 'work');
    setEditEmailIsPrimary(email.isPrimary || false);
  };

  const confirmDelete = async () => {
      if (deleteId) {
          try {
              await apiDeleteCustomer(deleteId);
              notify('تم حذف العميل بنجاح', 'success');
          } catch(err: any) {
              notify(err.message || 'حدث خطأ أثناء الحذف', 'error');
          }
          setDeleteId(null);
      }
  };

  const handleAddPayment = async () => {
    if (payAmount <= 0) {
      notify('يرجى إدخال مبلغ صحيح', 'warning');
      return;
    }
    if (!selectedCustomer) {
      notify('يرجى اختيار عميل', 'error');
      return;
    }

    setPaymentLoading(true);
    try {
      const customerId = selectedCustomer.id;
      const invoiceId = payInvoiceId || undefined;
      const invoiceNumber = payInvoiceNumber;
      const amount = payAmount;
      const remainingBeforePayment = invoiceId ? payMaxAmount : null;

      const createdPayment = await paymentsApi.create({
        customerId,
        invoiceId,
        amount,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'Cash',
        paymentType: 'Receipt',
        notes: invoiceId ? `دفعة على فاتورة ${invoiceNumber}` : 'دفعة على الحساب',
      });

      await refreshInvoices();

      // تحديث سجل الدفعات قبل التحقق النهائي حتى ينعكس التغيير بصريا.
      await fetchCustomerPayments(customerId);

      const formatAmount = (value: number) => `${value.toLocaleString()} ${currency}`;
      let paymentRowVerified = false;
      let paymentRowVerifyError = '';

      if (typeof createdPayment?.id === 'number' && createdPayment.id > 0) {
        try {
          const savedPayment = await paymentsApi.getById(createdPayment.id);
          paymentRowVerified = Boolean(savedPayment?.id);
        } catch (verificationError: any) {
          paymentRowVerifyError = verificationError?.message || 'تعذر قراءة الدفعة من الخادم بعد الحفظ.';
        }
      } else {
        paymentRowVerifyError = 'تم إرجاع معرف دفعة غير صالح من الخادم.';
      }

      if (invoiceId && remainingBeforePayment !== null) {
        try {
          const invoiceAfter = await invoicesApi.getById(invoiceId);
          const totalAfter = Number(invoiceAfter?.totalAmount || 0);
          const paidAfter = Number(invoiceAfter?.paidAmount || 0);
          const remainingAfter = Math.max(0, totalAfter - paidAfter);
          const expectedRemaining = Math.max(0, Number(remainingBeforePayment) - Number(amount));
          const remainingMatched = Math.abs(remainingAfter - expectedRemaining) <= 0.01;

          if (paymentRowVerified && remainingMatched) {
            setVerifiedInvoicePayments((previousState) => ({
              ...previousState,
              [invoiceId]: {
                customerId,
                paymentId: Number(createdPayment.id),
                amount: Number(amount),
                verifiedAt: new Date().toISOString(),
                remainingBefore: Number(remainingBeforePayment),
                remainingAfter,
              },
            }));

            notify(
              `تم حفظ الدفعة بنجاح. المتبقي انخفض من ${formatAmount(Number(remainingBeforePayment))} إلى ${formatAmount(remainingAfter)}.`,
              'success',
            );
          } else {
            const paymentDiagnostic = paymentRowVerified
              ? 'تمت قراءة الدفعة من الخادم.'
              : `تعذر تأكيد وجود الدفعة: ${paymentRowVerifyError || 'خطأ غير معروف'}`;

            notify(
              `تم إنشاء الدفعة لكن التحقق المحاسبي فشل. قبل الدفع: ${formatAmount(Number(remainingBeforePayment))} | المتوقع بعد الدفع: ${formatAmount(expectedRemaining)} | الحالي بعد الدفع: ${formatAmount(remainingAfter)}. ${paymentDiagnostic}`,
              'warning',
            );
          }
        } catch (invoiceVerificationError: any) {
          notify(
            `تم حفظ الدفعة لكن تعذر التحقق من خصم المتبقي في الفاتورة. السبب: ${invoiceVerificationError?.message || 'تعذر قراءة الفاتورة بعد الدفع.'}`,
            'warning',
          );
        }
      } else if (paymentRowVerified) {
        notify(`تم حفظ الدفعة بنجاح بمبلغ ${formatAmount(amount)}.`, 'success');
      } else {
        notify(
          `تم إرسال الدفعة ولكن تعذر تأكيد حفظها من الخادم. السبب: ${paymentRowVerifyError || 'خطأ غير معروف'}.`,
          'warning',
        );
      }

      setShowPayModal(false);
      setPayAmount(0);
      setPayInvoiceId(null);
      setPayInvoiceNumber('');
      setPayMaxAmount(0);
    } catch (err: any) {
      notify(err.message || 'فشل في تسجيل الدفعة', 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  const customerTotalDue = useMemo(() => {
     return customerInvoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);
  }, [customerInvoices]);

  const statementPeriodLabel = statementDateFrom || statementDateTo
    ? `${statementDateFrom || '...'} - ${statementDateTo || '...'}`
    : 'كل الفترات';

  const statementPaymentsFiltered = useMemo(() => {
    const normalizedAllSearch = statementAllCustomersSearch.trim().toLowerCase();

    return statementPayments.filter((payment) => {
      if (statementScope === 'selected') {
        return !statementCustomerId || payment.customerId === statementCustomerId;
      }

      if (!normalizedAllSearch) {
        return true;
      }

      const customerName = (payment.customerName || (typeof payment.customerId === 'number' ? customersById.get(payment.customerId) : '') || '').toLowerCase();
      return customerName.includes(normalizedAllSearch);
    });
  }, [statementPayments, statementScope, statementCustomerId, statementAllCustomersSearch, customersById]);

  const statementCustomersOrdered = useMemo(() => {
    if (statementScope === 'selected') {
      return statementSelectedCustomer ? [statementSelectedCustomer] : [];
    }

    const ids = new Set<number>();
    statementDueInvoices.forEach(invoice => {
      if (typeof invoice.customerId === 'number') {
        ids.add(invoice.customerId);
      }
    });
    statementPaidInvoices.forEach(invoice => {
      if (typeof invoice.customerId === 'number') {
        ids.add(invoice.customerId);
      }
    });
    statementPaymentsFiltered.forEach(payment => {
      if (typeof payment.customerId === 'number') {
        ids.add(payment.customerId);
      }
    });

    return Array.from(ids)
      .map(customerId => customers.find(customer => customer.id === customerId))
      .filter((customer): customer is NonNullable<typeof customer> => Boolean(customer))
      .sort((firstCustomer, secondCustomer) => firstCustomer.id - secondCustomer.id);
  }, [statementScope, statementSelectedCustomer, statementDueInvoices, statementPaidInvoices, statementPaymentsFiltered, customers]);

  const statementPrintEntries = useMemo(() => {
    const entries = statementCustomersOrdered.map((customer) => {
      const dueInvoicesForCustomer = statementDueInvoices.filter(invoice => invoice.customerId === customer.id);
      const paidInvoicesForCustomer = statementPaidInvoices.filter(invoice => invoice.customerId === customer.id);
      const allInvoicesForCustomer = statementScopedInvoices.filter(invoice => invoice.customerId === customer.id);
      const paymentsForCustomer = statementPaymentsFiltered.filter(payment => payment.customerId === customer.id);

      return {
        customer,
        invoices: dueInvoicesForCustomer,
        paidInvoices: paidInvoicesForCustomer,
        allInvoices: allInvoicesForCustomer,
        payments: paymentsForCustomer,
        totalDue: dueInvoicesForCustomer.reduce((sum, invoice) => sum + (invoice.remainingAmount || 0), 0),
      };
    });

    if (statementScope === 'selected') {
      return entries;
    }

    return entries.filter(entry => entry.invoices.length > 0 || entry.paidInvoices.length > 0 || entry.payments.length > 0);
  }, [statementCustomersOrdered, statementDueInvoices, statementPaidInvoices, statementScopedInvoices, statementPaymentsFiltered, statementScope]);

  // Loading state
  if (customersLoading || invoicesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">جاري تحميل بيانات العملاء...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (customersError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <p className="text-rose-500 font-bold mb-2">حدث خطأ</p>
          <p className="text-slate-500 dark:text-slate-400">{customersError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      
      {/* 1. Edit Confirmation Modal */}
      {pendingEditCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4" onClick={() => setPendingEditCustomer(null)}>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-auto animate-in zoom-in-95 duration-200 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPendingEditCustomer(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 text-blue-600 mb-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full"><Edit2 size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">تعديل بيانات العميل</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
                هل تريد تعديل بيانات العميل: <span className="font-bold">{pendingEditCustomer.name}</span>؟
            </p>
            <div className="flex gap-3">
              <button onClick={confirmEditCustomer} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors">نعم، ابدأ التعديل</button>
              <button onClick={() => setPendingEditCustomer(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Save Changes Modal */}
      {showSaveConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4" onClick={() => setShowSaveConfirmation(false)}>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-auto animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-emerald-600 mb-4">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-full"><Save size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">حفظ التغييرات</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">هل أنت متأكد من حفظ التعديلات على بيانات العميل؟</p>
            <div className="flex gap-3">
              <button onClick={performSaveCustomer} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-bold hover:bg-emerald-700 transition-colors">تأكيد الحفظ</button>
              <button onClick={() => setShowSaveConfirmation(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">تراجع</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-auto animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-rose-600 mb-4">
                <div className="bg-rose-100 dark:bg-rose-900/30 p-2 rounded-full"><AlertTriangle size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">تأكيد حذف العميل</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm leading-relaxed">
                هل أنت متأكد من حذف هذا العميل؟<br/>
                <span className="text-xs text-rose-500 block mt-1">سيتم حذف العميل لكن ستبقى الفواتير مرتبطة به.</span>
            </p>
            <div className="flex gap-3">
              <button onClick={confirmDelete} className="flex-1 bg-rose-600 text-white py-2.5 rounded-lg font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200">نعم، احذف</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Full Customer Data Modal */}
      {fullDataCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[120] p-4" onClick={() => setFullDataCustomer(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-xl p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setFullDataCustomer(null)}
              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">كامل بيانات العميل</h3>

            {(() => {
              const { primaryPhone, phonesTitle } = getCustomerPhoneDetails(fullDataCustomer);
              const fullEmail = (fullDataCustomer.primaryEmailAddress || '').toString().trim() || CONTACT_PLACEHOLDER_EMAIL;
              const fullAddress = buildDetailedAddress(
                fullDataCustomer.countryName,
                fullDataCustomer.provinceName,
                fullDataCustomer.cityName,
                fullDataCustomer.address
              ) || 'لا يوجد عنوان تفصيلي';
              const fullNotes = normalizeNotesText(fullDataCustomer.notes) || '-';

              return (
                <div className="space-y-3 text-sm">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-slate-500 dark:text-slate-400">الاسم</p>
                    <p className="font-semibold text-slate-800 dark:text-white break-words">{fullDataCustomer.name}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50" dir="ltr">
                    <p className="text-slate-500 dark:text-slate-400" dir="rtl">الهاتف الأساسي</p>
                    <p className="font-semibold text-slate-800 dark:text-white break-all">{primaryPhone}</p>
                    {phonesTitle && phonesTitle !== primaryPhone && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-all">كل الهواتف: {phonesTitle}</p>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50" dir="ltr">
                    <p className="text-slate-500 dark:text-slate-400" dir="rtl">البريد الإلكتروني</p>
                    <p className="font-semibold text-slate-800 dark:text-white break-all">{fullEmail}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-slate-500 dark:text-slate-400">العنوان</p>
                    <p className="font-semibold text-slate-800 dark:text-white break-words whitespace-pre-wrap">{fullAddress}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-slate-500 dark:text-slate-400">الملاحظات</p>
                    <p className="font-semibold text-slate-800 dark:text-white break-words whitespace-pre-wrap">{fullNotes}</p>
                  </div>
                </div>
              );
            })()}

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setFullDataCustomer(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN VIEW --- */}

      {view === 'list' ? (
        <div className="space-y-4">
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-1">
                <button
                  onClick={() => setView('list')}
                  className="px-3 py-1.5 text-sm font-bold rounded-md bg-primary text-white"
                >
                  قائمة العملاء
                </button>
                <button
                  onClick={() => setView('statement')}
                  className="px-3 py-1.5 text-sm font-bold rounded-md text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"
                >
                  كشف حساب
                </button>
              </div>
              {/* View Mode Toggle */}
              <div className="flex bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-0.5">
                <button
                  onClick={() => setListViewMode('table')}
                  className={`p-1.5 rounded transition-all ${listViewMode === 'table' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                  title="عرض صفوف"
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => setListViewMode('grid')}
                  className={`p-1.5 rounded transition-all ${listViewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                  title="عرض شبكي"
                >
                  <Grid3X3 size={18} />
                </button>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                {/* Header Search Input */}
                <div className="relative flex-1 md:w-64">
                    <Search size={18} className="absolute right-3 top-2.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="بحث بالاسم..." 
                      className="w-full pr-10 pl-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:border-primary outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    <button 
                      onClick={() => printWithFileName({ 
                        companyName: user?.companyName, 
                        type: 'قائمة العملاء' 
                      })}
                      className="bg-slate-800 dark:bg-slate-700 text-white px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors shadow-sm text-sm"
                    >
                      <Printer size={16} />
                      <span>طباعة</span>
                    </button>

                    {pagePerms.canCreate && (
                      <button 
                        onClick={() => {
                            setEditingCustomerId(null);
                            setFormCustName('');
                            setFormCustCountryId(null);
                            setFormCustProvinceId(null);
                            setFormCustCityId(null);
                            setFormCustAddress('');
                            setFormCustLatitude('');
                            setFormCustLongitude('');
                            setFormCustType('Individual');
                            setFormCustNotes('');
                            setFormCustIsVIP(false);
                            setShowAdvancedOptions(false);
                            setView('create');
                        }}
                        className="bg-primary hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-200 dark:shadow-none text-sm"
                      >
                        <Plus size={16} />
                        <span>إضافة</span>
                      </button>
                    )}
                </div>
            </div>
          </div>
          
          {/* فلاتر الفترة الزمنية */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-2 sm:p-4 print:hidden">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-4">
              {/* أزرار الفترة السريعة */}
              <div className="overflow-x-auto">
                <div className="inline-flex min-w-max bg-slate-100 dark:bg-slate-700 p-0.5 sm:p-1 rounded-lg">
                  <button 
                    onClick={() => setDateRange('all')} 
                    className={`flex-none px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all whitespace-nowrap ${filterPeriod === 'all' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                  >
                    الكل
                  </button>
                  <button 
                    onClick={() => setDateRange('week')} 
                    className={`flex-none px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all whitespace-nowrap ${filterPeriod === 'week' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                  >
                    الأسبوع
                  </button>
                  <button 
                    onClick={() => setDateRange('month')} 
                    className={`flex-none px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all whitespace-nowrap ${filterPeriod === 'month' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                  >
                    الشهر
                  </button>
                  <button 
                    onClick={() => setDateRange('year')} 
                    className={`flex-none px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all whitespace-nowrap ${filterPeriod === 'year' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                  >
                    السنة
                  </button>
                  <button 
                    onClick={() => setFilterPeriod('custom')} 
                    className={`flex-none px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all whitespace-nowrap ${filterPeriod === 'custom' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                  >
                    مخصص
                  </button>
                </div>
              </div>
              
              {/* حقول التاريخ المخصص - تظهر فقط عند اختيار "تاريخ مخصص" */}
              {filterPeriod === 'custom' && (
                <div className="overflow-x-auto animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="inline-flex items-center gap-2 min-w-max whitespace-nowrap">
                    <Calendar size={14} className="text-primary" />
                    <span className="text-[10px] sm:text-xs text-slate-500">من:</span>
                    <DateInput
                      value={filterDateFrom}
                      onChange={setFilterDateFrom}
                      className="px-2 py-1 sm:py-1.5 text-[10px] sm:text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-primary w-28 sm:w-32"
                      placeholder="يوم-شهر-سنة"
                    />
                    <span className="text-[10px] sm:text-xs text-slate-500">إلى:</span>
                    <DateInput
                      value={filterDateTo}
                      onChange={setFilterDateTo}
                      className="px-2 py-1 sm:py-1.5 text-[10px] sm:text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-primary w-28 sm:w-32"
                      placeholder="يوم-شهر-سنة"
                    />
                  </div>
                </div>
              )}
              
              {/* عداد النتائج */}
              <div className="text-[10px] sm:text-xs text-slate-500 sm:mr-auto w-full sm:w-auto text-center sm:text-right pt-1 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-700">
                عدد العملاء: <span className="font-bold text-primary">{filteredCustomers.length}</span>
                <span className="text-slate-400 mr-1 sm:mr-2">| الترتيب: الأحدث أولاً</span>
                {filterPeriod !== 'all' && <span className="text-slate-400 mr-1 sm:mr-2 hidden sm:inline">(عملاء لديهم فواتير في الفترة المحددة)</span>}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 overflow-hidden print:shadow-none print:border-black backdrop-blur-sm">
            {/* List Header for Print Only */}
            <div className="hidden print:block text-center p-4 border-b border-black">
                <h2 className="text-xl font-bold">قائمة العملاء</h2>
                <p className="text-sm">عدد العملاء: {filteredCustomers.length}</p>
            </div>

            {/* Table View */}
            {listViewMode === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full text-center min-w-[980px] text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 print:bg-gray-200 print:text-black">
                    <tr className="text-slate-600 dark:text-slate-400 text-sm font-semibold">
                      <th className="p-4 whitespace-nowrap text-center align-middle">رقم</th>
                      <th className="p-4 whitespace-nowrap text-center align-middle">الاسم</th>
                      <th className="p-4 whitespace-nowrap text-center align-middle">الهاتف</th>
                      <th className="p-4 whitespace-nowrap text-center align-middle">البريد</th>
                      <th className="p-4 whitespace-nowrap text-center align-middle">العنوان</th>
                      <th className="p-4 whitespace-nowrap text-center align-middle">ملاحظات</th>
                      <th className="p-4 text-center align-middle w-[320px] min-w-[300px] print:hidden no-print">أدوات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 print:divide-black text-[13px] md:text-sm">
                    {filteredCustomers.map((c) => {
                      const { primaryPhone, hasPhone, extraPhonesCount, phonesTitle } = getCustomerPhoneDetails(c);
                      const customerDetailedAddressText = buildDetailedAddress(c.countryName, c.provinceName, c.cityName, c.address);
                      const customerNotesText = normalizeNotesText(c.notes);
                      const hasEmail = !!(c.primaryEmailAddress || '').toString().trim();
                      const customerEmailText = hasEmail ? (c.primaryEmailAddress || '').toString().trim() : CONTACT_PLACEHOLDER_EMAIL;
                      const customerAddressDisplayText = customerDetailedAddressText || 'لا يوجد عنوان تفصيلي';
                      return (
                      <tr key={c.id} className="odd:bg-white even:bg-slate-50/45 dark:odd:bg-slate-800 dark:even:bg-slate-800/70 hover:bg-blue-50/55 dark:hover:bg-slate-700/80 transition-colors duration-150">
                        <td className="px-4 py-3.5 align-middle text-center text-primary dark:text-blue-400 font-bold text-sm print:text-black whitespace-nowrap">#{c.id}</td>
                        <td className="px-4 py-3.5 align-middle text-center font-medium text-slate-800 dark:text-slate-200 text-sm min-w-[170px]">
                          <p className="mx-auto max-w-[190px] truncate whitespace-nowrap" title={c.name}>{c.name}</p>
                        </td>
                        <td className="px-4 py-3.5 align-middle text-center text-sm" dir="ltr" title={phonesTitle}>
                          <div className="inline-flex items-center justify-center gap-1 max-w-[190px] whitespace-nowrap overflow-hidden">
                            <span className={hasPhone ? 'text-slate-600 dark:text-slate-300 truncate max-w-[150px]' : 'inline-flex items-center px-2 py-0.5 rounded-md border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/60 text-slate-400/90 dark:text-slate-500/90 truncate max-w-[150px]'}>{primaryPhone}</span>
                            {hasPhone && extraPhonesCount > 0 && <span className="text-xs text-slate-400">(+{extraPhonesCount})</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-middle text-center text-sm" dir="ltr" title={customerEmailText}>
                          <span className={hasEmail ? 'text-slate-600 dark:text-slate-300 inline-block max-w-[220px] truncate whitespace-nowrap' : 'inline-flex items-center px-2 py-0.5 rounded-md border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/60 text-slate-400/90 dark:text-slate-500/90 max-w-[220px] truncate whitespace-nowrap'}>{customerEmailText}</span>
                        </td>
                        <td className="px-4 py-3.5 align-middle text-center min-w-[260px]" title={customerAddressDisplayText}>
                          <p className="mx-auto max-w-[280px] truncate whitespace-nowrap text-slate-600 dark:text-slate-300 text-sm">{customerAddressDisplayText}</p>
                        </td>
                        <td className="px-4 py-3.5 align-middle text-center text-slate-600 dark:text-slate-300 min-w-[220px]" title={customerNotesText || '-'}>
                          <p className="mx-auto max-w-[240px] truncate whitespace-nowrap text-sm">{customerNotesText || '-'}</p>
                        </td>
                        <td className="px-4 py-3.5 align-middle text-center print:hidden no-print min-w-[300px]">
                          <div className="flex flex-wrap justify-center gap-1.5">
                          <button 
                            className="flex items-center justify-center px-2 py-1.5 text-slate-600 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium whitespace-nowrap" 
                            title="عرض كامل البيانات"
                            onClick={() => setFullDataCustomer(c)}
                          >
                            <FileText size={14} />
                          </button>
                           <button 
                            className="flex items-center gap-1 px-2 py-1.5 text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors text-sm font-medium whitespace-nowrap" 
                            title="كشف حساب"
                            onClick={() => openDetails(c)}
                          >
                            <Eye size={14} />
                            <span>كشف حساب</span>
                          </button>
                           {pagePerms.canEdit && (
                            <button 
                              className="flex items-center gap-1 px-2 py-1.5 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-sm font-medium whitespace-nowrap" 
                              title="تعديل"
                              onClick={() => requestEditCustomer(c)}
                            >
                              <Edit2 size={14} />
                              <span>تعديل</span>
                            </button>
                          )}
                          {pagePerms.canDelete && (
                            <button 
                              className="flex items-center gap-1 px-2 py-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors text-sm font-medium whitespace-nowrap" 
                              title="حذف"
                              onClick={() => setDeleteId(c.id)}
                            >
                              <Trash2 size={14} />
                              <span>حذف</span>
                            </button>
                          )}
                          </div>
                        </td>
                      </tr>
                    );
                    })}
                    {filteredCustomers.length === 0 && (
                        <tr><td colSpan={7} className="p-8 text-center text-slate-400">لا يوجد عملاء مطابقين</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Grid View */}
            {listViewMode === 'grid' && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.map((c) => {
                  const custInvoices = invoices.filter(i => i.customerId === c.id);
                  const totalDue = custInvoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);
                  const { primaryPhone, hasPhone, extraPhonesCount, phonesTitle } = getCustomerPhoneDetails(c);
                  const customerDetailedAddressText = buildDetailedAddress(c.countryName, c.provinceName, c.cityName, c.address);
                  const customerNotesText = normalizeNotesText(c.notes);
                  const hasEmail = !!(c.primaryEmailAddress || '').toString().trim();
                  const customerEmailText = hasEmail ? (c.primaryEmailAddress || '').toString().trim() : CONTACT_PLACEHOLDER_EMAIL;
                  const customerAddressDisplayText = customerDetailedAddressText || 'لا يوجد عنوان تفصيلي';
                  const customerNotesDisplayText = customerNotesText || '-';
                  
                  return (
                    <div 
                      key={c.id} 
                      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-all group h-full flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-2">
                          <User size={20} className={totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-mono text-slate-400">#{c.id}</span>
                        </div>
                      </div>
                      
                      <h4 className="font-bold text-base text-slate-800 dark:text-white truncate mb-1.5">{c.name}</h4>
                      
                      <div className="space-y-2 mb-2 min-h-[64px]">
                        <div className={`flex items-center gap-2 text-sm min-h-[24px] ${hasPhone ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400/90 dark:text-slate-500/90'}`} dir="ltr" title={phonesTitle}>
                          <Phone size={12} />
                          <span className={hasPhone ? '' : 'inline-flex items-center px-2 py-0.5 rounded-md border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/60'}>{primaryPhone}</span>
                          {hasPhone && extraPhonesCount > 0 && <span className="text-xs text-slate-400">(+{extraPhonesCount})</span>}
                        </div>

                        <div className={`flex items-center gap-2 text-sm min-h-[24px] ${hasEmail ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400/90 dark:text-slate-500/90'}`} dir="ltr" title={customerEmailText}>
                          <Mail size={12} />
                          <span className={hasEmail ? '' : 'inline-flex items-center px-2 py-0.5 rounded-md border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/60'}>{customerEmailText}</span>
                        </div>
                      </div>

                      {/* Address Display */}
                      <div className="mb-2 p-2.5 bg-slate-50 dark:bg-slate-700 rounded text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 w-full max-w-full min-h-[96px] max-h-[120px] overflow-hidden" title={customerAddressDisplayText}>
                        <span className="text-slate-500 dark:text-slate-400 block text-xs mb-1">العنوان:</span>
                        <p className="leading-6 line-clamp-3 break-words overflow-hidden">{customerAddressDisplayText}</p>
                      </div>
                      
                      <div className="text-sm text-slate-500 dark:text-slate-400 mb-2 w-full max-w-full min-h-[64px] max-h-[86px] overflow-hidden" title={customerNotesDisplayText}>
                        <p className="leading-6 line-clamp-2 break-words overflow-hidden">{customerNotesDisplayText}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-3 text-center">
                        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400 block">الفواتير</span>
                          <span className="font-bold text-slate-800 dark:text-white text-sm">{custInvoices.length}</span>
                        </div>
                        <div className="rounded-lg p-2 border border-slate-200 dark:border-slate-600">
                          <span className={`text-xs block ${totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>المديونية</span>
                          <span className={`font-bold text-sm ${totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{totalDue.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3 mt-auto">
                        <span className={`text-xs font-medium ${totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {totalDue > 0 ? `عليه: ${totalDue.toLocaleString()}` : 'لا يوجد ديون'}
                        </span>
                        <div className="flex gap-1">
                          <button onClick={() => openDetails(c)} className="flex items-center gap-0.5 px-1.5 py-1 text-emerald-600 hover:text-emerald-800 dark:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded text-xs font-medium" title="كشف حساب">
                            <Eye size={12} />
                            <span>كشف حساب</span>
                          </button>
                          {pagePerms.canEdit && (
                            <button onClick={() => requestEditCustomer(c)} className="flex items-center gap-0.5 px-1.5 py-1 text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded text-xs font-medium" title="تعديل">
                              <Edit2 size={12} />
                              <span>تعديل</span>
                            </button>
                          )}
                          {pagePerms.canDelete && (
                            <button onClick={() => setDeleteId(c.id)} className="flex items-center gap-0.5 px-1.5 py-1 text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded text-xs font-medium" title="حذف">
                              <Trash2 size={12} />
                              <span>حذف</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredCustomers.length === 0 && (
                  <div className="col-span-full p-8 text-center text-slate-400">
                    <User size={48} className="mx-auto mb-3 opacity-30" />
                    لا يوجد عملاء مطابقين
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      ) : view === 'statement' ? (
        <div className="space-y-4 statement-tab-page">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 no-print">
            <div className="inline-flex items-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-1">
              <button
                onClick={() => setView('list')}
                className="px-3 py-1.5 text-sm font-bold rounded-md text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"
              >
                قائمة العملاء
              </button>
              <button
                onClick={() => setView('statement')}
                className="px-3 py-1.5 text-sm font-bold rounded-md bg-primary text-white"
              >
                كشف حساب
              </button>
            </div>

            <button
              onClick={() => printWithFileName({
                companyName: user?.companyName,
                type: 'كشف حساب',
                customerName: statementScope === 'all' ? 'كل العملاء' : statementSelectedCustomer?.name,
              })}
              className="bg-slate-800 dark:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-700 dark:hover:bg-slate-600"
            >
              <Printer size={18} /> طباعة كشف الحساب
            </button>
          </div>

          <div className="no-print bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 sm:p-4 space-y-3">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-primary" />
                <span className="text-xs text-slate-500">نطاق الكشف:</span>
                <select
                  value={statementScope}
                  onChange={(event) => {
                    const nextScope = event.target.value as 'selected' | 'all';
                    setStatementScope(nextScope);
                    if (nextScope === 'all') {
                      setStatementCustomerId(null);
                      setStatementCustomerSearch('');
                    } else if (!statementCustomerId && selectedCustomer) {
                      setStatementCustomerId(selectedCustomer.id);
                      setStatementCustomerSearch(selectedCustomer.name || '');
                    }
                  }}
                  className="px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-primary"
                >
                  <option value="selected">عميل محدد</option>
                  <option value="all">كل العملاء</option>
                </select>
              </div>

              {statementScope === 'selected' ? (
                <div className="relative customer-dropdown-container">
                  <Search size={14} className="absolute right-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={statementCustomerSearch}
                    onFocus={() => setShowStatementCustomerSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowStatementCustomerSuggestions(false), 120)}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setStatementCustomerSearch(nextValue);
                      setStatementCustomerId(null);
                      setShowStatementCustomerSuggestions(true);
                    }}
                    placeholder="ابحث عن العميل (إكمال تلقائي)..."
                    className="w-full pr-9 pl-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-primary"
                  />
                  {showStatementCustomerSuggestions && (
                    <div className="absolute z-30 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg">
                      {filteredStatementCustomerSuggestions.length > 0 ? (
                        filteredStatementCustomerSuggestions.map(customer => (
                          <button
                            key={customer.id}
                            type="button"
                            onMouseDown={() => {
                              setStatementCustomerId(customer.id);
                              setStatementCustomerSearch(customer.name || '');
                              setShowStatementCustomerSuggestions(false);
                            }}
                            className="w-full text-right px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                          >
                            <div className="font-semibold">{customer.name}</div>
                            <div className="text-xs text-slate-500" dir="ltr">{customer.phone || '-'}</div>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-xs text-slate-500">لا توجد نتائج</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute right-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={statementAllCustomersSearch}
                    onChange={(event) => setStatementAllCustomersSearch(event.target.value)}
                    placeholder="بحث ضمن كل العملاء..."
                    className="w-full pr-9 pl-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              <div className="text-xs text-slate-500 flex items-center">
                عدد الكشوف: <span className="font-bold text-primary mr-1">{statementPrintEntries.length}</span>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="overflow-x-auto">
                <div className="inline-flex min-w-max bg-slate-100 dark:bg-slate-700 p-0.5 rounded-lg">
                  <button
                    onClick={() => setStatementDateRange('all')}
                    className={`flex-none px-2.5 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${statementPeriod === 'all' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                  >
                    الكل
                  </button>
                  <button
                    onClick={() => setStatementDateRange('week')}
                    className={`flex-none px-2.5 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${statementPeriod === 'week' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                  >
                    الأسبوع
                  </button>
                  <button
                    onClick={() => setStatementDateRange('month')}
                    className={`flex-none px-2.5 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${statementPeriod === 'month' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                  >
                    الشهر
                  </button>
                  <button
                    onClick={() => setStatementDateRange('year')}
                    className={`flex-none px-2.5 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${statementPeriod === 'year' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                  >
                    السنة
                  </button>
                  <button
                    onClick={() => setStatementPeriod('custom')}
                    className={`flex-none px-2.5 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${statementPeriod === 'custom' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                  >
                    مخصص
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-500 lg:mr-auto">
                الفترة الحالية: <span className="font-bold text-primary">{statementPeriodLabel}</span>
              </div>
            </div>

            {statementPeriod === 'custom' && (
              <div className="inline-flex items-center gap-2 min-w-max whitespace-nowrap">
                <Calendar size={14} className="text-primary" />
                <span className="text-xs text-slate-500">من:</span>
                <DateInput
                  value={statementDateFrom}
                  onChange={setStatementDateFrom}
                  className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-primary w-32"
                  placeholder="يوم-شهر-سنة"
                />
                <span className="text-xs text-slate-500">إلى:</span>
                <DateInput
                  value={statementDateTo}
                  onChange={setStatementDateTo}
                  className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-primary w-32"
                  placeholder="يوم-شهر-سنة"
                />
              </div>
            )}
          </div>

          {statementPaymentsLoading ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
              <Loader2 className="animate-spin h-8 w-8 text-primary mx-auto mb-3" />
              <p className="text-sm text-slate-500">جاري تجهيز كشف الحساب...</p>
            </div>
          ) : statementPrintEntries.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-500">
              لا توجد بيانات كشف حساب.
            </div>
          ) : (
            <div className="space-y-4 statement-batch-print">
              {statementPrintEntries.map((entry) => {
                const customerDetailedAddress = buildDetailedAddress(entry.customer.countryName, entry.customer.provinceName, entry.customer.cityName, entry.customer.address) || 'غير مضاف';
                return (
                  <div key={entry.customer.id} className="statement-print statement-batch-item bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 print:bg-white print:shadow-none print:border-0 overflow-hidden">
                    <div className="p-4 print:p-2 print:w-full print:text-[10px]">
                      <div className="statement-header-block border border-slate-300 dark:border-slate-600 rounded print:border-gray-400 mb-3 print:mb-2">
                        <div className="statement-header-row flex items-center justify-between p-2 border-b border-slate-200 dark:border-slate-600 print:border-gray-300 print:p-1.5">
                          <div className="flex items-center gap-2">
                            {user?.accountLogo ? (
                              <img src={user.accountLogo} alt="شعار" className="h-10 w-10 object-contain print:h-8 print:w-8" />
                            ) : (
                              <Store className="text-slate-500" size={24} />
                            )}
                            <div>
                              <h1 className="text-base font-bold text-slate-800 dark:text-white print:text-black print:text-sm">{user?.companyName || 'المحاسب الذكي'}</h1>
                              {user?.companyPhone && <p className="text-slate-500 text-xs print:text-[9px]" dir="ltr">{user.companyPhone}</p>}
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="text-lg font-bold text-slate-800 dark:text-white print:text-black print:text-sm inline-flex items-center gap-1.5">
                              <FileText size={14} className="text-slate-500 print:text-black" />
                              <span>كشف حساب</span>
                            </p>
                            <p className="text-xs print:text-[9px]">{renderColoredDateTime(new Date())}</p>
                            <p className="text-xs text-slate-500 print:text-[9px]">الفترة: {statementPeriodLabel}</p>
                          </div>
                        </div>

                        <div className="statement-header-summary space-y-2 p-2 print:p-1.5 text-sm print:text-[10px]">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-slate-500">العميل: </span>
                              <span className="font-bold text-slate-800 dark:text-white print:text-black">{entry.customer.name}</span>
                            </div>
                            <div className="flex items-center gap-4 print:gap-2">
                              <div><span className="text-slate-500">الإجمالي: </span><span className="font-bold">{entry.allInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}</span></div>
                              <div><span className="text-slate-500">المدفوع: </span><span className="font-bold text-emerald-600">{entry.allInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0).toLocaleString()}</span></div>
                              <div><span className="text-slate-500">المديونية: </span><span className={`font-bold ${entry.totalDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{entry.totalDue.toLocaleString()} {currency}</span></div>
                            </div>
                          </div>

                          <div className="border-t border-slate-200 dark:border-slate-500 print:border-gray-300 pt-1.5 text-xs overflow-x-auto print:overflow-visible">
                            <div className="statement-contact-line inline-flex items-center gap-2 min-w-max whitespace-nowrap text-slate-700 dark:text-slate-300 print:text-black">
                              <Phone size={13} className="text-slate-500 print:text-black" />
                              <span className="text-slate-500">الهاتف:-</span>
                              <span className="font-semibold" dir="ltr">{(entry.customer.phone || '').toString().trim() || CONTACT_PLACEHOLDER_PHONE}</span>

                              <span className="text-slate-300 dark:text-slate-600">|</span>
                              <MapPin size={13} className="text-slate-500 print:text-black" />
                              <span className="text-slate-500">العنوان :</span>
                              <span className="font-semibold max-w-[380px] overflow-hidden text-ellipsis" title={customerDetailedAddress}>
                                {customerDetailedAddress}
                              </span>

                              <span className="text-slate-300 dark:text-slate-600">|</span>
                              <Mail size={13} className="text-slate-500 print:text-black" />
                              <span className="text-slate-500">البريد الإلكتروني:</span>
                              <span className="font-semibold" dir="ltr">{(entry.customer.primaryEmailAddress || '').toString().trim() || CONTACT_PLACEHOLDER_EMAIL}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1 print:text-black print:text-[10px] print:mb-0.5">الفواتير المستحقة</p>
                      <div className="rounded overflow-hidden mb-3 print:mb-2">
                        <table className="statement-table w-full text-center text-sm print:text-[10px] border-collapse border border-slate-300 dark:border-slate-600 print:border-gray-400">
                          <thead className="border-b border-slate-300 dark:border-slate-600 print:border-gray-400">
                            <tr className="text-slate-600 dark:text-slate-300 print:text-black">
                              <th className="statement-nowrap p-1.5 print:p-1 w-[108px] print:w-[108px] whitespace-nowrap font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">رقم الفاتورة</th>
                              <th className="statement-nowrap p-1.5 print:p-1 w-[140px] print:w-[140px] whitespace-nowrap font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">التاريخ</th>
                              <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">النوع</th>
                              <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">البيان</th>
                              <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">المبلغ</th>
                              <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">مدفوع</th>
                              <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">متبقي</th>
                              <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">رصيد المديونية</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              let runningBalance = 0;
                              return entry.invoices.map((inv) => {
                                runningBalance += inv.remainingAmount;
                                const invoiceType = inv.invoiceType === 0 ? 'مبيعات' : inv.invoiceType === 1 ? 'مرتجع' : inv.invoiceType === 2 ? 'عرض سعر' : 'فاتورة';
                                const verifiedPaymentCandidate = verifiedInvoicePayments[inv.id];
                                const verifiedPayment = verifiedPaymentCandidate && verifiedPaymentCandidate.customerId === entry.customer.id
                                  ? verifiedPaymentCandidate
                                  : undefined;
                                const verifiedPaymentTitle = verifiedPayment
                                  ? `آخر دفعة موثقة: ${verifiedPayment.amount.toLocaleString()} ${currency} | المتبقي: ${verifiedPayment.remainingBefore.toLocaleString()} → ${verifiedPayment.remainingAfter.toLocaleString()} | ${formatDate(verifiedPayment.verifiedAt)} ${formatTime(verifiedPayment.verifiedAt)}`
                                  : '';
                                return (
                                  <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-700 print:border-gray-200">
                                    <td className="statement-nowrap p-1.5 print:p-1 text-slate-500 text-xs whitespace-nowrap border-l border-slate-100 dark:border-slate-700 print:border-gray-200" dir="ltr">
                                      <div>{inv.invoiceNumber || inv.id}</div>
                                      {verifiedPayment && (
                                        <div className="mt-1 flex justify-center" dir="rtl">
                                          <span
                                            className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300"
                                            title={verifiedPaymentTitle}
                                          >
                                            آخر دفعة موثقة
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="statement-nowrap p-1.5 print:p-1 whitespace-nowrap border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{renderColoredDateTime(inv.date)}</td>
                                    <td className="p-1.5 print:p-1 text-slate-500 text-xs border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{invoiceType}</td>
                                    <td className="p-1.5 print:p-1 text-slate-500 truncate print:whitespace-normal print:break-words max-w-[100px] print:max-w-[80px] border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.notes || '-'}</td>
                                    <td className="p-1.5 print:p-1 font-medium text-slate-800 dark:text-white print:text-black border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.totalAmount.toLocaleString()}</td>
                                    <td className="p-1.5 print:p-1 text-emerald-600 border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.paidAmount.toLocaleString()}</td>
                                    <td className="p-1.5 print:p-1 font-bold text-rose-600 border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.remainingAmount.toLocaleString()}</td>
                                    <td className="p-1.5 print:p-1 font-bold text-slate-800 dark:text-white print:text-black border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{runningBalance.toLocaleString()}</td>
                                  </tr>
                                );
                              });
                            })()}
                            {entry.invoices.length === 0 && (
                              <tr><td colSpan={8} className="p-2 text-center text-slate-400 text-sm print:p-1">✓ لا توجد ديون</td></tr>
                            )}
                          </tbody>
                          {entry.invoices.length > 0 && (
                            <tfoot className="border-t border-slate-300 dark:border-slate-500 print:border-gray-400 font-bold">
                              <tr>
                                <td colSpan={4} className="p-1.5 print:p-1 text-slate-600 print:text-black border-l border-slate-200 dark:border-slate-600 print:border-gray-300">الإجمالي</td>
                                <td className="p-1.5 print:p-1 border-l border-slate-200 dark:border-slate-600 print:border-gray-300">{entry.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}</td>
                                <td className="p-1.5 print:p-1 text-emerald-600 border-l border-slate-200 dark:border-slate-600 print:border-gray-300">{entry.invoices.reduce((sum, inv) => sum + inv.paidAmount, 0).toLocaleString()}</td>
                                <td className="p-1.5 print:p-1 text-rose-600 border-l border-slate-200 dark:border-slate-600 print:border-gray-300">{entry.totalDue.toLocaleString()}</td>
                                <td className="p-1.5 print:p-1 border-l border-slate-200 dark:border-slate-600 print:border-gray-300"></td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>

                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1 print:text-black print:text-[10px] print:mb-0.5">الفواتير المسددة</p>
                      <div className="rounded overflow-hidden mb-3 print:mb-2">
                        <table className="statement-table w-full text-center text-sm print:text-[10px] border-collapse border border-slate-300 dark:border-slate-600 print:border-gray-400">
                          <thead className="border-b border-slate-300 dark:border-slate-600 print:border-gray-400">
                            <tr className="text-slate-600 dark:text-slate-300 print:text-black">
                              <th className="statement-nowrap p-1.5 print:p-1 w-[108px] print:w-[108px] whitespace-nowrap font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">رقم الفاتورة</th>
                              <th className="statement-nowrap p-1.5 print:p-1 w-[140px] print:w-[140px] whitespace-nowrap font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">التاريخ</th>
                              <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">النوع</th>
                              <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">البيان</th>
                              <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">المبلغ</th>
                              <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">مدفوع</th>
                              <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">متبقي</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.paidInvoices.length > 0 ? (
                              entry.paidInvoices.map((inv) => {
                                const invoiceType = inv.invoiceType === 0 ? 'مبيعات' : inv.invoiceType === 1 ? 'مرتجع' : inv.invoiceType === 2 ? 'عرض سعر' : 'فاتورة';
                                return (
                                  <tr key={`paid-${inv.id}`} className="border-b border-slate-100 dark:border-slate-700 print:border-gray-200">
                                    <td className="statement-nowrap p-1.5 print:p-1 text-slate-500 text-xs whitespace-nowrap border-l border-slate-100 dark:border-slate-700 print:border-gray-200" dir="ltr">{inv.invoiceNumber || inv.id}</td>
                                    <td className="statement-nowrap p-1.5 print:p-1 whitespace-nowrap border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{renderColoredDateTime(inv.date)}</td>
                                    <td className="p-1.5 print:p-1 text-slate-500 text-xs border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{invoiceType}</td>
                                    <td className="p-1.5 print:p-1 text-slate-500 truncate print:whitespace-normal print:break-words max-w-[120px] print:max-w-[80px] border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.notes || '-'}</td>
                                    <td className="p-1.5 print:p-1 font-medium text-slate-800 dark:text-white print:text-black border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.totalAmount.toLocaleString()}</td>
                                    <td className="p-1.5 print:p-1 font-bold text-emerald-600 border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.paidAmount.toLocaleString()}</td>
                                    <td className="p-1.5 print:p-1 font-bold text-emerald-600 border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{(inv.remainingAmount || 0).toLocaleString()}</td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr><td colSpan={7} className="p-2 text-center text-slate-400 text-sm print:p-1">لا توجد فواتير مسددة</td></tr>
                            )}
                          </tbody>
                          {entry.paidInvoices.length > 0 && (
                            <tfoot className="border-t border-slate-300 dark:border-slate-500 print:border-gray-400 font-bold">
                              <tr>
                                <td colSpan={4} className="p-1.5 print:p-1 text-slate-600 print:text-black border-l border-slate-200 dark:border-slate-600 print:border-gray-300">الإجمالي</td>
                                <td className="p-1.5 print:p-1 border-l border-slate-200 dark:border-slate-600 print:border-gray-300">{entry.paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}</td>
                                <td className="p-1.5 print:p-1 text-emerald-600 border-l border-slate-200 dark:border-slate-600 print:border-gray-300">{entry.paidInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0).toLocaleString()}</td>
                                <td className="p-1.5 print:p-1 text-emerald-600 border-l border-slate-200 dark:border-slate-600 print:border-gray-300">{entry.paidInvoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0).toLocaleString()}</td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>

                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1 print:text-black print:text-[10px] print:mb-0.5">سجل الدفعات</p>
                      <div className="rounded overflow-hidden mb-3 print:mb-2">
                        <table className="statement-table w-full text-center text-sm print:text-[10px] border-collapse border border-slate-300 dark:border-slate-600 print:border-gray-400">
                          <thead className="border-b border-slate-300 dark:border-slate-600 print:border-gray-400">
                            <tr className="text-slate-600 dark:text-slate-300 print:text-black">
                              <th className="statement-nowrap p-1.5 print:p-1 w-[140px] print:w-[140px] whitespace-nowrap font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">التاريخ</th>
                              <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">المبلغ</th>
                              <th className="statement-nowrap p-1.5 print:p-1 w-[108px] print:w-[108px] whitespace-nowrap font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">رقم الفاتورة</th>
                              <th className="p-1.5 print:p-1 font-semibold">ملاحظات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.payments.length > 0 ? (
                              entry.payments.map((pay) => (
                                <tr key={pay.id} className="border-b border-slate-100 dark:border-slate-700 print:border-gray-200">
                                  <td className="statement-nowrap p-1.5 print:p-1 whitespace-nowrap border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{pay.paymentDate ? renderColoredDateTime(pay.paymentDate) : '-'}</td>
                                  <td className="p-1.5 print:p-1 font-bold text-emerald-600 border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{pay.amount.toLocaleString()} {currency}</td>
                                  <td className="statement-nowrap p-1.5 print:p-1 text-slate-500 text-xs whitespace-nowrap border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{pay.invoiceNumber || (pay.invoiceId ? `#${pay.invoiceId}` : '-')}</td>
                                  <td className="p-1.5 print:p-1 text-slate-500 truncate print:whitespace-normal print:break-words max-w-[120px] print:max-w-[80px]">{pay.notes || pay.description || '-'}</td>
                                </tr>
                              ))
                            ) : (
                              <tr><td colSpan={4} className="p-2 text-center text-slate-400 text-sm print:p-1">لا يوجد سجل مدفوعات</td></tr>
                            )}
                          </tbody>
                          {entry.payments.length > 0 && (
                            <tfoot className="border-t border-slate-300 dark:border-slate-500 print:border-gray-400 font-bold">
                              <tr>
                                <td className="p-1.5 print:p-1 text-slate-600 print:text-black border-l border-slate-200 dark:border-slate-600 print:border-gray-300">إجمالي المدفوعات</td>
                                <td className="p-1.5 print:p-1 text-emerald-600 border-l border-slate-200 dark:border-slate-600 print:border-gray-300">{entry.payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()} {currency}</td>
                                <td colSpan={2} className="p-1.5 print:p-1"></td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 print:text-[9px] pt-2 border-t border-dashed border-slate-200 dark:border-slate-700 print:border-gray-300 print:pt-1">
                        {entry.customer.notes && (
                          <p className="max-w-[60%] leading-5 line-clamp-2 break-words overflow-hidden" title={normalizeNotesText(entry.customer.notes)}>
                            <b>ملاحظات:</b> {normalizeNotesText(entry.customer.notes)}
                          </p>
                        )}
                        <p className="mr-auto inline-flex items-center gap-1.5">
                          <span>{user?.companyName} |</span>
                          {renderColoredDateTime(new Date())}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      ) : view === 'create' ? (
        /* Create/Edit Customer View - Enhanced Design */
        <div className="max-w-2xl mx-auto animate-in slide-in-from-left-4 duration-300">
          <div className="bg-white dark:bg-slate-800/95 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${editingCustomerId 
                    ? 'bg-blue-100 dark:bg-blue-900/30' 
                    : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                    {editingCustomerId 
                      ? <Edit2 size={24} className="text-blue-600 dark:text-blue-400"/> 
                      : <UserPlus size={24} className="text-emerald-600 dark:text-emerald-400"/>}
                  </div>
                  <div>
                    <h3 className={`font-bold text-xl ${editingCustomerId 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {editingCustomerId ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                      {editingCustomerId ? 'قم بتحديث بيانات العميل' : 'أضف عميلاً جديداً إلى قائمتك'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={cancelEdit} 
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-5">
              {/* Customer Name */}
              <div className="group">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <User size={16} className="text-emerald-500" />
                  اسم العميل
                  <span className="text-rose-500">*</span>
                  <span className={`mr-auto text-xs font-medium ${customerNameRemaining <= 10 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                    المتبقي: {customerNameRemaining}
                  </span>
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    className="w-full border-2 border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3.5 pr-11 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-400 outline-none bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
                    value={formCustName}
                    onChange={e => setFormCustName(e.target.value.slice(0, customerNameMaxLength))}
                    maxLength={customerNameMaxLength}
                    placeholder="مثال: محمد أحمد علي..."
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <User size={18} />
                  </div>
                </div>
              </div>

              {/* Phone Numbers - Add during creation */}
              <div className="group">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <Phone size={16} className="text-blue-500" />
                  الهواتف
                  <span className="text-slate-400 text-xs font-normal">(اختياري)</span>
                  <span className={`mr-auto text-xs font-medium ${customerPhoneRemaining <= 3 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                    المتبقي: {customerPhoneRemaining}
                  </span>
                </label>
                
                {/* Phone Input Row */}
                <div className="flex gap-2 mb-3">
                  <input 
                    type="tel" 
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value.slice(0, customerPhoneMaxLength))}
                    maxLength={customerPhoneMaxLength}
                    placeholder="أدخل رقم الهاتف"
                    className="flex-1 border-2 border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 outline-none bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
                  />
                  <select
                    value={newPhoneIsPrimary ? 'primary' : 'secondary'}
                    onChange={e => setNewPhoneIsPrimary(e.target.value === 'primary')}
                    className="border-2 border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 outline-none bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white text-sm transition-all min-w-[105px]"
                    title="نوع الأهمية"
                  >
                    <option value="primary">أساسي</option>
                    <option value="secondary">ثانوي</option>
                  </select>
                  <select 
                    value={newPhoneType}
                    onChange={e => setNewPhoneType(e.target.value)}
                    className="border-2 border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 outline-none bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white text-sm transition-all min-w-[110px]"
                  >
                    <option value="Mobile">جوال</option>
                    <option value="Home">منزل</option>
                    <option value="Work">عمل</option>
                    <option value="Other">آخر</option>
                  </select>
                  <button 
                    type="button"
                    onClick={() => {
                      if (newPhone.trim()) {
                        const draftPhoneId = Date.now();
                        setCustomerPhones(prev => normalizePhonePrimaryState([
                          ...prev,
                          {
                            id: draftPhoneId,
                            phone: newPhone,
                            phoneType: newPhoneType,
                            isPrimary: newPhoneIsPrimary,
                            isSecondary: !newPhoneIsPrimary
                          }
                        ], newPhoneIsPrimary ? draftPhoneId : undefined));
                        setNewPhone('');
                        setNewPhoneType('Mobile');
                        setNewPhoneIsPrimary(false);
                      }
                    }}
                    disabled={!newPhone.trim()}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                    إضافة
                  </button>
                </div>

                {/* Phone List */}
                {customerPhones.length > 0 && (
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        📱 {editingCustomerId ? 'الهواتف المحفوظة والمضافة' : 'الهواتف المضافة'}
                      </p>
                      {editingCustomerId && (
                        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                          جديد: {customerPhones.filter(p => !(p as any).isExisting).length} | محفوظ: {customerPhones.filter(p => (p as any).isExisting).length}
                        </span>
                      )}
                    </div>
                    {customerPhones.map((phone, idx) => {
                      const isExisting = (phone as any).isExisting || false;
                      return (
                      <div key={phone.id} className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                        isExisting 
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50' 
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50'
                      }`}>
                        <div className="flex items-center gap-3 flex-1">
                          <Phone size={16} className={isExisting ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-slate-900 dark:text-white text-sm" dir="ltr">{phone.phone || phone.number}</p>
                              {isExisting && <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded whitespace-nowrap">محفوظ</span>}
                              {phone.isPrimary && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded whitespace-nowrap">أساسي</span>}
                              {phone.isSecondary && <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded whitespace-nowrap">ثانوي</span>}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {(() => { const pt = phone.phoneType?.toLowerCase() || phone.type?.toLowerCase() || ''; return pt === 'mobile' ? '🔵 جوال' : pt === 'home' ? '🏠 منزل' : pt === 'work' ? '💼 عمل' : pt === 'other' ? '📌 آخر' : '📌 نوع'; })()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button 
                            type="button"
                            onClick={() => {
                              console.log('Editing phone:', phone);
                              console.log('Phone ID:', phone.id, 'Phone data:', phone);
                              setEditingPhoneId(phone.id);
                              setEditPhoneNumber(phone.phone || phone.phoneNumber || phone.number);
                              setEditPhoneType(phone.phoneType || phone.type || 'mobile');
                              setEditPhoneIsPrimary(phone.isPrimary || false);
                            }}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                            title="تعديل الهاتف"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Create form phone data:', phone);
                              setDeletePhoneId(phone.id);
                              setDeletePhoneData(phone);
                            }}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            title="حذف الهاتف"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}

                {/* Edit Phone Modal in Create Form */}
                {editingPhoneId && customerPhones.find(p => p.id === editingPhoneId) && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-6">
                      <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">تعديل رقم الهاتف</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">رقم الهاتف</label>
                          <input 
                            type="tel" 
                            className="w-full border border-slate-300 dark:border-slate-600 p-3 rounded-lg focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            value={editPhoneNumber}
                            onChange={e => setEditPhoneNumber(e.target.value.slice(0, customerPhoneMaxLength))}
                            maxLength={customerPhoneMaxLength}
                            placeholder="+966501234567"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">نوع الهاتف</label>
                          <select 
                            className="w-full border border-slate-300 dark:border-slate-600 p-3 rounded-lg focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            value={editPhoneType}
                            onChange={e => setEditPhoneType(e.target.value)}
                          >
                            <option value="Mobile">جوال</option>
                            <option value="Home">منزل</option>
                            <option value="Work">عمل</option>
                            <option value="Other">آخر</option>
                          </select>
                        </div>

                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center justify-between cursor-pointer" onClick={() => setEditPhoneIsPrimary(!editPhoneIsPrimary)}>
                            <div className="flex items-center gap-3">
                              {editPhoneIsPrimary ? (
                                <Star size={20} className="text-yellow-500 fill-yellow-500" />
                              ) : (
                                <Phone size={20} className="text-slate-400" />
                              )}
                                <div>
                                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    {editPhoneIsPrimary ? 'هاتف أساسي' : 'هاتف ثانوي'}
                                  </span>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    الهاتف الأساسي يظهر في البداية وفي التقارير
                                  </p>
                                </div>
                            </div>
                            <div className={`w-12 h-7 rounded-full transition-all flex items-center ${editPhoneIsPrimary ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                              <div className={`w-5 h-5 rounded-full bg-white transition-all ${editPhoneIsPrimary ? 'translate-x-6' : 'translate-x-1'}`}></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                          <button 
                            type="button"
                            onClick={handleEditPhone}
                            disabled={editPhoneLoading}
                            className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg hover:bg-emerald-700 font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {editPhoneLoading ? (
                              <>
                                <Loader2 size={16} className="animate-spin" />
                                جاري الحفظ...
                              </>
                            ) : (
                              <>
                                <Save size={16} />
                                حفظ التعديل
                              </>
                            )}
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingPhoneId(null);
                              setEditPhoneNumber('');
                              setEditPhoneType('Mobile');
                              setEditPhoneIsPrimary(false);
                            }}
                            disabled={editPhoneLoading}
                            className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Delete Phone Confirmation - Removed duplicate, shown only in main detail view */}

              </div>

              {/* Notes */}
              <div className="group">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <StickyNote size={16} className="text-amber-500" />
                  ملاحظات
                  <span className="text-slate-400 text-xs font-normal">(اختياري)</span>
                  <span className={`mr-auto text-xs font-medium ${customerNotesRemaining <= 20 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                    المتبقي: {customerNotesRemaining}
                  </span>
                </label>
                <textarea 
                  className="w-full border-2 border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-400 outline-none bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 resize-none h-28 transition-all"
                  value={formCustNotes}
                  onChange={e => setFormCustNotes(e.target.value.slice(0, customerNotesMaxLength))}
                  maxLength={customerNotesMaxLength}
                  placeholder="عنوان، تفاصيل إضافية، ملاحظات خاصة..."
                />
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <Mail size={16} className="text-blue-500" />
                  البريد الإلكتروني
                  <span className="text-slate-400 text-xs font-normal">(اختياري)</span>
                  <span className={`mr-auto text-xs font-medium ${customerEmailRemaining <= 10 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                    المتبقي: {customerEmailRemaining}
                  </span>
                </label>
                <input 
                  type="email"
                  className="w-full border-2 border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 outline-none bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
                  value={formCustEmail}
                  onChange={e => setFormCustEmail(e.target.value.slice(0, customerEmailMaxLength))}
                  maxLength={customerEmailMaxLength}
                  placeholder="البريد الإلكتروني الأساسي..."
                />
              </div>

              {/* Geographic Fields - حقول إضافية */}
              <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800/30">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">حقول إضافية</h3>
                
                {/* Country, Province, City */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">الدولة</label>
                    <GeoSearchSelect
                      options={countries}
                      value={formCustCountryId}
                      onChange={(countryId) => {
                        setFormCustCountryId(countryId);
                        setFormCustProvinceId(null);
                        setFormCustCityId(null);
                      }}
                      placeholder={geoLoading ? 'جاري تحميل الدول...' : 'ابحث واختر الدولة'}
                      loading={geoLoading}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">المحافظة</label>
                    <GeoSearchSelect
                      options={provinces}
                      value={formCustProvinceId}
                      onChange={(provinceId) => {
                        setFormCustProvinceId(provinceId);
                        setFormCustCityId(null);
                      }}
                      disabled={!formCustCountryId}
                      placeholder={formCustCountryId ? 'ابحث واختر المحافظة' : 'اختر الدولة أولاً'}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">المدينة</label>
                    <GeoSearchSelect
                      options={cities}
                      value={formCustCityId}
                      onChange={setFormCustCityId}
                      disabled={!formCustProvinceId}
                      placeholder={formCustProvinceId ? 'ابحث واختر المدينة' : 'اختر المحافظة أولاً'}
                    />
                  </div>
                </div>

                {/* Address Field */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-2">
                    <span>تفاصيل إضافية على العنوان</span>
                    <span className={`mr-auto text-[11px] font-medium ${customerAddressRemaining <= 10 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                      المتبقي: {customerAddressRemaining}
                    </span>
                  </label>
                  <input 
                    type="text" 
                    value={formCustAddress} 
                    onChange={e => setFormCustAddress(e.target.value.slice(0, customerAddressMaxLength))}
                    maxLength={customerAddressMaxLength}
                    placeholder="مثال: شارع فيصل - برج 12 - الدور 3 (اختياري)" 
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700/50" 
                  />
                  <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    العنوان الناتج تلقائياً: {formDetailedAddressPreview || 'سيظهر بعد اختيار الدولة/المحافظة/المدينة'}
                  </p>

                  <div className="mt-3 p-3 bg-white/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={openCustomerLocationOnMap}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        <MapPin size={13} />
                        فتح الخريطة
                      </button>
                      <button
                        type="button"
                        onClick={detectCustomerLocation}
                        disabled={detectingLocation}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-70"
                      >
                        {detectingLocation ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
                        موقعي الحالي
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormCustLatitude('');
                          setFormCustLongitude('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      >
                        مسح الإحداثيات
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 block">خط العرض (Latitude)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          value={formCustLatitude}
                          onChange={e => setFormCustLatitude(e.target.value)}
                          placeholder="مثال: 24.713552"
                          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700/50"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 block">خط الطول (Longitude)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          value={formCustLongitude}
                          onChange={e => setFormCustLongitude(e.target.value)}
                          placeholder="مثال: 46.675297"
                          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700/50"
                        />
                      </div>
                    </div>

                    <CoordinateMapPicker
                      latitude={formCustLatitude}
                      longitude={formCustLongitude}
                      label={formCustName || 'موقع العميل'}
                      onChange={(nextLatitude, nextLongitude) => {
                        setFormCustLatitude(nextLatitude);
                        setFormCustLongitude(nextLongitude);
                      }}
                    />

                    {!formCoordinatesPreview.isValid && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400">{formCoordinatesPreview.message}</p>
                    )}
                    {formCoordinatesPreview.isValid && formCoordinatesPreview.hasCoordinates && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400" dir="ltr">
                        GPS({formCoordinatesPreview.latitude}, {formCoordinatesPreview.longitude})
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      يمكنك فتح الخريطة لتحديد النقطة ثم إدخال الإحداثيات، أو استخدام موقعك الحالي تلقائياً.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button 
                  type="submit" 
                  disabled={formLoading}
                  className={`flex-1 text-white py-3.5 rounded-xl transition-all font-bold flex items-center justify-center gap-2.5 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed ${
                    editingCustomerId 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25' 
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25'
                  }`}
                >
                  {formLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      {editingCustomerId ? 'حفظ التعديلات' : 'حفظ العميل'}
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  onClick={cancelEdit}
                  className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 px-6 py-3.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 font-semibold flex items-center gap-2 transition-all"
                >
                  <XCircle size={18} />
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>

      ) : (
        /* Customer Detail View */
        <div className="statement-page space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between no-print">
            <button 
                onClick={() => setView('list')}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 bg-white dark:bg-slate-800 px-3 py-2 rounded shadow-sm"
            >
                &rarr; العودة للقائمة
            </button>
            <div className="flex gap-2">
                <button onClick={() => printWithFileName({ 
                  companyName: user?.companyName, 
                  type: 'كشف حساب', 
                  customerName: selectedCustomer?.name 
                })} className="bg-slate-800 dark:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-700 dark:hover:bg-slate-600">
                    <Printer size={18} /> طباعة كشف الحساب
                </button>
            </div>
          </div>

          {selectedCustomer && (
            <div className="statement-print bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 print:bg-white print:shadow-none print:border-0 overflow-hidden">
                {/* محتوى الكشف القابل للطباعة */}
                <div className="p-4 print:p-2 print:w-full print:text-[10px]">
                  {/* رأس الكشف - مضغوط */}
                  <div className="statement-header-block border border-slate-300 dark:border-slate-600 rounded print:border-gray-400 mb-3 print:mb-2">
                    {/* الصف الأول: الشعار + الشركة + كشف حساب */}
                    <div className="statement-header-row flex items-center justify-between p-2 border-b border-slate-200 dark:border-slate-600 print:border-gray-300 print:p-1.5">
                      <div className="flex items-center gap-2">
                        {user?.accountLogo ? (
                          <img src={user.accountLogo} alt="شعار" className="h-10 w-10 object-contain print:h-8 print:w-8" />
                        ) : (
                          <Store className="text-slate-500" size={24} />
                        )}
                        <div>
                          <h1 className="text-base font-bold text-slate-800 dark:text-white print:text-black print:text-sm">{user?.companyName || 'المحاسب الذكي'}</h1>
                          {user?.companyPhone && <p className="text-slate-500 text-xs print:text-[9px]" dir="ltr">{user.companyPhone}</p>}
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-slate-800 dark:text-white print:text-black print:text-sm inline-flex items-center gap-1.5">
                          <FileText size={14} className="text-slate-500 print:text-black" />
                          <span>كشف حساب</span>
                        </p>
                        <p className="text-xs print:text-[9px]">{renderColoredDateTime(new Date())}</p>
                        <p className="text-xs text-slate-500 print:text-[9px]">الفترة: {statementPeriodLabel}</p>
                      </div>
                    </div>
                    
                    {/* الصف v1005: بيانات العميل + الملخص المالي */}
                    <div className="statement-header-summary space-y-2 p-2 print:p-1.5 text-sm print:text-[10px]">
                      {/* الصف الأول: الاسم والملخص المالي */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-slate-500">العميل: </span>
                          <span className="font-bold text-slate-800 dark:text-white print:text-black">{selectedCustomer.name}</span>
                        </div>
                        <div className="flex items-center gap-4 print:gap-2">
                          <div><span className="text-slate-500">الإجمالي: </span><span className="font-bold">{customerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}</span></div>
                          <div><span className="text-slate-500">المدفوع: </span><span className="font-bold text-emerald-600">{customerInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0).toLocaleString()}</span></div>
                          <div><span className="text-slate-500">المديونية: </span><span className={`font-bold ${customerTotalDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{customerTotalDue.toLocaleString()} {currency}</span></div>
                        </div>
                      </div>
                      
                      {/* الصف الثاني: سطر واحد لبيانات التواصل */}
                      <div className="border-t border-slate-200 dark:border-slate-500 print:border-gray-300 pt-1.5 text-xs overflow-x-auto print:overflow-visible">
                        <div className="statement-contact-line inline-flex items-center gap-2 min-w-max whitespace-nowrap text-slate-700 dark:text-slate-300 print:text-black">
                          <Phone size={13} className="text-slate-500 print:text-black" />
                          <span className="text-slate-500">الهاتف:-</span>
                          <span className="font-semibold" dir="ltr">
                            {(() => {
                              const primaryPhone = selectedCustomer.phones && selectedCustomer.phones.length > 0
                                ? selectedCustomer.phones.find(p => p.isPrimary)?.phone || selectedCustomer.phones[0]?.phone
                                : selectedCustomer.phone;
                              const trimmedPhone = (primaryPhone || '').toString().trim();
                              const hasDetailPhone = trimmedPhone.length > 0;
                              return (
                                <span className={hasDetailPhone ? '' : 'inline-flex items-center px-2 py-0.5 rounded-md border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/60 text-slate-400/90 dark:text-slate-500/90'}>
                                  {hasDetailPhone ? trimmedPhone : CONTACT_PLACEHOLDER_PHONE}
                                </span>
                              );
                            })()}
                          </span>

                          <span className="text-slate-300 dark:text-slate-600">|</span>
                          <MapPin size={13} className="text-slate-500 print:text-black" />
                          <span className="text-slate-500">العنوان :</span>
                          <span
                            className="font-semibold max-w-[380px] overflow-hidden text-ellipsis"
                            title={selectedCustomerDetailedAddress || 'غير مضاف'}
                          >
                            {selectedCustomerDetailedAddress || 'غير مضاف'}
                          </span>

                          <span className="text-slate-300 dark:text-slate-600">|</span>
                          <Mail size={13} className="text-slate-500 print:text-black" />
                          <span className="text-slate-500">البريد الإلكتروني:</span>
                          <span className="font-semibold" dir="ltr">
                            {(() => {
                              const trimmedEmail = (selectedCustomer.primaryEmailAddress || '').toString().trim();
                              const hasDetailEmail = trimmedEmail.length > 0;
                              return (
                                <span className={hasDetailEmail ? '' : 'inline-flex items-center px-2 py-0.5 rounded-md border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/60 text-slate-400/90 dark:text-slate-500/90'}>
                                  {hasDetailEmail ? trimmedEmail : CONTACT_PLACEHOLDER_EMAIL}
                                </span>
                              );
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* جدول الفواتير المستحقة */}
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1 print:text-black print:text-[10px] print:mb-0.5">الفواتير المستحقة</p>
                  <div className="rounded overflow-hidden mb-3 print:mb-2">
                    <table className="statement-table w-full text-center text-sm print:text-[10px] border-collapse border border-slate-300 dark:border-slate-600 print:border-gray-400">
                      <thead className="border-b border-slate-300 dark:border-slate-600 print:border-gray-400">
                        <tr className="text-slate-600 dark:text-slate-300 print:text-black">
                          <th className="statement-nowrap p-1.5 print:p-1 w-[108px] print:w-[108px] whitespace-nowrap font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">رقم الفاتورة</th>
                          <th className="statement-nowrap p-1.5 print:p-1 w-[140px] print:w-[140px] whitespace-nowrap font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">التاريخ</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">النوع</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">البيان</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">المبلغ</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">مدفوع</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">متبقي</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">رصيد المديونية</th>
                          <th className="p-1.5 print:p-1 no-print w-14 font-semibold">سداد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let runningBalance = 0;
                          return dueInvoices.map((inv) => {
                            runningBalance += inv.remainingAmount;
                            const invoiceType = inv.invoiceType === 0 ? 'مبيعات' : inv.invoiceType === 1 ? 'مرتجع' : inv.invoiceType === 2 ? 'عرض سعر' : 'فاتورة';
                            const verifiedPaymentCandidate = verifiedInvoicePayments[inv.id];
                            const verifiedPayment = verifiedPaymentCandidate && verifiedPaymentCandidate.customerId === selectedCustomer?.id
                              ? verifiedPaymentCandidate
                              : undefined;
                            const verifiedPaymentTitle = verifiedPayment
                              ? `آخر دفعة موثقة: ${verifiedPayment.amount.toLocaleString()} ${currency} | المتبقي: ${verifiedPayment.remainingBefore.toLocaleString()} → ${verifiedPayment.remainingAfter.toLocaleString()} | ${formatDate(verifiedPayment.verifiedAt)} ${formatTime(verifiedPayment.verifiedAt)}`
                              : '';
                            return (
                              <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-700 print:border-gray-200">
                                <td className="statement-nowrap p-1.5 print:p-1 text-slate-500 text-xs whitespace-nowrap border-l border-slate-100 dark:border-slate-700 print:border-gray-200" dir="ltr">
                                  <div>{inv.invoiceNumber || inv.id}</div>
                                  {verifiedPayment && (
                                    <div className="mt-1 flex justify-center" dir="rtl">
                                      <span
                                        className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300"
                                        title={verifiedPaymentTitle}
                                      >
                                        آخر دفعة موثقة
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="statement-nowrap p-1.5 print:p-1 whitespace-nowrap border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{renderColoredDateTime(inv.date)}</td>
                                <td className="p-1.5 print:p-1 text-slate-500 text-xs border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{invoiceType}</td>
                                <td className="p-1.5 print:p-1 text-slate-500 truncate print:whitespace-normal print:break-words max-w-[100px] print:max-w-[80px] border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.notes || '-'}</td>
                                <td className="p-1.5 print:p-1 font-medium text-slate-800 dark:text-white print:text-black border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.totalAmount.toLocaleString()}</td>
                                <td className="p-1.5 print:p-1 text-emerald-600 border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.paidAmount.toLocaleString()}</td>
                                <td className="p-1.5 print:p-1 font-bold text-rose-600 border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.remainingAmount.toLocaleString()}</td>
                                <td className="p-1.5 print:p-1 font-bold text-slate-800 dark:text-white print:text-black border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{runningBalance.toLocaleString()}</td>
                                <td className="p-1.5 print:p-1 no-print">
                                  <button 
                                    onClick={() => {
                                      setPayInvoiceId(inv.id);
                                      setPayInvoiceNumber(inv.invoiceNumber || `#${inv.id}`);
                                      setPayMaxAmount(inv.remainingAmount || 0);
                                      setPayAmount(inv.remainingAmount || 0);
                                      setShowPayModal(true);
                                    }}
                                    className="bg-primary text-white px-2 py-0.5 rounded text-xs hover:bg-blue-700"
                                  >
                                    سداد
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                        {dueInvoices.length === 0 && (
                          <tr><td colSpan={9} className="p-2 text-center text-slate-400 text-sm print:p-1">✓ لا توجد ديون</td></tr>
                        )}
                      </tbody>
                      {dueInvoices.length > 0 && (
                        <tfoot className="border-t border-slate-300 dark:border-slate-500 print:border-gray-400 font-bold">
                          <tr>
                            <td colSpan={4} className="p-1.5 print:p-1 text-slate-600 print:text-black border-l border-slate-200 dark:border-slate-600 print:border-gray-300">الإجمالي</td>
                            <td className="p-1.5 print:p-1 border-l border-slate-200 dark:border-slate-600 print:border-gray-300">{dueInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}</td>
                            <td className="p-1.5 print:p-1 text-emerald-600 border-l border-slate-200 dark:border-slate-600 print:border-gray-300">{dueInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0).toLocaleString()}</td>
                            <td className="p-1.5 print:p-1 text-rose-600 border-l border-slate-200 dark:border-slate-600 print:border-gray-300">{customerTotalDue.toLocaleString()}</td>
                            <td className="p-1.5 print:p-1 border-l border-slate-200 dark:border-slate-600 print:border-gray-300"></td>
                            <td className="p-1.5 print:p-1 no-print"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* جدول الفواتير المسددة */}
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1 print:text-black print:text-[10px] print:mb-0.5">الفواتير المسددة</p>
                  <div className="rounded overflow-hidden mb-3 print:mb-2">
                    <table className="statement-table w-full text-center text-sm print:text-[10px] border-collapse border border-slate-300 dark:border-slate-600 print:border-gray-400">
                      <thead className="border-b border-slate-300 dark:border-slate-600 print:border-gray-400">
                        <tr className="text-slate-600 dark:text-slate-300 print:text-black">
                          <th className="statement-nowrap p-1.5 print:p-1 w-[108px] print:w-[108px] whitespace-nowrap font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">رقم الفاتورة</th>
                          <th className="statement-nowrap p-1.5 print:p-1 w-[140px] print:w-[140px] whitespace-nowrap font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">التاريخ</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">النوع</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">البيان</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">المبلغ</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">مدفوع</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">متبقي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paidInvoices.length > 0 ? (
                          paidInvoices.map((inv) => {
                            const invoiceType = inv.invoiceType === 0 ? 'مبيعات' : inv.invoiceType === 1 ? 'مرتجع' : inv.invoiceType === 2 ? 'عرض سعر' : 'فاتورة';
                            return (
                              <tr key={`paid-${inv.id}`} className="border-b border-slate-100 dark:border-slate-700 print:border-gray-200">
                                <td className="statement-nowrap p-1.5 print:p-1 text-slate-500 text-xs whitespace-nowrap border-l border-slate-100 dark:border-slate-700 print:border-gray-200" dir="ltr">{inv.invoiceNumber || inv.id}</td>
                                <td className="statement-nowrap p-1.5 print:p-1 whitespace-nowrap border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{renderColoredDateTime(inv.date)}</td>
                                <td className="p-1.5 print:p-1 text-slate-500 text-xs border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{invoiceType}</td>
                                <td className="p-1.5 print:p-1 text-slate-500 truncate print:whitespace-normal print:break-words max-w-[120px] print:max-w-[80px] border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.notes || '-'}</td>
                                <td className="p-1.5 print:p-1 font-medium text-slate-800 dark:text-white print:text-black border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.totalAmount.toLocaleString()}</td>
                                <td className="p-1.5 print:p-1 font-bold text-emerald-600 border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{inv.paidAmount.toLocaleString()}</td>
                                <td className="p-1.5 print:p-1 font-bold text-emerald-600 border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{(inv.remainingAmount || 0).toLocaleString()}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr><td colSpan={7} className="p-2 text-center text-slate-400 text-sm print:p-1">لا توجد فواتير مسددة</td></tr>
                        )}
                      </tbody>
                      {paidInvoices.length > 0 && (
                        <tfoot className="border-t border-slate-300 dark:border-slate-500 print:border-gray-400 font-bold">
                          <tr>
                            <td colSpan={4} className="p-1.5 print:p-1 text-slate-600 print:text-black border-l border-slate-200 dark:border-slate-600 print:border-gray-300">الإجمالي</td>
                            <td className="p-1.5 print:p-1 border-l border-slate-200 dark:border-slate-600 print:border-gray-300">{paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}</td>
                            <td className="p-1.5 print:p-1 text-emerald-600 border-l border-slate-200 dark:border-slate-600 print:border-gray-300">{paidInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0).toLocaleString()}</td>
                            <td className="p-1.5 print:p-1 text-emerald-600 border-l border-slate-200 dark:border-slate-600 print:border-gray-300">{paidInvoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0).toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* جدول سجل الدفعات */}
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1 print:text-black print:text-[10px] print:mb-0.5">سجل الدفعات</p>
                  <div className="rounded overflow-hidden mb-3 print:mb-2">
                    <table className="statement-table w-full text-center text-sm print:text-[10px] border-collapse border border-slate-300 dark:border-slate-600 print:border-gray-400">
                      <thead className="border-b border-slate-300 dark:border-slate-600 print:border-gray-400">
                        <tr className="text-slate-600 dark:text-slate-300 print:text-black">
                          <th className="statement-nowrap p-1.5 print:p-1 w-[140px] print:w-[140px] whitespace-nowrap font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">التاريخ</th>
                          <th className="p-1.5 print:p-1 font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">المبلغ</th>
                          <th className="statement-nowrap p-1.5 print:p-1 w-[108px] print:w-[108px] whitespace-nowrap font-semibold border-l border-slate-200 dark:border-slate-600 print:border-gray-300">رقم الفاتورة</th>
                          <th className="p-1.5 print:p-1 font-semibold">ملاحظات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentsLoading ? (
                          <tr><td colSpan={4} className="p-2 text-center"><Loader2 className="animate-spin h-4 w-4 text-primary mx-auto" /></td></tr>
                        ) : customerPayments.length > 0 ? (
                          customerPayments.map((pay) => (
                            <tr key={pay.id} className="border-b border-slate-100 dark:border-slate-700 print:border-gray-200">
                              <td className="statement-nowrap p-1.5 print:p-1 whitespace-nowrap border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{pay.paymentDate ? renderColoredDateTime(pay.paymentDate) : '-'}</td>
                              <td className="p-1.5 print:p-1 font-bold text-emerald-600 border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{pay.amount.toLocaleString()} {currency}</td>
                              <td className="statement-nowrap p-1.5 print:p-1 text-slate-500 text-xs whitespace-nowrap border-l border-slate-100 dark:border-slate-700 print:border-gray-200">{pay.invoiceNumber || (pay.invoiceId ? `#${pay.invoiceId}` : '-')}</td>
                              <td className="p-1.5 print:p-1 text-slate-500 truncate print:whitespace-normal print:break-words max-w-[120px] print:max-w-[80px]">{pay.notes || pay.description || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={4} className="p-2 text-center text-slate-400 text-sm print:p-1">لا يوجد سجل مدفوعات</td></tr>
                        )}
                      </tbody>
                      {customerPayments.length > 0 && (
                        <tfoot className="border-t border-slate-300 dark:border-slate-500 print:border-gray-400 font-bold">
                          <tr>
                            <td className="p-1.5 print:p-1 text-slate-600 print:text-black border-l border-slate-200 dark:border-slate-600 print:border-gray-300">إجمالي المدفوعات</td>
                            <td className="p-1.5 print:p-1 text-emerald-600 border-l border-slate-200 dark:border-slate-600 print:border-gray-300">{customerPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()} {currency}</td>
                            <td colSpan={2} className="p-1.5 print:p-1"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* ملاحظات + تذييل */}
                  <div className="flex items-center justify-between text-xs text-slate-500 print:text-[9px] pt-2 border-t border-dashed border-slate-200 dark:border-slate-700 print:border-gray-300 print:pt-1">
                    {selectedCustomer.notes && (
                      <p className="max-w-[60%] leading-5 line-clamp-2 break-words overflow-hidden" title={normalizeNotesText(selectedCustomer.notes)}>
                        <b>ملاحظات:</b> {normalizeNotesText(selectedCustomer.notes)}
                      </p>
                    )}
                    <p className="mr-auto inline-flex items-center gap-1.5">
                      <span>{user?.companyName} |</span>
                      {renderColoredDateTime(new Date())}
                    </p>
                  </div>
                </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">تسجيل دفعة جديدة</h3>
                {payInvoiceId && (
                <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded mb-4 text-sm text-slate-600 dark:text-slate-300">
                   يتم سداد دين الفاتورة رقم <span className="font-bold">#{payInvoiceId}</span>
                </div>
                )}
                
                {/* عرض المبلغ المستحق والمتبقي */}
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-amber-700 dark:text-amber-300 text-sm">المبلغ المستحق:</span>
                        <span className="text-amber-800 dark:text-amber-200 font-bold text-lg">{payMaxAmount.toLocaleString()} {currency}</span>
                    </div>
                    {payAmount > 0 && payAmount <= payMaxAmount && (
                        <div className="flex justify-between items-center pt-2 border-t border-amber-200 dark:border-amber-700">
                            <span className="text-emerald-600 dark:text-emerald-400 text-sm">المتبقي بعد الدفع:</span>
                            <span className="text-emerald-700 dark:text-emerald-300 font-bold text-lg">{(payMaxAmount - payAmount).toLocaleString()} {currency}</span>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">المبلغ المراد دفعه ({currency})</label>
                        <input 
                            type="number" 
                            className={`w-full border p-3 rounded-lg text-lg font-bold text-center focus:border-primary outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white dark:border-slate-600 ${payAmount > payMaxAmount ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/30' : ''}`}
                            value={payAmount}
                            max={payMaxAmount}
                            onChange={e => {
                                const val = Number(e.target.value);
                                if (val <= payMaxAmount) {
                                    setPayAmount(val);
                                } else {
                                    setPayAmount(payMaxAmount);
                                }
                            }}
                        />
                        {payAmount > payMaxAmount && (
                            <p className="text-rose-500 text-xs mt-1">لا يمكن إدخال مبلغ أكبر من المستحق</p>
                        )}
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button 
                          onClick={handleAddPayment} 
                          disabled={paymentLoading || payAmount <= 0 || payAmount > payMaxAmount}
                          className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg hover:bg-emerald-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {paymentLoading && <Loader2 className="animate-spin h-4 w-4" />}
                          تأكيد الدفع
                        </button>
                        <button onClick={() => setShowPayModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">إلغاء</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Add Phone Modal */}
      {showAddPhoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">إضافة رقم هاتف جديد</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">رقم الهاتف</label>
                        <input 
                            type="tel" 
                            className="w-full border border-slate-300 dark:border-slate-600 p-3 rounded-lg focus:outline-none focus:border-primary bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            value={newPhone}
                          onChange={e => setNewPhone(e.target.value.slice(0, customerPhoneMaxLength))}
                          maxLength={customerPhoneMaxLength}
                            placeholder="+966501234567"
                            disabled={addPhoneLoading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">نوع الهاتف</label>
                        <select 
                            className="w-full border border-slate-300 dark:border-slate-600 p-3 rounded-lg focus:outline-none focus:border-primary bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            value={newPhoneType}
                            onChange={e => setNewPhoneType(e.target.value)}
                            disabled={addPhoneLoading}
                        >
                            <option value="Mobile">موبايل</option>
                            <option value="Home">منزل</option>
                            <option value="Work">عمل</option>
                            <option value="Other">آخر</option>
                        </select>
                    </div>

                      <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">نوع الأهمية</label>
                        <select
                          className="w-full border border-slate-300 dark:border-slate-600 p-3 rounded-lg focus:outline-none focus:border-primary bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                          value={newPhoneIsPrimary ? 'primary' : 'secondary'}
                          onChange={e => setNewPhoneIsPrimary(e.target.value === 'primary')}
                          disabled={addPhoneLoading}
                        >
                          <option value="primary">أساسي</option>
                          <option value="secondary">ثانوي</option>
                        </select>
                      </div>

                    <div className="flex gap-3 mt-6">
                        <button 
                          onClick={handleAddPhone} 
                          disabled={addPhoneLoading || !newPhone}
                          className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg hover:bg-emerald-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {addPhoneLoading && <Loader2 className="animate-spin h-4 w-4" />}
                          إضافة الهاتف
                        </button>
                        <button 
                          onClick={() => {
                            setShowAddPhoneModal(false);
                            setNewPhone('');
                            setNewPhoneType('Mobile');
                            setNewPhoneIsPrimary(customerPhones.length === 0);
                          }}
                          disabled={addPhoneLoading}
                          className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
                        >
                          إلغاء
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Delete Phone Confirmation Modal */}
      {deletePhoneId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-center w-14 h-14 mx-auto bg-rose-100 dark:bg-rose-900/40 rounded-full mb-4">
                    <AlertTriangle className="text-rose-600 dark:text-rose-400" size={28} />
                </div>
                <h3 className="text-lg font-bold text-center mb-3 text-slate-900 dark:text-white">تأكيد حذف الهاتف</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-2">
                  هل تريد بالفعل حذف رقم الهاتف:
                </p>
                <p className="text-center font-semibold text-slate-800 dark:text-white mb-6 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                  {deletePhoneData?.phoneNumber || deletePhoneData?.number || 'غير معروف'}
                </p>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => handleDeletePhone(deletePhoneId)}
                        className="flex-1 bg-rose-600 text-white py-2.5 rounded-lg hover:bg-rose-700 active:scale-95 font-bold transition-all"
                    >
                        حذف نهائياً
                    </button>
                    <button 
                        onClick={() => {
                          setDeletePhoneId(null);
                          setDeletePhoneData(null);
                        }}
                        className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 font-bold transition-all"
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

export default Customers;
