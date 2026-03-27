import { useState, useEffect } from 'react';
import { Package, Plus, Search, AlertTriangle, TrendingDown, TrendingUp, CreditCard as Edit2, Trash2, BarChart3, ArrowUp, ArrowDown, Filter, Download } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import Modal from '../ui/Modal';
import { FormField, Input, Textarea } from '../ui/FormField';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';

interface Product {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  category: string;
  brand: string | null;
  price: number;
  cost: number | null;
  stock: number;
  min_stock: number | null;
  unit: string | null;
  is_active: boolean;
  requires_prescription: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface StockMovement {
  id: string;
  product_id: string;
  type: 'entry' | 'exit' | 'adjustment';
  quantity: number;
  reason: string;
  reference: string | null;
  created_at: string;
  created_by: string | null;
}

const CATEGORIES = [
  'Alimentos',
  'Medicamentos',
  'Accesorios',
  'Higiene',
  'Juguetes',
  'Suplementos',
  'Equipos',
  'Otros'
];

const UNITS = ['unidad', 'kg', 'g', 'ml', 'l', 'caja', 'paquete', 'sobre'];

export default function Inventario() {
  const { currentTenant } = useTenant();
  const { showSuccess, showError } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    category: 'Otros',
    brand: '',
    price: '',
    cost: '',
    stock: '',
    min_stock: '5',
    unit: 'unidad',
    is_active: true,
    requires_prescription: false
  });

  const [stockForm, setStockForm] = useState({
    type: 'entry' as 'entry' | 'exit' | 'adjustment',
    quantity: '',
    reason: ''
  });

  useEffect(() => {
    if (currentTenant) {
      loadProducts();
    }
  }, [currentTenant]);

  const loadProducts = async () => {
    if (!currentTenant) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      showError('Error al cargar productos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    try {
      const productData = {
        name: productForm.name,
        description: productForm.description || null,
        sku: productForm.sku || null,
        barcode: productForm.barcode || null,
        category: productForm.category,
        brand: productForm.brand || null,
        price: parseFloat(productForm.price) || 0,
        cost: parseFloat(productForm.cost) || 0,
        stock: parseInt(productForm.stock) || 0,
        min_stock: parseInt(productForm.min_stock) || 5,
        unit: productForm.unit,
        is_active: productForm.is_active,
        requires_prescription: productForm.requires_prescription
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({ ...productData, updated_at: new Date().toISOString() })
          .eq('id', editingProduct.id);

        if (error) throw error;
        showSuccess('Producto actualizado correctamente');
      } else {
        const { error } = await supabase
          .from('products')
          .insert([{ ...productData, tenant_id: currentTenant.id }]);

        if (error) throw error;
        showSuccess('Producto creado correctamente');
      }

      setShowProductModal(false);
      resetProductForm();
      loadProducts();
    } catch (error: any) {
      showError('Error al guardar producto: ' + error.message);
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const quantity = parseInt(stockForm.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        showError('Ingresa una cantidad valida');
        return;
      }

      let newStock = selectedProduct.stock;
      if (stockForm.type === 'entry') {
        newStock += quantity;
      } else if (stockForm.type === 'exit') {
        newStock -= quantity;
        if (newStock < 0) {
          showError('No hay suficiente stock disponible');
          return;
        }
      } else {
        newStock = quantity;
      }

      const { error } = await supabase
        .from('products')
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', selectedProduct.id);

      if (error) throw error;

      showSuccess(`Stock ${stockForm.type === 'entry' ? 'agregado' : stockForm.type === 'exit' ? 'reducido' : 'ajustado'} correctamente`);
      setShowStockModal(false);
      setStockForm({ type: 'entry', quantity: '', reason: '' });
      loadProducts();
    } catch (error: any) {
      showError('Error al ajustar stock: ' + error.message);
    }
  };

  const handleDeleteProduct = async () => {
    if (!editingProduct) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', editingProduct.id);

      if (error) throw error;

      showSuccess('Producto eliminado correctamente');
      setShowDeleteModal(false);
      setEditingProduct(null);
      loadProducts();
    } catch (error: any) {
      showError('Error al eliminar producto: ' + error.message);
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active, updated_at: new Date().toISOString() })
        .eq('id', product.id);

      if (error) throw error;

      showSuccess(`Producto ${product.is_active ? 'desactivado' : 'activado'}`);
      loadProducts();
    } catch (error: any) {
      showError('Error al cambiar estado: ' + error.message);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      category: product.category,
      brand: product.brand || '',
      price: product.price.toString(),
      cost: product.cost?.toString() || '',
      stock: product.stock.toString(),
      min_stock: product.min_stock?.toString() || '5',
      unit: product.unit || 'unidad',
      is_active: product.is_active,
      requires_prescription: product.requires_prescription
    });
    setShowProductModal(true);
  };

  const openStockModal = (product: Product) => {
    setSelectedProduct(product);
    setStockForm({ type: 'entry', quantity: '', reason: '' });
    setShowStockModal(true);
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      sku: '',
      barcode: '',
      category: 'Otros',
      brand: '',
      price: '',
      cost: '',
      stock: '',
      min_stock: '5',
      unit: 'unidad',
      is_active: true,
      requires_prescription: false
    });
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = !categoryFilter || p.category === categoryFilter;

    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = p.stock > 0 && p.stock <= (p.min_stock || 5);
    } else if (stockFilter === 'out') {
      matchesStock = p.stock === 0;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  const stats = {
    total: products.length,
    active: products.filter(p => p.is_active).length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= (p.min_stock || 5)).length,
    outOfStock: products.filter(p => p.stock === 0).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0),
    totalCost: products.reduce((sum, p) => sum + ((p.cost || 0) * p.stock), 0)
  };

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) return { label: 'Agotado', color: 'bg-red-100 text-red-700' };
    if (product.stock <= (product.min_stock || 5)) return { label: 'Stock bajo', color: 'bg-amber-100 text-amber-700' };
    return { label: 'Disponible', color: 'bg-green-100 text-green-700' };
  };

  const exportInventory = () => {
    const csv = [
      ['Nombre', 'SKU', 'Categoria', 'Precio', 'Costo', 'Stock', 'Stock Min', 'Estado'].join(','),
      ...filteredProducts.map(p => [
        `"${p.name}"`,
        p.sku || '',
        p.category,
        p.price,
        p.cost || 0,
        p.stock,
        p.min_stock || 5,
        getStockStatus(p).label
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-600">Gestiona productos, stock y movimientos</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportInventory}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={() => { resetProductForm(); setShowProductModal(true); }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuevo Producto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Productos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Stock Bajo</p>
              <p className="text-2xl font-bold text-amber-600">{stats.lowStock}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Agotados</p>
              <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Valor Inventario</p>
              <p className="text-2xl font-bold text-green-600">${stats.totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, SKU o codigo de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todas las categorias</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setStockFilter('all')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  stockFilter === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStockFilter('low')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  stockFilter === 'low' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Stock bajo
              </button>
              <button
                onClick={() => setStockFilter('out')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  stockFilter === 'out' ? 'bg-red-500 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Agotados
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-500 mt-4">Cargando productos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay productos que coincidan con los filtros</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Categoria</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Precio</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Costo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Stock</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <tr key={product.id} className={`hover:bg-gray-50 ${!product.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            {product.brand && (
                              <p className="text-xs text-gray-500">{product.brand}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{product.sku || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{product.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-900">${product.price.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-600">${(product.cost || 0).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openStockModal(product)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <span className={`font-semibold ${
                            product.stock === 0 ? 'text-red-600' :
                            product.stock <= (product.min_stock || 5) ? 'text-amber-600' : 'text-gray-900'
                          }`}>
                            {product.stock}
                          </span>
                          <span className="text-xs text-gray-500">{product.unit || 'un'}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                          {stockStatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openStockModal(product)}
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Ajustar stock"
                          >
                            <TrendingUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditingProduct(product); setShowDeleteModal(true); }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
        size="lg"
      >
        <form onSubmit={handleSubmitProduct} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormField label="Nombre del producto" required>
                <Input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Ej: Alimento Premium 15kg"
                  required
                />
              </FormField>
            </div>

            <FormField label="SKU">
              <Input
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                placeholder="Ej: ALM-001"
              />
            </FormField>

            <FormField label="Codigo de barras">
              <Input
                value={productForm.barcode}
                onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                placeholder="Ej: 7501234567890"
              />
            </FormField>

            <FormField label="Categoria" required>
              <select
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Marca">
              <Input
                value={productForm.brand}
                onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                placeholder="Ej: Royal Canin"
              />
            </FormField>

            <FormField label="Precio de venta" required>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                placeholder="0.00"
                required
              />
            </FormField>

            <FormField label="Costo">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={productForm.cost}
                onChange={(e) => setProductForm({ ...productForm, cost: e.target.value })}
                placeholder="0.00"
              />
            </FormField>

            <FormField label="Stock actual">
              <Input
                type="number"
                min="0"
                value={productForm.stock}
                onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                placeholder="0"
              />
            </FormField>

            <FormField label="Stock minimo">
              <Input
                type="number"
                min="0"
                value={productForm.min_stock}
                onChange={(e) => setProductForm({ ...productForm, min_stock: e.target.value })}
                placeholder="5"
              />
            </FormField>

            <FormField label="Unidad">
              <select
                value={productForm.unit}
                onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {UNITS.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </FormField>

            <div className="col-span-2">
              <FormField label="Descripcion">
                <Textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Descripcion del producto..."
                  rows={3}
                />
              </FormField>
            </div>

            <div className="col-span-2 flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={productForm.is_active}
                  onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Producto activo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={productForm.requires_prescription}
                  onChange={(e) => setProductForm({ ...productForm, requires_prescription: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Requiere receta</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowProductModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              {editingProduct ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        title={`Ajustar Stock - ${selectedProduct?.name}`}
      >
        {selectedProduct && (
          <form onSubmit={handleStockAdjustment} className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Stock actual</p>
                <p className="text-3xl font-bold text-gray-900">{selectedProduct.stock}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Stock minimo</p>
                <p className="text-lg font-semibold text-gray-600">{selectedProduct.min_stock || 5}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStockForm({ ...stockForm, type: 'entry' })}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  stockForm.type === 'entry'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <ArrowUp className="w-6 h-6" />
                <span className="text-sm font-medium">Entrada</span>
              </button>
              <button
                type="button"
                onClick={() => setStockForm({ ...stockForm, type: 'exit' })}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  stockForm.type === 'exit'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <ArrowDown className="w-6 h-6" />
                <span className="text-sm font-medium">Salida</span>
              </button>
              <button
                type="button"
                onClick={() => setStockForm({ ...stockForm, type: 'adjustment' })}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  stockForm.type === 'adjustment'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="w-6 h-6" />
                <span className="text-sm font-medium">Ajuste</span>
              </button>
            </div>

            <FormField
              label={stockForm.type === 'adjustment' ? 'Nuevo stock' : 'Cantidad'}
              required
            >
              <Input
                type="number"
                min="1"
                value={stockForm.quantity}
                onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                placeholder={stockForm.type === 'adjustment' ? 'Stock final' : 'Cantidad'}
                required
              />
            </FormField>

            <FormField label="Motivo">
              <Input
                value={stockForm.reason}
                onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })}
                placeholder="Ej: Compra de proveedor, Venta directa, Ajuste de inventario..."
              />
            </FormField>

            {stockForm.quantity && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Stock resultante</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stockForm.type === 'entry'
                    ? selectedProduct.stock + parseInt(stockForm.quantity || '0')
                    : stockForm.type === 'exit'
                    ? Math.max(0, selectedProduct.stock - parseInt(stockForm.quantity || '0'))
                    : parseInt(stockForm.quantity || '0')
                  }
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowStockModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-white rounded-lg ${
                  stockForm.type === 'entry' ? 'bg-green-600 hover:bg-green-700' :
                  stockForm.type === 'exit' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {stockForm.type === 'entry' ? 'Registrar entrada' :
                 stockForm.type === 'exit' ? 'Registrar salida' :
                 'Aplicar ajuste'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteProduct}
        title="Eliminar Producto"
        message={`Esta seguro que desea eliminar "${editingProduct?.name}"? Esta accion no se puede deshacer.`}
      />
    </div>
  );
}
