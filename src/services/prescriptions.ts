import { supabase } from '../lib/supabase';

export interface Prescription {
  id: string;
  tenant_id: string;
  consultation_id: string;
  pet_id: string;
  medication_id?: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration_days?: number;
  quantity?: string;
  route: string;
  instructions?: string;
  start_date: string;
  end_date?: string;
  veterinarian_id: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePrescriptionInput {
  consultation_id: string;
  pet_id: string;
  medication_id?: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration_days?: number;
  quantity?: string;
  route: string;
  instructions?: string;
  start_date?: string;
  end_date?: string;
  veterinarian_id: string;
  notes?: string;
}

export interface UpdatePrescriptionInput extends Partial<CreatePrescriptionInput> {
  status?: string;
}

export async function getPrescriptionsByConsultation(consultationId: string): Promise<Prescription[]> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('consultation_id', consultationId)
    .order('created_at');

  if (error) throw error;
  return data || [];
}

export async function getPrescriptionsByPet(petId: string): Promise<Prescription[]> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('pet_id', petId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createPrescription(tenantId: string, input: CreatePrescriptionInput): Promise<Prescription> {
  const { data, error } = await supabase
    .from('prescriptions')
    .insert([{ ...input, tenant_id: tenantId }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePrescription(id: string, input: UpdatePrescriptionInput): Promise<Prescription> {
  const { data, error } = await supabase
    .from('prescriptions')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePrescription(id: string): Promise<void> {
  const { error } = await supabase
    .from('prescriptions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
