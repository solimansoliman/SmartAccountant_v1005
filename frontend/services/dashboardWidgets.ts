/**
 * Dashboard Widgets Service
 * Manages customizable dashboard widgets with drag & drop functionality
 */

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  icon: string;
  position: number;
  visible: boolean;
  size: 'small' | 'medium' | 'large' | 'full';
  category: 'stats' | 'charts' | 'lists' | 'performance';
}

export type WidgetType = 
  | 'total-revenue'
  | 'total-expenses'
  | 'net-profit'
  | 'outstanding-debts'
  | 'revenue-comparison'
  | 'monthly-chart'
  | 'revenue-breakdown'
  | 'expense-breakdown'
  | 'recent-invoices'
  | 'top-products'
  | 'top-customers'
  | 'performance-indicators'
  | 'quick-actions'
  | 'plan-usage'
  | 'low-stock-alert';

// Default Widget Configurations
export const DEFAULT_WIDGETS: WidgetConfig[] = [
  // Stats Row
  { id: 'widget-1', type: 'total-revenue', title: 'إجمالي الإيرادات', icon: 'DollarSign', position: 1, visible: true, size: 'small', category: 'stats' },
  { id: 'widget-2', type: 'total-expenses', title: 'إجمالي المصروفات', icon: 'ShoppingBag', position: 2, visible: true, size: 'small', category: 'stats' },
  { id: 'widget-3', type: 'net-profit', title: 'صافي الربح', icon: 'TrendingUp', position: 3, visible: true, size: 'small', category: 'stats' },
  { id: 'widget-4', type: 'outstanding-debts', title: 'الديون المستحقة', icon: 'CreditCard', position: 4, visible: true, size: 'small', category: 'stats' },
  
  // Charts
  { id: 'widget-5', type: 'revenue-comparison', title: 'مقارنة الإيرادات والمصروفات', icon: 'BarChart', position: 5, visible: true, size: 'full', category: 'charts' },
  { id: 'widget-6', type: 'monthly-chart', title: 'الأداء الشهري', icon: 'LineChart', position: 6, visible: true, size: 'large', category: 'charts' },
  { id: 'widget-7', type: 'revenue-breakdown', title: 'توزيع الإيرادات', icon: 'PieChart', position: 7, visible: true, size: 'medium', category: 'charts' },
  
  // Lists
  { id: 'widget-8', type: 'recent-invoices', title: 'آخر الفواتير', icon: 'FileText', position: 8, visible: true, size: 'medium', category: 'lists' },
  { id: 'widget-9', type: 'top-products', title: 'المنتجات الأكثر مبيعاً', icon: 'Package', position: 9, visible: true, size: 'medium', category: 'lists' },
  { id: 'widget-10', type: 'top-customers', title: 'أفضل العملاء', icon: 'Users', position: 10, visible: false, size: 'medium', category: 'lists' },
  
  // Performance
  { id: 'widget-11', type: 'performance-indicators', title: 'مؤشرات الأداء', icon: 'Activity', position: 11, visible: true, size: 'large', category: 'performance' },
  { id: 'widget-12', type: 'plan-usage', title: 'استخدام الخطة', icon: 'Crown', position: 12, visible: true, size: 'medium', category: 'performance' },
  { id: 'widget-13', type: 'low-stock-alert', title: 'تنبيهات المخزون', icon: 'AlertTriangle', position: 13, visible: true, size: 'small', category: 'performance' },
  { id: 'widget-14', type: 'quick-actions', title: 'إجراءات سريعة', icon: 'Zap', position: 14, visible: true, size: 'small', category: 'performance' },
];

const STORAGE_KEY = 'dashboard_widgets_config';

/**
 * Load widget configuration from localStorage
 */
export function loadWidgetConfig(): WidgetConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as WidgetConfig[];
      // Merge with defaults to handle new widgets
      return mergeWithDefaults(parsed);
    }
  } catch (error) {
    console.error('Error loading widget config:', error);
  }
  return [...DEFAULT_WIDGETS];
}

/**
 * Save widget configuration to localStorage
 */
export function saveWidgetConfig(widgets: WidgetConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  } catch (error) {
    console.error('Error saving widget config:', error);
  }
}

/**
 * Reset widget configuration to defaults
 */
export function resetWidgetConfig(): WidgetConfig[] {
  localStorage.removeItem(STORAGE_KEY);
  return [...DEFAULT_WIDGETS];
}

/**
 * Merge stored config with defaults to handle new widgets
 */
function mergeWithDefaults(stored: WidgetConfig[]): WidgetConfig[] {
  const storedIds = new Set(stored.map(w => w.id));
  const result = [...stored];
  
  // Add any new widgets that don't exist in storage
  DEFAULT_WIDGETS.forEach(defaultWidget => {
    if (!storedIds.has(defaultWidget.id)) {
      result.push({ ...defaultWidget, position: result.length + 1 });
    }
  });
  
  return result.sort((a, b) => a.position - b.position);
}

/**
 * Move widget to new position
 */
export function moveWidget(widgets: WidgetConfig[], fromIndex: number, toIndex: number): WidgetConfig[] {
  const result = [...widgets];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  
  // Update positions
  return result.map((widget, index) => ({
    ...widget,
    position: index + 1
  }));
}

/**
 * Toggle widget visibility
 */
export function toggleWidgetVisibility(widgets: WidgetConfig[], widgetId: string): WidgetConfig[] {
  return widgets.map(widget => 
    widget.id === widgetId 
      ? { ...widget, visible: !widget.visible }
      : widget
  );
}

/**
 * Update widget size
 */
export function updateWidgetSize(widgets: WidgetConfig[], widgetId: string, size: WidgetConfig['size']): WidgetConfig[] {
  return widgets.map(widget => 
    widget.id === widgetId 
      ? { ...widget, size }
      : widget
  );
}

/**
 * Get visible widgets sorted by position
 */
export function getVisibleWidgets(widgets: WidgetConfig[]): WidgetConfig[] {
  return widgets
    .filter(w => w.visible)
    .sort((a, b) => a.position - b.position);
}

/**
 * Get widget grid column class based on size
 */
export function getWidgetGridClass(size: WidgetConfig['size']): string {
  switch (size) {
    case 'small': return 'col-span-1';
    case 'medium': return 'col-span-1 md:col-span-2';
    case 'large': return 'col-span-1 md:col-span-2 lg:col-span-3';
    case 'full': return 'col-span-full';
    default: return 'col-span-1';
  }
}
