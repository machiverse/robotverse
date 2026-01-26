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
  buyer_location: string | null;
  item_id: string | null;
  item_type: string;
  item_name: string | null;
  item_image?: string | null;
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
  // Product details - optional since they're enriched later
  product_price?: number | null;
  product_brand?: string | null;
  product_model?: string | null;
  viewed_at?: string | null;
  // New CRM fields from database
  lead_source?: string;
  lead_type?: string;
  product_category?: string | null;
  assigned_to?: string | null;
  expected_close_date?: string | null;
  contact_person_name?: string | null;
  contact_designation?: string | null;
  industry_type?: string | null;
  account_id?: string | null;
  converted_to_opportunity?: boolean;
  opportunity_id?: string | null;
  lost_reason?: string | null;
  qualification_score?: number;
  lead_score?: number;
}

export interface ProductView {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  user_mobile: string | null;
  user_company: string | null;
  user_location: string | null;
  seller_id: string | null;
  item_id: string | null;
  item_type: string | null;
  item_name?: string | null;
  button_type: string;
  button_name: string;
  created_at: string;
  additional_data: Record<string, unknown> | null;
}

// AggregatedProductView - User details are INTERNAL only, never displayed in Product Views
export interface AggregatedProductView {
  key: string; // unique key for user+product combination
  id: string; // ID of the first/latest view
  // INTERNAL fields - stored for conversion only, NEVER displayed
  _internal_user_id: string | null;
  _internal_user_name: string | null;
  _internal_user_email: string | null;
  _internal_user_mobile: string | null;
  _internal_user_company: string | null;
  _internal_user_location: string | null;
  // Display fields - only these should be shown in UI
  seller_id: string | null;
  item_id: string | null;
  item_type: string | null;
  item_name?: string | null;
  button_type: string;
  button_name: string;
  created_at: string;
  view_count: number;
  is_anonymous: boolean;
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
  totalViews: number;
}

