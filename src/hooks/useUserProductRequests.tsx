import { useState, useEffect, useCallback } from 'react';
import { pushEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface UserProductRequest {
  id: string;
  user_id: string;
  product_type: 'robot' | 'spare_part' | 'service';
  product_name: string;
  brand: string | null;
  specifications: string | null;
  quantity: number;
  budget: string | null;
  location: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestAssignment {
  id: string;
  request_id: string;
  seller_id: string;
  assigned_by: string | null;
  status: string;
  seller_notes: string | null;
  quotation_amount: number | null;
  quotation_details: string | null;
  product_details: string | null;
  response_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useUserProductRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<UserProductRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMyRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_product_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests((data || []) as unknown as UserProductRequest[]);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const submitRequest = useCallback(async (data: {
    product_type: string;
    product_name: string;
    brand?: string;
    specifications?: string;
    quantity?: number;
    budget?: string;
    location?: string;
    contact_name: string;
    contact_email: string;
    contact_phone?: string;
  }) => {
    if (!user) {
      toast({ title: 'Please log in', description: 'You need to be logged in to submit a request.', variant: 'destructive' });
      return null;
    }
    try {
      const { data: result, error } = await supabase
        .from('user_product_requests')
        .insert({
          user_id: user.id,
          product_type: data.product_type,
          product_name: data.product_name,
          brand: data.brand || null,
          specifications: data.specifications || null,
          quantity: data.quantity || 1,
          budget: data.budget || null,
          location: data.location || null,
          contact_name: data.contact_name,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone || null,
          status: 'new_request',
        } as any)
        .select()
        .single();
      if (error) throw error;
      pushEvent('generate_lead', { item_id: (result as any)?.id, item_type: data.product_type === 'spare_part' ? 'part' : (data.product_type || 'robot'), item_brand: data.brand || undefined, currency: 'INR' });
      toast({ title: 'Request Submitted!', description: 'Your request has been submitted. We will connect you with relevant sellers.' });
      return result;
    } catch (err: any) {
      console.error('Error submitting request:', err);
      toast({ title: 'Failed to submit', description: err.message || 'Please try again.', variant: 'destructive' });
      return null;
    }
  }, [user, toast]);

  return { requests, loading, fetchMyRequests, submitRequest };
};

// Admin hook
export const useAdminProductRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAllRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_product_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAllRequests((data || []) as any[]);
    } catch (err) {
      console.error('Error fetching all requests:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchAssignments = useCallback(async (requestId: string) => {
    const { data, error } = await supabase
      .from('request_assignments')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as any[];
  }, []);

  const assignSeller = useCallback(async (requestId: string, sellerId: string) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('request_assignments')
        .insert({
          request_id: requestId,
          seller_id: sellerId,
          assigned_by: user.id,
          status: 'pending',
        } as any)
        .select()
        .single();
      if (error) throw error;
      
      // Update request status
      await supabase
        .from('user_product_requests')
        .update({ status: 'seller_assigned' } as any)
        .eq('id', requestId);
      
      toast({ title: 'Seller Assigned', description: 'The seller has been notified about this request.' });
      return data;
    } catch (err: any) {
      toast({ title: 'Assignment Failed', description: err.message, variant: 'destructive' });
      return null;
    }
  }, [user, toast]);

  const updateRequestStatus = useCallback(async (requestId: string, status: string, notes?: string) => {
    try {
      const updateData: any = { status };
      if (notes !== undefined) updateData.admin_notes = notes;
      const { error } = await supabase
        .from('user_product_requests')
        .update(updateData)
        .eq('id', requestId);
      if (error) throw error;
      toast({ title: 'Status Updated' });
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.message, variant: 'destructive' });
    }
  }, [toast]);

  return { allRequests, assignments, loading, fetchAllRequests, fetchAssignments, assignSeller, updateRequestStatus };
};

// Seller hook
export const useSellerAssignments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMyAssignments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('request_assignments')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch associated request details
      const requestIds = (data || []).map((a: any) => a.request_id);
      if (requestIds.length > 0) {
        const { data: requestData } = await supabase
          .from('user_product_requests')
          .select('*')
          .in('id', requestIds);
        
        const requestMap = new Map((requestData || []).map((r: any) => [r.id, r]));
        const enriched = (data || []).map((a: any) => ({
          ...a,
          request: requestMap.get(a.request_id) || null,
        }));
        setMyAssignments(enriched);
      } else {
        setMyAssignments([]);
      }
    } catch (err) {
      console.error('Error fetching assignments:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const respondToAssignment = useCallback(async (assignmentId: string, response: {
    status: string;
    seller_notes?: string;
    quotation_amount?: number;
    quotation_details?: string;
    product_details?: string;
  }) => {
    try {
      const { error } = await supabase
        .from('request_assignments')
        .update({
          ...response,
          response_at: new Date().toISOString(),
        } as any)
        .eq('id', assignmentId);
      if (error) throw error;

      // If quote submitted, update main request status and send email
      if (response.status === 'quote_submitted') {
        const assignment = myAssignments.find(a => a.id === assignmentId);
        if (assignment?.request_id) {
          await supabase
            .from('user_product_requests')
            .update({ status: 'quote_submitted' } as any)
            .eq('id', assignment.request_id);
          
          // Notify the user who made the request
          const request = assignment.request;
          if (request?.user_id) {
            await supabase.from('notifications').insert({
              user_id: request.user_id,
              notification_type: 'quote_received',
              title: 'Quote Received for Your Request',
              message: `A seller has submitted a quotation for "${request.product_name}".`,
              reference_id: request.id,
              reference_type: 'user_product_request',
              is_read: false,
            });

            // Send email to buyer via Zoho SMTP
            try {
              // Get buyer email
              const { data: buyerProfile } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('user_id', request.user_id)
                .single();

              // Get seller profile
              const { data: sellerProfile } = await supabase
                .from('profiles')
                .select('full_name, company_name')
                .eq('user_id', user?.id)
                .single();

              if (buyerProfile?.email) {
                await supabase.functions.invoke('send-quote-request', {
                  body: {
                    type: 'seller_quote_response',
                    buyerName: buyerProfile.full_name || request.contact_name,
                    buyerEmail: buyerProfile.email || request.contact_email,
                    sellerName: sellerProfile?.full_name || '',
                    sellerCompany: sellerProfile?.company_name || '',
                    itemName: request.product_name,
                    itemType: request.product_type,
                    quotePrice: response.quotation_amount?.toString() || '',
                    quoteDescription: response.quotation_details || '',
                    quoteCurrency: '₹',
                  }
                });
              }
            } catch (emailErr) {
              console.error('Email notification error:', emailErr);
            }
          }
        }
      }

      toast({ title: 'Response Submitted', description: 'Your response has been sent.' });
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    }
  }, [myAssignments, toast]);

  return { myAssignments, loading, fetchMyAssignments, respondToAssignment };
};
