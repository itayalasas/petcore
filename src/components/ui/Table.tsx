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

interface TableAction {
  label: string;
  icon?: ReactNode;
  onClick: (row: any) => void;
  variant?: 'default' | 'danger';
}

interface TableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  actions?: TableAction[];
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
        const clickedButton = buttonRefs.current.find(btn => btn?.contains(event.target as Node));
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

  const handleMenuOpen = (idx: number, buttonEl: HTMLButtonElement) => {
    if (openMenuIndex === idx) {
      setOpenMenuIndex(null);
      return;
    }

    const rect = buttonEl.getBoundingClientRect();
    const menuWidth = 192;
    const menuHeight = actions ? actions.length * 40 + 8 : 100;

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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp className="w-3 h-3 text-gray-400" />
                        <ChevronDown className="w-3 h-3 text-gray-400 -mt-1" />
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick?.(row)}
                className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 text-sm text-gray-900">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
                {actions && actions.length > 0 && (
                  <td className="px-6 py-4 text-right">
                    <button
                      ref={(el) => { buttonRefs.current[idx] = el; }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuOpen(idx, e.currentTarget);
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors inline-flex items-center justify-center"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>

                    {openMenuIndex === idx && createPortal(
                      <div
                        ref={menuRef}
                        style={{ top: menuPosition.top, left: menuPosition.left }}
                        className="fixed w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[9999] animate-in fade-in slide-in-from-top-2"
                      >
                        {actions.map((action, actionIdx) => (
                          <button
                            key={actionIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick(row);
                              setOpenMenuIndex(null);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors ${
                              action.variant === 'danger'
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-gray-700 hover:bg-gray-50'
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
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
