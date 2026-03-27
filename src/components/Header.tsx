import {
  Bell,
  Building2,
  ChevronDown,
  HelpCircle,
  LogOut,
  PawPrint,
  Search,
  Settings,
  Shield,
  User,
  UserCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../contexts/TenantContext';

interface HeaderProps {
  canAccessPlatform?: boolean;
  isPlatformMode?: boolean;
  onTogglePlatformMode?: () => void;
}

const notifications = [
  {
    id: 1,
    type: 'appointment',
    title: 'Cita programada',
    message: 'Max tiene una cita de vacunación en 30 minutos',
    time: 'Hace 5 min',
    unread: true,
  },
  {
    id: 2,
    type: 'alert',
    title: 'Stock bajo',
    message: 'El producto "Collar antipulgas" tiene stock bajo (8 unidades)',
    time: 'Hace 1 hora',
    unread: true,
  },
  {
    id: 3,
    type: 'payment',
    title: 'Pago recibido',
    message: 'Se recibió el pago de $450 de Juan Pérez',
    time: 'Hace 2 horas',
    unread: false,
  },
  {
    id: 4,
    type: 'reminder',
    title: 'Recordatorio de vacuna',
    message: 'Luna necesita su vacuna anual en 3 días',
    time: 'Hace 3 horas',
    unread: false,
  },
];

export default function Header({
  canAccessPlatform = false,
  isPlatformMode = false,
  onTogglePlatformMode,
}: HeaderProps) {
  const { currentTenant, tenants, switchTenant } = useTenant();
  const [showTenantMenu, setShowTenantMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  const tenantMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setUserEmail(user.email || '');
      const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
      if (profile) {
        setUserName(profile.display_name || user.email || 'Usuario');
      }
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tenantMenuRef.current && !tenantMenuRef.current.contains(event.target as Node)) {
        setShowTenantMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTenantSelect = async (tenantId: string) => {
    await switchTenant(tenantId);
    setShowTenantMenu(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex min-w-0 items-center gap-6 lg:gap-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 shadow-lg shadow-emerald-500/20">
              <PawPrint className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-slate-950">PetCare Core</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700/70">Workspace</p>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar mascotas, clientes, órdenes..."
              className="w-[26rem] rounded-2xl border border-slate-200 bg-slate-50/90 py-2.5 pl-11 pr-4 text-sm text-slate-700 shadow-inner shadow-white focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canAccessPlatform && onTogglePlatformMode && (
            <button
              onClick={onTogglePlatformMode}
              className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-semibold transition-colors ${
                isPlatformMode
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Shield className="h-4 w-4" />
              {isPlatformMode ? 'Volver al tenant' : 'Consola plataforma'}
            </button>
          )}

          {currentTenant && tenants.length > 0 && (
            <div className="relative" ref={tenantMenuRef}>
              <button
                onClick={() => setShowTenantMenu(!showTenantMenu)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Building2 className="h-4 w-4 text-slate-500" />
                <span className="max-w-36 truncate">{currentTenant.name}</span>
                {tenants.length > 1 && (
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showTenantMenu ? 'rotate-180' : ''}`} />
                )}
              </button>

              {showTenantMenu && tenants.length > 1 && (
                <div className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)]">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cambiar organización</p>
                  </div>
                  {tenants.map((tenant) => {
                    const isActive = currentTenant.id === tenant.id;

                    return (
                      <button
                        key={tenant.id}
                        onClick={() => handleTenantSelect(tenant.id)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                          isActive ? 'bg-emerald-50/70' : ''
                        }`}
                      >
                        <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${isActive ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                          <Building2 className={`h-4 w-4 ${isActive ? 'text-emerald-700' : 'text-slate-500'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-semibold ${isActive ? 'text-emerald-800' : 'text-slate-900'}`}>{tenant.name}</p>
                          <p className="truncate text-xs text-slate-500">{tenant.slug}</p>
                        </div>
                        {isActive && <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Bell className="h-5 w-5" />
              {notifications.filter((notification) => notification.unread).length > 0 && (
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-96 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)]">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <p className="text-sm font-bold text-slate-950">Notificaciones</p>
                    <p className="text-xs text-slate-500">{notifications.filter((notification) => notification.unread).length} sin leer</p>
                  </div>
                  <button className="text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-800">
                    Marcar todas como leídas
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      className={`w-full border-b border-slate-100 px-5 py-4 text-left transition-colors hover:bg-slate-50 ${
                        notification.unread ? 'bg-cyan-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-2 h-2.5 w-2.5 rounded-full ${notification.unread ? 'bg-cyan-500' : 'bg-slate-200'}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-950">{notification.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>
                          <p className="mt-1 text-xs text-slate-500">{notification.time}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="px-5 py-4 text-center">
                  <button className="text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-800">
                    Ver todas las notificaciones
                  </button>
                </div>
              </div>
            )}
          </div>

          <button className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 transition-colors hover:bg-slate-50">
            <HelpCircle className="h-5 w-5" />
          </button>

          <div className="hidden h-8 w-px bg-slate-200 md:block" />

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 transition-colors hover:bg-slate-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-cyan-100">
                <User className="h-4 w-4 text-emerald-700" />
              </div>
              <div className="hidden text-left sm:block">
                <p className="max-w-32 truncate text-sm font-semibold text-slate-900">{userName || 'Usuario'}</p>
                <p className="text-xs text-slate-500">Usuario</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)]">
                <div className="border-b border-slate-100 px-4 py-4">
                  <p className="truncate text-sm font-semibold text-slate-950">{userName || 'Usuario'}</p>
                  <p className="truncate text-xs text-slate-500">{userEmail}</p>
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <UserCircle className="h-4 w-4 text-slate-500" />
                    Mi perfil
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Settings className="h-4 w-4 text-slate-500" />
                    Configuración
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Shield className="h-4 w-4 text-slate-500" />
                    Seguridad
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-2">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
