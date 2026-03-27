import { Plus, Package, TrendingUp, AlertTriangle, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import Table from '../ui/Table';
import Filters from '../ui/Filters';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { FormField, Input, Textarea } from '../ui/FormField';
import Autocomplete from '../ui/Autocomplete';

const mockProducts = [
  {
    id: 1,
    name: 'Alimento Premium 15kg',
    category: 'Alimentos',
    price: '$450',
    stock: 45,
    status: 'Disponible',
    sold: 156,
  },
  {
    id: 2,
    name: 'Collar antipulgas',
    category: 'Accesorios',
    price: '$120',
    stock: 8,
    status: 'Stock bajo',
    sold: 89,
  },
  {
    id: 3,
    name: 'Shampoo medicado',
    category: 'Higiene',
    price: '$85',
    stock: 0,
    status: 'Agotado',
    sold: 234,
  },
  {
    id: 4,
    name: 'Juguete interactivo',
    category: 'Juguetes',
    price: '$180',
    stock: 23,
    status: 'Disponible',
    sold: 67,
  },
];

export default function Comercio() {
  const [showNewProductModal, setShowNewProductModal] = useState(false);

  const columns = [
    {
      key: 'name',
      label: 'Producto',
      sortable: true,
      render: (value: string, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{row.category}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      label: 'Precio',
      sortable: true,
      render: (value: string) => (
        <span className="font-semibold text-gray-900">{value}</span>
      ),
    },
    {
      key: 'stock',
      label: 'Stock',
      sortable: true,
      render: (value: number, row: any) => (
        <div>
          <p className={`font-semibold ${value === 0 ? 'text-red-600' : value < 10 ? 'text-amber-600' : 'text-gray-900'}`}>
            {value} unidades
          </p>
        </div>
      ),
    },
    {
      key: 'sold',
      label: 'Vendidos',
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <span className="text-gray-900">{value}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (value: string) => {
        const variants: any = {
          'Disponible': 'success',
          'Stock bajo': 'warning',
          'Agotado': 'error',
        };
        return <Badge variant={variants[value] || 'default'}>{value}</Badge>;
      },
    },
  ];

  const filters = [
    {
      key: 'category',
      label: 'Categoría',
      type: 'select' as const,
      options: [
        { value: 'food', label: 'Alimentos' },
        { value: 'accessories', label: 'Accesorios' },
        { value: 'hygiene', label: 'Higiene' },
        { value: 'toys', label: 'Juguetes' },
        { value: 'medicine', label: 'Medicamentos' },
      ],
    },
    {
      key: 'status',
      label: 'Estado',
      type: 'select' as const,
      options: [
        { value: 'available', label: 'Disponible' },
        { value: 'low', label: 'Stock bajo' },
        { value: 'out', label: 'Agotado' },
      ],
    },
    {
      key: 'price',
      label: 'Rango de precio',
      type: 'select' as const,
      options: [
        { value: 'low', label: 'Menos de $100' },
        { value: 'medium', label: '$100 - $500' },
        { value: 'high', label: 'Más de $500' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Comercio</h1>
          <p className="text-sm text-gray-500 mt-1">
            Catálogo de productos, inventario y ventas
          </p>
        </div>
        <button
          onClick={() => setShowNewProductModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Nuevo producto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">$127,450</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Ventas del mes</p>
          <p className="text-xs text-green-600 mt-1">+12.5% vs mes anterior</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">234</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Productos activos</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Stock bajo</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">1,234</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Ventas este mes</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <Filters
          filters={filters}
          searchPlaceholder="Buscar por nombre, SKU o categoría..."
        />
      </div>

      <Table columns={columns} data={mockProducts} actions={() => null} />

      <Modal
        isOpen={showNewProductModal}
        onClose={() => setShowNewProductModal(false)}
        title="Nuevo producto"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowNewProductModal(false)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Cancelar
            </button>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
              Guardar producto
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <FormField label="Nombre del producto" required>
              <Input placeholder="Ej: Alimento Premium 15kg" />
            </FormField>

            <FormField label="SKU / Código">
              <Input placeholder="SKU-001" />
            </FormField>

            <FormField label="Categoría" required>
              <Autocomplete
                options={[
                  { value: 'food', label: 'Alimentos' },
                  { value: 'accessories', label: 'Accesorios' },
                  { value: 'hygiene', label: 'Higiene' },
                  { value: 'toys', label: 'Juguetes' },
                  { value: 'medicine', label: 'Medicamentos' },
                ]}
                placeholder="Selecciona una categoría"
              />
            </FormField>

            <FormField label="Marca">
              <Input placeholder="Nombre de la marca" />
            </FormField>

            <FormField label="Precio de venta" required>
              <Input type="number" placeholder="$0.00" />
            </FormField>

            <FormField label="Precio de costo">
              <Input type="number" placeholder="$0.00" />
            </FormField>

            <FormField label="Stock inicial" required>
              <Input type="number" placeholder="0" />
            </FormField>

            <FormField label="Stock mínimo">
              <Input type="number" placeholder="10" />
            </FormField>
          </div>

          <FormField label="Descripción">
            <Textarea placeholder="Descripción detallada del producto..." />
          </FormField>

          <div className="pt-4 border-t border-gray-200">
            <FormField label="Imagen del producto">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors cursor-pointer">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm text-gray-600">Click para subir imagen</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG hasta 5MB</p>
              </div>
            </FormField>
          </div>
        </div>
      </Modal>
    </div>
  );
}
