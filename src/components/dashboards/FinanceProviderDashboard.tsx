import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeader
} from "@/components/ui/table";
import {
  Loader2,
  Settings,
  CreditCard,
  FileText,
  CheckCircle,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Plus,
  Edit,
  Eye,
  Calculator,
  Star,
  Clock,
  Users,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import EnhancedHeader from "@/components/EnhancedHeader";
import LoanProductForm from "@/components/forms/LoanProductForm";
import LoanApplicationForm from "@/components/forms/LoanApplicationForm";
import LoanCalculator from "@/components/forms/LoanCalculator";
import LoanSchemeForm from "@/components/forms/LoanSchemeForm";

interface FinanceProviderDashboardProps {
  userProfile: any;
}

const FinanceProviderDashboard = ({ userProfile }: FinanceProviderDashboardProps) => {
  // Auth and toast
  const { user } = useAuth();
  const { toast } = useToast();

  // Data states
  const [loanApplications, setLoanApplications] = useState<any[]>([]);
  const [loanSchemes, setLoanSchemes] = useState<any[]>([]);
  const [loanProducts, setLoanProducts] = useState<any[]>([]);

  // Modals & Forms visibility
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [showAddApplicationForm, setShowAddApplicationForm] = useState(false);
  const [showAddSchemeForm, setShowAddSchemeForm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  // Editing items
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingApplication, setEditingApplication] = useState<any>(null);
  const [editingScheme, setEditingScheme] = useState<any>(null);

  // Calculator inputs
  const [calculatorData, setCalculatorData] = useState<{ amount?: number; rate?: number; tenure?: number }>({});

  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState({
    totalApplications: 0,
    approvedLoans: 0,
    totalDisbursed: 0,
    activePortfolio: 0,
    overdueRate: 0,
  });

  // Loading and busy states
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDelete, setLoadingDelete] = useState<boolean>(false);

  // Fetch data once user is available
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      // Fetch loan applications
      const { data: applications, error: applicationsError } = await supabase
        .from("loan_applications")
        .select("*")
        .eq("provider_id", user?.id)
        .order("created_at", { ascending: false });
      if (applicationsError) {
        console.error(applicationsError);
      } else {
        setLoanApplications(applications || []);
      }

      // Fetch loan schemes
      const { data: schemes, error: schemesError } = await supabase
        .from("loan_schemes")
        .select("*")
        .eq("provider_id", user?.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (schemesError) {
        console.error(schemesError);
      } else {
        setLoanSchemes(schemes || []);
      }

      // Fetch loan products
      const { data: products, error: productsError } = await supabase
        .from("loan_products")
        .select("*")
        .eq("provider_id", user?.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (productsError) {
        console.error(productsError);
      } else {
        setLoanProducts(products || []);
      }

      // Calculate stats
      const totalApplications = applications?.length || 0;
      const approvedLoans = applications?.filter((a) => a.status === "approved").length || 0;
      const totalDisbursed = applications?.filter((a) => a.status === "disbursed")
        .reduce((sum, a) => sum + (a.amount_requested || 0), 0) || 0;
      const activePortfolio = applications?.filter((a) => ["approved", "disbursed"].includes(a.status))
        .reduce((sum, a) => sum + (a.amount_requested || 0), 0) || 0;
      const overdueApplications = applications?.filter((a) => a.status === "overdue").length || 0;
      const overdueRate = totalApplications > 0 ? (overdueApplications / totalApplications) * 100 : 0;

      setDashboardStats({
        totalApplications,
        approvedLoans,
        totalDisbursed,
        activePortfolio,
        overdueRate: parseFloat(overdueRate.toFixed(1)),
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generate status badge component
  const getStatusBadge = (status: string) => {
    const statusMapping: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending_documents: { label: "Pending Documents", variant: "secondary" },
      under_review: { label: "Under Review", variant: "default" },
      approved: { label: "Approved", variant: "outline" },
      rejected: { label: "Rejected", variant: "destructive" },
      disbursed: { label: "Disbursed", variant: "outline" },
      overdue: { label: "Overdue", variant: "destructive" },
    };

    const config = statusMapping[status] || { label: status, variant: "default" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Color coding for credit scores
  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return "text-green-600";
    if (score >= 650) return "text-yellow-600";
    return "text-red-600";
  };

  // Handler for deleting loan scheme with confirmation
  const handleDeleteScheme = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scheme? This operation cannot be undone.")) return;
    setLoadingDelete(true);

    try {
      const { error } = await supabase
        .from("loan_schemes")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      toast({
        title: "Scheme deleted",
      });
      fetchDashboardData();

    } catch (e) {
      toast({
        title: "Failed to delete scheme",
        variant: "destructive",
        description: e.message,
      });
    } finally {
      setLoadingDelete(false);
    }
  };

  // If loading, show spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finance Provider Dashboard</h1>
          <p className="text-muted-foreground">Manage loan applications, schemes, portfolio & analytics</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setShowAddProductForm(true)} variant="outline" className="flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Loan Product
          </Button>
          <Button onClick={() => { setEditingScheme(null); setShowAddSchemeForm(true); }} variant="outline" className="flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Loan Scheme
          </Button>
          <Button onClick={() => setShowAddApplicationForm(true)} variant="outline" className="flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Loan Application
          </Button>
          <Button onClick={() => setShowCalculator(true)} variant="outline" className="flex items-center gap-1">
            <Calculator className="w-4 h-4" /> Calculator
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { title: "Total Applications", value: dashboardStats.totalApplications, icon: FileText, color: "text-blue-600" },
          { title: "Approved Loans", value: dashboardStats.approvedLoans, icon: CheckCircle, color: "text-green-600" },
          { title: "Total Disbursed", value: `₹${(dashboardStats.totalDisbursed / 1e7).toFixed(1)}Cr`, icon: DollarSign, color: "text-purple-600" },
          { title: "Active Portfolio", value: `₹${(dashboardStats.activePortfolio / 1e7).toFixed(1)}Cr`, icon: TrendingUp, color: "text-orange-600" },
          { title: "Overdue Rate", value: `${dashboardStats.overdueRate}%`, icon: AlertTriangle, color: "text-red-600" },
        ].map(({ title, value, icon: Icon, color }, idx) => (
          <Card key={idx}>
            <CardContent className="flex justify-between items-center">
              <div>
                <p className="text-muted-foreground">{title}</p>
                <p className="text-lg font-bold">{value}</p>
              </div>
              <div className={`${color} rounded bg-opacity-10 p-3`}>
                <Icon size={24} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="applications" className="w-full">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="schemes">Schemes</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Applications Tab */}
        <TabsContent value="applications" className="mt-6">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2"><FileText size={20} /> Applications</CardTitle>
              <Button onClick={() => setShowAddApplicationForm(true)}><Plus size={16} /> New Application</Button>
            </CardHeader>
            <CardContent>
              {loanApplications.length === 0 ? (
                <p className="text-center text-muted-foreground">No applications available yet.</p>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Applicant</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Credit Score</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loanApplications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>{app.id}</TableCell>
                        <TableCell>
                          <p className="font-semibold">{app.applicant_name}</p>
                          <p className="text-sm text-muted-foreground">{app.business_type}</p>
                        </TableCell>
                        <TableCell>{app.loan_type}</TableCell>
                        <TableCell>₹{app.amount_requested?.toLocaleString()}</TableCell>
                        <TableCell className={getCreditScoreColor(app.credit_score)}>{app.credit_score}</TableCell>
                        <TableCell>{getStatusBadge(app.status)}</TableCell>
                        <TableCell>{app.applied_date}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => {
                            // Handle view logic here
                          }}><Eye size={16} /></Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            setEditingApplication(app);
                            setShowAddApplicationForm(true);
                          }}><Edit size={16} /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schemes Tab */}
        <TabsContent value="schemes" className="mt-6">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2"><CreditCard size={20} /> Schemes</CardTitle>
              <Button onClick={() => { setEditingScheme(null); setShowAddSchemeForm(true); }}>
                <Plus size={16} /> Add Scheme
              </Button>
            </CardHeader>
            <CardContent>
              {loanSchemes.length === 0 ? (
                <p className="text-center text-muted-foreground">No schemes available.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loanSchemes.map((scheme) => (
                    <Card key={scheme.id} className="relative">
                      <CardContent>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{scheme.scheme_name}</h3>
                            <Badge variant={scheme.is_government_scheme ? "default" : "outline"}>{scheme.is_government_scheme ? "Government Scheme" : scheme.scheme_type}</Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" aria-label={`Edit scheme ${scheme.scheme_name}`} onClick={() => {
                              setEditingScheme(scheme);
                              setShowAddSchemeForm(true);
                            }}>
                              <Edit size={16} />
                            </Button>
                            <Button size="sm" variant="ghost" aria-label={`Delete scheme ${scheme.scheme_name}`} onClick={() => {
                              handleDeleteScheme(scheme.id);
                            }}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1 mt-2 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Interest Rate</span><span className="font-semibold">{scheme.interest_rate_min}% - {scheme.interest_rate_max}%</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Max Amount</span><span className="font-semibold">₹{(scheme.max_amount / 100000).toFixed(1)}L</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Tenure</span><span className="font-semibold">{scheme.min_tenure_months} - {scheme.max_tenure_months} months</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Processing Fee</span><span className="font-semibold">{scheme.processing_fee_percentage}%</span></div>
                        </div>
                        <Button size="sm" variant="outline" className="mt-4 w-full" onClick={() => {
                          setCalculatorData({
                            amount: scheme.max_amount / 2,
                            rate: (scheme.interest_rate_min + scheme.interest_rate_max) / 2,
                            tenure: scheme.max_tenure_months,
                          });
                          setShowCalculator(true);
                        }}>
                          <Calculator size={16} className="mr-1" /> Calculate EMI
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="mt-6">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Loan Products section coming soon.
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Analytics section coming soon.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Loan Product Modal */}
      <Dialog open={showAddProductForm} onOpenChange={setShowAddProductForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Loan Product" : "Add Loan Product"}</DialogTitle>
          </DialogHeader>
          <LoanProductForm
            editingProduct={editingProduct}
            onSuccess={() => {
              setShowAddProductForm(false);
              setEditingProduct(null);
              fetchDashboardData();
            }}
            onCancel={() => {
              setShowAddProductForm(false);
              setEditingProduct(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add / Edit Loan Scheme Modal */}
      <Dialog open={showAddSchemeForm} onOpenChange={setShowAddSchemeForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingScheme ? "Edit Loan Scheme" : "Add Loan Scheme"}</DialogTitle>
          </DialogHeader>
          <LoanSchemeForm
            editingScheme={editingScheme}
            onSuccess={() => {
              setShowAddSchemeForm(false);
              setEditingScheme(null);
              fetchDashboardData();
            }}
            onCancel={() => {
              setShowAddSchemeForm(false);
              setEditingScheme(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add / Edit Loan Application Modal */}
      <Dialog open={showAddApplicationForm} onOpenChange={setShowAddApplicationForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingApplication ? "Edit Loan Application" : "Add Loan Application"}</DialogTitle>
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

      {/* Calculator Modal */}
      <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Loan EMI Calculator</DialogTitle>
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
