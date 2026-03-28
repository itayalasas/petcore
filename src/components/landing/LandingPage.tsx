import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  CreditCard,
  Heart,
  Package,
  PawPrint,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';

interface LandingPageProps {
  onRegisterCompany: () => void;
  onLogin: () => void;
}

const features = [
  {
    icon: PawPrint,
    title: 'Gestión integral de mascotas',
    description: 'Centraliza fichas clínicas, vacunas, antecedentes y seguimiento para cada paciente.',
  },
  {
    icon: Users,
    title: 'Operación multi-sede',
    description: 'Administra equipos, sedes y organizaciones desde una sola plataforma segura.',
  },
  {
    icon: Heart,
    title: 'Atención veterinaria',
    description: 'Organiza consultas, tratamientos y controles con una experiencia clara para tu equipo.',
  },
  {
    icon: Calendar,
    title: 'Agenda inteligente',
    description: 'Coordina citas, recordatorios y disponibilidad para mantener la agenda siempre ordenada.',
  },
  {
    icon: BarChart3,
    title: 'Indicadores del negocio',
    description: 'Visualiza ingresos, ocupación, servicios y desempeño con tableros accionables.',
  },
  {
    icon: Shield,
    title: 'Seguridad y trazabilidad',
    description: 'Protege los datos clínicos y operativos con permisos, aislamiento y control de accesos.',
  },
  {
    icon: Package,
    title: 'Inventario conectado',
    description: 'Controla productos, compras y stock sin salir del flujo operativo diario.',
  },
  {
    icon: CreditCard,
    title: 'Cobros y suscripciones',
    description: 'Gestiona pagos, facturación y planes con una experiencia administrativa más simple.',
  },
];

const plans = [
  {
    name: 'Basic',
    price: 'Gratis',
    period: '30 días de prueba',
    description: 'Para comenzar a ordenar la operación diaria.',
    features: ['5 usuarios', '100 mascotas', 'Agenda y ficha clínica', 'Soporte por email'],
    cta: 'Comenzar prueba',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$49',
    period: '/mes',
    description: 'Ideal para clínicas y pet shops en crecimiento.',
    features: ['50 usuarios', '1000 mascotas', 'Reportes avanzados', 'API e integraciones', 'Soporte prioritario'],
    cta: 'Comenzar ahora',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Personalizado',
    period: 'Contactar ventas',
    description: 'Pensado para operación multi-sede y expansión.',
    features: ['Usuarios ilimitados', 'Mascotas ilimitadas', 'Soporte 24/7', 'Consultoría dedicada'],
    cta: 'Contactar',
    highlighted: false,
  },
];

const highlights = [
  '30 días gratis',
  'Sin tarjeta de crédito',
  'Onboarding guiado',
];

const heroMetrics = [
  { label: 'Pacientes activos', value: '+12.4k' },
  { label: 'Citas coordinadas', value: '98%' },
  { label: 'Satisfacción operativa', value: '4.9/5' },
];

