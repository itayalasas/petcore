import { useEffect, useMemo, useState } from 'react';
import {
  Blocks,
  Building2,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  clearPlatformTenantModuleEntitlement,
  createSubscriptionPlan,
  getPlanCatalogModules,
  getPlatformPlans,
  getPlatformTenantSummaries,
  getTenantModuleLicenses,
  savePlanCatalogModules,
  type ModuleLicenseInfo,
  type PlanCatalogModule,
  type PlatformTenantSummary,
  type SubscriptionPlan,
  type UpsertSubscriptionPlanInput,
  updateSubscriptionPlan,
  updatePlatformTenantModuleEntitlement,
  updatePlatformTenantSubscription
} from '../../services/licensing';
import { createMercadoPagoCheckout, type MercadoPagoCheckoutEnvironment } from '../../services/billing';
import { showError, showInfo, showSuccess } from '../../utils/messages';

const CHECKOUT_ENVIRONMENT_STORAGE_KEY = 'mercadopagoCheckoutEnvironment';

function formatDate(value: string | null) {
  if (!value) {
    return 'No definido';
  }

  return new Date(value).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatCurrency(value: number) {
  if (value <= 0) {
    return 'Sin precio';
  }

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

const statusLabels: Record<string, string> = {
  active: 'Activa',
  trial: 'Prueba',
  suspended: 'Suspendida',
  cancelled: 'Cancelada'
};

interface PlanFormState {
  name: string;
  displayName: string;
  description: string;
  priceMonthly: string;
  maxUsers: string;
  maxPets: string;
  trialDays: string;
  isActive: boolean;
  featuresJson: string;
}

type PlanEditorTab = 'details' | 'modules';

function buildPlanFormState(plan: SubscriptionPlan | null): PlanFormState {
  if (!plan) {
    return {
      name: '',
      displayName: '',
      description: '',
      priceMonthly: '0',
      maxUsers: '5',
      maxPets: '100',
      trialDays: '0',
      isActive: true,
      featuresJson: '{\n  "has_basic_features": true\n}'
    };
  }

  return {
    name: plan.name,
    displayName: plan.display_name,
    description: plan.description ?? '',
    priceMonthly: String(plan.price_monthly ?? 0),
    maxUsers: String(plan.max_users ?? 0),
    maxPets: String(plan.max_pets ?? 0),
    trialDays: String(plan.trial_days ?? 0),
    isActive: plan.is_active,
    featuresJson: JSON.stringify(plan.features ?? {}, null, 2)
  };
}

function normalizePlanKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function getTenantStatusClasses(status: string) {
  if (status === 'active') {
    return 'bg-emerald-500/15 text-emerald-300';
  }

  if (status === 'trial') {
    return 'bg-amber-500/15 text-amber-300';
  }

  return 'bg-rose-500/15 text-rose-300';
}

export default function PlatformLicensing() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [tenants, setTenants] = useState<PlatformTenantSummary[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<PlanFormState>(() => buildPlanFormState(null));
  const [planModules, setPlanModules] = useState<PlanCatalogModule[]>([]);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planEditorTab, setPlanEditorTab] = useState<PlanEditorTab>('details');
  const [moduleSearch, setModuleSearch] = useState('');
  const [loadingPlanModules, setLoadingPlanModules] = useState(false);
  const [moduleLicenses, setModuleLicenses] = useState<ModuleLicenseInfo[]>([]);
  const [subscriptionPlanId, setSubscriptionPlanId] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'trial' | 'active' | 'suspended' | 'cancelled'>('trial');
  const [checkoutEnvironment, setCheckoutEnvironment] = useState<MercadoPagoCheckoutEnvironment>(() => {
    if (typeof window === 'undefined') {
      return 'sandbox';
    }

    const savedValue = window.localStorage.getItem(CHECKOUT_ENVIRONMENT_STORAGE_KEY);
    return savedValue === 'production' ? 'production' : 'sandbox';
  });
  const [generatedCheckoutUrl, setGeneratedCheckoutUrl] = useState<string | null>(null);
  const [copiedCheckoutUrl, setCopiedCheckoutUrl] = useState(false);
  const [loading, setLoading] = useState(true);
  const [licensesLoading, setLicensesLoading] = useState(false);
  const [savingSubscription, setSavingSubscription] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingModuleKey, setSavingModuleKey] = useState<string | null>(null);
  const [creatingCheckout, setCreatingCheckout] = useState(false);

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId) ?? null,
    [selectedTenantId, tenants]
  );

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === subscriptionPlanId) ?? null,
    [plans, subscriptionPlanId]
  );

  const editingPlan = useMemo(
    () => plans.find((plan) => plan.id === editingPlanId) ?? null,
    [editingPlanId, plans]
  );

  const requiresPaidCheckoutConfirmation = useMemo(() => {
    if (!selectedTenant?.subscription || !selectedPlan) {
      return false;
    }

    return selectedTenant.subscription.plan_id !== selectedPlan.id
      && (selectedPlan.price_monthly ?? 0) > 0;
  }, [selectedPlan, selectedTenant]);

  const groupedLicenses = useMemo(() => {
    return moduleLicenses.reduce((acc, license) => {
      if (!acc[license.category]) {
        acc[license.category] = [];
      }

      acc[license.category].push(license);
      return acc;
    }, {} as Record<string, ModuleLicenseInfo[]>);
  }, [moduleLicenses]);

  const filteredPlanModules = useMemo(() => {
    const query = moduleSearch.trim().toLowerCase();

    if (!query) {
      return planModules;
    }

    return planModules.filter((module) => {
      return [module.display_name, module.description ?? '', module.category, module.module_key]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [moduleSearch, planModules]);

  const groupedPlanModules = useMemo(() => {
    return filteredPlanModules.reduce((acc, module) => {
      if (!acc[module.category]) {
        acc[module.category] = [];
      }

      acc[module.category].push(module);
      return acc;
    }, {} as Record<string, PlanCatalogModule[]>);
  }, [filteredPlanModules]);

  const planStats = useMemo(() => {
    const activeCount = plans.filter((plan) => plan.is_active).length;
    const paidCount = plans.filter((plan) => plan.price_monthly > 0).length;
    const moduleCount = planModules.filter((module) => module.plan_enabled || module.is_core).length;

    return { activeCount, paidCount, moduleCount };
  }, [plans, planModules]);

  const loadTenantsAndPlans = async () => {
    try {
      setLoading(true);
      const [plansData, tenantsData] = await Promise.all([
        getPlatformPlans(),
        getPlatformTenantSummaries()
      ]);

      setPlans(plansData);
      setTenants(tenantsData);
      setSelectedTenantId((current) => current && tenantsData.some((tenant) => tenant.id === current)
        ? current
        : tenantsData[0]?.id ?? null);
      setEditingPlanId((current) => current && plansData.some((plan) => plan.id === current)
        ? current
        : plansData[0]?.id ?? null);
    } catch (error) {
      console.error('Error loading platform licensing data:', error);
      showError('No fue posible cargar la consola de licenciamiento');
    } finally {
      setLoading(false);
    }
  };

  const loadTenantLicenses = async (tenantId: string) => {
    try {
      setLicensesLoading(true);
      const data = await getTenantModuleLicenses(tenantId);
      setModuleLicenses(data);
    } catch (error) {
      console.error('Error loading tenant licenses:', error);
      showError('No fue posible cargar los módulos del tenant');
      setModuleLicenses([]);
    } finally {
      setLicensesLoading(false);
    }
  };

  const loadPlanModules = async (planId?: string | null) => {
    try {
      setLoadingPlanModules(true);
      const modules = await getPlanCatalogModules(planId);
      setPlanModules(modules.map((module) => ({
        ...module,
        plan_enabled: planId
          ? module.plan_enabled
          : module.is_core || module.default_enabled,
      })));
    } catch (error) {
      console.error('Error loading plan modules:', error);
      showError('No fue posible cargar los módulos del plan');
      setPlanModules([]);
    } finally {
      setLoadingPlanModules(false);
    }
  };

  useEffect(() => {
    loadTenantsAndPlans();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CHECKOUT_ENVIRONMENT_STORAGE_KEY, checkoutEnvironment);
    }
  }, [checkoutEnvironment]);

  useEffect(() => {
    if (!selectedTenant) {
      setSubscriptionPlanId('');
      setSubscriptionStatus('trial');
      setGeneratedCheckoutUrl(null);
      setCopiedCheckoutUrl(false);
      setModuleLicenses([]);
      return;
    }

    setSubscriptionPlanId(selectedTenant.subscription?.plan_id ?? '');
    setSubscriptionStatus(selectedTenant.subscription?.status ?? selectedTenant.subscription_status);
    setGeneratedCheckoutUrl(null);
    setCopiedCheckoutUrl(false);
    loadTenantLicenses(selectedTenant.id);
  }, [selectedTenant]);

  useEffect(() => {
    if (!planModalOpen) {
      return;
    }

    if (editingPlan) {
      setPlanForm(buildPlanFormState(editingPlan));
      void loadPlanModules(editingPlan.id);
      return;
    }

    setPlanForm(buildPlanFormState(null));
    void loadPlanModules(null);
  }, [editingPlan, planModalOpen]);

  const handleRefresh = async () => {
    await loadTenantsAndPlans();

    if (selectedTenantId) {
      await loadTenantLicenses(selectedTenantId);
    }

    if (planModalOpen) {
      await loadPlanModules(editingPlanId);
    }
  };

  const openPlanManager = (planId?: string | null) => {
    setPlanEditorTab('details');
    setModuleSearch('');
    setPlanModalOpen(true);
    setEditingPlanId(planId ?? plans[0]?.id ?? null);
  };

  const handleSaveSubscription = async () => {
    if (!selectedTenant || !subscriptionPlanId) {
      return;
    }

    try {
      setSavingSubscription(true);

      await updatePlatformTenantSubscription(selectedTenant.id, {
        planId: subscriptionPlanId,
        status: subscriptionStatus,
        trialEndsAt: subscriptionStatus === 'trial'
          ? selectedTenant.subscription?.trial_ends_at ?? selectedTenant.trial_ends_at
          : null,
        currentPeriodEnd: selectedTenant.subscription?.current_period_end ?? null,
        cancelledAt: subscriptionStatus === 'cancelled' ? new Date().toISOString() : null
      });

      await loadTenantsAndPlans();
      await loadTenantLicenses(selectedTenant.id);
      showSuccess(`Suscripción actualizada para ${selectedTenant.name}`);
    } catch (error) {
      console.error('Error updating platform subscription:', error);
      showError(`No fue posible actualizar la suscripción de ${selectedTenant.name}`);
    } finally {
      setSavingSubscription(false);
    }
  };

  const handleNewPlan = async () => {
    setEditingPlanId(null);
    setPlanForm(buildPlanFormState(null));
    setPlanEditorTab('details');
    setModuleSearch('');
    setPlanModalOpen(true);
    await loadPlanModules(null);
  };

  const handleSavePlan = async () => {
    const normalizedName = normalizePlanKey(planForm.name);
    const displayName = planForm.displayName.trim();

    if (!normalizedName || !displayName) {
      showError('Nombre técnico y nombre visible son requeridos para el plan');
      return;
    }

    const priceMonthly = Number(planForm.priceMonthly);
    const maxUsers = Number(planForm.maxUsers);
    const maxPets = Number(planForm.maxPets);
    const trialDays = Number(planForm.trialDays);

    if ([priceMonthly, maxUsers, maxPets, trialDays].some((value) => Number.isNaN(value))) {
      showError('Precio, límites y días de trial deben ser valores numéricos válidos');
      return;
    }

    let features: Record<string, boolean>;

    try {
      const parsed = JSON.parse(planForm.featuresJson || '{}') as Record<string, unknown>;
      features = Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [key, Boolean(value)])
      );
    } catch {
      showError('El JSON de features no es válido');
      return;
    }

    const payload: UpsertSubscriptionPlanInput = {
      name: normalizedName,
      displayName,
      description: planForm.description.trim(),
      priceMonthly,
      maxUsers,
      maxPets,
      trialDays,
      isActive: planForm.isActive,
      features,
    };

    const enabledModuleKeys = planModules
      .filter((module) => !module.is_core && module.plan_enabled)
      .map((module) => module.module_key);

    try {
      setSavingPlan(true);

      const savedPlan = editingPlanId
        ? await updateSubscriptionPlan(editingPlanId, payload)
        : await createSubscriptionPlan(payload);

      await savePlanCatalogModules(savedPlan.id, enabledModuleKeys);
      await loadTenantsAndPlans();
      setEditingPlanId(savedPlan.id);
      setPlanModalOpen(false);
      showSuccess(editingPlanId
        ? `Plan ${savedPlan.display_name} actualizado`
        : `Plan ${savedPlan.display_name} creado`);
    } catch (error) {
      console.error('Error saving subscription plan:', error);
      showError(error instanceof Error ? error.message : 'No fue posible guardar el plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleTogglePlanModule = (moduleKey: string) => {
    setPlanModules((current) => current.map((module) => {
      if (module.module_key !== moduleKey || module.is_core) {
        return module;
      }

      return {
        ...module,
        plan_enabled: !module.plan_enabled,
      };
    }));
  };

  const handleGeneratePaymentLink = async () => {
    if (!selectedTenant || !subscriptionPlanId) {
      return;
    }

    if ((selectedPlan?.price_monthly ?? 0) <= 0) {
      const planName = selectedPlan?.display_name ?? 'seleccionado';

      if (selectedPlan?.name === 'basic') {
        showInfo(`El plan ${planName} no requiere checkout de pago`);
      } else {
        showError(`El plan ${planName} no tiene un precio configurado para checkout`);
      }

      return;
    }

    try {
      setCreatingCheckout(true);
      const checkout = await createMercadoPagoCheckout(
        selectedTenant.id,
        subscriptionPlanId,
        checkoutEnvironment
      );

      const url = checkout.preferredCheckoutUrl ?? checkout.checkoutUrl ?? checkout.sandboxCheckoutUrl;
      if (!url) {
        throw new Error('Mercado Pago no devolvió una URL de checkout');
      }

      setGeneratedCheckoutUrl(url);
      setCopiedCheckoutUrl(false);
      window.open(url, '_blank', 'noopener,noreferrer');
      showSuccess(`Checkout de Mercado Pago generado para ${selectedTenant.name} en modo ${checkout.checkoutEnvironment === 'sandbox' ? 'sandbox' : 'producción'}`);
    } catch (error) {
      console.error('Error generating Mercado Pago checkout:', error);
      const message = error instanceof Error ? error.message : 'No fue posible generar el checkout';

      if (message.toLowerCase().includes('no requiere checkout de pago')) {
        showInfo(message);
      } else {
        showError(message);
      }
    } finally {
      setCreatingCheckout(false);
    }
  };

  const handleCopyPaymentLink = async () => {
    if (!generatedCheckoutUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedCheckoutUrl);
      setCopiedCheckoutUrl(true);
      showSuccess('Link de pago copiado al portapapeles');
      window.setTimeout(() => setCopiedCheckoutUrl(false), 2500);
    } catch (error) {
      console.error('Error copying checkout link:', error);
      showError('No fue posible copiar el link de pago');
    }
  };

  const handleToggleModule = async (license: ModuleLicenseInfo) => {
    if (!selectedTenant || license.is_core) {
      return;
    }

    const nextEnabled = !license.effective_enabled;

    try {
      setSavingModuleKey(license.module_key);

      if (license.platform_enabled !== null && nextEnabled === license.plan_enabled) {
        await clearPlatformTenantModuleEntitlement(selectedTenant.id, license.module_key);
      } else {
        await updatePlatformTenantModuleEntitlement(selectedTenant.id, license.module_key, nextEnabled);
      }

      await loadTenantLicenses(selectedTenant.id);
      showSuccess(`Licencia actualizada para ${license.display_name}`);
    } catch (error) {
      console.error('Error updating platform entitlement:', error);
      showError(`No fue posible actualizar ${license.display_name}`);
    } finally {
      setSavingModuleKey(null);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Cargando consola de plataforma..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Consola de licenciamiento</h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestiona el plan, el estado de pago y los entitlements modulares de cada tenant desde un espacio separado de la app tenant.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refrescar
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 lg:col-span-4 xl:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Tenants</h2>
              <p className="text-xs text-slate-400">{tenants.length} organizaciones</p>
            </div>
          </div>

          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {tenants.map((tenant) => {
              const isSelected = tenant.id === selectedTenantId;
              return (
                <button
                  key={tenant.id}
                  onClick={() => setSelectedTenantId(tenant.id)}
                  className={`w-full text-left rounded-xl border p-4 transition-colors ${
                    isSelected
                      ? 'border-cyan-500/50 bg-cyan-500/10'
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{tenant.name}</p>
                      <p className="text-xs text-slate-400 truncate">{tenant.slug}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${getTenantStatusClasses(tenant.subscription_status)}`}>
                      {statusLabels[tenant.subscription_status]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6">
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_28%)]" />
            <div className="relative flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-300 text-xs font-semibold mb-4">
                  <Settings2 className="w-3.5 h-3.5" />
                  Gestión avanzada de catálogo
                </div>
                <h2 className="text-2xl font-semibold text-white mb-3">Administra planes en un modal dedicado</h2>
                <p className="text-sm text-slate-300 leading-6 max-w-xl">
                  Abre un workspace aislado para crear, editar y auditar planes comerciales. Allí puedes ajustar pricing, trial, features JSON y asignar módulos con búsqueda visual por categoría.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 max-w-2xl">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Planes activos</p>
                    <p className="text-2xl font-semibold text-white">{planStats.activeCount}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Planes con cobro</p>
                    <p className="text-2xl font-semibold text-white">{planStats.paidCount}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Módulos en edición</p>
                    <p className="text-2xl font-semibold text-white">{planStats.moduleCount}</p>
                  </div>
                </div>
              </div>

              <div className="xl:w-[22rem] rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-3">Catálogo actual</p>
                <div className="space-y-3 mb-5">
                  {plans.slice(0, 4).map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => openPlanManager(plan.id)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-left hover:border-fuchsia-500/30 hover:bg-slate-900 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <p className="text-sm font-semibold text-white">{plan.display_name}</p>
                        <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${plan.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}>
                          {plan.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{formatCurrency(plan.price_monthly)} · Trial {plan.trial_days}d</p>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => openPlanManager(editingPlanId)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-fuchsia-600 text-white font-medium hover:bg-fuchsia-700 transition-colors"
                >
                  <Settings2 className="w-4 h-4" />
                  Gestionar catálogo de planes
                </button>
              </div>
            </div>
          </div>

          {!selectedTenant && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
              <p className="text-slate-300">No hay tenants disponibles para administrar.</p>
            </div>
          )}

          {selectedTenant && (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-blue-400" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">Suscripción del tenant</h2>
                    </div>
                    <p className="text-sm text-slate-400">
                      Cambia el plan o el estado operativo. Esto sincroniza el snapshot del tenant y condiciona el acceso a módulos en el login.
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {selectedTenant.name}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Plan actual</p>
                    <p className="text-base font-semibold text-white">{selectedTenant.subscription?.plan?.display_name ?? 'Sin plan'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Estado</p>
                    <p className="text-base font-semibold text-white">{statusLabels[selectedTenant.subscription_status]}</p>
                  </div>
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Fin de trial</p>
                    <p className="text-base font-semibold text-white">{formatDate(selectedTenant.subscription?.trial_ends_at ?? selectedTenant.trial_ends_at)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Próximo corte</p>
                    <p className="text-base font-semibold text-white">{formatDate(selectedTenant.subscription?.current_period_end ?? null)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm font-medium text-slate-300 mb-2">Plan asignado</span>
                    <select
                      value={subscriptionPlanId}
                      onChange={(event) => setSubscriptionPlanId(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">Selecciona un plan</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.display_name}{plan.is_active ? '' : ' (inactivo)'}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium text-slate-300 mb-2">Estado de suscripción</span>
                    <select
                      value={subscriptionStatus}
                      onChange={(event) => setSubscriptionStatus(event.target.value as 'trial' | 'active' | 'suspended' | 'cancelled')}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="trial">Prueba</option>
                      <option value="active">Activa</option>
                      <option value="suspended">Suspendida</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </label>
                </div>

                {requiresPaidCheckoutConfirmation && selectedPlan && (
                  <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-4">
                    <p className="text-sm font-semibold text-cyan-200">Cambio pendiente de pago confirmado</p>
                    <p className="text-sm text-cyan-100/80 mt-1 leading-6">
                      El plan {selectedPlan.display_name} no se aplicará desde Guardar suscripción. Primero debes generar el link de pago y el cambio solo quedará activo cuando Mercado Pago confirme el cobro por webhook.
                    </p>
                  </div>
                )}

                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white mb-1">Ambiente de checkout Mercado Pago</p>
                      <p className="text-sm text-slate-400">
                        Usa `sandbox` con credenciales de testing y `producción` solo con credenciales reales.
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 border border-slate-800 p-1 self-start">
                      <button
                        type="button"
                        onClick={() => setCheckoutEnvironment('sandbox')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          checkoutEnvironment === 'sandbox'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        Sandbox
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckoutEnvironment('production')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          checkoutEnvironment === 'production'
                            ? 'bg-cyan-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        Producción
                      </button>
                    </div>
                  </div>

                  {checkoutEnvironment === 'sandbox' && (
                    <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                      <p className="text-sm font-medium text-amber-200">Modo sandbox activo</p>
                      <p className="text-sm text-amber-100/80 mt-1 leading-6">
                        Este link no se puede pagar con una cuenta real de Mercado Pago. Debes abrirlo con un comprador de prueba del mismo país y completar la prueba con tarjeta de prueba en ventana de incógnito.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleGeneratePaymentLink}
                      disabled={creatingCheckout || !subscriptionPlanId}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-medium hover:bg-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      {creatingCheckout ? <Loader className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                      Generar link de pago
                    </button>
                    <button
                      onClick={handleSaveSubscription}
                      disabled={savingSubscription || !subscriptionPlanId || requiresPaidCheckoutConfirmation}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      {savingSubscription && <Loader className="w-4 h-4 animate-spin" />}
                      Guardar suscripción
                    </button>
                  </div>
                </div>

                {generatedCheckoutUrl && (
                  <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white mb-1">Link de pago generado</p>
                        <p className="text-xs text-slate-400 mb-3">
                          Puedes abrirlo ahora o copiarlo para compartirlo manualmente con el cliente.
                        </p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-300 mb-3">
                          Ambiente: {checkoutEnvironment === 'sandbox' ? 'Sandbox' : 'Producción'}
                        </div>
                        {checkoutEnvironment === 'sandbox' && (
                          <p className="text-xs text-amber-300 mb-3">
                            Para completar la prueba, inicia sesión con un comprador sandbox del mismo país y cambia el método de pago a una tarjeta de prueba; el saldo Dinero disponible puede disparar este error aunque el usuario sea de testing.
                          </p>
                        )}
                        <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-300 break-all">
                          {generatedCheckoutUrl}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={handleCopyPaymentLink}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 transition-colors"
                        >
                          {copiedCheckoutUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copiedCheckoutUrl ? 'Copiado' : 'Copiar link'}
                        </button>

                        <button
                          type="button"
                          onClick={() => window.open(generatedCheckoutUrl, '_blank', 'noopener,noreferrer')}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Abrir link
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                        <Blocks className="w-5 h-5 text-cyan-400" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">Entitlements por módulo</h2>
                    </div>
                    <p className="text-sm text-slate-400">
                      Si el toggle coincide con el plan, el entitlement se limpia. Si difiere, queda emitido por plataforma para este tenant.
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Validado en login
                  </div>
                </div>

                {licensesLoading ? (
                  <div className="py-12 text-center">
                    <Loader className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-3" />
                    <p className="text-slate-400">Cargando módulos del tenant...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedLicenses).map(([category, licenses]) => (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">{category}</h3>
                          <span className="text-xs text-slate-500">
                            {licenses.filter((license) => license.effective_enabled).length}/{licenses.length} activos
                          </span>
                        </div>

                        <div className="space-y-3">
                          {licenses.map((license) => {
                            const disabled = license.is_core || savingModuleKey === license.module_key;

                            return (
                              <div
                                key={license.module_key}
                                className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex items-start justify-between gap-4"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <p className="text-sm font-semibold text-white">{license.display_name}</p>
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${license.effective_enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}>
                                      {license.effective_enabled ? 'Activo' : 'Inactivo'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                      {license.license_source === 'platform_entitlement' ? 'Plataforma' : license.license_source === 'plan' ? 'Plan' : license.license_source === 'core' ? 'Core' : 'Sin licencia'}
                                    </span>
                                  </div>
                                  {license.description && (
                                    <p className="text-sm text-slate-400">{license.description}</p>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleToggleModule(license)}
                                  disabled={disabled}
                                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                                    license.effective_enabled
                                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                      : 'border-slate-700 bg-slate-900 text-slate-200'
                                  } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                  {savingModuleKey === license.module_key ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                  ) : license.effective_enabled ? (
                                    <ToggleRight className="w-4 h-4" />
                                  ) : (
                                    <ToggleLeft className="w-4 h-4" />
                                  )}
                                  {license.effective_enabled ? 'Habilitado' : 'Bloqueado'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <Modal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title={editingPlanId ? `Gestionar plan ${editingPlan?.display_name ?? ''}` : 'Crear nuevo plan'}
        size="xl"
        appearance="dark"
        footer={(
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-slate-400">
              {editingPlanId
                ? 'Edita datos comerciales y módulos del plan en un flujo dedicado.'
                : 'Configura un nuevo plan y define su paquete base de funcionalidades.'}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPlanModalOpen(false)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePlan}
                disabled={savingPlan}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-fuchsia-600 text-white font-medium hover:bg-fuchsia-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {savingPlan && <Loader className="w-4 h-4 animate-spin" />}
                {editingPlanId ? 'Guardar cambios' : 'Crear plan'}
              </button>
            </div>
          </div>
        )}
      >
        <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6">
          <aside className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-sm font-semibold text-white">Planes disponibles</p>
                <p className="text-xs text-slate-400">Selecciona uno o crea un nuevo blueprint</p>
              </div>
              <button
                type="button"
                onClick={() => void handleNewPlan()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {plans.map((plan) => {
                const isSelected = plan.id === editingPlanId;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setEditingPlanId(plan.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                      isSelected
                        ? 'border-fuchsia-500/50 bg-fuchsia-500/10'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{plan.display_name}</p>
                        <p className="text-xs text-slate-400 truncate">{plan.name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${plan.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}>
                        {plan.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{formatCurrency(plan.price_monthly)}</span>
                      <span>Trial {plan.trial_days}d</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-fuchsia-500/15 flex items-center justify-center">
                    <Settings2 className="w-5 h-5 text-fuchsia-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{editingPlanId ? planForm.displayName || 'Editar plan' : 'Nuevo plan'}</h3>
                    <p className="text-sm text-slate-400">Define pricing, límites, trial y el paquete de módulos base.</p>
                  </div>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 border border-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setPlanEditorTab('details')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    planEditorTab === 'details'
                      ? 'bg-fuchsia-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Detalles
                </button>
                <button
                  type="button"
                  onClick={() => setPlanEditorTab('modules')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    planEditorTab === 'modules'
                      ? 'bg-fuchsia-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Módulos y funcionalidades
                </button>
              </div>
            </div>

            {planEditorTab === 'details' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm font-medium text-slate-300 mb-2">Nombre técnico</span>
                    <input
                      value={planForm.name}
                      onChange={(event) => setPlanForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="enterprise-plus"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium text-slate-300 mb-2">Nombre visible</span>
                    <input
                      value={planForm.displayName}
                      onChange={(event) => setPlanForm((current) => ({ ...current, displayName: event.target.value }))}
                      placeholder="Enterprise Plus"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="block text-sm font-medium text-slate-300 mb-2">Descripción comercial</span>
                  <textarea
                    value={planForm.description}
                    onChange={(event) => setPlanForm((current) => ({ ...current, description: event.target.value }))}
                    rows={4}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <label className="block">
                    <span className="block text-sm font-medium text-slate-300 mb-2">Precio mensual</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={planForm.priceMonthly}
                      onChange={(event) => setPlanForm((current) => ({ ...current, priceMonthly: event.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium text-slate-300 mb-2">Máx. usuarios</span>
                    <input
                      type="number"
                      value={planForm.maxUsers}
                      onChange={(event) => setPlanForm((current) => ({ ...current, maxUsers: event.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium text-slate-300 mb-2">Máx. mascotas</span>
                    <input
                      type="number"
                      value={planForm.maxPets}
                      onChange={(event) => setPlanForm((current) => ({ ...current, maxPets: event.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium text-slate-300 mb-2">Días de trial</span>
                    <input
                      type="number"
                      min="0"
                      value={planForm.trialDays}
                      onChange={(event) => setPlanForm((current) => ({ ...current, trialDays: event.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </label>
                </div>

                <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.isActive}
                    onChange={(event) => setPlanForm((current) => ({ ...current, isActive: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-fuchsia-500 focus:ring-fuchsia-500"
                  />
                  <span className="text-sm text-slate-200">Plan activo y disponible para asignación</span>
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-slate-300 mb-2">Features JSON</span>
                  <textarea
                    value={planForm.featuresJson}
                    onChange={(event) => setPlanForm((current) => ({ ...current, featuresJson: event.target.value }))}
                    rows={10}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </label>
              </div>
            )}

            {planEditorTab === 'modules' && (
              <div className="space-y-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">Funcionalidades incluidas por defecto</p>
                    <p className="text-sm text-slate-400">Busca módulos del catálogo y arma el paquete base del plan.</p>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={moduleSearch}
                      onChange={(event) => setModuleSearch(event.target.value)}
                      placeholder="Buscar funcionalidades, categorías o keys"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Resultados</p>
                    <p className="text-2xl font-semibold text-white">{filteredPlanModules.length}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Módulos activos</p>
                    <p className="text-2xl font-semibold text-white">{planModules.filter((module) => module.plan_enabled || module.is_core).length}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Categorías</p>
                    <p className="text-2xl font-semibold text-white">{Object.keys(groupedPlanModules).length}</p>
                  </div>
                </div>

                {loadingPlanModules ? (
                  <div className="py-16 text-center">
                    <Loader className="w-8 h-8 text-fuchsia-400 animate-spin mx-auto mb-3" />
                    <p className="text-slate-400">Cargando módulos del catálogo...</p>
                  </div>
                ) : (
                  <div className="space-y-6 max-h-[52vh] overflow-y-auto pr-1">
                    {Object.entries(groupedPlanModules).map(([category, modules]) => (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">{category}</h4>
                          <span className="text-xs text-slate-500">
                            {modules.filter((module) => module.plan_enabled || module.is_core).length}/{modules.length} incluidos
                          </span>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                          {modules.map((module) => {
                            const enabled = module.plan_enabled || module.is_core;

                            return (
                              <button
                                key={module.module_key}
                                type="button"
                                onClick={() => handleTogglePlanModule(module.module_key)}
                                disabled={module.is_core}
                                className={`text-left rounded-2xl border p-4 transition-colors ${
                                  enabled
                                    ? 'border-fuchsia-500/30 bg-fuchsia-500/10'
                                    : 'border-slate-800 bg-slate-950 hover:bg-slate-900'
                                } ${module.is_core ? 'cursor-not-allowed opacity-80' : ''}`}
                              >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <p className="text-sm font-semibold text-white">{module.display_name}</p>
                                      {module.is_core && (
                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                                          Core
                                        </span>
                                      )}
                                      {!module.is_core && module.default_enabled && (
                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                          Default
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-400">{module.module_key}</p>
                                  </div>
                                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${enabled ? 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>
                                    {enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                    <span className="text-xs font-medium">{enabled ? 'Incluido' : 'Fuera del plan'}</span>
                                  </div>
                                </div>
                                <p className="text-sm text-slate-400">{module.description ?? 'Sin descripción adicional'}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}