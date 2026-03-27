import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Filter, ChevronLeft, ChevronRight, List, Grid3x3 as Grid3X3, Users, Briefcase, AlertCircle, CheckCircle, Play, UserPlus } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useToast } from '../../contexts/ToastContext';
import { appointmentsService, AppointmentWithDetails } from '../../services/servicesAppointments';
import { employeesService, EmployeeWithDetails } from '../../services/employees';
import { referralsService, ReferralWithDetails } from '../../services/cases';
import { servicesService, Service } from '../../services/servicesAppointments';
import Modal from '../ui/Modal';

type ViewMode = 'day' | 'week' | 'list';
type GroupBy = 'time' | 'employee' | 'service' | 'department';

const DEPARTMENTS = [
  { value: 'veterinary', label: 'Veterinaria' },
  { value: 'grooming', label: 'Estetica' },
  { value: 'daycare', label: 'Guarderia' },
  { value: 'store', label: 'Tienda' },
  { value: 'laboratory', label: 'Laboratorio' },
];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 border-amber-300 text-amber-800',
  confirmed: 'bg-blue-100 border-blue-300 text-blue-800',
  scheduled: 'bg-blue-100 border-blue-300 text-blue-800',
  in_progress: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  completed: 'bg-gray-100 border-gray-300 text-gray-600',
  cancelled: 'bg-red-100 border-red-300 text-red-600',
};

const URGENCY_COLORS: Record<string, string> = {
  routine: 'bg-gray-100 text-gray-700',
  urgent: 'bg-amber-100 text-amber-700',
  emergency: 'bg-red-100 text-red-700',
};