export default function LandingPage({ onRegisterCompany, onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#f4f8f6] text-slate-900">
      <div className="absolute inset-x-0 top-0 -z-10 h-[540px] bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18),_transparent_45%),radial-gradient(circle_at_top_right,_rgba(250,204,21,0.12),_transparent_35%),linear-gradient(180deg,_#f8fffd_0%,_#f4f8f6_70%)]" />

      <nav className="sticky top-0 z-20 border-b border-emerald-100/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 shadow-lg shadow-emerald-500/20">
              <PawPrint className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900">PetCare Core</p>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-700/70">By Ayala IT</p>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <span>Solución veterinaria</span>
            <span>Operación multi-tenant</span>
            <span>Gestión comercial</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onLogin}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
            >
              Iniciar sesión
            </button>
            <button
              onClick={onRegisterCompany}
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Registrar empresa
            </button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 py-16 md:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm shadow-emerald-100/60">
              <Sparkles className="h-4 w-4" />
              Diseño y operación pensados para clínicas, veterinarias y pet shops
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-black tracking-tight text-slate-950 md:text-6xl lg:text-7xl">
                Una plataforma seria para
                <span className="block bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 bg-clip-text text-transparent">
                  cuidar mejor a cada mascota
                </span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
                Controla agenda, historia clínica, clientes, inventario, cobros y reportes desde una experiencia visual más clara,
                profesional y alineada con un negocio de cuidado animal.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                onClick={onRegisterCompany}
                className="group inline-flex items-center justify-start gap-3 rounded-2xl bg-slate-950 px-8 py-4 text-left text-lg font-semibold text-white shadow-2xl shadow-emerald-900/10 transition-all hover:-translate-y-1 hover:bg-slate-800"
              >
                <span>Comienza ahora</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
              <button className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-4 text-lg font-semibold text-slate-700 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700">
                Ver demo
              </button>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 top-10 h-32 w-32 rounded-full bg-emerald-200/50 blur-3xl" />
            <div className="absolute -right-6 bottom-4 h-40 w-40 rounded-full bg-cyan-200/50 blur-3xl" />

            <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.25)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700/70">Vista operativa</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">Control diario de la clínica</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Información clave accesible para recepción, consulta, grooming, guardería y administración.
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Hoy</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">27</p>
                  <p className="text-xs text-slate-500">citas agendadas</p>
                </div>
              </div>

              <div className="grid gap-4 py-6 sm:grid-cols-3">
                {heroMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{metric.label}</p>
                    <p className="mt-3 text-2xl font-bold text-slate-950">{metric.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-3xl bg-slate-950 p-5 text-white">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <p className="text-sm font-semibold text-white/70">Paciente destacado</p>
                      <h3 className="mt-1 text-xl font-bold">Luna · Vacunación anual</h3>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-200">En curso</div>
                  </div>
                  <div className="mt-4 space-y-4 text-sm text-slate-300">
                    <div className="flex items-center justify-between">
                      <span>Responsable</span>
                      <span className="font-semibold text-white">Dra. González</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Propietario</span>
                      <span className="font-semibold text-white">María García</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Próximo control</span>
                      <span className="font-semibold text-white">12 de junio</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5">
                  <p className="text-sm font-semibold text-emerald-800">Lo que mejora tu equipo</p>
                  <div className="space-y-3 text-sm text-slate-700">
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">Recepción más rápida y ordenada</div>
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">Visibilidad de consultas y servicios</div>
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">Cobros, stock y reportes conectados</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Capacidades clave</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
              Diseño claro para una operación compleja
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Cada módulo fue presentado para transmitir confianza, orden y foco en bienestar animal sin tocar la lógica existente.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="group rounded-[28px] border border-white/80 bg-white p-7 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-100"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-cyan-100 text-emerald-700 transition-transform duration-300 group-hover:scale-105">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-slate-950">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 rounded-[36px] border border-slate-200 bg-slate-950 p-8 text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)] lg:grid-cols-[0.8fr_1.2fr] lg:p-12">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300">Propuesta visual</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight">Un lenguaje de marca más profesional para el mundo pet</h2>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                Mezcla tonos clínicos, acentos cálidos y una jerarquía visual más limpia para transmitir cuidado, confianza y control.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { title: 'Cuidado', text: 'Verdes suaves y superficies limpias para comunicar bienestar.' },
                { title: 'Confianza', text: 'Tarjetas, bordes y contrastes que mejoran lectura y credibilidad.' },
                { title: 'Escala', text: 'Componentes más sólidos para crecer desde clínica a operación multi-sede.' },
              ].map((item) => (
                <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <p className="text-lg font-bold text-white">{item.title}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Planes</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">Una base sólida para cada etapa</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">Empieza simple y escala sin cambiar de plataforma.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-[30px] border p-8 transition-all ${
                  plan.highlighted
                    ? 'border-slate-950 bg-slate-950 text-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.9)]'
                    : 'border-white/80 bg-white text-slate-900 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.25)]'
                }`}
              >
                {plan.highlighted && (
                  <div className="mb-6 inline-flex rounded-full bg-emerald-400 px-4 py-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-950">
                    Más elegido
                  </div>
                )}
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <p className={`mt-3 text-sm leading-7 ${plan.highlighted ? 'text-slate-300' : 'text-slate-600'}`}>
                  {plan.description}
                </p>
                <div className="mt-6 flex items-end gap-2">
                  <span className="text-5xl font-black">{plan.price}</span>
                  <span className={`pb-1 text-sm ${plan.highlighted ? 'text-slate-400' : 'text-slate-500'}`}>{plan.period}</span>
                </div>
                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-7">
                      <CheckCircle2 className={`mt-1 h-4 w-4 flex-shrink-0 ${plan.highlighted ? 'text-emerald-300' : 'text-emerald-600'}`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onRegisterCompany}
                  className={`mt-8 inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? 'bg-white text-slate-950 hover:bg-emerald-50'
                      : 'bg-slate-950 text-white hover:bg-slate-800'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-[36px] border border-emerald-100 bg-gradient-to-r from-emerald-100 via-white to-cyan-100 p-10 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.35)] md:p-14">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Listo para comenzar</p>
                <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                  Lleva tu operación pet a una experiencia más ordenada y profesional
                </h2>
                <p className="mt-4 text-lg leading-8 text-slate-600">
                  Mantuvimos la lógica actual y elevamos la presentación para que el producto se sienta más confiable desde el primer vistazo.
                </p>
              </div>
              <button
                onClick={onRegisterCompany}
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-950 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-slate-900/10 transition-all hover:-translate-y-1 hover:bg-slate-800"
              >
                Crear cuenta gratis
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
