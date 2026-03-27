import { Plus, Users, Mail, Phone, Star, CreditCard as Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import Table from '../ui/Table';
import Filters from '../ui/Filters';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';
import { FormField, Input, Textarea } from '../ui/FormField';
import Autocomplete from '../ui/Autocomplete';

const mockClients = [
  {
    id: 1,
    name: 'Juan Pérez',
    email: 'juan@email.com',
    phone: '555-0123',
    pets: 2,
    totalSpent: '$4,500',
    lastVisit: '2024-03-20',
    status: 'Activo',
    segment: 'VIP',
  },
  {
    id: 2,
    name: 'María García',
    email: 'maria@email.com',
    phone: '555-0456',
    pets: 1,
    totalSpent: '$1,250',
    lastVisit: '2024-03-18',
    status: 'Activo',
    segment: 'Regular',
  },
  {
    id: 3,
    name: 'Carlos Ruiz',
    email: 'carlos@email.com',
    phone: '555-0789',
    pets: 3,
    totalSpent: '$6,780',
    lastVisit: '2024-03-15',
    status: 'Activo',
    segment: 'VIP',
  },
];

export default function Clientes() {
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [clientToDelete, setClientToDelete] = useState<any>(null);

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setShowFormModal(true);
  };

  const handleDelete = (client: any) => {
    setClientToDelete(client);
    setShowDeleteModal(true);
  };

  const handleCloseFormModal = () => {
    setShowFormModal(false);
    setEditingClient(null);
  };

  const handleConfirmDelete = () => {
    console.log('Eliminando cliente:', clientToDelete);
    setShowDeleteModal(false);
    setClientToDelete(null);
  };

  const tableActions = [
    {
      label: 'Editar',
      icon: <Edit2 className="w-4 h-4" />,
      onClick: handleEdit,
    },
    {
      label: 'Eliminar',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handleDelete,
      variant: 'danger' as const,
    },
  ];

  const segmentOptions = [
    { value: 'vip', label: 'VIP', subtitle: 'Cliente premium' },
    { value: 'regular', label: 'Regular', subtitle: 'Cliente frecuente' },
    { value: 'new', label: 'Nuevo', subtitle: 'Primera vez' },
  ];

  const columns = [
    {
      key: 'name',
      label: 'Cliente',
      sortable: true,
      render: (value: string, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{row.pets} mascota(s)</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Contacto',
      render: (value: string, row: any) => (
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-900">
            <Mail className="w-4 h-4 text-gray-400" />
            {value}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
            <Phone className="w-3 h-3 text-gray-400" />
            {row.phone}
          </div>
        </div>
      ),
    },
    {
      key: 'totalSpent',
      label: 'Total gastado',
      sortable: true,
      render: (value: string) => (
        <span className="font-semibold text-gray-900">{value}</span>
      ),
    },
    { key: 'lastVisit', label: 'Última visita', sortable: true },
    {
      key: 'segment',
      label: 'Segmento',
      render: (value: string) => {
        const variant = value === 'VIP' ? 'warning' : 'default';
        return (
          <Badge variant={variant}>
            {value === 'VIP' && <Star className="w-3 h-3 mr-1" />}
            {value}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      label: 'Estado',
      render: (value: string) => <Badge variant="success">{value}</Badge>,
    },
  ];

  const filters = [
    {
      key: 'segment',
      label: 'Segmento',
      type: 'select' as const,
      options: [
        { value: 'vip', label: 'VIP' },
        { value: 'regular', label: 'Regular' },
        { value: 'new', label: 'Nuevo' },
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
    { key: 'lastVisit', label: 'Última visita', type: 'date' as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de clientes, historial y segmentación
          </p>
        </div>
        <button
          onClick={() => setShowFormModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Nuevo cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">1,234</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Total clientes</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">156</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Clientes VIP</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">45</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Nuevos este mes</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">4.8</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Satisfacción promedio</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <Filters
          filters={filters}
          searchPlaceholder="Buscar por nombre, email o teléfono..."
        />
      </div>

      <Table columns={columns} data={mockClients} actions={tableActions} />

      <Modal
        isOpen={showFormModal}
        onClose={handleCloseFormModal}
        title={editingClient ? 'Editar cliente' : 'Nuevo cliente'}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleCloseFormModal}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Cancelar
            </button>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
              {editingClient ? 'Guardar cambios' : 'Guardar cliente'}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <FormField label="Nombre completo" required>
              <Input
                placeholder="Ej: Juan Pérez García"
                defaultValue={editingClient?.name || ''}
              />
            </FormField>

            <FormField label="Email" required>
              <Input
                type="email"
                placeholder="cliente@email.com"
                defaultValue={editingClient?.email || ''}
              />
            </FormField>

            <FormField label="Teléfono principal" required>
              <Input
                type="tel"
                placeholder="555-0123"
                defaultValue={editingClient?.phone || ''}
              />
            </FormField>

            <FormField label="Teléfono alternativo">
              <Input
                type="tel"
                placeholder="555-0456"
                defaultValue={editingClient?.altPhone || ''}
              />
            </FormField>

            <FormField label="Fecha de nacimiento">
              <Input
                type="date"
                defaultValue={editingClient?.birthDate || ''}
              />
            </FormField>

            <FormField label="Segmento">
              <Autocomplete
                options={segmentOptions}
                placeholder="Seleccionar segmento..."
                defaultValue={editingClient?.segment || ''}
              />
            </FormField>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Dirección</h3>
            <div className="grid grid-cols-2 gap-6">
              <FormField label="Calle y número" required>
                <Input
                  placeholder="Av. Principal 123"
                  defaultValue={editingClient?.address?.street || ''}
                />
              </FormField>

              <FormField label="Colonia/Barrio">
                <Input
                  placeholder="Nombre de la colonia"
                  defaultValue={editingClient?.address?.neighborhood || ''}
                />
              </FormField>

              <FormField label="Ciudad" required>
                <Input
                  placeholder="Nombre de la ciudad"
                  defaultValue={editingClient?.address?.city || ''}
                />
              </FormField>

              <FormField label="Estado">
                <Input
                  placeholder="Nombre del estado"
                  defaultValue={editingClient?.address?.state || ''}
                />
              </FormField>

              <FormField label="Código postal">
                <Input
                  placeholder="12345"
                  defaultValue={editingClient?.address?.zipCode || ''}
                />
              </FormField>

              <FormField label="Referencias">
                <Input
                  placeholder="Entre calle X y Y"
                  defaultValue={editingClient?.address?.references || ''}
                />
              </FormField>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Preferencias de contacto</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-700">Recibir notificaciones por email</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-700">Recibir notificaciones por WhatsApp</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-700">Recibir promociones y ofertas</span>
              </label>
            </div>
          </div>

          <FormField label="Notas adicionales">
            <Textarea
              placeholder="Información relevante sobre el cliente..."
              defaultValue={editingClient?.notes || ''}
            />
          </FormField>
        </div>
      </Modal>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar cliente"
        message={`¿Estás seguro de que deseas eliminar a ${clientToDelete?.name}? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
