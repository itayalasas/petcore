import { supabase } from '../lib/supabase';
import { canAddPet } from './licensing';

export interface Pet {
  id: string;
  tenant_id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  age_display: {
    value: number;
    unit: string;
  };
  gender: string;
  weight: number;
  weight_display: {
    value: number;
    unit: string;
  };
  is_neutered: boolean;
  has_chip: boolean;
  chip_number: string | null;
  photo_url: string | null;
  color: string | null;
  personality: string[];
  medical_notes: string | null;
  owner_id: string;
  created_at: string;
  owner?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    document_id?: string;
    address?: string;
    city?: string;
  };
}

export interface PetHealth {
  id: string;
  tenant_id: string;
  pet_id: string;
  user_id: string;
  type: string;
  name: string | null;
  application_date: string | null;
  diagnosis_date: string | null;
  next_due_date: string | null;
  veterinarian: string | null;
  treatment: string | null;
  symptoms: string | null;
  severity: string | null;
  product_name: string | null;
  notes: string | null;
  status: string | null;
  weight: string | null;
  weight_unit: string | null;
  date: string | null;
  created_at: string;
}

export interface PetService {
  id: string;
  tenant_id: string;
  pet_id: string;
  service_id?: string | null;
  service_name: string;
  service_type: 'grooming' | 'bathing' | 'nail_trim' | 'haircut' | 'spa' | 'dental' | 'other';
  performed_by?: string | null;
  performed_at: string;
  duration_minutes?: number | null;
  notes?: string | null;
  before_photo_url?: string | null;
  after_photo_url?: string | null;
  price: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  performer?: {
    id: string;
    display_name: string;
  } | null;
}

export const petsService = {
  async getAllPets(tenantId?: string) {
    let query = supabase
      .from('pets')
      .select(`
        *,
        owner:owners!owner_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          document_id,
          address,
          city
        )
      `);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data as Pet[];
  },

  async getPetsPage(tenantId: string, page: number, pageSize: number) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('pets')
      .select(`
        *,
        owner:owners!owner_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          document_id,
          address,
          city
        )
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: data as Pet[], count: count || 0 };
  },

  async getPetById(id: string, tenantId?: string) {
    let query = supabase
      .from('pets')
      .select(`
        *,
        owner:owners!owner_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          document_id,
          address,
          city
        )
      `)
      .eq('id', id);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.single();

    if (error) throw error;
    return data as Pet;
  },

  async getPetHealthRecords(petId: string, tenantId?: string) {
    let query = supabase
      .from('pet_health')
      .select('*')
      .eq('pet_id', petId);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data as PetHealth[];
  },

  async getVaccines(petId: string, tenantId?: string) {
    let query = supabase
      .from('pet_health')
      .select('*')
      .eq('pet_id', petId)
      .eq('type', 'vaccine');

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.order('application_date', { ascending: false });

    if (error) throw error;
    return data as PetHealth[];
  },

  async createPet(pet: Partial<Pet>) {
    if (!pet.tenant_id) {
      throw new Error('tenant_id is required');
    }

    const { count } = await supabase
      .from('pets')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', pet.tenant_id);

    const canAdd = await canAddPet(pet.tenant_id, count || 0);
    if (!canAdd) {
      throw new Error('Has alcanzado el límite de mascotas para tu plan actual. Actualiza tu suscripción para agregar más mascotas.');
    }

    const { data, error } = await supabase
      .from('pets')
      .insert([pet])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePet(id: string, updates: Partial<Pet>, tenantId?: string) {
    let query = supabase
      .from('pets')
      .update(updates)
      .eq('id', id);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.select().single();

    if (error) throw error;
    return data;
  },

  async deletePet(id: string, tenantId?: string) {
    let query = supabase
      .from('pets')
      .delete()
      .eq('id', id);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { error } = await query;

    if (error) throw error;
  },

  async searchPets(query: string, tenantId?: string) {
    let queryBuilder = supabase
      .from('pets')
      .select(`
        *,
        owner:owners!owner_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          document_id
        )
      `)
      .or(`name.ilike.%${query}%,breed.ilike.%${query}%`);

    if (tenantId) {
      queryBuilder = queryBuilder.eq('tenant_id', tenantId);
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: false });

    if (error) throw error;
    return data as Pet[];
  },

  async getPetsByOwner(ownerId: string, tenantId?: string) {
    let query = supabase
      .from('pets')
      .select('*')
      .eq('owner_id', ownerId);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data as Pet[];
  },

  async getBookingsByPet(petId: string, tenantId?: string) {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        partner:partners (
          business_name,
          business_type
        ),
        service:partner_services (
          name,
          category
        )
      `)
      .eq('pet_id', petId);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getConsultationsByPet(petId: string, tenantId?: string) {
    let query = supabase
      .from('consultations')
      .select(`
        id,
        date,
        reason,
        symptoms,
        diagnosis,
        treatment,
        weight,
        temperature,
        heart_rate,
        notes,
        status,
        veterinarian:profiles!consultations_veterinarian_id_fkey (
          id,
          display_name
        )
      `)
      .eq('pet_id', petId);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getConsultationDetails(consultationId: string, tenantId?: string) {
    const [consultationResult, diagnosesResult, treatmentsResult, prescriptionsResult] = await Promise.all([
      supabase
        .from('consultations')
        .select(`
          id,
          date,
          reason,
          symptoms,
          diagnosis,
          treatment,
          weight,
          temperature,
          heart_rate,
          notes,
          status,
          veterinarian:profiles!consultations_veterinarian_id_fkey (
            id,
            display_name
          )
        `)
        .eq('id', consultationId)
        .maybeSingle(),
      supabase
        .from('consultation_diagnoses')
        .select('*')
        .eq('consultation_id', consultationId),
      supabase
        .from('consultation_treatments')
        .select('*')
        .eq('consultation_id', consultationId),
      supabase
        .from('prescriptions')
        .select('*')
        .eq('consultation_id', consultationId)
    ]);

    if (consultationResult.error) throw consultationResult.error;
    if (diagnosesResult.error) throw diagnosesResult.error;
    if (treatmentsResult.error) throw treatmentsResult.error;
    if (prescriptionsResult.error) throw prescriptionsResult.error;

    return {
      consultation: consultationResult.data,
      diagnoses: diagnosesResult.data || [],
      treatments: treatmentsResult.data || [],
      prescriptions: prescriptionsResult.data || []
    };
  },

  async getPetServices(petId: string, tenantId?: string) {
    let query = supabase
      .from('pet_services')
      .select(`
        *,
        performer:profiles!pet_services_performed_by_fkey (
          id,
          display_name
        )
      `)
      .eq('pet_id', petId);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.order('performed_at', { ascending: false });

    if (error) throw error;
    return data as PetService[];
  },

  async createPetService(service: Partial<PetService>) {
    const { data, error } = await supabase
      .from('pet_services')
      .insert([service])
      .select(`
        *,
        performer:profiles!pet_services_performed_by_fkey (
          id,
          display_name
        )
      `)
      .single();

    if (error) throw error;
    return data as PetService;
  },

  async updatePetService(id: string, updates: Partial<PetService>, tenantId?: string) {
    let query = supabase
      .from('pet_services')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.select(`
      *,
      performer:profiles!pet_services_performed_by_fkey (
        id,
        display_name
      )
    `).single();

    if (error) throw error;
    return data as PetService;
  },

  async deletePetService(id: string, tenantId?: string) {
    let query = supabase
      .from('pet_services')
      .delete()
      .eq('id', id);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { error } = await query;

    if (error) throw error;
  }
};
