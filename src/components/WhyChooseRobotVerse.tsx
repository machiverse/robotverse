import { useState, useEffect } from "react";
import { 
  Shield, 
  CheckCircle, 
  Brain, 
  MapPin,
  Users,
  Star,
  Clock,
  TrendingUp,
  Activity,
  Loader2,
  RefreshCw,
  Cpu,
  Zap,
  HeartHandshake,
  Truck,
  Package,
  Wrench,
  GraduationCap,
  CreditCard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CornerMarks, PixelDot } from "@/components/hero/HeroConsole";
import { BevelBox, ConsoleButton, SectionHead, pad2 } from "@/components/console/ConsoleUI";

interface RealStatsData {
  totalUsers: number;
  verifiedUsers: number;
  activeListings: number;
  robotCategories: number;
  serviceProviders: number;
  citiesCovered: number;
  customerSatisfaction: number;
  lastUpdated: string;
}

const WhyChooseRobotVerse = () => {
  const [realStats, setRealStats] = useState<RealStatsData>({
    totalUsers: 0,
    verifiedUsers: 0,
    activeListings: 0,
    robotCategories: 0,
    serviceProviders: 0,
    citiesCovered: 0,
    customerSatisfaction: 0,
    lastUpdated: ''
  });
  
  const [loading, setLoading] = useState(true);

  const fetchRealData = async () => {
    try {
      const [
        totalProfilesResult,
        profilesResult,
        robotsResult,
        servicesResult,
        sparePartsResult
      ] = await Promise.allSettled([
        supabase.rpc('get_total_profiles_count'),
        supabase.from('profiles').select('user_type, full_name, email, phone, company_name'),
        supabase.from('robots').select('availability, robot_type, location').eq('availability', 'available'),
        supabase.from('services').select('service_type, location'),
        supabase.from('spare_parts').select('quantity').gt('quantity', 0)
      ]);

      const totalUsers = totalProfilesResult.status === 'fulfilled' ? totalProfilesResult.value.data || 0 : 0;
      const profiles = profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : [];
      const robots = robotsResult.status === 'fulfilled' ? robotsResult.value.data || [] : [];
      const services = servicesResult.status === 'fulfilled' ? servicesResult.value.data || [] : [];
      const spareParts = sparePartsResult.status === 'fulfilled' ? sparePartsResult.value.data || [] : [];

      // Use the total count from the database function
      const verifiedUsers = profiles.filter(p => 
        p.full_name && p.email && (p.phone || p.company_name)
      ).length;
      
      const activeListings = robots.length + spareParts.length;
      const robotTypes = new Set(robots.map(r => r.robot_type).filter(Boolean));
      const robotCategories = robotTypes.size;
      const serviceProviders = profiles.filter(p => p.user_type === 'service_provider').length + services.length;
      
      // Fetch unique cities from profiles table - apply same logic as CitiesCoveredMap
      // Only count cities that resolve to known India coordinates
      const KNOWN_CITIES = new Set([
        'bangalore','chennai','mumbai','delhi','pune','hyderabad','ahmedabad','coimbatore',
        'kolkata','jaipur','lucknow','chandigarh','noida','gurgaon','ghaziabad','indore',
        'nagpur','rajkot','vadodara','surat','nashik','madurai','salem','pondicherry',
        'mohali','jalandhar','dharwad','krishnagiri','kumbakonam','mayiladuthurai',
        'bhavnagar','burdwan','auroville','visakhapatnam','thiruvananthapuram','kochi',
        'bhopal','patna','ranchi','ludhiana','agra','varanasi','mangalore','mysore',
        'tiruchirappalli','erode','hosur'
      ]);
      const ALIASES: Record<string, string> = {
        bengaluru:'bangalore','delhi ncr':'delhi','new delhi':'delhi',gujarat:'ahmedabad',
        maharashtra:'mumbai','pune india':'pune',peenya:'bangalore','j.p. nagar':'bangalore',
        pomdy:'pondicherry',pondy:'pondicherry',puducherry:'pondicherry',pudicherry:'pondicherry',
        'kurali, punjab':'mohali','jalandhar punjab':'jalandhar','rajkot , gujarat':'rajkot',
        'chengalpattu dist':'chennai','uttar pradesh':'noida','madhya pradesh':'indore',
        haryana:'gurgaon',kerala:'kochi','gurgaon & china':'gurgaon',india:'delhi',
        'malegaon, nashik, maharashtra, ind':'nashik',trichy:'tiruchirappalli'
      };
      const { data: profileCities } = await supabase
        .from('profiles')
        .select('city, location')
        .eq('registration_complete', true);
      
      const resolvedCities = new Set<string>();
      for (const row of profileCities || []) {
        let key: string | null = null;
        if (row.city && row.city.trim()) {
          key = row.city.trim().toLowerCase();
        } else if (row.location) {
          key = row.location.trim().toLowerCase();
        }
        if (!key) continue;
        // resolve alias
        const canonical = ALIASES[key] || key;
        if (KNOWN_CITIES.has(canonical)) {
          resolvedCities.add(canonical);
        } else {
          // substring match
          for (const city of KNOWN_CITIES) {
            if (key.includes(city)) { resolvedCities.add(city); break; }
          }
        }
      }
      const citiesCovered = resolvedCities.size;
      const customerSatisfaction = totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0;

      setRealStats({
        totalUsers,
        verifiedUsers,
        activeListings,
        robotCategories,
        serviceProviders,
        citiesCovered,
        customerSatisfaction,
        lastUpdated: new Date().toLocaleTimeString()
      });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealData();
    const interval = setInterval(fetchRealData, 60000);
    return () => clearInterval(interval);
  }, []);

  const keyFeatures = [
    {
      icon: Package,
      title: "One-Stop Platform",
      description: "Purchase robots, spare parts, get services, arrange logistics, and secure financing - all from a single trusted marketplace.",
      gradient: "from-primary to-primary"
    },
    {
      icon: Shield,
      title: "Verified Sellers & Partners",
      description: "Every seller, service provider, logistics partner, and financier is thoroughly verified for your peace of mind.",
      gradient: "from-success to-success"
    },
    {
      icon: Cpu,
      title: "Smart AI Matching",
      description: "Our AI connects you with the perfect robot, the right spare parts, and the best service providers for your needs.",
      gradient: "from-primary to-primary"
    },
    {
      icon: Zap,
      title: "Fast & Seamless",
      description: "From browsing to delivery and installation - experience a streamlined buying journey with real-time tracking.",
      gradient: "from-yellow-500 to-orange-600"
    }
  ];

  const services = [
    {
      icon: Wrench,
      title: "Installation & Maintenance",
      description: "Professional setup, 24/7 support & AMC"
    },
    {
      icon: Truck,
      title: "Safe Delivery & Handling",
      description: "Specialized logistics for robots"
    },
    {
      icon: GraduationCap,
      title: "Operator Training",
      description: "Expert training & certification programs"
    },
    {
      icon: CreditCard,
      title: "Easy Financing Options",
      description: "Flexible EMI & loan solutions"
    }
  ];

  const statsCards = [
    {
      icon: Users,
      label: "Trusted Users",
      value: realStats.totalUsers.toString(),
      color: "text-primary"
    },
    {
      icon: CheckCircle,
      label: "Active Listings",
      value: realStats.activeListings.toString(),
      color: "text-success"
    },
    {
      icon: MapPin,
      label: "Cities Covered",
      value: realStats.citiesCovered.toString(),
      color: "text-primary"
    },
    {
      icon: TrendingUp,
      label: "Robot Categories",
      value: realStats.robotCategories.toString(),
      color: "text-orange-600"
    }
  ];

  const ink = "text-[hsl(var(--rv-console-ink))]";
  const inkSoft = "text-[hsl(var(--rv-console-ink)/0.65)]";
  const line = "border-[hsl(var(--rv-console-line))]";

  return (
    <section className="bg-[hsl(var(--rv-console-bg))] p-2.5 md:p-4">
      <div className={`relative border ${line} py-14 md:py-20`}>
        <CornerMarks inset={10} />
        <div className="container mx-auto max-w-6xl px-4 md:px-8">
          <SectionHead
            tone="console"
            index="005"
            label="Why RobotVerse"
            title="Complete end-to-end solution for buyers"
            subtitle="From purchase to delivery, installation, training, maintenance and financing, in one trusted platform."
            action={
              <span className={`inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] ${inkSoft}`}>
                <PixelDot className="text-emerald-400 motion-safe:animate-pulse" />
                {loading ? "Syncing" : `Live · ${realStats.lastUpdated}`}
              </span>
            }
          />

          {/* Live statistics */}
          <div className="mb-14 grid grid-cols-2 gap-px border-y border-[hsl(var(--rv-console-line))] bg-[hsl(var(--rv-console-line))] md:grid-cols-4">
            {statsCards.map((stat, i) => (
              <div key={stat.label} className="bg-[hsl(var(--rv-console-bg))] px-4 py-6 md:px-6">
                <p className={`font-mono text-[10px] uppercase tracking-[0.16em] ${inkSoft}`}>
                  {pad2(i + 1)} / {stat.label}
                </p>
                <p className={`mt-3 font-mono text-4xl tabular-nums tracking-tight md:text-5xl ${ink}`}>
                  {loading ? "—" : Number(stat.value).toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>

          {/* Key features */}
          <div className="mb-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {keyFeatures.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <BevelBox key={feature.title} console className="h-full" innerClassName="flex flex-col p-5 md:p-6">
                  <div className="mb-8 flex items-start justify-between">
                    <span className={`font-mono text-xs tabular-nums ${inkSoft}`}>{pad2(i + 1)}</span>
                    <Icon className={`h-5 w-5 ${ink}`} aria-hidden />
                  </div>
                  <h3 className={`text-base font-semibold uppercase tracking-[-0.01em] ${ink}`}>{feature.title}</h3>
                  <p className={`mt-2 text-sm leading-relaxed ${inkSoft}`}>{feature.description}</p>
                </BevelBox>
              );
            })}
          </div>

          {/* Supporting services as a spec list */}
          <div className="mb-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div>
              <p className={`mb-3 font-mono text-[11px] uppercase tracking-[0.16em] ${inkSoft}`}>Included support</p>
              <h3 className={`text-2xl font-semibold uppercase leading-tight tracking-[-0.02em] md:text-3xl ${ink}`}>
                Supporting services included
              </h3>
            </div>
            <ul className={`border-t ${line}`}>
              {services.map((service, i) => {
                const Icon = service.icon;
                return (
                  <li key={service.title} className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b ${line} py-4`}>
                    <span className={`font-mono text-xs tabular-nums ${inkSoft}`}>{pad2(i + 1)}</span>
                    <span>
                      <span className={`block text-sm font-semibold uppercase tracking-[0.01em] ${ink}`}>{service.title}</span>
                      <span className={`block text-sm ${inkSoft}`}>{service.description}</span>
                    </span>
                    <Icon className={`h-4 w-4 ${inkSoft}`} aria-hidden />
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Call to action */}
          <BevelBox console cut={16} innerClassName="grid gap-8 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-10">
            <div>
              <h3 className={`text-2xl font-semibold uppercase leading-tight tracking-[-0.02em] md:text-4xl ${ink}`}>
                Start your automation journey today
              </h3>
              <p className={`mt-3 max-w-xl ${inkSoft}`}>
                Join {realStats.totalUsers.toLocaleString("en-IN")}+ businesses buying robots with complete end-to-end support.
              </p>
              <dl className={`mt-6 flex flex-wrap gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-[0.14em] ${inkSoft}`}>
                <div>
                  <dt className="inline">Active listings </dt>
                  <dd className={`inline tabular-nums ${ink}`}>{realStats.activeListings}</dd>
                </div>
                <div>
                  <dt className="inline">Verified users </dt>
                  <dd className={`inline tabular-nums ${ink}`}>{realStats.verifiedUsers}</dd>
                </div>
                <div>
                  <dt className="inline">Satisfaction </dt>
                  <dd className={`inline tabular-nums ${ink}`}>{realStats.customerSatisfaction}%</dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ConsoleButton to="/robots" tone="console">Browse robots</ConsoleButton>
              <ConsoleButton to="/auth?type=buyer" tone="console" variant="outline">Register as buyer</ConsoleButton>
            </div>
          </BevelBox>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseRobotVerse;