import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  photo_url: string | null;
  is_owner: boolean;
  is_partner: boolean;
  location: string | null;
  bio: string | null;
  calle: string | null;
  numero: string | null;
  barrio: string | null;
  codigo_postal: string | null;
  country_id: string | null;
  department_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface VeterinarianProfile extends Profile {
  role: 'owner' | 'admin' | 'veterinarian';
}

export const profilesService = {
  async getAllProfiles(tenantId?: string) {
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('is_owner', true);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.order('display_name', { ascending: true });

    if (error) throw error;
    return data as Profile[];
  },

  async getProfileById(id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Profile;
  },

  async createProfile(profile: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .insert([profile])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProfile(id: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async searchProfiles(query: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_owner', true)
      .or(`display_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
      .order('display_name', { ascending: true });

    if (error) throw error;
    return data as Profile[];
  },

  async getVeterinarians(tenantId: string) {
    const { data: memberships, error: membershipsError } = await supabase
      .from('tenant_members')
      .select('user_id, role')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .in('role', ['veterinarian', 'admin', 'owner']);

    if (membershipsError) throw membershipsError;

    const uniqueMemberships = Array.from(
      new Map((memberships || []).map((membership) => [membership.user_id, membership])).values()
    );

    if (uniqueMemberships.length === 0) {
      return [] as VeterinarianProfile[];
    }

    const profileIds = uniqueMemberships.map((membership) => membership.user_id);

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', profileIds)
      .order('display_name', { ascending: true });

    if (profilesError) throw profilesError;

    const roleByUserId = new Map(uniqueMemberships.map((membership) => [membership.user_id, membership.role]));

    return (profiles || []).map((profile) => ({
      ...profile,
      role: roleByUserId.get(profile.id) || 'veterinarian'
    })) as VeterinarianProfile[];
  }
};
