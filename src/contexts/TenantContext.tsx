import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import {
  getTenantSubscriptionInfo,
  getTenantModuleLicenses,
  canAddUser,
  canAddPet,
  hasFeature,
  SubscriptionInfo,
  ModuleLicenseInfo
} from '../services/licensing';
import { getLatestOpenBillingCheckout, type OpenBillingCheckoutSession } from '../services/billing';
import { detectTenantFromUrl } from '../utils/tenantDetection';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  settings: Record<string, any>;
  subscription_status: 'trial' | 'active' | 'suspended' | 'cancelled';
  subscription_plan: 'basic' | 'professional' | 'enterprise';
  trial_ends_at: string | null;
  max_users: number;
  max_pets: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'veterinarian' | 'staff' | 'member' | 'viewer';
  permissions: string[];
  is_active: boolean;
  joined_at: string | null;
  created_at: string;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  currentMembership: TenantMember | null;
  subscription: SubscriptionInfo | null;
  pendingBillingCheckout: OpenBillingCheckoutSession | null;
  moduleLicenses: ModuleLicenseInfo[];
  loading: boolean;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshTenant: () => Promise<void>;
  refreshModuleLicenses: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasModuleAccess: (moduleKey: string) => boolean;
  isAdmin: () => boolean;
  isOwner: () => boolean;
  canAddUser: () => Promise<boolean>;
  canAddPet: () => Promise<boolean>;
  hasFeature: (featureName: string) => Promise<boolean>;
  getMaxUsers: () => number;
  getMaxPets: () => number;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentMembership, setCurrentMembership] = useState<TenantMember | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [pendingBillingCheckout, setPendingBillingCheckout] = useState<OpenBillingCheckoutSession | null>(null);
  const [moduleLicenses, setModuleLicenses] = useState<ModuleLicenseInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTenantLicensing = async (tenantId: string) => {
    const [subscriptionInfo, modulesInfo, pendingCheckout] = await Promise.all([
      getTenantSubscriptionInfo(tenantId),
      getTenantModuleLicenses(tenantId),
      getLatestOpenBillingCheckout(tenantId)
    ]);

    setSubscription(subscriptionInfo);
    setModuleLicenses(modulesInfo);
    setPendingBillingCheckout(pendingCheckout);
  };

  const loadTenants = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: memberships, error: membershipsError } = await supabase
        .from('tenant_members')
        .select('*, tenant:tenants(*)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (membershipsError) throw membershipsError;

      if (memberships && memberships.length > 0) {
        const tenantsData = memberships.map((m: any) => m.tenant).filter(Boolean);
        setTenants(tenantsData);

        const urlDetection = detectTenantFromUrl();
        let tenantToUse: Tenant | null = null;

        if (urlDetection.method === 'subdomain' && urlDetection.slug) {
          tenantToUse = tenantsData.find((t: Tenant) => t.slug === urlDetection.slug);

          if (!tenantToUse) {
            console.error(`Subdomain ${urlDetection.slug} does not match any accessible tenant`);
            setLoading(false);
            return;
          }
        } else {
          const savedTenantId = localStorage.getItem('currentTenantId');
          tenantToUse = savedTenantId
            ? tenantsData.find((t: Tenant) => t.id === savedTenantId) || tenantsData[0]
            : tenantsData[0];
        }

        if (tenantToUse) {
          setCurrentTenant(tenantToUse);
          const membership = memberships.find((m: any) => m.tenant_id === tenantToUse.id);
          setCurrentMembership(membership || null);
          localStorage.setItem('currentTenantId', tenantToUse.id);
          await loadTenantLicensing(tenantToUse.id);
        }
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadTenants();
      } else {
        setCurrentTenant(null);
        setTenants([]);
        setCurrentMembership(null);
        setSubscription(null);
        setPendingBillingCheckout(null);
        setModuleLicenses([]);
        localStorage.removeItem('currentTenantId');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const switchTenant = async (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      setCurrentTenant(tenant);
      localStorage.setItem('currentTenantId', tenantId);

      const { data: membership } = await supabase
        .from('tenant_members')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      setCurrentMembership(membership);
      await loadTenantLicensing(tenantId);
    }
  };

  const refreshTenant = async () => {
    await loadTenants();
  };

  const refreshModuleLicenses = async () => {
    if (!currentTenant) return;
    const modulesInfo = await getTenantModuleLicenses(currentTenant.id);
    setModuleLicenses(modulesInfo);
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentMembership) return false;
    if (currentMembership.role === 'owner' || currentMembership.role === 'admin') return true;
    return currentMembership.permissions.includes(permission);
  };

  const hasModuleAccess = (moduleKey: string): boolean => {
    const moduleLicense = moduleLicenses.find((license) => license.module_key === moduleKey);

    if (moduleLicense) {
      return moduleLicense.effective_enabled;
    }

    return moduleKey === 'dashboard' || moduleKey === 'administracion' || moduleKey === 'configuracion';
  };

  const isAdmin = (): boolean => {
    return currentMembership?.role === 'admin' || currentMembership?.role === 'owner';
  };

  const isOwner = (): boolean => {
    return currentMembership?.role === 'owner';
  };

  const checkCanAddUser = async (): Promise<boolean> => {
    if (!currentTenant) return false;

    const { count } = await supabase
      .from('tenant_members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', currentTenant.id)
      .eq('is_active', true);

    return canAddUser(currentTenant.id, count || 0);
  };

  const checkCanAddPet = async (): Promise<boolean> => {
    if (!currentTenant) return false;

    const { count } = await supabase
      .from('pets')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', currentTenant.id);

    return canAddPet(currentTenant.id, count || 0);
  };

  const checkHasFeature = async (featureName: string): Promise<boolean> => {
    if (!currentTenant) return false;
    return hasFeature(currentTenant.id, featureName);
  };

  const getMaxUsers = (): number => {
    return subscription?.max_users ?? currentTenant?.max_users ?? 5;
  };

  const getMaxPets = (): number => {
    return subscription?.max_pets ?? currentTenant?.max_pets ?? 100;
  };

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        tenants,
        currentMembership,
        subscription,
        pendingBillingCheckout,
        moduleLicenses,
        loading,
        switchTenant,
        refreshTenant,
        refreshModuleLicenses,
        hasPermission,
        hasModuleAccess,
        isAdmin,
        isOwner,
        canAddUser: checkCanAddUser,
        canAddPet: checkCanAddPet,
        hasFeature: checkHasFeature,
        getMaxUsers,
        getMaxPets,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
