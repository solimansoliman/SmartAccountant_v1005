/**
 * Keyboard Shortcuts Hook & Service
 * اختصارات لوحة المفاتيح
 */

import { useEffect, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

// تعريف الاختصارات
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  descriptionEn: string;
  action: string;
  category: 'navigation' | 'actions' | 'ui' | 'editing';
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // التنقل
  { key: 'h', ctrl: true, description: 'الرئيسية', descriptionEn: 'Home', action: 'navigate:/', category: 'navigation' },
  { key: 'p', ctrl: true, shift: true, description: 'المنتجات', descriptionEn: 'Products', action: 'navigate:/products', category: 'navigation' },
  { key: 'c', ctrl: true, shift: true, description: 'العملاء', descriptionEn: 'Customers', action: 'navigate:/customers', category: 'navigation' },
  { key: 'i', ctrl: true, shift: true, description: 'الفواتير', descriptionEn: 'Invoices', action: 'navigate:/invoices', category: 'navigation' },
  { key: 'e', ctrl: true, shift: true, description: 'المصروفات', descriptionEn: 'Expenses', action: 'navigate:/expenses', category: 'navigation' },
  { key: 'r', ctrl: true, shift: true, description: 'التقارير', descriptionEn: 'Reports', action: 'navigate:/reports', category: 'navigation' },
  { key: ',', ctrl: true, description: 'الإعدادات', descriptionEn: 'Settings', action: 'navigate:/settings', category: 'navigation' },
  
  // الإجراءات
  { key: 'n', ctrl: true, description: 'إضافة جديد', descriptionEn: 'Add New', action: 'action:new', category: 'actions' },
  { key: 's', ctrl: true, description: 'حفظ', descriptionEn: 'Save', action: 'action:save', category: 'actions' },
  { key: 'f', ctrl: true, description: 'بحث', descriptionEn: 'Search', action: 'action:search', category: 'actions' },
  { key: 'k', ctrl: true, description: 'البحث الشامل', descriptionEn: 'Global Search', action: 'action:globalSearch', category: 'actions' },
  { key: 'Escape', description: 'إغلاق النافذة', descriptionEn: 'Close Modal', action: 'action:closeModal', category: 'actions' },
  
  // واجهة المستخدم
  { key: 'd', ctrl: true, shift: true, description: 'تبديل الوضع الليلي', descriptionEn: 'Toggle Dark Mode', action: 'ui:toggleDarkMode', category: 'ui' },
  { key: '/', ctrl: true, description: 'عرض الاختصارات', descriptionEn: 'Show Shortcuts', action: 'ui:showShortcuts', category: 'ui' },
  { key: 'b', ctrl: true, description: 'تبديل القائمة الجانبية', descriptionEn: 'Toggle Sidebar', action: 'ui:toggleSidebar', category: 'ui' },
  
  // التحرير
  { key: 'Enter', ctrl: true, description: 'تأكيد', descriptionEn: 'Confirm', action: 'editing:confirm', category: 'editing' },
  { key: 'Delete', ctrl: true, description: 'حذف', descriptionEn: 'Delete', action: 'editing:delete', category: 'editing' },
];

// Event bus لتوزيع الأحداث
type ShortcutCallback = (action: string) => void;
const listeners: Set<ShortcutCallback> = new Set();

export const subscribeToShortcuts = (callback: ShortcutCallback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

const emitShortcut = (action: string) => {
  listeners.forEach(callback => callback(action));
};

// Hook الرئيسي للاختصارات
export const useKeyboardShortcuts = (options?: {
  onNew?: () => void;
  onSave?: () => void;
  onSearch?: () => void;
  onDelete?: () => void;
  onConfirm?: () => void;
  onCloseModal?: () => void;
  enabled?: boolean;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleDarkMode } = useSettings();
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // تجاهل إذا في حقل إدخال (إلا للاختصارات المهمة)
    const target = event.target as HTMLElement;
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
    
    // دائماً السماح بـ Escape و Ctrl+K و Ctrl+/
    const alwaysAllowed = event.key === 'Escape' || 
                         (event.ctrlKey && event.key === 'k') ||
                         (event.ctrlKey && event.key === '/');
    
    if (isInput && !alwaysAllowed) return;
    if (options?.enabled === false) return;

    const shortcut = KEYBOARD_SHORTCUTS.find(s => {
      const keyMatch = s.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatch = !!s.ctrl === event.ctrlKey;
      const shiftMatch = !!s.shift === event.shiftKey;
      const altMatch = !!s.alt === event.altKey;
      return keyMatch && ctrlMatch && shiftMatch && altMatch;
    });

    if (!shortcut) return;

    // منع السلوك الافتراضي
    event.preventDefault();
    event.stopPropagation();

    const [type, value] = shortcut.action.split(':');

    switch (type) {
      case 'navigate':
        navigate(value);
        break;
        
      case 'action':
        switch (value) {
          case 'new':
            options?.onNew?.();
            emitShortcut('new');
            break;
          case 'save':
            options?.onSave?.();
            emitShortcut('save');
            break;
          case 'search':
            options?.onSearch?.();
            emitShortcut('search');
            break;
          case 'globalSearch':
            setShowGlobalSearch(true);
            emitShortcut('globalSearch');
            break;
          case 'closeModal':
            options?.onCloseModal?.();
            setShowShortcutsModal(false);
            setShowGlobalSearch(false);
            emitShortcut('closeModal');
            break;
        }
        break;
        
      case 'ui':
        switch (value) {
          case 'toggleDarkMode':
            toggleDarkMode();
            break;
          case 'showShortcuts':
            setShowShortcutsModal(prev => !prev);
            break;
          case 'toggleSidebar':
            setSidebarCollapsed(prev => !prev);
            emitShortcut('toggleSidebar');
            break;
        }
        break;
        
      case 'editing':
        switch (value) {
          case 'confirm':
            options?.onConfirm?.();
            emitShortcut('confirm');
            break;
          case 'delete':
            options?.onDelete?.();
            emitShortcut('delete');
            break;
        }
        break;
    }
  }, [navigate, toggleDarkMode, options]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    showShortcutsModal,
    setShowShortcutsModal,
    showGlobalSearch,
    setShowGlobalSearch,
    sidebarCollapsed,
    setSidebarCollapsed,
    shortcuts: KEYBOARD_SHORTCUTS
  };
};

// تنسيق الاختصار للعرض
export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  parts.push(shortcut.key.toUpperCase());
  return parts.join(' + ');
};

// تجميع الاختصارات حسب الفئة
export const getShortcutsByCategory = () => {
  return {
    navigation: KEYBOARD_SHORTCUTS.filter(s => s.category === 'navigation'),
    actions: KEYBOARD_SHORTCUTS.filter(s => s.category === 'actions'),
    ui: KEYBOARD_SHORTCUTS.filter(s => s.category === 'ui'),
    editing: KEYBOARD_SHORTCUTS.filter(s => s.category === 'editing'),
  };
};

export default useKeyboardShortcuts;
