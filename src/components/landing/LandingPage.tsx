import { ArrowRight, PawPrint, Users, Heart, Calendar, BarChart3, Shield, Zap, TrendingUp, Package, Mail, CreditCard } from 'lucide-react';

interface LandingPageProps {
  onRegisterCompany: () => void;
  onLogin: () => void;
}

export default function LandingPage({ onRegisterCompany, onLogin }: LandingPageProps) {
  const features = [
    {
      icon: PawPrint,
      title: 'Gestión de Mascotas',
      description: 'Administra perfiles completos de mascotas con historial médico, vacunas y seguimiento personalizado'
    },
    {
      icon: Users,
      title: 'Multi-Tenant',
      description: 'Plataforma SaaS diseñada para múltiples organizaciones con aislamiento total de datos y seguridad'
    },
    {
      icon: Heart,
      title: 'Salud Veterinaria',
      description: 'Registro detallado de consultas, tratamientos, diagnósticos y seguimiento médico completo'
    },
    {
      icon: Calendar,
      title: 'Reservas y Citas',
      description: 'Sistema de agendamiento con recordatorios automáticos y gestión de disponibilidad'
    },
    {
      icon: BarChart3,
      title: 'Reportes Avanzados',
      description: 'Visualiza métricas detalladas con dashboards interactivos y reportes completos de rendimiento'
    },
    {
      icon: Shield,
      title: 'Seguridad Premium',
      description: 'Row Level Security (RLS) con encriptación, backups automáticos y cumplimiento de normativas'
    },
    {
      icon: Package,
      title: 'Comercio Integrado',
      description: 'Gestión de productos, órdenes de compra y seguimiento de inventario en tiempo real'
    },
    {
      icon: TrendingUp,
      title: 'Analytics en Tiempo Real',
      description: 'Métricas instantáneas de tu negocio con dashboards personalizables y KPIs importantes'
    },
    {
      icon: CreditCard,
      title: 'Pagos y Facturación',
      description: 'Procesamiento de pagos integrado con generación automática de facturas y recibos'
    }
  ];

  const plans = [
    {
      name: 'Basic',
      price: 'Gratis',
      period: '30 días de prueba',
      features: [
        '5 usuarios',
        '100 mascotas',
        'Funcionalidades básicas',
        'Soporte por email',
        'Reportes básicos'
      ],
      cta: 'Comenzar prueba',
      highlighted: false
    },
    {
      name: 'Professional',
      price: '$49',
      period: '/mes',
      features: [
        '50 usuarios',
        '1000 mascotas',
        'Todas las funcionalidades',
        'Soporte prioritario',
        'Reportes avanzados',
        'Integraciones API',
        'Personalización de marca'
      ],
      cta: 'Comenzar ahora',
      highlighted: true
    },
    {
      name: 'Enterprise',
      price: 'Personalizado',
      period: 'Contactar ventas',
      features: [
        'Usuarios ilimitados',
        'Mascotas ilimitadas',
        'Funcionalidades premium',
        'Soporte 24/7',
        'Analytics avanzado',
        'Consultoría dedicada',
        'SLA garantizado',
        'Dominio personalizado'
      ],
      cta: 'Contactar',
      highlighted: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <PawPrint className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">PetCare</span>
              <span className="text-xs text-slate-400 ml-2">BY AYALA IT</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onLogin}
                className="px-6 py-2.5 text-white hover:text-cyan-400 transition-colors font-medium"
              >
                Iniciar sesión
              </button>
              <button
                onClick={onRegisterCompany}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20"
              >
                Registrar empresa
              </button>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="text-center space-y-8">
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
              Gestiona tu clínica veterinaria
              <br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                de forma profesional
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Plataforma completa multi-tenant para gestionar mascotas, citas veterinarias,
              historial médico y toda tu operación desde un solo lugar
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                onClick={onRegisterCompany}
                className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105"
              >
                Comienza ahora
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 border-2 border-slate-700 text-white text-lg rounded-xl font-semibold hover:border-slate-600 hover:bg-slate-800/50 transition-all">
                Ver demo
              </button>
            </div>
            <div className="flex items-center justify-center gap-8 text-sm text-slate-400 pt-8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>30 días gratis</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Sin tarjeta de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Soporte incluido</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Todo lo que necesitas en un solo lugar
            </h2>
            <p className="text-xl text-slate-400">
              Funcionalidades diseñadas para optimizar tu operación veterinaria
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-8 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/20">
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Planes para cada necesidad
            </h2>
            <p className="text-xl text-slate-400">
              Comienza gratis y escala conforme creces
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-2xl shadow-cyan-500/30 scale-105'
                    : 'bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-slate-900 px-4 py-1 rounded-full text-sm font-bold">
                    Más popular
                  </div>
                )}
                <div className="text-center mb-8">
                  <h3 className={`text-2xl font-bold mb-2 ${plan.highlighted ? 'text-white' : 'text-white'}`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`text-5xl font-bold ${plan.highlighted ? 'text-white' : 'text-white'}`}>
                      {plan.price}
                    </span>
                    <span className={`text-lg ${plan.highlighted ? 'text-white/80' : 'text-slate-400'}`}>
                      {plan.period}
                    </span>
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        plan.highlighted ? 'bg-white/20' : 'bg-cyan-500/20'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          plan.highlighted ? 'bg-white' : 'bg-cyan-500'
                        }`}></div>
                      </div>
                      <span className={plan.highlighted ? 'text-white' : 'text-slate-300'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onRegisterCompany}
                  className={`w-full py-4 rounded-xl font-semibold transition-all ${
                    plan.highlighted
                      ? 'bg-white text-blue-600 hover:bg-slate-100 shadow-lg'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 shadow-lg shadow-cyan-500/20'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-cyan-500 to-blue-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Comienza tu prueba gratuita hoy
          </h2>
          <p className="text-xl text-white/90 mb-8">
            30 días de acceso completo sin necesidad de tarjeta de crédito
          </p>
          <button
            onClick={onRegisterCompany}
            className="group inline-flex items-center gap-3 px-10 py-5 bg-white text-blue-600 text-lg rounded-xl font-bold hover:bg-slate-100 transition-all shadow-2xl hover:scale-105"
          >
            Crear cuenta gratis
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <PawPrint className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">PetCare</span>
            </div>
            <p className="text-slate-500 text-sm">
              © 2024 PetCare. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
