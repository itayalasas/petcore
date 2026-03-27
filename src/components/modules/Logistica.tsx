import { Truck, MapPin, Package, Clock, CheckCircle2, Plus } from 'lucide-react';
import { useState } from 'react';
import Table from '../ui/Table';
import Filters from '../ui/Filters';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { FormField, Input, Textarea } from '../ui/FormField';
import Autocomplete from '../ui/Autocomplete';

const mockDeliveries = [
  {
    id: '#DEL-1234',
    driver: 'Pedro García',
    orders: 5,
    zone: 'Norte',
    status: 'En ruta',
    completed: 3,
    pending: 2,
    eta: '14:30',
  },
  {
    id: '#DEL-1235',
    driver: 'Ana López',
    orders: 8,
    zone: 'Centro',
    status: 'En ruta',
    completed: 5,
    pending: 3,
    eta: '15:00',
  },
  {
    id: '#DEL-1236',
    driver: 'Carlos Ruiz',
    orders: 6,
    zone: 'Sur',
    status: 'Completado',
    completed: 6,
    pending: 0,
    eta: '-',
  },
];

export default function Logistica() {
  const [showNewRouteModal, setShowNewRouteModal] = useState(false);
  const [showNewDriverModal, setShowNewDriverModal] = useState(false);

  const driverOptions = [
    { value: '1', label: 'Pedro García', subtitle: 'Repartidor activo' },
    { value: '2', label: 'Ana López', subtitle: 'Repartidor activo' },
    { value: '3', label: 'Carlos Ruiz', subtitle: 'Repartidor activo' },
  ];

  const zoneOptions = [
    { value: 'north', label: 'Zona Norte' },
    { value: 'south', label: 'Zona Sur' },
    { value: 'center', label: 'Centro' },
    { value: 'east', label: 'Zona Este' },
    { value: 'west', label: 'Zona Oeste' },
  ];

  const vehicleOptions = [
    { value: 'motorcycle', label: 'Motocicleta' },
    { value: 'car', label: 'Automóvil' },
    { value: 'van', label: 'Camioneta' },
    { value: 'truck', label: 'Camión' },
  ];

  const columns = [
    {
      key: 'id',
      label: 'ID Ruta',
      sortable: true,
      render: (value: string, row: any) => (
        <div>
          <p className="font-semibold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{row.driver}</p>
        </div>
      ),
    },
    {
      key: 'zone',
      label: 'Zona',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900">{value}</span>
        </div>
      ),
    },
    {
      key: 'orders',
      label: 'Órdenes',
      render: (value: number, row: any) => (
        <div>
          <p className="text-gray-900">{value} total</p>
          <p className="text-xs text-green-600">{row.completed} completadas</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (value: string) => {
        const variants: any = {
          'En ruta': 'info',
          'Completado': 'success',
          'Pendiente': 'warning',
        };
        return <Badge variant={variants[value] || 'default'}>{value}</Badge>;
      },
    },
    {
      key: 'eta',
      label: 'ETA',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          {value !== '-' && <Clock className="w-4 h-4 text-gray-400" />}
          <span className="text-gray-900">{value}</span>
        </div>
      ),
    },
  ];

  const filters = [
    {
      key: 'zone',
      label: 'Zona',
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
        { value: 'in-route', label: 'En ruta' },
        { value: 'completed', label: 'Completado' },
        { value: 'pending', label: 'Pendiente' },
      ],
    },
    { key: 'date', label: 'Fecha', type: 'date' as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Logística</h1>
          <p className="text-sm text-gray-500 mt-1">
            Repartidores, rutas y asignaciones
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewDriverModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Nuevo repartidor
          </button>
          <button
            onClick={() => setShowNewRouteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Nueva ruta
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Rutas activas</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">32</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Entregas pendientes</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">156</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Entregadas hoy</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Repartidores activos</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <Filters
          filters={filters}
          searchPlaceholder="Buscar por repartidor o zona..."
        />
      </div>

      <Table columns={columns} data={mockDeliveries} actions={() => null} />

      <Modal
        isOpen={showNewRouteModal}
        onClose={() => setShowNewRouteModal(false)}
        title="Crear nueva ruta"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowNewRouteModal(false)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Cancelar
            </button>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
              Crear ruta
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <FormField label="Repartidor asignado" required>
              <Autocomplete
                options={driverOptions}
                placeholder="Seleccionar repartidor..."
              />
            </FormField>

            <FormField label="Zona de entrega" required>
              <Autocomplete
                options={zoneOptions}
                placeholder="Seleccionar zona..."
              />
            </FormField>

            <FormField label="Fecha de ruta" required>
              <Input type="date" />
            </FormField>

            <FormField label="Hora de inicio">
              <Input type="time" />
            </FormField>

            <FormField label="Órdenes a entregar" required>
              <Input type="number" placeholder="0" />
            </FormField>

            <FormField label="Vehículo">
              <Autocomplete
                options={vehicleOptions}
                placeholder="Seleccionar vehículo..."
              />
            </FormField>
          </div>

          <FormField label="Notas de la ruta">
            <Textarea placeholder="Instrucciones especiales, puntos de referencia..." />
          </FormField>
        </div>
      </Modal>

      <Modal
        isOpen={showNewDriverModal}
        onClose={() => setShowNewDriverModal(false)}
        title="Registrar repartidor"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowNewDriverModal(false)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Cancelar
            </button>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
              Registrar repartidor
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <FormField label="Nombre completo" required>
              <Input placeholder="Ej: Pedro García López" />
            </FormField>

            <FormField label="Email" required>
              <Input type="email" placeholder="repartidor@email.com" />
            </FormField>

            <FormField label="Teléfono" required>
              <Input type="tel" placeholder="555-0123" />
            </FormField>

            <FormField label="Fecha de nacimiento">
              <Input type="date" />
            </FormField>

            <FormField label="Tipo de licencia" required>
              <Autocomplete
                options={[
                  { value: 'a', label: 'Tipo A - Motocicleta' },
                  { value: 'b', label: 'Tipo B - Automóvil' },
                  { value: 'c', label: 'Tipo C - Camión' },
                ]}
                placeholder="Seleccionar tipo..."
              />
            </FormField>

            <FormField label="Número de licencia" required>
              <Input placeholder="LIC-123456" />
            </FormField>

            <FormField label="Tipo de vehículo">
              <Autocomplete
                options={vehicleOptions}
                placeholder="Seleccionar vehículo..."
              />
            </FormField>

            <FormField label="Placas del vehículo">
              <Input placeholder="ABC-1234" />
            </FormField>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Dirección</h3>
            <div className="grid grid-cols-2 gap-6">
              <FormField label="Calle y número">
                <Input placeholder="Av. Principal 123" />
              </FormField>

              <FormField label="Colonia">
                <Input placeholder="Nombre de la colonia" />
              </FormField>

              <FormField label="Ciudad">
                <Input placeholder="Nombre de la ciudad" />
              </FormField>

              <FormField label="Código postal">
                <Input placeholder="12345" />
              </FormField>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Información bancaria</h3>
            <div className="grid grid-cols-2 gap-6">
              <FormField label="Cuenta bancaria">
                <Input placeholder="1234567890" />
              </FormField>

              <FormField label="CLABE interbancaria">
                <Input placeholder="012345678901234567" />
              </FormField>
            </div>
          </div>

          <FormField label="Notas">
            <Textarea placeholder="Información adicional sobre el repartidor..." />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
