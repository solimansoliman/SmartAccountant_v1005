/**
 * Widget Settings Panel
 * Allows users to configure dashboard widgets visibility and order
 */

import React from 'react';
import { X, Eye, EyeOff, GripVertical, RotateCcw, Settings2, LayoutGrid } from 'lucide-react';
import { WidgetConfig } from '../services/dashboardWidgets';

interface WidgetSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: WidgetConfig[];
  onToggleVisibility: (widgetId: string) => void;
  onReset: () => void;
}

const WidgetSettingsPanel: React.FC<WidgetSettingsPanelProps> = ({
  isOpen,
  onClose,
  widgets,
  onToggleVisibility,
  onReset
}) => {
  if (!isOpen) return null;

  // Group widgets by category
  const groupedWidgets: Record<string, WidgetConfig[]> = {};
  widgets.forEach(widget => {
    if (!groupedWidgets[widget.category]) {
      groupedWidgets[widget.category] = [];
    }
    groupedWidgets[widget.category].push(widget);
  });

  const categoryLabels: Record<string, string> = {
    stats: 'الإحصائيات',
    charts: 'الرسوم البيانية',
    lists: 'القوائم',
    performance: 'الأداء'
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    stats: <LayoutGrid size={16} className="text-blue-500" />,
    charts: <LayoutGrid size={16} className="text-green-500" />,
    lists: <LayoutGrid size={16} className="text-purple-500" />,
    performance: <LayoutGrid size={16} className="text-orange-500" />
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-l from-blue-600 to-blue-700 p-4 text-white flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2">
            <Settings2 size={20} />
            تخصيص لوحة التحكم
          </h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            اختر العناصر التي تريد عرضها في لوحة التحكم. اسحب العناصر لإعادة ترتيبها.
          </p>

          {Object.entries(groupedWidgets).map(([category, categoryWidgets]) => (
            <div key={category} className="mb-6">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                {categoryIcons[category]}
                {categoryLabels[category]}
              </h4>
              <div className="space-y-2">
                {categoryWidgets.map(widget => (
                  <div
                    key={widget.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      widget.visible
                        ? 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 opacity-60'
                    }`}
                    onClick={() => onToggleVisibility(widget.id)}
                  >
                    {/* Drag Handle */}
                    <GripVertical size={16} className="text-slate-300 dark:text-slate-600 cursor-grab" />
                    
                    {/* Widget Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        widget.visible 
                          ? 'text-slate-700 dark:text-slate-200' 
                          : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        {widget.title}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        الحجم: {
                          widget.size === 'small' ? 'صغير' :
                          widget.size === 'medium' ? 'متوسط' :
                          widget.size === 'large' ? 'كبير' : 'كامل العرض'
                        }
                      </p>
                    </div>

                    {/* Visibility Toggle */}
                    <div className={`p-2 rounded-full transition-colors ${
                      widget.visible 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                    }`}>
                      {widget.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
          >
            <RotateCcw size={16} />
            إعادة الضبط
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            تم
          </button>
        </div>
      </div>
    </div>
  );
};

export default WidgetSettingsPanel;
