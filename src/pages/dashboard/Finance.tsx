import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Eye, MoreHorizontal, TrendingUp, DollarSign } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Finance = () => {
  const { user } = useAuth();
  const [loanProducts, setLoanProducts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    activeProducts: 0,
    totalApplications: 0,
    approvedLoans: 0,
    totalDisbursed: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLoanProducts();
      fetchApplications();
    }
  }, [user]);

  const fetchLoanProducts = async () => {
    if (!user) return;

    try {
      const { data: productsData, error } = await supabase
        .from('loan_products')
        .select('*')
        .eq('provider_id', user.id);

      if (error) {
        console.error('Error fetching loan products:', error);
        return;
      }

      setLoanProducts(productsData || []);
      
      const activeProducts = productsData?.filter(p => p.is_active).length || 0;
      setStats(prev => ({ ...prev, activeProducts }));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchApplications = async () => {
    if (!user) return;

    try {
      const { data: applicationsData, error } = await supabase
        .from('loan_applications')
        .select('*')
        .eq('provider_id', user.id);

      if (error) {
        console.error('Error fetching applications:', error);
        return;
      }

      setApplications(applicationsData || []);
      
      const totalApplications = applicationsData?.length || 0;
      const approvedLoans = applicationsData?.filter(app => app.status === 'approved').length || 0;
      const totalDisbursed = applicationsData?.filter(app => app.status === 'approved')
        .reduce((sum, app) => sum + (parseFloat(app.amount_requested?.toString() || '0') || 0), 0) || 0;

      setStats(prev => ({ 
        ...prev, 
        totalApplications, 
        approvedLoans,
        totalDisbursed 
      }));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'under_review': return 'bg-blue-100 text-blue-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance Management</h1>
          <p className="text-muted-foreground">
            Manage loan products and track applications
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Loan Product
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Products
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProducts}</div>
            <p className="text-xs text-muted-foreground">
              Currently available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Applications
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Approved Loans
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedLoans}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalApplications > 0 ? Math.round((stats.approvedLoans / stats.totalApplications) * 100) : 0}% approval rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Disbursed
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalDisbursed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All approved loans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Loan Products */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Products</CardTitle>
          <CardDescription>
            Your available financing options
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : loanProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No loan products created yet</p>
              <p className="text-sm">Add your first loan product to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {loanProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium">{product.product_name}</h4>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-muted-foreground">
                          Rate: {product.min_interest_rate}% - {product.max_interest_rate}%
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Max: ₹{product.max_amount?.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Term: {product.min_tenure_months}-{product.max_tenure_months} months
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {product.description?.substring(0, 100)}{product.description?.length > 100 ? '...' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium">Active Product</div>
                      <Badge className={getStatusColor(product.is_active ? 'active' : 'inactive')}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Edit Product
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          {product.is_active ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <CardDescription>
            Latest loan applications requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No applications received yet</p>
              <p className="text-sm">Applications will appear here when customers apply</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <div key={application.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium">{application.applicant_name}</h4>
                      <p className="text-sm text-muted-foreground">{application.application_id}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm font-medium">₹{application.amount_requested?.toLocaleString()}</span>
                        <span className="text-sm text-muted-foreground">
                          Applied: {new Date(application.applied_date || application.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Purpose: {application.purpose || 'Not specified'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(application.status)}>
                      {application.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Review Application
                        </DropdownMenuItem>
                        {application.status === 'pending' && (
                          <>
                            <DropdownMenuItem className="text-green-600">
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Finance;