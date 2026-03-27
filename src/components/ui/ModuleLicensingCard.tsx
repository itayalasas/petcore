import { useMemo } from 'react';
import { Blocks, Shield } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { type ModuleLicenseInfo } from '../../services/licensing';

export default function ModuleLicensingCard() {
  const {
    subscription,
    moduleLicenses
  } = useTenant();

  const groupedLicenses = useMemo(() => {
    return moduleLicenses.reduce((acc, license) => {
      if (!acc[license.category]) {
        acc[license.category] = [];
      }

      acc[license.category].push(license);
      return acc;
    }, {} as Record<string, ModuleLicenseInfo[]>);
  }, [moduleLicenses]);

  if (!subscription) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
            <Blocks className="w-5 h-5 text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Licencias por módulo</h3>
        </div>
        <p className="text-slate-400">Cargando licencias del tenant...</p>
      </div>
    );
  }

  const getSourceLabel = (license: ModuleLicenseInfo) => {
    if (license.is_core) return 'Core';
    if (license.license_source === 'platform_entitlement') return 'Plataforma';
    if (license.plan_enabled) return 'Plan';
    return 'Sin licencia';
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-700 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <Blocks className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Licencias por módulo</h3>
          </div>
          <p className="text-sm text-slate-400">
            Plan actual: <span className="text-slate-200 font-medium">{subscription.plan_display_name}</span>. Los módulos activos se resuelven desde la suscripción y desde entitlements emitidos por la plataforma.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          Solo lectura
        </span>
      </div>

      <div className="p-6 space-y-6">
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-cyan-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Licenciamiento resuelto al iniciar sesión</p>
            <p className="text-sm text-slate-300 mt-1">
              Si una licencia cambia por pago, suspensión o activación manual de la plataforma, el acceso del tenant se ajusta automáticamente en el arranque de la aplicación.
            </p>
          </div>
        </div>

        {Object.entries(groupedLicenses).map(([category, licenses]) => (
          <div key={category}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">{category}</h4>
              <span className="text-xs text-slate-500">{licenses.filter((license) => license.effective_enabled).length}/{licenses.length} activos</span>
            </div>

            <div className="space-y-3">
              {licenses.map((license) => {
                const disabled = license.is_core || !isAdmin() || savingKey === license.module_key;

                return (
                  <div
                    key={license.module_key}
                    className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-semibold text-white">{license.display_name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${license.effective_enabled ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                          {license.effective_enabled ? 'Activo' : 'Inactivo'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-600">
                          {getSourceLabel(license)}
                        </span>
                      </div>
                      {license.description && (
                        <p className="text-sm text-slate-400">{license.description}</p>
                      )}
                    </div>

                    <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${license.effective_enabled ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-300 border-slate-600'}`}>
                      {license.effective_enabled ? 'Habilitado' : 'Bloqueado'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}