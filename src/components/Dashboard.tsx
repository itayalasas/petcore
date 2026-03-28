import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { appointmentsService } from '../services/servicesAppointments';

const kpis = [
  {
    title: 'Ingresos del mes',
    value: '$127,450',
    change: '+12.5%',
    trend: 'up',
    icon: DollarSign,
    iconBgClass: 'bg-emerald-100',
    iconTextClass: 'text-emerald-700',
  },
  {
    title: 'Servicios activos',
    value: '48',
    change: '+8',
    trend: 'up',
    icon: Calendar,
    iconBgClass: 'bg-cyan-100',
    iconTextClass: 'text-cyan-700',
  },
  {
    title: 'Nuevos clientes',
    value: '156',
    change: '+23%',
    trend: 'up',
    icon: Users,
    iconBgClass: 'bg-violet-100',
    iconTextClass: 'text-violet-700',
  },
  {
    title: 'Órdenes pendientes',
    value: '12',
    change: '-3',
    trend: 'down',
    icon: ShoppingCart,
    iconBgClass: 'bg-amber-100',
    iconTextClass: 'text-amber-700',
  },
] as const;

const fallbackTodayAppointments = [
  { time: '09:00', pet: 'Max', service: 'Consulta general', owner: 'Juan Pérez', status: 'completed' },
  { time: '10:30', pet: 'Luna', service: 'Vacunación', owner: 'María García', status: 'in-progress' },
  { time: '11:00', pet: 'Rocky', service: 'Baño y peluquería', owner: 'Carlos Ruiz', status: 'pending' },
  { time: '14:00', pet: 'Bella', service: 'Control de peso', owner: 'Ana López', status: 'pending' },
  { time: '15:30', pet: 'Simba', service: 'Radiografía', owner: 'Pedro Sánchez', status: 'pending' },
];

const recentActivity = [
  { type: 'payment', message: 'Pago recibido de Juan Pérez', time: 'Hace 5 min', amount: '$450' },
  { type: 'booking', message: 'Nueva reserva: Luna - Vacunación', time: 'Hace 12 min' },
  { type: 'alert', message: 'Stock bajo: Vacuna antirrábica', time: 'Hace 23 min' },
  { type: 'order', message: 'Orden #1234 completada y entregada', time: 'Hace 1 hora' },
];

const alerts = [
  { type: 'warning', message: '3 mascotas requieren vacunación este mes', priority: 'medium' },
  { type: 'info', message: 'Reunión con aliados programada para mañana', priority: 'low' },
  { type: 'urgent', message: 'Pago pendiente de liquidación con Dr. Martínez', priority: 'high' },
];

const appointmentStatusClasses = {
  completed: 'bg-emerald-100 text-emerald-700',
  'in-progress': 'bg-cyan-100 text-cyan-700',
  pending: 'bg-slate-200 text-slate-700',
} as const;

const alertClasses = {
  high: 'border-red-100 bg-red-50 text-red-700',
  medium: 'border-amber-100 bg-amber-50 text-amber-700',
  low: 'border-cyan-100 bg-cyan-50 text-cyan-700',
} as const;

