import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Bot, Package, Wrench, CreditCard, Truck, Shield, Search, Heart,
  ShoppingCart, TrendingUp, Clock, Star, MapPin, Activity, Eye,
  MessageCircle, RefreshCw, CheckCircle, AlertCircle, User, FileText,
  ArrowRight, Calendar, BarChart3, Zap, Globe, Bell, ChevronRight,
  Send, Inbox, CircleDot
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { DashboardHeader } from '@/components/DashboardHeader';
import WatchlistSection from '@/components/WatchlistSection';
import BuyerQuotationsView from '@/components/dashboards/BuyerQuotationsView';

interface BuyerDashboardProps {
  userProfile: any;
}

interface DashboardStats {
  availableRobots: number;
  availableServices: number;
  availableParts: number;
  profileCompletion: number;
  accountVerified: boolean;
  totalWatchlistItems: number;
  totalQuoteRequests: number;
  pendingQuotes: number;
  respondedQuotes: number;
}

const BuyerDashboard = ({ userProfile }: BuyerDashboardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [stats, setStats] = useState<DashboardStats>({
    availableRobots: 0, availableServices: 0, availableParts: 0,
    profileCompletion: 0, accountVerified: false, totalWatchlistItems: 0,
    totalQuoteRequests: 0, pendingQuotes: 0, respondedQuotes: 0
  });
  
  const [recentRobots, setRecentRobots] = useState<any[]>([]);
  const [recentServices, setRecentServices] = useState<any[]>([]);
  const [recentParts, setRecentParts] = useState<any[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) setActiveTab(tabParam);
  }, [searchParams]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    
    try {
      setRefreshing(true);
      
      const [robotsRes, servicesRes, partsRes, watchlistRes, quotesRes] = await Promise.allSettled([
        supabase.from('robots').select('*, profiles:seller_id(full_name)')
          .eq('availability', 'available').order('created_at', { ascending: false }).limit(20),
        supabase.from('services').select('*, profiles:provider_id(full_name)')
          .order('created_at', { ascending: false }).limit(10),
        supabase.from('spare_parts').select('*, profiles:seller_id(full_name)')
          .gt('quantity', 0).order('created_at', { ascending: false }).limit(10),
        supabase.from('watchlists').select('id').eq('user_id', user.id),
        supabase.from('user_requests').select('*').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(10)
      ]);

      const robots = robotsRes.status === 'fulfilled' ? robotsRes.value.data || [] : [];
      const services = servicesRes.status === 'fulfilled' ? servicesRes.value.data || [] : [];
      const spareParts = partsRes.status === 'fulfilled' ? partsRes.value.data || [] : [];
      const watchlist = watchlistRes.status === 'fulfilled' ? watchlistRes.value.data || [] : [];
      const quotes = quotesRes.status === 'fulfilled' ? quotesRes.value.data || [] : [];
      
      setRecentRobots(robots.slice(0, 6));
      setRecentServices(services);
      setRecentParts(spareParts);
      setQuoteRequests(quotes);
      
      const profileCompletion = calculateProfileCompletion(userProfile);
      const pendingQuotes = quotes.filter((q: any) => q.status === 'new' || q.status === 'pending').length;
      const respondedQuotes = quotes.filter((q: any) => q.status === 'quoted' || q.status === 'responded').length;
      
      setStats({
        availableRobots: robots.length,
        availableServices: services.length,
        availableParts: spareParts.length,
        profileCompletion,
        accountVerified: !!userProfile?.email && !!userProfile?.full_name,
        totalWatchlistItems: watchlist.length,
        totalQuoteRequests: quotes.length,
        pendingQuotes,
        respondedQuotes
      });

      // Build activity timeline
      const activities: any[] = [];
      quotes.slice(0, 5).forEach((q: any) => {
        activities.push({
          id: q.id, type: 'quote',
          title: `Quote request for ${q.item_name || q.product_name || 'Item'}`,
          status: q.status, created_at: q.created_at
        });
      });
      setRecentActivity(activities.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load dashboard" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, userProfile, toast]);

  const calculateProfileCompletion = (profile: any): number => {
    if (!profile) return 0;
    const fields = ['full_name', 'email', 'phone', 'company_name', 'location', 'user_type'];
    const completed = fields.filter(f => profile[f] && profile[f] !== '');
    return Math.round((completed.length / fields.length) * 100);
  };

  const getTimeAgo = (dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'new': case 'pending': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'quoted': case 'responded': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'closed': return 'bg-muted text-muted-foreground';
      default: return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <DashboardHeader userProfile={userProfile} onProfileUpdate={fetchDashboardData} />

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-card to-secondary/30 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Welcome back, {userProfile?.full_name?.split(' ')[0] || 'Buyer'}
            </h2>
            <p className="text-muted-foreground mt-1">
              Explore {stats.availableRobots + stats.availableParts + stats.availableServices} products & services across the marketplace
            </p>
          </div>
          <div className="flex items-center gap-3">
            <form onSubmit={(e) => { e.preventDefault(); if (searchQuery.trim()) navigate(`/robots?q=${encodeURIComponent(searchQuery)}`); }} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search marketplace..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-56 bg-background/50" />
            </form>
            <Button variant="outline" size="icon" onClick={fetchDashboardData} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Robots', value: stats.availableRobots, icon: Bot, gradient: 'from-blue-500/20 to-blue-600/5', iconColor: 'text-blue-400', path: '/robots' },
          { label: 'Spare Parts', value: stats.availableParts, icon: Package, gradient: 'from-emerald-500/20 to-emerald-600/5', iconColor: 'text-emerald-400', path: '/parts' },
          { label: 'Services', value: stats.availableServices, icon: Wrench, gradient: 'from-violet-500/20 to-violet-600/5', iconColor: 'text-violet-400', path: '/services' },
          { label: 'Quote Requests', value: stats.totalQuoteRequests, icon: Send, gradient: 'from-amber-500/20 to-amber-600/5', iconColor: 'text-amber-400', path: '/dashboard/my-requests' },
          { label: 'Watchlist', value: stats.totalWatchlistItems, icon: Heart, gradient: 'from-rose-500/20 to-rose-600/5', iconColor: 'text-rose-400', path: '/dashboard/watchlist' },
          { label: 'Profile', value: `${stats.profileCompletion}%`, icon: User, gradient: 'from-cyan-500/20 to-cyan-600/5', iconColor: 'text-cyan-400', path: '/profile-settings' },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="group cursor-pointer hover:border-primary/40 transition-all duration-200" onClick={() => navigate(metric.path)}>
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${metric.gradient} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${metric.iconColor}`} />
                </div>
                <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{metric.label}</p>
                <ChevronRight className="w-4 h-4 text-muted-foreground mt-2 group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 h-12">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="robots" className="text-xs sm:text-sm">Robots</TabsTrigger>
          <TabsTrigger value="parts" className="text-xs sm:text-sm">Parts</TabsTrigger>
          <TabsTrigger value="services" className="text-xs sm:text-sm">Services</TabsTrigger>
          <TabsTrigger value="quotes" className="text-xs sm:text-sm">My Quotes</TabsTrigger>
          <TabsTrigger value="quotations" className="text-xs sm:text-sm">Quotations</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quote Requests Summary */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg"><Inbox className="w-5 h-5 text-primary" />Quote Requests Summary</CardTitle>
                    <CardDescription>Track your quote requests and responses</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/my-requests')}>
                    View All <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Status summary row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                    <p className="text-2xl font-bold text-amber-400">{stats.pendingQuotes}</p>
                    <p className="text-xs text-amber-400/80">Pending</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{stats.respondedQuotes}</p>
                    <p className="text-xs text-emerald-400/80">Responded</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                    <p className="text-2xl font-bold text-primary">{stats.totalQuoteRequests}</p>
                    <p className="text-xs text-primary/80">Total</p>
                  </div>
                </div>

                {quoteRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Send className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No quote requests yet</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/robots')}>
                      Browse & Request Quotes
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {quoteRequests.slice(0, 5).map((q: any) => (
                      <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                        <CircleDot className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{q.item_name || q.product_name || 'Item Request'}</p>
                          <p className="text-xs text-muted-foreground">{q.category || q.request_type || 'General'} · {getTimeAgo(q.created_at)}</p>
                        </div>
                        <Badge variant="outline" className={`text-xs shrink-0 ${getStatusColor(q.status)}`}>
                          {q.status || 'New'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profile & Account Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-primary" />
                  Profile Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Completion</span>
                    <span className="text-sm font-bold text-foreground">{stats.profileCompletion}%</span>
                  </div>
                  <Progress value={stats.profileCompletion} className="h-2" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    {stats.accountVerified 
                      ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                      : <AlertCircle className="w-4 h-4 text-amber-400" />}
                    <span className="text-sm">Account Status</span>
                  </div>
                  <Badge variant={stats.accountVerified ? "default" : "secondary"} className="text-xs">
                    {stats.accountVerified ? 'Verified' : 'Incomplete'}
                  </Badge>
                </div>

                {stats.profileCompletion < 100 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Missing Info</p>
                    <div className="space-y-1">
                      {!userProfile?.full_name && <p className="text-xs text-amber-400">• Full name</p>}
                      {!userProfile?.phone && <p className="text-xs text-amber-400">• Phone number</p>}
                      {!userProfile?.company_name && <p className="text-xs text-amber-400">• Company</p>}
                      {!userProfile?.location && <p className="text-xs text-amber-400">• Location</p>}
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate('/profile-settings')}>
                      Complete Profile
                    </Button>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Stats</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-muted/50 text-center">
                      <p className="text-lg font-bold">{stats.totalWatchlistItems}</p>
                      <p className="text-xs text-muted-foreground">Watchlist</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 text-center">
                      <p className="text-lg font-bold">{stats.totalQuoteRequests}</p>
                      <p className="text-xs text-muted-foreground">Quotes</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Access Grid */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Access</CardTitle>
              <CardDescription>Explore marketplace categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { title: 'Robots', desc: `${stats.availableRobots} listed`, icon: Bot, path: '/robots', iconColor: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { title: 'Spare Parts', desc: `${stats.availableParts} in stock`, icon: Package, path: '/parts', iconColor: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { title: 'Services', desc: `${stats.availableServices} providers`, icon: Wrench, path: '/services', iconColor: 'text-violet-400', bg: 'bg-violet-500/10' },
                  { title: 'Financing', desc: 'Loan options', icon: CreditCard, path: '/finance', iconColor: 'text-amber-400', bg: 'bg-amber-500/10' },
                  { title: 'Logistics', desc: 'Shipping', icon: Truck, path: '/logistics', iconColor: 'text-rose-400', bg: 'bg-rose-500/10' },
                  { title: 'RoboBook', desc: 'Knowledge base', icon: Globe, path: '/robobook', iconColor: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button key={item.title} variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 hover:border-primary/40 group" onClick={() => navigate(item.path)}>
                      <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className={`w-5 h-5 ${item.iconColor}`} />
                      </div>
                      <span className="font-medium text-sm">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.desc}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Watchlist */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <WatchlistSection title="Your Watchlist" limit={6} showHeader={true} />
            </div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="w-5 h-5 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-6">
                    <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.slice(0, 5).map((act) => (
                      <div key={act.id} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{act.title}</p>
                          <p className="text-xs text-muted-foreground">{getTimeAgo(act.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ROBOTS TAB */}
        <TabsContent value="robots" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-blue-400" />Available Robots ({recentRobots.length})</CardTitle>
                  <CardDescription>Industrial and service robots from verified sellers</CardDescription>
                </div>
                <Button onClick={() => navigate('/robots')}>View All <ArrowRight className="w-3 h-3 ml-1" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentRobots.length === 0 ? (
                <EmptyState icon={Bot} title="No robots available" description="Check back later for new listings" action={() => navigate('/robots')} actionLabel="Browse Robots" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentRobots.map((robot) => (
                    <Card key={robot.id} className="group hover:border-primary/40 transition-all cursor-pointer" onClick={() => navigate(`/robots/${robot.id}`)}>
                      <CardContent className="p-0">
                        <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center overflow-hidden">
                          {robot.images?.length > 0 ? (
                            <img src={robot.images[0]} alt={robot.name} className="w-full h-full object-contain bg-muted" />
                          ) : (
                            <Bot className="w-10 h-10 text-muted-foreground" />
                          )}
                        </div>
                        <div className="p-4 space-y-2">
                          <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{robot.name}</h3>
                          <p className="text-xs text-muted-foreground">{robot.robot_type}</p>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">{robot.availability}</Badge>
                            <p className="font-bold text-primary">₹{robot.price?.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{robot.location || 'Not specified'}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PARTS TAB */}
        <TabsContent value="parts" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-emerald-400" />Available Parts ({recentParts.length})</CardTitle>
                  <CardDescription>Spare parts and components in stock</CardDescription>
                </div>
                <Button onClick={() => navigate('/parts')}>View All <ArrowRight className="w-3 h-3 ml-1" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentParts.length === 0 ? (
                <EmptyState icon={Package} title="No parts available" description="Check back later" action={() => navigate('/parts')} actionLabel="Browse Parts" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentParts.map((part) => (
                    <Card key={part.id} className="group hover:border-primary/40 transition-all cursor-pointer" onClick={() => navigate(`/parts/${part.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <Package className="w-6 h-6 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{part.name}</h3>
                            <p className="text-xs text-muted-foreground">Part #: {part.part_number || 'N/A'}</p>
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs">Stock: {part.quantity}</Badge>
                              <p className="font-bold text-primary">₹{part.price?.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SERVICES TAB */}
        <TabsContent value="services" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Wrench className="w-5 h-5 text-violet-400" />Available Services ({recentServices.length})</CardTitle>
                  <CardDescription>Professional services from certified providers</CardDescription>
                </div>
                <Button onClick={() => navigate('/services')}>View All <ArrowRight className="w-3 h-3 ml-1" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentServices.length === 0 ? (
                <EmptyState icon={Wrench} title="No services available" description="Check back later" action={() => navigate('/services')} actionLabel="Browse Services" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentServices.map((service) => (
                    <Card key={service.id} className="group hover:border-primary/40 transition-all cursor-pointer" onClick={() => navigate(`/services/${service.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                            <Wrench className="w-6 h-6 text-violet-400" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{service.name}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2">{service.description?.slice(0, 80)}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{service.service_type}</Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" />{service.location || 'Remote'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MY QUOTES TAB */}
        <TabsContent value="quotes" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Send className="w-5 h-5 text-amber-400" />My Quote Requests ({stats.totalQuoteRequests})</CardTitle>
                  <CardDescription>All your submitted quote requests and their status</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/my-requests')}>
                  Full View <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {quoteRequests.length === 0 ? (
                <EmptyState icon={Send} title="No quote requests" description="Request quotes from product listings" action={() => navigate('/robots')} actionLabel="Browse & Request" />
              ) : (
                <div className="space-y-3">
                  {quoteRequests.map((q: any) => (
                    <div key={q.id} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{q.item_name || q.product_name || 'Item Request'}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">{q.category || q.request_type || 'General'}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{new Date(q.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs ${getStatusColor(q.status)}`}>
                        {q.status || 'New'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* QUOTATIONS TAB */}
        <TabsContent value="quotations" className="mt-6">
          <BuyerQuotationsView />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Reusable empty state component
const EmptyState = ({ icon: Icon, title, description, action, actionLabel }: { icon: any; title: string; description: string; action: () => void; actionLabel: string }) => (
  <div className="text-center py-12">
    <Icon className="w-14 h-14 text-muted-foreground mx-auto mb-3 opacity-50" />
    <h3 className="text-lg font-semibold mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground mb-4">{description}</p>
    <Button variant="outline" onClick={action}>{actionLabel}</Button>
  </div>
);

export default BuyerDashboard;
