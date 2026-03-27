import { Download, TrendingUp, DollarSign, Users, Calendar, BarChart3 } from 'lucide-react';

export default function Reportes() {
  const reports = [
    { name: 'Ventas por período', icon: DollarSign, color: 'green', description: 'Ingresos diarios, semanales y mensuales' },
    { name: 'Reservas y servicios', icon: Calendar, color: 'blue', description: 'Análisis de ocupación y servicios más solicitados' },
    { name: 'Salud y vacunación', icon: BarChart3, color: 'amber', description: 'Estadísticas de consultas y vacunas aplicadas' },
    { name: 'Comisiones y pagos', icon: DollarSign, color: 'primary', description: 'Liquidaciones y comisiones por aliado' },
    { name: 'Rendimiento por aliado', icon: TrendingUp, color: 'purple', description: 'Métricas de desempeño y calificaciones' },
    { name: 'Análisis de clientes', icon: Users, color: 'teal', description: 'Recurrencia, cohortes y retención' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Analytics, métricas y exportación de datos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <div
              key={report.name}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-${report.color}-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 text-${report.color}-600`} />
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Download className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{report.name}</h3>
              <p className="text-sm text-gray-500">{report.description}</p>
              <button className="mt-4 w-full py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                Ver reporte
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Dashboard de analytics</h3>
          <p className="text-gray-500 mb-6">
            Visualiza gráficas interactivas y métricas en tiempo real
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-gray-900">$127,450</p>
              <p className="text-sm text-gray-600 mt-1">Ingresos totales</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-gray-900">1,234</p>
              <p className="text-sm text-gray-600 mt-1">Transacciones</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-gray-900">456</p>
              <p className="text-sm text-gray-600 mt-1">Nuevos clientes</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-gray-900">4.8</p>
              <p className="text-sm text-gray-600 mt-1">Satisfacción</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
