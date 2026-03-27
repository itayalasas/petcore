import { supabase } from '../lib/supabase';

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  category: string;
  sku?: string;
  barcode?: string;
  price: number;
  cost: number;
  stock_quantity: number;
  min_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  name: string;
  description?: string;
  category: string;
  sku?: string;
  barcode?: string;
  price: number;
  cost?: number;
  stock_quantity?: number;
  min_stock?: number;
}

export const productsService = {
  async getAll(tenantId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getActive(tenantId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getLowStock(tenantId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .filter('stock_quantity', 'lte', 'min_stock')
      .order('stock_quantity', { ascending: true });

    if (error) {
      const { data: allData, error: fallbackError } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (fallbackError) throw fallbackError;

      return (allData || []).filter(p => p.stock_quantity <= p.min_stock);
    }

    return data || [];
  },

  async getByCategory(tenantId: string, category: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('category', category)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(tenantId: string, productData: CreateProductData): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert([{
        ...productData,
        tenant_id: tenantId,
        cost: productData.cost || 0,
        stock_quantity: productData.stock_quantity || 0,
        min_stock: productData.min_stock || 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, productData: Partial<CreateProductData>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({
        ...productData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateStock(id: string, quantity: number): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({
        stock_quantity: quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async adjustStock(id: string, adjustment: number): Promise<Product> {
    const product = await this.getById(id);
    if (!product) throw new Error('Product not found');

    const newQuantity = Math.max(0, product.stock_quantity + adjustment);
    return this.updateStock(id, newQuantity);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async toggleActive(id: string, isActive: boolean): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async search(tenantId: string, query: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%`)
      .order('name');

    if (error) throw error;
    return data || [];
  }
};
