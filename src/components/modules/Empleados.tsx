import { useState, useEffect } from 'react';
import { User, Plus, CreditCard as Edit2, Trash2, Calendar, Clock, Briefcase, Phone, Mail, Search, Loader } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useToast } from '../../contexts/ToastContext';
import { employeesService, Employee, EmployeeWithDetails, EmployeeSchedule } from '../../services/employees';
import { servicesService, Service } from '../../services/servicesAppointments';
import Modal from '../ui/Modal';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';
import LoadingSpinner from '../ui/LoadingSpinner';

const DEPARTMENTS = [
  { value: 'general', label: 'General' },
  { value: 'veterinary', label: 'Veterinaria' },
  { value: 'grooming', label: 'Estetica' },
  { value: 'daycare', label: 'Guarderia' },
  { value: 'store', label: 'Tienda' },
  { value: 'laboratory', label: 'Laboratorio' },
  { value: 'surgery', label: 'Cirugia' },
  { value: 'imaging', label: 'Imagenologia' },
  { value: 'reception', label: 'Recepcion' },
  { value: 'admin', label: 'Administracion' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miercoles', short: 'Mie' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sabado', short: 'Sab' },
];

export default function Empleados() {
  const { currentTenant } = useTenant();
  const { showSuccess, showError } = useToast();

  const [employees, setEmployees] = useState<EmployeeWithDetails[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithDetails | null>(null);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingServices, setSavingServices] = useState(false);

  const [formData, setFormData] = useState({
    employee_code: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: 'general',
    specializations: [] as string[],
    hire_date: new Date().toISOString().split('T')[0],
    is_active: true,
  });

  const [scheduleData, setScheduleData] = useState<Record<number, { enabled: boolean; start: string; end: string }>>({});
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [primaryService, setPrimaryService] = useState<string>('');

  useEffect(() => {
    if (currentTenant) {
      loadData();
    }
  }, [currentTenant]);

  const loadData = async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      const [emps, srvs] = await Promise.all([
        employeesService.getAll(currentTenant.id),
        servicesService.getAll(currentTenant.id),
      ]);
      setEmployees(emps);
      setServices(srvs);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = !searchTerm ||
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !filterDepartment || emp.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    if (!formData.first_name || !formData.last_name || !formData.employee_code) {
      showError('Completa los campos requeridos');
      return;
    }

    setSavingEmployee(true);

    try {
      if (editingEmployee) {
        await employeesService.update(editingEmployee.id, {
          ...formData,
          tenant_id: currentTenant.id,
        });
        showSuccess('Empleado actualizado');
      } else {
        await employeesService.create({
          ...formData,
          tenant_id: currentTenant.id,
          profile_id: null,
        });
        showSuccess('Empleado creado');
      }
      setShowModal(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error saving employee:', error);
      showError('Error al guardar empleado');
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!editingEmployee || !currentTenant) return;

    setSavingSchedule(true);

    try {
      const schedules: Omit<EmployeeSchedule, 'id' | 'tenant_id' | 'employee_id' | 'created_at' | 'updated_at'>[] = [];

      Object.entries(scheduleData).forEach(([day, data]) => {
        if (data.enabled && data.start && data.end) {
          schedules.push({
            day_of_week: parseInt(day),
            start_time: data.start,
            end_time: data.end,
            is_available: true,
            location_id: null,
          });
        }
      });

      await employeesService.setSchedule(currentTenant.id, editingEmployee.id, schedules);
      showSuccess('Horario guardado');
      setShowScheduleModal(false);
      await loadData();
    } catch (error) {
      console.error('Error saving schedule:', error);
      showError('Error al guardar horario');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleSaveServices = async () => {
    if (!editingEmployee || !currentTenant) return;

    setSavingServices(true);

    try {
      await employeesService.assignServices(currentTenant.id, editingEmployee.id, selectedServices, primaryService);
      showSuccess('Servicios asignados');
      setShowServicesModal(false);
      await loadData();
    } catch (error) {
      console.error('Error saving services:', error);
      showError('Error al asignar servicios');
    } finally {
      setSavingServices(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEmployee) return;

    try {
      await employeesService.delete(editingEmployee.id);
      showSuccess('Empleado eliminado');
      setShowDeleteModal(false);
      setEditingEmployee(null);
      await loadData();
    } catch (error) {
      console.error('Error deleting employee:', error);
      showError('Error al eliminar empleado');
    }
  };

  const openEdit = (employee: EmployeeWithDetails) => {
    setEditingEmployee(employee);
    setFormData({
      employee_code: employee.employee_code,
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email || '',
      phone: employee.phone || '',
      department: employee.department,
      specializations: employee.specializations || [],
      hire_date: employee.hire_date,
      is_active: employee.is_active,
    });
    setShowModal(true);
  };

  const openSchedule = (employee: EmployeeWithDetails) => {
    setEditingEmployee(employee);
    const schedule: Record<number, { enabled: boolean; start: string; end: string }> = {};
    DAYS_OF_WEEK.forEach(day => {
      const existing = employee.schedules?.find(s => s.day_of_week === day.value);
      schedule[day.value] = {
        enabled: !!existing,
        start: existing?.start_time || '09:00',
        end: existing?.end_time || '18:00',
      };
    });
    setScheduleData(schedule);
    setShowScheduleModal(true);
  };

  const openServices = (employee: EmployeeWithDetails) => {
    setEditingEmployee(employee);
    const assigned = employee.services?.map(s => s.service_id) || [];
    const primary = employee.services?.find(s => s.is_primary)?.service_id || '';
    setSelectedServices(assigned);
    setPrimaryService(primary);
    setShowServicesModal(true);
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      employee_code: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      department: 'general',
      specializations: [],
      hire_date: new Date().toISOString().split('T')[0],
      is_active: true,
    });
  };

  const getDeptLabel = (value: string) => DEPARTMENTS.find(d => d.value === value)?.label || value;

  if (loading) {
    return <LoadingSpinner message="Cargando empleados..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <p className="text-gray-600">Gestion de personal y horarios</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          <Plus className="w-5 h-5" />
          Nuevo empleado
        </button>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o codigo..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={filterDepartment}
            onChange={e => setFilterDepartment(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">Todos los departamentos</option>
            {DEPARTMENTS.map(dept => (
              <option key={dept.value} value={dept.value}>{dept.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEmployees.map(employee => (
          <div
            key={employee.id}
            className={`bg-white rounded-lg border p-4 ${!employee.is_active ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {employee.first_name} {employee.last_name}
                  </h3>
                  <p className="text-sm text-gray-500">{employee.employee_code}</p>
                </div>
              </div>
              {!employee.is_active && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                  Inactivo
                </span>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Briefcase className="w-4 h-4" />
                {getDeptLabel(employee.department)}
              </div>
              {employee.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  {employee.email}
                </div>
              )}
              {employee.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  {employee.phone}
                </div>
              )}
            </div>

            {employee.schedules && employee.schedules.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Horario:</p>
                <div className="flex gap-1">
                  {DAYS_OF_WEEK.map(day => {
                    const hasSchedule = employee.schedules?.some(s => s.day_of_week === day.value);
                    return (
                      <span
                        key={day.value}
                        className={`w-8 h-6 flex items-center justify-center text-xs rounded ${
                          hasSchedule ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {day.short[0]}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {employee.services && employee.services.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Servicios ({employee.services.length}):</p>
                <div className="flex flex-wrap gap-1">
                  {employee.services.slice(0, 3).map(s => (
                    <span
                      key={s.id}
                      className={`px-2 py-0.5 rounded text-xs ${
                        s.is_primary ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {s.service?.name}
                    </span>
                  ))}
                  {employee.services.length > 3 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                      +{employee.services.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-3 border-t">
              <button
                onClick={() => openEdit(employee)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={() => openSchedule(employee)}
                className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                title="Horario"
              >
                <Clock className="w-4 h-4" />
              </button>
              <button
                onClick={() => openServices(employee)}
                className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                title="Servicios"
              >
                <Briefcase className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setEditingEmployee(employee); setShowDeleteModal(true); }}
                className="flex items-center justify-center px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded hover:bg-red-50"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay empleados para mostrar</p>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingEmployee ? 'Editar empleado' : 'Nuevo empleado'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Codigo *
              </label>
              <input
                type="text"
                value={formData.employee_code}
                onChange={e => setFormData({ ...formData, employee_code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="EMP001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departamento
              </label>
              <select
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept.value} value={dept.value}>{dept.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido *
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de ingreso
            </label>
            <input
              type="date"
              value={formData.hire_date}
              onChange={e => setFormData({ ...formData, hire_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Empleado activo
            </label>
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
              disabled={savingEmployee}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
            >
              {savingEmployee ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>{editingEmployee ? 'Guardar cambios' : 'Crear empleado'}</>
              )}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title={`Horario de ${editingEmployee?.first_name || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          {DAYS_OF_WEEK.map(day => (
            <div key={day.value} className="flex items-center gap-4">
              <div className="w-24">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={scheduleData[day.value]?.enabled || false}
                    onChange={e => setScheduleData({
                      ...scheduleData,
                      [day.value]: { ...scheduleData[day.value], enabled: e.target.checked }
                    })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-sm font-medium">{day.label}</span>
                </label>
              </div>
              {scheduleData[day.value]?.enabled && (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={scheduleData[day.value]?.start || '09:00'}
                    onChange={e => setScheduleData({
                      ...scheduleData,
                      [day.value]: { ...scheduleData[day.value], start: e.target.value }
                    })}
                    className="px-2 py-1 border rounded text-sm"
                  />
                  <span className="text-gray-500">a</span>
                  <input
                    type="time"
                    value={scheduleData[day.value]?.end || '18:00'}
                    onChange={e => setScheduleData({
                      ...scheduleData,
                      [day.value]: { ...scheduleData[day.value], end: e.target.value }
                    })}
                    className="px-2 py-1 border rounded text-sm"
                  />
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              onClick={() => setShowScheduleModal(false)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveSchedule}
              disabled={savingSchedule}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
            >
              {savingSchedule ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar horario'
              )}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showServicesModal}
        onClose={() => setShowServicesModal(false)}
        title={`Servicios de ${editingEmployee?.first_name || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Selecciona los servicios que puede realizar este empleado.
          </p>

          <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3">
            {services.map(service => (
              <label key={service.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={selectedServices.includes(service.id)}
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedServices([...selectedServices, service.id]);
                    } else {
                      setSelectedServices(selectedServices.filter(id => id !== service.id));
                      if (primaryService === service.id) setPrimaryService('');
                    }
                  }}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <div className="flex-1">
                  <span className="font-medium text-sm">{service.name}</span>
                  <span className="text-xs text-gray-500 ml-2">({service.service_type})</span>
                </div>
                {selectedServices.includes(service.id) && (
                  <button
                    type="button"
                    onClick={() => setPrimaryService(primaryService === service.id ? '' : service.id)}
                    className={`px-2 py-0.5 text-xs rounded ${
                      primaryService === service.id
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {primaryService === service.id ? 'Principal' : 'Hacer principal'}
                  </button>
                )}
              </label>
            ))}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              onClick={() => setShowServicesModal(false)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveServices}
              disabled={savingServices}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
            >
              {savingServices ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar servicios'
              )}
            </button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setEditingEmployee(null); }}
        onConfirm={handleDelete}
        title="Eliminar empleado"
        message={`Esta seguro de eliminar a ${editingEmployee?.first_name} ${editingEmployee?.last_name}? Esta accion no se puede deshacer.`}
      />
    </div>
  );
}
