import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

interface AppErrorBoundaryProps {
  children?: ReactNode;
}

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'حدث خطأ غير متوقع',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('AppErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center">
          <h1 className="text-xl font-bold mb-2">حدث خطأ غير متوقع في التطبيق</h1>
          <p className="text-slate-600 mb-4">
            تم إيقاف الصفحة الحالية لحماية البيانات. يمكنك إعادة تحميل التطبيق للمتابعة.
          </p>

          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={this.handleReload}
              className="px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 transition-colors"
            >
              إعادة تحميل التطبيق
            </button>
            <button
              onClick={() => { window.location.hash = '#/'; }}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              العودة للرئيسية
            </button>
          </div>

          {import.meta.env.DEV && this.state.errorMessage && (
            <div className="text-right bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm break-all">
              <p className="font-semibold mb-1">تفاصيل الخطأ (وضع التطوير):</p>
              <p>{this.state.errorMessage}</p>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
