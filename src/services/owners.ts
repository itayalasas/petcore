import { supabase } from '../lib/supabase';

export interface Owner {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  document_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOwnerData {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  document_id?: string;
  notes?: string;
}

export interface UpdateOwnerData extends Partial<CreateOwnerData> {
  id: string;
}

export const ownersService = {
  async getAll(tenantId: string): Promise<Owner[]> {
    const { data, error } = await supabase
      .from('owners')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Owner | null> {
    const { data, error } = await supabase
      .from('owners')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(tenantId: string, ownerData: CreateOwnerData): Promise<Owner> {
    const { data, error } = await supabase
      .from('owners')
      .insert([{
        ...ownerData,
        tenant_id: tenantId,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, ownerData: Partial<CreateOwnerData>): Promise<Owner> {
    const { data, error } = await supabase
      .from('owners')
      .update({
        ...ownerData,
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
      .from('owners')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async search(tenantId: string, query: string): Promise<Owner[]> {
    const { data, error } = await supabase
      .from('owners')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,document_id.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPetsCount(ownerId: string): Promise<number> {
    const { count, error } = await supabase
      .from('pets')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', ownerId);

    if (error) throw error;
    return count || 0;
  }
};
