interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function Select({
  options,
  value,
  defaultValue,
  onChange,
  placeholder,
  className = '',
  disabled = false,
}: SelectProps) {
  return (
    <select
      value={value}
      defaultValue={defaultValue}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      className={`w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm shadow-white/50 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-100 disabled:text-slate-400 ${className}`}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
