import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// ============ TYPES ============

export interface CRMAccount {
  id: string;
  seller_id: string;
  account_name: string;
  account_type: string;
  industry: string | null;
  company_size: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  pincode: string | null;
  gst_number: string | null;
  pan_number: string | null;
  annual_revenue: number | null;
  currency: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  total_orders: number;
  total_revenue: number;
  last_order_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMContact {
  id: string;
  account_id: string | null;
  seller_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  designation: string | null;
  department: string | null;
  is_primary: boolean;
  is_decision_maker: boolean;
  linkedin_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  account?: CRMAccount;
}

export interface CRMOpportunity {
  id: string;
  opportunity_number: string;
  seller_id: string;
  account_id: string | null;
  lead_id: string | null;
  opportunity_name: string;
  description: string | null;
  stage: string;
  probability: number;
  expected_value: number | null;
  weighted_value: number | null;
  currency: string;
  expected_close_date: string | null;
  actual_close_date: string | null;
  products: ProductItem[];
  competitors: string[] | null;
  next_step: string | null;
  win_reason: string | null;
  loss_reason: string | null;
  assigned_to: string | null;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  account?: CRMAccount;
  lead?: any;
}

export interface ProductItem {
  product_id: string;
  product_type: string;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface CRMQuotation {
  id: string;
  quotation_number: string;
  seller_id: string;
  opportunity_id: string | null;
  lead_id: string | null;
  account_id: string | null;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_company: string | null;
  buyer_address: string | null;
  items: QuotationItem[];
  subtotal: number;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  currency: string;
  valid_until: string | null;
  terms_conditions: string | null;
  notes: string | null;
  status: string;
  version: number;
  parent_quotation_id: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface CRMTask {
  id: string;
  seller_id: string;
  assigned_to: string | null;
  lead_id: string | null;
  opportunity_id: string | null;
  account_id: string | null;
  task_type: string;
  subject: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  reminder_at: string | null;
  completed_at: string | null;
  outcome: string | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface CRMActivityLog {
  id: string;
  seller_id: string;
  lead_id: string | null;
  opportunity_id: string | null;
  account_id: string | null;
  contact_id: string | null;
  activity_type: string;
  subject: string;
  description: string | null;
  outcome: string | null;
  duration_minutes: number | null;
  call_direction: string | null;
  email_subject: string | null;
  email_body: string | null;
  attachments: any[];
  logged_at: string;
  created_by: string | null;
  created_at: string;
}

export interface CRMStats {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  wonDeals: number;
  lostDeals: number;
  totalOpportunities: number;
  openOpportunities: number;
  pipelineValue: number;
  weightedPipeline: number;
  wonRevenue: number;
  conversionRate: number;
  pendingTasks: number;
  overdueTasks: number;
  totalAccounts: number;
  totalContacts: number;
  totalQuotations: number;
  pendingQuotations: number;
}

// ============ HOOK ============

export const useCRM = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [accounts, setAccounts] = useState<CRMAccount[]>([]);
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [opportunities, setOpportunities] = useState<CRMOpportunity[]>([]);
  const [quotations, setQuotations] = useState<CRMQuotation[]>([]);
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [activityLogs, setActivityLogs] = useState<CRMActivityLog[]>([]);
  const [stats, setStats] = useState<CRMStats>({
    totalLeads: 0,
    newLeads: 0,
    qualifiedLeads: 0,
    wonDeals: 0,
    lostDeals: 0,
    totalOpportunities: 0,
    openOpportunities: 0,
    pipelineValue: 0,
    weightedPipeline: 0,
    wonRevenue: 0,
    conversionRate: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    totalAccounts: 0,
    totalContacts: 0,
    totalQuotations: 0,
    pendingQuotations: 0,
  });
  const [loading, setLoading] = useState(true);

  // Fetch Accounts
  const fetchAccounts = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('crm_accounts')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAccounts((data || []) as CRMAccount[]);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  }, [user]);

