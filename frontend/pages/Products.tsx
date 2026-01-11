
import React, { useState, useMemo } from 'react';
import { Package, Search, Plus, Trash2, Edit2, Scale, AlertTriangle, Settings, X, Check, XCircle, AlertCircle, Filter, Loader2, Grid3X3, List, Save, Printer, Eye, DollarSign, Archive } from 'lucide-react';
import { useProducts, useUnits } from '../services/dataHooks';
import { useNotification } from '../context/NotificationContext';
import { useSettings } from '../context/SettingsContext';
import { usePagePermission, useButtonPermissions } from '../services/permissionsHooks';
import AccessDenied from '../components/AccessDenied';

type ViewMode = 'grid' | 'table';

const Products: React.FC = () => {
  // ==================== Hooks أولاً (React requires all hooks before any return) ====================
  const { notify } = useNotification();
  const { currency, defaultViewMode } = useSettings();
  const [view, setView] = useState<'list' | 'create'>('list');
  
  // View Mode State - يستخدم الإعداد الافتراضي من النظام
  const [listViewMode, setListViewMode] = useState<ViewMode>(defaultViewMode || 'grid');
  
  // API Hooks
  const { 
    products, 
    loading: productsLoading, 
    error: productsError,
    addProduct: apiAddProduct, 
    updateProduct: apiUpdateProduct, 
    deleteProduct: apiDeleteProduct 
  } = useProducts();
  
  const { 
    units: fullUnits,
    unitNames: availableUnits, 
    loading: unitsLoading,
    addUnit: apiAddUnit,
    updateUnit: apiUpdateUnit,
    deleteUnit: apiDeleteUnit
  } = useUnits();

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  // Unit Management State
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitNameEn, setNewUnitNameEn] = useState('');
  const [newUnitSymbol, setNewUnitSymbol] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  
  // Unit Actions State
  const [editingUnit, setEditingUnit] = useState<{id: number, name: string, nameEn: string, symbol: string} | null>(null);
  
  // ==================== صلاحيات الصفحة (بعد كل الـ hooks) ====================
  const pagePerms = usePagePermission('products');
  const btnPerms = useButtonPermissions();
  
  // إذا لم يكن لديه صلاحية عرض الصفحة
  if (pagePerms.checked && !pagePerms.canView) {
    return <AccessDenied />;
  }
  
  // Confirmation States for Units
  const [unitToDelete, setUnitToDelete] = useState<{id: number, name: string} | null>(null);
  const [unitToEdit, setUnitToEdit] = useState<{id: number, name: string, nameEn: string, symbol: string} | null>(null);

  // Form State
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formUnit, setFormUnit] = useState('قطعة');
  const [formNotes, setFormNotes] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  
  // Confirmation States
  const [pendingEditProduct, setPendingEditProduct] = useState<typeof products[0] | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.id.toString().includes(searchQuery)
    );
  }, [products, searchQuery]);

  // Filtered Units List
  const filteredUnits = useMemo(() => {
      return fullUnits.filter(u => 
        u.name.toLowerCase().includes(unitSearch.toLowerCase()) ||
        (u.nameEn || '').toLowerCase().includes(unitSearch.toLowerCase()) ||
        u.symbol.toLowerCase().includes(unitSearch.toLowerCase())
      );
  }, [fullUnits, unitSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPrice) {
      notify('الرجاء إدخال اسم المنتج والسعر', 'warning');
      return;
    }

    if (isEditing) {
      setShowSaveConfirmation(true);
    } else {
      performSaveProduct();
    }
  };

  const performSaveProduct = async () => {
    setFormLoading(true);
    try {
      if (isEditing) {
        await apiUpdateProduct(isEditing, {
          name: formName,
          price: Number(formPrice),
          stock: formStock ? Number(formStock) : undefined,
          unit: formUnit,
          notes: formNotes
        });
        notify('تم تحديث بيانات المنتج بنجاح', 'success');
        setIsEditing(null);
      } else {
        await apiAddProduct({
          name: formName,
          price: Number(formPrice),
          stock: formStock ? Number(formStock) : undefined,
          unit: formUnit,
          notes: formNotes
        });
        notify('تم إضافة المنتج للمخزن بنجاح', 'success');
      }

      // Reset form
      setFormName('');
      setFormPrice('');
      setFormStock('');
      setFormUnit('قطعة');
      setFormNotes('');
      setShowSaveConfirmation(false);
      setView('list');
    } catch (err: any) {
      console.error(err);
      notify(err.message || 'حدث خطأ غير متوقع أثناء الحفظ', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const requestEditProduct = (product: typeof products[0]) => {
    setPendingEditProduct(product);
  };

  const confirmEditProduct = () => {
    if (pendingEditProduct) {
      setFormName(pendingEditProduct.name);
      setFormPrice(pendingEditProduct.price.toString());
      setFormStock(pendingEditProduct.stock ? pendingEditProduct.stock.toString() : '');
      setFormUnit(pendingEditProduct.unit || 'قطعة');
      setFormNotes(pendingEditProduct.notes || '');
      setIsEditing(pendingEditProduct.id);
      notify(`بدء تعديل المنتج: ${pendingEditProduct.name}`, 'info');
      setPendingEditProduct(null);
      setView('create');
    }
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setFormName('');
    setFormPrice('');
    setFormStock('');
    setFormUnit('قطعة');
    setFormNotes('');
    setView('list');
  };

  const confirmDeleteProduct = async () => {
    if (deleteId) {
      try {
        await apiDeleteProduct(deleteId);
        notify('تم حذف المنتج نهائياً', 'success');
      } catch (err: any) {
        notify(err.message || 'حدث خطأ أثناء الحذف', 'error');
      }
      setDeleteId(null);
    }
  };

  // --- Unit Management Functions ---
  const handleAddUnit = async () => {
    if (!newUnitName.trim()) {
      notify('الرجاء إدخال اسم الوحدة', 'warning');
      return;
    }
    if (availableUnits.includes(newUnitName.trim())) {
      notify('هذه الوحدة موجودة مسبقاً', 'warning');
      return;
    }
    try {
      await apiAddUnit(newUnitName.trim(), newUnitNameEn.trim(), newUnitSymbol.trim() || newUnitName.trim());
      notify('تم إضافة الوحدة بنجاح', 'success');
      setNewUnitName('');
      setNewUnitNameEn('');
      setNewUnitSymbol('');
    } catch (err: any) {
      notify(err.message || 'حدث خطأ أثناء إضافة الوحدة', 'error');
    }
  };

  const requestDeleteUnit = (unit: {id: number, name: string}) => {
    setUnitToDelete(unit);
  };

  const executeDeleteUnit = async () => {
    if (unitToDelete) {
      try {
        await apiDeleteUnit(unitToDelete.id);
        notify('تم حذف الوحدة بنجاح', 'success');
      } catch (err: any) {
        notify(err.message || 'حدث خطأ أثناء حذف الوحدة', 'error');
      }
      setUnitToDelete(null);
    }
  };

  const startEditUnit = (unit: typeof fullUnits[0]) => {
    setEditingUnit({
      id: unit.id!,
      name: unit.name,
      nameEn: unit.nameEn || '',
      symbol: unit.symbol
    });
  };

  const requestSaveEditUnit = () => {
    if (!editingUnit || !editingUnit.name.trim()) {
      notify('الرجاء إدخال اسم الوحدة', 'warning');
      return;
    }
    setUnitToEdit(editingUnit);
  };

  const executeEditUnit = async () => {
    if (unitToEdit) {
      try {
        await apiUpdateUnit(unitToEdit.id, {
          name: unitToEdit.name,
          nameEn: unitToEdit.nameEn,
          symbol: unitToEdit.symbol
        });
        notify('تم تحديث الوحدة بنجاح', 'success');
      } catch (err: any) {
        notify(err.message || 'حدث خطأ أثناء تحديث الوحدة', 'error');
      }
      setUnitToEdit(null);
      setEditingUnit(null);
    }
  };

  // Loading state
  if (productsLoading || unitsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">جاري تحميل المنتجات...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (productsError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <p className="text-rose-500 font-bold mb-2">حدث خطأ</p>
          <p className="text-slate-500 dark:text-slate-400">{productsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      
      {/* --- Unit Management Modals --- */}
      
      {/* 1. Main Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
             <div className="bg-slate-800 dark:bg-slate-700 text-white p-4 flex justify-between items-center shrink-0">
                <h3 className="font-bold flex items-center gap-2">
                   <Settings size={18} /> إدارة الوحدات
                </h3>
                <button onClick={() => setShowUnitModal(false)} className="hover:text-rose-300"><X size={20}/></button>
             </div>
             
             {/* Add New Unit - Three Fields */}
             <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-700 shrink-0 space-y-3">
                 <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">إضافة وحدة جديدة:</p>
                 <div className="grid grid-cols-3 gap-2">
                     <input 
                       type="text" 
                       placeholder="الاسم العربي *" 
                       className="border border-slate-300 dark:border-slate-600 p-2 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-900 dark:text-white bg-white dark:bg-slate-700 placeholder:text-slate-400 font-medium"
                       value={newUnitName}
                       onChange={e => setNewUnitName(e.target.value)}
                     />
                     <input 
                       type="text" 
                       placeholder="الاسم الإنجليزي" 
                       className="border border-slate-300 dark:border-slate-600 p-2 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-900 dark:text-white bg-white dark:bg-slate-700 placeholder:text-slate-400"
                       value={newUnitNameEn}
                       onChange={e => setNewUnitNameEn(e.target.value)}
                     />
                     <input 
                       type="text" 
                       placeholder="الرمز" 
                       className="border border-slate-300 dark:border-slate-600 p-2 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-900 dark:text-white bg-white dark:bg-slate-700 placeholder:text-slate-400"
                       value={newUnitSymbol}
                       onChange={e => setNewUnitSymbol(e.target.value)}
                     />
                 </div>
                 <button 
                   onClick={handleAddUnit}
                   className="w-full bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                 >
                   <Plus size={18} />
                   <span>إضافة الوحدة</span>
                 </button>
                 
                 {/* Filter Units */}
                 <div className="relative">
                     <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
                     <input 
                        type="text" 
                        placeholder="بحث عن وحدة..." 
                        className="w-full pr-9 pl-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:border-blue-400 outline-none"
                        value={unitSearch}
                        onChange={e => setUnitSearch(e.target.value)}
                     />
                 </div>
             </div>

             {/* Units List - Table Style */}
             <div className="overflow-y-auto flex-1 dark:bg-slate-800">
                 {/* Header */}
                 <div className="grid grid-cols-4 gap-2 p-3 bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 sticky top-0">
                    <span>الاسم العربي</span>
                    <span>الاسم الإنجليزي</span>
                    <span>الرمز</span>
                    <span className="text-center">إجراءات</span>
                 </div>
                 
                 {filteredUnits.map((unit) => (
                     <div key={unit.id} className="grid grid-cols-4 gap-2 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0 items-center text-sm">
                         {editingUnit?.id === unit.id ? (
                             <>
                                 <input 
                                    type="text" 
                                    className="border-2 border-primary p-1.5 rounded text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-600 outline-none font-bold"
                                    value={editingUnit.name}
                                    onChange={e => setEditingUnit({...editingUnit, name: e.target.value})}
                                    autoFocus
                                 />
                                 <input 
                                    type="text" 
                                    className="border-2 border-blue-300 p-1.5 rounded text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-600 outline-none"
                                    value={editingUnit.nameEn}
                                    onChange={e => setEditingUnit({...editingUnit, nameEn: e.target.value})}
                                 />
                                 <input 
                                    type="text" 
                                    className="border-2 border-blue-300 p-1.5 rounded text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-600 outline-none"
                                    value={editingUnit.symbol}
                                    onChange={e => setEditingUnit({...editingUnit, symbol: e.target.value})}
                                 />
                                 <div className="flex gap-1 justify-center">
                                     <button onClick={requestSaveEditUnit} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 p-1.5 rounded"><Check size={14}/></button>
                                     <button onClick={() => setEditingUnit(null)} className="bg-rose-100 text-rose-700 hover:bg-rose-200 p-1.5 rounded"><XCircle size={14}/></button>
                                 </div>
                             </>
                         ) : (
                             <>
                                <span className="font-medium text-slate-700 dark:text-slate-200">{unit.name}</span>
                                <span className="text-slate-500 dark:text-slate-400">{unit.nameEn || '-'}</span>
                                <span className="text-slate-500 dark:text-slate-400 font-mono">{unit.symbol}</span>
                                <div className="flex gap-1 justify-center">
                                    <button 
                                      onClick={() => startEditUnit(unit)}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-600 rounded transition-colors"
                                      title="تعديل"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button 
                                      onClick={() => requestDeleteUnit({id: unit.id!, name: unit.name})}
                                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-600 rounded transition-colors"
                                      title="حذف"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                             </>
                         )}
                     </div>
                 ))}
                 {filteredUnits.length === 0 && (
                     <div className="text-center text-slate-400 p-8 text-sm flex flex-col items-center gap-2">
                         <Filter size={24} className="opacity-20"/>
                         <p>لا توجد وحدات مطابقة</p>
                     </div>
                 )}
             </div>
          </div>
        </div>
      )}
      
      {/* 2. Unit Delete Confirmation */}
      {unitToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[120] p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
             <div className="flex items-center gap-3 text-rose-600 mb-4">
                <div className="bg-rose-100 dark:bg-rose-900/30 p-2 rounded-full"><AlertTriangle size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">حذف الوحدة</h3>
             </div>
             <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">
                 هل أنت متأكد من حذف وحدة <span className="font-bold text-slate-800 dark:text-white">"{unitToDelete.name}"</span>؟
                 <br/><span className="text-xs text-rose-500 mt-1 block">لن تظهر هذه الوحدة في القائمة مستقبلاً.</span>
             </p>
             <div className="flex gap-3">
                 <button onClick={executeDeleteUnit} className="flex-1 bg-rose-600 text-white py-2 rounded-lg font-bold hover:bg-rose-700">تأكيد الحذف</button>
                 <button onClick={() => setUnitToDelete(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">إلغاء</button>
             </div>
          </div>
        </div>
      )}

      {/* 3. Unit Edit Confirmation */}
      {unitToEdit && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[120] p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
             <div className="flex items-center gap-3 text-blue-600 mb-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full"><AlertCircle size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">حفظ تعديل الوحدة</h3>
             </div>
             <div className="text-slate-600 dark:text-slate-300 text-sm mb-6 space-y-2">
                 <p>سيتم حفظ التعديلات التالية:</p>
                 <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">الاسم العربي:</span> <span className="font-bold text-slate-800 dark:text-white">{unitToEdit.name}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">الاسم الإنجليزي:</span> <span className="font-bold text-slate-800 dark:text-white">{unitToEdit.nameEn || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">الرمز:</span> <span className="font-bold text-slate-800 dark:text-white font-mono">{unitToEdit.symbol}</span></div>
                 </div>
             </div>
             <div className="flex gap-3">
                 <button onClick={executeEditUnit} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700">حفظ التغييرات</button>
                 <button onClick={() => setUnitToEdit(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">إلغاء</button>
             </div>
          </div>
        </div>
      )}

      {/* 4. Edit Product Confirmation Modal */}
      {pendingEditProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-blue-600 mb-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full"><Edit2 size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">تعديل المنتج</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
                هل تريد تعديل المنتج: <span className="font-bold">{pendingEditProduct.name}</span>؟
            </p>
            <div className="flex gap-3">
              <button onClick={confirmEditProduct} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors">نعم، ابدأ التعديل</button>
              <button onClick={() => setPendingEditProduct(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Save Changes Modal */}
      {showSaveConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-emerald-600 mb-4">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-full"><Save size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">حفظ التغييرات</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">هل أنت متأكد من حفظ التعديلات على المنتج؟</p>
            <div className="flex gap-3">
              <button onClick={performSaveProduct} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-bold hover:bg-emerald-700 transition-colors">تأكيد الحفظ</button>
              <button onClick={() => setShowSaveConfirmation(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">تراجع</button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Product Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
                <div className="bg-rose-100 dark:bg-rose-900/30 p-2 rounded-full"><AlertTriangle size={24}/></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">تأكيد الحذف</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm leading-relaxed">
                هل أنت متأكد من حذف هذا المنتج؟<br/>
                <span className="text-xs text-rose-500 block mt-1">لا يمكن التراجع عن هذا الإجراء.</span>
            </p>
            <div className="flex gap-3">
              <button onClick={confirmDeleteProduct} className="flex-1 bg-rose-600 text-white py-2.5 rounded-lg font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200">نعم، احذف</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">إلغاء</button>
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
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">قائمة المنتجات</h2>
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
                      placeholder="بحث بالاسم أو الكود..." 
                      className="w-full pr-10 pl-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:border-primary outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    <button 
                      onClick={() => setShowUnitModal(true)}
                      className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shadow-sm text-sm"
                    >
                      <Settings size={16} />
                      <span>الوحدات</span>
                    </button>

                    <button 
                      onClick={() => window.print()}
                      className="bg-slate-800 dark:bg-slate-700 text-white px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors shadow-sm text-sm"
                    >
                      <Printer size={16} />
                      <span>طباعة</span>
                    </button>

                    {/* زر إضافة - يظهر فقط إذا كان لديه صلاحية الإضافة */}
                    {pagePerms.canCreate && (
                    <button 
                      onClick={() => {
                          setIsEditing(null);
                          setFormName('');
                          setFormPrice('');
                          setFormStock('');
                          setFormUnit('قطعة');
                          setFormNotes('');
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

          <div className="bg-white dark:bg-slate-800/90 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 overflow-hidden print:shadow-none print:border-black backdrop-blur-sm">
            {/* List Header for Print Only */}
            <div className="hidden print:block text-center p-4 border-b border-black">
                <h2 className="text-xl font-bold">قائمة المنتجات</h2>
                <p className="text-sm">عدد المنتجات: {filteredProducts.length}</p>
            </div>

            {/* Table View */}
            {listViewMode === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right min-w-[600px] md:min-w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 print:bg-gray-200 print:text-black">
                    <tr className="text-slate-600 dark:text-slate-400">
                      <th className="p-4 text-center w-[100px] print:hidden no-print">أدوات</th>
                      <th className="p-4 whitespace-nowrap">كود</th>
                      <th className="p-4 whitespace-nowrap">المنتج</th>
                      <th className="p-4 whitespace-nowrap">الوحدة</th>
                      <th className="p-4 whitespace-nowrap">السعر ({currency})</th>
                      <th className="p-4 whitespace-nowrap">المخزون</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 print:divide-black">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <td className="p-4 flex justify-center gap-1 print:hidden no-print">
                           {pagePerms.canEdit && (
                           <button 
                            className="flex items-center gap-1 px-2 py-1.5 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-xs font-medium" 
                            title="تعديل"
                            onClick={() => requestEditProduct(p)}
                          >
                            <Edit2 size={14} />
                            <span>تعديل</span>
                          </button>
                          )}
                          {pagePerms.canDelete && (
                          <button 
                            className="flex items-center gap-1 px-2 py-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors text-xs font-medium" 
                            title="حذف"
                            onClick={() => setDeleteId(p.id)}
                          >
                            <Trash2 size={14} />
                            <span>حذف</span>
                          </button>
                          )}
                        </td>
                        <td className="p-4 text-slate-400 font-mono print:text-black">#{p.id}</td>
                        <td className="p-4">
                          <p className="font-bold text-slate-800 dark:text-white">{p.name}</p>
                          {p.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{p.notes}</p>}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <Scale size={14} className="text-slate-400"/> {p.unit || 'قطعة'}
                        </td>
                        <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold">{p.price.toLocaleString()}</td>
                        <td className="p-4">
                          {p.stock !== undefined && p.stock !== null ? (
                            <span className={`font-medium ${p.stock < 5 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {p.stock}
                            </span>
                          ) : <span className="text-slate-400">-</span>}
                        </td>
                      </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">لا توجد منتجات مطابقة</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Grid View */}
            {listViewMode === 'grid' && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((p) => (
                  <div 
                    key={p.id} 
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition-all group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2">
                        <Package size={20} className={p.stock !== undefined && p.stock !== null && p.stock < 5 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} />
                      </div>
                      <span className="text-xs font-mono text-slate-400">#{p.id}</span>
                    </div>
                    
                    <h4 className="font-bold text-slate-800 dark:text-white truncate mb-1">{p.name}</h4>
                    {p.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{p.notes}</p>}
                    
                    <div className="grid grid-cols-2 gap-2 mb-3 text-center">
                      <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-2">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">السعر</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{p.price.toLocaleString()}</span>
                        <span className="text-xs mr-1">{currency}</span>
                      </div>
                      <div className="rounded-lg p-2 border border-slate-200 dark:border-slate-600">
                        <span className={`text-[10px] block ${p.stock !== undefined && p.stock !== null && p.stock < 5 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>المخزون</span>
                        {p.stock !== undefined && p.stock !== null ? (
                          <span className={`font-bold text-sm ${p.stock < 5 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{p.stock}</span>
                        ) : <span className="text-slate-400 text-sm">-</span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Scale size={12} /> {p.unit || 'قطعة'}
                      </span>
                      <div className="flex gap-0.5">
                        {pagePerms.canEdit && (
                        <button onClick={() => requestEditProduct(p)} className="flex items-center gap-0.5 px-1.5 py-1 text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded text-[10px] font-medium" title="تعديل">
                          <Edit2 size={12} />
                          <span>تعديل</span>
                        </button>
                        )}
                        {pagePerms.canDelete && (
                        <button onClick={() => setDeleteId(p.id)} className="flex items-center gap-0.5 px-1.5 py-1 text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded text-[10px] font-medium" title="حذف">
                          <Trash2 size={12} />
                          <span>حذف</span>
                        </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="col-span-full p-8 text-center text-slate-400">
                    <Package size={48} className="mx-auto mb-3 opacity-30" />
                    لا توجد منتجات مطابقة
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      ) : (
        /* Create/Edit Product View */
        <div className="max-w-xl mx-auto animate-in slide-in-from-left-4 duration-300">
          <div className="bg-white dark:bg-slate-800/90 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  {isEditing ? <Edit2 size={20} className="text-blue-600"/> : <Package size={20} className="text-emerald-600"/>}
                  {isEditing ? 'تعديل المنتج' : 'إضافة منتج جديد'}
              </h3>
              <button onClick={cancelEdit} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم المنتج *</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="اسم الصنف..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">سعر البيع *</label>
                  <input 
                    type="number" 
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex justify-between">
                    الوحدة
                    <button 
                      type="button" 
                      onClick={() => setShowUnitModal(true)} 
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-[10px] flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-1.5 rounded"
                    >
                      <Settings size={10} /> إدارة
                    </button>
                  </label>
                  <select 
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value)}
                  >
                    {availableUnits.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الكمية الافتتاحية (اختياري)</label>
                <input 
                  type="number" 
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                  value={formStock}
                  onChange={e => setFormStock(e.target.value)}
                  placeholder="الرصيد في المخزن"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ملاحظات (اختياري)</label>
                <textarea 
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 resize-none h-24"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="وصف إضافي للمنتج..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                  <button 
                      type="submit" 
                      disabled={formLoading}
                      className={`flex-1 text-white py-3 rounded-lg transition-colors font-bold flex items-center justify-center gap-2 ${isEditing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  >
                      {formLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      {formLoading ? 'جاري الحفظ...' : isEditing ? 'حفظ التعديلات' : 'حفظ المنتج'}
                  </button>
                  <button 
                      type="button" 
                      onClick={cancelEdit}
                      className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 px-6 py-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                      إلغاء
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
