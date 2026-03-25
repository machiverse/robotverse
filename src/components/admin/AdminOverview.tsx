import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Bot, Wrench, Activity, ShoppingCart, Briefcase, Truck, DollarSign, RefreshCw, FileText, Send, CheckCircle, Eye, MessageSquare, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdminOverviewProps {
  dashboardStats: any;
  onRefresh: () => void;
}

const AdminOverview = React.memo(({ dashboardStats, onRefresh }: AdminOverviewProps) => {
  const [platformStats, setPlatformStats] = useState({
    totalQuoteRequests: 0,
    pendingQuoteRequests: 0,
    totalQuotations: 0,
    acceptedQuotations: 0,
    rejectedQuotations: 0,
    quotationValue: 0,
    totalChats: 0,
    totalViews: 0,
  });

  useEffect(() => {
    const fetchPlatformStats = async () => {
      try {
        const [reqRes, quotRes, chatRes, viewRes] = await Promise.all([
          supabase.from('user_requests').select('id, status', { count: 'exact' }),
          supabase.from('crm_quotations').select('id, status, total_amount'),
          supabase.from('chat_sessions').select('id', { count: 'exact' }),
          supabase.from('button_interactions').select('id', { count: 'exact' }).eq('button_type', 'view'),
        ]);

        const requests = reqRes.data || [];
        const quotations = quotRes.data || [];

        setPlatformStats({
          totalQuoteRequests: requests.length,
          pendingQuoteRequests: requests.filter(r => r.status === 'pending').length,
          totalQuotations: quotations.length,
          acceptedQuotations: quotations.filter(q => q.status === 'accepted').length,
          rejectedQuotations: quotations.filter(q => q.status === 'rejected').length,
          quotationValue: quotations.reduce((s, q) => s + (Number(q.total_amount) || 0), 0),
          totalChats: chatRes.count || chatRes.data?.length || 0,
          totalViews: viewRes.count || viewRes.data?.length || 0,
        });
      } catch (e) {
        console.error('Error fetching platform stats:', e);
      }
    };
    fetchPlatformStats();
  }, []);

  const handleQuickAction = useCallback((action: string) => {
    console.log(`Quick action: ${action}`);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive platform management and analytics</p>
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">{dashboardStats.users.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Buyers</p>
                <p className="text-2xl font-bold text-foreground">{dashboardStats.users.buyers}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sellers</p>
                <p className="text-2xl font-bold text-foreground">{dashboardStats.users.sellers}</p>
              </div>
              <Briefcase className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Services</p>
                <p className="text-2xl font-bold text-foreground">{dashboardStats.users.serviceProviders}</p>
              </div>
              <Wrench className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Logistics</p>
                <p className="text-2xl font-bold text-foreground">{dashboardStats.users.logistics}</p>
              </div>
              <Truck className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Finance</p>
                <p className="text-2xl font-bold text-foreground">{dashboardStats.users.finance}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Activity Stats */}
      <h2 className="text-lg font-semibold text-foreground">Platform Performance</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Send className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold">{platformStats.totalQuoteRequests}</p>
            <p className="text-xs text-muted-foreground">Quote Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Activity className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold">{platformStats.pendingQuoteRequests}</p>
            <p className="text-xs text-muted-foreground">Pending Quotes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <FileText className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold">{platformStats.totalQuotations}</p>
            <p className="text-xs text-muted-foreground">Quotations Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold">{platformStats.acceptedQuotations}</p>
            <p className="text-xs text-muted-foreground">Accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold">₹{(platformStats.quotationValue / 100000).toFixed(1)}L</p>
            <p className="text-xs text-muted-foreground">Quote Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <MessageSquare className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold">{platformStats.totalChats}</p>
            <p className="text-xs text-muted-foreground">Chat Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Eye className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold">{platformStats.totalViews}</p>
            <p className="text-xs text-muted-foreground">Product Views</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Bot className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold">{dashboardStats.equipment.activeListings}</p>
            <p className="text-xs text-muted-foreground">Active Listings</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Equipment Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Robots:</span>
                <span className="font-semibold text-foreground">{dashboardStats.equipment.totalRobots}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Parts:</span>
                <span className="font-semibold text-foreground">{dashboardStats.equipment.totalSpareParts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Services:</span>
                <span className="font-semibold text-foreground">{dashboardStats.equipment.totalServices}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform Value:</span>
                <span className="font-semibold text-primary">₹{dashboardStats.equipment.totalValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Listings:</span>
                <span className="font-semibold text-primary">{dashboardStats.equipment.activeListings}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Users:</span>
                <span className="font-semibold text-foreground">{dashboardStats.users.active}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New This Month:</span>
                <span className="font-semibold text-primary">{dashboardStats.users.newThisMonth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Admin Users:</span>
                <span className="font-semibold text-foreground">{dashboardStats.users.admins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completion Rate:</span>
                <span className="font-semibold text-primary">
                  {dashboardStats.users.total > 0 ? 
                    ((dashboardStats.users.active / dashboardStats.users.total) * 100).toFixed(1) + '%' : 
                    '0%'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-16 flex-col" onClick={() => handleQuickAction('users')}>
              <Users className="h-6 w-6 mb-2" />
              Manage Users
            </Button>
            <Button variant="outline" className="h-16 flex-col" onClick={() => handleQuickAction('equipment')}>
              <Bot className="h-6 w-6 mb-2" />
              View Equipment
            </Button>
            <Button variant="outline" className="h-16 flex-col" onClick={() => handleQuickAction('analytics')}>
              <Activity className="h-6 w-6 mb-2" />
              View Analytics
            </Button>
            <Button variant="outline" className="h-16 flex-col" onClick={() => handleQuickAction('reports')}>
              <DollarSign className="h-6 w-6 mb-2" />
              Financial Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

AdminOverview.displayName = 'AdminOverview';
export default AdminOverview;
