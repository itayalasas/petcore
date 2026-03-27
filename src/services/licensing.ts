import { supabase } from '../lib/supabase';

const PLATFORM_ADMIN_CACHE_KEY = 'platformAdminAccess';

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  max_users: number;
  max_pets: number;
  features: Record<string, boolean>;
  is_active: boolean;
  trial_days: number;
}

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: 'trial' | 'active' | 'suspended' | 'cancelled';
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string | null;
  cancelled_at: string | null;
  plan: SubscriptionPlan;
}

export interface SubscriptionInfo {
  plan_name: string;
  plan_display_name: string;
  status: string;
  max_users: number;
  max_pets: number;
  features: Record<string, boolean>;
  trial_ends_at: string | null;
  is_trial: boolean;
}

export interface ModuleLicenseInfo {
  module_key: string;
  display_name: string;
  description: string | null;
  category: string;
  is_core: boolean;
  plan_enabled: boolean;
  platform_enabled: boolean | null;
  effective_enabled: boolean;
  license_source: 'core' | 'plan' | 'platform_entitlement' | 'none';
  sort_order: number;
}

export interface PlanCatalogModule {
  module_key: string;
  display_name: string;
  description: string | null;
  category: string;
  is_core: boolean;
  default_enabled: boolean;
  sort_order: number;
  plan_enabled: boolean;
}

export interface PlatformAdminProfile {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: 'platform_owner' | 'platform_admin' | 'billing_admin';
  is_active: boolean;
}

interface PlatformAdminCacheRecord {
  userId: string;
  profile: PlatformAdminProfile;
}

export interface PlatformTenantSummary {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  subscription_status: TenantSubscription['status'];
  subscription_plan: SubscriptionPlan['name'];
  trial_ends_at: string | null;
  subscription: {
    id: string;
    plan_id: string;
    status: TenantSubscription['status'];
    trial_ends_at: string | null;
    current_period_end: string | null;
    cancelled_at: string | null;
    plan: Pick<SubscriptionPlan, 'id' | 'name' | 'display_name' | 'price_monthly'> | null;
  } | null;
}

export interface UpdatePlatformTenantSubscriptionInput {
  planId: string;
  status: TenantSubscription['status'];
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  cancelledAt?: string | null;
}

export interface UpsertSubscriptionPlanInput {
  name: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  maxUsers: number;
  maxPets: number;
  trialDays: number;
  isActive: boolean;
  features: Record<string, boolean>;
}

export async function getAllPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_monthly', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getPlatformPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('price_monthly', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createSubscriptionPlan(input: UpsertSubscriptionPlanInput): Promise<SubscriptionPlan> {
  const payload = {
    name: input.name,
    display_name: input.displayName,
    description: input.description,
    price_monthly: input.priceMonthly,
    max_users: input.maxUsers,
    max_pets: input.maxPets,
    trial_days: input.trialDays,
    is_active: input.isActive,
    features: input.features,
  };

  const { data, error } = await supabase
    .from('subscription_plans')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as SubscriptionPlan;
}

export async function updateSubscriptionPlan(planId: string, input: UpsertSubscriptionPlanInput): Promise<SubscriptionPlan> {
  const payload = {
    name: input.name,
    display_name: input.displayName,
    description: input.description,
    price_monthly: input.priceMonthly,
    max_users: input.maxUsers,
    max_pets: input.maxPets,
    trial_days: input.trialDays,
    is_active: input.isActive,
    features: input.features,
  };

  const { data, error } = await supabase
    .from('subscription_plans')
    .update(payload)
    .eq('id', planId)
    .select('*')
    .single();

  if (error) throw error;
  return data as SubscriptionPlan;
}

