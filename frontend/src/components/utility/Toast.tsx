import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import clsx from 'clsx';

export type ToastVariant = 'success' | 'error';

interface ToastProps {
  variant: ToastVariant;
  message: string;
  onClose: () => void;
  durationMs?: number;
}

export function Toast({ variant, message, onClose, durationMs = 5000 }: ToastProps) {
  useEffect(() => {
    const timeout = setTimeout(onClose, durationMs);
    return () => clearTimeout(timeout);
  }, [onClose, durationMs]);

  const Icon = variant === 'success' ? CheckCircle : XCircle;

  return (
    <div
      role="alert"
      className={clsx(
        'flex items-center gap-12 rounded-container border px-24 py-16 shadow-none',
        variant === 'success' ? 'border-mercury-blue bg-graphite' : 'border-lead bg-graphite',
      )}
    >
      <Icon size={20} className={variant === 'success' ? 'text-mercury-blue' : 'text-silver'} />
      <p className="text-body-sm text-starlight">{message}</p>
      <button onClick={onClose} aria-label="Dismiss" className="ml-auto text-silver hover:text-starlight">
        <X size={16} />
      </button>
    </div>
  );
}
