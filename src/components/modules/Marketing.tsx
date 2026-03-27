import { Plus, Megaphone, Mail, MessageSquare, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';
import Table from '../ui/Table';
import Filters from '../ui/Filters';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { FormField, Input, Textarea } from '../ui/FormField';
import Autocomplete from '../ui/Autocomplete';

const mockCampaigns = [
  {
    id: 1,
    name: 'Promo Vacunación Marzo',
    type: 'Email',
    status: 'Activa',
    sent: 1234,
    opened: 856,
    clicked: 324,
    conversions: 45,
    date: '2024-03-15',
  },
  {
    id: 2,
    name: 'Descuento Baño y Peluquería',
    type: 'WhatsApp',
    status: 'Programada',
    sent: 0,
    opened: 0,
    clicked: 0,
    conversions: 0,
    date: '2024-03-30',
  },
  {
    id: 3,
    name: 'Recordatorio Consulta',
    type: 'SMS',
    status: 'Completada',
    sent: 567,
    opened: 523,
    clicked: 189,
    conversions: 67,
    date: '2024-03-10',
  },
];

export default function Marketing() {
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);

  const channelOptions = [
    { value: 'email', label: 'Email', subtitle: 'Correo electrónico' },
    { value: 'whatsapp', label: 'WhatsApp', subtitle: 'Mensajería instantánea' },
    { value: 'sms', label: 'SMS', subtitle: 'Mensaje de texto' },
    { value: 'push', label: 'Notificación Push', subtitle: 'Notificación móvil' },
  ];

  const audienceOptions = [
    { value: 'all', label: 'Todos los clientes' },
    { value: 'vip', label: 'Clientes VIP' },
    { value: 'new', label: 'Clientes nuevos' },
    { value: 'inactive', label: 'Clientes inactivos' },
    { value: 'custom', label: 'Segmento personalizado' },
  ];

  const columns = [
    {
      key: 'name',
      label: 'Campaña',
      sortable: true,
      render: (value: string, row: any) => (
        <div>
          <p className="font-medium text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{row.type} • {row.date}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (value: string) => {
        const variants: any = {
          'Activa': 'success',
          'Programada': 'info',
          'Completada': 'default',
          'Pausada': 'warning',
        };
        return <Badge variant={variants[value] || 'default'}>{value}</Badge>;
      },
    },
    {
      key: 'sent',
      label: 'Enviados',
      sortable: true,
      render: (value: number) => (
        <span className="text-gray-900">{value.toLocaleString()}</span>
      ),
    },
    {
      key: 'opened',
      label: 'Apertura',
      render: (value: number, row: any) => {
        const rate = row.sent > 0 ? ((value / row.sent) * 100).toFixed(1) : '0';
        return (
          <div>
            <p className="text-gray-900">{value.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{rate}%</p>
          </div>
        );
      },
    },
    {
      key: 'conversions',
      label: 'Conversiones',
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <span className="font-semibold text-gray-900">{value}</span>
        </div>
      ),
    },
  ];

  const filters = [
    {
      key: 'type',
      label: 'Canal',
      type: 'select' as const,
      options: [
        { value: 'email', label: 'Email' },
        { value: 'whatsapp', label: 'WhatsApp' },
        { value: 'sms', label: 'SMS' },
        { value: 'push', label: 'Push' },
      ],
    },
    {
      key: 'status',
      label: 'Estado',
      type: 'select' as const,
      options: [
        { value: 'active', label: 'Activa' },
        { value: 'scheduled', label: 'Programada' },
        { value: 'completed', label: 'Completada' },
        { value: 'paused', label: 'Pausada' },
      ],
    },
    { key: 'date', label: 'Fecha', type: 'date' as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Marketing y CRM</h1>
          <p className="text-sm text-gray-500 mt-1">
            Campañas, automatizaciones y notificaciones
          </p>
        </div>
        <button
          onClick={() => setShowNewCampaignModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Nueva campaña
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Campañas activas</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">12,456</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Emails enviados</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">45.8%</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Tasa de apertura</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">234</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Conversiones</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <Filters
          filters={filters}
          searchPlaceholder="Buscar campaña..."
        />
      </div>

      <Table columns={columns} data={mockCampaigns} actions={() => null} />

      <Modal
        isOpen={showNewCampaignModal}
        onClose={() => setShowNewCampaignModal(false)}
        title="Nueva campaña de marketing"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowNewCampaignModal(false)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Cancelar
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
              Guardar borrador
            </button>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
              Crear y enviar
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <FormField label="Nombre de la campaña" required>
              <Input placeholder="Ej: Promo Vacunación Marzo" />
            </FormField>

            <FormField label="Canal de comunicación" required>
              <Autocomplete
                options={channelOptions}
                placeholder="Seleccionar canal..."
              />
            </FormField>

            <FormField label="Audiencia objetivo" required>
              <Autocomplete
                options={audienceOptions}
                placeholder="Seleccionar audiencia..."
              />
            </FormField>

            <FormField label="Fecha de envío">
              <Input type="datetime-local" />
            </FormField>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Contenido del mensaje</h3>
            <div className="space-y-4">
              <FormField label="Asunto / Título" required>
                <Input placeholder="Título del mensaje" />
              </FormField>

              <FormField label="Mensaje" required>
                <Textarea
                  placeholder="Escribe el contenido del mensaje..."
                  className="h-32"
                />
              </FormField>

              <FormField label="Llamada a la acción (CTA)">
                <Input placeholder="Ej: Reserva ahora, Más información, Comprar" />
              </FormField>

              <FormField label="URL de destino">
                <Input type="url" placeholder="https://ejemplo.com" />
              </FormField>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Configuración avanzada</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-700">Enviar prueba antes del envío masivo</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-700">Programar envío para fecha específica</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-700">Incluir cupón de descuento</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-700">Habilitar tracking de apertura y clicks</span>
              </label>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Alcance estimado:</strong> Esta campaña se enviará aproximadamente a <strong>1,234 contactos</strong>
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
