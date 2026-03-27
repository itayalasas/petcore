import {
  Home,
  PawPrint,
  Heart,
  Calendar,
  ShoppingBag,
  FileText,
  CreditCard,
  Handshake,
  Users,
  Truck,
  Megaphone,
  BarChart3,
  Settings,
  ChevronRight,
  Sliders,
  Code2,
  Scissors,
  Sun
} from 'lucide-react';
import { useState } from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface NavItem {
  name: string;
  icon: any;
  key: string;
  module?: string;
  badge?: number;
  children?: { name: string; key: string }[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: 'Operacion diaria',
    items: [
      { name: 'Inicio', icon: Home, key: 'dashboard', module: 'dashboard' },
      { name: 'Punto de Venta', icon: ShoppingBag, key: 'pos', module: 'pos' },
      { name: 'Mascotas', icon: PawPrint, key: 'mascotas', module: 'mascotas' },
      { name: 'Duenos', icon: Users, key: 'duenos', module: 'duenos' },
      { name: 'Consultas', icon: Heart, key: 'salud', module: 'salud', badge: 3 },
      { name: 'Estetica', icon: Scissors, key: 'estetica', module: 'estetica' },
      { name: 'Cuidado', icon: Sun, key: 'cuidado', module: 'cuidado' },
      { name: 'Agenda', icon: Calendar, key: 'servicios', module: 'agenda' },
      { name: 'Ordenes', icon: FileText, key: 'ordenes', module: 'ordenes', badge: 12 },
    ],
  },
  {
    title: 'Negocio',
    items: [
      { name: 'Comercio', icon: ShoppingBag, key: 'comercio', module: 'comercio' },
      { name: 'Pagos y finanzas', icon: CreditCard, key: 'pagos', module: 'pagos' },
      { name: 'Aliados', icon: Handshake, key: 'aliados', module: 'aliados' },
      { name: 'Clientes', icon: Users, key: 'clientes', module: 'clientes' },
    ],
  },
  {
    title: 'Escalamiento',
    items: [
      { name: 'Logística', icon: Truck, key: 'logistica', module: 'logistica' },
      { name: 'Marketing y CRM', icon: Megaphone, key: 'marketing', module: 'marketing' },
      { name: 'Reportes', icon: BarChart3, key: 'reportes', module: 'reportes' },
    ],
  },
  {
    title: 'Plataforma',
    items: [
      { name: 'Administración', icon: Settings, key: 'administracion', module: 'administracion' },
      { name: 'Configuración', icon: Sliders, key: 'configuracion', module: 'configuracion' },
      { name: 'API Docs', icon: Code2, key: 'api-docs', module: 'api' },
    ],
  },
];

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { canView, loading } = usePermissions();

  const hasAccess = (item: NavItem): boolean => {
    if (!item.module) return true;
    if (loading) return false;
    return canView(item.module);
  };

  return (
    <aside className={`fixed left-0 top-16 bottom-0 bg-gray-900 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'} z-40`}>
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-thin">
          {navigation.map((section, sectionIdx) => {
            const visibleItems = section.items.filter(hasAccess);

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className={sectionIdx > 0 ? 'mt-8' : ''}>
                {!collapsed && (
                  <h3 className="px-3 mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {section.title}
                  </h3>
                )}

                <nav className="space-y-1">
                  {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => onViewChange(item.key)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group ${
                        isActive
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                        {!collapsed && (
                          <span className="text-sm font-medium truncate">{item.name}</span>
                        )}
                      </div>

                      {!collapsed && (
                        <div className="flex items-center gap-2">
                          {item.badge && (
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                              isActive
                                ? 'bg-white text-primary-700'
                                : 'bg-gray-800 text-gray-300'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                          {item.children && (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-800 p-4">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {collapsed ? '→' : '← Contraer'}
          </button>
        </div>
      </div>
    </aside>
  );
}