  // Fetch Contacts
  const fetchContacts = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setContacts((data || []) as CRMContact[]);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  }, [user]);

  // Fetch Opportunities
  const fetchOpportunities = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('crm_opportunities')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map(opp => ({
        ...opp,
        products: (opp.products as unknown as ProductItem[]) || []
      })) as CRMOpportunity[];
      setOpportunities(mapped);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    }
  }, [user]);

  // Fetch Quotations
  const fetchQuotations = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('crm_quotations')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map(q => ({
        ...q,
        items: (q.items as unknown as QuotationItem[]) || []
      })) as CRMQuotation[];
      setQuotations(mapped);
    } catch (error) {
      console.error('Error fetching quotations:', error);
    }
  }, [user]);

  // Fetch Tasks
  const fetchTasks = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('crm_tasks')
        .select('*')
        .or(`seller_id.eq.${user.id},assigned_to.eq.${user.id}`)
        .order('due_date', { ascending: true });
      if (error) throw error;
      setTasks((data || []) as CRMTask[]);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, [user]);

  // Fetch Activity Logs
  const fetchActivityLogs = useCallback(async (limit = 50) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('crm_activity_logs')
        .select('*')
        .eq('seller_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      setActivityLogs((data || []) as CRMActivityLog[]);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  }, [user]);

  // Calculate Stats
  const calculateStats = useCallback(async () => {
    if (!user) return;
    
    try {
      // Fetch leads for stats
      const { data: leads } = await supabase
        .from('seller_leads')
        .select('status, expected_value')
        .eq('seller_id', user.id);

      const leadsData = leads || [];
      const totalLeads = leadsData.length;
      const newLeads = leadsData.filter(l => l.status === 'new').length;
      const qualifiedLeads = leadsData.filter(l => ['quoted', 'negotiating'].includes(l.status)).length;
      const wonDeals = leadsData.filter(l => l.status === 'closed_won').length;
      const lostDeals = leadsData.filter(l => l.status === 'closed_lost').length;
      const conversionRate = totalLeads > 0 ? (wonDeals / totalLeads) * 100 : 0;

      // Opportunity stats
      const openOpps = opportunities.filter(o => !o.is_closed);
      const pipelineValue = openOpps.reduce((sum, o) => sum + (o.expected_value || 0), 0);
      const weightedPipeline = openOpps.reduce((sum, o) => sum + (o.weighted_value || 0), 0);
      const wonRevenue = opportunities
        .filter(o => o.stage === 'closed_won')
        .reduce((sum, o) => sum + (o.expected_value || 0), 0);

      // Task stats
      const now = new Date();
      const pendingTasks = tasks.filter(t => t.status === 'pending').length;
      const overdueTasks = tasks.filter(t => 
        t.status === 'pending' && t.due_date && new Date(t.due_date) < now
      ).length;

      // Quotation stats
      const pendingQuotations = quotations.filter(q => ['draft', 'sent'].includes(q.status)).length;

      setStats({
        totalLeads,
        newLeads,
        qualifiedLeads,
        wonDeals,
        lostDeals,
        totalOpportunities: opportunities.length,
        openOpportunities: openOpps.length,
        pipelineValue,
        weightedPipeline,
        wonRevenue,
        conversionRate,
        pendingTasks,
        overdueTasks,
        totalAccounts: accounts.length,
        totalContacts: contacts.length,
        totalQuotations: quotations.length,
        pendingQuotations,
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  }, [user, opportunities, tasks, quotations, accounts, contacts]);

  // CRUD Operations
  const createAccount = async (data: Partial<CRMAccount>) => {
    if (!user) return null;
    try {
      const { data: result, error } = await supabase
        .from('crm_accounts')
        .insert({ ...data, seller_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      await fetchAccounts();
      toast({ title: 'Account created successfully' });
      return result as CRMAccount;
    } catch (error: any) {
      toast({ title: 'Error creating account', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const updateAccount = async (id: string, data: Partial<CRMAccount>) => {
    try {
      const { error } = await supabase
        .from('crm_accounts')
        .update(data as any)
        .eq('id', id);
      if (error) throw error;
      await fetchAccounts();
      toast({ title: 'Account updated successfully' });
      return true;
    } catch (error: any) {
      toast({ title: 'Error updating account', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const createContact = async (data: Partial<CRMContact>) => {
    if (!user) return null;
    try {
      const { data: result, error } = await supabase
        .from('crm_contacts')
        .insert({ ...data, seller_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      await fetchContacts();
      toast({ title: 'Contact created successfully' });
      return result as CRMContact;
    } catch (error: any) {
      toast({ title: 'Error creating contact', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const createOpportunity = async (data: Partial<CRMOpportunity>) => {
    if (!user) return null;
    try {
      const insertData = { ...data, seller_id: user.id };
      if (insertData.products) {
        (insertData as any).products = JSON.stringify(insertData.products);
      }
      const { data: result, error } = await supabase
        .from('crm_opportunities')
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      await fetchOpportunities();
      toast({ title: 'Opportunity created successfully' });
      return {
        ...result,
        products: (result.products as unknown as ProductItem[]) || []
      } as CRMOpportunity;
    } catch (error: any) {
      toast({ title: 'Error creating opportunity', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const updateOpportunity = async (id: string, data: Partial<CRMOpportunity>) => {
    try {
      const updateData = { ...data };
      if (updateData.products) {
        (updateData as any).products = JSON.stringify(updateData.products);
      }
      const { error } = await supabase
        .from('crm_opportunities')
        .update(updateData as any)
        .eq('id', id);
      if (error) throw error;
      await fetchOpportunities();
      toast({ title: 'Opportunity updated successfully' });
      return true;
    } catch (error: any) {
      toast({ title: 'Error updating opportunity', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const createQuotation = async (data: Partial<CRMQuotation>) => {
    if (!user) return null;
    try {
      const insertData = { ...data, seller_id: user.id };
      if (insertData.items) {
        (insertData as any).items = JSON.stringify(insertData.items);
      }
      const { data: result, error } = await supabase
        .from('crm_quotations')
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      await fetchQuotations();
      toast({ title: 'Quotation created successfully' });
      return {
        ...result,
        items: (result.items as unknown as QuotationItem[]) || []
      } as CRMQuotation;
    } catch (error: any) {
      toast({ title: 'Error creating quotation', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const updateQuotation = async (id: string, data: Partial<CRMQuotation>) => {
    try {
      const updateData = { ...data };
      if (updateData.items) {
        (updateData as any).items = JSON.stringify(updateData.items);
      }
      const { error } = await supabase
        .from('crm_quotations')
        .update(updateData as any)
        .eq('id', id);
      if (error) throw error;
      await fetchQuotations();
      toast({ title: 'Quotation updated successfully' });
      return true;
    } catch (error: any) {
      toast({ title: 'Error updating quotation', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const createTask = async (data: Partial<CRMTask>) => {
    if (!user) return null;
    try {
      const { data: result, error } = await supabase
        .from('crm_tasks')
        .insert({ ...data, seller_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      await fetchTasks();
      toast({ title: 'Task created successfully' });
      return result as CRMTask;
    } catch (error: any) {
      toast({ title: 'Error creating task', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const updateTask = async (id: string, data: Partial<CRMTask>) => {
    try {
      const { error } = await supabase
        .from('crm_tasks')
        .update(data as any)
        .eq('id', id);
      if (error) throw error;
      await fetchTasks();
      return true;
    } catch (error: any) {
      toast({ title: 'Error updating task', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const logActivity = async (data: Partial<CRMActivityLog>) => {
    if (!user) return null;
    try {
      const { data: result, error } = await supabase
        .from('crm_activity_logs')
        .insert({ ...data, seller_id: user.id, created_by: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      await fetchActivityLogs();
      return result as CRMActivityLog;
    } catch (error: any) {
      console.error('Error logging activity:', error);
      return null;
    }
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        fetchAccounts(),
        fetchContacts(),
        fetchOpportunities(),
        fetchQuotations(),
        fetchTasks(),
        fetchActivityLogs(),
      ]).finally(() => setLoading(false));
    }
  }, [user, fetchAccounts, fetchContacts, fetchOpportunities, fetchQuotations, fetchTasks, fetchActivityLogs]);

  // Real-time subscription for quotation status changes (e.g. buyer accepts/rejects)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('crm-quotation-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'crm_quotations',
          filter: `seller_id=eq.${user.id}`,
        },
        () => {
          fetchQuotations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchQuotations]);

  // Recalculate stats when data changes
  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  return {
    // Data
    accounts,
    contacts,
    opportunities,
    quotations,
    tasks,
    activityLogs,
    stats,
    loading,
    // Fetch functions
    fetchAccounts,
    fetchContacts,
    fetchOpportunities,
    fetchQuotations,
    fetchTasks,
    fetchActivityLogs,
    // CRUD functions
    createAccount,
    updateAccount,
    createContact,
    createOpportunity,
    updateOpportunity,
    createQuotation,
    updateQuotation,
    createTask,
    updateTask,
    logActivity,
    // Refresh all
    refreshAll: () => Promise.all([
      fetchAccounts(),
      fetchContacts(),
      fetchOpportunities(),
      fetchQuotations(),
      fetchTasks(),
      fetchActivityLogs(),
      calculateStats(),
    ]),
  };
};
