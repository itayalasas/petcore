import { supabase } from '../lib/supabase';

export interface BillingQueueItem {
  id: string;
  tenant_id: string;
  source_type: 'consultation' | 'grooming' | 'daycare' | 'walk' | 'overnight' | 'vaccine' | 'other';
  source_id?: string;
  pet_id?: string;
  owner_id?: string;
  description: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  amount: number;
  requested_by?: string;
  status: 'pending' | 'processed' | 'cancelled';
  processed_at?: string;
  processed_by?: string;
  order_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  pet?: { name: string; species: string };
  owner?: { first_name: string; last_name: string };
  requester?: { display_name: string; email: string };
}

export interface NotificationCounts {
  pendingConsultations: number;
  pendingGrooming: number;
  pendingDaycare: number;
  pendingOrders: number;
  pendingBilling: number;
  totalPending: number;
}

export const notificationsService = {
  async getCounts(tenantId: string): Promise<NotificationCounts> {
    const [consultations, grooming, daycare, orders, billing] = await Promise.all([
      this.getPendingConsultationsCount(tenantId),
      this.getPendingGroomingCount(tenantId),
      this.getPendingDaycareCount(tenantId),
      this.getPendingOrdersCount(tenantId),
      this.getPendingBillingCount(tenantId),
    ]);

    return {
      pendingConsultations: consultations,
      pendingGrooming: grooming,
      pendingDaycare: daycare,
      pendingOrders: orders,
      pendingBilling: billing,
      totalPending: consultations + grooming + daycare + orders + billing,
    };
  },

  async getPendingConsultationsCount(tenantId: string): Promise<number> {
    const { count, error } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'confirmed'])
      .not('service_id', 'is', null);

    if (error) {
      console.error('Error counting consultations:', error);
      return 0;
    }
    return count || 0;
  },

  async getPendingGroomingCount(tenantId: string): Promise<number> {
    const { count, error } = await supabase
      .from('pet_services')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('service_type', ['bath', 'haircut', 'full_grooming', 'nails', 'teeth', 'ears'])
      .eq('status', 'in_progress');

    if (error) {
      console.error('Error counting grooming:', error);
      return 0;
    }
    return count || 0;
  },

  async getPendingDaycareCount(tenantId: string): Promise<number> {
    const { count, error } = await supabase
      .from('pet_services')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('service_type', ['daycare', 'walk', 'overnight'])
      .eq('status', 'in_progress');

    if (error) {
      console.error('Error counting daycare:', error);
      return 0;
    }
    return count || 0;
  },

  async getPendingOrdersCount(tenantId: string): Promise<number> {
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'processing']);

    if (error) {
      console.error('Error counting orders:', error);
      return 0;
    }
    return count || 0;
  },

  async getPendingBillingCount(tenantId: string): Promise<number> {
    const { count, error } = await supabase
      .from('billing_queue')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error counting billing queue:', error);
      return 0;
    }
    return count || 0;
  },

  async getPendingBillingItems(tenantId: string): Promise<BillingQueueItem[]> {
    const { data, error } = await supabase
      .from('billing_queue')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const itemsWithDetails = await Promise.all(
      (data || []).map(async (item) => {
        let pet = null;
        let owner = null;
        let requester = null;

        if (item.pet_id) {
          const { data: petData } = await supabase
            .from('pets')
            .select('name, species')
            .eq('id', item.pet_id)
            .maybeSingle();
          pet = petData;
        }

        if (item.owner_id) {
          const { data: ownerData } = await supabase
            .from('owners')
            .select('first_name, last_name')
            .eq('id', item.owner_id)
            .maybeSingle();
          owner = ownerData;
        }

        if (item.requested_by) {
          const { data: requesterData } = await supabase
            .from('profiles')
            .select('display_name, email')
            .eq('id', item.requested_by)
            .maybeSingle();
          requester = requesterData;
        }

        return { ...item, pet, owner, requester };
      })
    );

    return itemsWithDetails;
  },

  async sendToBilling(
    tenantId: string,
    userId: string,
    data: {
      sourceType: BillingQueueItem['source_type'];
      sourceId?: string;
      petId?: string;
      ownerId?: string;
      description: string;
      items?: Array<{ description: string; quantity: number; unit_price: number }>;
      amount: number;
      notes?: string;
    }
  ): Promise<BillingQueueItem> {
    const { data: result, error } = await supabase
      .from('billing_queue')
      .insert([{
        tenant_id: tenantId,
        source_type: data.sourceType,
        source_id: data.sourceId,
        pet_id: data.petId,
        owner_id: data.ownerId,
        description: data.description,
        items: data.items || [],
        amount: data.amount,
        requested_by: userId,
        status: 'pending',
        notes: data.notes,
      }])
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  async processBillingItem(
    itemId: string,
    userId: string,
    _saleId?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('billing_queue')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
        processed_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (error) throw error;
  },

  async cancelBillingItem(itemId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('billing_queue')
      .update({
        status: 'cancelled',
        processed_at: new Date().toISOString(),
        processed_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (error) throw error;
  },

  subscribeToChanges(
    tenantId: string,
    onUpdate: () => void
  ): () => void {
    const channel = supabase
      .channel(`notifications-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'billing_queue',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => onUpdate()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => onUpdate()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => onUpdate()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pet_services',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
