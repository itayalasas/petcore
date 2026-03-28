import { Plus, Users, Mail, Phone, MapPin, Search, CreditCard as Edit, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { ownersService, Owner } from '../../services/owners';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import { FormField, Input, Textarea } from '../ui/FormField';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';

export default function Duenos() {
  const { currentTenant } = useTenant();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [ownerToDelete, setOwnerToDelete] = useState<Owner | null>(null);
  const [savingOwner, setSavingOwner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    document_id: '',
    notes: ''
  });

  useEffect(() => {
    if (currentTenant) {
      loadOwners();
    }
  }, [currentTenant]);

  const loadOwners = async () => {
    try {
      setLoading(true);
      const data = await ownersService.getAll(currentTenant!.id);
      setOwners(data);
    } catch (error) {
      console.error('Error loading owners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadOwners();
      return;
    }

    try {
      setLoading(true);
      const results = await ownersService.search(currentTenant!.id, searchTerm);
      setOwners(results);
    } catch (error) {
      console.error('Error searching owners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewOwner = () => {
    setEditingOwner(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      document_id: '',
      notes: ''
    });
    setShowModal(true);
  };

  const handleEditOwner = (owner: Owner) => {
    setEditingOwner(owner);
    setFormData({
      first_name: owner.first_name,
      last_name: owner.last_name,
      email: owner.email || '',
      phone: owner.phone || '',
      address: owner.address || '',
      city: owner.city || '',
      document_id: owner.document_id || '',
      notes: owner.notes || ''
    });
    setShowModal(true);
  };

  const handleDeleteClick = (owner: Owner) => {
    setOwnerToDelete(owner);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ownerToDelete) return;

    try {
      await ownersService.delete(ownerToDelete.id);
      setDeleteModalOpen(false);
      setOwnerToDelete(null);
      await loadOwners();
    } catch (error: any) {
      console.error('Error al eliminar dueño:', error);
      const message = error?.message || 'Error desconocido';
      alert(`Error al eliminar dueño: ${message}`);
    }
  };

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name) {
      alert('Por favor, completa al menos el nombre y apellido');
      return;
    }

    setSavingOwner(true);

    try {
      if (editingOwner) {
        await ownersService.update(editingOwner.id, formData);
      } else {
        await ownersService.create(currentTenant!.id, formData);
      }

      setShowModal(false);
      await loadOwners();
    } catch (error: any) {
      console.error('Error al guardar dueño:', error);
      const message = error?.message || 'Error desconocido';
      alert(`Error al guardar dueño: ${message}`);
    } finally {
      setSavingOwner(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Nombre',
      sortable: true,
      render: (_: any, row: Owner) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.first_name} {row.last_name}</p>
            {row.email && <p className="text-xs text-gray-500">{row.email}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Teléfono',
      render: (value: string) => value || '-',
    },
    {
      key: 'city',
      label: 'Ciudad',
      render: (value: string) => value || '-',
    },
    {
      key: 'created_at',
      label: 'Fecha de registro',
      render: (value: string) => new Date(value).toLocaleDateString('es-MX'),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_: any, row: Owner) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditOwner(row)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteClick(row)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dueños</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona la información de los dueños de mascotas
          </p>
        </div>
        <button
          onClick={handleNewOwner}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-5 h-5" />
          Nuevo dueño
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar por nombre, email o teléfono..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            Buscar
          </button>
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                loadOwners();
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Cargando...</div>
        ) : owners.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'No se encontraron dueños' : 'No hay dueños registrados'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleNewOwner}
                className="mt-4 text-cyan-600 hover:text-cyan-700 font-medium"
              >
                Registrar primer dueño
              </button>
            )}
          </div>
        ) : (
          <Table columns={columns} data={owners} />
        )}
      </div>

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingOwner ? 'Editar Dueño' : 'Nuevo Dueño'}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Nombre" required>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Juan"
                  required
                />
              </FormField>

              <FormField label="Apellido" required>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Pérez"
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Email">
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="juan@example.com"
                />
              </FormField>

              <FormField label="Teléfono">
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+52 55 1234 5678"
                />
              </FormField>
            </div>

            <FormField label="Dirección">
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Calle Principal 123"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Ciudad">
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Ciudad de México"
                />
              </FormField>

              <FormField label="DNI/Identificación">
                <Input
                  value={formData.document_id}
                  onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
                  placeholder="Número de documento"
                />
              </FormField>
            </div>

            <FormField label="Notas">
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales..."
                rows={3}
              />
            </FormField>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={savingOwner || !formData.first_name || !formData.last_name}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingOwner ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>{editingOwner ? 'Actualizar' : 'Crear'} Dueño</>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteModalOpen && ownerToDelete && (
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setOwnerToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Eliminar Dueño"
          message={`¿Estás seguro de que deseas eliminar a ${ownerToDelete.first_name} ${ownerToDelete.last_name}? Esta acción no se puede deshacer.`}
        />
      )}
    </div>
  );
}
