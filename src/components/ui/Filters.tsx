import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

interface FilterOption {
  label: string;
  value: string;
}

interface Filter {
  key: string;
  label: string;
  type: 'select' | 'date' | 'text';
  options?: FilterOption[];
}

interface FiltersProps {
  filters: Filter[];
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
}

export default function Filters({ filters, onSearch, searchPlaceholder = 'Buscar...' }: FiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              onSearch?.(e.target.value);
            }}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-sm text-slate-900 shadow-sm shadow-white/50 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                onSearch?.('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
            showFilters
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
        </button>
      </div>

      {showFilters && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.35)]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {filters.map((filter) => (
              <div key={filter.key} className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {filter.label}
                </label>
                {filter.type === 'select' && (
                  <select className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200">
                    <option value="">Todos</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
                {filter.type === 'date' && (
                  <input
                    type="date"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                )}
                {filter.type === 'text' && (
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-5">
            <button className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
              Aplicar filtros
            </button>
            <button className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
