import { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, User, Filter, ChevronLeft, ChevronRight, List, Grid3x3 as Grid3X3, Users, Briefcase, AlertCircle, CheckCircle, Play, UserPlus, Plus, Search, X, Stethoscope, Scissors, Loader } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useToast } from '../../contexts/ToastContext';
import { appointmentsService, AppointmentWithDetails, servicesService, Service } from '../../services/servicesAppointments';
import { referralsService, ReferralWithDetails } from '../../services/cases';
import { petsService, Pet } from '../../services/pets';
import { usersService, TenantUser } from '../../services/users';
import { supabase } from '../../lib/supabase';
import Modal from '../ui/Modal';
import Autocomplete from '../ui/Autocomplete';
import LoadingSpinner from '../ui/LoadingSpinner';

type ViewMode = 'day' | 'week' | 'list';
type GroupBy = 'time' | 'employee' | 'service' | 'department';

const DEPARTMENTS = [
  { value: 'general', label: 'General' },
  { value: 'veterinary', label: 'Veterinaria' },
  { value: 'grooming', label: 'Estetica' },
  { value: 'daycare', label: 'Guarderia' },
  { value: 'store', label: 'Tienda' },
  { value: 'laboratory', label: 'Laboratorio' },
];

const START_HOUR = 8;
const END_HOUR = 20;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT_PX = 40;

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

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [groupBy, setGroupBy] = useState<GroupBy>('time');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [pendingReferrals, setPendingReferrals] = useState<ReferralWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningUser, setAssigningUser] = useState(false);
  const [creatingAppointment, setCreatingAppointment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterEmployee, setFilterEmployee] = useState<string>('');
  const [filterService, setFilterService] = useState<string>('');
  const [filterOnlyMine, setFilterOnlyMine] = useState<boolean>(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);

  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  const [newAppointmentData, setNewAppointmentData] = useState({
    scheduled_at: '',
    pet_id: '',
    owner_id: '',
    service_id: '',
    employee_id: '',
    duration_minutes: 30,
    notes: '',
  });
  const [newEmployeeSearch, setNewEmployeeSearch] = useState('');
  const [showNewEmployeeDropdown, setShowNewEmployeeDropdown] = useState(false);
  const newEmployeeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentTenant) {
      loadData();
    }
  }, [currentTenant]);

  useEffect(() => {
    const handleAppointmentsChanged = () => {
      if (currentTenant) {
        loadData();
      }
    };

    window.addEventListener('appointments:changed', handleAppointmentsChanged);
    return () => window.removeEventListener('appointments:changed', handleAppointmentsChanged);
  }, [currentTenant]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(e.target as Node)) {
        setShowEmployeeDropdown(false);
      }
      if (newEmployeeDropdownRef.current && !newEmployeeDropdownRef.current.contains(e.target as Node)) {
        setShowNewEmployeeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      const [appts, users, srvs, refs, petsData] = await Promise.all([
        appointmentsService.getAll(currentTenant.id),
        usersService.getTenantUsers(currentTenant.id),
        servicesService.getAll(currentTenant.id),
        referralsService.getPending(currentTenant.id),
        petsService.getAllPets(currentTenant.id),
      ]);
      setAppointments(appts);
      setTenantUsers(users);
      setServices(srvs);
      setPendingReferrals(refs);
      setPets(petsData);
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
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      return day;
    });
  };

  const getTimeSlots = () => {
    const totalSlots = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;
    return Array.from({ length: totalSlots }, (_, index) => {
      const minutesFromStart = index * SLOT_MINUTES;
      const hour = START_HOUR + Math.floor(minutesFromStart / 60);
      const minute = minutesFromStart % 60;
      return {
        hour,
        minute,
        label: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      };
    });
  };

  const getSlotStart = (baseDate: Date, hour: number, minute: number) => {
    const slotStart = new Date(baseDate);
    slotStart.setHours(hour, minute, 0, 0);
    return slotStart;
  };

  const getSlotEnd = (slotStart: Date) => {
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + SLOT_MINUTES);
    return slotEnd;
  };

  const getAppointmentRange = (appointment: AppointmentWithDetails) => {
    const start = new Date(appointment.scheduled_at);
    const duration = appointment.duration_minutes || 30;
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + duration);
    return { start, end, duration };
  };

  const getVisibleWindow = (day: Date) => {
    const start = getSlotStart(day, START_HOUR, 0);
    const end = getSlotStart(day, END_HOUR, 0);
    return { start, end };
  };

  const getAppointmentPlacement = (appointment: AppointmentWithDetails, day: Date) => {
    const { start, end, duration } = getAppointmentRange(appointment);
    const { start: windowStart, end: windowEnd } = getVisibleWindow(day);

    if (end <= windowStart || start >= windowEnd) {
      return null;
    }

    const clampedStart = start < windowStart ? windowStart : start;
    const clampedEnd = end > windowEnd ? windowEnd : end;
    const minutesFromStart = (clampedStart.getTime() - windowStart.getTime()) / 60000;
    const visibleMinutes = Math.max((clampedEnd.getTime() - clampedStart.getTime()) / 60000, SLOT_MINUTES);
    const pixelsPerMinute = SLOT_HEIGHT_PX / SLOT_MINUTES;

    return {
      top: minutesFromStart * pixelsPerMinute,
      height: visibleMinutes * pixelsPerMinute,
      duration,
    };
  };

  const getSlotOccupants = (slotStart: Date, slotEnd: Date) => {
    return filteredAppointments.filter(appt => {
      const { start, end } = getAppointmentRange(appt);
      return start < slotEnd && end > slotStart;
    });
  };

  const filteredAppointments = appointments.filter(appt => {
    const apptDate = new Date(appt.scheduled_at);

    if (viewMode === 'day' && !isSameDay(apptDate, selectedDate)) return false;
    if (viewMode === 'week') {
      const weekDays = getWeekDays();
      const weekStart = new Date(weekDays[0]);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekDays[6]);
      weekEnd.setHours(23, 59, 59, 999);
      if (apptDate < weekStart || apptDate > weekEnd) return false;
    }

    if (filterDepartment && appt.service?.service_type !== filterDepartment) return false;
    if (filterEmployee && appt.employee_id !== filterEmployee) return false;
    if (filterService && appt.service_id !== filterService) return false;
    if (filterOnlyMine && currentUserId && appt.employee_id !== currentUserId) return false;

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

  const filteredUsersForAssign = tenantUsers.filter(u => {
    if (!employeeSearch) return true;
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const roleName = u.role?.name?.toLowerCase() || '';
    return fullName.includes(employeeSearch.toLowerCase()) || roleName.includes(employeeSearch.toLowerCase()) || u.email.toLowerCase().includes(employeeSearch.toLowerCase());
  });

  const filteredUsersForNew = tenantUsers.filter(u => {
    if (!newEmployeeSearch) return true;
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const roleName = u.role?.name?.toLowerCase() || '';
    return fullName.includes(newEmployeeSearch.toLowerCase()) || roleName.includes(newEmployeeSearch.toLowerCase()) || u.email.toLowerCase().includes(newEmployeeSearch.toLowerCase());
  });

  const selectedUserForAssign = tenantUsers.find(u => u.id === assignEmployeeId);
  const selectedUserForNew = tenantUsers.find(u => u.id === newAppointmentData.employee_id);

  const handleAssignEmployee = async () => {
    if (!selectedAppointment) return;

    setAssigningUser(true);

    try {
      await appointmentsService.update(selectedAppointment.id, {
        employee_id: assignEmployeeId || undefined
      });
      showSuccess('Empleado asignado');
      setShowAssignModal(false);
      setSelectedAppointment(null);
      setAssignEmployeeId('');
      setEmployeeSearch('');
      await loadData();
      window.dispatchEvent(new Event('appointments:changed'));
    } catch (error) {
      console.error('Error assigning employee:', error);
      showError('Error al asignar empleado');
    } finally {
      setAssigningUser(false);
    }
  };

  const handleUpdateStatus = async (appointment: AppointmentWithDetails, status: AppointmentWithDetails['status']) => {
    try {
      await appointmentsService.updateStatus(appointment.id, status);
      showSuccess('Estado actualizado');
      await loadData();
      window.dispatchEvent(new Event('appointments:changed'));
    } catch (error) {
      console.error('Error updating status:', error);
      showError('Error al actualizar estado');
    }
  };

  const handleAttendAppointment = async (appointment: AppointmentWithDetails) => {
    try {
      if (appointment.status !== 'in_progress') {
        await appointmentsService.updateStatus(appointment.id, 'in_progress');
      }

      const serviceType = appointment.service?.service_type;
      let targetView = 'salud';

      if (serviceType === 'grooming') {
        targetView = 'estetica';
        sessionStorage.setItem('pendingGroomingAppointmentId', appointment.id);
      } else if (serviceType === 'daycare') {
        targetView = 'cuidado';
        sessionStorage.setItem('pendingDaycareAppointmentId', appointment.id);
      } else {
        sessionStorage.setItem('pendingConsultationAppointmentId', appointment.id);
      }

      window.dispatchEvent(new CustomEvent('app:navigate', { detail: { view: targetView } }));
    } catch (error) {
      console.error('Error attending appointment:', error);
      showError('Error al atender cita');
    }
  };

  const openAssignModal = (appointment: AppointmentWithDetails) => {
    setSelectedAppointment(appointment);
    setAssignEmployeeId(appointment.employee_id || '');
    setEmployeeSearch('');
    setShowAssignModal(true);
  };

  const openNewAppointmentModal = (date: Date, hour: number, minute = 0) => {
    const scheduledAt = new Date(date);
    scheduledAt.setHours(hour, minute, 0, 0);
    const localDateTime = new Date(scheduledAt.getTime() - scheduledAt.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setNewAppointmentData({
      scheduled_at: localDateTime,
      pet_id: '',
      owner_id: '',
      service_id: '',
      employee_id: '',
      duration_minutes: 30,
      notes: '',
    });
    setNewEmployeeSearch('');
    setShowNewAppointmentModal(true);
  };

  const handleCreateAppointment = async () => {
    if (!currentTenant) return;

    if (!newAppointmentData.pet_id || !newAppointmentData.scheduled_at) {
      showError('Selecciona mascota y horario');
      return;
    }

    setCreatingAppointment(true);

    try {
      const pet = pets.find(p => p.id === newAppointmentData.pet_id);
      await appointmentsService.create(currentTenant.id, {
        ...newAppointmentData,
        owner_id: pet?.owner_id || newAppointmentData.owner_id,
        employee_id: newAppointmentData.employee_id || undefined,
        service_id: newAppointmentData.service_id || undefined,
      });
      showSuccess('Cita creada');
      setShowNewAppointmentModal(false);
      await loadData();
      window.dispatchEvent(new Event('appointments:changed'));
    } catch (error) {
      console.error('Error creating appointment:', error);
      showError('Error al crear cita');
    } finally {
      setCreatingAppointment(false);
    }
  };

  const renderTimeGrid = (days: Date[]) => {
    const timeSlots = getTimeSlots();
    const gridTemplateColumns = days.length === 1
      ? '80px minmax(0, 1fr)'
      : `80px repeat(${days.length}, minmax(0, 1fr))`;
    const timelineHeight = timeSlots.length * SLOT_HEIGHT_PX;

    return (
      <div className="bg-white rounded-lg border overflow-auto">
        <div className="grid min-w-[900px]" style={{ gridTemplateColumns }}>
          <div className="bg-gray-50 border-b p-2"></div>
          {days.map(day => (
            <div
              key={day.toISOString()}
              className={`border-b border-l p-2 text-center text-sm ${
                isSameDay(day, new Date()) ? 'bg-blue-50 font-semibold' : ''
              }`}
            >
              <div className="text-xs text-gray-500 capitalize">
                {day.toLocaleDateString('es-MX', { weekday: 'short' })}
              </div>
              <div>{day.getDate()}</div>
            </div>
          ))}

          <div className="bg-gray-50 border-r">
            {timeSlots.map(slot => (
              <div
                key={`time-${slot.label}`}
                className="border-b px-2 text-xs text-gray-500 flex items-start justify-start"
                style={{ height: SLOT_HEIGHT_PX, paddingTop: 4 }}
              >
                {slot.label}
              </div>
            ))}
          </div>

          {days.map(day => {
            const dayAppointments = filteredAppointments
              .filter(appt => {
                const apptDate = new Date(appt.scheduled_at);
                return isSameDay(apptDate, day);
              })
              .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

            return (
              <div
                key={day.toISOString()}
                className="relative border-l"
                style={{ height: timelineHeight }}
              >
                {timeSlots.map((slot, index) => {
                  const slotStart = getSlotStart(day, slot.hour, slot.minute);
                  const slotEnd = getSlotEnd(slotStart);
                  const slotOccupants = getSlotOccupants(slotStart, slotEnd);
                  const canCreateHere = slotOccupants.length === 0;

                  return (
                    <button
                      key={`slot-${day.toISOString()}-${slot.label}`}
                      type="button"
                      className={`absolute left-0 right-0 border-b border-dashed border-gray-200 transition-colors ${canCreateHere ? 'hover:bg-gray-50/70 cursor-pointer' : 'cursor-not-allowed bg-emerald-50/20'}`}
                      style={{ top: index * SLOT_HEIGHT_PX, height: SLOT_HEIGHT_PX, zIndex: 1 }}
                      onClick={() => {
                        if (canCreateHere) {
                          openNewAppointmentModal(day, slot.hour, slot.minute);
                        }
                      }}
                    />
                  );
                })}

                {dayAppointments.map(appt => {
                  const placement = getAppointmentPlacement(appt, day);
                  if (!placement) return null;

                  return (
                    <div
                      key={appt.id}
                      className="absolute z-20 left-1 right-1"
                      style={{
                        top: placement.top + 2,
                        height: Math.max(placement.height - 4, 30),
                      }}
                    >
                      {renderAppointmentCard(appt, true, true)}
                    </div>
                  );
                })}

                <div
                  className="pointer-events-none absolute inset-0 z-10"
                  style={{
                    backgroundImage: `linear-gradient(to bottom, transparent 0, transparent ${SLOT_HEIGHT_PX - 1}px, rgba(226,232,240,0.9) ${SLOT_HEIGHT_PX - 1}px, rgba(226,232,240,0.9) ${SLOT_HEIGHT_PX}px)`,
                    backgroundSize: `100% ${SLOT_HEIGHT_PX}px`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
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

  const renderUserSelector = (
    search: string,
    setSearch: (s: string) => void,
    showDropdown: boolean,
    setShowDropdown: (s: boolean) => void,
    onChange: (id: string) => void,
    filteredList: TenantUser[],
    selectedUser: TenantUser | undefined,
    dropdownRef: React.RefObject<HTMLDivElement>
  ) => {
    return (
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={selectedUser ? `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.email : search}
            onChange={e => {
              setSearch(e.target.value);
              onChange('');
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Buscar usuario por nombre o rol..."
            className="w-full pl-9 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          {(selectedUser || search) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                onChange('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {selectedUser && (
          <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">
                {selectedUser.first_name || ''} {selectedUser.last_name || ''}
              </div>
              <div className="flex items-center gap-2">
                {selectedUser.role && (
                  <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                    {selectedUser.role.name}
                  </span>
                )}
                <span className="text-xs text-gray-500">{selectedUser.email}</span>
              </div>
            </div>
          </div>
        )}

        {showDropdown && !selectedUser && (
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {filteredList.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                No se encontraron usuarios
              </div>
            ) : (
              filteredList.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    onChange(user.id);
                    setSearch('');
                    setShowDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-3 border-b last:border-b-0"
                >
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {user.first_name || ''} {user.last_name || ''}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {user.role && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                          {user.role.name}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 truncate">{user.email}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  const getPetDisplayName = (pet: Pet | undefined) => {
    if (!pet) return 'Sin mascota';
    const ownerName = pet.owner ? `${pet.owner.first_name} ${pet.owner.last_name}` : '';
    return `${pet.name} - ${pet.species} (${pet.breed})${ownerName ? ` - ${ownerName}` : ''}`;
  };

  const renderAppointmentCard = (appointment: AppointmentWithDetails, compact = false, timeline = false) => {
    const statusClass = STATUS_COLORS[appointment.status] || STATUS_COLORS.pending;
    const time = new Date(appointment.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const assignedUser = tenantUsers.find(u => u.id === appointment.employee_id);
    const serviceName = appointment.service?.name || 'Cita';
    const ownerName = appointment.owner ? `${appointment.owner.first_name} ${appointment.owner.last_name}` : 'Sin propietario';
    const duration = appointment.duration_minutes || 30;

    if (timeline) {
      return (
        <button
          key={appointment.id}
          type="button"
          onClick={(e) => { e.stopPropagation(); openAssignModal(appointment); }}
          className={`w-full h-full overflow-hidden rounded-xl border border-white/70 text-left shadow-md ring-1 ring-black/5 transition-all hover:shadow-lg hover:-translate-y-[1px] ${statusClass}`}
        >
          <div className="flex h-full flex-col gap-1 p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold leading-tight">
                  {appointment.pet?.name || 'Sin mascota'}
                </div>
                <div className="truncate text-[11px] font-medium opacity-80 leading-tight">
                  {serviceName}
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                {appointment.status.replace('_', ' ')}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] opacity-80">
              <Clock className="h-3 w-3" />
              <span>{time}</span>
              <span>·</span>
              <span>{duration} min</span>
            </div>

            {appointment.owner && (
              <div className="truncate text-[11px] opacity-75">
                {ownerName}
              </div>
            )}

            <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[10px] opacity-80">
              <div className="truncate">
                {assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name}` : 'Sin asignar'}
              </div>
              <div className="rounded-md bg-white/60 px-2 py-0.5 font-medium">
                Abrir
              </div>
            </div>
          </div>
        </button>
      );
    }

    return (
      <div
        key={appointment.id}
        className={`rounded border ${statusClass} ${compact ? 'text-xs' : 'text-sm'} cursor-pointer hover:shadow-md transition-shadow p-2`}
        onClick={(e) => { e.stopPropagation(); openAssignModal(appointment); }}
      >
        <div className="font-medium truncate">{appointment.pet?.name || 'Sin mascota'}</div>
        {compact && (
          <div className="mt-0.5 text-[11px] opacity-75 flex items-center gap-1 truncate">
            <Clock className="w-3 h-3" />
            {time} · {duration} min
          </div>
        )}
        {!compact && (
          <>
            {appointment.owner && (
              <div className="text-xs opacity-75">
                {ownerName}
              </div>
            )}
            <div className="text-xs opacity-75">{serviceName}</div>
            <div className="flex items-center gap-1 mt-1 text-xs">
              <Clock className="w-3 h-3" />
              {time}
            </div>
            {assignedUser && (
              <div className="flex items-center gap-1 mt-1 text-xs">
                <User className="w-3 h-3" />
                {assignedUser.first_name} {assignedUser.last_name}
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
              onClick={(e) => { e.stopPropagation(); handleAttendAppointment(appointment); }}
              className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
              title="Atender"
            >
              <Play className="w-3 h-3" />
            </button>
          )}
          {appointment.status === 'in_progress' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleAttendAppointment(appointment); }}
              className="p-1 bg-cyan-500 text-white rounded hover:bg-cyan-600"
              title="Continuar atendiendo"
            >
              {appointment.service?.service_type === 'grooming' ? <Scissors className="w-3 h-3" /> : <Stethoscope className="w-3 h-3" />}
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
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(tenantUsers.length + 1, 6)}, 1fr)` }}>
          {tenantUsers.map(user => (
            <div key={user.id} className="bg-white rounded-lg border p-3">
              <div className="font-medium text-sm mb-3 pb-2 border-b flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                {user.first_name} {user.last_name}
                {user.role && (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                    {user.role.name}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {(grouped[user.id] || []).map(appt => renderAppointmentCard(appt))}
                {(!grouped[user.id] || grouped[user.id].length === 0) && (
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

    return renderTimeGrid([selectedDate]);
  };

  const renderWeekView = () => {
    return renderTimeGrid(getWeekDays());
  };

  const renderListView = () => (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Hora</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Mascota</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Servicio</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Asignado</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Estado</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {filteredAppointments
            .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
            .map(appointment => {
              const assignedUser = tenantUsers.find(u => u.id === appointment.employee_id);
              const statusClass = STATUS_COLORS[appointment.status];

              return (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    {new Date(appointment.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm">{appointment.pet?.name}</div>
                    <div className="text-xs text-gray-500">
                      {appointment.owner?.first_name} {appointment.owner?.last_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{appointment.service?.name}</td>
                  <td className="px-4 py-3">
                    {assignedUser ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{assignedUser.first_name} {assignedUser.last_name}</span>
                        {assignedUser.role && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                            {assignedUser.role.name}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Sin asignar</span>
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
                          onClick={() => handleAttendAppointment(appointment)}
                          className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded"
                          title="Atender"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {appointment.status === 'in_progress' && (
                        <button
                          onClick={() => handleAttendAppointment(appointment)}
                          className="p-1.5 text-cyan-500 hover:bg-cyan-50 rounded"
                          title="Continuar atendiendo"
                        >
                          {appointment.service?.service_type === 'grooming' ? <Scissors className="w-4 h-4" /> : <Stethoscope className="w-4 h-4" />}
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
    return <LoadingSpinner message="Cargando agenda..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-600">Gestion de citas y asignacion de personal</p>
        </div>
        <button
          onClick={() => openNewAppointmentModal(selectedDate, 9)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          <Plus className="w-5 h-5" />
          Nueva cita
        </button>
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
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-100 rounded">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={goToToday} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded">
              Hoy
            </button>
            <button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-100 rounded">
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
            <option value="">Todos los usuarios</option>
            {tenantUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.first_name} {user.last_name} {user.role ? `(${user.role.name})` : ''}
              </option>
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

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={filterOnlyMine}
              onChange={e => setFilterOnlyMine(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
            />
            <span className="text-gray-700">Solo mis citas</span>
          </label>

          {(filterDepartment || filterEmployee || filterService || filterOnlyMine) && (
            <button
              onClick={() => {
                setFilterDepartment('');
                setFilterEmployee('');
                setFilterService('');
                setFilterOnlyMine(false);
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
        onClose={() => { setShowAssignModal(false); setSelectedAppointment(null); setEmployeeSearch(''); }}
        title="Asignar usuario"
        size="md"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-emerald-700 font-semibold text-lg">
                    {selectedAppointment.pet?.name?.charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{selectedAppointment.pet?.name}</div>
                  {selectedAppointment.owner && (
                    <div className="text-sm text-gray-600">
                      Dueno: {selectedAppointment.owner.first_name} {selectedAppointment.owner.last_name}
                    </div>
                  )}
                  <div className="text-sm text-gray-600">{selectedAppointment.service?.name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(selectedAppointment.scheduled_at).toLocaleString('es-MX', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario asignado
              </label>
              {renderUserSelector(
                employeeSearch,
                setEmployeeSearch,
                showEmployeeDropdown,
                setShowEmployeeDropdown,
                setAssignEmployeeId,
                filteredUsersForAssign,
                selectedUserForAssign,
                employeeDropdownRef
              )}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <button
                onClick={() => { setShowAssignModal(false); setSelectedAppointment(null); setEmployeeSearch(''); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssignEmployee}
                disabled={assigningUser}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
              >
                {assigningUser ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showNewAppointmentModal}
        onClose={() => setShowNewAppointmentModal(false)}
        title="Nueva cita"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha y hora *
              </label>
              <input
                type="datetime-local"
                value={newAppointmentData.scheduled_at}
                onChange={e => setNewAppointmentData({ ...newAppointmentData, scheduled_at: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duracion (minutos)
              </label>
              <input
                type="number"
                value={newAppointmentData.duration_minutes}
                onChange={e => setNewAppointmentData({ ...newAppointmentData, duration_minutes: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                min={15}
                step={15}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mascota *
            </label>
            <Autocomplete
              options={pets.map(p => ({
                value: p.id,
                label: getPetDisplayName(p)
              }))}
              value={newAppointmentData.pet_id}
              onChange={value => setNewAppointmentData({ ...newAppointmentData, pet_id: value })}
              placeholder="Buscar mascota por nombre o dueno..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Servicio
            </label>
            <Autocomplete
              options={services.filter(s => s.is_active).map(svc => ({
                value: svc.id,
                label: `${svc.name} - $${svc.price}`
              }))}
              value={newAppointmentData.service_id}
              onChange={value => setNewAppointmentData({ ...newAppointmentData, service_id: value })}
              placeholder="Buscar servicio..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario asignado
            </label>
            {renderUserSelector(
              newEmployeeSearch,
              setNewEmployeeSearch,
              showNewEmployeeDropdown,
              setShowNewEmployeeDropdown,
              (id) => setNewAppointmentData({ ...newAppointmentData, employee_id: id }),
              filteredUsersForNew,
              selectedUserForNew,
              newEmployeeDropdownRef
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              value={newAppointmentData.notes}
              onChange={e => setNewAppointmentData({ ...newAppointmentData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              rows={2}
              placeholder="Notas adicionales..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              onClick={() => setShowNewAppointmentModal(false)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateAppointment}
              disabled={creatingAppointment}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
            >
              {creatingAppointment ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear cita'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
