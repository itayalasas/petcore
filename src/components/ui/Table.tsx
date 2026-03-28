import { ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';
import { ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: any) => ReactNode;
}

export interface TableAction {
  label: string;
  icon?: ReactNode;
  onClick: (row: any) => void;
  variant?: 'default' | 'danger';
}

interface TableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  actions?: TableAction[] | ((row: any) => TableAction[]);
}

interface MenuPosition {
  top: number;
  left: number;
}

export default function Table({ columns, data, onRowClick, actions }: TableProps) {
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const clickedButton = buttonRefs.current.find((btn) => btn?.contains(event.target as Node));
        if (!clickedButton) {
          setOpenMenuIndex(null);
        }
      }
    }

    function handleScroll() {
      setOpenMenuIndex(null);
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const getRowActions = (row: any): TableAction[] => {
    if (!actions) return [];
    return typeof actions === 'function' ? actions(row) : actions;
  };

  const handleMenuOpen = (idx: number, buttonEl: HTMLButtonElement, row: any) => {
    if (openMenuIndex === idx) {
      setOpenMenuIndex(null);
      return;
    }

    const rect = buttonEl.getBoundingClientRect();
    const menuWidth = 192;
    const rowActions = getRowActions(row);
    const menuHeight = rowActions.length * 40 + 8;

    let top = rect.bottom + 4;
    let left = rect.right - menuWidth;

    if (top + menuHeight > window.innerHeight) {
      top = rect.top - menuHeight - 4;
    }

    if (left < 8) {
      left = 8;
    }

    setMenuPosition({ top, left });
    setOpenMenuIndex(idx);
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.3)]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-100 bg-slate-50/80">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp className="h-3 w-3 text-slate-400" />
                        <ChevronDown className="-mt-1 h-3 w-3 text-slate-400" />
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="w-24 px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick?.(row)}
                className={`${onRowClick ? 'cursor-pointer hover:bg-emerald-50/40' : ''} transition-colors`}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 text-sm text-slate-700">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
                {actions && (() => {
                  const rowActions = getRowActions(row);
                  return rowActions.length > 0 ? (
                    <td className="px-6 py-4 text-right">
                      <button
                        ref={(el) => { buttonRefs.current[idx] = el; }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuOpen(idx, e.currentTarget, row);
                        }}
                        className="inline-flex items-center justify-center rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {openMenuIndex === idx && createPortal(
                        <div
                          ref={menuRef}
                          style={{ top: menuPosition.top, left: menuPosition.left }}
                          className="fixed z-[9999] w-48 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] animate-in fade-in slide-in-from-top-2"
                        >
                          {rowActions.map((action, actionIdx) => (
                            <button
                              key={actionIdx}
                              onClick={(e) => {
                                e.stopPropagation();
                                action.onClick(row);
                                setOpenMenuIndex(null);
                              }}
                              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                                action.variant === 'danger'
                                  ? 'text-rose-600 hover:bg-rose-50'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {action.icon}
                              {action.label}
                            </button>
                          ))}
                        </div>,
                        document.body
                      )}
                    </td>
                  ) : <td className="px-6 py-4" />;
                })()}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
