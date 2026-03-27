import { supabase } from '../lib/supabase';

export interface Treatment {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  description?: string;
  protocol?: string;
  duration_days?: number;
  frequency?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTreatmentInput {
  name: string;
  category: string;
  description?: string;
  protocol?: string;
  duration_days?: number;
  frequency?: string;
}

export interface UpdateTreatmentInput extends Partial<CreateTreatmentInput> {
  is_active?: boolean;
}

export async function getTreatments(tenantId: string): Promise<Treatment[]> {
  const { data, error } = await supabase
    .from('treatments')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getTreatmentById(id: string): Promise<Treatment> {
  const { data, error } = await supabase
    .from('treatments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createTreatment(tenantId: string, input: CreateTreatmentInput): Promise<Treatment> {
  const { data, error } = await supabase
    .from('treatments')
    .insert([{ ...input, tenant_id: tenantId }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTreatment(id: string, input: UpdateTreatmentInput): Promise<Treatment> {
  const { data, error } = await supabase
    .from('treatments')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTreatment(id: string): Promise<void> {
  const { error } = await supabase
    .from('treatments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
