import { Plus, Handshake, MapPin, Star, DollarSign } from 'lucide-react';
import { useState } from 'react';
import Table from '../ui/Table';
import Filters from '../ui/Filters';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { FormField, Input, Textarea } from '../ui/FormField';
import Autocomplete from '../ui/Autocomplete';

const mockPartners = [
  {
    id: 1,
    name: 'Clínica Veterinaria Central',
    type: 'Veterinaria',
    location: 'Centro',
    services: 8,
    rating: 4.9,
    revenue: '$12,450',
    status: 'Activo',
    commission: '15%',
  },
  {
    id: 2,
    name: 'Pet Spa Premium',
    type: 'Estética',
    location: 'Norte',
    services: 5,
    rating: 4.7,
    revenue: '$8,200',
    status: 'Activo',
    commission: '20%',
  },
  {
    id: 3,
    name: 'Entrenamiento Canino Pro',
    type: 'Adiestramiento',
    location: 'Sur',
    services: 3,
    rating: 4.8,
    revenue: '$5,600',
    status: 'Activo',
    commission: '25%',
  },
];

export default function Aliados() {
  const [showNewPartnerModal, setShowNewPartnerModal] = useState(false);

  const partnerTypeOptions = [
    { value: 'vet', label: 'Clínica Veterinaria', subtitle: 'Consultas y cirugías' },
    { value: 'grooming', label: 'Estética y Spa', subtitle: 'Baño y peluquería' },
    { value: 'training', label: 'Adiestramiento', subtitle: 'Entrenamiento canino' },
    { value: 'daycare', label: 'Guardería', subtitle: 'Cuidado diurno' },
    { value: 'pet-shop', label: 'Tienda de mascotas', subtitle: 'Venta de productos' },
  ];

  const zoneOptions = [
    { value: 'north', label: 'Zona Norte' },
    { value: 'south', label: 'Zona Sur' },
    { value: 'center', label: 'Centro' },
    { value: 'east', label: 'Zona Este' },
    { value: 'west', label: 'Zona Oeste' },
  ];

  const columns = [
    {
      key: 'name',
      label: 'Aliado',
      sortable: true,
      render: (value: string, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <Handshake className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{row.type}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      label: 'Ubicación',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900">{value}</span>
        </div>
      ),
    },
    {
      key: 'services',
      label: 'Servicios',
      render: (value: number) => (
        <span className="text-gray-900">{value} activos</span>
      ),
    },
    {
      key: 'rating',
      label: 'Calificación',
      render: (value: number) => (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="font-semibold text-gray-900">{value}</span>
        </div>
      ),
    },
    {
      key: 'revenue',
      label: 'Ingresos generados',
      sortable: true,
      render: (value: string) => (
        <span className="font-semibold text-gray-900">{value}</span>
      ),
    },
    {
      key: 'commission',
      label: 'Comisión',
      render: (value: string) => (
        <span className="text-sm text-gray-700">{value}</span>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (value: string) => <Badge variant="success">{value}</Badge>,
    },
  ];

  const filters = [
    {
      key: 'type',
      label: 'Tipo de aliado',
      type: 'select' as const,
      options: [
        { value: 'vet', label: 'Veterinaria' },
        { value: 'grooming', label: 'Estética' },
        { value: 'training', label: 'Adiestramiento' },
        { value: 'daycare', label: 'Guardería' },
      ],
    },
    {
      key: 'location',
      label: 'Ubicación',
      type: 'select' as const,
      options: [
        { value: 'north', label: 'Norte' },
        { value: 'south', label: 'Sur' },
        { value: 'center', label: 'Centro' },
        { value: 'east', label: 'Este' },
        { value: 'west', label: 'Oeste' },
      ],
    },
    {
      key: 'status',
      label: 'Estado',
      type: 'select' as const,
      options: [
        { value: 'active', label: 'Activo' },
        { value: 'inactive', label: 'Inactivo' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Aliados</h1>
          <p className="text-sm text-gray-500 mt-1">
            Red de negocios, profesionales y contratos
          </p>
        </div>
        <button
          onClick={() => setShowNewPartnerModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Nuevo aliado
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Handshake className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">48</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Aliados activos</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">$45,280</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Ingresos generados</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">4.7</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Calificación promedio</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">$8,450</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Comisiones pendientes</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <Filters
          filters={filters}
          searchPlaceholder="Buscar por nombre o ubicación..."
        />
      </div>

      <Table columns={columns} data={mockPartners} actions={() => null} />

      <Modal
        isOpen={showNewPartnerModal}
        onClose={() => setShowNewPartnerModal(false)}
        title="Nuevo aliado de negocio"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowNewPartnerModal(false)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Cancelar
            </button>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
              Registrar aliado
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <FormField label="Nombre del negocio" required>
              <Input placeholder="Ej: Clínica Veterinaria Central" />
            </FormField>

            <FormField label="Tipo de negocio" required>
              <Autocomplete
                options={partnerTypeOptions}
                placeholder="Seleccionar tipo..."
              />
            </FormField>

            <FormField label="Nombre del responsable" required>
              <Input placeholder="Nombre completo" />
            </FormField>

            <FormField label="Email de contacto" required>
              <Input type="email" placeholder="contacto@negocio.com" />
            </FormField>

            <FormField label="Teléfono principal" required>
              <Input type="tel" placeholder="555-0123" />
            </FormField>

            <FormField label="Teléfono alternativo">
              <Input type="tel" placeholder="555-0456" />
            </FormField>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Ubicación</h3>
            <div className="grid grid-cols-2 gap-6">
              <FormField label="Dirección" required>
                <Input placeholder="Calle y número" />
              </FormField>

              <FormField label="Colonia/Barrio">
                <Input placeholder="Nombre de la colonia" />
              </FormField>

              <FormField label="Ciudad" required>
                <Input placeholder="Nombre de la ciudad" />
              </FormField>

              <FormField label="Zona" required>
                <Autocomplete
                  options={zoneOptions}
                  placeholder="Seleccionar zona..."
                />
              </FormField>

              <FormField label="Código postal">
                <Input placeholder="12345" />
              </FormField>

              <FormField label="Coordenadas GPS">
                <Input placeholder="19.4326, -99.1332" />
              </FormField>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Configuración comercial</h3>
            <div className="grid grid-cols-2 gap-6">
              <FormField label="Porcentaje de comisión" required>
                <div className="flex items-center gap-2">
                  <Input type="number" placeholder="15" min="0" max="100" />
                  <span className="text-gray-500">%</span>
                </div>
              </FormField>

              <FormField label="Forma de pago">
                <Autocomplete
                  options={[
                    { value: 'weekly', label: 'Semanal' },
                    { value: 'biweekly', label: 'Quincenal' },
                    { value: 'monthly', label: 'Mensual' },
                  ]}
                  placeholder="Seleccionar frecuencia..."
                />
              </FormField>

              <FormField label="Cuenta bancaria">
                <Input placeholder="1234567890" />
              </FormField>

              <FormField label="CLABE interbancaria">
                <Input placeholder="012345678901234567" />
              </FormField>
            </div>
          </div>

          <FormField label="Servicios que ofrece">
            <Textarea placeholder="Lista de servicios que ofrece este aliado..." />
          </FormField>

          <FormField label="Notas adicionales">
            <Textarea placeholder="Información adicional relevante..." />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
