import { Plus, Sun, Search, Check, Clock, AlertCircle, Home } from 'lucide-react';
import { useState, useEffect } from 'react';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { FormField, Input, Textarea, Select } from '../ui/FormField';
import { useTenant } from '../../contexts/TenantContext';
import { petsService, Pet } from '../../services/pets';
import { ownersService, Owner } from '../../services/owners';
import { appointmentsService, AppointmentWithDetails, Service, servicesService } from '../../services/servicesAppointments';
import { profilesService, VeterinarianProfile } from '../../services/profiles';
import { showSuccess, showError } from '../../utils/messages';
import { supabase } from '../../lib/supabase';

const PENDING_DAYCARE_APPOINTMENT_KEY = 'pendingDaycareAppointmentId';

interface PetService {
  id: string;
  tenant_id: string;
  pet_id: string;
  service_id?: string;
  service_name: string;
  service_type: string;
  performed_by?: string;
  performed_at: string;
  duration_minutes?: number;
  notes?: string;
  price: number;
  status: string;
  created_at: string;
  updated_at: string;
  pet?: Pet;
  performer?: VeterinarianProfile;
}

interface ServiceFormData {
  pet_id: string;
  service_id: string;
  service_name: string;
  service_type: string;
  performed_by: string;
  duration_minutes: number;
  notes: string;
  price: number;
  status: string;
}

const SERVICE_TYPES = [
  { value: 'daycare', label: 'Guarderia' },
  { value: 'walk', label: 'Paseo' },
  { value: 'overnight', label: 'Hospedaje nocturno' },
  { value: 'other', label: 'Otro' },
];

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Programado' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

