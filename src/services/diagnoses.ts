import { supabase } from '../lib/supabase';

export interface Diagnosis {
  id: string;
  tenant_id: string;
  code?: string;
  name: string;
  category: string;
  description?: string;
  symptoms?: string;
  recommended_tests?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDiagnosisInput {
  code?: string;
  name: string;
  category: string;
  description?: string;
  symptoms?: string;
  recommended_tests?: string;
}

export interface UpdateDiagnosisInput extends Partial<CreateDiagnosisInput> {
  is_active?: boolean;
}

export async function getDiagnoses(tenantId: string): Promise<Diagnosis[]> {
  const { data, error } = await supabase
    .from('diagnoses')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getDiagnosisById(id: string): Promise<Diagnosis> {
  const { data, error } = await supabase
    .from('diagnoses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createDiagnosis(tenantId: string, input: CreateDiagnosisInput): Promise<Diagnosis> {
  const { data, error } = await supabase
    .from('diagnoses')
    .insert([{ ...input, tenant_id: tenantId }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDiagnosis(id: string, input: UpdateDiagnosisInput): Promise<Diagnosis> {
  const { data, error } = await supabase
    .from('diagnoses')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDiagnosis(id: string): Promise<void> {
  const { error } = await supabase
    .from('diagnoses')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
