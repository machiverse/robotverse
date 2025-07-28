import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Bot,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  DollarSign,
  Package,
  Activity,
  BarChart3,
  Upload,
  Download,
  Image as ImageIcon,
  ShieldX,
  AlertCircle,
  UserX,
  Grid,
  List,
  Copy,
  Star,
  Calendar,
  Clock,
  Users,
  MessageCircle,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  RefreshCw,
  Settings,
  FileText,
  Camera,
  MapPin,
  Zap,
  FileSpreadsheet,
  Link,
  ExternalLink,
  CloudUpload
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse'; // For CSV parsing
import * as XLSX from 'xlsx'; // For Excel parsing

interface RobotSellerDashboardProps {
  userProfile: any;
}

interface BulkUploadData {
  name: string;
  robot_type: string;
  brand: string;
  model: string;
  price: number;
  currency: string;
  description: string;
  specifications: any;
  images: string[];
  availability: string;
  condition: string;
  location: string;
  year_manufactured: number;
  warranty_info: string;
  [key: string]: any;
}

const RobotSellerDashboard = ({ userProfile }: RobotSellerDashboardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Existing states
  const [robots, setRobots] = useState<any[]>([]);
  const [filteredRobots, setFilteredRobots] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedRobots, setSelectedRobots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Enhanced inventory management states
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showImageUrlDialog, setShowImageUrlDialog] = useState(false);
  const [bulkUploadData, setBulkUploadData] = useState<BulkUploadData[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  // Single robot form states
  const [singleRobotForm, setSingleRobotForm] = useState({
    name: '',
    robot_type: '',
    brand: '',
    model: '',
    price: '',
    currency: 'INR',
    description: '',
    specifications: '',
    image_urls: [''],
    availability: 'available',
    condition: 'new',
    location: '',
    year_manufactured: new Date().getFullYear(),
    warranty_info: ''
  });

  // Image URL states
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [validatingImages, setValidatingImages] = useState(false);

  const [dashboardStats, setDashboardStats] = useState({
    totalRobots: 0,
    activeListings: 0,
    totalRevenue: 0,
    totalViews: 0,
    avgPrice: 0,
    soldThisMonth: 0,
    inquiries: 0,
    conversationRate: 0,
    avgResponseTime: 0,
    topPerforming: null as any
  });

  // Access control
  const userType = userProfile?.user_type;
  const sellerRoles = userProfile?.seller_roles || [];
  const hasRobotSellerAccess = 
    userType === 'seller' || 
    userType === 'robot_seller' || 
    sellerRoles.includes('robot_seller') ||
    sellerRoles.includes('seller');

  console.log('🤖 Robot Seller Dashboard Debug:', {
    userType,
    sellerRoles,
    hasRobotSellerAccess,
    userId: user?.id
  });

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  useEffect(() => {
    filterAndSortRobots();
  }, [robots, searchQuery, filterStatus, sortBy, sortOrder]);

  const fetchDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setRefreshing(true);
      
      const { data: robotsData, error } = await supabase
        .from('robots')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching robots:', error);
      }

      const robots = robotsData || [];
      setRobots(robots);
      calculateEnhancedStats(robots);
      setLoading(false);
      setRefreshing(false);
      
      console.log('✅ Fetched robots:', robots.length);
    } catch (error) {
      console.error('Error fetching robots:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load robot listings"
      });
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateEnhancedStats = (robotData: any[]) => {
    const totalRobots = robotData.length;
    const activeListings = robotData.filter(r => r.availability === 'available').length;
    const totalRevenue = robotData.reduce((sum, r) => sum + (r.price || 0), 0);
    const avgPrice = totalRobots > 0 ? totalRevenue / totalRobots : 0;

    setDashboardStats({
      totalRobots,
      activeListings,
      totalRevenue,
      totalViews: Math.floor(Math.random() * 1000),
      avgPrice,
      soldThisMonth: 0,
      inquiries: Math.floor(Math.random() * 50),
      conversationRate: Math.random() * 10,
      avgResponseTime: 2.3,
      topPerforming: robotData[0] || null
    });
  };

  const filterAndSortRobots = () => {
    let filtered = [...robots];

    if (searchQuery) {
      filtered = filtered.filter(robot => 
        robot.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.robot_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.brand?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(robot => robot.availability === filterStatus);
    }

    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'price') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else if (sortBy === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredRobots(filtered);
  };

  // Enhanced image URL validation
  const validateImageUrl = async (url: string): Promise<boolean> => {
    if (!url || !url.startsWith('http')) return false;
    
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentType = response.headers.get('content-type');
      return response.ok && contentType?.startsWith('image/');
    } catch {
      return false;
    }
  };

  const handleImageUrlChange = async (index: number, url: string) => {
    const newUrls = [...imageUrls];
    newUrls[index] = url;
    setImageUrls(newUrls);

    if (url && url.startsWith('http')) {
      setValidatingImages(true);
      const isValid = await validateImageUrl(url);
      
      const newPreviews = [...imagePreviewUrls];
      newPreviews[index] = isValid ? url : '';
      setImagePreviewUrls(newPreviews);
      setValidatingImages(false);

      if (!isValid && url.length > 10) {
        toast({
          variant: "destructive",
          title: "Invalid Image URL",
          description: "Please provide a valid image URL"
        });
      }
    }
  };

  const addImageUrlField = () => {
    setImageUrls([...imageUrls, '']);
    setImagePreviewUrls([...imagePreviewUrls, '']);
  };

  const removeImageUrlField = (index: number) => {
    if (imageUrls.length > 1) {
      setImageUrls(imageUrls.filter((_, i) => i !== index));
      setImagePreviewUrls(imagePreviewUrls.filter((_, i) => i !== index));
    }
  };

  // Enhanced single robot add
  const handleAddSingleRobot = async () => {
    if (!hasRobotSellerAccess) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You need robot seller permissions to add listings"
      });
      return;
    }

    if (!singleRobotForm.name || !singleRobotForm.price) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in name and price"
      });
      return;
    }

    try {
      setUploading(true);
      
      // Filter out empty image URLs
      const validImageUrls = imageUrls.filter(url => url && url.startsWith('http'));
      
      const robotData = {
        name: singleRobotForm.name,
        robot_type: singleRobotForm.robot_type,
        brand: singleRobotForm.brand,
        model: singleRobotForm.model,
        price: parseFloat(singleRobotForm.price),
        currency: singleRobotForm.currency,
        description: singleRobotForm.description,
        specifications: singleRobotForm.specifications ? JSON.parse(singleRobotForm.specifications) : {},
        images: validImageUrls,
        availability: singleRobotForm.availability,
        condition: singleRobotForm.condition,
        location: singleRobotForm.location,
        year_manufactured: singleRobotForm.year_manufactured,
        warranty_info: singleRobotForm.warranty_info,
        seller_id: user?.id
      };

      const { error } = await supabase
        .from('robots')
        .insert([robotData]);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Robot added successfully"
      });

      // Reset form
      setSingleRobotForm({
        name: '',
        robot_type: '',
        brand: '',
        model: '',
        price: '',
        currency: 'INR',
        description: '',
        specifications: '',
        image_urls: [''],
        availability: 'available',
        condition: 'new',
        location: '',
        year_manufactured: new Date().getFullYear(),
        warranty_info: ''
      });
      setImageUrls(['']);
      setImagePreviewUrls(['']);
      setShowAddForm(false);
      fetchDashboardData();

    } catch (error) {
      console.error('Error adding robot:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add robot"
      });
    } finally {
      setUploading(false);
    }
  };

  // Enhanced bulk upload functionality
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          processBulkData(results.data as any[]);
        },
        error: (error) => {
          toast({
            variant: "destructive",
            title: "CSV Parse Error",
            description: error.message
          });
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          processBulkData(jsonData as any[]);
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Excel Parse Error",
            description: "Failed to parse Excel file"
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please upload a CSV or Excel file"
      });
    }
  };

  const processBulkData = (data: any[]) => {
    if (!data || data.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty File",
        description: "The uploaded file contains no data"
      });
      return;
    }

    const processedData: BulkUploadData[] = data.map((row, index) => {
      // Handle image URLs - split by comma if multiple URLs
      const imageUrls = row.image_urls || row.images || row.image_url || '';
      const imagesArray = typeof imageUrls === 'string' 
        ? imageUrls.split(',').map((url: string) => url.trim()).filter((url: string) => url)
        : [imageUrls].filter(Boolean);

      return {
        name: row.name || row.robot_name || `Robot ${index + 1}`,
        robot_type: row.robot_type || row.type || 'industrial',
        brand: row.brand || '',
        model: row.model || '',
        price: parseFloat(row.price) || 0,
        currency: row.currency || 'INR',
        description: row.description || '',
        specifications: row.specifications ? 
          (typeof row.specifications === 'string' ? JSON.parse(row.specifications) : row.specifications) 
          : {},
        images: imagesArray,
        availability: row.availability || 'available',
        condition: row.condition || 'new',
        location: row.location || '',
        year_manufactured: parseInt(row.year_manufactured) || new Date().getFullYear(),
        warranty_info: row.warranty_info || ''
      };
    });

    setBulkUploadData(processedData);
    setShowBulkUpload(true);

    toast({
      title: "File Processed",
      description: `${processedData.length} robots ready for upload`
    });
  };

  const handleBulkUpload = async () => {
    if (!hasRobotSellerAccess) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You need robot seller permissions to upload robots"
      });
      return;
    }

    if (bulkUploadData.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "No robot data to upload"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadErrors([]);

    const errors: string[] = [];
    const batchSize = 10; // Upload in batches to avoid overwhelming the database
    
    for (let i = 0; i < bulkUploadData.length; i += batchSize) {
      const batch = bulkUploadData.slice(i, i + batchSize);
      
      try {
        const robotsToInsert = batch.map(robot => ({
          ...robot,
          seller_id: user?.id
        }));

        const { error } = await supabase
          .from('robots')
          .insert(robotsToInsert);

        if (error) {
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        }

        setUploadProgress(((i + batchSize) / bulkUploadData.length) * 100);
        
      } catch (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error}`);
      }
    }

    setUploadErrors(errors);
    setUploading(false);

    if (errors.length === 0) {
      toast({
        title: "Success!",
        description: `${bulkUploadData.length} robots uploaded successfully`
      });
      setShowBulkUpload(false);
      setBulkUploadData([]);
      fetchDashboardData();
    } else {
      toast({
        variant: "destructive",
        title: "Upload Completed with Errors",
        description: `${errors.length} batches failed`
      });
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    const template = `name,robot_type,brand,model,price,currency,description,image_urls,availability,condition,location,year_manufactured,warranty_info
ABB IRB 6600,industrial,ABB,IRB 6600,500000,INR,High payload industrial robot,"https://example.com/image1.jpg,https://example.com/image2.jpg",available,new,Mumbai,2023,2 years warranty
KUKA KR 10,assembly,KUKA,KR 10,300000,INR,Precision assembly robot,https://example.com/kuka-image.jpg,available,used,Delhi,2022,1 year warranty`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'robot-upload-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Template Downloaded",
      description: "Use this template to format your robot data"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-4">Loading dashboard...</p>
      </div>
    );
  }

  if (!hasRobotSellerAccess) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <ShieldX className="w-6 h-6" />
              Access Restricted - Robot Seller Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>Debug Information:</strong><br />
                User Type: {userType || 'Not set'}<br />
                Seller Roles: {sellerRoles.length > 0 ? sellerRoles.join(', ') : 'None'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const enhancedStatsCards = [
    {
      title: 'Total Robots',
      value: dashboardStats.totalRobots,
      icon: Bot,
      trend: `${dashboardStats.activeListings} active`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Revenue',
      value: `₹${dashboardStats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      trend: `Avg: ₹${dashboardStats.avgPrice.toLocaleString()}`,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Views',
      value: dashboardStats.totalViews,
      icon: Eye,
      trend: 'All listings',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Conversion Rate',
      value: `${dashboardStats.conversationRate.toFixed(1)}%`,
      icon: TrendingUp,
      trend: 'Views to inquiries',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Access confirmation banner */}
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="w-4 h-4" />
        <AlertDescription className="text-green-700">
          <strong>✅ Robot Seller Access Confirmed</strong> - You have full access to robot selling features. 
          Welcome, {userProfile?.full_name || user?.email}!
        </AlertDescription>
      </Alert>

      {/* Enhanced Header with inventory management buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Enhanced Robot Inventory Management
          </h1>
          <p className="text-muted-foreground">
            Add single robots, bulk upload via CSV/Excel, and manage your inventory
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm"
            onClick={downloadTemplate}
          >
            <Download className="w-4 h-4 mr-2" />
            CSV Template
          </Button>
          <Button 
            variant="outline" 
            onClick={() => fetchDashboardData()}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowImageUrlDialog(true)}
          >
            <Link className="w-4 h-4 mr-2" />
            Image URLs
          </Button>
          <Button 
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-green-600 to-blue-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Single Robot
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button className="bg-gradient-to-r from-purple-600 to-red-600">
              <CloudUpload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {enhancedStatsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    <Badge variant="secondary" className="text-xs mt-2">
                      {stat.trend}
                    </Badge>
                  </div>
                  <div className={`w-14 h-14 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-7 h-7 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Robot Inventory Display (simplified for space) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Robot Inventory ({filteredRobots.length})
          </CardTitle>
          <CardDescription>Your complete robot inventory with enhanced management</CardDescription>
        </CardHeader>
        <CardContent>
          {robots.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No robots in inventory</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding robots individually or upload in bulk
              </p>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={() => setShowAddForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Single Robot
                </Button>
                <Button 
                  variant="outline"
                  onClick={downloadTemplate}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Get Template
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {robots.length} robots in inventory. Use the buttons above to add more robots or manage existing ones.
              </p>
              {/* Simplified robot list */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {robots.slice(0, 6).map((robot) => (
                  <Card key={robot.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                        {robot.images && robot.images.length > 0 ? (
                          <img 
                            src={robot.images[0]} 
                            alt={robot.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Bot className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <h3 className="font-semibold truncate mb-1">{robot.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{robot.brand} {robot.model}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{robot.robot_type}</Badge>
                        <p className="font-bold">₹{robot.price?.toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {robots.length > 6 && (
                <p className="text-center text-sm text-muted-foreground">
                  And {robots.length - 6} more robots...
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single Robot Add Form Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Single Robot
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Robot Name *</Label>
                <Input
                  id="name"
                  value={singleRobotForm.name}
                  onChange={(e) => setSingleRobotForm({...singleRobotForm, name: e.target.value})}
                  placeholder="e.g., ABB IRB 6600"
                />
              </div>
              <div>
                <Label htmlFor="robot_type">Robot Type</Label>
                <Select
                  value={singleRobotForm.robot_type}
                  onValueChange={(value) => setSingleRobotForm({...singleRobotForm, robot_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="collaborative">Collaborative</SelectItem>
                    <SelectItem value="assembly">Assembly</SelectItem>
                    <SelectItem value="welding">Welding</SelectItem>
                    <SelectItem value="painting">Painting</SelectItem>
                    <SelectItem value="pick_and_place">Pick and Place</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={singleRobotForm.brand}
                  onChange={(e) => setSingleRobotForm({...singleRobotForm, brand: e.target.value})}
                  placeholder="e.g., ABB, KUKA, Fanuc"
                />
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={singleRobotForm.model}
                  onChange={(e) => setSingleRobotForm({...singleRobotForm, model: e.target.value})}
                  placeholder="e.g., IRB 6600"
                />
              </div>
              <div>
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  value={singleRobotForm.price}
                  onChange={(e) => setSingleRobotForm({...singleRobotForm, price: e.target.value})}
                  placeholder="500000"
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={singleRobotForm.currency}
                  onValueChange={(value) => setSingleRobotForm({...singleRobotForm, currency: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Image URLs Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label>Image URLs</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addImageUrlField}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Image
                </Button>
              </div>
              
              {imageUrls.map((url, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Input
                      value={url}
                      onChange={(e) => handleImageUrlChange(index, e.target.value)}
                      placeholder="https://example.com/robot-image.jpg"
                    />
                  </div>
                  {imagePreviewUrls[index] && (
                    <div className="w-16 h-16 border rounded overflow-hidden">
                      <img 
                        src={imagePreviewUrls[index]} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {imageUrls.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeImageUrlField(index)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              
              {validatingImages && (
                <p className="text-sm text-muted-foreground">Validating image URLs...</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={singleRobotForm.description}
                onChange={(e) => setSingleRobotForm({...singleRobotForm, description: e.target.value})}
                placeholder="Detailed description of the robot..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="availability">Availability</Label>
                <Select
                  value={singleRobotForm.availability}
                  onValueChange={(value) => setSingleRobotForm({...singleRobotForm, availability: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="condition">Condition</Label>
                <Select
                  value={singleRobotForm.condition}
                  onValueChange={(value) => setSingleRobotForm({...singleRobotForm, condition: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                    <SelectItem value="refurbished">Refurbished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="year_manufactured">Year</Label>
                <Input
                  id="year_manufactured"
                  type="number"
                  value={singleRobotForm.year_manufactured}
                  onChange={(e) => setSingleRobotForm({...singleRobotForm, year_manufactured: parseInt(e.target.value)})}
                  min="1980"
                  max={new Date().getFullYear()}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={singleRobotForm.location}
                onChange={(e) => setSingleRobotForm({...singleRobotForm, location: e.target.value})}
                placeholder="e.g., Mumbai, Delhi"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowAddForm(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddSingleRobot}
                disabled={uploading || !singleRobotForm.name || !singleRobotForm.price}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Robot
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CloudUpload className="w-5 h-5" />
              Bulk Upload Preview ({bulkUploadData.length} robots)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {uploadErrors.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Upload Errors:</strong>
                  <ul className="mt-2 space-y-1">
                    {uploadErrors.map((error, index) => (
                      <li key={index} className="text-sm">• {error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Upload Progress</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Images</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkUploadData.slice(0, 10).map((robot, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{robot.name}</TableCell>
                      <TableCell>{robot.robot_type}</TableCell>
                      <TableCell>{robot.brand}</TableCell>
                      <TableCell>₹{robot.price?.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {robot.images.slice(0, 2).map((img, i) => (
                            <div key={i} className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                              <ImageIcon className="w-3 h-3" />
                            </div>
                          ))}
                          {robot.images.length > 2 && (
                            <span className="text-xs text-muted-foreground">+{robot.images.length - 2}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Ready</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {bulkUploadData.length > 10 && (
              <p className="text-sm text-muted-foreground text-center">
                And {bulkUploadData.length - 10} more robots...
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowBulkUpload(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBulkUpload}
                disabled={uploading || bulkUploadData.length === 0}
                className="bg-gradient-to-r from-purple-600 to-red-600"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4 h-4 mr-2" />
                    Upload {bulkUploadData.length} Robots
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image URL Helper Dialog */}
      <Dialog open={showImageUrlDialog} onOpenChange={setShowImageUrlDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              Image URL Guidelines
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <ImageIcon className="w-4 h-4" />
              <AlertDescription>
                <strong>Supported Image URLs:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Direct image links (ending in .jpg, .png, .webp, etc.)</li>
                  <li>• CDN URLs (Cloudinary, AWS S3, etc.)</li>
                  <li>• Public image hosting services</li>
                  <li>• HTTPS URLs are recommended for security</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h3 className="font-semibold">Example URLs:</h3>
              <div className="bg-muted p-3 rounded text-sm font-mono">
                <p>✅ https://example.com/robot-image.jpg</p>
                <p>✅ https://cdn.example.com/images/robot.png</p>
                <p>✅ https://storage.googleapis.com/bucket/robot.webp</p>
                <p>❌ https://example.com/page-with-image</p>
                <p>❌ http://insecure-url.com/image.jpg</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">For CSV/Excel Upload:</h3>
              <p className="text-sm text-muted-foreground">
                Separate multiple image URLs with commas in the image_urls column:
              </p>
              <div className="bg-muted p-3 rounded text-sm font-mono">
                "https://example.com/front.jpg,https://example.com/side.jpg,https://example.com/back.jpg"
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RobotSellerDashboard;
