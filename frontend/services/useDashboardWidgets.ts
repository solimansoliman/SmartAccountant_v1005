/**
 * Dashboard Widgets Hook
 * Custom React hook for managing dashboard widget state
 */

import React, { useState, useCallback, useEffect, DragEvent } from 'react';
import {
  WidgetConfig,
  loadWidgetConfig,
  saveWidgetConfig,
  resetWidgetConfig,
  moveWidget,
  toggleWidgetVisibility,
  updateWidgetSize,
  getVisibleWidgets
} from './dashboardWidgets';

export function useDashboardWidgets() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  // Load widgets on mount
  useEffect(() => {
    const loaded = loadWidgetConfig();
    setWidgets(loaded);
  }, []);

  // Save widgets when they change
  useEffect(() => {
    if (widgets.length > 0) {
      saveWidgetConfig(widgets);
    }
  }, [widgets]);

  // Get visible widgets
  const visibleWidgets = getVisibleWidgets(widgets);

  // Handle drag start
  const handleDragStart = useCallback((widgetId: string) => {
    setDraggedWidget(widgetId);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  // Handle drop
  const handleDrop = useCallback((targetWidgetId: string) => {
    if (!draggedWidget || draggedWidget === targetWidgetId) {
      setDraggedWidget(null);
      return;
    }

    const fromIndex = widgets.findIndex(w => w.id === draggedWidget);
    const toIndex = widgets.findIndex(w => w.id === targetWidgetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const newWidgets = moveWidget(widgets, fromIndex, toIndex);
      setWidgets(newWidgets);
    }

    setDraggedWidget(null);
  }, [draggedWidget, widgets]);

  // Toggle widget visibility
  const handleToggleVisibility = useCallback((widgetId: string) => {
    setWidgets(current => toggleWidgetVisibility(current, widgetId));
  }, []);

  // Update widget size
  const handleUpdateSize = useCallback((widgetId: string, size: WidgetConfig['size']) => {
    setWidgets(current => updateWidgetSize(current, widgetId, size));
  }, []);

  // Reset to defaults
  const handleReset = useCallback(() => {
    const defaults = resetWidgetConfig();
    setWidgets(defaults);
  }, []);

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    setEditMode(prev => !prev);
  }, []);

  return {
    widgets,
    visibleWidgets,
    editMode,
    draggedWidget,
    toggleEditMode,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleToggleVisibility,
    handleUpdateSize,
    handleReset
  };
}
