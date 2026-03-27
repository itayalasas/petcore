import { useState, useEffect } from 'react';
import { Loader, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import POS from './components/modules/POS';
import Mascotas from './components/modules/Mascotas';
import Duenos from './components/modules/Duenos';
import Salud from './components/modules/Salud';
import Servicios from './components/modules/Servicios';
import Estetica from './components/modules/Estetica';
import Cuidado from './components/modules/Cuidado';
import Agenda from './components/modules/Agenda';
import Remisiones from './components/modules/Remisiones';
import Empleados from './components/modules/Empleados';
import Ordenes from './components/modules/Ordenes';
import Comercio from './components/modules/Comercio';
import Pagos from './components/modules/Pagos';
import Aliados from './components/modules/Aliados';
import Clientes from './components/modules/Clientes';
import Logistica from './components/modules/Logistica';
import Marketing from './components/modules/Marketing';
import Reportes from './components/modules/Reportes';
import Administracion from './components/modules/Administracion';
import Configuracion from './components/modules/Configuracion';
import ApiDocs from './components/modules/ApiDocs';
import PlatformLicensing from './components/modules/PlatformLicensing';
import { TenantProvider, useTenant } from './contexts/TenantContext';
import { PermissionsProvider, usePermissions } from './hooks/usePermissions';
import { ToastProvider, useToast } from './contexts/ToastContext';
import TenantGuard from './components/TenantGuard';
import LandingPage from './components/landing/LandingPage';
import CompanyRegistrationModal from './components/auth/CompanyRegistrationModal';
import LoginModal from './components/auth/LoginModal';
import { supabase } from './lib/supabase';
import { getCurrentPlatformAdmin, type PlatformAdminProfile } from './services/licensing';
import { createMercadoPagoCheckout, syncMercadoPagoCheckoutStatus } from './services/billing';
import { setToastHandlers } from './utils/messages';

type ModalState = 'none' | 'register' | 'login';
type PlatformAccessStatus = 'idle' | 'checking' | 'granted' | 'denied' | 'error';

const AUTH_DEBUG_PREFIX = '[auth-bootstrap]';

function authDebug(message: string, details?: unknown) {
  if (details !== undefined) {
    console.log(`${AUTH_DEBUG_PREFIX} ${message}`, details);
    return;
  }

  console.log(`${AUTH_DEBUG_PREFIX} ${message}`);
}

const viewModuleMap: Record<string, string> = {
  dashboard: 'dashboard',
  pos: 'pos',
  mascotas: 'mascotas',
  duenos: 'duenos',
  salud: 'salud',
  estetica: 'estetica',
  cuidado: 'cuidado',
  servicios: 'agenda',
  agenda: 'agenda',
  remisiones: 'remisiones',
  empleados: 'empleados',
  ordenes: 'ordenes',
  comercio: 'comercio',
  pagos: 'pagos',
  aliados: 'aliados',
  clientes: 'clientes',
  logistica: 'logistica',
  marketing: 'marketing',
  reportes: 'reportes',
  administracion: 'administracion',
  configuracion: 'configuracion',
  'api-docs': 'api'
};

function RenderActiveView({ activeView, onFallback }: { activeView: string; onFallback: () => void }) {
  const { canView, loading } = usePermissions();
  const moduleKey = viewModuleMap[activeView];

  useEffect(() => {
    if (!loading && activeView !== 'dashboard' && moduleKey && !canView(moduleKey)) {
      onFallback();
    }
  }, [activeView, canView, loading, moduleKey, onFallback]);

  if (!loading && activeView !== 'dashboard' && moduleKey && !canView(moduleKey)) {
    return <Dashboard />;
  }

  switch (activeView) {
    case 'dashboard':
      return <Dashboard />;
    case 'pos':
      return <POS />;
    case 'mascotas':
      return <Mascotas />;
    case 'duenos':
      return <Duenos />;
    case 'salud':
      return <Salud />;
    case 'estetica':
      return <Estetica />;
    case 'cuidado':
      return <Cuidado />;
    case 'servicios':
      return <Servicios />;
    case 'agenda':
      return <Agenda />;
    case 'remisiones':
      return <Remisiones />;
    case 'empleados':
      return <Empleados />;
    case 'ordenes':
      return <Ordenes />;
    case 'comercio':
      return <Comercio />;
    case 'pagos':
      return <Pagos />;
    case 'aliados':
      return <Aliados />;
    case 'clientes':
      return <Clientes />;
    case 'logistica':
      return <Logistica />;
    case 'marketing':
      return <Marketing />;
    case 'reportes':
      return <Reportes />;
    case 'administracion':
      return <Administracion />;
    case 'configuracion':
      return <Configuracion />;
    case 'api-docs':
      return <ApiDocs />;
    default:
      return <Dashboard />;
  }
}

function WorkspaceShell({
  canAccessPlatform,
  platformAccessStatus,
  platformAccessError,
  onRetryPlatformAccess,
  onNoTenant
}: {
  canAccessPlatform: boolean;
  platformAccessStatus: PlatformAccessStatus;
  platformAccessError: string | null;
  onRetryPlatformAccess: () => Promise<void>;
  onNoTenant: () => void;
}) {
  const { currentTenant, loading: tenantLoading, refreshTenant, pendingBillingCheckout } = useTenant();
  const toast = useToast();
  const [syncingBillingStatus, setSyncingBillingStatus] = useState(false);
  const [continuingCheckout, setContinuingCheckout] = useState(false);
  const [activeView, setActiveView] = useState(() => {
    const savedView = localStorage.getItem('activeWorkspaceView');
    if (savedView) {
      return savedView;
    }

    return canAccessPlatform ? 'platform-licensing' : 'dashboard';
  });

  const isPlatformView = canAccessPlatform && activeView === 'platform-licensing';

  useEffect(() => {
    localStorage.setItem('activeWorkspaceView', activeView);
  }, [activeView]);

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const navigationEvent = event as CustomEvent<{ view?: string }>;

      if (navigationEvent.detail?.view) {
        setActiveView(navigationEvent.detail.view);
      }
    };

    window.addEventListener('app:navigate', handleNavigate as EventListener);
    return () => window.removeEventListener('app:navigate', handleNavigate as EventListener);
  }, []);

  useEffect(() => {
    if (!canAccessPlatform && activeView === 'platform-licensing') {
      setActiveView('dashboard');
    }
  }, [activeView, canAccessPlatform]);

  useEffect(() => {
    if (!tenantLoading && !currentTenant && canAccessPlatform && activeView !== 'platform-licensing') {
      setActiveView('platform-licensing');
    }
  }, [activeView, canAccessPlatform, currentTenant, tenantLoading]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const billingState = url.searchParams.get('billing');

    if (!billingState) {
      return;
    }

    if (billingState === 'success') {
      toast.showSuccess('Pago recibido. Estamos validando la confirmación para activar el nuevo plan.');
    } else if (billingState === 'pending') {
      toast.showInfo('El checkout quedó pendiente. Mantendremos el plan actual hasta recibir confirmación de pago.');
    } else if (billingState === 'failure') {
      toast.showError('El pago no fue confirmado. El cambio de plan sigue pendiente hasta que completes el checkout.');
    }

    void refreshTenant();
    url.searchParams.delete('billing');
    window.history.replaceState({}, document.title, url.toString());
  }, [refreshTenant, toast]);

  const handleSyncBillingStatus = async () => {
    if (!currentTenant || !pendingBillingCheckout) {
      return;
    }

    try {
      setSyncingBillingStatus(true);
      await syncMercadoPagoCheckoutStatus(currentTenant.id, pendingBillingCheckout.id);
      await refreshTenant();
      toast.showInfo('Estado del checkout actualizado.');
    } catch (error) {
      console.error('Error syncing billing checkout status:', error);
      toast.showError(error instanceof Error ? error.message : 'No fue posible actualizar el estado del pago.');
    } finally {
      setSyncingBillingStatus(false);
    }
  };

  const handleResumeTenantCheckout = async () => {
    if (!currentTenant || !pendingBillingCheckout) {
      return;
    }

    try {
      setContinuingCheckout(true);
      const checkout = await createMercadoPagoCheckout(
        currentTenant.id,
        pendingBillingCheckout.planId,
        pendingBillingCheckout.checkoutEnvironment,
        null,
        window.location.origin
      );

      const url = checkout.preferredCheckoutUrl ?? checkout.checkoutUrl ?? checkout.sandboxCheckoutUrl;

      if (!url) {
        throw new Error('Mercado Pago no devolvió una URL de checkout');
      }

      window.location.assign(url);
    } catch (error) {
      console.error('Error continuing Mercado Pago checkout:', error);
      toast.showError(error instanceof Error ? error.message : 'No fue posible abrir el checkout de pago.');
    } finally {
      setContinuingCheckout(false);
    }
  };

  const handleTogglePlatformMode = () => {
    if (!canAccessPlatform) {
      return;
    }

    if (isPlatformView) {
      setActiveView(currentTenant ? 'dashboard' : 'platform-licensing');
      return;
    }

    setActiveView('platform-licensing');
  };

  if (isPlatformView) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Header
          canAccessPlatform={canAccessPlatform}
          isPlatformMode
          onTogglePlatformMode={handleTogglePlatformMode}
        />
        <main className="mt-16 p-8">
          <PlatformLicensing />
        </main>
      </div>
    );
  }

  if (!tenantLoading && !currentTenant && platformAccessStatus === 'error') {
    return (
      <div className="min-h-screen bg-slate-950">
        <Header
          canAccessPlatform={false}
          isPlatformMode={false}
        />
        <main className="mt-16 min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-5">
              <Loader className="w-7 h-7 text-amber-300" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">No se pudo validar el acceso a plataforma</h2>
            <p className="text-slate-300 text-sm mb-6">
              {platformAccessError ?? 'La aplicación no pudo confirmar si tu usuario pertenece a la consola global.'}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => void onRetryPlatformAccess()}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
              >
                Reintentar validación
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors border border-slate-700"
              >
                Recargar aplicación
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <TenantGuard onNoTenant={onNoTenant}>
      <div className="min-h-screen bg-gray-50">
        <Header
          canAccessPlatform={canAccessPlatform}
          isPlatformMode={false}
          onTogglePlatformMode={handleTogglePlatformMode}
        />
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        <main className="ml-64 mt-16 p-8">
          {pendingBillingCheckout && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Cambio de plan pendiente de confirmación</p>
                    <p className="text-sm text-amber-800 mt-1">
                      Tu organización tiene un checkout abierto para el plan {pendingBillingCheckout.planDisplayName ?? pendingBillingCheckout.planName ?? 'seleccionado'} por {pendingBillingCheckout.amount} {pendingBillingCheckout.currencyId}. Las nuevas licencias se activarán solo cuando Mercado Pago confirme el cobro.
                    </p>
                    <p className="text-xs text-amber-700 mt-2">
                      Estado actual del checkout: {pendingBillingCheckout.status === 'pending' ? 'Pendiente' : 'En proceso'}.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {pendingBillingCheckout.preferredCheckoutUrl && (
                    <button
                      type="button"
                      onClick={() => void handleResumeTenantCheckout()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-300 bg-white text-amber-900 hover:bg-amber-50 transition-colors"
                    >
                      {continuingCheckout ? <Loader className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                      Continuar pago
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleSyncBillingStatus()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {syncingBillingStatus ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Actualizar estado
                  </button>
                </div>
              </div>
            </div>
          )}
          <RenderActiveView activeView={activeView} onFallback={() => setActiveView('dashboard')} />
        </main>
      </div>
    </TenantGuard>
  );
}

function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [platformAdmin, setPlatformAdmin] = useState<PlatformAdminProfile | null>(null);
  const [platformAccessStatus, setPlatformAccessStatus] = useState<PlatformAccessStatus>('idle');
  const [platformAccessError, setPlatformAccessError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>('none');
  const toast = useToast();

  const loadAuthContext = async (nextUser: any | null) => {
    authDebug('loadAuthContext:start', {
      userId: nextUser?.id ?? null,
      email: nextUser?.email ?? null,
    });

    setUser(nextUser);

    if (!nextUser) {
      authDebug('loadAuthContext:no-user');
      setPlatformAdmin(null);
      setPlatformAccessStatus('idle');
      setPlatformAccessError(null);
      return;
    }

    try {
      setPlatformAccessStatus('checking');
      setPlatformAccessError(null);
      authDebug('loadAuthContext:platform-lookup:start', { userId: nextUser.id });
      const platformAccess = await getCurrentPlatformAdmin(nextUser.id);
      authDebug('loadAuthContext:platform-lookup:done', platformAccess);
      setPlatformAdmin(platformAccess);
      setPlatformAccessStatus(platformAccess ? 'granted' : 'denied');
    } catch (platformError) {
      console.error(`${AUTH_DEBUG_PREFIX} loadAuthContext:platform-lookup:error`, platformError);
      setPlatformAdmin(null);
      setPlatformAccessStatus('denied');
      setPlatformAccessError(null);
    }
  };

  const retryPlatformAccess = async () => {
    authDebug('retryPlatformAccess:start', { userId: user?.id ?? null });
    if (!user) {
      return;
    }

    setLoading(true);
    await loadAuthContext(user);
    setLoading(false);
  };

  useEffect(() => {
    setToastHandlers({
      showSuccess: toast.showSuccess,
      showError: toast.showError,
      showInfo: toast.showInfo,
    });
  }, [toast]);

  useEffect(() => {
    let isMounted = true;
    let bootstrapTimeout: ReturnType<typeof setTimeout> | null = null;

    const bootstrapAuth = async () => {
      try {
        authDebug('bootstrap:start');
        setBootstrapError(null);
        bootstrapTimeout = setTimeout(() => {
          if (!isMounted) {
            return;
          }

          authDebug('bootstrap:timeout - continuing without blocking');
          setLoading(false);
        }, 12000);

        authDebug('bootstrap:getSession:start');
        const { data: { session }, error } = await supabase.auth.getSession();
        authDebug('bootstrap:getSession:done', {
          hasSession: Boolean(session),
          userId: session?.user?.id ?? null,
          error: error?.message ?? null,
        });

        if (!isMounted) {
          authDebug('bootstrap:aborted-unmounted');
          return;
        }

        if (error?.message?.includes('User from sub claim in JWT does not exist')) {
          authDebug('bootstrap:invalid-jwt-user');
          await supabase.auth.signOut();
          await loadAuthContext(null);
        } else {
          await loadAuthContext(session?.user ?? null);
        }
      } catch (bootstrapError) {
        console.error(`${AUTH_DEBUG_PREFIX} bootstrap:error`, bootstrapError);
        if (isMounted) {
          setBootstrapError('Ocurrió un error cargando la autenticación. Revisa la consola para más detalle.');
        }
      } finally {
        if (bootstrapTimeout) {
          clearTimeout(bootstrapTimeout);
        }

        if (isMounted) {
          authDebug('bootstrap:finish');
          setLoading(false);
        }
      }
    };

    bootstrapAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      authDebug('onAuthStateChange', {
        event: _event,
        hasSession: Boolean(session),
        userId: session?.user?.id ?? null,
      });
      await loadAuthContext(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      if (bootstrapTimeout) {
        clearTimeout(bootstrapTimeout);
      }
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = () => {
    authDebug('handleAuthSuccess');
    setModalState('none');
  };

  const handleResetAuthentication = async () => {
    authDebug('handleResetAuthentication:clicked');
    try {
      await supabase.auth.signOut({ scope: 'local' });
      authDebug('handleResetAuthentication:local-signout:done');
    } catch (error) {
      console.error(`${AUTH_DEBUG_PREFIX} handleResetAuthentication:error`, error);
    } finally {
      authDebug('handleResetAuthentication:clearing-storage');
      localStorage.removeItem('currentTenantId');
      localStorage.removeItem('activeWorkspaceView');
      sessionStorage.clear();
      setBootstrapError(null);
      setPlatformAdmin(null);
      setUser(null);
      authDebug('handleResetAuthentication:reloading');
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (bootstrapError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 mx-auto mb-5 flex items-center justify-center">
            <Loader className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-3">No se pudo completar el inicio</h2>
          <p className="text-slate-300 text-sm mb-6">{bootstrapError}</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                authDebug('retry:clicked');
                window.location.reload();
              }}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={handleResetAuthentication}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors border border-slate-700"
            >
              Cerrar sesión y limpiar acceso
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage
          onRegisterCompany={() => setModalState('register')}
          onLogin={() => setModalState('login')}
        />
        {modalState === 'register' && (
          <CompanyRegistrationModal
            onClose={() => setModalState('none')}
            onSuccess={handleAuthSuccess}
          />
        )}
        {modalState === 'login' && (
          <LoginModal
            onClose={() => setModalState('none')}
            onSuccess={handleAuthSuccess}
            onSwitchToRegister={() => setModalState('register')}
          />
        )}
      </>
    );
  }

  return (
    <TenantProvider>
      <PermissionsProvider>
        <WorkspaceShell
          canAccessPlatform={Boolean(platformAdmin)}
          platformAccessStatus={platformAccessStatus}
          platformAccessError={platformAccessError}
          onRetryPlatformAccess={retryPlatformAccess}
          onNoTenant={() => setModalState('register')}
        />
        {modalState === 'register' && (
          <CompanyRegistrationModal
            onClose={() => setModalState('none')}
            onSuccess={handleAuthSuccess}
          />
        )}
      </PermissionsProvider>
    </TenantProvider>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
