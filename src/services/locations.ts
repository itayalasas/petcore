import { supabase } from '../lib/supabase';

export interface Location {
  id: string;
  tenant_id: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationData {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
}

export const locationsService = {
  async getAll(tenantId: string): Promise<Location[]> {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getActive(tenantId: string): Promise<Location[]> {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Location | null> {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(tenantId: string, locationData: CreateLocationData): Promise<Location> {
    const { data, error } = await supabase
      .from('locations')
      .insert([{
        ...locationData,
        tenant_id: tenantId,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, locationData: Partial<CreateLocationData>): Promise<Location> {
    const { data, error } = await supabase
      .from('locations')
      .update({
        ...locationData,
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
      .from('locations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async toggleActive(id: string, isActive: boolean): Promise<Location> {
    const { data, error } = await supabase
      .from('locations')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
