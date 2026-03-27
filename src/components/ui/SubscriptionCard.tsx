import { CreditCard, Users, PawPrint, Calendar, AlertCircle, Shield } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';

export default function SubscriptionCard() {
  const { currentTenant, subscription, pendingBillingCheckout } = useTenant();

  if (!currentTenant || !subscription) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Suscripción</h3>
        </div>
        <p className="text-slate-400">Cargando información de suscripción...</p>
      </div>
    );
  }

  const isTrialActive = subscription.is_trial && subscription.trial_ends_at
    ? new Date(subscription.trial_ends_at) > new Date()
    : false;

  const daysRemaining = subscription.trial_ends_at
    ? Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const planColors = {
    basic: 'from-slate-600 to-slate-700',
    professional: 'from-blue-600 to-blue-700',
    enterprise: 'from-purple-600 to-purple-700'
  };

  return (
    <>
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className={`bg-gradient-to-r ${planColors[subscription.plan_name as keyof typeof planColors]} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">{subscription.plan_display_name}</h3>
              <p className="text-white/80 text-sm">
                {subscription.plan_name === 'basic' && 'Plan gratuito'}
                {subscription.plan_name === 'professional' && '$49/mes'}
                {subscription.plan_name === 'enterprise' && 'Plan personalizado'}
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
          </div>

          {isTrialActive && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-semibold text-sm">Período de prueba activo</p>
                <p className="text-white/90 text-xs mt-1">
                  {daysRemaining > 0
                    ? `${daysRemaining} ${daysRemaining === 1 ? 'día restante' : 'días restantes'}`
                    : 'Último día de prueba'}
                </p>
              </div>
            </div>
          )}

          {pendingBillingCheckout && (
            <div className="mt-3 bg-amber-500/10 backdrop-blur-sm border border-amber-300/20 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-200 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-semibold text-sm">Cambio de plan pendiente de confirmación</p>
                <p className="text-white/90 text-xs mt-1">
                  Hay un checkout abierto para {pendingBillingCheckout.planDisplayName ?? pendingBillingCheckout.planName ?? 'tu nuevo plan'}. Las licencias se activarán cuando el pago quede aprobado.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-slate-400 text-sm">Usuarios</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {subscription.max_users === -1 ? 'Ilimitados' : subscription.max_users}
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <PawPrint className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-slate-400 text-sm">Mascotas</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {subscription.max_pets === -1 ? 'Ilimitadas' : subscription.max_pets}
              </p>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-5 h-5 text-slate-400" />
              <span className="text-slate-300 font-semibold">Características incluidas</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {subscription.features.has_basic_features && (
                <div className="flex items-center gap-2 text-slate-300">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  Funcionalidades básicas
                </div>
              )}
              {subscription.features.has_all_features && (
                <div className="flex items-center gap-2 text-slate-300">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  Todas las funcionalidades
                </div>
              )}
              {subscription.features.has_advanced_reports && (
                <div className="flex items-center gap-2 text-slate-300">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  Reportes avanzados
                </div>
              )}
              {subscription.features.has_api_integrations && (
                <div className="flex items-center gap-2 text-slate-300">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  Integraciones API
                </div>
              )}
              {subscription.features.has_priority_support && (
                <div className="flex items-center gap-2 text-slate-300">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  Soporte prioritario
                </div>
              )}
              {subscription.features.has_24_7_support && (
                <div className="flex items-center gap-2 text-slate-300">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  Soporte 24/7
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Suscripción gestionada por plataforma</p>
              <p className="text-sm text-slate-300 mt-1">
                El plan, el estado de cobro y las activaciones se administran desde la consola del propietario de la aplicación.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
