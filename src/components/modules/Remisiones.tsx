import { useState, useEffect } from 'react';
import { Send, Clock, CheckCircle, XCircle, AlertTriangle, User, Calendar, Filter, Plus, ArrowRight, FileText, Loader } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useToast } from '../../contexts/ToastContext';
import { referralsService, ReferralWithDetails, Referral } from '../../services/cases';
import { employeesService, EmployeeWithDetails } from '../../services/employees';
import { petsService, Pet } from '../../services/pets';
import Modal from '../ui/Modal';
import Autocomplete from '../ui/Autocomplete';
import LoadingSpinner from '../ui/LoadingSpinner';

const DEPARTMENTS = [
  { value: 'veterinary', label: 'Veterinaria', icon: '🏥' },
  { value: 'grooming', label: 'Estetica', icon: '✂️' },
  { value: 'daycare', label: 'Guarderia', icon: '🏠' },
  { value: 'laboratory', label: 'Laboratorio', icon: '🔬' },
  { value: 'surgery', label: 'Cirugia', icon: '🔪' },
  { value: 'imaging', label: 'Imagenologia', icon: '📷' },
  { value: 'pharmacy', label: 'Farmacia', icon: '💊' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock },
  accepted: { label: 'Aceptada', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: CheckCircle },
  scheduled: { label: 'Programada', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: Calendar },
  in_progress: { label: 'En proceso', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: ArrowRight },
  completed: { label: 'Completada', color: 'bg-gray-100 text-gray-600 border-gray-300', icon: CheckCircle },
  rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
  cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500 border-gray-300', icon: XCircle },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  routine: { label: 'Rutina', color: 'bg-gray-100 text-gray-700' },
  urgent: { label: 'Urgente', color: 'bg-amber-100 text-amber-700' },
  emergency: { label: 'Emergencia', color: 'bg-red-100 text-red-700' },
};

