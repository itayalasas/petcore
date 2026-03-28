import { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function FormField({ label, required, error, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-2.5">
      <label className="block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs leading-6 text-slate-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 shadow-sm shadow-white/50 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 ${
        error ? 'border-rose-300 bg-rose-50 focus:border-rose-300' : 'border-slate-200 bg-slate-50 focus:border-emerald-300'
      } ${className}`}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options?: { value: string; label: string }[];
  children?: React.ReactNode;
}

export function Select({ error, options, className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 shadow-sm shadow-white/50 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-200 ${
        error ? 'border-rose-300 bg-rose-50 focus:border-rose-300' : 'border-slate-200 bg-slate-50 focus:border-emerald-300'
      } ${className}`}
      {...props}
    >
      {children
        ? children
        : options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
    </select>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ error, className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 shadow-sm shadow-white/50 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none ${
        error ? 'border-rose-300 bg-rose-50 focus:border-rose-300' : 'border-slate-200 bg-slate-50 focus:border-emerald-300'
      } ${className}`}
      rows={4}
      {...props}
    />
  );
}
