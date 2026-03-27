import { CreditCard, DollarSign, TrendingUp, Download, Receipt, Plus } from 'lucide-react';
import { useState } from 'react';
import Table from '../ui/Table';
import Filters from '../ui/Filters';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { FormField, Input, Textarea } from '../ui/FormField';
import Autocomplete from '../ui/Autocomplete';

const mockPayments = [
  {
    id: '#PAY-1234',
    customer: 'Juan Pérez',
    method: 'Tarjeta',
    amount: '$450',
    status: 'Completado',
    date: '2024-03-24 10:30',
    invoice: 'FAC-001',
  },
  {
    id: '#PAY-1235',
    customer: 'María García',
    method: 'Transferencia',
    amount: '$1,250',
    status: 'Completado',
    date: '2024-03-24 11:15',
    invoice: 'FAC-002',
  },
  {
    id: '#PAY-1236',
    customer: 'Carlos Ruiz',
    method: 'Efectivo',
    amount: '$280',
    status: 'Pendiente',
    date: '2024-03-24 14:00',
    invoice: 'FAC-003',
  },
];

export default function Pagos() {
  const [showNewPaymentModal, setShowNewPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const clientOptions = [
    { value: '1', label: 'Juan Pérez', subtitle: 'juan@email.com' },
    { value: '2', label: 'María García', subtitle: 'maria@email.com' },
    { value: '3', label: 'Carlos Ruiz', subtitle: 'carlos@email.com' },
  ];

  const paymentMethodOptions = [
    { value: 'card', label: 'Tarjeta de crédito/débito' },
    { value: 'transfer', label: 'Transferencia bancaria' },
    { value: 'cash', label: 'Efectivo' },
    { value: 'wallet', label: 'Billetera digital' },
  ];

  const columns = [
    {
      key: 'id',
      label: 'ID Pago',
      sortable: true,
      render: (value: string, row: any) => (
        <div>
          <p className="font-semibold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{row.date}</p>
        </div>
      ),
    },
    { key: 'customer', label: 'Cliente' },
    {
      key: 'method',
      label: 'Método',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-400" />
          <span>{value}</span>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Monto',
      sortable: true,
      render: (value: string) => (
        <span className="font-semibold text-gray-900">{value}</span>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (value: string) => {
        const variant = value === 'Completado' ? 'success' : 'warning';
        return <Badge variant={variant}>{value}</Badge>;
      },
    },
    {
      key: 'invoice',
      label: 'Factura',
      render: (value: string) => (
        <button className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium">
          <Receipt className="w-4 h-4" />
          {value}
        </button>
      ),
    },
  ];

  const filters = [
    {
      key: 'method',
      label: 'Método de pago',
      type: 'select' as const,
      options: [
        { value: 'card', label: 'Tarjeta' },
        { value: 'transfer', label: 'Transferencia' },
        { value: 'cash', label: 'Efectivo' },
        { value: 'wallet', label: 'Billetera digital' },
      ],
    },
    {
      key: 'status',
      label: 'Estado',
      type: 'select' as const,
      options: [
        { value: 'completed', label: 'Completado' },
        { value: 'pending', label: 'Pendiente' },
        { value: 'refunded', label: 'Reembolsado' },
      ],
    },
    { key: 'date', label: 'Fecha', type: 'date' as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pagos y Finanzas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Cobros, facturación y liquidaciones
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInvoiceModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            <Receipt className="w-5 h-5" />
            Generar factura
          </button>
          <button
            onClick={() => setShowNewPaymentModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Registrar pago
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
            <Download className="w-5 h-5" />
            Exportar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">$127,450</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Ingresos del mes</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
            <TrendingUp className="w-3 h-3" />
            <span>+12.5%</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">156</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Transacciones hoy</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Pagos pendientes</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">$8,450</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Comisiones a pagar</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <Filters
          filters={filters}
          searchPlaceholder="Buscar por ID, cliente o factura..."
        />
      </div>

      <Table columns={columns} data={mockPayments} actions={() => null} />

      <Modal
        isOpen={showNewPaymentModal}
        onClose={() => setShowNewPaymentModal(false)}
        title="Registrar pago"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowNewPaymentModal(false)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Cancelar
            </button>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
              Registrar pago
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <FormField label="Cliente" required>
              <Autocomplete
                options={clientOptions}
                placeholder="Buscar cliente..."
              />
            </FormField>

            <FormField label="Monto" required>
              <Input type="number" placeholder="$0.00" />
            </FormField>

            <FormField label="Método de pago" required>
              <Autocomplete
                options={paymentMethodOptions}
                placeholder="Seleccionar método..."
              />
            </FormField>

            <FormField label="Fecha de pago" required>
              <Input type="datetime-local" />
            </FormField>

            <FormField label="Número de referencia">
              <Input placeholder="Ej: REF-12345" />
            </FormField>

            <FormField label="Comprobante">
              <Input placeholder="Número de comprobante" />
            </FormField>
          </div>

          <FormField label="Concepto" required>
            <Textarea placeholder="Describe el concepto del pago..." />
          </FormField>

          <div className="pt-4 border-t border-gray-200">
            <FormField label="Adjuntar comprobante">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors cursor-pointer">
                <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm text-gray-600">Click para adjuntar archivo</p>
                <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG hasta 5MB</p>
              </div>
            </FormField>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        title="Generar factura"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowInvoiceModal(false)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Cancelar
            </button>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
              Generar factura
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <FormField label="Cliente" required>
              <Autocomplete
                options={clientOptions}
                placeholder="Buscar cliente..."
              />
            </FormField>

            <FormField label="Fecha de emisión" required>
              <Input type="date" />
            </FormField>

            <FormField label="RFC/NIT" required>
              <Input placeholder="Ej: ABC123456XYZ" />
            </FormField>

            <FormField label="Forma de pago" required>
              <Autocomplete
                options={paymentMethodOptions}
                placeholder="Seleccionar forma de pago..."
              />
            </FormField>

            <FormField label="Uso de CFDI">
              <Autocomplete
                options={[
                  { value: 'g01', label: 'G01 - Adquisición de mercancías' },
                  { value: 'g03', label: 'G03 - Gastos en general' },
                  { value: 'p01', label: 'P01 - Por definir' },
                ]}
                placeholder="Seleccionar uso..."
              />
            </FormField>

            <FormField label="Moneda">
              <Autocomplete
                options={[
                  { value: 'mxn', label: 'MXN - Peso Mexicano' },
                  { value: 'usd', label: 'USD - Dólar' },
                  { value: 'eur', label: 'EUR - Euro' },
                ]}
                placeholder="Seleccionar moneda..."
              />
            </FormField>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Conceptos</h3>
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-4 gap-4">
                  <FormField label="Descripción">
                    <Input placeholder="Servicio o producto" />
                  </FormField>
                  <FormField label="Cantidad">
                    <Input type="number" placeholder="1" />
                  </FormField>
                  <FormField label="Precio unitario">
                    <Input type="number" placeholder="$0.00" />
                  </FormField>
                  <FormField label="Importe">
                    <Input type="number" placeholder="$0.00" disabled />
                  </FormField>
                </div>
              </div>
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                + Agregar concepto
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold text-gray-900">$0.00</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">IVA (16%)</span>
              <span className="font-semibold text-gray-900">$0.00</span>
            </div>
            <div className="flex items-center justify-between text-lg pt-2 border-t border-gray-200">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-gray-900">$0.00</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
