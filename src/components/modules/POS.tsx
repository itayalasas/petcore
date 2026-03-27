import { ShoppingCart, Trash2, Search, Receipt, Package, Briefcase, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import Badge from '../ui/Badge';

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
  type: 'product' | 'service';
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  discount: number;
}

interface Pet {
  id: string;
  name: string;
  owner_name: string;
}

interface Consultation {
  id: string;
  pet_id: string;
  pet_name: string;
  reason: string;
  billable_items: CartItem[];
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

export default function POS() {
  const { currentTenant } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabType, setTabType] = useState<'products' | 'services'>('products');
  const [selectedPet, setSelectedPet] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [linkedConsultation, setLinkedConsultation] = useState<Consultation | null>(null);

  useEffect(() => {
    if (currentTenant) {
      loadProducts();
      loadServices();
      loadPets();
      checkForConsultation();
    }
  }, [currentTenant]);

  const checkForConsultation = async () => {
    const hash = window.location.hash;
    const match = hash.match(/consultation=([^&]+)/);

    if (match) {
      const consultationId = match[1];
      await loadConsultation(consultationId);
      window.location.hash = '#pos';
    }
  };

  const loadConsultation = async (consultationId: string) => {
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
          pet:pets(name)
        `)
        .eq('id', consultationId)
        .single();

      if (error) throw error;

      if (data.billed) {
        alert('Esta consulta ya ha sido facturada');
        return;
      }

      const consultation: Consultation = {
        id: data.id,
        pet_id: data.pet_id,
        pet_name: (data.pet as any)?.name || 'N/A',
        reason: data.reason,
        billable_items: data.billable_items || [],
        total_amount: data.total_amount
      };

      setLinkedConsultation(consultation);
      setSelectedPet(data.pet_id);
      setCart(consultation.billable_items.map(item => ({
        ...item,
        discount: 0
      })));

    } catch (error) {
      console.error('Error loading consultation:', error);
      alert('Error al cargar la consulta');
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
        .select('id, name, owner:owners!owner_id(first_name, last_name)')
        .eq('tenant_id', currentTenant!.id)
        .order('name');

      if (error) throw error;

      const formatted = data?.map((p: any) => ({
        id: p.id,
        name: p.name,
        owner_name: formatOwnerName(p.owner)
      })) || [];

      setPets(formatted);
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  };

  const addToCart = (item: Product | Service, type: 'product' | 'service') => {
    const existing = cart.find(c => c.id === item.id && c.type === type);

    if (existing) {
      setCart(cart.map(c =>
        c.id === item.id && c.type === type
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
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }
    setCart(cart.map((item, i) =>
      i === index ? { ...item, quantity } : item
    ));
  };

  const updateDiscount = (index: number, discount: number) => {
    setCart(cart.map((item, i) =>
      i === index ? { ...item, discount: discount || 0 } : item
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
      alert('El carrito está vacío');
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

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{
          tenant_id: currentTenant!.id,
          sale_number: saleNumber,
          pet_id: selectedPet || null,
          consultation_id: linkedConsultation?.id || null,
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

      if (linkedConsultation) {
        const { error: consultationError } = await supabase
          .from('consultations')
          .update({ billed: true })
          .eq('id', linkedConsultation.id);

        if (consultationError) throw consultationError;

        window.dispatchEvent(new CustomEvent('consultation:billing-updated', {
          detail: {
            consultationId: linkedConsultation.id,
          },
        }));
      }

      alert(`Venta ${saleNumber} procesada exitosamente`);
      setCart([]);
      setSelectedPet('');
      setLinkedConsultation(null);
      loadProducts();

      if (linkedConsultation) {
        window.dispatchEvent(new CustomEvent('app:navigate', { detail: { view: 'salud' } }));
      }
    } catch (error: any) {
      console.error('Error processing sale:', error);
      alert('Error al procesar la venta: ' + error.message);
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
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShoppingCart className="w-7 h-7 text-cyan-500" />
          Punto de Venta (POS)
        </h1>
        <p className="text-slate-400 mt-1">Sistema de ventas integrado con consultas veterinarias</p>
      </div>

      {linkedConsultation && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-400">Consulta Vinculada</h3>
            <p className="text-sm text-slate-300">
              Mascota: <span className="font-medium">{linkedConsultation.pet_name}</span> - {linkedConsultation.reason}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Los items de esta consulta han sido cargados automáticamente
            </p>
          </div>
          <Badge variant="info">A Cobrar</Badge>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setTabType('products')}
                className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                  tabType === 'products'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-4 h-4 inline mr-2" />
                Productos
              </button>
              <button
                onClick={() => setTabType('services')}
                className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                  tabType === 'services'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Briefcase className="w-4 h-4 inline mr-2" />
                Servicios
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder={`Buscar ${tabType === 'products' ? 'productos' : 'servicios'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
              {tabType === 'products' ? (
                filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product, 'product')}
                    disabled={product.stock === 0}
                    className="p-4 bg-slate-900 border border-slate-700 rounded-lg hover:border-cyan-500 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <h3 className="font-semibold text-white mb-1">{product.name}</h3>
                    <p className="text-sm text-slate-400 mb-2">{product.category}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-cyan-400">${product.price}</span>
                      <Badge variant={product.stock > 10 ? 'success' : 'warning'}>
                        {product.stock} {product.unit}
                      </Badge>
                    </div>
                  </button>
                ))
              ) : (
                filteredServices.map(service => (
                  <button
                    key={service.id}
                    onClick={() => addToCart(service, 'service')}
                    className="p-4 bg-slate-900 border border-slate-700 rounded-lg hover:border-cyan-500 transition-all text-left"
                  >
                    <h3 className="font-semibold text-white mb-1">{service.name}</h3>
                    <p className="text-sm text-slate-400 mb-2">{service.category}</p>
                    <span className="text-lg font-bold text-cyan-400">${service.price}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-cyan-500" />
              Carrito de Venta
            </h3>

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-2">Mascota (Opcional)</label>
              <select
                value={selectedPet}
                onChange={(e) => setSelectedPet(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                disabled={!!linkedConsultation}
              >
                <option value="">Sin mascota asociada</option>
                {pets.map(pet => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name} - {pet.owner_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Carrito vacío</p>
                </div>
              ) : (
                cart.map((item, index) => (
                  <div key={index} className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-white text-sm">{item.name}</h4>
                        <Badge variant={item.type === 'product' ? 'default' : 'info'}>
                          {item.type === 'product' ? 'Producto' : 'Servicio'}
                        </Badge>
                      </div>
                      <button
                        onClick={() => removeFromCart(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <label className="text-slate-400 text-xs">Cantidad</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(index, parseInt(e.target.value))}
                          className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs">Descuento</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount}
                          onChange={(e) => updateDiscount(index, parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white"
                        />
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between text-sm">
                      <span className="text-slate-400">Subtotal:</span>
                      <span className="font-semibold text-white">
                        ${((item.unit_price * item.quantity) - item.discount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 py-4 border-t border-slate-700">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Subtotal:</span>
                <span className="text-white">${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Descuento:</span>
                <span className="text-red-400">-${calculateDiscount().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-700">
                <span className="text-white">Total:</span>
                <span className="text-cyan-400">${calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-2">Método de Pago</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="other">Otro</option>
              </select>
            </div>

            <button
              onClick={processSale}
              disabled={cart.length === 0 || loading}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Receipt className="w-5 h-5" />
              {loading ? 'Procesando...' : linkedConsultation ? 'Cobrar Consulta' : 'Procesar Venta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
