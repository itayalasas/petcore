import { Plus, Calendar, Loader, CreditCard as Edit2, Trash2, Stethoscope, Scissors, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import Table, { TableAction } from '../ui/Table';
import Filters from '../ui/Filters';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { FormField, Input, Textarea } from '../ui/FormField';
import Autocomplete from '../ui/Autocomplete';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useTenant } from '../../contexts/TenantContext';
import { servicesService, appointmentsService, Service, AppointmentWithDetails } from '../../services/servicesAppointments';
import { petsService, Pet } from '../../services/pets';
import { ownersService, Owner } from '../../services/owners';
import { locationsService, Location } from '../../services/locations';
import { profilesService, type VeterinarianProfile } from '../../services/profiles';
import { showSuccess, showError } from '../../utils/messages';

const PENDING_CONSULTATION_APPOINTMENT_KEY = 'pendingConsultationAppointmentId';

export default function Servicios() {
  const { currentTenant, currentMembership, loading: tenantLoading } = useTenant();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [veterinarians, setVeterinarians] = useState<VeterinarianProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentWithDetails | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<AppointmentWithDetails | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({
    service_id: '',
    pet_id: '',
    location_id: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 30,
    price: 0,
    notes: ''
  });

  useEffect(() => {
    if (currentTenant) {
      loadData();
    }
  }, [currentTenant, currentMembership?.role, currentMembership?.user_id]);

  const getVisibleAppointments = (appointmentsData: AppointmentWithDetails[]) => {
    const sortedAppointments = [...appointmentsData].sort(
      (left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime()
    );

    if (currentMembership?.role === 'veterinarian') {
      return sortedAppointments.filter((appointment) => appointment.veterinarian_id === currentMembership.user_id);
    }

    return sortedAppointments;
  };

  const loadData = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      const [appointmentsData, servicesData, petsData, ownersData, locationsData, veterinariansData] = await Promise.all([
        appointmentsService.getAll(currentTenant.id),
        servicesService.getActive(currentTenant.id),
        petsService.getAllPets(currentTenant.id),
        ownersService.getAll(currentTenant.id),
        locationsService.getActive(currentTenant.id),
        profilesService.getVeterinarians(currentTenant.id)
      ]);

      setAppointments(getVisibleAppointments(appointmentsData));
      setServices(servicesData);
      setPets(petsData);
      setOwners(ownersData);
      setLocations(locationsData);
      setVeterinarians(veterinariansData);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (appointment: AppointmentWithDetails) => {
    setEditingAppointment(appointment);
    const scheduledDate = new Date(appointment.scheduled_at);
    setFormData({
      service_id: appointment.service_id || '',
      pet_id: appointment.pet_id,
      location_id: appointment.location_id || '',
      scheduled_date: scheduledDate.toISOString().split('T')[0],
      scheduled_time: scheduledDate.toTimeString().slice(0, 5),
      duration_minutes: appointment.duration_minutes || 30,
      price: appointment.price || 0,
      veterinarian_id: appointment.veterinarian_id || '',
      notes: appointment.notes || ''
    });
    setShowBookingModal(true);
  };

  const handleDelete = (appointment: AppointmentWithDetails) => {
    setAppointmentToDelete(appointment);
    setShowDeleteModal(true);
  };

  const handleCloseBookingModal = () => {
    setShowBookingModal(false);
    setEditingAppointment(null);
    setFormData({
      service_id: '',
      pet_id: '',
      location_id: '',
      scheduled_date: '',
      scheduled_time: '',
      duration_minutes: 30,
      price: 0,
      notes: ''
    });
  };

  const handleConfirmDelete = async () => {
    if (!appointmentToDelete) return;

    try {
      setSaving(true);
      await appointmentsService.delete(appointmentToDelete.id);
      await loadData();
      showSuccess('Reserva eliminada correctamente');
      setShowDeleteModal(false);
      setAppointmentToDelete(null);
    } catch (error) {
      console.error('Error deleting appointment:', error);
      showError('Error al eliminar la reserva');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentTenant) return;

    if (!formData.service_id || !formData.pet_id || !formData.scheduled_date || !formData.scheduled_time) {
      showError('Por favor completa todos los campos requeridos');
      return;
    }

    const selectedPet = pets.find(p => p.id === formData.pet_id);
    if (!selectedPet?.owner_id) {
      showError('La mascota seleccionada no tiene un dueño asignado');
      return;
    }

    try {
      setSaving(true);
      const scheduledAt = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`);

      const selectedService = services.find(s => s.id === formData.service_id);

      const appointmentData = {
        service_id: formData.service_id,
        pet_id: formData.pet_id,
        owner_id: selectedPet.owner_id,
        location_id: formData.location_id || undefined,
        veterinarian_id: formData.veterinarian_id || undefined,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: formData.duration_minutes || 30,
        price: formData.price || 0,
        reason: selectedService?.name || '',
        notes: formData.notes || undefined
      };

      if (editingAppointment) {
        await appointmentsService.update(editingAppointment.id, appointmentData);
        showSuccess('Reserva actualizada correctamente');
      } else {
        await appointmentsService.create(currentTenant.id, appointmentData);
        showSuccess('Reserva creada correctamente');
      }

      await loadData();
      handleCloseBookingModal();
    } catch (error) {
      console.error('Error saving appointment:', error);
      showError('Error al guardar la reserva');
    } finally {
      setSaving(false);
    }
  };

  const getServiceOptions = () => {
    return services.map(service => ({
      value: service.id,
      label: service.name,
      subtitle: `${service.category} - $${service.price} - ${service.duration_minutes} min`
    }));
  };

  const getPetOptions = () => {
    return pets.map(pet => {
      const owner = owners.find(o => o.id === pet.owner_id);
      return {
        value: pet.id,
        label: `${pet.name} (${pet.species})`,
        subtitle: owner ? `${owner.first_name} ${owner.last_name}` : 'Sin dueño'
      };
    });
  };

  const getLocationOptions = () => {
    return locations.map(location => ({
      value: location.id,
      label: location.name,
      subtitle: location.city || location.address || ''
    }));
  };

  const getVeterinarianOptions = () => {
    return veterinarians.map(vet => ({
      value: vet.id,
      label: vet.display_name || vet.email || 'Usuario',
      subtitle: vet.email || ''
    }));
  };

  const getDurationOptions = () => {
    return [
      { value: '15', label: '15 minutos' },
      { value: '30', label: '30 minutos' },
      { value: '45', label: '45 minutos' },
      { value: '60', label: '1 hora' },
      { value: '90', label: '1.5 horas' },
      { value: '120', label: '2 horas' },
      { value: '180', label: '3 horas' },
      { value: '480', label: 'Todo el día' },
    ];
  };

  const handleServiceChange = (serviceId: string) => {
    const selectedService = services.find(s => s.id === serviceId);
    setFormData({
      ...formData,
      service_id: serviceId,
      duration_minutes: selectedService?.duration_minutes || 30,
      price: selectedService?.price || 0
    });
  };

  const handleStartConsultation = async (appointment: AppointmentWithDetails) => {
    if (appointment.status === 'completed') {
      showError('Esta cita ya fue completada');
      return;
    }

    try {
      if (appointment.status === 'pending') {
        await appointmentsService.updateStatus(appointment.id, 'confirmed');
      }

      const serviceType = appointment.service?.service_type || 'veterinary';

      window.sessionStorage.setItem(PENDING_CONSULTATION_APPOINTMENT_KEY, appointment.id);

      if (serviceType === 'grooming') {
        window.dispatchEvent(new CustomEvent('app:navigate', { detail: { view: 'estetica' } }));
      } else if (serviceType === 'daycare') {
        window.dispatchEvent(new CustomEvent('app:navigate', { detail: { view: 'cuidado' } }));
      } else {
        window.dispatchEvent(new CustomEvent('app:navigate', { detail: { view: 'salud' } }));
      }
    } catch (error) {
      console.error('Error starting consultation from appointment:', error);
      showError('Error al abrir la cita en consultas');
    }
  };

  const getTableActions = (row: AppointmentWithDetails): TableAction[] => {
    const serviceType = row.service?.service_type || 'veterinary';

    let actionLabel: string;
    let actionIcon: React.ReactNode;

    switch (serviceType) {
      case 'grooming':
        actionLabel = 'Iniciar Estetica';
        actionIcon = <Scissors className="w-4 h-4" />;
        break;
      case 'daycare':
        actionLabel = 'Iniciar Cuidado';
        actionIcon = <Sun className="w-4 h-4" />;
        break;
      default:
        actionLabel = 'Atender Consulta';
        actionIcon = <Stethoscope className="w-4 h-4" />;
    }

    return [
      {
        label: actionLabel,
        icon: actionIcon,
        onClick: handleStartConsultation,
      },
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
  };

  const columns = [
    {
      key: 'service',
      label: 'Servicio',
      sortable: true,
      render: (_: any, row: AppointmentWithDetails) => (
        <div>
          <p className="font-medium text-gray-900">{row.service?.name || 'Sin servicio'}</p>
          <p className="text-xs text-gray-500">{row.location?.name || 'Sin ubicación'}</p>
          {row.veterinarian && (
            <p className="text-xs text-gray-500">{row.veterinarian.display_name || row.veterinarian.email || 'Sin veterinario'}</p>
          )}
        </div>
      ),
    },
    {
      key: 'pet',
      label: 'Mascota',
      render: (_: any, row: AppointmentWithDetails) => (
        <div>
          <p className="font-medium text-gray-900">{row.pet?.name || 'N/A'}</p>
          <p className="text-xs text-gray-500">
            {row.owner ? `${row.owner.first_name} ${row.owner.last_name}` : 'Sin dueño'}
          </p>
        </div>
      ),
    },
    {
      key: 'scheduled_at',
      label: 'Fecha y hora',
      sortable: true,
      render: (value: string, row: AppointmentWithDetails) => {
        const date = new Date(value);
        return (
          <div>
            <p className="text-gray-900">{date.toLocaleDateString()}</p>
            <p className="text-xs text-gray-500">
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {row.duration_minutes} min
            </p>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Estado',
      render: (value: string) => {
        const variants: any = {
          'confirmed': 'success',
          'pending': 'warning',
          'completed': 'success',
          'cancelled': 'error',
        };
        const labels: any = {
          'confirmed': 'Confirmado',
          'pending': 'Pendiente',
          'completed': 'Completado',
          'cancelled': 'Cancelado',
        };
        return <Badge variant={variants[value] || 'default'}>{labels[value] || value}</Badge>;
      },
    },
    {
      key: 'price',
      label: 'Precio',
      render: (value: number) => (
        <span className="font-semibold text-gray-900">${value || 0}</span>
      ),
    },
  ];

  const filters = [
    {
      key: 'status',
      label: 'Estado',
      type: 'select' as const,
      options: [
        { value: 'confirmed', label: 'Confirmado' },
        { value: 'pending', label: 'Pendiente' },
        { value: 'completed', label: 'Completado' },
        { value: 'cancelled', label: 'Cancelado' },
      ],
    },
    { key: 'date', label: 'Fecha', type: 'date' as const },
  ];

  const getStatsByCategory = () => {
    const stats: any = {};
    appointments.forEach(appointment => {
      const category = appointment.service?.category || 'Otros';
      if (!stats[category]) {
        stats[category] = {
          count: 0,
          revenue: 0
        };
      }
      stats[category].count++;
      stats[category].revenue += appointment.price || 0;
    });
    return Object.entries(stats).map(([name, data]: [string, any]) => ({
      name,
      count: data.count,
      revenue: `$${data.revenue.toFixed(2)}`
    }));
  };

  if (tenantLoading || loading) {
    return <LoadingSpinner message="Cargando servicios..." />;
  }

  const categoryStats = getStatsByCategory();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona reservas y citas de servicios
          </p>
        </div>
        <button
          onClick={() => setShowBookingModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Nueva reserva
        </button>
      </div>

      {categoryStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {categoryStats.map((category) => (
            <div key={category.name} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <Calendar className="w-8 h-8 text-primary-600" />
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{category.count}</p>
                  <p className="text-xs text-gray-500">reservas</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">{category.name}</p>
              <p className="text-sm font-semibold text-green-600">{category.revenue}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <Filters
          filters={filters}
          searchPlaceholder="Buscar por servicio, mascota o cliente..."
        />
      </div>

      <Table columns={columns} data={appointments} actions={getTableActions} />

      <Modal
        isOpen={showBookingModal}
        onClose={handleCloseBookingModal}
        title={editingAppointment ? 'Editar reserva' : 'Nueva reserva'}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleCloseBookingModal}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
            >
              {saving ? 'Guardando...' : editingAppointment ? 'Guardar cambios' : 'Confirmar reserva'}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <FormField label="Servicio" required>
              <Autocomplete
                options={getServiceOptions()}
                placeholder="Buscar servicio..."
                value={formData.service_id}
                onChange={handleServiceChange}
              />
            </FormField>

            <FormField label="Mascota" required>
              <Autocomplete
                options={getPetOptions()}
                placeholder="Buscar mascota..."
                value={formData.pet_id}
                onChange={(value) => setFormData({ ...formData, pet_id: value })}
              />
            </FormField>

            <FormField label="Fecha" required>
              <Input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              />
            </FormField>

            <FormField label="Hora" required>
              <Input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              />
            </FormField>

            <FormField label="Duración estimada">
              <Autocomplete
                options={getDurationOptions()}
                placeholder="Seleccionar duración..."
                value={formData.duration_minutes.toString()}
                onChange={(value) => setFormData({ ...formData, duration_minutes: parseInt(value) })}
              />
            </FormField>

            <FormField label="Ubicación" required>
              <Autocomplete
                options={getLocationOptions()}
                placeholder="Seleccionar ubicación..."
                value={formData.location_id}
                onChange={(value) => setFormData({ ...formData, location_id: value })}
              />
            </FormField>

            <FormField label="Profesional asignado">
              <Autocomplete
                options={[
                  { value: '', label: 'Asignar automáticamente' },
                  ...getVeterinarianOptions()
                ]}
                placeholder="Seleccionar profesional..."
                value={formData.veterinarian_id || ''}
                onChange={(value) => setFormData({ ...formData, veterinarian_id: value })}
              />
            </FormField>

            <FormField label="Precio">
              <Input
                type="number"
                step="0.01"
                placeholder="$0.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
          </div>

          <FormField label="Notas especiales">
            <Textarea
              placeholder="Instrucciones, preferencias o información adicional..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </FormField>
        </div>
      </Modal>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        itemName={`la reserva de ${appointmentToDelete?.pet?.name || ''}`}
        message="Esta acción no se puede deshacer. Se cancelará la reserva y se eliminará todo el historial asociado."
      />
    </div>
  );
}