export default function Remisiones() {
  const { currentTenant } = useTenant();
  const { showSuccess, showError } = useToast();

  const [referrals, setReferrals] = useState<ReferralWithDetails[]>([]);
  const [employees, setEmployees] = useState<EmployeeWithDetails[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterUrgency, setFilterUrgency] = useState<string>('');

  const [showModal, setShowModal] = useState(false);
  const [savingReferral, setSavingReferral] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<ReferralWithDetails | null>(null);

  const [formData, setFormData] = useState({
    pet_id: '',
    from_department: '',
    to_department: '',
    reason: '',
    clinical_notes: '',
    urgency: 'routine' as Referral['urgency'],
  });

  useEffect(() => {
    if (currentTenant) {
      loadData();
    }
  }, [currentTenant]);

  const loadData = async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      const [refs, emps, petsData] = await Promise.all([
        referralsService.getAll(currentTenant.id),
        employeesService.getAll(currentTenant.id),
        petsService.getAll(currentTenant.id),
      ]);
      setReferrals(refs);
      setEmployees(emps);
      setPets(petsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Error al cargar remisiones');
    } finally {
      setLoading(false);
    }
  };

  const filteredReferrals = referrals.filter(ref => {
    if (filterStatus === 'active' && ['completed', 'rejected', 'cancelled'].includes(ref.status)) return false;
    if (filterStatus !== 'active' && filterStatus && ref.status !== filterStatus) return false;
    if (filterDepartment && ref.to_department !== filterDepartment) return false;
    if (filterUrgency && ref.urgency !== filterUrgency) return false;
    return true;
  });

  const stats = {
    pending: referrals.filter(r => r.status === 'pending').length,
    inProgress: referrals.filter(r => ['accepted', 'scheduled', 'in_progress'].includes(r.status)).length,
    urgent: referrals.filter(r => r.urgency !== 'routine' && !['completed', 'rejected', 'cancelled'].includes(r.status)).length,
    completedToday: referrals.filter(r => {
      if (r.status !== 'completed' || !r.completed_at) return false;
      const today = new Date();
      const completed = new Date(r.completed_at);
      return completed.toDateString() === today.toDateString();
    }).length,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    if (!formData.pet_id || !formData.to_department || !formData.reason) {
      showError('Completa los campos requeridos');
      return;
    }

    setSavingReferral(true);

    try {
      await referralsService.create(currentTenant.id, formData);
      showSuccess('Remision creada');
      setShowModal(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error creating referral:', error);
      showError('Error al crear remision');
    } finally {
      setSavingReferral(false);
    }
  };

  const handleAccept = async (referral: ReferralWithDetails, employeeId: string) => {
    try {
      await referralsService.accept(referral.id, employeeId);
      showSuccess('Remision aceptada');
      await loadData();
    } catch (error) {
      console.error('Error accepting referral:', error);
      showError('Error al aceptar remision');
    }
  };

  const handleUpdateStatus = async (referral: ReferralWithDetails, status: string) => {
    try {
      if (status === 'completed') {
        await referralsService.complete(referral.id);
      } else if (status === 'in_progress') {
        await referralsService.start(referral.id);
      } else {
        await referralsService.update(referral.id, { status: status as Referral['status'] });
      }
      showSuccess('Estado actualizado');
      setShowDetailModal(false);
      await loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      showError('Error al actualizar estado');
    }
  };

  const handleReject = async (referral: ReferralWithDetails, reason: string) => {
    try {
      await referralsService.reject(referral.id, reason);
      showSuccess('Remision rechazada');
      setShowDetailModal(false);
      await loadData();
    } catch (error) {
      console.error('Error rejecting referral:', error);
      showError('Error al rechazar remision');
    }
  };

  const resetForm = () => {
    setFormData({
      pet_id: '',
      from_department: '',
      to_department: '',
      reason: '',
      clinical_notes: '',
      urgency: 'routine',
    });
  };

  const openDetail = (referral: ReferralWithDetails) => {
    setSelectedReferral(referral);
    setShowDetailModal(true);
  };

  const getDeptLabel = (value: string) => DEPARTMENTS.find(d => d.value === value)?.label || value;

  if (loading) {
    return <LoadingSpinner message="Cargando remisiones..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Remisiones</h1>
          <p className="text-gray-600">Transferencias entre departamentos</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          <Plus className="w-5 h-5" />
          Nueva remision
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-600">Pendientes</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ArrowRight className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              <p className="text-sm text-gray-600">En proceso</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.urgent}</p>
              <p className="text-sm text-gray-600">Urgentes</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completedToday}</p>
              <p className="text-sm text-gray-600">Completadas hoy</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Filtros:</span>
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="active">Activas</option>
            <option value="">Todas</option>
            <option value="pending">Pendientes</option>
            <option value="accepted">Aceptadas</option>
            <option value="scheduled">Programadas</option>
            <option value="in_progress">En proceso</option>
            <option value="completed">Completadas</option>
            <option value="rejected">Rechazadas</option>
          </select>

          <select
            value={filterDepartment}
            onChange={e => setFilterDepartment(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="">Todos los departamentos</option>
            {DEPARTMENTS.map(dept => (
              <option key={dept.value} value={dept.value}>{dept.label}</option>
            ))}
          </select>

          <select
            value={filterUrgency}
            onChange={e => setFilterUrgency(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="">Todas las urgencias</option>
            <option value="routine">Rutina</option>
            <option value="urgent">Urgente</option>
            <option value="emergency">Emergencia</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredReferrals.map(referral => {
          const statusConfig = STATUS_CONFIG[referral.status];
          const urgencyConfig = URGENCY_CONFIG[referral.urgency];
          const StatusIcon = statusConfig.icon;

          return (
            <div
              key={referral.id}
              className="bg-white rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openDetail(referral)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs text-gray-500">{referral.referral_number}</span>
                    <h3 className="font-medium text-gray-900">{referral.pet?.name}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded text-xs ${urgencyConfig.color}`}>
                      {urgencyConfig.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded border text-xs flex items-center gap-1 ${statusConfig.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <span className="font-medium">{getDeptLabel(referral.from_department)}</span>
                  <ArrowRight className="w-4 h-4" />
                  <span className="font-medium">{getDeptLabel(referral.to_department)}</span>
                </div>

                <p className="text-sm text-gray-600 line-clamp-2">{referral.reason}</p>

                {referral.to_employee && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <User className="w-3 h-3" />
                    Asignado a: {referral.to_employee.first_name} {referral.to_employee.last_name}
                  </div>
                )}

                {referral.scheduled_date && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(referral.scheduled_date).toLocaleDateString('es-MX')}
                  </div>
                )}

                <div className="text-xs text-gray-400 mt-2">
                  {new Date(referral.created_at).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredReferrals.length === 0 && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay remisiones para mostrar</p>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title="Nueva remision"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mascota *
            </label>
            <Autocomplete
              options={pets.map(p => ({ value: p.id, label: `${p.name} - ${p.species}` }))}
              value={formData.pet_id}
              onChange={value => setFormData({ ...formData, pet_id: value })}
              placeholder="Buscar mascota..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departamento origen
              </label>
              <select
                value={formData.from_department}
                onChange={e => setFormData({ ...formData, from_department: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Seleccionar...</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept.value} value={dept.value}>{dept.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departamento destino *
              </label>
              <select
                value={formData.to_department}
                onChange={e => setFormData({ ...formData, to_department: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">Seleccionar...</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept.value} value={dept.value}>{dept.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Urgencia
            </label>
            <div className="flex gap-2">
              {Object.entries(URGENCY_CONFIG).map(([value, config]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData({ ...formData, urgency: value as Referral['urgency'] })}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    formData.urgency === value
                      ? config.color + ' border-current'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo de la remision *
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="Ej: Estudio de sangre, Radiografia, Cirugia programada..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas clinicas
            </label>
            <textarea
              value={formData.clinical_notes}
              onChange={e => setFormData({ ...formData, clinical_notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              rows={3}
              placeholder="Informacion relevante para el departamento destino..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={() => { setShowModal(false); resetForm(); }}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingReferral}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
            >
              {savingReferral ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear remision'
              )}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedReferral(null); }}
        title={`Remision ${selectedReferral?.referral_number || ''}`}
        size="lg"
      >
        {selectedReferral && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedReferral.pet?.name}</h3>
                  <p className="text-sm text-gray-600">
                    {selectedReferral.pet?.species} - {selectedReferral.pet?.breed}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-1 rounded text-sm ${URGENCY_CONFIG[selectedReferral.urgency].color}`}>
                    {URGENCY_CONFIG[selectedReferral.urgency].label}
                  </span>
                  <span className={`px-2 py-1 rounded border text-sm ${STATUS_CONFIG[selectedReferral.status].color}`}>
                    {STATUS_CONFIG[selectedReferral.status].label}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-red-600 uppercase font-medium">Desde</p>
                <p className="font-medium">{getDeptLabel(selectedReferral.from_department)}</p>
                {selectedReferral.from_employee && (
                  <p className="text-sm text-gray-600">
                    {selectedReferral.from_employee.first_name} {selectedReferral.from_employee.last_name}
                  </p>
                )}
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-xs text-emerald-600 uppercase font-medium">Hacia</p>
                <p className="font-medium">{getDeptLabel(selectedReferral.to_department)}</p>
                {selectedReferral.to_employee && (
                  <p className="text-sm text-gray-600">
                    {selectedReferral.to_employee.first_name} {selectedReferral.to_employee.last_name}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Motivo</h4>
              <p className="text-gray-900">{selectedReferral.reason}</p>
            </div>

            {selectedReferral.clinical_notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Notas clinicas</h4>
                <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded">{selectedReferral.clinical_notes}</p>
              </div>
            )}

            {selectedReferral.scheduled_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>Programada: {new Date(selectedReferral.scheduled_date).toLocaleString('es-MX')}</span>
              </div>
            )}

            {selectedReferral.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800">Motivo de rechazo:</p>
                <p className="text-sm text-red-700">{selectedReferral.rejection_reason}</p>
              </div>
            )}

            {selectedReferral.status === 'pending' && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Asignar a empleado</h4>
                <div className="flex gap-2">
                  <select
                    className="flex-1 px-3 py-2 border rounded-lg"
                    onChange={e => {
                      if (e.target.value) {
                        handleAccept(selectedReferral, e.target.value);
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">Seleccionar empleado...</option>
                    {employees
                      .filter(e => e.is_active && e.department === selectedReferral.to_department)
                      .map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4 border-t">
              {selectedReferral.status === 'pending' && (
                <button
                  onClick={() => {
                    const reason = prompt('Motivo del rechazo:');
                    if (reason) handleReject(selectedReferral, reason);
                  }}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                >
                  Rechazar
                </button>
              )}
              {selectedReferral.status === 'accepted' && (
                <button
                  onClick={() => handleUpdateStatus(selectedReferral, 'in_progress')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Iniciar atencion
                </button>
              )}
              {selectedReferral.status === 'in_progress' && (
                <button
                  onClick={() => handleUpdateStatus(selectedReferral, 'completed')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Completar
                </button>
              )}
              <button
                onClick={() => { setShowDetailModal(false); setSelectedReferral(null); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