export default function Agenda() {
  const { currentTenant } = useTenant();
  const { showSuccess, showError } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [groupBy, setGroupBy] = useState<GroupBy>('time');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [employees, setEmployees] = useState<EmployeeWithDetails[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [pendingReferrals, setPendingReferrals] = useState<ReferralWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterEmployee, setFilterEmployee] = useState<string>('');
  const [filterService, setFilterService] = useState<string>('');

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');

  useEffect(() => {
    if (currentTenant) {
      loadData();
    }
  }, [currentTenant, selectedDate]);

  const loadData = async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      const [appts, emps, srvs, refs] = await Promise.all([
        appointmentsService.getAll(currentTenant.id),
        employeesService.getAll(currentTenant.id),
        servicesService.getAll(currentTenant.id),
        referralsService.getPending(currentTenant.id),
      ]);
      setAppointments(appts);
      setEmployees(emps);
      setServices(srvs);
      setPendingReferrals(refs);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Error al cargar la agenda');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  const getWeekDays = () => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      return day;
    });
  };

  const filteredAppointments = appointments.filter(appt => {
    const apptDate = new Date(appt.scheduled_at);

    if (viewMode === 'day' && !isSameDay(apptDate, selectedDate)) return false;
    if (viewMode === 'week') {
      const weekDays = getWeekDays();
      if (apptDate < weekDays[0] || apptDate > weekDays[6]) return false;
    }

    if (filterDepartment && appt.service?.service_type !== filterDepartment) return false;
    if (filterEmployee && appt.employee_id !== filterEmployee) return false;
    if (filterService && appt.service_id !== filterService) return false;

    return true;
  });

  const navigateDate = (direction: number) => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setSelectedDate(newDate);
  };

  const goToToday = () => setSelectedDate(new Date());

  const handleAssignEmployee = async () => {
    if (!selectedAppointment || !assignEmployeeId) return;

    try {
      await appointmentsService.update(selectedAppointment.id, { employee_id: assignEmployeeId });
      showSuccess('Empleado asignado');
      setShowAssignModal(false);
      setSelectedAppointment(null);
      setAssignEmployeeId('');
      await loadData();
    } catch (error) {
      console.error('Error assigning employee:', error);
      showError('Error al asignar empleado');
    }
  };

  const handleUpdateStatus = async (appointment: AppointmentWithDetails, status: string) => {
    try {
      await appointmentsService.updateStatus(appointment.id, status);
      showSuccess('Estado actualizado');
      await loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      showError('Error al actualizar estado');
    }
  };

  const openAssignModal = (appointment: AppointmentWithDetails) => {
    setSelectedAppointment(appointment);
    setAssignEmployeeId(appointment.employee_id || '');
    setShowAssignModal(true);
  };

  const getAppointmentsForHour = (hour: number, day?: Date) => {
    const targetDate = day || selectedDate;
    return filteredAppointments.filter(appt => {
      const apptDate = new Date(appt.scheduled_at);
      return apptDate.getHours() === hour && isSameDay(apptDate, targetDate);
    });
  };

  const getAppointmentsByEmployee = () => {
    const grouped: Record<string, AppointmentWithDetails[]> = {};
    filteredAppointments.forEach(appt => {
      const key = appt.employee_id || 'unassigned';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(appt);
    });
    return grouped;
  };

  const getAppointmentsByService = () => {
    const grouped: Record<string, AppointmentWithDetails[]> = {};
    filteredAppointments.forEach(appt => {
      const key = appt.service_id || 'other';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(appt);
    });
    return grouped;
  };

  const renderAppointmentCard = (appointment: AppointmentWithDetails, compact = false) => {
    const statusClass = STATUS_COLORS[appointment.status] || STATUS_COLORS.pending;
    const time = new Date(appointment.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const employee = employees.find(e => e.id === appointment.employee_id);

    return (
      <div
        key={appointment.id}
        className={`p-2 rounded border ${statusClass} ${compact ? 'text-xs' : 'text-sm'} cursor-pointer hover:shadow-md transition-shadow`}
        onClick={() => openAssignModal(appointment)}
      >
        <div className="font-medium truncate">{appointment.pet?.name || 'Sin mascota'}</div>
        {!compact && (
          <>
            <div className="text-xs opacity-75">{appointment.service?.name}</div>
            <div className="flex items-center gap-1 mt-1 text-xs">
              <Clock className="w-3 h-3" />
              {time}
            </div>
            {employee && (
              <div className="flex items-center gap-1 mt-1 text-xs">
                <User className="w-3 h-3" />
                {employee.first_name} {employee.last_name}
              </div>
            )}
          </>
        )}
        <div className="flex gap-1 mt-2">
          {appointment.status === 'pending' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(appointment, 'confirmed'); }}
              className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              title="Confirmar"
            >
              <CheckCircle className="w-3 h-3" />
            </button>
          )}
          {(appointment.status === 'confirmed' || appointment.status === 'scheduled') && (
            <button
              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(appointment, 'in_progress'); }}
              className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
              title="Iniciar"
            >
              <Play className="w-3 h-3" />
            </button>
          )}
          {!appointment.employee_id && (
            <button
              onClick={(e) => { e.stopPropagation(); openAssignModal(appointment); }}
              className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600"
              title="Asignar"
            >
              <UserPlus className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    if (groupBy === 'employee') {
      const grouped = getAppointmentsByEmployee();
      return (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(employees.length + 1, 6)}, 1fr)` }}>
          {employees.filter(e => e.is_active).map(employee => (
            <div key={employee.id} className="bg-white rounded-lg border p-3">
              <div className="font-medium text-sm mb-3 pb-2 border-b flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                {employee.first_name} {employee.last_name}
                <span className="text-xs text-gray-500">({employee.department})</span>
              </div>
              <div className="space-y-2">
                {(grouped[employee.id] || []).map(appt => renderAppointmentCard(appt))}
                {(!grouped[employee.id] || grouped[employee.id].length === 0) && (
                  <p className="text-xs text-gray-400 text-center py-4">Sin citas</p>
                )}
              </div>
            </div>
          ))}
          <div className="bg-gray-50 rounded-lg border p-3">
            <div className="font-medium text-sm mb-3 pb-2 border-b text-gray-500">Sin asignar</div>
            <div className="space-y-2">
              {(grouped['unassigned'] || []).map(appt => renderAppointmentCard(appt))}
            </div>
          </div>
        </div>
      );
    }

    if (groupBy === 'service') {
      const grouped = getAppointmentsByService();
      return (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {services.map(service => (
            <div key={service.id} className="bg-white rounded-lg border p-3">
              <div className="font-medium text-sm mb-3 pb-2 border-b flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gray-500" />
                {service.name}
              </div>
              <div className="space-y-2">
                {(grouped[service.id] || []).map(appt => renderAppointmentCard(appt))}
                {(!grouped[service.id] || grouped[service.id].length === 0) && (
                  <p className="text-xs text-gray-400 text-center py-4">Sin citas</p>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="grid grid-cols-[80px_1fr] divide-x">
          <div className="bg-gray-50">
            {HOURS.map(hour => (
              <div key={hour} className="h-20 border-b px-2 py-1 text-xs text-gray-500">
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
          <div>
            {HOURS.map(hour => {
              const hourAppointments = getAppointmentsForHour(hour);
              return (
                <div key={hour} className="h-20 border-b p-1 flex gap-1 flex-wrap">
                  {hourAppointments.map(appt => renderAppointmentCard(appt, true))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();

    return (
      <div className="bg-white rounded-lg border overflow-auto">
        <div className="grid grid-cols-[80px_repeat(7,1fr)] min-w-[900px]">
          <div className="bg-gray-50 border-b p-2"></div>
          {weekDays.map(day => (
            <div
              key={day.toISOString()}
              className={`border-b border-l p-2 text-center text-sm ${
                isSameDay(day, new Date()) ? 'bg-blue-50 font-semibold' : ''
              }`}
            >
              <div className="text-xs text-gray-500">
                {day.toLocaleDateString('es-MX', { weekday: 'short' })}
              </div>
              <div>{day.getDate()}</div>
            </div>
          ))}

          {HOURS.map(hour => (
            <>
              <div key={`hour-${hour}`} className="bg-gray-50 border-b px-2 py-1 text-xs text-gray-500 h-16">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {weekDays.map(day => {
                const dayAppointments = getAppointmentsForHour(hour, day);
                return (
                  <div key={`${day.toISOString()}-${hour}`} className="border-b border-l p-1 h-16 overflow-hidden">
                    {dayAppointments.slice(0, 2).map(appt => renderAppointmentCard(appt, true))}
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-gray-500 text-center">+{dayAppointments.length - 2} mas</div>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    );
  };

  const renderListView = () => (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Hora</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Mascota</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Servicio</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Empleado</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Estado</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {filteredAppointments
            .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
            .map(appointment => {
              const employee = employees.find(e => e.id === appointment.employee_id);
              const statusClass = STATUS_COLORS[appointment.status];

              return (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    {new Date(appointment.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm">{appointment.pet?.name}</div>
                    <div className="text-xs text-gray-500">{appointment.owner?.first_name} {appointment.owner?.last_name}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{appointment.service?.name}</td>
                  <td className="px-4 py-3 text-sm">
                    {employee ? `${employee.first_name} ${employee.last_name}` : (
                      <span className="text-gray-400">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusClass}`}>
                      {appointment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openAssignModal(appointment)}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                        title="Asignar/Editar"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                      {appointment.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(appointment, 'confirmed')}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                          title="Confirmar"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {(appointment.status === 'confirmed' || appointment.status === 'scheduled') && (
                        <button
                          onClick={() => handleUpdateStatus(appointment, 'in_progress')}
                          className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded"
                          title="Iniciar"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
      {filteredAppointments.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No hay citas para mostrar
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-600">Gestion de citas por empleados y servicios</p>
        </div>
      </div>

      {pendingReferrals.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-800 font-medium mb-3">
            <AlertCircle className="w-5 h-5" />
            Remisiones pendientes ({pendingReferrals.length})
          </div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {pendingReferrals.slice(0, 6).map(referral => (
              <div key={referral.id} className={`p-3 bg-white rounded border ${URGENCY_COLORS[referral.urgency]}`}>
                <div className="font-medium text-sm">{referral.pet?.name}</div>
                <div className="text-xs text-gray-600">
                  {referral.from_department} → {referral.to_department}
                </div>
                <div className="text-xs mt-1">{referral.reason}</div>
                <div className="flex items-center gap-1 mt-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${URGENCY_COLORS[referral.urgency]}`}>
                    {referral.urgency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDate(-1)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              Hoy
            </button>
            <button
              onClick={() => navigateDate(1)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="font-medium ml-2 capitalize">{formatDate(selectedDate)}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex border rounded overflow-hidden">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 text-sm ${viewMode === 'day' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100'}`}
              >
                <Calendar className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-sm border-l ${viewMode === 'week' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm border-l ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {viewMode === 'day' && (
              <div className="flex border rounded overflow-hidden">
                <button
                  onClick={() => setGroupBy('time')}
                  className={`px-3 py-1.5 text-sm ${groupBy === 'time' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                >
                  <Clock className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGroupBy('employee')}
                  className={`px-3 py-1.5 text-sm border-l ${groupBy === 'employee' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                >
                  <Users className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGroupBy('service')}
                  className={`px-3 py-1.5 text-sm border-l ${groupBy === 'service' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                >
                  <Briefcase className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Filtros:</span>
          </div>

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
            value={filterEmployee}
            onChange={e => setFilterEmployee(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="">Todos los empleados</option>
            {employees.filter(e => e.is_active).map(emp => (
              <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
            ))}
          </select>

          <select
            value={filterService}
            onChange={e => setFilterService(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="">Todos los servicios</option>
            {services.map(svc => (
              <option key={svc.id} value={svc.id}>{svc.name}</option>
            ))}
          </select>

          {(filterDepartment || filterEmployee || filterService) && (
            <button
              onClick={() => {
                setFilterDepartment('');
                setFilterEmployee('');
                setFilterService('');
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'list' && renderListView()}

      <Modal
        isOpen={showAssignModal}
        onClose={() => { setShowAssignModal(false); setSelectedAppointment(null); }}
        title="Asignar empleado"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded p-3">
              <div className="font-medium">{selectedAppointment.pet?.name}</div>
              <div className="text-sm text-gray-600">{selectedAppointment.service?.name}</div>
              <div className="text-sm text-gray-500">
                {new Date(selectedAppointment.scheduled_at).toLocaleString('es-MX')}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Empleado asignado
              </label>
              <select
                value={assignEmployeeId}
                onChange={e => setAssignEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Sin asignar</option>
                {employees
                  .filter(e => e.is_active)
                  .filter(e => !selectedAppointment.service?.service_type || e.department === selectedAppointment.service.service_type || e.department === 'general')
                  .map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.department})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowAssignModal(false); setSelectedAppointment(null); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssignEmployee}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Guardar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
