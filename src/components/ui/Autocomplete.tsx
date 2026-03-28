import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

interface AutocompleteOption {
  value: string;
  label: string;
  subtitle?: string;
}

interface AutocompleteProps {
  options: AutocompleteOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
}

export default function Autocomplete({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Selecciona o escribe para buscar...',
  error,
  disabled,
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedValue, setSelectedValue] = useState(value || defaultValue || '');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      option.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleSelect = (optionValue: string) => {
    setSelectedValue(optionValue);
    onChange?.(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full rounded-2xl px-4 py-3 border text-sm text-left flex items-center justify-between transition-all ${
          error
            ? 'border-red-300 bg-red-50'
            : isOpen
            ? 'border-primary-500 ring-2 ring-primary-500 ring-opacity-50'
            : 'border-gray-200 bg-white hover:border-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.28)]">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full rounded-2xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  No se encontraron resultados
                </p>
                <p className="text-xs text-gray-500">
                  {searchQuery ? `No hay coincidencias para "${searchQuery}"` : 'No hay opciones disponibles'}
                </p>
              </div>
            ) : (
              <div className="py-1">
                {filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors ${
                      selectedValue === option.value ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{option.label}</p>
                      {option.subtitle && (
                        <p className="text-xs text-gray-500 truncate">{option.subtitle}</p>
                      )}
                    </div>
                    {selectedValue === option.value && (
                      <Check className="w-4 h-4 text-primary-600 flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
