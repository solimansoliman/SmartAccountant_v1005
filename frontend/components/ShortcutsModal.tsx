/**
 * Keyboard Shortcuts Modal
 * نافذة عرض اختصارات لوحة المفاتيح
 */

import React from 'react';
import { X, Keyboard, Navigation, Zap, Settings2, Edit3 } from 'lucide-react';
import { KEYBOARD_SHORTCUTS, formatShortcut, getShortcutsByCategory } from '../services/keyboardShortcuts';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const categories = getShortcutsByCategory();

  const categoryInfo = {
    navigation: { title: 'التنقل', icon: Navigation, color: 'text-blue-500' },
    actions: { title: 'الإجراءات', icon: Zap, color: 'text-amber-500' },
    ui: { title: 'واجهة المستخدم', icon: Settings2, color: 'text-violet-500' },
    editing: { title: 'التحرير', icon: Edit3, color: 'text-emerald-500' },
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Keyboard className="text-primary" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                اختصارات لوحة المفاتيح
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                استخدم الاختصارات للتنقل بسرعة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(Object.keys(categories) as Array<keyof typeof categories>).map(categoryKey => {
              const info = categoryInfo[categoryKey];
              const shortcuts = categories[categoryKey];
              
              return (
                <div key={categoryKey} className="space-y-3">
                  <h3 className={`flex items-center gap-2 font-bold ${info.color}`}>
                    <info.icon size={18} />
                    {info.title}
                  </h3>
                  <div className="space-y-2">
                    {shortcuts.map(shortcut => (
                      <div 
                        key={shortcut.action}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl"
                      >
                        <span className="text-slate-700 dark:text-slate-200">
                          {shortcut.description}
                        </span>
                        <kbd className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-mono text-slate-600 dark:text-slate-300 shadow-sm">
                          {formatShortcut(shortcut)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            اضغط <kbd className="px-2 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-xs">Ctrl + /</kbd> في أي وقت لعرض هذه النافذة
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