export default function Dashboard() {
  const { currentTenant } = useTenant();
  const [todayAppointments, setTodayAppointments] = useState(fallbackTodayAppointments);

  useEffect(() => {
    const loadTodayAppointments = async () => {
      if (!currentTenant) {
        setTodayAppointments(fallbackTodayAppointments);
        return;
      }

      try {
        const allAppointments = await appointmentsService.getAll(currentTenant.id);
        const now = new Date();
        const liveTodayAppointments = allAppointments
          .filter((appointment) => {
            const appointmentDate = new Date(appointment.scheduled_at);
            return (
              appointmentDate.getFullYear() === now.getFullYear() &&
              appointmentDate.getMonth() === now.getMonth() &&
              appointmentDate.getDate() === now.getDate()
            );
          })
          .sort((left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime())
          .slice(0, 5)
          .map((appointment) => {
            const time = new Date(appointment.scheduled_at).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            });

            return {
              time,
              pet: appointment.pet?.name || 'Sin mascota',
              service: appointment.service?.name || appointment.reason || 'Cita',
              owner: appointment.owner ? `${appointment.owner.first_name} ${appointment.owner.last_name}` : 'Sin propietario',
              status: appointment.status === 'in_progress' ? 'in-progress' : appointment.status === 'completed' ? 'completed' : 'pending'
            };
          });

        setTodayAppointments(liveTodayAppointments.length > 0 ? liveTodayAppointments : []);
      } catch (error) {
        console.error('Error loading dashboard appointments:', error);
        setTodayAppointments(fallbackTodayAppointments);
      }
    };

    void loadTodayAppointments();

    const handleAppointmentsChanged = () => {
      void loadTodayAppointments();
    };

    window.addEventListener('appointments:changed', handleAppointmentsChanged);
    return () => window.removeEventListener('appointments:changed', handleAppointmentsChanged);
  }, [currentTenant]);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-8 text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)]">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300">Panel principal</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight">Vista operativa de tu ecosistema pet</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
              Un resumen claro de agenda, ingresos, alertas y actividad para tomar decisiones rápidas sin cambiar tu flujo actual.
            </p>
          </div>
          <div className="grid gap-4 rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              { label: 'Pacientes hoy', value: '27' },
              { label: 'Check-ins', value: '18' },
              { label: 'Servicios cerrados', value: '11' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{item.label}</p>
                <p className="mt-3 text-3xl font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const isPositive = kpi.trend === 'up';

          return (
            <article
              key={kpi.title}
              className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.3)] transition-all hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{kpi.title}</p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{kpi.value}</p>
                  <div className="mt-3 flex items-center gap-2">
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {kpi.change}
                    </span>
                    <span className="text-xs text-slate-500">vs mes anterior</span>
                  </div>
                </div>
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${kpi.iconBgClass}`}>
                  <Icon className={`h-7 w-7 ${kpi.iconTextClass}`} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.25)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Agenda de hoy</h2>
              <p className="mt-1 text-sm text-slate-500">Seguimiento rápido de consultas y servicios programados.</p>
            </div>
            <button className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-800">
              Ver todas
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3 p-6">
            {todayAppointments.length > 0 ? todayAppointments.map((appointment) => (
              <div
                key={`${appointment.time}-${appointment.pet}`}
                className="flex flex-col gap-4 rounded-[24px] border border-slate-100 bg-slate-50/80 p-4 transition-colors hover:bg-emerald-50/60 md:flex-row md:items-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-center shadow-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Hora</p>
                    <p className="text-sm font-bold text-slate-950">{appointment.time}</p>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-slate-950">{appointment.pet}</p>
                  <p className="mt-1 text-sm text-slate-600">{appointment.service}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{appointment.owner}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 self-start rounded-full px-3 py-1 text-xs font-semibold ${appointmentStatusClasses[appointment.status]}`}
                >
                  {appointment.status === 'completed' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  {appointment.status === 'completed'
                    ? 'Completado'
                    : appointment.status === 'in-progress'
                      ? 'En curso'
                      : 'Pendiente'}
                </span>
              </div>
            )) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No hay citas para hoy.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-white/80 bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.25)]">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-xl font-bold text-slate-950">Alertas</h2>
              <p className="mt-1 text-sm text-slate-500">Puntos que requieren atención del equipo.</p>
            </div>
            <div className="space-y-3 p-6">
              {alerts.map((alert, idx) => (
                <div key={idx} className={`flex gap-3 rounded-2xl border p-4 ${alertClasses[alert.priority]}`}>
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <p className="text-sm font-medium leading-6">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/80 bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.25)]">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-xl font-bold text-slate-950">Actividad reciente</h2>
              <p className="mt-1 text-sm text-slate-500">Movimientos operativos de los últimos minutos.</p>
            </div>
            <div className="space-y-5 p-6">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-6 text-slate-900">{activity.message}</p>
                    {activity.amount && <p className="mt-1 text-sm font-semibold text-emerald-600">{activity.amount}</p>}
                    <p className="mt-1 text-xs text-slate-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
