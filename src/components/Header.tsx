import { Search, Bell, User, Building2, ChevronDown, HelpCircle, Settings, LogOut, CircleUser as UserCircle, Shield, PawPrint } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
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
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email || '');
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
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
    <header className="h-16 bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <PawPrint className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-lg">PetCare</span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar mascotas, clientes, órdenes..."
              className="w-96 pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {canAccessPlatform && onTogglePlatformMode && (
            <button
              onClick={onTogglePlatformMode}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                isPlatformMode
                  ? 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Shield className="w-4 h-4" />
              {isPlatformMode ? 'Volver al tenant' : 'Consola plataforma'}
            </button>
          )}

          {currentTenant && tenants.length > 0 && (
            <div className="relative" ref={tenantMenuRef}>
              <button
                onClick={() => setShowTenantMenu(!showTenantMenu)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Building2 className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">{currentTenant.name}</span>
                {tenants.length > 1 && (
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTenantMenu ? 'rotate-180' : ''}`} />
                )}
              </button>

              {showTenantMenu && tenants.length > 1 && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cambiar organización</p>
                  </div>
                  {tenants.map((tenant) => (
                    <button
                      key={tenant.id}
                      onClick={() => handleTenantSelect(tenant.id)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        currentTenant.id === tenant.id ? 'bg-cyan-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className={`w-4 h-4 ${currentTenant.id === tenant.id ? 'text-cyan-600' : 'text-gray-400'}`} />
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${currentTenant.id === tenant.id ? 'text-cyan-700' : 'text-gray-900'}`}>
                            {tenant.name}
                          </p>
                          <p className="text-xs text-gray-500">{tenant.slug}</p>
                        </div>
                        {currentTenant.id === tenant.id && (
                          <div className="w-2 h-2 bg-cyan-600 rounded-full"></div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors relative"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {notifications.filter(n => n.unread).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Notificaciones</p>
                    <p className="text-xs text-gray-500">{notifications.filter(n => n.unread).length} sin leer</p>
                  </div>
                  <button className="text-xs text-cyan-600 hover:text-cyan-700 font-medium">
                    Marcar todas como leídas
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                        notification.unread ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          notification.unread ? 'bg-blue-600' : 'bg-transparent'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="px-4 py-3 border-t border-gray-100 text-center">
                  <button className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">
                    Ver todas las notificaciones
                  </button>
                </div>
              </div>
            )}
          </div>

          <button className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
            <HelpCircle className="w-5 h-5 text-gray-600" />
          </button>

          <div className="w-px h-8 bg-gray-200"></div>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-cyan-700" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">Usuario</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-500">{userEmail}</p>
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3"
                  >
                    <UserCircle className="w-4 h-4 text-gray-500" />
                    Mi perfil
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3"
                  >
                    <Settings className="w-4 h-4 text-gray-500" />
                    Configuración
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3"
                  >
                    <Shield className="w-4 h-4 text-gray-500" />
                    Seguridad
                  </button>
                </div>

                <div className="border-t border-gray-100 pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                  >
                    <LogOut className="w-4 h-4" />
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
