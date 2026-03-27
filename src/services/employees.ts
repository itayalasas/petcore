import { supabase } from '../lib/supabase';

export interface Employee {
  id: string;
  tenant_id: string;
  profile_id: string | null;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  department: string;
  specializations: string[];
  hire_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeSchedule {
  id: string;
  tenant_id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  location_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeService {
  id: string;
  tenant_id: string;
  employee_id: string;
  service_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface EmployeeWithDetails extends Employee {
  schedules?: EmployeeSchedule[];
  services?: (EmployeeService & { service?: { id: string; name: string; service_type: string } })[];
  profile?: { first_name: string; last_name: string; email: string } | null;
}

export const employeesService = {
  async getAll(tenantId: string): Promise<EmployeeWithDetails[]> {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        profile:profiles(first_name, last_name, email),
        schedules:employee_schedules(*),
        services:employee_services(*, service:services(id, name, service_type))
      `)
      .eq('tenant_id', tenantId)
      .order('first_name');

    if (error) throw error;
    return data || [];
  },

  async getByDepartment(tenantId: string, department: string): Promise<EmployeeWithDetails[]> {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        profile:profiles(first_name, last_name, email),
        schedules:employee_schedules(*),
        services:employee_services(*, service:services(id, name, service_type))
      `)
      .eq('tenant_id', tenantId)
      .eq('department', department)
      .eq('is_active', true)
      .order('first_name');

    if (error) throw error;
    return data || [];
  },

  async getByService(tenantId: string, serviceId: string): Promise<EmployeeWithDetails[]> {
    const { data, error } = await supabase
      .from('employee_services')
      .select(`
        employee:employees(
          *,
          profile:profiles(first_name, last_name, email),
          schedules:employee_schedules(*)
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('service_id', serviceId);

    if (error) throw error;
    return (data || []).map(d => d.employee).filter(Boolean) as EmployeeWithDetails[];
  },

  async getById(id: string): Promise<EmployeeWithDetails | null> {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        profile:profiles(first_name, last_name, email),
        schedules:employee_schedules(*),
        services:employee_services(*, service:services(id, name, service_type))
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .insert([employee])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Employee>): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async setSchedule(tenantId: string, employeeId: string, schedules: Omit<EmployeeSchedule, 'id' | 'tenant_id' | 'employee_id' | 'created_at' | 'updated_at'>[]): Promise<void> {
    await supabase
      .from('employee_schedules')
      .delete()
      .eq('employee_id', employeeId);

    if (schedules.length > 0) {
      const { error } = await supabase
        .from('employee_schedules')
        .insert(schedules.map(s => ({ ...s, tenant_id: tenantId, employee_id: employeeId })));

      if (error) throw error;
    }
  },

  async assignServices(tenantId: string, employeeId: string, serviceIds: string[], primaryServiceId?: string): Promise<void> {
    await supabase
      .from('employee_services')
      .delete()
      .eq('employee_id', employeeId);

    if (serviceIds.length > 0) {
      const { error } = await supabase
        .from('employee_services')
        .insert(serviceIds.map(serviceId => ({
          tenant_id: tenantId,
          employee_id: employeeId,
          service_id: serviceId,
          is_primary: serviceId === primaryServiceId,
        })));

      if (error) throw error;
    }
  },

  async getAvailability(employeeId: string, date: Date): Promise<{ start_time: string; end_time: string } | null> {
    const dayOfWeek = date.getDay();

    const { data, error } = await supabase
      .from('employee_schedules')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)
      .maybeSingle();

    if (error) throw error;
    return data ? { start_time: data.start_time, end_time: data.end_time } : null;
  },

  async getAvailableEmployees(tenantId: string, serviceId: string, date: Date): Promise<EmployeeWithDetails[]> {
    const dayOfWeek = date.getDay();

    const { data, error } = await supabase
      .from('employee_services')
      .select(`
        employee:employees!inner(
          *,
          schedules:employee_schedules!inner(*)
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('service_id', serviceId)
      .eq('employees.is_active', true)
      .eq('employee_schedules.day_of_week', dayOfWeek)
      .eq('employee_schedules.is_available', true);

    if (error) throw error;
    return (data || []).map(d => d.employee).filter(Boolean) as EmployeeWithDetails[];
  },
};
