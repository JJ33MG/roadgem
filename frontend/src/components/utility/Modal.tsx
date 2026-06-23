import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ isOpen, title, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-space/80 px-16">
      <div className="w-full max-w-lg rounded-container border border-lead bg-midnight-slate p-32">
        <div className="mb-24 flex items-center justify-between">
          <h3 className="text-heading-sm font-display font-w480 text-starlight">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-silver hover:text-starlight">
            <X size={20} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
