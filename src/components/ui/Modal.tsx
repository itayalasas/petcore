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

  const isDark = appearance === 'dark';

  const shellClasses = isDark
    ? 'bg-slate-950 border border-white/10 rounded-[32px] shadow-[0_32px_90px_-40px_rgba(15,23,42,0.9)]'
    : 'bg-white border border-white/70 rounded-[32px] shadow-[0_32px_90px_-40px_rgba(15,23,42,0.45)]';

  const headerClasses = isDark
    ? 'flex items-center justify-between gap-4 px-6 py-5 border-b border-white/10'
    : 'flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-cyan-50';

  const titleClasses = isDark ? 'text-lg font-semibold text-white' : 'text-lg font-bold text-slate-950';

  const closeButtonClasses = isDark
    ? 'rounded-full border border-white/10 p-2 text-slate-300 transition-colors hover:bg-white/5 hover:text-white'
    : 'rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900';

  const closeIconClasses = 'h-5 w-5';

  const bodyClasses = isDark
    ? 'max-h-[calc(100vh-220px)] overflow-y-auto bg-slate-950 px-6 py-6'
    : 'max-h-[calc(100vh-220px)] overflow-y-auto bg-white px-6 py-6';

  const footerClasses = isDark
    ? 'rounded-b-[32px] border-t border-white/10 bg-slate-900 px-6 py-4'
    : 'rounded-b-[32px] border-t border-slate-100 bg-slate-50 px-6 py-4';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-md transition-opacity" onClick={onClose} />

        <div className={`relative w-full ${sizeClasses[size]} transform transition-all ${shellClasses}`}>
          <div className={headerClasses}>
            <h3 className={titleClasses}>{title}</h3>
            <button onClick={onClose} className={closeButtonClasses}>
              <X className={closeIconClasses} />
            </button>
          </div>

          <div className={bodyClasses}>{children}</div>

          {footer && <div className={footerClasses}>{footer}</div>}
        </div>
      </div>
    </div>
  );
}
