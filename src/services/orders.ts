import { supabase } from '../lib/supabase';

export interface Order {
  id: string;
  tenant_id: string;
  order_number: string;
  customer_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  service_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface OrderWithDetails extends Order {
  items?: OrderItem[];
  customer?: any;
  created_by_user?: any;
}

export interface Payment {
  id: string;
  tenant_id: string;
  order_id?: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'other';
  payment_date: string;
  reference?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
}

export interface CreateOrderData {
  customer_id?: string;
  items: {
    product_id?: string;
    service_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
  }[];
  tax?: number;
  discount?: number;
  notes?: string;
}

export interface CreatePaymentData {
  order_id?: string;
  amount: number;
  payment_method: Payment['payment_method'];
  reference?: string;
}

export const ordersService = {
  async getAll(tenantId: string): Promise<OrderWithDetails[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:owners(*),
        created_by_user:profiles(*)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<OrderWithDetails | null> {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:owners(*),
        created_by_user:profiles(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!order) return null;

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', id);

    if (itemsError) throw itemsError;

    return {
      ...order,
      items: items || []
    };
  },

  async create(tenantId: string, userId: string, orderData: CreateOrderData): Promise<Order> {
    const orderNumber = await this.generateOrderNumber(tenantId);

    const subtotal = orderData.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const tax = orderData.tax || 0;
    const discount = orderData.discount || 0;
    const total = subtotal + tax - discount;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        tenant_id: tenantId,
        order_number: orderNumber,
        customer_id: orderData.customer_id,
        status: 'pending',
        subtotal,
        tax,
        discount,
        total,
        notes: orderData.notes,
        created_by: userId
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    const orderItems = orderData.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      service_id: item.service_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.unit_price * item.quantity
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    if (orderData.items.some(item => item.product_id)) {
      for (const item of orderData.items) {
        if (item.product_id) {
          const { data: product } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .single();

          if (product) {
            await supabase
              .from('products')
              .update({
                stock_quantity: product.stock_quantity - item.quantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.product_id);
          }
        }
      }
    }

    return order;
  },

  async updateStatus(id: string, status: Order['status']): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async generateOrderNumber(tenantId: string): Promise<string> {
    const { data, error } = await supabase
      .rpc('generate_order_number', { p_tenant_id: tenantId });

    if (error) {
      const timestamp = Date.now();
      return `ORD-${timestamp}`;
    }

    return data;
  },

  async getByStatus(tenantId: string, status: Order['status']): Promise<OrderWithDetails[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:owners(*),
        created_by_user:profiles(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

export const paymentsService = {
  async getAll(tenantId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getByOrder(orderId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(tenantId: string, paymentData: CreatePaymentData): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert([{
        ...paymentData,
        tenant_id: tenantId,
        status: 'completed'
      }])
      .select()
      .single();

    if (error) throw error;

    if (paymentData.order_id) {
      await ordersService.updateStatus(paymentData.order_id, 'completed');
    }

    return data;
  },

  async getTotalByDateRange(
    tenantId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const { data, error } = await supabase
      .from('payments')
      .select('amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate);

    if (error) throw error;

    return (data || []).reduce((sum, payment) => sum + Number(payment.amount), 0);
  }
};
