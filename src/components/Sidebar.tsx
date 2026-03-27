import {
  BarChart3,
  Calendar,
  CalendarDays,
  ChevronRight,
  Code2,
  CreditCard,
  FileText,
  Handshake,
  Home,
  Megaphone,
  Package,
  PawPrint,
  Scissors,
  Send,
  Settings,
  ShoppingBag,
  Sliders,
  Sun,
  Truck,
  UserCog,
  Users,
  Heart,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { useTenant } from '../contexts/TenantContext';
import { notificationsService, NotificationCounts } from '../services/notifications';

interface NavItem {
  name: string;
  icon: any;
  key: string;
  module?: string;
  badgeKey?: keyof NotificationCounts;
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
      { name: 'Punto de Venta', icon: ShoppingBag, key: 'pos', module: 'pos', badgeKey: 'pendingBilling' },
      { name: 'Mascotas', icon: PawPrint, key: 'mascotas', module: 'mascotas' },
      { name: 'Duenos', icon: Users, key: 'duenos', module: 'duenos' },
      { name: 'Consultas', icon: Heart, key: 'salud', module: 'salud', badgeKey: 'pendingConsultations' },
      { name: 'Estetica', icon: Scissors, key: 'estetica', module: 'estetica', badgeKey: 'pendingGrooming' },
      { name: 'Cuidado', icon: Sun, key: 'cuidado', module: 'cuidado', badgeKey: 'pendingDaycare' },
      { name: 'Agenda', icon: CalendarDays, key: 'agenda', module: 'agenda' },
      { name: 'Citas', icon: Calendar, key: 'servicios', module: 'agenda' },
      { name: 'Remisiones', icon: Send, key: 'remisiones', module: 'remisiones' },
      { name: 'Ordenes', icon: FileText, key: 'ordenes', module: 'ordenes', badgeKey: 'pendingOrders' },
    ],
  },
  {
    title: 'Negocio',
    items: [
      { name: 'Inventario', icon: Package, key: 'inventario', module: 'inventario' },
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
      { name: 'Empleados', icon: UserCog, key: 'empleados', module: 'empleados' },
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
  const { currentTenant } = useTenant();
  const [counts, setCounts] = useState<NotificationCounts>({
    pendingConsultations: 0,
    pendingGrooming: 0,
    pendingDaycare: 0,
    pendingOrders: 0,
    pendingBilling: 0,
    totalPending: 0,
  });

  const loadCounts = useCallback(async () => {
    if (!currentTenant) return;

    try {
      const newCounts = await notificationsService.getCounts(currentTenant.id);
      setCounts(newCounts);
    } catch (error) {
      console.error('Error loading notification counts:', error);
    }
  }, [currentTenant]);

  useEffect(() => {
    loadCounts();
    const interval = setInterval(loadCounts, 30000);

    let unsubscribe: (() => void) | undefined;
    if (currentTenant) {
      unsubscribe = notificationsService.subscribeToChanges(currentTenant.id, loadCounts);
    }

    return () => {
      clearInterval(interval);
      if (unsubscribe) unsubscribe();
    };
  }, [currentTenant, loadCounts]);

  const hasAccess = (item: NavItem): boolean => {
    if (!item.module) return true;
    if (loading) return false;
    return canView(item.module);
  };

  const getBadgeCount = (item: NavItem): number => {
    if (!item.badgeKey) return 0;
    return counts[item.badgeKey] || 0;
  };

  return (
    <aside
      className={`fixed bottom-0 left-0 top-16 z-40 border-r border-slate-800/70 bg-slate-950 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-white/5 px-4 py-5">
          <div className={`rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm ${collapsed ? 'text-center' : ''}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">Espacio activo</p>
            {!collapsed ? (
              <>
                <p className="mt-2 truncate text-sm font-bold text-white">{currentTenant?.name || 'Organización'}</p>
                <p className="mt-1 text-xs text-slate-400">Operación centralizada para mascotas y servicios</p>
              </>
            ) : (
              <div className="mt-2 text-lg font-bold text-white">•</div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin">
          {navigation.map((section, sectionIdx) => {
            const visibleItems = section.items.filter(hasAccess);

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className={sectionIdx > 0 ? 'mt-8' : ''}>
                {!collapsed && (
                  <h3 className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {section.title}
                  </h3>
                )}

                <nav className="space-y-1.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.key;
                    const badgeCount = getBadgeCount(item);

                    return (
                      <button
                        key={item.key}
                        onClick={() => onViewChange(item.key)}
                        className={`group flex w-full items-center justify-between rounded-2xl px-3 py-3 transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-500 to-cyan-600 text-white shadow-lg shadow-emerald-900/30'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
                              isActive ? 'bg-white/15' : 'bg-white/5 group-hover:bg-white/10'
                            }`}
                          >
                            <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                          </div>
                          {!collapsed && <span className="truncate text-sm font-medium">{item.name}</span>}
                        </div>

                        {!collapsed && (
                          <div className="flex items-center gap-2">
                            {badgeCount > 0 && (
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                  isActive ? 'bg-white text-emerald-700' : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {badgeCount}
                              </span>
                            )}
                            {item.children && <ChevronRight className="h-4 w-4 text-slate-500" />}
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

        <div className="border-t border-white/5 p-4">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            {collapsed ? '→' : '← Contraer'}
          </button>
        </div>
      </div>
    </aside>
  );
}
