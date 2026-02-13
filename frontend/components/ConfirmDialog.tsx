import React from 'react';
import AccessibleModal from './AccessibleModal';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  confirmVariant = 'primary',
  isLoading = false,
}) => {
  const confirmButtonClass =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400'
      : 'bg-primary hover:bg-blue-700 focus:ring-blue-400';

  return (
    <AccessibleModal isOpen={isOpen} onClose={onCancel} title={title} maxWidthClassName="max-w-md">
      <div className="space-y-5">
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 disabled:opacity-50 ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </AccessibleModal>
  );
};

export default ConfirmDialog;