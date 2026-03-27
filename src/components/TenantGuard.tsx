import { ReactNode } from 'react';
import { Loader, Building2, AlertCircle } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';

interface TenantGuardProps {
  children: ReactNode;
  onNoTenant: () => void;
}

export default function TenantGuard({ children, onNoTenant }: TenantGuardProps) {
  const { currentTenant, tenants, loading } = useTenant();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando información de la organización...</p>
        </div>
      </div>
    );
  }

  if (!currentTenant || tenants.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-4">Sin Organización Asociada</h2>

          <p className="text-slate-300 mb-6">
            Tu cuenta no está asociada a ninguna organización. Para acceder a la aplicación,
            necesitas crear una organización o ser invitado a una existente.
          </p>

          <div className="space-y-3">
            <button
              onClick={onNoTenant}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Building2 className="w-5 h-5" />
              Crear Nueva Organización
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-900 text-slate-500">o</span>
              </div>
            </div>

            <p className="text-sm text-slate-400">
              Si fuiste invitado a una organización, contacta al administrador para
              que active tu membresía.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
