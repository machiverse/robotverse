import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Lead {
  id: string;
  seller_id: string;
  buyer_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_company: string | null;
  item_id: string | null;
  item_type: string;
  item_name: string | null;
  source: string;
  status: 'new' | 'contacted' | 'quoted' | 'negotiating' | 'closed_won' | 'closed_lost';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes: string | null;
  next_follow_up: string | null;
  last_contacted_at: string | null;
  expected_value: number | null;
  currency: string;
  tags: string[] | null;
  is_unlocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  seller_id: string;
  lead_id: string | null;
  buyer_id: string | null;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_company: string | null;
  buyer_address: string | null;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'cancelled' | 'overdue';
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  terms: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  seller_id: string;
  activity_type: 'note' | 'call' | 'email' | 'meeting' | 'follow_up' | 'status_change' | 'invoice_sent' | 'chat';
  title: string;
  description: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  is_completed: boolean;
  reminder_at: string | null;
  created_at: string;
}

export interface CRMStats {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  quotedLeads: number;
  closedWon: number;
  closedLost: number;
  totalRevenue: number;
  pendingFollowUps: number;
  creditsBalance: number;
}

export const useSellerCRM = (itemType?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [stats, setStats] = useState<CRMStats>({
    totalLeads: 0,
    newLeads: 0,
    contactedLeads: 0,
    quotedLeads: 0,
    closedWon: 0,
    closedLost: 0,
    totalRevenue: 0,
    pendingFollowUps: 0,
    creditsBalance: 0
  });
  const [loading, setLoading] = useState(true);
  const [creditsBalance, setCreditsBalance] = useState(0);

  const fetchLeads = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('seller_leads')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (itemType) {
        query = query.eq('item_type', itemType);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLeads((data || []) as Lead[]);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  }, [user, itemType]);

  const fetchInvoices = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('seller_invoices')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Map the data to ensure items is properly typed
      const mappedInvoices = (data || []).map(inv => ({
        ...inv,
        items: (inv.items as unknown as InvoiceItem[]) || []
      })) as Invoice[];
      setInvoices(mappedInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  }, [user]);

  const fetchActivities = useCallback(async (leadId?: string) => {
    if (!user) return;

    try {
      let query = supabase
        .from('lead_activities')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setActivities((data || []) as LeadActivity[]);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  }, [user]);

  const fetchCreditsBalance = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits_balance')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setCreditsBalance(data?.credits_balance || 0);
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  }, [user]);

  const calculateStats = useCallback(() => {
    const newLeads = leads.filter(l => l.status === 'new').length;
    const contactedLeads = leads.filter(l => l.status === 'contacted').length;
    const quotedLeads = leads.filter(l => l.status === 'quoted').length;
    const closedWon = leads.filter(l => l.status === 'closed_won').length;
    const closedLost = leads.filter(l => l.status === 'closed_lost').length;
    const totalRevenue = invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.total_amount, 0);
    const pendingFollowUps = leads.filter(l => 
      l.next_follow_up && new Date(l.next_follow_up) <= new Date()
    ).length;

    setStats({
      totalLeads: leads.length,
      newLeads,
      contactedLeads,
      quotedLeads,
      closedWon,
      closedLost,
      totalRevenue,
      pendingFollowUps,
      creditsBalance
    });
  }, [leads, invoices, creditsBalance]);

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchLeads(),
        fetchInvoices(),
        fetchActivities(),
        fetchCreditsBalance()
      ]).then(() => setLoading(false));
    }
  }, [user, fetchLeads, fetchInvoices, fetchActivities, fetchCreditsBalance]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  const convertViewToLead = async (viewId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc('convert_view_to_lead', {
        p_view_id: viewId,
        p_seller_id: user.id
      });

      if (error) throw error;

      toast({
        title: "Lead Created",
        description: "View converted to lead successfully"
      });

      fetchLeads();
      return data;
    } catch (error) {
      console.error('Error converting view to lead:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to convert view to lead"
      });
      return null;
    }
  };

  const unlockBuyerInfo = async (leadId: string, leadItemType: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('unlock_buyer_with_credits', {
        p_seller_id: user.id,
        p_lead_id: leadId,
        p_item_type: leadItemType
      });

      if (error) throw error;

      if (data) {
        toast({
          title: "Buyer Unlocked",
          description: "Buyer information is now visible"
        });
        fetchLeads();
        fetchCreditsBalance();
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "Insufficient Credits",
          description: "You don't have enough credits to unlock this buyer"
        });
        return false;
      }
    } catch (error) {
      console.error('Error unlocking buyer:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to unlock buyer information"
      });
      return false;
    }
  };

  const updateLeadStatus = async (leadId: string, status: Lead['status']): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('seller_leads')
        .update({ status, last_contacted_at: new Date().toISOString() })
        .eq('id', leadId)
        .eq('seller_id', user.id);

      if (error) throw error;

      // Add activity for status change
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        seller_id: user.id,
        activity_type: 'status_change',
        title: `Status changed to ${status}`,
        is_completed: true,
        completed_at: new Date().toISOString()
      });

      toast({
        title: "Status Updated",
        description: `Lead status changed to ${status}`
      });

      fetchLeads();
      return true;
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update lead status"
      });
      return false;
    }
  };

  const addActivity = async (
    leadId: string,
    activityType: LeadActivity['activity_type'],
    title: string,
    description?: string,
    scheduledAt?: string,
    reminderAt?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase.from('lead_activities').insert({
        lead_id: leadId,
        seller_id: user.id,
        activity_type: activityType,
        title,
        description,
        scheduled_at: scheduledAt,
        reminder_at: reminderAt,
        is_completed: !scheduledAt
      });

      if (error) throw error;

      // Update next_follow_up on lead if scheduling a follow-up
      if (scheduledAt && activityType === 'follow_up') {
        await supabase
          .from('seller_leads')
          .update({ next_follow_up: scheduledAt.split('T')[0] })
          .eq('id', leadId);
      }

      toast({
        title: "Activity Added",
        description: "Activity logged successfully"
      });

      fetchActivities(leadId);
      return true;
    } catch (error) {
      console.error('Error adding activity:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add activity"
      });
      return false;
    }
  };

  const createInvoice = async (invoiceData: Partial<Invoice>): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('seller_invoices')
        .insert({
          buyer_name: invoiceData.buyer_name || '',
          buyer_email: invoiceData.buyer_email,
          buyer_phone: invoiceData.buyer_phone,
          buyer_company: invoiceData.buyer_company,
          buyer_address: invoiceData.buyer_address,
          items: invoiceData.items as unknown as object,
          subtotal: invoiceData.subtotal || 0,
          tax_rate: invoiceData.tax_rate || 18,
          tax_amount: invoiceData.tax_amount || 0,
          discount_amount: invoiceData.discount_amount || 0,
          total_amount: invoiceData.total_amount || 0,
          notes: invoiceData.notes,
          terms: invoiceData.terms,
          due_date: invoiceData.due_date,
          status: invoiceData.status || 'draft',
          lead_id: invoiceData.lead_id,
          seller_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Invoice Created",
        description: `Invoice ${data.invoice_number} created successfully`
      });

      fetchInvoices();
      return data.id;
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create invoice"
      });
      return null;
    }
  };

  const updateInvoice = async (invoiceId: string, updates: Partial<Invoice>): Promise<boolean> => {
    if (!user) return false;

    try {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.items) {
        updateData.items = updates.items as unknown as object;
      }
      const { error } = await supabase
        .from('seller_invoices')
        .update(updateData)
        .eq('id', invoiceId)
        .eq('seller_id', user.id);

      if (error) throw error;

      toast({
        title: "Invoice Updated",
        description: "Invoice updated successfully"
      });

      fetchInvoices();
      return true;
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update invoice"
      });
      return false;
    }
  };

  const updateLeadNotes = async (leadId: string, notes: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('seller_leads')
        .update({ notes })
        .eq('id', leadId)
        .eq('seller_id', user.id);

      if (error) throw error;

      fetchLeads();
      return true;
    } catch (error) {
      console.error('Error updating notes:', error);
      return false;
    }
  };

  const scheduleFollowUp = async (leadId: string, date: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('seller_leads')
        .update({ next_follow_up: date })
        .eq('id', leadId)
        .eq('seller_id', user.id);

      if (error) throw error;

      await addActivity(leadId, 'follow_up', `Follow-up scheduled for ${date}`, undefined, date);

      toast({
        title: "Follow-up Scheduled",
        description: `Reminder set for ${new Date(date).toLocaleDateString()}`
      });

      fetchLeads();
      return true;
    } catch (error) {
      console.error('Error scheduling follow-up:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to schedule follow-up"
      });
      return false;
    }
  };

  return {
    leads,
    invoices,
    activities,
    stats,
    loading,
    creditsBalance,
    convertViewToLead,
    unlockBuyerInfo,
    updateLeadStatus,
    addActivity,
    createInvoice,
    updateInvoice,
    updateLeadNotes,
    scheduleFollowUp,
    fetchLeads,
    fetchInvoices,
    fetchActivities,
    fetchCreditsBalance
  };
};