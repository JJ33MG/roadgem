import { Toast, type ToastVariant } from './Toast';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-24 z-50 flex w-full max-w-sm flex-col gap-12">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          message={toast.message}
          onClose={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}
