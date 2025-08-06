import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Button
} from "@/components/ui/button";
import {
  Badge
} from "@/components/ui/badge";
import {
  Input
} from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Loader2,
  Settings,
  FileText,
  CreditCard,
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
  Users
} from "lucide-react";
import {
  supabase
} from "@/integrations/supabase/client";
import EnhancedHeader from "@/components/EnhancedHeader";
import {
  useToast
} from "@/components/ui/use-toast";

import LoanProductForm from "@/components/forms/LoanProductForm";
import LoanApplicationForm from "@/components/forms/LoanApplicationForm";
import LoanCalculator from "@/components/forms/LoanCalculator";
import LoanSchemeForm from "@/components/forms/LoanSchemeForm";

interface FinanceProviderDashboardProps {
  userProfile?: any;
}

const FinanceProviderDashboard = ({ userProfile }: FinanceProviderDashboardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State for data.
  const [loanApplications, setLoanApplications] = useState([]);
  const [loanSchemes, setLoanSchemes] = useState([]);
  const [loanProducts, setLoanProducts] = useState([]);

  // Loading and feedback states
  const [loading, setLoading] = useState(true);
  const [loadingDeleteScheme, setLoadingDeleteScheme] = useState(false);

  // Modal/Open states and editing states
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [showAddApplicationForm, setShowAddApplicationForm] = useState(false);
  const [showAddSchemeForm, setShowAddSchemeForm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null);
  const [editingApplication, setEditingApplication] = useState(null);
  const [editingScheme, setEditingScheme] = useState(null);

  // Calculator input defaults
  const [calculatorData, setCalculatorData] = useState({
    amount: undefined,
    rate: undefined,
    tenure: undefined,
  });

  // Overview stats
  const [dashboardStats, setDashboardStats] = useState({
    totalApplications: 0,
    approvedLoans: 0,
    totalDisbursed: 0,
    activePortfolio: 0,
    overdueRate: 0,
  });

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch loan applications
      let { data: applications, error: applicationsError } = await supabase
        .from("loan_applications")
        .select("*")
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false });
      if (applicationsError) {
        console.error(applicationsError);
      } else {
        setLoanApplications(applications || []);
      }

      // Fetch loan schemes
      let { data: schemes, error: schemesError } = await supabase
        .from("loan_schemes")
        .select("*")
        .eq("provider_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (schemesError) {
        console.error(schemesError);
      } else {
        setLoanSchemes(schemes || []);
      }

      // Fetch loan products
      let { data: products, error: productsError } = await supabase
        .from("loan_products")
        .select("*")
        .eq("provider_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (productsError) {
        console.error(productsError);
      } else {
        setLoanProducts(products || []);
      }

      // Calculate stats
      const totalApplications = applications?.length || 0;
      const approvedLoans = applications?.filter((app) => app.status === "approved").length || 0;
      const totalDisbursed = applications?.filter((app) => app.status === "disbursed")
        .reduce((acc, app) => acc + (app.amount_requested || 0), 0) || 0;
      const activePortfolio = applications?.filter((app) => ["approved", "disbursed"].includes(app.status))
        .reduce((acc, app) => acc + (app.amount_requested || 0), 0) || 0;
      const overdueApplications = applications?.filter((app) => app.status === "overdue").length || 0;
      const overdueRate = totalApplications > 0 ? (overdueApplications / totalApplications) * 100 : 0;

      setDashboardStats({
        totalApplications,
        approvedLoans,
        totalDisbursed,
        activePortfolio,
        overdueRate: parseFloat(overdueRate.toFixed(1)),
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Status Badge helper
  const getStatusBadge = (status) => {
    const config = {
      pending_documents: { label: "Pending Documents", variant: "secondary" },
      under_review: { label: "Under Review", variant: "default" },
      approved: { label: "Approved", variant: "outline" },
      rejected: { label: "Rejected", variant: "destructive" },
      disbursed: { label: "Disbursed", variant: "outline" },
      overdue: { label: "Overdue", variant: "destructive" },
    };
    const statusConfig = config[status] || { label: status, variant: "default" };
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  // Credit score color helper
  const getCreditScoreColor = (score) => {
    if (score >= 750) return "text-green-600";
    if (score >= 650) return "text-yellow-600";
    return "text-red-600";
  };

  // Delete scheme handler with confirmation
  const handleDeleteScheme = async (id) => {
    if (!confirm("Are you sure you want to delete this scheme? This action cannot be undone.")) return;
    try {
      await supabase.from("loan_schemes").delete().eq("id", id);
      toast({
        title: "Scheme deleted",
        description: "Loan scheme has been successfully deleted"
      });
      fetchDashboardData();
    } catch (error) {
      toast({
        title: "Failed to delete scheme",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finance Provider Dashboard</h1>
          <p className="text-muted-foreground">Manage loan applications, schemes, and portfolio</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setShowAddProductForm(true)} variant="outline" className="flex items-center gap-1">
            <Plus className="w-4 h-4"/> Add Loan Product
          </Button>
          <Button onClick={() => { setEditingScheme(null); setShowAddSchemeForm(true); }} variant="outline" className="flex items-center gap-1">
            <Plus className="w-4 h-4"/> Add Loan Scheme
          </Button>
          <Button onClick={() => setShowAddApplicationForm(true)} variant="outline" className="flex items-center gap-1">
            <Plus className="w-4 h-4"/> Add Loan Application
          </Button>
          <Button onClick={() => setShowCalculator(true)} variant="outline" className="flex items-center gap-1">
            <Calculator className="w-4 h-4"/> Calculator
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          {label:"Applications",value:dashboardStats.totalApplications,icon:FileText,variant:"blue"},
          {label:"Approved",value:dashboardStats.approvedLoans,icon:CheckCircle,variant:"green"},
          {label:"Disbursed",value:`₹${(dashboardStats.totalDisbursed/1e7).toFixed(1)} Cr`,icon:DollarSign,variant:"purple"},
          {label:"Portfolio",value:`₹${(dashboardStats.activePortfolio/1e7).toFixed(1)} Cr`,icon:TrendingUp,variant:"orange"},
          {label:"Overdue Rate",value:`${dashboardStats.overdueRate}%`,icon:AlertTriangle,variant:"red"},
        ].map((stat,i) => {
          const Icon = stat.icon;
          const color = stat.variant;
          return (
            <Card key={i}>
              <CardContent className="flex justify-between items-center">
                <div>
                  <p className="text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
                <div className={`${color === "blue" ? "text-blue-600" : color === "green" ? "text-green-600" : color === "purple" ? "text-purple-600" : color === "orange" ? "text-orange-600" : "text-red-600"} rounded bg-opacity-10 p-3`}>
                  <Icon size={24}/>
                </div>
              </CardContent>
            </Card>
        )})}
      </div>

      {/* Main content tabs */}
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
              <CardTitle className="flex items-center gap-2"><FileText size={20}/> Loan Applications</CardTitle>
              <Button onClick={() => setShowAddApplicationForm(true)}><Plus size={16}/> New Application</Button>
            </CardHeader>
            <CardContent>
              {loanApplications.length === 0 ?
                (<p className="text-center text-muted-foreground">No applications yet. Please add one.</p>) :
                (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Applicant</TableHead>
                        <TableHead>Loan Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Credit Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loanApplications.map(app => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.id}</TableCell>
                          <TableCell>
                            <p className="font-medium">{app.applicant_name}</p>
                            <p className="text-muted-foreground text-sm">{app.business_type}</p>
                          </TableCell>
                          <TableCell>{app.loan_type}</TableCell>
                          <TableCell>₹{app.amount_requested?.toLocaleString()}</TableCell>
                          <TableCell className={getCreditScoreColor(app.credit_score)}>{app.credit_score}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell>{app.applied_date}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => {/* View detail logic */}}><Eye size={16}/></Button>
                              <Button size="sm" variant="outline" onClick={() => {
                                setEditingApplication(app);
                                setShowAddApplicationForm(true);
                              }}><Edit size={16}/></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              }
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schemes Tab */}
        <TabsContent value="schemes" className="mt-6">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2"><CreditCard size={20}/> Loan Schemes</CardTitle>
              <Button onClick={() => { setEditingScheme(null); setShowAddSchemeForm(true); }}><Plus size={16}/> Add Scheme</Button>
            </CardHeader>
            <CardContent>
              {loanSchemes.length === 0 ? (
                <p className="text-muted-foreground text-center">No schemes found. Please add one.</p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loanSchemes.map((scheme) => (
                    <Card key={scheme.id} className="relative">
                      <CardContent>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{scheme.scheme_name}</h3>
                            <Badge 
                              variant={scheme.is_government_scheme ? "default" : "outline"} 
                              className="mt-1"
                            >{scheme.is_government_scheme ? "Government" : scheme.scheme_type}</Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              size="sm"
                              variant="ghost"
                              aria-label={`Edit Scheme ${scheme.scheme_name}`}
                              onClick={() => {
                                setEditingScheme(scheme);
                                setShowAddSchemeForm(true);
                              }}
                            >
                              <Edit size={16}/>
                            </Button>
                            <Button 
                              size="sm"
                              variant="ghost"
                              aria-label={`Delete Scheme ${scheme.scheme_name}`}
                              onClick={() => handleDeleteScheme(scheme.id)}
                              disabled={loadingDeleteScheme}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                              </svg>
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1 mt-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Interest Rate</span>
                            <span className="font-medium">{scheme.interest_rate_min}% - {scheme.interest_rate_max}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Max Amount</span>
                            <span className="font-medium">₹{(scheme.max_amount/1e5).toFixed(1)}L</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tenure</span>
                            <span className="font-medium">{scheme.min_tenure_months} - {scheme.max_tenure_months} months</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Processing Fee</span>
                            <span className="font-medium">{scheme.processing_fee_percentage}%</span>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-4 w-full"
                          onClick={() => {
                            setCalculatorData({
                              amount: scheme.max_amount / 2,
                              rate: (scheme.interest_rate_min + scheme.interest_rate_max) / 2,
                              tenure: scheme.max_tenure_months,
                            });
                            setShowCalculator(true);
                          }}
                        >
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
          {/* Similar structure for loan products with add/edit functionality */}
          {/* You can copy the earlier implementation for loan products here */}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          {/* Your analytics components and content */}
        </TabsContent>
      </Tabs>

      {/* Loan Product Modal */}
      <Dialog open={showAddProductForm} onOpenChange={setShowAddProductForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

      {/* Loan Scheme Modal */}
      <Dialog open={showAddSchemeForm} onOpenChange={setShowAddSchemeForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

      {/* Loan Application Modal */}
      <Dialog open={showAddApplicationForm} onOpenChange={setShowAddApplicationForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loan Calculator</DialogTitle>
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
