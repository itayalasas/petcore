import { useState } from 'react';
import { X, Building2, Mail, Lock, User, Briefcase, Users, Loader, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { isValidSlug, getTenantUrl } from '../../utils/tenantDetection';

interface CompanyRegistrationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type RegistrationStep = 'company' | 'admin' | 'plan' | 'complete';

interface CompanyData {
  name: string;
  slug: string;
  industry: string;
  size: string;
}

interface AdminData {
  fullName: string;
  email: string;
  password: string;
  position: string;
}

interface PlanData {
  plan: 'basic' | 'professional' | 'enterprise';
}

export default function CompanyRegistrationModal({ onClose, onSuccess }: CompanyRegistrationModalProps) {
  const [step, setStep] = useState<RegistrationStep>('company');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  const [companyData, setCompanyData] = useState<CompanyData>({
    name: '',
    slug: '',
    industry: '',
    size: ''
  });

  const [adminData, setAdminData] = useState<AdminData>({
    fullName: '',
    email: '',
    password: '',
    position: ''
  });

  const [planData, setPlanData] = useState<PlanData>({
    plan: 'basic'
  });

  const generateSlug = (name: string) => {
    const slug = name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (slug && !isValidSlug(slug)) {
      setSlugError('Este identificador no es válido o está reservado');
    } else {
      setSlugError(null);
    }

    setCompanyData({ ...companyData, name, slug });
  };

  const handleSlugChange = (slug: string) => {
    const sanitizedSlug = slug.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]+/g, '');

    if (sanitizedSlug && !isValidSlug(sanitizedSlug)) {
      setSlugError('Este identificador no es válido o está reservado');
    } else {
      setSlugError(null);
    }

    setCompanyData({ ...companyData, slug: sanitizedSlug });
  };

  const validateStep = () => {
    if (step === 'company') {
      if (!companyData.name || !companyData.slug || !companyData.industry || !companyData.size) {
        setError('Por favor completa todos los campos de la empresa');
        return false;
      }
      if (slugError) {
        setError(slugError);
        return false;
      }
      if (!isValidSlug(companyData.slug)) {
        setError('El identificador no es válido o está reservado');
        return false;
      }
    } else if (step === 'admin') {
      if (!adminData.fullName || !adminData.email || !adminData.password || !adminData.position) {
        setError('Por favor completa todos los campos del administrador');
        return false;
      }
      if (adminData.password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleNextStep = async () => {
    if (!validateStep()) return;

    if (step === 'company') {
      setLoading(true);
      try {
        const { data: existingTenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', companyData.slug)
          .maybeSingle();

        if (existingTenant) {
          setError('Este identificador ya está en uso. Por favor elige otro.');
          setLoading(false);
          return;
        }

        setStep('admin');
      } catch (err: any) {
        setError(err.message || 'Error al validar la empresa');
      } finally {
        setLoading(false);
      }
    } else if (step === 'admin') {
      setStep('plan');
    } else if (step === 'plan') {
      await handleCompleteRegistration();
    }
  };

  const handleCompleteRegistration = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: adminData.email,
        password: adminData.password,
        options: {
          data: {
            display_name: adminData.fullName,
            position: adminData.position
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Error al crear usuario');
      if (!authData.session) throw new Error('No se pudo establecer la sesión');

      await supabase.auth.setSession({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token
      });

      await new Promise(resolve => setTimeout(resolve, 800));

      const { data: registrationResult, error: registrationError } = await supabase.rpc('register_company', {
        p_user_id: authData.user.id,
        p_company_name: companyData.name,
        p_company_slug: companyData.slug,
        p_subscription_plan: planData.plan,
        p_user_email: adminData.email,
        p_user_display_name: adminData.fullName,
        p_industry: companyData.industry,
        p_company_size: companyData.size
      });

      if (registrationError) throw registrationError;
      if (!registrationResult) throw new Error('Error al registrar la empresa');

      setStep('complete');
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Error al crear la organización');
      setLoading(false);
    }
  };

  const handleBackStep = () => {
    setError(null);
    if (step === 'admin') setStep('company');
    else if (step === 'plan') setStep('admin');
  };

  if (step === 'complete') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Organización Creada</h2>
          <p className="text-slate-300 mb-6">
            Tu empresa <strong className="text-white">{companyData.name}</strong> ha sido registrada exitosamente.
            Redirigiendo al panel de configuración...
          </p>
          <div className="flex items-center justify-center gap-2">
            <Loader className="w-5 h-5 text-cyan-500 animate-spin" />
            <span className="text-slate-400 text-sm">Preparando tu espacio de trabajo</span>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { id: 'company', label: 'Empresa', icon: Building2 },
    { id: 'admin', label: 'Administrador', icon: User },
    { id: 'plan', label: 'Plan', icon: Briefcase }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full p-8 my-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Registra tu Empresa</h2>
          <p className="text-slate-400">Sistema SaaS Multi-Tenant - Completa el registro en 3 pasos</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((s, index) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isCompleted = index < currentStepIndex;

              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                      isActive
                        ? 'border-cyan-500 bg-cyan-500/20'
                        : isCompleted
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-slate-600 bg-slate-800'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        isActive ? 'text-cyan-400' : isCompleted ? 'text-green-400' : 'text-slate-500'
                      }`} />
                    </div>
                    <span className={`text-xs mt-2 font-medium ${
                      isActive ? 'text-cyan-400' : isCompleted ? 'text-green-400' : 'text-slate-500'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-2 -mt-6 ${
                      isCompleted ? 'bg-green-500' : 'bg-slate-700'
                    }`}></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-6">
          {step === 'company' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre de la Empresa *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={companyData.name}
                    onChange={(e) => generateSlug(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Ej: Veterinaria Central"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Identificador Único (URL) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={companyData.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-800 border ${
                      slugError ? 'border-red-500' : 'border-slate-700'
                    } rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${
                      slugError ? 'focus:ring-red-500' : 'focus:ring-cyan-500'
                    } focus:border-transparent`}
                    placeholder="vet-central"
                    pattern="[a-z0-9\-]+"
                  />
                </div>
                {companyData.slug && !slugError && (
                  <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400 flex items-center gap-2">
                    <Check className="w-3 h-3" />
                    <span>Tu URL será: <strong>{getTenantUrl(companyData.slug)}</strong></span>
                  </div>
                )}
                {slugError && (
                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" />
                    <span>{slugError}</span>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-1">Solo letras minúsculas, números y guiones (3-63 caracteres)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Industria / Sector *
                </label>
                <select
                  required
                  value={companyData.industry}
                  onChange={(e) => setCompanyData({ ...companyData, industry: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="">Selecciona una industria</option>
                  <option value="veterinary">Clínica Veterinaria</option>
                  <option value="pet-shop">Tienda de Mascotas</option>
                  <option value="grooming">Peluquería / Grooming</option>
                  <option value="hotel">Hotel para Mascotas</option>
                  <option value="daycare">Guardería</option>
                  <option value="rescue">Rescate Animal</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tamaño de la Empresa *
                </label>
                <select
                  required
                  value={companyData.size}
                  onChange={(e) => setCompanyData({ ...companyData, size: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="">Selecciona el tamaño</option>
                  <option value="1-5">1-5 empleados</option>
                  <option value="6-10">6-10 empleados</option>
                  <option value="11-25">11-25 empleados</option>
                  <option value="26-50">26-50 empleados</option>
                  <option value="51+">51+ empleados</option>
                </select>
              </div>
            </>
          )}

          {step === 'admin' && (
            <>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-cyan-300">
                  <strong>Administrador Principal:</strong> Esta persona tendrá acceso completo para gestionar usuarios, configuración y suscripciones.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre Completo *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={adminData.fullName}
                    onChange={(e) => setAdminData({ ...adminData, fullName: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Juan Pérez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Corporativo *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={adminData.email}
                    onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="admin@empresa.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Cargo / Posición *
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={adminData.position}
                    onChange={(e) => setAdminData({ ...adminData, position: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Director, Gerente, etc."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Contraseña *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={adminData.password}
                    onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                    className="w-full pl-11 pr-11 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="••••••••"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Mínimo 6 caracteres</p>
              </div>
            </>
          )}

          {step === 'plan' && (
            <>
              <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-cyan-400 mb-2">Selecciona tu Plan Inicial</h4>
                <p className="text-sm text-slate-300">Puedes cambiar o actualizar tu plan en cualquier momento desde la configuración.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[
                  {
                    value: 'basic',
                    name: 'Basic',
                    price: 'Gratis',
                    period: '30 días',
                    features: ['5 usuarios', '100 mascotas', 'Soporte por email', 'Funcionalidades básicas']
                  },
                  {
                    value: 'professional',
                    name: 'Professional',
                    price: '$49',
                    period: '/mes',
                    features: ['50 usuarios', '1000 mascotas', 'Soporte prioritario', 'Todas las funcionalidades', 'Integraciones API']
                  },
                  {
                    value: 'enterprise',
                    name: 'Enterprise',
                    price: 'Personalizado',
                    period: '',
                    features: ['Usuarios ilimitados', 'Mascotas ilimitadas', 'Soporte 24/7', 'Funcionalidades premium', 'SLA garantizado']
                  }
                ].map((plan) => (
                  <button
                    key={plan.value}
                    type="button"
                    onClick={() => setPlanData({ plan: plan.value as any })}
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      planData.plan === plan.value
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-white">{plan.price}</span>
                          <span className="text-slate-400 text-sm">{plan.period}</span>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        planData.plan === plan.value
                          ? 'border-cyan-500 bg-cyan-500'
                          : 'border-slate-600'
                      }`}>
                        {planData.plan === plan.value && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-slate-300">
                          <Check className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>

              <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                <h4 className="text-sm font-semibold text-white mb-2">Resumen del Registro</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Empresa:</span>
                    <span className="text-white font-medium">{companyData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Administrador:</span>
                    <span className="text-white font-medium">{adminData.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Plan:</span>
                    <span className="text-white font-medium">{planData.plan === 'basic' ? 'Basic' : planData.plan === 'professional' ? 'Professional' : 'Enterprise'}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-4 pt-4">
            {step !== 'company' && (
              <button
                type="button"
                onClick={handleBackStep}
                disabled={loading}
                className="flex-1 py-3.5 border-2 border-slate-700 text-white rounded-lg font-semibold hover:border-slate-600 hover:bg-slate-800/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  {step === 'plan' ? 'Creando organización...' : 'Validando...'}
                </>
              ) : (
                step === 'plan' ? 'Completar Registro' : 'Siguiente'
              )}
            </button>
          </div>
        </form>

        <p className="text-xs text-slate-500 text-center mt-6">
          Al registrarte, aceptas nuestros <a href="#" className="text-cyan-400 hover:underline">términos de servicio</a> y <a href="#" className="text-cyan-400 hover:underline">política de privacidad</a>
        </p>
      </div>
    </div>
  );
}
