/**
 * Draggable Dashboard Widget Component
 * Wrapper component for dashboard widgets with drag & drop support
 */

import React from 'react';
import { GripVertical, Eye, EyeOff, Maximize2, Minimize2, X } from 'lucide-react';
import { WidgetConfig, getWidgetGridClass } from '../services/dashboardWidgets';

interface DraggableWidgetProps {
  widget: WidgetConfig;
  editMode: boolean;
  isDragging: boolean;
  children: React.ReactNode;
  onDragStart: (widgetId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (widgetId: string) => void;
  onToggleVisibility: (widgetId: string) => void;
  onUpdateSize: (widgetId: string, size: WidgetConfig['size']) => void;
}

const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  widget,
  editMode,
  isDragging,
  children,
  onDragStart,
  onDragOver,
  onDrop,
  onToggleVisibility,
  onUpdateSize
}) => {
  const gridClass = getWidgetGridClass(widget.size);

  // Size cycle: small -> medium -> large -> full -> small
  const cycleSizeUp = () => {
    const sizes: WidgetConfig['size'][] = ['small', 'medium', 'large', 'full'];
    const currentIndex = sizes.indexOf(widget.size);
    const nextIndex = (currentIndex + 1) % sizes.length;
    onUpdateSize(widget.id, sizes[nextIndex]);
  };

  const cycleSizeDown = () => {
    const sizes: WidgetConfig['size'][] = ['small', 'medium', 'large', 'full'];
    const currentIndex = sizes.indexOf(widget.size);
    const prevIndex = currentIndex === 0 ? sizes.length - 1 : currentIndex - 1;
    onUpdateSize(widget.id, sizes[prevIndex]);
  };

  return (
    <div
      className={`${gridClass} ${isDragging ? 'opacity-50 scale-95' : ''} transition-all duration-200`}
      draggable={editMode}
      onDragStart={() => onDragStart(widget.id)}
      onDragOver={onDragOver}
      onDrop={() => onDrop(widget.id)}
    >
      <div className={`h-full relative ${editMode ? 'ring-2 ring-blue-400 ring-dashed rounded-xl' : ''}`}>
        {/* Edit Mode Controls */}
        {editMode && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-white dark:bg-slate-700 rounded-full shadow-lg px-2 py-1 border border-slate-200 dark:border-slate-600">
            {/* Drag Handle */}
            <div className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-blue-500 transition-colors" title="اسحب لتغيير الموقع">
              <GripVertical size={14} />
            </div>
            
            {/* Size Toggle */}
            <button
              onClick={cycleSizeUp}
              className="p-1 text-slate-400 hover:text-green-500 transition-colors"
              title="تكبير"
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={cycleSizeDown}
              className="p-1 text-slate-400 hover:text-orange-500 transition-colors"
              title="تصغير"
            >
              <Minimize2 size={14} />
            </button>
            
            {/* Visibility Toggle */}
            <button
              onClick={() => onToggleVisibility(widget.id)}
              className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
              title="إخفاء"
            >
              <EyeOff size={14} />
            </button>
          </div>
        )}
        
        {/* Widget Content */}
        <div className="h-full">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DraggableWidget;
