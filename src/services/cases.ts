import { supabase } from '../lib/supabase';

export interface Case {
  id: string;
  tenant_id: string;
  case_number: string;
  pet_id: string;
  owner_id: string | null;
  status: 'open' | 'in_progress' | 'pending_referral' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  chief_complaint: string | null;
  diagnosis_summary: string | null;
  department: string;
  created_by: string | null;
  assigned_to: string | null;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseActivity {
  id: string;
  tenant_id: string;
  case_id: string | null;
  referral_id: string | null;
  activity_type: string;
  description: string;
  performed_by: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CaseWithDetails extends Case {
  pet?: { id: string; name: string; species: string; breed: string };
  owner?: { id: string; first_name: string; last_name: string; phone: string };
  assigned_employee?: { id: string; first_name: string; last_name: string; department: string };
  created_by_profile?: { first_name: string; last_name: string };
  activities?: CaseActivity[];
  referrals?: Referral[];
}

export interface Referral {
  id: string;
  tenant_id: string;
  referral_number: string;
  case_id: string | null;
  pet_id: string;
  from_department: string;
  to_department: string;
  from_employee_id: string | null;
  to_employee_id: string | null;
  reason: string;
  clinical_notes: string | null;
  urgency: 'routine' | 'urgent' | 'emergency';
  status: 'pending' | 'accepted' | 'scheduled' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  rejection_reason: string | null;
  scheduled_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralWithDetails extends Referral {
  pet?: { id: string; name: string; species: string; breed: string };
  case?: Case;
  from_employee?: { id: string; first_name: string; last_name: string };
  to_employee?: { id: string; first_name: string; last_name: string };
}

export const casesService = {
  async getAll(tenantId: string): Promise<CaseWithDetails[]> {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        pet:pets(id, name, species, breed),
        owner:owners(id, first_name, last_name, phone),
        assigned_employee:employees(id, first_name, last_name, department),
        created_by_profile:profiles!cases_created_by_fkey(first_name, last_name)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getActive(tenantId: string): Promise<CaseWithDetails[]> {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        pet:pets(id, name, species, breed),
        owner:owners(id, first_name, last_name, phone),
        assigned_employee:employees(id, first_name, last_name, department)
      `)
      .eq('tenant_id', tenantId)
      .in('status', ['open', 'in_progress', 'pending_referral'])
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getByDepartment(tenantId: string, department: string): Promise<CaseWithDetails[]> {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        pet:pets(id, name, species, breed),
        owner:owners(id, first_name, last_name, phone),
        assigned_employee:employees(id, first_name, last_name, department)
      `)
      .eq('tenant_id', tenantId)
      .eq('department', department)
      .in('status', ['open', 'in_progress', 'pending_referral'])
      .order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<CaseWithDetails | null> {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        pet:pets(id, name, species, breed),
        owner:owners(id, first_name, last_name, phone),
        assigned_employee:employees(id, first_name, last_name, department),
        created_by_profile:profiles!cases_created_by_fkey(first_name, last_name),
        activities:case_activities(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(tenantId: string, caseData: Partial<Case>): Promise<Case> {
    const { data: caseNumber } = await supabase.rpc('generate_case_number', { p_tenant_id: tenantId });

    const { data, error } = await supabase
      .from('cases')
      .insert([{
        tenant_id: tenantId,
        case_number: caseNumber,
        ...caseData,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Case>): Promise<Case> {
    const { data, error } = await supabase
      .from('cases')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: Case['status'], closedAt?: string): Promise<Case> {
    const updates: Partial<Case> = { status };
    if (status === 'completed' || status === 'cancelled') {
      updates.closed_at = closedAt || new Date().toISOString();
    }

    return this.update(id, updates);
  },

  async assign(id: string, employeeId: string): Promise<Case> {
    return this.update(id, { assigned_to: employeeId, status: 'in_progress' });
  },

  async addActivity(tenantId: string, activity: Omit<CaseActivity, 'id' | 'tenant_id' | 'created_at'>): Promise<CaseActivity> {
    const { data, error } = await supabase
      .from('case_activities')
      .insert([{ tenant_id: tenantId, ...activity }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getActivities(caseId: string): Promise<CaseActivity[]> {
    const { data, error } = await supabase
      .from('case_activities')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};

export const referralsService = {
  async getAll(tenantId: string): Promise<ReferralWithDetails[]> {
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        *,
        pet:pets(id, name, species, breed),
        case:cases(id, case_number, status),
        from_employee:employees!referrals_from_employee_id_fkey(id, first_name, last_name),
        to_employee:employees!referrals_to_employee_id_fkey(id, first_name, last_name)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPending(tenantId: string, department?: string): Promise<ReferralWithDetails[]> {
    let query = supabase
      .from('referrals')
      .select(`
        *,
        pet:pets(id, name, species, breed),
        case:cases(id, case_number, status),
        from_employee:employees!referrals_from_employee_id_fkey(id, first_name, last_name),
        to_employee:employees!referrals_to_employee_id_fkey(id, first_name, last_name)
      `)
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'accepted', 'scheduled']);

    if (department) {
      query = query.eq('to_department', department);
    }

    const { data, error } = await query.order('urgency', { ascending: false }).order('created_at');

    if (error) throw error;
    return data || [];
  },

  async getByDepartment(tenantId: string, department: string): Promise<ReferralWithDetails[]> {
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        *,
        pet:pets(id, name, species, breed),
        from_employee:employees!referrals_from_employee_id_fkey(id, first_name, last_name),
        to_employee:employees!referrals_to_employee_id_fkey(id, first_name, last_name)
      `)
      .eq('tenant_id', tenantId)
      .eq('to_department', department)
      .in('status', ['pending', 'accepted', 'scheduled', 'in_progress'])
      .order('urgency', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<ReferralWithDetails | null> {
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        *,
        pet:pets(id, name, species, breed),
        case:cases(*),
        from_employee:employees!referrals_from_employee_id_fkey(id, first_name, last_name),
        to_employee:employees!referrals_to_employee_id_fkey(id, first_name, last_name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(tenantId: string, referral: Partial<Referral>): Promise<Referral> {
    const { data: referralNumber } = await supabase.rpc('generate_referral_number', { p_tenant_id: tenantId });

    const { data, error } = await supabase
      .from('referrals')
      .insert([{
        tenant_id: tenantId,
        referral_number: referralNumber,
        ...referral,
      }])
      .select()
      .single();

    if (error) throw error;

    if (referral.case_id) {
      await casesService.update(referral.case_id, { status: 'pending_referral' });
    }

    return data;
  },

  async update(id: string, updates: Partial<Referral>): Promise<Referral> {
    const { data, error } = await supabase
      .from('referrals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async accept(id: string, employeeId: string): Promise<Referral> {
    return this.update(id, { status: 'accepted', to_employee_id: employeeId });
  },

  async schedule(id: string, scheduledDate: string): Promise<Referral> {
    return this.update(id, { status: 'scheduled', scheduled_date: scheduledDate });
  },

  async start(id: string): Promise<Referral> {
    return this.update(id, { status: 'in_progress' });
  },

  async complete(id: string): Promise<Referral> {
    const referral = await this.update(id, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });

    if (referral.case_id) {
      await casesService.update(referral.case_id, { status: 'in_progress' });
    }

    return referral;
  },

  async reject(id: string, reason: string): Promise<Referral> {
    const referral = await this.update(id, {
      status: 'rejected',
      rejection_reason: reason
    });

    if (referral.case_id) {
      await casesService.update(referral.case_id, { status: 'in_progress' });
    }

    return referral;
  },
};
