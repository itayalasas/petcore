import { supabase } from '../lib/supabase';

export type ServiceType = 'veterinary' | 'grooming' | 'daycare';

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  category: string;
  service_type: ServiceType;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  pet_id: string;
  owner_id: string;
  service_id?: string;
  veterinarian_id?: string;
  location_id?: string;
  employee_id?: string;
  case_id?: string;
  referral_id?: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  price?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentWithDetails extends Appointment {
  pet?: { id: string; name: string; species: string; breed: string };
  owner?: { id: string; first_name: string; last_name: string; phone: string };
  service?: Service;
  veterinarian?: { id: string; first_name: string; last_name: string };
  location?: { id: string; name: string };
  assigned_user?: { id: string; first_name: string; last_name: string };
}

export interface CreateServiceData {
  name: string;
  description?: string;
  category: string;
  duration_minutes?: number;
  price: number;
}

export interface CreateAppointmentData {
  pet_id: string;
  owner_id: string;
  service_id?: string;
  veterinarian_id?: string;
  location_id?: string;
  employee_id?: string;
  case_id?: string;
  referral_id?: string;
  scheduled_at: string;
  duration_minutes?: number;
  price?: number;
  reason?: string;
  notes?: string;
}

export const servicesService = {
  async getAll(tenantId: string): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getActive(tenantId: string): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Service | null> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(tenantId: string, serviceData: CreateServiceData): Promise<Service> {
    const { data, error } = await supabase
      .from('services')
      .insert([{
        ...serviceData,
        tenant_id: tenantId,
        duration_minutes: serviceData.duration_minutes || 30
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, serviceData: Partial<CreateServiceData>): Promise<Service> {
    const { data, error } = await supabase
      .from('services')
      .update({
        ...serviceData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async toggleActive(id: string, isActive: boolean): Promise<Service> {
    const { data, error } = await supabase
      .from('services')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

export const appointmentsService = {
  async getAll(tenantId: string): Promise<AppointmentWithDetails[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        pet:pets(id, name, species, breed),
        owner:owners(id, first_name, last_name, phone),
        service:services(*),
        veterinarian:profiles!appointments_veterinarian_id_fkey(id, first_name, last_name),
        location:locations(id, name),
        assigned_user:profiles!appointments_assigned_user_fkey(id, first_name, last_name)
      `)
      .eq('tenant_id', tenantId)
      .order('scheduled_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getUpcoming(tenantId: string): Promise<AppointmentWithDetails[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        pet:pets(*),
        owner:owners(*),
        service:services(*),
        veterinarian:profiles!appointments_veterinarian_id_fkey(*),
        location:locations(*),
        assigned_user:profiles!appointments_assigned_user_fkey(id, first_name, last_name)
      `)
      .eq('tenant_id', tenantId)
      .gte('scheduled_at', new Date().toISOString())
      .in('status', ['pending', 'confirmed'])
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getByDate(tenantId: string, date: string): Promise<AppointmentWithDetails[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        pet:pets(*),
        owner:owners(*),
        service:services(*),
        veterinarian:profiles!appointments_veterinarian_id_fkey(*),
        location:locations(*),
        assigned_user:profiles!appointments_assigned_user_fkey(id, first_name, last_name)
      `)
      .eq('tenant_id', tenantId)
      .gte('scheduled_at', startOfDay.toISOString())
      .lte('scheduled_at', endOfDay.toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(tenantId: string, appointmentData: CreateAppointmentData): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        ...appointmentData,
        tenant_id: tenantId,
        duration_minutes: appointmentData.duration_minutes || 30,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, appointmentData: Partial<CreateAppointmentData & { status?: string }>): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update({
        ...appointmentData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: Appointment['status']): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
