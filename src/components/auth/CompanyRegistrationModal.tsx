import { useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  Building2,
  Check,
  Eye,
  EyeOff,
  Loader,
  Lock,
  Mail,
  PawPrint,
  User,
  X,
} from 'lucide-react';
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

const plans = [
  {
    value: 'basic',
    name: 'Basic',
    price: 'Gratis',
    period: '30 días',
    features: ['5 usuarios', '100 mascotas', 'Soporte por email', 'Funcionalidades básicas'],
  },
  {
    value: 'professional',
    name: 'Professional',
    price: '$49',
    period: '/mes',
    features: ['50 usuarios', '1000 mascotas', 'Soporte prioritario', 'Todas las funcionalidades', 'Integraciones API'],
  },
  {
    value: 'enterprise',
    name: 'Enterprise',
    price: 'Personalizado',
    period: '',
    features: ['Usuarios ilimitados', 'Mascotas ilimitadas', 'Soporte 24/7', 'Funcionalidades premium', 'SLA garantizado'],
  },
] as const;

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
    size: '',
  });

  const [adminData, setAdminData] = useState<AdminData>({
    fullName: '',
    email: '',
    password: '',
    position: '',
  });

  const [planData, setPlanData] = useState<PlanData>({
    plan: 'basic',
  });

  const generateSlug = (name: string) => {
    const slug = name
      .toLowerCase()
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
    const sanitizedSlug = slug
      .toLowerCase()
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
        const { data: existingTenant } = await supabase.from('tenants').select('id').eq('slug', companyData.slug).maybeSingle();

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
            position: adminData.position,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Error al crear usuario');
      if (!authData.session) throw new Error('No se pudo establecer la sesión');

      await supabase.auth.setSession({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      });

      await new Promise((resolve) => setTimeout(resolve, 800));

      const { data: registrationResult, error: registrationError } = await supabase.rpc('register_company', {
        p_user_id: authData.user.id,
        p_company_name: companyData.name,
        p_company_slug: companyData.slug,
        p_subscription_plan: planData.plan,
        p_user_email: adminData.email,
        p_user_display_name: adminData.fullName,
        p_industry: companyData.industry,
        p_company_size: companyData.size,
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md">
        <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-white/60 bg-white p-8 text-center shadow-[0_32px_90px_-40px_rgba(15,23,42,0.6)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
            <Check className="h-10 w-10 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-950">Organización creada</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Tu empresa <strong className="text-slate-900">{companyData.name}</strong> ha sido registrada exitosamente.
            Redirigiendo al panel de configuración...
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
            <Loader className="h-4 w-4 animate-spin" />
            Preparando tu espacio de trabajo
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { id: 'company', label: 'Empresa', icon: Building2 },
    { id: 'admin', label: 'Administrador', icon: User },
    { id: 'plan', label: 'Plan', icon: Briefcase },
  ];

  const currentStepIndex = steps.findIndex((item) => item.id === step);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-md">
      <div className="mx-auto my-8 w-full max-w-2xl overflow-hidden rounded-[36px] border border-white/60 bg-white shadow-[0_32px_90px_-40px_rgba(15,23,42,0.6)]">
        <div className="relative border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 px-8 pb-8 pt-10">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full border border-slate-200 bg-white/90 p-2 text-slate-500 transition-colors hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 shadow-lg shadow-emerald-500/20">
              <PawPrint className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950">Registra tu empresa</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Onboarding profesional en 3 pasos para tu operación pet.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {steps.map((item, index) => {
              const Icon = item.icon;
              const isActive = item.id === step;
              const isCompleted = index < currentStepIndex;

              return (
                <div
                  key={item.id}
                  className={`rounded-3xl border px-4 py-4 ${
                    isActive
                      ? 'border-emerald-200 bg-white shadow-sm'
                      : isCompleted
                        ? 'border-emerald-100 bg-emerald-50'
                        : 'border-slate-200 bg-white/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : isCompleted
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Paso {index + 1}</p>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm font-medium text-rose-700">{error}</p>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleNextStep();
            }}
            className="space-y-6"
          >
            {step === 'company' && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Nombre de la empresa *</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={companyData.name}
                      onChange={(e) => generateSlug(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="Ej: Veterinaria Central"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Identificador único (URL) *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={companyData.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      className={`w-full rounded-2xl border bg-slate-50 px-4 py-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                        slugError
                          ? 'border-rose-300 focus:border-rose-300 focus:ring-rose-200'
                          : 'border-slate-200 focus:border-emerald-300 focus:ring-emerald-200'
                      }`}
                      placeholder="vet-central"
                      pattern="[a-z0-9\-]+"
                    />
                  </div>
                  {companyData.slug && !slugError && (
                    <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      <Check className="h-4 w-4" />
                      <span>
                        Tu URL será: <strong>{getTenantUrl(companyData.slug)}</strong>
                      </span>
                    </div>
                  )}
                  {slugError && (
                    <div className="mt-3 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      <AlertCircle className="h-4 w-4" />
                      <span>{slugError}</span>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-500">Solo letras minúsculas, números y guiones (3-63 caracteres)</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Industria / sector *</label>
                  <select
                    required
                    value={companyData.industry}
                    onChange={(e) => setCompanyData({ ...companyData, industry: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Tamaño de la empresa *</label>
                  <select
                    required
                    value={companyData.size}
                    onChange={(e) => setCompanyData({ ...companyData, size: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
                <div className="rounded-3xl border border-cyan-200 bg-cyan-50 px-5 py-4">
                  <p className="text-sm leading-6 text-cyan-800">
                    <strong>Administrador principal:</strong> esta persona tendrá acceso completo para gestionar usuarios, configuración y suscripciones.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Nombre completo *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={adminData.fullName}
                      onChange={(e) => setAdminData({ ...adminData, fullName: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="Juan Pérez"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Email corporativo *</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={adminData.email}
                      onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="admin@empresa.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Cargo / posición *</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={adminData.position}
                      onChange={(e) => setAdminData({ ...adminData, position: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="Director, Gerente, etc."
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Contraseña *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={adminData.password}
                      onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="••••••••"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Mínimo 6 caracteres</p>
                </div>
              </>
            )}

            {step === 'plan' && (
              <>
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                  <h4 className="text-sm font-semibold text-emerald-800">Selecciona tu plan inicial</h4>
                  <p className="mt-1 text-sm leading-6 text-emerald-700">
                    Puedes cambiar o actualizar tu plan en cualquier momento desde la configuración.
                  </p>
                </div>

                <div className="grid gap-4">
                  {plans.map((plan) => (
                    <button
                      key={plan.value}
                      type="button"
                      onClick={() => setPlanData({ plan: plan.value as PlanData['plan'] })}
                      className={`rounded-[28px] border p-6 text-left transition-all ${
                        planData.plan === plan.value
                          ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-900/15'
                          : 'border-slate-200 bg-slate-50 hover:border-emerald-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-bold">{plan.name}</h3>
                          <div className="mt-2 flex items-end gap-2">
                            <span className="text-3xl font-black">{plan.price}</span>
                            <span className={`pb-1 text-sm ${planData.plan === plan.value ? 'text-slate-300' : 'text-slate-500'}`}>
                              {plan.period}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                            planData.plan === plan.value
                              ? 'border-white bg-white text-slate-950'
                              : 'border-slate-300 text-transparent'
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </div>
                      </div>
                      <ul className="mt-5 space-y-2">
                        {plan.features.map((feature) => (
                          <li
                            key={feature}
                            className={`flex items-center gap-2 text-sm ${planData.plan === plan.value ? 'text-slate-200' : 'text-slate-600'}`}
                          >
                            <Check className={`h-4 w-4 ${planData.plan === plan.value ? 'text-emerald-300' : 'text-emerald-600'}`} />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h4 className="text-sm font-semibold text-slate-900">Resumen del registro</h4>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Empresa:</span>
                      <span className="font-semibold text-slate-900">{companyData.name}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Administrador:</span>
                      <span className="font-semibold text-slate-900">{adminData.fullName}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Plan:</span>
                      <span className="font-semibold text-slate-900">
                        {planData.plan === 'basic' ? 'Basic' : planData.plan === 'professional' ? 'Professional' : 'Enterprise'}
                      </span>
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
                  className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    {step === 'plan' ? 'Creando organización...' : 'Validando...'}
                  </>
                ) : step === 'plan' ? (
                  'Completar registro'
                ) : (
                  'Siguiente'
                )}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs leading-6 text-slate-500">
            Al registrarte, aceptas nuestros{' '}
            <a href="#" className="font-semibold text-emerald-700 hover:underline">
              términos de servicio
            </a>{' '}
            y{' '}
            <a href="#" className="font-semibold text-emerald-700 hover:underline">
              política de privacidad
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
