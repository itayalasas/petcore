import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  ShoppingCart,
  AlertCircle,
  Clock,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

const kpis = [
  {
    title: 'Ingresos del mes',
    value: '$127,450',
    change: '+12.5%',
    trend: 'up',
    icon: DollarSign,
    color: 'primary'
  },
  {
    title: 'Servicios activos',
    value: '48',
    change: '+8',
    trend: 'up',
    icon: Calendar,
    color: 'secondary'
  },
  {
    title: 'Nuevos clientes',
    value: '156',
    change: '+23%',
    trend: 'up',
    icon: Users,
    color: 'green'
  },
  {
    title: 'Órdenes pendientes',
    value: '12',
    change: '-3',
    trend: 'down',
    icon: ShoppingCart,
    color: 'amber'
  }
];

const todayAppointments = [
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

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Panel de control</h1>
        <p className="text-sm text-gray-500 mt-1">Bienvenido de nuevo, administrador</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const isPositive = kpi.trend === 'up';

          return (
            <div key={kpi.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 font-medium">{kpi.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {kpi.change}
                    </span>
                    <span className="text-xs text-gray-500">vs mes anterior</span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${kpi.color}-100`}>
                  <Icon className={`w-6 h-6 text-${kpi.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Agenda de hoy</h2>
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                Ver todas
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {todayAppointments.map((appointment, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="text-sm font-semibold text-gray-900">{appointment.time}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{appointment.pet}</p>
                    <p className="text-sm text-gray-500">{appointment.service}</p>
                    <p className="text-xs text-gray-400">{appointment.owner}</p>
                  </div>
                  <div>
                    {appointment.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle2 className="w-3 h-3" />
                        Completado
                      </span>
                    )}
                    {appointment.status === 'in-progress' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        <Clock className="w-3 h-3" />
                        En curso
                      </span>
                    )}
                    {appointment.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        <Clock className="w-3 h-3" />
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Alertas</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 p-3 rounded-lg ${
                      alert.priority === 'high'
                        ? 'bg-red-50 border border-red-100'
                        : alert.priority === 'medium'
                        ? 'bg-amber-50 border border-amber-100'
                        : 'bg-blue-50 border border-blue-100'
                    }`}
                  >
                    <AlertCircle
                      className={`w-5 h-5 flex-shrink-0 ${
                        alert.priority === 'high'
                          ? 'text-red-600'
                          : alert.priority === 'medium'
                          ? 'text-amber-600'
                          : 'text-blue-600'
                      }`}
                    />
                    <p className="text-sm text-gray-900">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Actividad reciente</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary-600 mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      {activity.amount && (
                        <p className="text-sm font-semibold text-green-600">{activity.amount}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