export const useSellerCRM = (itemType?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [productViews, setProductViews] = useState<ProductView[]>([]);
  const [aggregatedViews, setAggregatedViews] = useState<AggregatedProductView[]>([]);
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
    creditsBalance: 0,
    totalViews: 0
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
      
      let leadsData = (data || []) as Lead[];
      
      // Fetch profile details for leads with buyer_id
      const buyerIds = leadsData
        .filter(l => l.buyer_id && l.is_unlocked)
        .map(l => l.buyer_id as string);
      
      if (buyerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, company_name, mobile_number, email, location')
          .in('user_id', buyerIds);
        
        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.user_id, p]));
          
          // Merge profile data into leads
          leadsData = leadsData.map(lead => {
            if (lead.buyer_id && lead.is_unlocked) {
              const profile = profileMap.get(lead.buyer_id);
              if (profile) {
                return {
                  ...lead,
                  buyer_name: lead.buyer_name || profile.full_name,
                  buyer_email: lead.buyer_email || profile.email,
                  buyer_phone: lead.buyer_phone || profile.mobile_number,
                  buyer_company: lead.buyer_company || profile.company_name,
                  buyer_location: lead.buyer_location || profile.location,
                };
              }
            }
            return lead;
          });
        }
      }
      
      // Fetch product details (price, brand, model, image) for each lead
      const robotItemIds = leadsData.filter(l => l.item_id && (l.item_type === 'robots' || l.item_type === 'robot')).map(l => l.item_id as string);
      const sparePartItemIds = leadsData.filter(l => l.item_id && (l.item_type === 'spare_parts' || l.item_type === 'spare_part')).map(l => l.item_id as string);
      const serviceItemIds = leadsData.filter(l => l.item_id && (l.item_type === 'services' || l.item_type === 'service')).map(l => l.item_id as string);
      
      const productDetailsMap = new Map<string, { price: number | null; brand: string | null; model: string | null; name: string | null; image: string | null }>();
      
      // Fetch robot details including images
      if (robotItemIds.length > 0) {
        const { data: robots } = await supabase
          .from('robots')
          .select('id, price, brand, model, name, images')
          .in('id', robotItemIds);
        
        if (robots) {
          robots.forEach(r => productDetailsMap.set(r.id, { 
            price: r.price, 
            brand: r.brand, 
            model: r.model,
            name: r.name,
            image: r.images && r.images.length > 0 ? r.images[0] : null
          }));
        }
      }
      
      // Fetch spare parts details including images
      if (sparePartItemIds.length > 0) {
        const { data: spareParts } = await supabase
          .from('spare_parts')
          .select('id, price, brand, model, name, images')
          .in('id', sparePartItemIds);
        
        if (spareParts) {
          spareParts.forEach(p => productDetailsMap.set(p.id, { 
            price: p.price, 
            brand: p.brand, 
            model: p.model,
            name: p.name,
            image: p.images && p.images.length > 0 ? p.images[0] : null
          }));
        }
      }

      // Fetch service details (services table doesn't have images or price columns)
      if (serviceItemIds.length > 0) {
        const { data: services } = await supabase
          .from('services')
          .select('id, name, price_range')
          .in('id', serviceItemIds);
        
        if (services) {
          services.forEach((s: any) => productDetailsMap.set(s.id, { 
            price: null, 
            brand: null, 
            model: null,
            name: s.name,
            image: null
          }));
        }
      }
      
      // Enrich leads with product details
      const enrichedLeads = leadsData.map(lead => {
        const productDetails = lead.item_id ? productDetailsMap.get(lead.item_id) : null;
        return {
          ...lead,
          product_price: productDetails?.price || lead.expected_value,
          product_brand: productDetails?.brand || null,
          product_model: productDetails?.model || null,
          item_name: lead.item_name || productDetails?.name || null,
          item_image: productDetails?.image || null,
          viewed_at: lead.created_at, // Use created_at as viewed_at
        };
      });
      
      setLeads(enrichedLeads);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  }, [user, itemType]);

  const fetchProductViews = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('button_interactions')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (itemType) {
        query = query.eq('item_type', itemType);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const views = data || [];
      
      // Then fetch item names in background - handle both singular and plural item_type values
      const robotIds = [...new Set(views.filter(v => (v.item_type === 'robots' || v.item_type === 'robot') && v.item_id).map(v => v.item_id))];
      const partIds = [...new Set(views.filter(v => (v.item_type === 'spare_parts' || v.item_type === 'spare_part') && v.item_id).map(v => v.item_id))];
      const serviceIds = [...new Set(views.filter(v => (v.item_type === 'services' || v.item_type === 'service') && v.item_id).map(v => v.item_id))];
      
      // Fetch all names in parallel
      const [robotsData, partsData, servicesData] = await Promise.all([
        robotIds.length > 0 ? supabase.from('robots').select('id, name').in('id', robotIds) : { data: [] },
        partIds.length > 0 ? supabase.from('spare_parts').select('id, name').in('id', partIds) : { data: [] },
        serviceIds.length > 0 ? supabase.from('services').select('id, name').in('id', serviceIds) : { data: [] }
      ]);
      
      // Create lookup maps
      const robotNames = new Map((robotsData.data || []).map(r => [r.id, r.name]));
      const partNames = new Map((partsData.data || []).map(p => [p.id, p.name]));
      const serviceNames = new Map((servicesData.data || []).map(s => [s.id, s.name]));
      
      // Update views with names - handle both singular and plural item_type values
      const enrichedViews = views.map(view => {
        let itemName: string | null = null;
        if (view.item_id) {
          if (view.item_type === 'robots' || view.item_type === 'robot') itemName = robotNames.get(view.item_id) || null;
          else if (view.item_type === 'spare_parts' || view.item_type === 'spare_part') itemName = partNames.get(view.item_id) || null;
          else if (view.item_type === 'services' || view.item_type === 'service') itemName = serviceNames.get(view.item_id) || null;
        }
        return { ...view, item_name: itemName } as ProductView;
      });
      
      setProductViews(enrichedViews);
      
      // Aggregate views by user+product combination
      const aggregationMap = new Map<string, AggregatedProductView>();
      let anonymousViewCount = 0;
      let anonymousView: ProductView | null = null;
      
      enrichedViews.forEach(view => {
        const isAnonymous = !view.user_id && !view.user_name && !view.user_email;
        
        if (isAnonymous) {
          // Count anonymous views separately per product
          const anonKey = `anonymous_${view.item_id || 'unknown'}`;
          const existing = aggregationMap.get(anonKey);
          if (existing) {
            existing.view_count++;
          } else {
            aggregationMap.set(anonKey, {
              key: anonKey,
              id: view.id,
              // Internal fields - for conversion only
              _internal_user_id: null,
              _internal_user_name: 'Anonymous Users',
              _internal_user_email: null,
              _internal_user_mobile: null,
              _internal_user_company: null,
              _internal_user_location: null,
              // Display fields
              seller_id: view.seller_id,
              item_id: view.item_id,
              item_type: view.item_type,
              item_name: view.item_name,
              button_type: view.button_type,
              button_name: view.button_name,
              created_at: view.created_at,
              view_count: 1,
              is_anonymous: true,
            });
          }
        } else {
          // Aggregate by user + product combination
          const userKey = view.user_id || view.user_email || view.user_name || 'unknown';
          const productKey = view.item_id || 'unknown';
          const key = `${userKey}_${productKey}`;
          
          const existing = aggregationMap.get(key);
          if (existing) {
            existing.view_count++;
            // Keep the most recent view data
            if (new Date(view.created_at) > new Date(existing.created_at)) {
              existing.created_at = view.created_at;
              existing.id = view.id;
            }
          } else {
            aggregationMap.set(key, {
              key,
              id: view.id,
              // Internal fields - for conversion only
              _internal_user_id: view.user_id,
              _internal_user_name: view.user_name,
              _internal_user_email: view.user_email,
              _internal_user_mobile: view.user_mobile,
              _internal_user_company: view.user_company,
              _internal_user_location: view.user_location,
              // Display fields
              seller_id: view.seller_id,
              item_id: view.item_id,
              item_type: view.item_type,
              item_name: view.item_name,
              button_type: view.button_type,
              button_name: view.button_name,
              created_at: view.created_at,
              view_count: 1,
              is_anonymous: false,
            });
          }
        }
      });
      
      // Sort by created_at descending and set aggregated views
      const aggregated = Array.from(aggregationMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setAggregatedViews(aggregated);
      
    } catch (error) {
      console.error('Error fetching product views:', error);
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
      creditsBalance,
      totalViews: productViews.length
    });
  }, [leads, invoices, creditsBalance, productViews]);

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchLeads(),
        fetchProductViews(),
        fetchInvoices(),
        fetchActivities(),
        fetchCreditsBalance()
      ]).then(() => setLoading(false));
    }
  }, [user, fetchLeads, fetchProductViews, fetchInvoices, fetchActivities, fetchCreditsBalance]);

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
        description: "View converted to lead. 10 credits deducted."
      });

      // Refresh leads, product views, and credits balance
      fetchLeads();
      fetchProductViews();
      fetchCreditsBalance();
      return data;
    } catch (error: any) {
      console.error('Error converting view to lead:', error);
      const errorMessage = error?.message?.includes('Insufficient credits') 
        ? 'Insufficient credits. You need 10 credits to convert a view to lead.'
        : 'Failed to convert view to lead';
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage
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
        .insert([{
          buyer_name: invoiceData.buyer_name || '',
          buyer_email: invoiceData.buyer_email,
          buyer_phone: invoiceData.buyer_phone,
          buyer_company: invoiceData.buyer_company,
          buyer_address: invoiceData.buyer_address,
          items: JSON.parse(JSON.stringify(invoiceData.items)),
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
        }])
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
    productViews,
    aggregatedViews,
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
    fetchProductViews,
    fetchInvoices,
    fetchActivities,
    fetchCreditsBalance
  };
};