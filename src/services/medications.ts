import { supabase } from '../lib/supabase';

export interface Medication {
  id: string;
  tenant_id: string;
  name: string;
  generic_name?: string;
  category: string;
  description?: string;
  dosage_forms?: string;
  manufacturer?: string;
  requires_prescription: boolean;
  warnings?: string;
  storage_instructions?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMedicationInput {
  name: string;
  generic_name?: string;
  category: string;
  description?: string;
  dosage_forms?: string;
  manufacturer?: string;
  requires_prescription?: boolean;
  warnings?: string;
  storage_instructions?: string;
}

export interface UpdateMedicationInput extends Partial<CreateMedicationInput> {
  is_active?: boolean;
}

export async function getMedications(tenantId: string): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getMedicationById(id: string): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createMedication(tenantId: string, input: CreateMedicationInput): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .insert([{ ...input, tenant_id: tenantId }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMedication(id: string, input: UpdateMedicationInput): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMedication(id: string): Promise<void> {
  const { error } = await supabase
    .from('medications')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
