import { Plus, Package, Truck, Clock, CheckCircle2, MapPin } from 'lucide-react';
import { useState } from 'react';
import Table from '../ui/Table';
import Filters from '../ui/Filters';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Tabs from '../ui/Tabs';

const mockOrders = [
  {
    id: '#1234',
    customer: 'Juan Pérez',
    items: '3 productos',
    total: '$1,250',
    status: 'En camino',
    date: '2024-03-24',
    delivery: 'Express',
    address: 'Av. Principal 123',
  },
  {
    id: '#1235',
    customer: 'María García',
    items: '1 producto',
    total: '$450',
    status: 'Preparando',
    date: '2024-03-24',
    delivery: 'Estándar',
    address: 'Calle 45 #678',
  },
  {
    id: '#1236',
    customer: 'Carlos Ruiz',
    items: '5 productos',
    total: '$2,100',
    status: 'Entregado',
    date: '2024-03-23',
    delivery: 'Express',
    address: 'Centro Comercial Piso 2',
  },
];

export default function Ordenes() {
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const columns = [
    {
      key: 'id',
      label: 'Orden',
      sortable: true,
      render: (value: string, row: any) => (
        <div>
          <p className="font-semibold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{row.date}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Cliente',
      render: (value: string, row: any) => (
        <div>
          <p className="text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{row.items}</p>
        </div>
      ),
    },
    {
      key: 'delivery',
      label: 'Entrega',
      render: (value: string, row: any) => (
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <p className="text-sm text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 line-clamp-1">{row.address}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (value: string) => {
        const variants: any = {
          'Preparando': 'warning',
          'En camino': 'info',
          'Entregado': 'success',
          'Cancelado': 'error',
        };
        return <Badge variant={variants[value] || 'default'}>{value}</Badge>;
      },
    },
    {
      key: 'total',
      label: 'Total',
      render: (value: string) => (
        <span className="font-semibold text-gray-900">{value}</span>
      ),
    },
  ];

  const filters = [
    {
      key: 'status',
      label: 'Estado',
      type: 'select' as const,
      options: [
        { value: 'preparing', label: 'Preparando' },
        { value: 'in-transit', label: 'En camino' },
        { value: 'delivered', label: 'Entregado' },
        { value: 'cancelled', label: 'Cancelado' },
      ],
    },
    {
      key: 'delivery',
      label: 'Tipo de entrega',
      type: 'select' as const,
      options: [
        { value: 'express', label: 'Express' },
        { value: 'standard', label: 'Estándar' },
        { value: 'pickup', label: 'Recoger en tienda' },
      ],
    },
    { key: 'date', label: 'Fecha', type: 'date' as const },
  ];

  const handleRowClick = (row: any) => {
    setSelectedOrder(row);
    setShowOrderDetail(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Órdenes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de pedidos, entregas y devoluciones
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Preparando</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">En camino</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">156</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Entregados hoy</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">$45,280</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Ventas del día</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <Filters
          filters={filters}
          searchPlaceholder="Buscar por número de orden o cliente..."
        />
      </div>

      <Table columns={columns} data={mockOrders} onRowClick={handleRowClick} actions={() => null} />

      <Modal
        isOpen={showOrderDetail}
        onClose={() => setShowOrderDetail(false)}
        title={`Orden ${selectedOrder?.id}`}
        size="lg"
      >
        {selectedOrder && (
          <Tabs
            tabs={[
              {
                id: 'details',
                label: 'Detalles',
                icon: Package,
                content: (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Cliente</p>
                        <p className="font-semibold text-gray-900">{selectedOrder.customer}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Fecha</p>
                        <p className="font-semibold text-gray-900">{selectedOrder.date}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Estado</p>
                        <Badge variant="info">{selectedOrder.status}</Badge>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Total</p>
                        <p className="text-xl font-bold text-gray-900">{selectedOrder.total}</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Productos</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-200 rounded"></div>
                            <div>
                              <p className="font-medium text-gray-900">Alimento Premium 15kg</p>
                              <p className="text-sm text-gray-500">Cantidad: 2</p>
                            </div>
                          </div>
                          <p className="font-semibold text-gray-900">$800</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                id: 'tracking',
                label: 'Seguimiento',
                icon: Truck,
                content: (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Orden confirmada</p>
                        <p className="text-sm text-gray-500">24 Mar 2024, 10:30</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">En preparación</p>
                        <p className="text-sm text-gray-500">24 Mar 2024, 11:00</p>
                      </div>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
}