export default function Cuidado() {
  const { currentTenant } = useTenant();
  const [petServices, setPetServices] = useState<PetService[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<AppointmentWithDetails[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<VeterinarianProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<PetService | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState<ServiceFormData>({
    pet_id: '',
    service_id: '',
    service_name: '',
    service_type: 'daycare',
    performed_by: '',
    duration_minutes: 480,
    notes: '',
    price: 0,
    status: 'in_progress',
  });

  useEffect(() => {
    if (currentTenant) {
      loadData();
      checkPendingAppointment();
    }
  }, [currentTenant]);

  const checkPendingAppointment = async () => {
    const pendingId = window.sessionStorage.getItem(PENDING_DAYCARE_APPOINTMENT_KEY);
    if (pendingId && currentTenant) {
      window.sessionStorage.removeItem(PENDING_DAYCARE_APPOINTMENT_KEY);
      try {
        const appointments = await appointmentsService.getAll(currentTenant.id);
        const appointment = appointments.find(a => a.id === pendingId);
        if (appointment) {
          startServiceFromAppointment(appointment);
        }
      } catch (error) {
        console.error('Error loading appointment:', error);
      }
    }
  };

  const loadData = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      const [petsData, ownersData, servicesData, staffData] = await Promise.all([
        petsService.getAllPets(currentTenant.id),
        ownersService.getAll(currentTenant.id),
        servicesService.getActive(currentTenant.id),
        profilesService.getVeterinarians(currentTenant.id),
      ]);

      setPets(petsData);
      setOwners(ownersData);
      setServices(servicesData.filter(s => s.service_type === 'daycare'));
      setStaff(staffData);

      await loadPetServices();
      await loadPendingAppointments();
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const loadPetServices = async () => {
    if (!currentTenant) return;

    const { data, error } = await supabase
      .from('pet_services')
      .select(`
        *,
        pet:pets(*)
      `)
      .eq('tenant_id', currentTenant.id)
      .in('service_type', ['daycare', 'walk', 'overnight', 'other'])
      .order('performed_at', { ascending: false });

    if (error) throw error;

    const servicesWithPerformer = await Promise.all(
      (data || []).map(async (service) => {
        if (service.performed_by) {
          const { data: performer } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', service.performed_by)
            .maybeSingle();
          return { ...service, performer };
        }
        return { ...service, performer: null };
      })
    );

    setPetServices(servicesWithPerformer);
  };

  const loadPendingAppointments = async () => {
    if (!currentTenant) return;

    const appointments = await appointmentsService.getAll(currentTenant.id);
    const daycareAppointments = appointments.filter(
      a => a.service?.service_type === 'daycare' &&
           (a.status === 'pending' || a.status === 'confirmed')
    );
    setPendingAppointments(daycareAppointments);
  };

  const startServiceFromAppointment = (appointment: AppointmentWithDetails) => {
    setSelectedAppointment(appointment);
    setFormData({
      pet_id: appointment.pet_id,
      service_id: appointment.service_id || '',
      service_name: appointment.service?.name || '',
      service_type: 'daycare',
      performed_by: appointment.veterinarian_id || '',
      duration_minutes: appointment.duration_minutes || 480,
      notes: appointment.notes || '',
      price: appointment.price || appointment.service?.price || 0,
      status: 'in_progress',
    });
    setShowModal(true);
  };

  const handleStartService = (appointment: AppointmentWithDetails) => {
    startServiceFromAppointment(appointment);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    if (!formData.pet_id) {
      showError('Selecciona una mascota');
      return;
    }

    try {
      const serviceData = {
        tenant_id: currentTenant.id,
        pet_id: formData.pet_id,
        service_id: formData.service_id || null,
        service_name: formData.service_name || services.find(s => s.id === formData.service_id)?.name || 'Servicio',
        service_type: formData.service_type,
        performed_by: formData.performed_by || null,
        performed_at: new Date().toISOString(),
        duration_minutes: formData.duration_minutes,
        notes: formData.notes,
        price: formData.price,
        status: formData.status,
      };

      if (editingService) {
        const { error } = await supabase
          .from('pet_services')
          .update({ ...serviceData, updated_at: new Date().toISOString() })
          .eq('id', editingService.id);

        if (error) throw error;
        showSuccess('Servicio actualizado');
      } else {
        const { error } = await supabase
          .from('pet_services')
          .insert([serviceData]);

        if (error) throw error;

        if (selectedAppointment && formData.status === 'completed') {
          await appointmentsService.updateStatus(selectedAppointment.id, 'completed');
        }

        showSuccess('Servicio registrado');
      }

      setShowModal(false);
      resetForm();
      await loadPetServices();
      await loadPendingAppointments();
    } catch (error) {
      console.error('Error saving service:', error);
      showError('Error al guardar el servicio');
    }
  };

  const handleCompleteService = async (service: PetService) => {
    try {
      const { error } = await supabase
        .from('pet_services')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', service.id);

      if (error) throw error;
      showSuccess('Servicio completado');
      await loadPetServices();
    } catch (error) {
      console.error('Error completing service:', error);
      showError('Error al completar el servicio');
    }
  };

  const resetForm = () => {
    setEditingService(null);
    setSelectedAppointment(null);
    setFormData({
      pet_id: '',
      service_id: '',
      service_name: '',
      service_type: 'daycare',
      performed_by: '',
      duration_minutes: 480,
      notes: '',
      price: 0,
      status: 'in_progress',
    });
  };

  const handleEdit = (service: PetService) => {
    setEditingService(service);
    setFormData({
      pet_id: service.pet_id,
      service_id: service.service_id || '',
      service_name: service.service_name,
      service_type: service.service_type,
      performed_by: service.performed_by || '',
      duration_minutes: service.duration_minutes || 480,
      notes: service.notes || '',
      price: service.price,
      status: service.status,
    });
    setShowModal(true);
  };

  const handleServiceSelect = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setFormData({
        ...formData,
        service_id: serviceId,
        service_name: service.name,
        price: service.price,
        duration_minutes: service.duration_minutes,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="warning">Programado</Badge>;
      case 'in_progress':
        return <Badge variant="info">En curso</Badge>;
      case 'completed':
        return <Badge variant="success">Completado</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancelado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredServices = petServices.filter(service => {
    const matchesSearch =
      service.pet?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.service_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || service.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const inProgressServices = petServices.filter(s => s.status === 'in_progress');
  const completedToday = petServices.filter(s => {
    const today = new Date().toDateString();
    return s.status === 'completed' && new Date(s.performed_at).toDateString() === today;
  });

  const columns = [
    {
      key: 'pet',
      label: 'Mascota',
      render: (_: any, row: PetService) => (
        <div>
          <p className="font-medium text-gray-900">{row.pet?.name || 'N/A'}</p>
          <p className="text-xs text-gray-500">{row.pet?.species} - {row.pet?.breed}</p>
        </div>
      ),
    },
    {
      key: 'service_name',
      label: 'Servicio',
      render: (_: any, row: PetService) => (
        <div>
          <p className="font-medium text-gray-900">{row.service_name}</p>
          <p className="text-xs text-gray-500">{SERVICE_TYPES.find(t => t.value === row.service_type)?.label || row.service_type}</p>
        </div>
      ),
    },
    {
      key: 'performed_at',
      label: 'Fecha',
      render: (value: string) => {
        const date = new Date(value);
        return (
          <div>
            <p className="text-gray-900">{date.toLocaleDateString()}</p>
            <p className="text-xs text-gray-500">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        );
      },
    },
    {
      key: 'duration_minutes',
      label: 'Duracion',
      render: (value: number) => {
        if (!value) return '-';
        const hours = Math.floor(value / 60);
        const mins = value % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      },
    },
    {
      key: 'status',
      label: 'Estado',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'price',
      label: 'Precio',
      render: (value: number) => <span className="font-medium">${value.toFixed(2)}</span>,
    },
  ];

  const tableActions = [
    {
      label: 'Completar',
      icon: <Check className="w-4 h-4" />,
      onClick: handleCompleteService,
    },
    {
      label: 'Editar',
      icon: <Sun className="w-4 h-4" />,
      onClick: handleEdit,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cuidado</h1>
          <p className="text-gray-500">Guarderia, paseos y hospedaje</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo servicio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingAppointments.length}</p>
              <p className="text-sm text-gray-500">Pendientes</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Home className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{inProgressServices.length}</p>
              <p className="text-sm text-gray-500">En guarderia</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{completedToday.length}</p>
              <p className="text-sm text-gray-500">Completados hoy</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Sun className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                ${completedToday.reduce((sum, s) => sum + s.price, 0).toFixed(0)}
              </p>
              <p className="text-sm text-gray-500">Facturado hoy</p>
            </div>
          </div>
        </div>
      </div>

      {pendingAppointments.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Citas pendientes de atender
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingAppointments.map(appointment => (
              <div
                key={appointment.id}
                className="bg-white rounded-lg p-3 border border-amber-200 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">{appointment.pet?.name}</p>
                  <p className="text-sm text-gray-500">{appointment.service?.name}</p>
                  <p className="text-xs text-amber-600">
                    {new Date(appointment.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => handleStartService(appointment)}
                  className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Iniciar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por mascota o servicio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">Todos los estados</option>
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <Table
          columns={columns}
          data={filteredServices}
          actions={tableActions}
        />
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingService ? 'Editar Servicio' : selectedAppointment ? `Atender: ${selectedAppointment.pet?.name}` : 'Nuevo Servicio'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Mascota" required>
              <Select
                value={formData.pet_id}
                onChange={(e) => setFormData({ ...formData, pet_id: e.target.value })}
                disabled={!!selectedAppointment}
              >
                <option value="">Seleccionar mascota</option>
                {pets.map(pet => {
                  const owner = owners.find(o => o.id === pet.owner_id);
                  return (
                    <option key={pet.id} value={pet.id}>
                      {pet.name} - {owner?.first_name} {owner?.last_name}
                    </option>
                  );
                })}
              </Select>
            </FormField>

            <FormField label="Servicio">
              <Select
                value={formData.service_id}
                onChange={(e) => handleServiceSelect(e.target.value)}
              >
                <option value="">Seleccionar servicio</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name} - ${service.price}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Tipo de servicio" required>
              <Select
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
              >
                {SERVICE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Cuidador">
              <Select
                value={formData.performed_by}
                onChange={(e) => setFormData({ ...formData, performed_by: e.target.value })}
              >
                <option value="">Seleccionar</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.display_name || s.email}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Duracion (minutos)">
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
              />
            </FormField>

            <FormField label="Precio">
              <Input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              />
            </FormField>

            <FormField label="Estado" required>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Notas">
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Observaciones del servicio..."
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {editingService ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
