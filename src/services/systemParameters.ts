import { supabase } from '../lib/supabase';

export interface SystemParameter {
  id: string;
  tenant_id: string;
  code: string | null;
  type: string;
  name: string;
  description: string | null;
  value: Record<string, unknown>;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SystemParameterOption {
  value: string;
  label: string;
  description: string;
  parameter: SystemParameter;
}

export const PARAMETER_TYPES = [
  { code: 'species', name: 'Especies', description: 'Tipos de animales' },
  { code: 'breed', name: 'Razas', description: 'Razas por especie' },
  { code: 'vaccine', name: 'Vacunas', description: 'Catalogo de vacunas' },
  { code: 'service_type', name: 'Tipos de Servicio', description: 'Categorias de servicios' },
  { code: 'medication_route', name: 'Vias de Administracion', description: 'Vias para medicamentos' },
  { code: 'medication_frequency', name: 'Frecuencias', description: 'Frecuencias de medicacion' },
  { code: 'severity', name: 'Severidades', description: 'Niveles de gravedad' },
  { code: 'appointment_status', name: 'Estados de Cita', description: 'Estados para citas' },
  { code: 'payment_method', name: 'Metodos de Pago', description: 'Formas de pago aceptadas' },
  { code: 'custom', name: 'Personalizados', description: 'Parametros personalizados' }
];

export async function seedSystemParameters(tenantId: string): Promise<void> {
  await supabase.rpc('seed_tenant_system_parameters', { p_tenant_id: tenantId });
}

export async function getSystemParameters(tenantId: string, type?: string): Promise<SystemParameter[]> {
  await seedSystemParameters(tenantId);

  let query = supabase
    .from('system_parameters')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('type')
    .order('sort_order');

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getParametersByType(tenantId: string, type: string, activeOnly = true): Promise<SystemParameter[]> {
  let query = supabase
    .from('system_parameters')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('type', type)
    .order('sort_order');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getParameterOptionsByType(
  tenantId: string,
  type: string,
  activeOnly = true
): Promise<SystemParameterOption[]> {
  const parameters = await getParametersByType(tenantId, type, activeOnly);

  return parameters.map((parameter) => ({
    value: parameter.code || parameter.name,
    label: parameter.name,
    description: parameter.description || '',
    parameter
  }));
}

export async function createSystemParameter(
  tenantId: string,
  param: Partial<SystemParameter>
): Promise<SystemParameter> {
  const { data, error } = await supabase
    .from('system_parameters')
    .insert([{
      tenant_id: tenantId,
      code: param.code,
      type: param.type,
      name: param.name,
      description: param.description || null,
      value: param.value || {},
      parent_id: param.parent_id || null,
      sort_order: param.sort_order || 0,
      is_active: param.is_active ?? true,
      is_system: false,
      metadata: param.metadata || {}
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSystemParameter(
  id: string,
  updates: Partial<SystemParameter>
): Promise<SystemParameter> {
  const { data, error } = await supabase
    .from('system_parameters')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSystemParameter(id: string): Promise<void> {
  const { error } = await supabase
    .from('system_parameters')
    .delete()
    .eq('id', id)
    .eq('is_system', false);

  if (error) throw error;
}

export async function toggleParameterActive(id: string, isActive: boolean): Promise<SystemParameter> {
  return updateSystemParameter(id, { is_active: isActive });
}
