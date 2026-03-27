import { ShoppingCart, Trash2, Search, Receipt, Package, Briefcase, FileText, Stethoscope, Scissors, Sun, FlaskConical, Plus, Minus, X, Clock, User, PawPrint, CreditCard, Banknote, Building2, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../ui/Modal';

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
  description: string;
  amount: number;
  date: string;
  status: string;
  items?: CartItem[];
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
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [linkedSources, setLinkedSources] = useState<{ type: string; id: string }[]>([]);

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
          pet:pets(id, name, owner:owners!owner_id(first_name, last_name))
        `)
        .eq('id', consultationId)
        .single();

      if (error) throw error;

      if (data.billed) {
        showInfo('Esta consulta ya ha sido cobrada');
        return;
      }

      setSelectedPet(data.pet_id);
      const items: CartItem[] = (data.billable_items || []).map((item: any) => ({
        ...item,
        discount: 0,
        source_id: consultationId,
        source_type: 'consultation'
      }));

      if (items.length === 0) {
        items.push({
          type: 'consultation',
          id: consultationId,
          name: `Consulta: ${data.reason || 'Sin motivo'}`,
          quantity: 1,
          unit_price: data.total_amount || 0,
          discount: 0,
          source_id: consultationId,
          source_type: 'consultation'
        });
      }

      setCart(items);
      setLinkedSources([{ type: 'consultation', id: consultationId }]);
      showSuccess('Consulta cargada al carrito');

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
            pet:pets(id, name, species, owner:owners!owner_id(first_name, last_name)),
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
            pet:pets(id, name, species, owner:owners!owner_id(first_name, last_name))
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
            pet:pets(id, name, species, owner:owners!owner_id(first_name, last_name))
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
          const alreadyCharged = charges.some(ch => ch.id === g.id);
          if (!alreadyCharged) {
            charges.push({
              id: g.id,
              type: 'grooming',
              pet_id: g.pet?.id || '',
              pet_name: g.pet?.name || 'N/A',
              owner_name: formatOwnerName(g.pet?.owner),
              description: g.service_name || 'Servicio de estetica',
              amount: g.price || 0,
              date: g.performed_at,
              status: g.status
            });
          }
        });
      }

      if (daycareRes.data) {
        daycareRes.data.forEach((d: any) => {
          const alreadyCharged = charges.some(ch => ch.id === d.id);
          if (!alreadyCharged) {
            charges.push({
              id: d.id,
              type: 'daycare',
              pet_id: d.pet?.id || '',
              pet_name: d.pet?.name || 'N/A',
              owner_name: formatOwnerName(d.pet?.owner),
              description: d.service_name || 'Guarderia/Cuidado',
              amount: d.price || 0,
              date: d.performed_at,
              status: d.status
            });
          }
        });
      }

      charges.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPendingCharges(charges);
    } catch (error) {
      console.error('Error loading pending charges:', error);
    }
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

  const addPendingChargeToCart = (charge: PendingCharge) => {
    const alreadyInCart = linkedSources.some(s => s.id === charge.id);
    if (alreadyInCart) {
      showInfo('Este cobro ya esta en el carrito');
      return;
    }

    setSelectedPet(charge.pet_id);

    if (charge.items && charge.items.length > 0) {
      const items: CartItem[] = charge.items.map((item: any) => ({
        ...item,
        discount: item.discount || 0,
        source_id: charge.id,
        source_type: charge.type
      }));
      setCart(prev => [...prev, ...items]);
    } else {
      setCart(prev => [...prev, {
        type: charge.type,
        id: charge.id,
        name: `${CHARGE_TYPE_CONFIG[charge.type]?.label || 'Servicio'}: ${charge.description}`,
        quantity: 1,
        unit_price: charge.amount,
        discount: 0,
        source_id: charge.id,
        source_type: charge.type
      }]);
    }

    setLinkedSources(prev => [...prev, { type: charge.type, id: charge.id }]);
    showSuccess(`${CHARGE_TYPE_CONFIG[charge.type]?.label} agregado al carrito`);
    setShowPendingModal(false);
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
        item_type: item.type,
        product_id: item.type === 'product' ? item.id : null,
        service_id: item.type === 'service' ? item.id : null,
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
      setCart([]);
      setSelectedPet('');
      setLinkedSources([]);
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

  const filteredPendingCharges = pendingCharges.filter(c =>
    c.pet_name.toLowerCase().includes(pendingSearchTerm.toLowerCase()) ||
    c.owner_name.toLowerCase().includes(pendingSearchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(pendingSearchTerm.toLowerCase())
  );

  const selectedPetInfo = pets.find(p => p.id === selectedPet);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Punto de Venta</h1>
          <p className="text-gray-600">Procesa ventas y cobra servicios pendientes</p>
        </div>
        <button
          onClick={() => setShowPendingModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <FileText className="w-5 h-5" />
          Cargar cobro pendiente
        </button>
      </div>

      {linkedSources.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">Cobros vinculados</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                {linkedSources.map((source, idx) => {
                  const config = CHARGE_TYPE_CONFIG[source.type];
                  const Icon = config?.icon || FileText;
                  return (
                    <span key={idx} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config?.bg} ${config?.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {config?.label}
                    </span>
                  );
                })}
              </div>
            </div>
            {selectedPetInfo && (
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <PawPrint className="w-4 h-4" />
                {selectedPetInfo.name} - {selectedPetInfo.owner_name}
              </div>
            )}
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
                Pendientes ({pendingCharges.length})
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
                  placeholder={tabType === 'pending' ? 'Buscar por mascota, dueno o servicio...' : `Buscar ${tabType === 'products' ? 'productos' : 'servicios'}...`}
                  value={tabType === 'pending' ? pendingSearchTerm : searchTerm}
                  onChange={(e) => tabType === 'pending' ? setPendingSearchTerm(e.target.value) : setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {tabType === 'pending' && (
                <div className="space-y-2 max-h-[450px] overflow-y-auto">
                  {filteredPendingCharges.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No hay cobros pendientes</p>
                      <p className="text-sm mt-1">Los servicios completados apareceran aqui</p>
                    </div>
                  ) : (
                    filteredPendingCharges.map(charge => {
                      const config = CHARGE_TYPE_CONFIG[charge.type];
                      const Icon = config?.icon || FileText;
                      const isInCart = linkedSources.some(s => s.id === charge.id);

                      return (
                        <button
                          key={charge.id}
                          onClick={() => !isInCart && addPendingChargeToCart(charge)}
                          disabled={isInCart}
                          className={`w-full p-4 rounded-xl border text-left transition-all ${
                            isInCart
                              ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                              : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg ${config?.bg} flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`w-5 h-5 ${config?.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${config?.bg} ${config?.color}`}>
                                  {config?.label}
                                </span>
                                {isInCart && (
                                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                                    En carrito
                                  </span>
                                )}
                              </div>
                              <h4 className="font-medium text-gray-900 truncate">{charge.description}</h4>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <PawPrint className="w-3.5 h-3.5" />
                                  {charge.pet_name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5" />
                                  {charge.owner_name}
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-lg font-bold text-gray-900">${charge.amount.toFixed(2)}</div>
                              <div className="text-xs text-gray-400">
                                {new Date(charge.date).toLocaleDateString('es-MX')}
                              </div>
                            </div>
                            {!isInCart && (
                              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            )}
                          </div>
                        </button>
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
              {!linkedSources.length && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mascota</label>
                  <select
                    value={selectedPet}
                    onChange={(e) => setSelectedPet(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Seleccionar mascota...</option>
                    {pets.map(pet => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} ({pet.species}) - {pet.owner_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2 mb-4 max-h-[280px] overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Carrito vacio</p>
                    <p className="text-xs mt-1">Agrega productos o carga un cobro pendiente</p>
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

      <Modal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        title="Buscar cobro pendiente"
        size="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por mascota, dueno o servicio..."
              value={pendingSearchTerm}
              onChange={(e) => setPendingSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredPendingCharges.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No se encontraron cobros pendientes</p>
              </div>
            ) : (
              filteredPendingCharges.map(charge => {
                const config = CHARGE_TYPE_CONFIG[charge.type];
                const Icon = config?.icon || FileText;
                const isInCart = linkedSources.some(s => s.id === charge.id);

                return (
                  <button
                    key={charge.id}
                    onClick={() => !isInCart && addPendingChargeToCart(charge)}
                    disabled={isInCart}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      isInCart
                        ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg ${config?.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${config?.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${config?.bg} ${config?.color}`}>
                            {config?.label}
                          </span>
                          {isInCart && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                              En carrito
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900">{charge.description}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <PawPrint className="w-3.5 h-3.5" />
                            {charge.pet_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {charge.owner_name}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-bold text-gray-900">${charge.amount.toFixed(2)}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(charge.date).toLocaleDateString('es-MX')}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
