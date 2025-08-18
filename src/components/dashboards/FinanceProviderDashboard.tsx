import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CreditCard,
  TrendingUp,
  Users,
  DollarSign,
  Calculator,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  Edit,
  Eye,
  Download,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LoanProductForm from '@/components/forms/LoanProductForm';
import LoanApplicationForm from '@/components/forms/LoanApplicationForm';
import LoanCalculator from '@/components/forms/LoanCalculator';
import { DashboardHeader } from '@/components/DashboardHeader';

interface FinanceProviderDashboardProps {
  userProfile: any;
}

const FinanceProviderDashboard = ({ userProfile }: FinanceProviderDashboardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { viewStats, fetchUserItemViews } = useViewTracking();
  const [loanApplications, setLoanApplications] = useState<any[]>([]);
  const [loanSchemes, setLoanSchemes] = useState<any[]>([]);
  const [loanProducts, setLoanProducts] = useState<any[]>([]);
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [showAddApplicationForm, setShowAddApplicationForm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorData, setCalculatorData] = useState<{
    amount?: number;
    rate?: number;
    tenure?: number;
  }>({});
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingScheme, setEditingScheme] = useState<any>(null);
  const [editingApplication, setEditingApplication] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalApplications: 0,
    approvedLoans: 0,
    totalDisbursed: 0,
    activePortfolio: 0,
    overdueRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    if (user) {
      fetchUserItemViews(user.id);
    }
  }, [user, fetchUserItemViews]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      // Fetch loan applications from database
      const { data: applications, error: applicationsError } = await supabase
        .from('loan_applications')
        .select('*')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (applicationsError) {
        console.error('Error fetching loan applications:', applicationsError);
      } else {
        setLoanApplications(applications || []);
      }

      // Fetch loan schemes from database  
      const { data: schemes, error: schemesError } = await supabase
        .from('loan_schemes')
        .select('*')
        .eq('provider_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (schemesError) {
        console.error('Error fetching loan schemes:', schemesError);
      } else {
        setLoanSchemes(schemes || []);
      }

      // Fetch loan products from database
      const { data: products, error: productsError } = await supabase
        .from('loan_products')
        .select('*')
        .eq('provider_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching loan products:', productsError);
      } else {
        setLoanProducts(products || []);
      }

      // Calculate real stats from database
      const totalApplications = applications?.length || 0;
      const approvedLoans = applications?.filter(app => app.status === 'approved').length || 0;
      const totalDisbursed = applications?.filter(app => app.status === 'disbursed')
        .reduce((sum, app) => sum + (app.amount_requested || 0), 0) || 0;
      const activePortfolio = applications?.filter(app => ['approved', 'disbursed'].includes(app.status))
        .reduce((sum, app) => sum + (app.amount_requested || 0), 0) || 0;
      const overdueApplications = applications?.filter(app => app.status === 'overdue').length || 0;
      const overdueRate = totalApplications > 0 ? ((overdueApplications / totalApplications) * 100) : 0;

      setDashboardStats({
        totalApplications,
        approvedLoans,
        totalDisbursed,
        activePortfolio,
        overdueRate: parseFloat(overdueRate.toFixed(1))
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching finance provider data:', error);
      setLoading(false);
    }
  };

  const getApplicationStatusBadge = (status: string) => {
    const statusConfig = {
      pending_documents: { variant: 'secondary' as const, label: 'Pending Documents' },
      under_review: { variant: 'default' as const, label: 'Under Review' },
      approved: { variant: 'outline' as const, label: 'Approved' },
      rejected: { variant: 'destructive' as const, label: 'Rejected' },
      disbursed: { variant: 'outline' as const, label: 'Disbursed' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.under_review;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return 'text-green-600';
    if (score >= 650) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('loan_products')
        .delete()
        .eq('id', productId)
        .eq('provider_id', user?.id);

      if (error) {
        throw error;
      }

      setLoanProducts(prev => prev.filter(product => product.id !== productId));
      
      // Show success message using toast (assuming useToast is available)
      console.log('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleDeleteScheme = async (schemeId: string) => {
    try {
      const { error } = await supabase
        .from('loan_schemes')
        .delete()
        .eq('id', schemeId)
        .eq('provider_id', user?.id);

      if (error) {
        throw error;
      }

      setLoanSchemes(prev => prev.filter(scheme => scheme.id !== schemeId));
      
      console.log('Scheme deleted successfully');
    } catch (error) {
      console.error('Error deleting scheme:', error);
    }
  };

  const statsCards = [
    {
      title: 'Total Applications',
      value: dashboardStats.totalApplications,
      icon: FileText,
      trend: 'This month',
      color: 'text-blue-600'
    },
    {
      title: 'Approved Loans',
      value: dashboardStats.approvedLoans,
      icon: CheckCircle,
      trend: 'Pending disbursement',
      color: 'text-green-600'
    },
    {
      title: 'Total Disbursed',
      value: `₹${(dashboardStats.totalDisbursed / 10000000).toFixed(1)}Cr`,
      icon: DollarSign,
      trend: 'This month',
      color: 'text-purple-600'
    },
    {
      title: 'Active Portfolio',
      value: `₹${(dashboardStats.activePortfolio / 10000000).toFixed(1)}Cr`,
      icon: TrendingUp,
      trend: 'Outstanding',
      color: 'text-orange-600'
    },
    {
      title: 'Overdue Rate',
      value: `${dashboardStats.overdueRate}%`,
      icon: AlertTriangle,
      trend: 'Portfolio quality',
      color: 'text-red-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finance Provider Dashboard</h1>
          <p className="text-muted-foreground">
            Manage loan applications, schemes, and portfolio
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowCalculator(true)}>
            <Calculator className="w-4 h-4" />
            Loan Calculator
          </Button>
          <Button onClick={() => {
            setEditingProduct(null);
            setEditingScheme(null);
            setShowAddProductForm(true);
          }} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Loan Scheme
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {stat.trend}
                    </Badge>
                  </div>
                  <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="applications" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="applications">Loan Applications</TabsTrigger>
          <TabsTrigger value="schemes">Loan Schemes</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Loan Applications
                  </CardTitle>
                  <CardDescription>Review and process incoming loan applications</CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingApplication(null);
                  setShowAddApplicationForm(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Application
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loanApplications.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Applications Yet</h3>
                  <p className="text-muted-foreground mb-4">Loan applications will appear here when customers apply</p>
                  <Button onClick={() => setShowAddApplicationForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Demo Application Form
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Application ID</TableHead>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Loan Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Credit Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loanApplications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">{application.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{application.applicant_name}</p>
                            <p className="text-sm text-muted-foreground">{application.business_type}</p>
                          </div>
                        </TableCell>
                        <TableCell>{application.loan_type}</TableCell>
                        <TableCell>₹{application.amount_requested.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`font-semibold ${getCreditScoreColor(application.credit_score)}`}>
                            {application.credit_score}
                          </span>
                        </TableCell>
                        <TableCell>{getApplicationStatusBadge(application.status)}</TableCell>
                        <TableCell>{application.applied_date}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => {
                              // View application details handler (example)
                              console.log('View application:', application.id);
                            }}>
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => {
                              setEditingApplication(application);
                              setShowAddApplicationForm(true);
                            }}>
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schemes" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Loan Products
                  </CardTitle>
                  <CardDescription>Configure and manage your loan offerings</CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingProduct(null);
                  setEditingScheme(null);
                  setShowAddProductForm(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Loan Scheme
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Show loan products first if any */}
                {loanProducts.map((product, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow border-2 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{product.product_name}</h3>
                          <Badge variant="default" className="mt-1">Custom Product</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => {
                            setEditingProduct(product);
                            setShowAddProductForm(true);
                          }}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteProduct(product.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Types:</span>
                          <div className="flex flex-wrap gap-1">
                            {product.loan_type.slice(0, 2).map((type: string, idx: number) => (
                              <span key={idx} className="text-xs bg-primary/10 text-primary px-1 rounded">
                                {type}
                              </span>
                            ))}
                            {product.loan_type.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{product.loan_type.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="font-medium">₹{(product.min_amount / 100000).toFixed(1)}L - ₹{(product.max_amount / 100000).toFixed(1)}L</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Interest:</span>
                          <span className="font-medium">{product.min_interest_rate}% - {product.max_interest_rate}%</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full mt-4" onClick={() => {
                        setCalculatorData({
                          amount: product.max_amount / 2,
                          rate: product.max_interest_rate,
                          tenure: product.max_tenure_months
                        });
                        setShowCalculator(true);
                      }}>
                        <Calculator className="w-3 h-3 mr-1" />
                        Calculate EMI
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Show default schemes */}
                {loanSchemes.map((scheme) => (
                  <Card key={scheme.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{scheme.scheme_name}</h3>
                          <Badge variant={scheme.is_government_scheme ? "default" : "outline"} className="mt-1">
                            {scheme.is_government_scheme ? "Government Scheme" : scheme.scheme_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => {
                            setEditingScheme(scheme);
                            setShowAddProductForm(true);
                          }}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteScheme(scheme.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Interest Rate:</span>
                          <span className="font-medium">{scheme.interest_rate_min}% - {scheme.interest_rate_max}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Max Amount:</span>
                          <span className="font-medium">₹{(scheme.max_amount / 100000).toFixed(1)}L</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tenure:</span>
                          <span className="font-medium">{scheme.min_tenure_months} - {scheme.max_tenure_months} months</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Processing Fee:</span>
                          <span className="font-medium">{scheme.processing_fee_percentage}%</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full mt-4" onClick={() => {
                        setCalculatorData({
                          amount: scheme.max_amount / 2,
                          rate: (scheme.interest_rate_min + scheme.interest_rate_max) / 2,
                          tenure: scheme.max_tenure_months
                        });
                        setShowCalculator(true);
                      }}>
                        <Calculator className="w-3 h-3 mr-1" />
                        Calculate EMI
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Show add new scheme card if no schemes exist */}
                {loanSchemes.length === 0 && loanProducts.length === 0 && (
                  <Card className="hover:shadow-lg transition-shadow border-2 border-dashed border-muted-foreground/20">
                    <CardContent className="p-8 text-center">
                      <Plus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">Add Your First Scheme</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create loan schemes for your customers
                      </p>
                      <Button onClick={() => setShowAddProductForm(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Loan Scheme
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Loans Portfolio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Equipment Finance</p>
                    <p className="text-sm text-muted-foreground">45 active loans</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹8.5 Cr</p>
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Working Capital</p>
                    <p className="text-sm text-muted-foreground">32 active loans</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹3.2 Cr</p>
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Business Expansion</p>
                    <p className="text-sm text-muted-foreground">18 active loans</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹1.8 Cr</p>
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Current Loans</p>
                    <p className="text-sm text-muted-foreground">On-time payments</p>
                  </div>
                  <Badge>92 loans</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Overdue Accounts</p>
                    <p className="text-sm text-muted-foreground">Past due date</p>
                  </div>
                  <Badge variant="destructive">3 loans</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Non-Performing Assets</p>
                    <p className="text-sm text-muted-foreground">90+ days overdue</p>
                  </div>
                  <Badge variant="secondary">0 loans</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Approval Rate</p>
                    <p className="text-sm text-muted-foreground">Applications approved</p>
                  </div>
                  <Badge>87.5%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Average Processing Time</p>
                    <p className="text-sm text-muted-foreground">Application to approval</p>
                  </div>
                  <Badge variant="outline">5.2 days</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Portfolio Yield</p>
                    <p className="text-sm text-muted-foreground">Average interest earned</p>
                  </div>
                  <Badge variant="secondary">11.2%</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Disbursements</p>
                    <p className="text-sm text-muted-foreground">February 2024</p>
                  </div>
                  <Badge>₹4.5 Cr</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Collections</p>
                    <p className="text-sm text-muted-foreground">EMI received</p>
                  </div>
                  <Badge variant="outline">₹3.8 Cr</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Growth Rate</p>
                    <p className="text-sm text-muted-foreground">Month over month</p>
                  </div>
                  <Badge variant="secondary">+15.3%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Loan Product Form Dialog */}
      <Dialog open={showAddProductForm} onOpenChange={setShowAddProductForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct || editingScheme ? 'Edit Product/Scheme' : 'Add Loan Product'}
            </DialogTitle>
          </DialogHeader>
          <LoanProductForm
            editingProduct={editingProduct}
            onSuccess={() => {
              setShowAddProductForm(false);
              setEditingProduct(null);
              setEditingScheme(null);
              fetchDashboardData();
            }}
            onCancel={() => {
              setShowAddProductForm(false);
              setEditingProduct(null);
              setEditingScheme(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add Loan Application Form Dialog */}
      <Dialog open={showAddApplicationForm} onOpenChange={setShowAddApplicationForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingApplication ? 'Edit Application' : 'Submit Loan Application'}
            </DialogTitle>
          </DialogHeader>
          <LoanApplicationForm
            editingApplication={editingApplication}
            onSuccess={() => {
              setShowAddApplicationForm(false);
              setEditingApplication(null);
              fetchDashboardData();
            }}
            onCancel={() => {
              setShowAddApplicationForm(false);
              setEditingApplication(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Loan Calculator Dialog */}
      <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>EMI Calculator</DialogTitle>
          </DialogHeader>
          <LoanCalculator
            defaultAmount={calculatorData.amount}
            defaultRate={calculatorData.rate}
            defaultTenure={calculatorData.tenure}
            onClose={() => setShowCalculator(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceProviderDashboard;
