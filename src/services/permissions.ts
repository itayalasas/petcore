import { supabase } from '../lib/supabase';

export interface Permission {
  id: string;
  module: string;
  action: string;
  resource: string | null;
  description: string;
}

export interface Role {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
  user_count?: number;
}

export const permissionsService = {
  async getAllPermissions(): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('module, action, resource');

    if (error) throw error;
    return data || [];
  },

  async getRolesByTenant(tenantId: string): Promise<RoleWithPermissions[]> {
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select(`
        *,
        role_permissions (
          permission:permissions (
            id,
            module,
            action,
            resource,
            description
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .order('name');

    if (rolesError) throw rolesError;

    const { data: userCounts, error: countError } = await supabase
      .from('profiles')
      .select('role_id')
      .eq('tenant_id', tenantId);

    if (countError) throw countError;

    const counts = userCounts?.reduce((acc: Record<string, number>, profile: any) => {
      if (profile.role_id) {
        acc[profile.role_id] = (acc[profile.role_id] || 0) + 1;
      }
      return acc;
    }, {});

    return roles?.map((role: any) => ({
      ...role,
      permissions: role.role_permissions?.map((rp: any) => rp.permission) || [],
      user_count: counts?.[role.id] || 0
    })) || [];
  },

  async createRole(tenantId: string, name: string, description: string): Promise<Role> {
    const { data, error } = await supabase
      .from('roles')
      .insert([{
        tenant_id: tenantId,
        name,
        description,
        is_system: false
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateRole(roleId: string, name: string, description: string): Promise<Role> {
    const { data, error } = await supabase
      .from('roles')
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq('id', roleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteRole(roleId: string): Promise<void> {
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId);

    if (error) throw error;
  },

  async updateRolePermissions(tenantId: string, roleId: string, permissionIds: string[]): Promise<void> {
    await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId);

    if (permissionIds.length > 0) {
      const { error } = await supabase
        .from('role_permissions')
        .insert(
          permissionIds.map(permissionId => ({
            tenant_id: tenantId,
            role_id: roleId,
            permission_id: permissionId
          }))
        );

      if (error) throw error;
    }
  },

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const { data, error } = await supabase
      .rpc('get_user_permissions', { p_user_id: userId });

    if (error) throw error;
    return data || [];
  },

  async checkPermission(
    userId: string,
    module: string,
    action: string,
    resource?: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('user_has_permission', {
        p_user_id: userId,
        p_module: module,
        p_action: action,
        p_resource: resource || null
      });

    if (error) {
      console.error('Error checking permission:', error);
      return false;
    }

    return data || false;
  },

  groupPermissionsByModule(permissions: Permission[]): Record<string, Permission[]> {
    return permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  }
};
