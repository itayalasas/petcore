import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
  appearance?: 'light' | 'dark';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer, appearance = 'light' }: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  const shellClasses = appearance === 'dark'
    ? 'bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl'
    : 'bg-white rounded-xl shadow-2xl';

  const headerClasses = appearance === 'dark'
    ? 'flex items-center justify-between px-6 py-4 border-b border-slate-800'
    : 'flex items-center justify-between px-6 py-4 border-b border-gray-200';

  const titleClasses = appearance === 'dark'
    ? 'text-lg font-semibold text-white'
    : 'text-lg font-semibold text-gray-900';

  const closeButtonClasses = appearance === 'dark'
    ? 'p-2 hover:bg-slate-800 rounded-lg transition-colors'
    : 'p-2 hover:bg-gray-100 rounded-lg transition-colors';

  const closeIconClasses = appearance === 'dark'
    ? 'w-5 h-5 text-slate-400'
    : 'w-5 h-5 text-gray-500';

  const bodyClasses = appearance === 'dark'
    ? 'px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto bg-slate-950'
    : 'px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto';

  const footerClasses = appearance === 'dark'
    ? 'px-6 py-4 border-t border-slate-800 bg-slate-900 rounded-b-2xl'
    : 'px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>

        <div className={`relative w-full ${sizeClasses[size]} transform transition-all ${shellClasses}`}>
          <div className={headerClasses}>
            <h3 className={titleClasses}>{title}</h3>
            <button
              onClick={onClose}
              className={closeButtonClasses}
            >
              <X className={closeIconClasses} />
            </button>
          </div>

          <div className={bodyClasses}>
            {children}
          </div>

          {footer && (
            <div className={footerClasses}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
