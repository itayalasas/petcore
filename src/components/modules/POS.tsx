import { ShoppingCart, Search, Receipt, Package, Briefcase, FileText, Stethoscope, Scissors, Sun, Plus, Minus, X, Clock, User, PawPrint, CreditCard, Banknote, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { useToast } from '../../contexts/ToastContext';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  unit: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface CartItem {
  type: 'product' | 'service' | 'consultation' | 'grooming' | 'daycare';
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  source_id?: string;
  source_type?: string;
}

interface Pet {
  id: string;
  name: string;
  owner_id: string;
  owner_name: string;
  species: string;
}

interface PendingCharge {
  id: string;
  type: 'consultation' | 'grooming' | 'daycare' | 'appointment';
  pet_id: string;
  pet_name: string;
  owner_name: string;
  owner_id: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  items?: CartItem[];
}

interface PetGroup {
  pet_id: string;
  pet_name: string;
  owner_id: string;
  owner_name: string;
  species: string;
  charges: PendingCharge[];
  total_amount: number;
}

interface OwnerSummary {
  first_name?: string | null;
  last_name?: string | null;
}

const formatOwnerName = (owner?: OwnerSummary | null) => {
  const fullName = [owner?.first_name, owner?.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' ');

  return fullName || 'Sin dueno';
};

const CHARGE_TYPE_CONFIG: Record<string, { icon: typeof Stethoscope; label: string; color: string; bg: string }> = {
  consultation: { icon: Stethoscope, label: 'Consulta', color: 'text-blue-600', bg: 'bg-blue-50' },
  grooming: { icon: Scissors, label: 'Estetica', color: 'text-pink-600', bg: 'bg-pink-50' },
  daycare: { icon: Sun, label: 'Guarderia', color: 'text-amber-600', bg: 'bg-amber-50' },
  appointment: { icon: Clock, label: 'Cita', color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'transfer', label: 'Transferencia', icon: Building2 },
];

export default function POS() {
  const { currentTenant } = useTenant();
  const { showSuccess, showError, showInfo } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabType, setTabType] = useState<'pending' | 'products' | 'services'>('pending');
  const [selectedPet, setSelectedPet] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [pendingCharges, setPendingCharges] = useState<PendingCharge[]>([]);
  const [pendingSearchTerm, setPendingSearchTerm] = useState('');
  const [linkedSources, setLinkedSources] = useState<{ type: string; id: string }[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedPetGroup, setSelectedPetGroup] = useState<string | null>(null);
  const [petSearchTerm, setPetSearchTerm] = useState('');
  const [showPetDropdown, setShowPetDropdown] = useState(false);
  const petSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (petSearchRef.current && !petSearchRef.current.contains(event.target as Node)) {
        setShowPetDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (currentTenant) {
      loadProducts();
      loadServices();
      loadPets();
      loadPendingCharges();
      checkForConsultation();
    }
  }, [currentTenant]);

  const checkForConsultation = async () => {
    const hash = window.location.hash;
    const match = hash.match(/consultation=([^&]+)/);

    if (match) {
      const consultationId = match[1];
      await loadConsultationToCart(consultationId);
      window.location.hash = '#pos';
    }
  };

  const loadConsultationToCart = async (consultationId: string) => {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select(`
          id,
          pet_id,
          reason,
          billable_items,
          total_amount,
          billed,
          pet:pets(id, name, owner_id, owner:owners!owner_id(first_name, last_name))
        `)
        .eq('id', consultationId)
        .single();

      if (error) throw error;

      if (data.billed) {
        showInfo('Esta consulta ya ha sido cobrada');
        return;
      }

      await loadPendingCharges();

      const petId = data.pet_id;
      setTimeout(() => {
        selectPetGroup(petId);
      }, 100);

    } catch (error) {
      console.error('Error loading consultation:', error);
      showError('Error al cargar la consulta');
    }
  };

  const loadPendingCharges = async () => {
    if (!currentTenant) return;

    try {
      const [consultationsRes, groomingRes, daycareRes] = await Promise.all([
        supabase
          .from('consultations')
          .select(`
            id, date, reason, total_amount, status, billed,
            pet:pets(id, name, species, owner_id, owner:owners!owner_id(first_name, last_name)),
            billable_items
          `)
          .eq('tenant_id', currentTenant.id)
          .eq('billed', false)
          .in('status', ['completed', 'in_progress'])
          .order('date', { ascending: false })
          .limit(50),
        supabase
          .from('pet_services')
          .select(`
            id, performed_at, service_name, price, status,
            pet:pets(id, name, species, owner_id, owner:owners!owner_id(first_name, last_name))
          `)
          .eq('tenant_id', currentTenant.id)
          .in('service_type', ['grooming', 'bathing', 'nail_trim', 'haircut', 'spa'])
          .in('status', ['completed', 'in_progress'])
          .order('performed_at', { ascending: false })
          .limit(50),
        supabase
          .from('pet_services')
          .select(`
            id, performed_at, service_name, price, status,
            pet:pets(id, name, species, owner_id, owner:owners!owner_id(first_name, last_name))
          `)
          .eq('tenant_id', currentTenant.id)
          .in('service_type', ['daycare', 'walk', 'overnight'])
          .in('status', ['completed', 'in_progress'])
          .order('performed_at', { ascending: false })
          .limit(50)
      ]);

      const charges: PendingCharge[] = [];

      if (consultationsRes.data) {
        consultationsRes.data.forEach((c: any) => {
          charges.push({
            id: c.id,
            type: 'consultation',
            pet_id: c.pet?.id || '',
            pet_name: c.pet?.name || 'N/A',
            owner_id: c.pet?.owner_id || '',
            owner_name: formatOwnerName(c.pet?.owner),
            description: c.reason || 'Consulta veterinaria',
            amount: c.total_amount || 0,
            date: c.date,
            status: c.status,
            items: c.billable_items || []
          });
        });
      }

      if (groomingRes.data) {
        groomingRes.data.forEach((g: any) => {
          charges.push({
            id: g.id,
            type: 'grooming',
            pet_id: g.pet?.id || '',
            pet_name: g.pet?.name || 'N/A',
            owner_id: g.pet?.owner_id || '',
            owner_name: formatOwnerName(g.pet?.owner),
            description: g.service_name || 'Servicio de estetica',
            amount: g.price || 0,
            date: g.performed_at,
            status: g.status
          });
        });
      }

      if (daycareRes.data) {
        daycareRes.data.forEach((d: any) => {
          charges.push({
            id: d.id,
            type: 'daycare',
            pet_id: d.pet?.id || '',
            pet_name: d.pet?.name || 'N/A',
            owner_id: d.pet?.owner_id || '',
            owner_name: formatOwnerName(d.pet?.owner),
            description: d.service_name || 'Guarderia/Cuidado',
            amount: d.price || 0,
            date: d.performed_at,
            status: d.status
          });
        });
      }

      charges.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPendingCharges(charges);
    } catch (error) {
      console.error('Error loading pending charges:', error);
    }
  };

  const groupChargesByPet = (): PetGroup[] => {
    const groups: Record<string, PetGroup> = {};

    pendingCharges.forEach(charge => {
      if (!charge.pet_id) return;

      if (!groups[charge.pet_id]) {
        groups[charge.pet_id] = {
          pet_id: charge.pet_id,
          pet_name: charge.pet_name,
          owner_id: charge.owner_id,
          owner_name: charge.owner_name,
          species: '',
          charges: [],
          total_amount: 0
        };
      }

      groups[charge.pet_id].charges.push(charge);
      groups[charge.pet_id].total_amount += charge.amount;
    });

    return Object.values(groups).sort((a, b) => b.total_amount - a.total_amount);
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', currentTenant!.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', currentTenant!.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const loadPets = async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('id, name, species, owner_id, owner:owners!owner_id(first_name, last_name)')
        .eq('tenant_id', currentTenant!.id)
        .order('name');

      if (error) throw error;

      const formatted = data?.map((p: any) => ({
        id: p.id,
        name: p.name,
        species: p.species,
        owner_id: p.owner_id,
        owner_name: formatOwnerName(p.owner)
      })) || [];

      setPets(formatted);
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  };

  const selectPetGroup = (petId: string) => {
    const groups = groupChargesByPet();
    const group = groups.find(g => g.pet_id === petId);

    if (!group) {
      showInfo('No hay cobros pendientes para esta mascota');
      return;
    }

    setCart([]);
    setLinkedSources([]);
    setSelectedPet(petId);
    setSelectedPetGroup(petId);

    const newCart: CartItem[] = [];
    const newSources: { type: string; id: string }[] = [];

    group.charges.forEach(charge => {
      if (charge.items && charge.items.length > 0) {
        charge.items.forEach((item: any) => {
          newCart.push({
            ...item,
            discount: item.discount || 0,
            source_id: charge.id,
            source_type: charge.type
          });
        });
      } else {
        newCart.push({
          type: charge.type,
          id: charge.id,
          name: `${CHARGE_TYPE_CONFIG[charge.type]?.label || 'Servicio'}: ${charge.description}`,
          quantity: 1,
          unit_price: charge.amount,
          discount: 0,
          source_id: charge.id,
          source_type: charge.type
        });
      }
      newSources.push({ type: charge.type, id: charge.id });
    });

    setCart(newCart);
    setLinkedSources(newSources);
    showSuccess(`Cobros de ${group.pet_name} cargados al carrito`);
  };

  const toggleGroupExpanded = (petId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(petId)) {
        next.delete(petId);
      } else {
        next.add(petId);
      }
      return next;
    });
  };

  const addToCart = (item: Product | Service, type: 'product' | 'service') => {
    const existing = cart.find(c => c.id === item.id && c.type === type && !c.source_id);

    if (existing) {
      setCart(cart.map(c =>
        c.id === item.id && c.type === type && !c.source_id
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      setCart([...cart, {
        type,
        id: item.id,
        name: item.name,
        quantity: 1,
        unit_price: item.price,
        discount: 0
      }]);
    }
  };

  const removeFromCart = (index: number) => {
    const item = cart[index];
    if (item.source_id) {
      setLinkedSources(prev => prev.filter(s => s.id !== item.source_id));
    }
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, delta: number) => {
    const newQuantity = cart[index].quantity + delta;
    if (newQuantity <= 0) {
      removeFromCart(index);
      return;
    }
    setCart(cart.map((item, i) =>
      i === index ? { ...item, quantity: newQuantity } : item
    ));
  };

  const clearCart = () => {
    setCart([]);
    setLinkedSources([]);
    setSelectedPet('');
    setSelectedPetGroup(null);
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  const calculateDiscount = () => {
    return cart.reduce((sum, item) => sum + item.discount, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  const processSale = async () => {
    if (cart.length === 0) {
      showError('El carrito esta vacio');
      return;
    }

    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario no autenticado');

      const saleNumber = await generateSaleNumber();
      const subtotal = calculateSubtotal();
      const discount = calculateDiscount();
      const total = calculateTotal();

      const consultationIds = linkedSources.filter(s => s.type === 'consultation').map(s => s.id);

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{
          tenant_id: currentTenant!.id,
          sale_number: saleNumber,
          pet_id: selectedPet || null,
          consultation_id: consultationIds[0] || null,
          subtotal,
          tax: 0,
          discount,
          total,
          payment_method: paymentMethod,
          payment_status: 'paid',
          cashier_id: userData.user.id
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = cart.map(item => ({
        tenant_id: currentTenant!.id,
        sale_id: saleData.id,
        item_type: item.source_type || item.type,
        product_id: item.type === 'product' && !item.source_id ? item.id : null,
        service_id: item.type === 'service' && !item.source_id ? item.id : null,
        description: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.unit_price * item.quantity,
        discount: item.discount,
        total: (item.unit_price * item.quantity) - item.discount
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      for (const source of linkedSources) {
        if (source.type === 'consultation') {
          await supabase
            .from('consultations')
            .update({ billed: true, status: 'completed' })
            .eq('id', source.id);
        } else if (source.type === 'grooming' || source.type === 'daycare') {
          await supabase
            .from('pet_services')
            .update({ status: 'completed' })
            .eq('id', source.id);
        }
      }

      if (linkedSources.length > 0) {
        window.dispatchEvent(new CustomEvent('consultation:billing-updated'));
      }

      showSuccess(`Venta ${saleNumber} procesada exitosamente`);
      clearCart();
      loadProducts();
      loadPendingCharges();

    } catch (error: any) {
      console.error('Error processing sale:', error);
      showError('Error al procesar la venta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateSaleNumber = async () => {
    const { data, error } = await supabase.rpc('generate_sale_number', {
      p_tenant_id: currentTenant!.id
    });

    if (error) throw error;
    return data;
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const petGroups = groupChargesByPet();
  const filteredPetGroups = petGroups.filter(g =>
    g.pet_name.toLowerCase().includes(pendingSearchTerm.toLowerCase()) ||
    g.owner_name.toLowerCase().includes(pendingSearchTerm.toLowerCase())
  );

  const selectedPetInfo = pets.find(p => p.id === selectedPet);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Punto de Venta</h1>
          <p className="text-gray-600">Procesa ventas y cobra servicios pendientes</p>
        </div>
      </div>

      {selectedPetGroup && selectedPetInfo && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <PawPrint className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-emerald-900">Cobrando servicios de: {selectedPetInfo.name}</h3>
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <User className="w-4 h-4" />
                  {selectedPetInfo.owner_name}
                  <span className="text-emerald-500">|</span>
                  <span>{linkedSources.length} servicio(s) pendiente(s)</span>
                </div>
              </div>
            </div>
            <button
              onClick={clearCart}
              className="px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
            >
              Cambiar mascota
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setTabType('pending')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  tabType === 'pending'
                    ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Clock className="w-4 h-4" />
                Pendientes ({petGroups.length} mascotas)
              </button>
              <button
                onClick={() => setTabType('products')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  tabType === 'products'
                    ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Package className="w-4 h-4" />
                Productos
              </button>
              <button
                onClick={() => setTabType('services')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  tabType === 'services'
                    ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                Servicios
              </button>
            </div>

            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={tabType === 'pending' ? 'Buscar por mascota o dueno...' : `Buscar ${tabType === 'products' ? 'productos' : 'servicios'}...`}
                  value={tabType === 'pending' ? pendingSearchTerm : searchTerm}
                  onChange={(e) => tabType === 'pending' ? setPendingSearchTerm(e.target.value) : setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {tabType === 'pending' && (
                <div className="space-y-3 max-h-[450px] overflow-y-auto">
                  {filteredPetGroups.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No hay cobros pendientes</p>
                      <p className="text-sm mt-1">Los servicios completados apareceran aqui</p>
                    </div>
                  ) : (
                    filteredPetGroups.map(group => {
                      const isExpanded = expandedGroups.has(group.pet_id);
                      const isSelected = selectedPetGroup === group.pet_id;

                      return (
                        <div
                          key={group.pet_id}
                          className={`rounded-xl border overflow-hidden transition-all ${
                            isSelected
                              ? 'border-emerald-300 bg-emerald-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'bg-emerald-200' : 'bg-gray-100'
                              }`}>
                                <PawPrint className={`w-6 h-6 ${isSelected ? 'text-emerald-700' : 'text-gray-500'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-gray-900">{group.pet_name}</h4>
                                  {isSelected && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-200 text-emerald-800">
                                      Seleccionado
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <User className="w-3.5 h-3.5" />
                                  {group.owner_name}
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {group.charges.map(charge => {
                                    const config = CHARGE_TYPE_CONFIG[charge.type];
                                    return (
                                      <span
                                        key={charge.id}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config?.bg} ${config?.color}`}
                                      >
                                        {config?.label}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-xl font-bold text-gray-900">${group.total_amount.toFixed(2)}</div>
                                <div className="text-xs text-gray-500">{group.charges.length} servicio(s)</div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => selectPetGroup(group.pet_id)}
                                  disabled={isSelected}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    isSelected
                                      ? 'bg-emerald-200 text-emerald-700 cursor-default'
                                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  }`}
                                >
                                  {isSelected ? 'Cargado' : 'Cobrar'}
                                </button>
                                <button
                                  onClick={() => toggleGroupExpanded(group.pet_id)}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-gray-200 bg-gray-50 p-3">
                              <div className="space-y-2">
                                {group.charges.map(charge => {
                                  const config = CHARGE_TYPE_CONFIG[charge.type];
                                  const Icon = config?.icon || FileText;
                                  return (
                                    <div key={charge.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100">
                                      <div className={`w-8 h-8 rounded-lg ${config?.bg} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className={`w-4 h-4 ${config?.color}`} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-gray-900 truncate">{charge.description}</div>
                                        <div className="text-xs text-gray-500">
                                          {new Date(charge.date).toLocaleDateString('es-MX')}
                                        </div>
                                      </div>
                                      <div className="font-semibold text-gray-900">${charge.amount.toFixed(2)}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {tabType === 'products' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[450px] overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No hay productos disponibles</p>
                    </div>
                  ) : (
                    filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product, 'product')}
                        disabled={product.stock === 0}
                        className="p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <h3 className="font-medium text-gray-900 mb-1 truncate">{product.name}</h3>
                        <p className="text-xs text-gray-500 mb-2">{product.category}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-emerald-600">${product.price}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            product.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {product.stock} {product.unit}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {tabType === 'services' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[450px] overflow-y-auto">
                  {filteredServices.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No hay servicios disponibles</p>
                    </div>
                  ) : (
                    filteredServices.map(service => (
                      <button
                        key={service.id}
                        onClick={() => addToCart(service, 'service')}
                        className="p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left"
                      >
                        <h3 className="font-medium text-gray-900 mb-1 truncate">{service.name}</h3>
                        <p className="text-xs text-gray-500 mb-2">{service.category}</p>
                        <span className="text-lg font-bold text-emerald-600">${service.price}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                Carrito de Venta
              </h3>
            </div>

            <div className="p-4">
              {!selectedPetGroup && (
                <div className="mb-4" ref={petSearchRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mascota</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por mascota o dueno..."
                      value={petSearchTerm}
                      onChange={(e) => {
                        setPetSearchTerm(e.target.value);
                        setShowPetDropdown(true);
                      }}
                      onFocus={() => setShowPetDropdown(true)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    {showPetDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg max-h-60 overflow-y-auto">
                        {pets
                          .filter(pet =>
                            pet.name.toLowerCase().includes(petSearchTerm.toLowerCase()) ||
                            pet.owner_name.toLowerCase().includes(petSearchTerm.toLowerCase())
                          )
                          .slice(0, 10)
                          .map(pet => (
                            <button
                              key={pet.id}
                              onClick={() => {
                                setSelectedPet(pet.id);
                                setPetSearchTerm('');
                                setShowPetDropdown(false);
                              }}
                              className={`w-full px-3 py-2.5 text-left hover:bg-emerald-50 transition-colors flex items-center gap-3 ${
                                selectedPet === pet.id ? 'bg-emerald-50' : ''
                              }`}
                            >
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <PawPrint className="w-4 h-4 text-gray-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm">{pet.name}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <span className="text-gray-400">{pet.species}</span>
                                  <span className="text-gray-300">|</span>
                                  <User className="w-3 h-3" />
                                  {pet.owner_name}
                                </div>
                              </div>
                              {selectedPet === pet.id && (
                                <span className="text-emerald-600 text-xs font-medium">Seleccionado</span>
                              )}
                            </button>
                          ))}
                        {pets.filter(pet =>
                          pet.name.toLowerCase().includes(petSearchTerm.toLowerCase()) ||
                          pet.owner_name.toLowerCase().includes(petSearchTerm.toLowerCase())
                        ).length === 0 && (
                          <div className="px-3 py-4 text-center text-gray-500 text-sm">
                            No se encontraron mascotas
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedPet && !selectedPetGroup && (
                    <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PawPrint className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-800">
                          {pets.find(p => p.id === selectedPet)?.name}
                        </span>
                        <span className="text-xs text-emerald-600">
                          - {pets.find(p => p.id === selectedPet)?.owner_name}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedPet('')}
                        className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 mb-4 max-h-[280px] overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Carrito vacio</p>
                    <p className="text-xs mt-1">Selecciona una mascota con cobros pendientes</p>
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm truncate">{item.name}</h4>
                          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                            item.type === 'product' ? 'bg-blue-100 text-blue-700' :
                            item.type === 'service' ? 'bg-purple-100 text-purple-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {item.type === 'product' ? 'Producto' : item.type === 'service' ? 'Servicio' : 'Servicio vinculado'}
                          </span>
                        </div>
                        <button
                          onClick={() => removeFromCart(index)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(index, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium text-gray-900">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(index, 1)}
                            className="w-7 h-7 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">${item.unit_price.toFixed(2)} c/u</div>
                          <div className="font-semibold text-gray-900">
                            ${(item.unit_price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 py-4 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-900">${calculateSubtotal().toFixed(2)}</span>
                </div>
                {calculateDiscount() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Descuento</span>
                    <span className="text-red-600">-${calculateDiscount().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total</span>
                  <span className="text-emerald-600">${calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Metodo de pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(method => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.value}
                        onClick={() => setPaymentMethod(method.value)}
                        className={`p-2.5 rounded-lg border text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                          paymentMethod === method.value
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={processSale}
                disabled={cart.length === 0 || loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <Receipt className="w-5 h-5" />
                {loading ? 'Procesando...' : `Cobrar $${calculateTotal().toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
