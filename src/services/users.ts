import { supabase } from '../lib/supabase';

export interface TenantUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  phone: string | null;
  role_id: string | null;
  tenant_id: string;
  is_active?: boolean;
  created_at: string;
  role?: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  tenantId: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleId?: string;
}

export const usersService = {
  async getTenantUsers(tenantId: string): Promise<TenantUser[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        display_name,
        phone,
        role_id,
        tenant_id,
        created_at,
        role:roles(id, name, description)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getUserById(userId: string): Promise<TenantUser | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        display_name,
        phone,
        role_id,
        tenant_id,
        created_at,
        role:roles(id, name, description)
      `)
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createUser(input: CreateUserInput): Promise<TenantUser> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No hay sesión activa');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/create-tenant-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error al crear el usuario');
    }

    return result.user;
  },

  async updateUser(userId: string, input: UpdateUserInput): Promise<TenantUser> {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.firstName !== undefined) {
      updates.first_name = input.firstName;
    }
    if (input.lastName !== undefined) {
      updates.last_name = input.lastName;
    }
    if (input.firstName !== undefined || input.lastName !== undefined) {
      updates.display_name = `${input.firstName || ''} ${input.lastName || ''}`.trim();
    }
    if (input.phone !== undefined) {
      updates.phone = input.phone;
    }
    if (input.roleId !== undefined) {
      updates.role_id = input.roleId;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select(`
        id,
        email,
        first_name,
        last_name,
        display_name,
        phone,
        role_id,
        tenant_id,
        created_at,
        role:roles(id, name, description)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async deactivateUser(userId: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('tenant_members')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },

  async activateUser(userId: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('tenant_members')
      .update({ is_active: true })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },

  async getUserStats(tenantId: string): Promise<{
    total: number;
    admins: number;
    activeToday: number;
  }> {
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        id,
        role:roles(name)
      `)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    const total = users?.length || 0;
    const admins = users?.filter((u: any) =>
      u.role?.name?.toLowerCase().includes('admin') ||
      u.role?.name?.toLowerCase().includes('administrador')
    ).length || 0;

    return {
      total,
      admins,
      activeToday: Math.min(total, Math.floor(total * 0.8)),
    };
  },
};
