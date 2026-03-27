import { Plus, PawPrint, Calendar, User, Phone, MapPin, QrCode, FileText, Mail, MapPin as Location, Syringe, Heart, Scale, Pill, ShoppingBag, AlertCircle, CheckCircle2, Clock, CreditCard as Edit2, Trash2, Loader, Stethoscope, Scissors, Sparkles, Bath } from 'lucide-react';
import { useState, useEffect } from 'react';
import Table from '../ui/Table';
import Filters from '../ui/Filters';
import Modal from '../ui/Modal';
import Tabs from '../ui/Tabs';
import Badge from '../ui/Badge';
import { FormField, Input, Textarea } from '../ui/FormField';
import Autocomplete from '../ui/Autocomplete';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';
import { petsService, Pet, PetHealth, PetService } from '../../services/pets';
import { showSuccess, showError } from '../../utils/messages';
import { supabase } from '../../lib/supabase';
import { ownersService, Owner } from '../../services/owners';
import { useTenant } from '../../contexts/TenantContext';

export default function Mascotas() {
  const { currentTenant, loading: tenantLoading } = useTenant();
  const [pets, setPets] = useState<Pet[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedPetHealth, setSelectedPetHealth] = useState<PetHealth[]>([]);
  const [selectedPetBookings, setSelectedPetBookings] = useState<any[]>([]);
  const [selectedPetConsultations, setSelectedPetConsultations] = useState<any[]>([]);
  const [selectedConsultationDetail, setSelectedConsultationDetail] = useState<any>(null);
  const [showConsultationDetailModal, setShowConsultationDetailModal] = useState(false);
  const [loadingConsultationDetail, setLoadingConsultationDetail] = useState(false);
  const [selectedPetServices, setSelectedPetServices] = useState<PetService[]>([]);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({
    service_name: '',
    service_type: 'grooming' as PetService['service_type'],
    performed_at: new Date().toISOString().slice(0, 16),
    duration_minutes: '',
    notes: '',
    price: ''
  });
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [petToDelete, setPetToDelete] = useState<Pet | null>(null);
  const [ownerType, setOwnerType] = useState<'existing' | 'new'>('existing');
  const [formData, setFormData] = useState<any>({});
  const [newOwnerData, setNewOwnerData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentTenant) {
      loadData();
    }
  }, [currentTenant]);

  const loadData = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      const [petsData, ownersData] = await Promise.all([
        petsService.getAllPets(currentTenant.id),
        ownersService.getAll(currentTenant.id)
      ]);
      setPets(petsData);
      setOwners(ownersData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPetDetails = async (pet: Pet) => {
    if (!currentTenant) return;

    try {
      const [healthRecords, bookings, consultations, petServices] = await Promise.all([
        petsService.getPetHealthRecords(pet.id, currentTenant.id),
        petsService.getBookingsByPet(pet.id, currentTenant.id),
        petsService.getConsultationsByPet(pet.id, currentTenant.id),
        petsService.getPetServices(pet.id, currentTenant.id)
      ]);
      setSelectedPetHealth(healthRecords);
      setSelectedPetBookings(bookings);
      setSelectedPetConsultations(consultations || []);
      setSelectedPetServices(petServices || []);
    } catch (error) {
      console.error('Error loading pet details:', error);
    }
  };

  const handleViewConsultationDetail = async (consultationId: string) => {
    if (!currentTenant) return;

    try {
      setLoadingConsultationDetail(true);
      const details = await petsService.getConsultationDetails(consultationId, currentTenant.id);
      setSelectedConsultationDetail(details);
      setShowConsultationDetailModal(true);
    } catch (error) {
      console.error('Error loading consultation details:', error);
    } finally {
      setLoadingConsultationDetail(false);
    }
  };

  const handleAddService = () => {
    setServiceFormData({
      service_name: '',
      service_type: 'grooming',
      performed_at: new Date().toISOString().slice(0, 16),
      duration_minutes: '',
      notes: '',
      price: ''
    });
    setShowAddServiceModal(true);
  };

  const handleSaveService = async () => {
    if (!currentTenant || !selectedPet) return;

    try {
      setSavingService(true);
      const { data: userData } = await supabase.auth.getUser();

      const newService = await petsService.createPetService({
        tenant_id: currentTenant.id,
        pet_id: selectedPet.id,
        service_name: serviceFormData.service_name,
        service_type: serviceFormData.service_type,
        performed_at: new Date(serviceFormData.performed_at).toISOString(),
        duration_minutes: serviceFormData.duration_minutes ? parseInt(serviceFormData.duration_minutes) : null,
        notes: serviceFormData.notes || null,
        price: serviceFormData.price ? parseFloat(serviceFormData.price) : 0,
        performed_by: userData.user?.id || null,
        status: 'completed'
      });

      setSelectedPetServices([newService, ...selectedPetServices]);
      setShowAddServiceModal(false);
      showSuccess('Servicio registrado exitosamente');
    } catch (error: any) {
      console.error('Error saving service:', error);
      showError('Error al registrar el servicio: ' + error.message);
    } finally {
      setSavingService(false);
    }
  };

  const getServiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      grooming: 'Peluqueria',
      bathing: 'Bano',
      nail_trim: 'Corte de unas',
      haircut: 'Corte de pelo',
      spa: 'Spa',
      dental: 'Limpieza dental',
      other: 'Otro'
    };
    return labels[type] || type;
  };

  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case 'grooming':
      case 'haircut':
        return Scissors;
      case 'bathing':
        return Bath;
      case 'spa':
        return Sparkles;
      default:
        return ShoppingBag;
    }
  };

  const handleEdit = (pet: Pet) => {
    setEditingPet(pet);
    setOwnerType('existing');
    setFormData({
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      age: pet.age,
      gender: pet.gender,
      color: pet.color,
      weight: pet.weight,
      chip_number: pet.chip_number,
      has_chip: pet.has_chip,
      is_neutered: pet.is_neutered,
      medical_notes: pet.medical_notes,
      owner_id: pet.owner_id,
    });
    setShowFormModal(true);
  };

  const handleDelete = (pet: Pet) => {
    setPetToDelete(pet);
    setShowDeleteModal(true);
  };

  const handleCloseFormModal = () => {
    setShowFormModal(false);
    setEditingPet(null);
    setOwnerType('existing');
    setFormData({});
    setNewOwnerData({});
  };

  const handleConfirmDelete = async () => {
    if (!petToDelete || !currentTenant) return;

    try {
      await petsService.deletePet(petToDelete.id, currentTenant.id);
      await loadData();
      setShowDeleteModal(false);
      setPetToDelete(null);
    } catch (error: any) {
      console.error('Error al eliminar mascota:', error);
      alert('Error al eliminar la mascota: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleSavePet = async () => {
    if (!currentTenant) return;

    if (!formData.name || !formData.species || !formData.gender) {
      alert('Por favor, completa los campos requeridos: nombre, especie y sexo');
      return;
    }

    try {
      setSaving(true);

      let ownerId = formData.owner_id;

      if (!editingPet && ownerType === 'new') {
        if (!newOwnerData.first_name || !newOwnerData.last_name || !newOwnerData.phone) {
          alert('Por favor, completa al menos el nombre, apellido y teléfono del dueño');
          setSaving(false);
          return;
        }

        const newOwner = await ownersService.create(currentTenant.id, newOwnerData);
        ownerId = newOwner.id;
      }

      if (!ownerId) {
        alert('Por favor, selecciona un dueño existente o crea uno nuevo');
        setSaving(false);
        return;
      }

      const petData = {
        name: formData.name,
        species: formData.species,
        breed: formData.breed || '',
        age: formData.age || 0,
        gender: formData.gender,
        color: formData.color || '',
        weight: formData.weight || 0,
        chip_number: formData.chip_number || null,
        has_chip: !!formData.chip_number,
        is_neutered: formData.is_neutered || false,
        medical_notes: formData.medical_notes || '',
        owner_id: ownerId,
        tenant_id: currentTenant.id
      };

      if (editingPet) {
        await petsService.updatePet(editingPet.id, petData, currentTenant.id);
      } else {
        await petsService.createPet(petData);
      }

      await loadData();
      handleCloseFormModal();
    } catch (error: any) {
      console.error('Error al guardar mascota:', error);
      alert('Error al guardar la mascota: ' + (error.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
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

  const speciesOptions = [
    { value: 'dog', label: 'Perro' },
    { value: 'cat', label: 'Gato' },
    { value: 'bird', label: 'Ave' },
    { value: 'rabbit', label: 'Conejo' },
    { value: 'hamster', label: 'Hámster' },
    { value: 'other', label: 'Otro' },
  ];

  const sexOptions = [
    { value: 'male', label: 'Macho' },
    { value: 'female', label: 'Hembra' },
  ];

  const getDisplayAge = (pet: Pet) => {
    if (pet.age_display) {
      return `${pet.age_display.value} ${pet.age_display.unit === 'years' ? 'años' : pet.age_display.unit === 'months' ? 'meses' : 'días'}`;
    }
    if (pet.age) {
      return `${pet.age} años`;
    }
    return 'N/A';
  };

  const columns = [
    {
      key: 'name',
      label: 'Mascota',
      sortable: true,
      render: (value: string, row: Pet) => (
        <div className="flex items-center gap-3">
          {row.photo_url ? (
            <img src={row.photo_url} alt={value} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <PawPrint className="w-5 h-5 text-primary-600" />
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{row.breed}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'species',
      label: 'Especie',
      sortable: true,
      render: (value: string) => value === 'dog' ? 'Perro' : value === 'cat' ? 'Gato' : value
    },
    {
      key: 'age',
      label: 'Edad',
      render: (value: number, row: Pet) => getDisplayAge(row)
    },
    {
      key: 'owner',
      label: 'Propietario',
      render: (value: any, row: Pet) => (
        <div>
          <p className="text-gray-900">
            {row.owner ? `${row.owner.first_name} ${row.owner.last_name}` : 'Sin nombre'}
          </p>
          <p className="text-xs text-gray-500">{row.owner?.phone || 'Sin teléfono'}</p>
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Registrado',
      render: (value: string) => new Date(value).toLocaleDateString('es-ES')
    },
    {
      key: 'status',
      label: 'Estado',
      render: () => <Badge variant="success">Activo</Badge>,
    },
  ];

  const filters = [
    {
      key: 'species',
      label: 'Especie',
      type: 'select' as const,
      options: [
        { value: 'dog', label: 'Perro' },
        { value: 'cat', label: 'Gato' },
        { value: 'bird', label: 'Ave' },
        { value: 'other', label: 'Otro' },
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
    { key: 'date', label: 'Última visita', type: 'date' as const },
  ];

  const handleRowClick = async (row: Pet) => {
    setSelectedPet(row);
    setShowDetailModal(true);
    await loadPetDetails(row);
  };

  const getOwnerOptions = () => {
    return owners.map(owner => ({
      value: owner.id,
      label: `${owner.first_name} ${owner.last_name}`,
      subtitle: owner.phone || owner.email || owner.document_id || ''
    }));
  };

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando organización...</p>
        </div>
      </div>
    );
  }

  if (!currentTenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">No hay organización seleccionada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Mascotas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona el registro de mascotas y sus propietarios - {currentTenant.name}
          </p>
        </div>
        <button
          onClick={() => setShowFormModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Nueva mascota
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <Filters
          filters={filters}
          searchPlaceholder="Buscar por nombre, propietario o ID..."
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      ) : (
        <Table columns={columns} data={pets} onRowClick={handleRowClick} actions={tableActions} />
      )}

      <Modal
        isOpen={showFormModal}
        onClose={handleCloseFormModal}
        title={editingPet ? 'Editar mascota' : 'Nueva mascota'}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleCloseFormModal}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSavePet}
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader className="w-4 h-4 animate-spin" />}
              {editingPet ? 'Guardar cambios' : 'Guardar mascota'}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <FormField label="Nombre de la mascota" required>
              <Input
                placeholder="Ej: Max"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </FormField>

            <FormField label="Especie" required>
              <Autocomplete
                options={speciesOptions}
                placeholder="Seleccionar especie..."
                value={formData.species || ''}
                onChange={(value) => setFormData({ ...formData, species: value })}
              />
            </FormField>

            <FormField label="Raza">
              <Input
                placeholder="Ej: Golden Retriever"
                value={formData.breed || ''}
                onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
              />
            </FormField>

            <FormField label="Edad">
              <Input
                type="number"
                placeholder="Edad en años"
                value={formData.age || ''}
                onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
              />
            </FormField>

            <FormField label="Sexo" required>
              <Autocomplete
                options={sexOptions}
                placeholder="Seleccionar sexo..."
                value={formData.gender || ''}
                onChange={(value) => setFormData({ ...formData, gender: value })}
              />
            </FormField>

            <FormField label="Color">
              <Input
                placeholder="Ej: Dorado"
                value={formData.color || ''}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </FormField>

            <FormField label="Peso actual (kg)">
              <Input
                type="number"
                placeholder="0.0"
                value={formData.weight || ''}
                onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
              />
            </FormField>

            <FormField label="Microchip">
              <Input
                placeholder="Número de microchip"
                value={formData.chip_number || ''}
                onChange={(e) => setFormData({ ...formData, chip_number: e.target.value, has_chip: !!e.target.value })}
              />
            </FormField>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Información del propietario</h3>

              {!editingPet && (
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setOwnerType('existing')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    ownerType === 'existing'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Propietario existente
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerType('new')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    ownerType === 'new'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Nuevo propietario
                </button>
              </div>
              )}
            </div>

            {ownerType === 'existing' || editingPet ? (
              <div>
                <FormField label="Buscar propietario" required>
                  <Autocomplete
                    options={getOwnerOptions()}
                    placeholder="Buscar por nombre, teléfono o documento..."
                    value={formData.owner_id || ''}
                    onChange={(value) => setFormData({ ...formData, owner_id: value })}
                  />
                </FormField>
                {owners.length === 0 ? (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">No hay propietarios registrados</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Cambia a "Nuevo propietario" para crear uno, o ve al módulo de Dueños para registrar propietarios.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {formData.owner_id && owners.find(o => o.id === formData.owner_id)
                            ? 'Propietario seleccionado'
                            : `${owners.length} propietarios disponibles`
                          }
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {formData.owner_id && owners.find(o => o.id === formData.owner_id)
                            ? (() => {
                                const selectedOwner = owners.find(o => o.id === formData.owner_id);
                                return `${selectedOwner?.first_name} ${selectedOwner?.last_name} - ${selectedOwner?.phone || selectedOwner?.email || 'Sin contacto'}`;
                              })()
                            : 'Busca por nombre, teléfono, email o documento'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <FormField label="Nombre" required>
                  <Input
                    placeholder="Ej: Juan"
                    value={newOwnerData.first_name || ''}
                    onChange={(e) => setNewOwnerData({ ...newOwnerData, first_name: e.target.value })}
                  />
                </FormField>

                <FormField label="Apellido" required>
                  <Input
                    placeholder="Ej: Pérez"
                    value={newOwnerData.last_name || ''}
                    onChange={(e) => setNewOwnerData({ ...newOwnerData, last_name: e.target.value })}
                  />
                </FormField>

                <FormField label="Teléfono" required>
                  <Input
                    type="tel"
                    placeholder="+52 55 1234 5678"
                    value={newOwnerData.phone || ''}
                    onChange={(e) => setNewOwnerData({ ...newOwnerData, phone: e.target.value })}
                  />
                </FormField>

                <FormField label="Email">
                  <Input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={newOwnerData.email || ''}
                    onChange={(e) => setNewOwnerData({ ...newOwnerData, email: e.target.value })}
                  />
                </FormField>

                <FormField label="DNI/Identificación">
                  <Input
                    placeholder="Número de identificación"
                    value={newOwnerData.document_id || ''}
                    onChange={(e) => setNewOwnerData({ ...newOwnerData, document_id: e.target.value })}
                  />
                </FormField>

                <FormField label="Ciudad">
                  <Input
                    placeholder="Ciudad"
                    value={newOwnerData.city || ''}
                    onChange={(e) => setNewOwnerData({ ...newOwnerData, city: e.target.value })}
                  />
                </FormField>

                <FormField label="Dirección" className="col-span-2">
                  <Input
                    placeholder="Calle y número"
                    value={newOwnerData.address || ''}
                    onChange={(e) => setNewOwnerData({ ...newOwnerData, address: e.target.value })}
                  />
                </FormField>
              </div>
            )}
          </div>

          <FormField label="Notas">
            <Textarea
              placeholder="Información adicional sobre la mascota..."
              value={formData.medical_notes || ''}
              onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
            />
          </FormField>
        </div>
      </Modal>

      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedPet?.name || 'Detalle de mascota'}
        size="xl"
      >
        {selectedPet && (
          <Tabs
            tabs={[
              {
                id: 'overview',
                label: 'Resumen',
                icon: PawPrint,
                content: (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                            <PawPrint className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-xs text-primary-700 mb-0.5">Especie</p>
                            <p className="font-semibold text-primary-900">
                              {selectedPet.species === 'dog' ? 'Perro' : selectedPet.species === 'cat' ? 'Gato' : selectedPet.species}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Raza</p>
                        <p className="font-semibold text-gray-900">{selectedPet.breed}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Edad</p>
                        <p className="font-semibold text-gray-900">{getDisplayAge(selectedPet)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Sexo</p>
                        <p className="font-semibold text-gray-900">
                          {selectedPet.gender === 'male' ? 'Macho' : selectedPet.gender === 'female' ? 'Hembra' : selectedPet.gender}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Color</p>
                        <p className="font-semibold text-gray-900">{selectedPet.color || 'No especificado'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Peso</p>
                        <p className="font-semibold text-gray-900">
                          {selectedPet.weight ? `${selectedPet.weight} kg` : 'No especificado'}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Información del propietario</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-3">
                            <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-500">Nombre</p>
                              <p className="text-sm font-medium text-gray-900">
                                {selectedPet.owner ? `${selectedPet.owner.first_name} ${selectedPet.owner.last_name}` : 'Sin nombre'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-500">Teléfono</p>
                              <p className="text-sm text-gray-900">
                                {selectedPet.owner?.phone || 'Sin teléfono'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-500">Email</p>
                              <p className="text-sm text-gray-900">
                                {selectedPet.owner?.email || 'Sin email'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Location className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-500">Dirección</p>
                              <p className="text-sm text-gray-900">
                                {selectedPet.owner?.address || 'Sin dirección'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-900">Próximas citas y recordatorios</h3>
                        <Badge variant="warning">
                          {selectedPetHealth.filter(h => h.next_due_date && new Date(h.next_due_date) > new Date()).length} pendientes
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {selectedPetHealth
                          .filter(h => h.next_due_date && new Date(h.next_due_date) > new Date())
                          .slice(0, 2)
                          .map((health) => (
                            <div key={health.id} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{health.name || health.type}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {health.next_due_date ? new Date(health.next_due_date).toLocaleDateString('es-ES') : 'Sin fecha'}
                                </p>
                              </div>
                              <Badge variant="info">Programada</Badge>
                            </div>
                          ))}
                        {selectedPetHealth.filter(h => h.next_due_date && new Date(h.next_due_date) > new Date()).length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-4">No hay citas programadas</p>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Microchip y documentos</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-xs text-gray-500 mb-1">Número de microchip</p>
                          <p className="font-mono text-sm font-semibold text-gray-900">
                            {selectedPet.has_chip && selectedPet.chip_number ? selectedPet.chip_number : 'Sin microchip'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-xs text-gray-500 mb-1">Registrado</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {new Date(selectedPet.created_at).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                id: 'health',
                label: 'Salud',
                icon: Heart,
                badge: 3,
                content: (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Heart className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-green-700">Estado de salud</p>
                            <p className="font-semibold text-green-900">Excelente</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <Scale className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Peso actual</p>
                            <p className="font-semibold text-gray-900">28 kg</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <Syringe className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Vacunas al día</p>
                            <p className="font-semibold text-gray-900">5/5</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Vacunas recientes</h3>
                      <div className="space-y-3">
                        {selectedPetHealth
                          .filter(h => h.type === 'vaccine')
                          .slice(0, 5)
                          .map((vaccine) => {
                            const isApplied = vaccine.application_date && new Date(vaccine.application_date) <= new Date();
                            return (
                              <div
                                key={vaccine.id}
                                className={`flex items-start gap-3 p-3 border rounded-lg ${
                                  isApplied ? 'bg-white border-gray-200' : 'bg-amber-50 border-amber-200'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isApplied ? 'bg-green-100' : 'bg-amber-100'
                                }`}>
                                  {isApplied ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-amber-600" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{vaccine.name || 'Vacuna'}</p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {isApplied
                                      ? `Aplicada el ${new Date(vaccine.application_date!).toLocaleDateString('es-ES')}${vaccine.veterinarian ? ` por ${vaccine.veterinarian}` : ''}`
                                      : `Programada para ${vaccine.next_due_date ? new Date(vaccine.next_due_date).toLocaleDateString('es-ES') : 'fecha por definir'}`
                                    }
                                  </p>
                                  {vaccine.next_due_date && isApplied && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Próxima dosis: {new Date(vaccine.next_due_date).toLocaleDateString('es-ES')}
                                    </p>
                                  )}
                                </div>
                                <Badge variant={isApplied ? 'success' : 'warning'}>
                                  {isApplied ? 'Aplicada' : 'Pendiente'}
                                </Badge>
                              </div>
                            );
                          })}
                        {selectedPetHealth.filter(h => h.type === 'vaccine').length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-4">No hay vacunas registradas</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Tratamientos actuales</h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <Pill className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Antiparasitario mensual</p>
                            <p className="text-xs text-gray-600 mt-1">1 comprimido cada 30 días</p>
                            <p className="text-xs text-blue-600 mt-1">Próxima dosis: 5 Abr 2024</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Historial de peso</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Mar 2024</span>
                            <span className="text-sm font-medium text-gray-900">28.0 kg</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Feb 2024</span>
                            <span className="text-sm font-medium text-gray-900">27.5 kg</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Ene 2024</span>
                            <span className="text-sm font-medium text-gray-900">27.0 kg</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                id: 'consultations',
                label: 'Consultas',
                icon: Stethoscope,
                badge: selectedPetConsultations.length,
                content: (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                            <Stethoscope className="w-5 h-5 text-teal-600" />
                          </div>
                          <div>
                            <p className="text-xs text-teal-700">Total consultas</p>
                            <p className="font-semibold text-teal-900">{selectedPetConsultations.length}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-green-700">Completadas</p>
                            <p className="font-semibold text-green-900">
                              {selectedPetConsultations.filter(c => c.status === 'completed').length}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Ultima consulta</p>
                        <p className="font-semibold text-gray-900">
                          {selectedPetConsultations.length > 0
                            ? new Date(selectedPetConsultations[0].date).toLocaleDateString('es-ES')
                            : 'Sin consultas'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Historial de consultas</h3>
                      <div className="space-y-3">
                        {selectedPetConsultations.map((consultation) => (
                          <button
                            key={consultation.id}
                            onClick={() => handleViewConsultationDetail(consultation.id)}
                            className={`w-full text-left p-4 border rounded-lg transition-all hover:shadow-md ${
                              consultation.status === 'completed'
                                ? 'bg-white border-gray-200 hover:border-teal-300'
                                : 'bg-amber-50 border-amber-200 hover:border-amber-300'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  consultation.status === 'completed' ? 'bg-teal-100' : 'bg-amber-100'
                                }`}>
                                  <Stethoscope className={`w-5 h-5 ${
                                    consultation.status === 'completed' ? 'text-teal-600' : 'text-amber-600'
                                  }`} />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {consultation.reason || 'Consulta general'}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {new Date(consultation.date).toLocaleDateString('es-ES', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs text-gray-600">
                                      Atendido por: <span className="font-medium text-gray-900">
                                        {consultation.veterinarian?.display_name || 'Veterinario no registrado'}
                                      </span>
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {consultation.weight && (
                                      <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                        <Scale className="w-3 h-3" />
                                        {consultation.weight} kg
                                      </span>
                                    )}
                                    {consultation.temperature && (
                                      <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                        {consultation.temperature}°C
                                      </span>
                                    )}
                                    {consultation.heart_rate && (
                                      <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                        <Heart className="w-3 h-3" />
                                        {consultation.heart_rate} BPM
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end gap-2">
                                <Badge variant={consultation.status === 'completed' ? 'success' : 'warning'}>
                                  {consultation.status === 'completed' ? 'Completada' : 'En progreso'}
                                </Badge>
                                <span className="text-xs text-teal-600 font-medium">Ver detalles</span>
                              </div>
                            </div>
                          </button>
                        ))}
                        {selectedPetConsultations.length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-4">No hay consultas registradas</p>
                        )}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                id: 'services',
                label: 'Servicios',
                icon: Scissors,
                badge: selectedPetServices.length,
                content: (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="grid grid-cols-2 gap-4 flex-1">
                        <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                              <Scissors className="w-5 h-5 text-pink-600" />
                            </div>
                            <div>
                              <p className="text-xs text-pink-700">Total servicios</p>
                              <p className="font-semibold text-pink-900">{selectedPetServices.length}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-xs text-gray-500 mb-1">Ultimo servicio</p>
                          <p className="font-semibold text-gray-900">
                            {selectedPetServices.length > 0
                              ? new Date(selectedPetServices[0].performed_at).toLocaleDateString('es-ES')
                              : 'Sin servicios'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleAddService}
                        className="ml-4 inline-flex items-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-pink-700"
                      >
                        <Plus className="w-4 h-4" />
                        Registrar Servicio
                      </button>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Historial de servicios</h3>
                      <div className="space-y-3">
                        {selectedPetServices.map((service) => {
                          const Icon = getServiceTypeIcon(service.service_type);
                          return (
                            <div
                              key={service.id}
                              className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-pink-200 transition-colors"
                            >
                              <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Icon className="w-5 h-5 text-pink-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{service.service_name}</p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      {new Date(service.performed_at).toLocaleDateString('es-ES', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge variant="default">{getServiceTypeLabel(service.service_type)}</Badge>
                                      {service.duration_minutes && (
                                        <span className="text-xs text-gray-500">{service.duration_minutes} min</span>
                                      )}
                                    </div>
                                    {service.performer && (
                                      <div className="flex items-center gap-1 mt-2">
                                        <User className="w-3 h-3 text-gray-400" />
                                        <span className="text-xs text-gray-600">
                                          Realizado por: {service.performer.display_name}
                                        </span>
                                      </div>
                                    )}
                                    {service.notes && (
                                      <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                                        {service.notes}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <Badge variant={service.status === 'completed' ? 'success' : 'warning'}>
                                      {service.status === 'completed' ? 'Completado' : service.status}
                                    </Badge>
                                    {service.price > 0 && (
                                      <p className="text-sm font-semibold text-gray-900 mt-2">
                                        ${service.price.toFixed(2)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {selectedPetServices.length === 0 && (
                          <div className="text-center py-8">
                            <Scissors className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p className="text-sm text-gray-500">No hay servicios registrados</p>
                            <button
                              onClick={handleAddService}
                              className="mt-3 text-sm text-pink-600 hover:text-pink-700 font-medium"
                            >
                              Registrar primer servicio
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                id: 'qr',
                label: 'QR Digital',
                icon: QrCode,
                content: (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-64 h-64 bg-white border-4 border-primary-200 rounded-2xl mx-auto mb-4 p-6 flex items-center justify-center shadow-lg">
                        <QrCode className="w-full h-full text-gray-800" />
                      </div>
                      <p className="text-sm font-medium text-gray-900">Código QR de identificación</p>
                      <p className="text-xs text-gray-500 mt-1">ID: PET-{selectedPet.id}-2024</p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">¿Cómo usar el código QR?</p>
                          <ul className="text-xs text-gray-600 mt-2 space-y-1">
                            <li>• Escanea el código con cualquier app de lectura QR</li>
                            <li>• Accede instantáneamente a la información de {selectedPet.name}</li>
                            <li>• Datos de contacto del propietario en caso de emergencia</li>
                            <li>• Historial médico y vacunas importantes</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button className="px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
                        Descargar QR
                      </button>
                      <button className="px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                        Imprimir
                      </button>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Información incluida en el QR</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-gray-700">Nombre y datos de la mascota</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-gray-700">Contacto del propietario</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-gray-700">Número de microchip</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-gray-700">Vacunas y tratamientos</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-gray-700">Alergias y condiciones médicas</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Modal>

      <Modal
        isOpen={showAddServiceModal}
        onClose={() => setShowAddServiceModal(false)}
        title="Registrar Servicio"
      >
        <div className="space-y-4">
          <FormField label="Nombre del servicio" required>
            <Input
              value={serviceFormData.service_name}
              onChange={(e) => setServiceFormData({ ...serviceFormData, service_name: e.target.value })}
              placeholder="Ej: Bano completo, Corte de pelo..."
            />
          </FormField>

          <FormField label="Tipo de servicio" required>
            <select
              value={serviceFormData.service_type}
              onChange={(e) => setServiceFormData({ ...serviceFormData, service_type: e.target.value as PetService['service_type'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="grooming">Peluqueria</option>
              <option value="bathing">Bano</option>
              <option value="haircut">Corte de pelo</option>
              <option value="nail_trim">Corte de unas</option>
              <option value="spa">Spa</option>
              <option value="dental">Limpieza dental</option>
              <option value="other">Otro</option>
            </select>
          </FormField>

          <FormField label="Fecha y hora" required>
            <Input
              type="datetime-local"
              value={serviceFormData.performed_at}
              onChange={(e) => setServiceFormData({ ...serviceFormData, performed_at: e.target.value })}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Duracion (minutos)">
              <Input
                type="number"
                value={serviceFormData.duration_minutes}
                onChange={(e) => setServiceFormData({ ...serviceFormData, duration_minutes: e.target.value })}
                placeholder="60"
              />
            </FormField>
            <FormField label="Precio">
              <Input
                type="number"
                step="0.01"
                value={serviceFormData.price}
                onChange={(e) => setServiceFormData({ ...serviceFormData, price: e.target.value })}
                placeholder="0.00"
              />
            </FormField>
          </div>

          <FormField label="Notas">
            <Textarea
              value={serviceFormData.notes}
              onChange={(e) => setServiceFormData({ ...serviceFormData, notes: e.target.value })}
              placeholder="Observaciones del servicio..."
              rows={3}
            />
          </FormField>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowAddServiceModal(false)}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveService}
              disabled={savingService || !serviceFormData.service_name}
              className="flex-1 px-4 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingService ? 'Guardando...' : 'Guardar Servicio'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showConsultationDetailModal}
        onClose={() => {
          setShowConsultationDetailModal(false);
          setSelectedConsultationDetail(null);
        }}
        title="Detalle de Consulta Medica"
        size="lg"
      >
        {loadingConsultationDetail ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : selectedConsultationDetail?.consultation ? (
          <div className="space-y-6">
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-teal-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {selectedConsultationDetail.consultation.reason || 'Consulta general'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(selectedConsultationDetail.consultation.date).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <User className="w-4 h-4 text-teal-600" />
                    <span className="text-sm text-gray-700">
                      Atendido por: <span className="font-medium">
                        {selectedConsultationDetail.consultation.veterinarian?.display_name || 'No registrado'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {(selectedConsultationDetail.consultation.weight ||
              selectedConsultationDetail.consultation.temperature ||
              selectedConsultationDetail.consultation.heart_rate) && (
              <div className="grid grid-cols-3 gap-4">
                {selectedConsultationDetail.consultation.weight && (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <Scale className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Peso</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedConsultationDetail.consultation.weight} kg</p>
                  </div>
                )}
                {selectedConsultationDetail.consultation.temperature && (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <AlertCircle className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Temperatura</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedConsultationDetail.consultation.temperature}°C</p>
                  </div>
                )}
                {selectedConsultationDetail.consultation.heart_rate && (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <Heart className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Frec. Cardiaca</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedConsultationDetail.consultation.heart_rate} BPM</p>
                  </div>
                )}
              </div>
            )}

            {selectedConsultationDetail.consultation.symptoms && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Sintomas observados</h4>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                  {selectedConsultationDetail.consultation.symptoms}
                </p>
              </div>
            )}

            {selectedConsultationDetail.diagnoses.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Diagnosticos
                </h4>
                <div className="space-y-2">
                  {selectedConsultationDetail.diagnoses.map((diag: any, index: number) => (
                    <div key={diag.id || index} className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {diag.is_primary && (
                            <Badge variant="success">Primario</Badge>
                          )}
                          <span className="font-medium text-gray-900">{diag.diagnosis_name}</span>
                        </div>
                        {diag.notes && (
                          <p className="text-xs text-gray-600 mt-1">{diag.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedConsultationDetail.treatments.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Syringe className="w-4 h-4 text-teal-600" />
                  Tratamientos
                </h4>
                <div className="space-y-2">
                  {selectedConsultationDetail.treatments.map((treatment: any, index: number) => (
                    <div key={treatment.id || index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="font-medium text-gray-900">{treatment.treatment_name}</p>
                      {treatment.instructions && (
                        <p className="text-sm text-gray-600 mt-1">{treatment.instructions}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        {treatment.start_date && (
                          <span>Inicio: {new Date(treatment.start_date).toLocaleDateString('es-ES')}</span>
                        )}
                        {treatment.end_date && (
                          <span>Fin: {new Date(treatment.end_date).toLocaleDateString('es-ES')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedConsultationDetail.prescriptions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-teal-600" />
                  Prescripciones / Recetas
                </h4>
                <div className="space-y-2">
                  {selectedConsultationDetail.prescriptions.map((prescription: any, index: number) => (
                    <div key={prescription.id || index} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="font-medium text-gray-900">{prescription.medication_name}</p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                        {prescription.dosage && (
                          <div>
                            <span className="text-xs text-gray-500">Dosis:</span>
                            <p className="font-medium">{prescription.dosage}</p>
                          </div>
                        )}
                        {prescription.frequency && (
                          <div>
                            <span className="text-xs text-gray-500">Frecuencia:</span>
                            <p className="font-medium">{prescription.frequency}</p>
                          </div>
                        )}
                        {prescription.duration_days && (
                          <div>
                            <span className="text-xs text-gray-500">Duracion:</span>
                            <p className="font-medium">{prescription.duration_days} dias</p>
                          </div>
                        )}
                        {prescription.route && (
                          <div>
                            <span className="text-xs text-gray-500">Via:</span>
                            <p className="font-medium capitalize">{prescription.route}</p>
                          </div>
                        )}
                      </div>
                      {prescription.instructions && (
                        <p className="text-xs text-gray-600 mt-2 bg-white/50 p-2 rounded">
                          <span className="font-medium">Indicaciones:</span> {prescription.instructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedConsultationDetail.consultation.notes && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Notas adicionales</h4>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                  {selectedConsultationDetail.consultation.notes}
                </p>
              </div>
            )}

            {selectedConsultationDetail.diagnoses.length === 0 &&
             selectedConsultationDetail.treatments.length === 0 &&
             selectedConsultationDetail.prescriptions.length === 0 &&
             !selectedConsultationDetail.consultation.symptoms &&
             !selectedConsultationDetail.consultation.notes && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>No hay registros medicos adicionales para esta consulta</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>No se encontro la informacion de la consulta</p>
          </div>
        )}
      </Modal>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        itemName={`la mascota "${petToDelete?.name || ''}"`}
        message={`Esta acción no se puede deshacer. Se eliminará toda la información de ${petToDelete?.name || 'esta mascota'}, incluyendo su historial médico y de servicios.`}
      />
    </div>
  );
}
