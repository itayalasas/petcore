import { supabase } from '../lib/supabase';
import type { Tenant, TenantMember } from '../contexts/TenantContext';
import { createTenantSubscription, canAddUser } from './licensing';

export interface CreateTenantData {
  name: string;
  slug: string;
  subscription_plan?: 'basic' | 'professional' | 'enterprise';
  max_users?: number;
  max_pets?: number;
}

export interface CreateTenantMemberData {
  tenant_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'veterinarian' | 'staff' | 'member' | 'viewer';
  permissions?: string[];
}

export const tenantsService = {
  async createTenant(data: CreateTenantData): Promise<Tenant> {
    const planName = data.subscription_plan || 'basic';

    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert([{
        ...data,
        subscription_status: 'trial',
        subscription_plan: planName,
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await this.addMember({
        tenant_id: tenant.id,
        user_id: user.id,
        role: 'owner'
      });
    }

    await createTenantSubscription(tenant.id, planName);

    return tenant as Tenant;
  },

  async getTenantById(id: string): Promise<Tenant | null> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as Tenant;
  },

  async getUserTenants(): Promise<Tenant[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: memberships, error } = await supabase
      .from('tenant_members')
      .select('tenant:tenants(*)')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) throw error;

    return memberships?.map((m: any) => m.tenant).filter(Boolean) || [];
  },

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
    const { data, error } = await supabase
      .from('tenants')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Tenant;
  },

  async addMember(data: CreateTenantMemberData): Promise<TenantMember> {
    const { count } = await supabase
      .from('tenant_members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', data.tenant_id)
      .eq('is_active', true);

    const canAdd = await canAddUser(data.tenant_id, count || 0);
    if (!canAdd) {
      throw new Error('Has alcanzado el límite de usuarios para tu plan actual. Actualiza tu suscripción para agregar más usuarios.');
    }

    const { data: member, error } = await supabase
      .from('tenant_members')
      .insert([{
        ...data,
        joined_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return member as TenantMember;
  },

  async getTenantMembers(tenantId: string): Promise<TenantMember[]> {
    const { data, error } = await supabase
      .from('tenant_members')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (error) throw error;
    return data as TenantMember[];
  },

  async updateMember(id: string, updates: Partial<TenantMember>): Promise<TenantMember> {
    const { data, error } = await supabase
      .from('tenant_members')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as TenantMember;
  },

  async removeMember(id: string): Promise<void> {
    const { error } = await supabase
      .from('tenant_members')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  async checkSlugAvailability(slug: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    return data === null;
  },

  async getTenantStats(tenantId: string) {
    const [petsCount, usersCount, bookingsCount] = await Promise.all([
      supabase.from('pets').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabase.from('tenant_members').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_active', true),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId)
    ]);

    return {
      pets: petsCount.count || 0,
      users: usersCount.count || 0,
      bookings: bookingsCount.count || 0
    };
  }
};