export async function getTenantSubscription(tenantId: string): Promise<TenantSubscription | null> {
  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .select(`
      *,
      plan:subscription_plans(*)
    `)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getTenantSubscriptionInfo(tenantId: string): Promise<SubscriptionInfo | null> {
  const { data, error } = await supabase
    .rpc('get_tenant_subscription', { p_tenant_id: tenantId })
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function checkSubscriptionLimit(
  tenantId: string,
  limitType: 'users' | 'pets',
  currentCount: number
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('check_subscription_limit', {
      p_tenant_id: tenantId,
      p_limit_type: limitType,
      p_current_count: currentCount
    });

  if (error) throw error;
  return data ?? true;
}

export async function canAddUser(tenantId: string, currentUserCount: number): Promise<boolean> {
  return checkSubscriptionLimit(tenantId, 'users', currentUserCount);
}

export async function canAddPet(tenantId: string, currentPetCount: number): Promise<boolean> {
  return checkSubscriptionLimit(tenantId, 'pets', currentPetCount);
}

export async function hasFeature(tenantId: string, featureName: string): Promise<boolean> {
  const subscriptionInfo = await getTenantSubscriptionInfo(tenantId);
  if (!subscriptionInfo) return false;

  return subscriptionInfo.features[featureName] === true;
}

export async function getTenantModuleLicenses(tenantId: string): Promise<ModuleLicenseInfo[]> {
  const { data, error } = await supabase
    .rpc('get_tenant_module_licenses', { p_tenant_id: tenantId });

  if (error) throw error;
  return (data || []) as ModuleLicenseInfo[];
}

export async function getPlanCatalogModules(planId?: string | null): Promise<PlanCatalogModule[]> {
  const [{ data: modules, error: modulesError }, licensesResult] = await Promise.all([
    supabase
      .from('module_catalog')
      .select('module_key, display_name, description, category, is_core, default_enabled, sort_order')
      .order('sort_order', { ascending: true }),
    planId
      ? supabase
          .from('plan_module_licenses')
          .select('module_key, is_enabled')
          .eq('plan_id', planId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (modulesError) throw modulesError;
  if (licensesResult.error) throw licensesResult.error;

  const enabledByModule = new Map(
    (licensesResult.data || [])
      .filter((license: any) => license.is_enabled)
      .map((license: any) => [license.module_key, true])
  );

  return (modules || []).map((module: any) => ({
    module_key: module.module_key,
    display_name: module.display_name,
    description: module.description,
    category: module.category,
    is_core: module.is_core,
    default_enabled: module.default_enabled,
    sort_order: module.sort_order,
    plan_enabled: enabledByModule.has(module.module_key),
  })) as PlanCatalogModule[];
}

export async function savePlanCatalogModules(planId: string, moduleKeys: string[]): Promise<void> {
  const normalizedKeys = Array.from(new Set(moduleKeys));

  const { data: existingRows, error: existingError } = await supabase
    .from('plan_module_licenses')
    .select('module_key')
    .eq('plan_id', planId);

  if (existingError) throw existingError;

  const existingKeys = new Set((existingRows || []).map((row: any) => row.module_key));
  const desiredKeys = new Set(normalizedKeys);

  const keysToInsert = normalizedKeys.filter((key) => !existingKeys.has(key));
  const keysToDelete = Array.from(existingKeys).filter((key) => !desiredKeys.has(key));

  if (keysToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('plan_module_licenses')
      .insert(keysToInsert.map((moduleKey) => ({
        plan_id: planId,
        module_key: moduleKey,
        is_enabled: true,
      })));

    if (insertError) throw insertError;
  }

  if (keysToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('plan_module_licenses')
      .delete()
      .eq('plan_id', planId)
      .in('module_key', keysToDelete);

    if (deleteError) throw deleteError;
  }
}

export async function getCurrentPlatformAdmin(userId?: string | null): Promise<PlatformAdminProfile | null> {
  let resolvedUserId = userId ?? null;

  console.log('[licensing] getCurrentPlatformAdmin:start', {
    providedUserId: userId ?? null,
  });

  if (!resolvedUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    resolvedUserId = user?.id ?? null;
    console.log('[licensing] getCurrentPlatformAdmin:fallback-user', {
      resolvedUserId,
    });
  }

  if (!resolvedUserId) {
    console.log('[licensing] getCurrentPlatformAdmin:no-user');
    return null;
  }

  const readCachedPlatformAdmin = (): PlatformAdminProfile | null => {
    try {
      const raw = localStorage.getItem(PLATFORM_ADMIN_CACHE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as PlatformAdminCacheRecord;
      if (parsed.userId !== resolvedUserId) {
        return null;
      }

      return parsed.profile;
    } catch {
      return null;
    }
  };

  const writeCachedPlatformAdmin = (profile: PlatformAdminProfile | null) => {
    try {
      if (!profile) {
        localStorage.removeItem(PLATFORM_ADMIN_CACHE_KEY);
        return;
      }

      localStorage.setItem(PLATFORM_ADMIN_CACHE_KEY, JSON.stringify({
        userId: resolvedUserId,
        profile,
      } satisfies PlatformAdminCacheRecord));
    } catch {
      // Ignore cache write failures.
    }
  };

  try {
    const { data: directProfile, error: directError } = await withTimeout(
      supabase
        .from('platform_admins')
        .select('user_id, role, is_active')
        .eq('user_id', resolvedUserId)
        .eq('is_active', true)
        .maybeSingle(),
      8000,
      'platform_admins lookup'
    );

    if (directError) {
      throw directError;
    }

    if (directProfile) {
      const profile: PlatformAdminProfile = {
        user_id: directProfile.user_id,
        email: null,
        display_name: null,
        role: directProfile.role,
        is_active: directProfile.is_active,
      };

      console.log('[licensing] getCurrentPlatformAdmin:direct-done', { profile });
      writeCachedPlatformAdmin(profile);
      return profile;
    }

    console.log('[licensing] getCurrentPlatformAdmin:direct-none');
    writeCachedPlatformAdmin(null);
    return null;
  } catch (directLookupError) {
    console.error('[licensing] getCurrentPlatformAdmin:direct-error', directLookupError);

    const cachedProfile = readCachedPlatformAdmin();
    if (cachedProfile) {
      console.warn('[licensing] getCurrentPlatformAdmin:using-cache-after-error', {
        userId: resolvedUserId,
        cachedRole: cachedProfile.role,
      });
      return cachedProfile;
    }

    console.log('[licensing] getCurrentPlatformAdmin:no-cache-returning-null');
    return null;
  }
}

export async function getPlatformTenantSummaries(): Promise<PlatformTenantSummary[]> {
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, name, slug, is_active, subscription_status, subscription_plan, trial_ends_at')
    .order('created_at', { ascending: false });

  if (tenantsError) throw tenantsError;

  const tenantIds = (tenants || []).map((tenant) => tenant.id);

  if (tenantIds.length === 0) {
    return [];
  }

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from('tenant_subscriptions')
    .select(`
      id,
      tenant_id,
      plan_id,
      status,
      trial_ends_at,
      current_period_end,
      cancelled_at,
      plan:subscription_plans(id, name, display_name, price_monthly)
    `)
    .in('tenant_id', tenantIds);

  if (subscriptionsError) throw subscriptionsError;

  const subscriptionsByTenant = new Map(
    (subscriptions || []).map((subscription: any) => [subscription.tenant_id, subscription])
  );

  return (tenants || []).map((tenant: any) => {
    const subscription = subscriptionsByTenant.get(tenant.id);

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      is_active: tenant.is_active,
      subscription_status: tenant.subscription_status,
      subscription_plan: tenant.subscription_plan,
      trial_ends_at: tenant.trial_ends_at,
      subscription: subscription
        ? {
            id: subscription.id,
            plan_id: subscription.plan_id,
            status: subscription.status,
            trial_ends_at: subscription.trial_ends_at,
            current_period_end: subscription.current_period_end,
            cancelled_at: subscription.cancelled_at,
            plan: subscription.plan ?? null
          }
        : null
    } as PlatformTenantSummary;
  });
}

export async function updatePlatformTenantModuleEntitlement(
  tenantId: string,
  moduleKey: string,
  isEnabled: boolean
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('tenant_module_entitlements')
    .upsert({
      tenant_id: tenantId,
      module_key: moduleKey,
      is_enabled: isEnabled,
      managed_by: user?.id ?? null
    }, {
      onConflict: 'tenant_id,module_key'
    });

  if (error) throw error;
}

export async function clearPlatformTenantModuleEntitlement(
  tenantId: string,
  moduleKey: string
): Promise<void> {
  const { error } = await supabase
    .from('tenant_module_entitlements')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('module_key', moduleKey);

  if (error) throw error;
}

export async function updatePlatformTenantSubscription(
  tenantId: string,
  updates: UpdatePlatformTenantSubscriptionInput
): Promise<TenantSubscription> {
  const [{ data: currentSubscription, error: currentSubscriptionError }, { data: selectedPlan, error: selectedPlanError }] = await Promise.all([
    supabase
      .from('tenant_subscriptions')
      .select('id, plan_id, status')
      .eq('tenant_id', tenantId)
      .single(),
    supabase
      .from('subscription_plans')
      .select('id, display_name, price_monthly')
      .eq('id', updates.planId)
      .single(),
  ]);

  if (currentSubscriptionError) throw currentSubscriptionError;
  if (selectedPlanError) throw selectedPlanError;

  const isChangingPlan = currentSubscription.plan_id !== updates.planId;
  const isPaidPlan = Number(selectedPlan.price_monthly ?? 0) > 0;

  if (isChangingPlan && isPaidPlan) {
    throw new Error(`El plan ${selectedPlan.display_name} solo puede activarse cuando el pago quede confirmado. Genera el checkout y espera el webhook de Mercado Pago antes de aplicar el cambio.`);
  }

  const payload = {
    plan_id: updates.planId,
    status: updates.status,
    trial_ends_at: updates.trialEndsAt ?? null,
    current_period_end: updates.currentPeriodEnd ?? null,
    cancelled_at: updates.cancelledAt ?? null
  };

  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .update(payload)
    .eq('tenant_id', tenantId)
    .select(`
      *,
      plan:subscription_plans(*)
    `)
    .single();

  if (error) throw error;
  return data as TenantSubscription;
}

export async function createTenantSubscription(
  tenantId: string,
  planName: string
): Promise<TenantSubscription> {
  const plans = await getAllPlans();
  const selectedPlan = plans.find(p => p.name === planName);

  if (!selectedPlan) {
    throw new Error(`Plan ${planName} not found`);
  }

  const trialEndsAt = selectedPlan.trial_days > 0
    ? new Date(Date.now() + selectedPlan.trial_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .insert({
      tenant_id: tenantId,
      plan_id: selectedPlan.id,
      status: selectedPlan.trial_days > 0 ? 'trial' : 'active',
      trial_ends_at: trialEndsAt,
      current_period_end: currentPeriodEnd
    })
    .select(`
      *,
      plan:subscription_plans(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updateTenantSubscription(
  tenantId: string,
  planName: string
): Promise<TenantSubscription> {
  const plans = await getAllPlans();
  const selectedPlan = plans.find(p => p.name === planName);

  if (!selectedPlan) {
    throw new Error(`Plan ${planName} not found`);
  }

  const updates: any = {
    plan_id: selectedPlan.id,
    status: 'active'
  };

  if (selectedPlan.trial_days > 0) {
    updates.status = 'trial';
    updates.trial_ends_at = new Date(Date.now() + selectedPlan.trial_days * 24 * 60 * 60 * 1000).toISOString();
  }

  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .update(updates)
    .eq('tenant_id', tenantId)
    .select(`
      *,
      plan:subscription_plans(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function cancelSubscription(tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('tenant_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString()
    })
    .eq('tenant_id', tenantId);

  if (error) throw error;
}

export async function isSubscriptionActive(tenantId: string): Promise<boolean> {
  const subscription = await getTenantSubscriptionInfo(tenantId);
  if (!subscription) return false;

  if (subscription.status === 'active') return true;

  if (subscription.status === 'trial' && subscription.trial_ends_at) {
    return new Date(subscription.trial_ends_at) > new Date();
  }

  return false;
}

export function getFeaturesList(planName: string): string[] {
  const features: Record<string, string[]> = {
    basic: [
      '5 usuarios',
      '100 mascotas',
      'Funcionalidades básicas',
      'Soporte por email',
      'Reportes básicos'
    ],
    professional: [
      '50 usuarios',
      '1000 mascotas',
      'Todas las funcionalidades',
      'Soporte prioritario',
      'Reportes avanzados',
      'Integraciones API',
      'Personalización de marca'
    ],
    enterprise: [
      'Usuarios ilimitados',
      'Mascotas ilimitadas',
      'Funcionalidades premium',
      'Soporte 24/7',
      'Analytics avanzado',
      'Consultoría dedicada',
      'SLA garantizado',
      'Dominio personalizado'
    ]
  };

  return features[planName] || [];
}
