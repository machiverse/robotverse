import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import BackButton from "@/components/navigation/BackButton";
import { UniversalSEOHead } from "@/components/SEO/UniversalSEOHead";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Wrench, Factory, GraduationCap, Search, Mail, Building2, MapPin, MonitorPlay, X } from "lucide-react";
import DirectoryEnquiryDialog from "@/components/directory/DirectoryEnquiryDialog";
import {
  DIRECTORY_ITEMS,
  DIRECTORY_SECTIONS,
  type DirectoryItem,
  type DirectorySection,
} from "@/data/directoryData";

const SECTION_ICONS: Record<DirectorySection, React.ElementType> = {
  "robot-types": Bot,
  tools: Wrench,
  oems: Factory,
  training: GraduationCap,
};

const isSection = (v: string | null): v is DirectorySection =>
  !!v && DIRECTORY_SECTIONS.some((s) => s.id === v);

const Directory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionParam = searchParams.get("type");
  const section: DirectorySection = isSection(sectionParam) ? sectionParam : "robot-types";

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquiryItem, setEnquiryItem] = useState<DirectoryItem | null>(null);
  const [enquiryInterest, setEnquiryInterest] = useState<string | undefined>();

  const items = DIRECTORY_ITEMS[section];

  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category))).sort(), [items]);
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((i) => i.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([t]) => t);
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (category && i.category !== category) return false;
      if (tag && !i.tags.includes(tag)) return false;
      if (!q) return true;
      const haystack = [i.name, i.category, i.description, i.country, i.location, ...i.tags, ...(i.brands || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query, category, tag]);

  const changeSection = (value: string) => {
    setCategory(null);
    setTag(null);
    setSearchParams(value === "robot-types" ? {} : { type: value }, { replace: true });
  };

  const openEnquiry = (item: DirectoryItem | null, interest?: string) => {
    setEnquiryItem(item);
    setEnquiryInterest(interest);
    setEnquiryOpen(true);
  };

  const activeSection = DIRECTORY_SECTIONS.find((s) => s.id === section)!;
  const hasFilters = !!(query || category || tag);

  return (
    <div className="min-h-screen bg-background">
      <UniversalSEOHead
        title="Robotics Directory | Robot Types, Tools, OEMs & Training | RobotVerse"
        description="Browse industrial robot types, end-of-arm tools, robot OEM brands and robotics training programs. Send an enquiry and the RobotVerse team connects you with the right partner."
        keywords={[
          "robotics directory India",
          "industrial robot types",
          "robot grippers and tools",
          "robot OEM manufacturers",
          "robot programming training",
          "FANUC ABB KUKA Yaskawa training",
          "cobot directory",
          "robot integrator directory",
        ]}
        canonicalUrl="https://robotverse.in/directory"
      />
      <EnhancedHeader />
      <BackButton fallbackPath="/" label="Back" />

      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Robotics Directory</h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Explore robot types, tools & equipment, OEM brands and training programs — then tell us what you need and
            we'll connect you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Button onClick={() => openEnquiry(null)}>
              <Mail className="h-4 w-4 mr-2" />
              Send an enquiry
            </Button>
            <Button variant="outline" onClick={() => openEnquiry(null, "List my company / institute")}>
              <Building2 className="h-4 w-4 mr-2" />
              List your company or institute
            </Button>
          </div>
        </section>

        {/* Section tabs */}
        <Tabs value={section} onValueChange={changeSection} className="mb-6">
          <TabsList className="w-full h-auto flex flex-wrap justify-center gap-1 p-1">
            {DIRECTORY_SECTIONS.map((s) => {
              const Icon = SECTION_ICONS[s.id];
              return (
                <TabsTrigger key={s.id} value={s.id} className="flex items-center gap-2 px-4 py-2">
                  <Icon className="h-4 w-4" />
                  {s.label}
                  <span className="text-xs text-muted-foreground">({DIRECTORY_ITEMS[s.id].length})</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* Filters */}
          <aside className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${activeSection.label.toLowerCase()}...`}
                className="pl-9"
                aria-label="Search directory"
              />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">Category</h2>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <Badge
                    key={c}
                    variant={category === c ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setCategory(category === c ? null : c)}
                  >
                    {c}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">Application / Focus</h2>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Badge
                    key={t}
                    variant={tag === t ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => setTag(tag === t ? null : t)}
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setCategory(null);
                  setTag(null);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Clear filters
              </Button>
            )}
          </aside>

          {/* Results */}
          <section aria-live="polite">
            <p className="text-sm text-muted-foreground mb-4">
              {filtered.length} {filtered.length === 1 ? "result" : "results"} in {activeSection.label}
            </p>

            {filtered.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">Nothing matches those filters yet.</p>
                <Button onClick={() => openEnquiry(null)}>Ask our team instead</Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((item) => (
                  <DirectoryCard key={item.id} item={item} onEnquire={() => openEnquiry(item)} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Bottom CTA */}
        <section className="mt-12 rounded-2xl border border-border bg-primary/5 p-6 md:p-8 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">Are you an OEM, integrator or training institute?</h2>
          <p className="text-muted-foreground mb-5 max-w-2xl mx-auto">
            Get listed in the RobotVerse Directory and receive enquiries from buyers, plants and students across India.
          </p>
          <Button onClick={() => openEnquiry(null, "List my company / institute")}>
            <Building2 className="h-4 w-4 mr-2" />
            Request a listing
          </Button>
        </section>
      </main>

      <Footer />

      <DirectoryEnquiryDialog
        open={enquiryOpen}
        onOpenChange={setEnquiryOpen}
        item={enquiryItem}
        defaultInterest={enquiryInterest}
      />
    </div>
  );
};

const DirectoryCard = ({ item, onEnquire }: { item: DirectoryItem; onEnquire: () => void }) => {
  const Icon = SECTION_ICONS[item.section];
  return (
    <Card className="flex flex-col h-full hover:border-primary/40 hover:shadow-md transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base leading-snug">{item.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.category}
              {item.country && ` · ${item.country}`}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 pb-3">
        <p className="text-sm text-muted-foreground">{item.description}</p>

        {item.specs && item.specs.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {item.specs.map((s) => (
              <div key={s.label} className="contents">
                <dt className="text-muted-foreground">{s.label}</dt>
                <dd className="font-medium text-foreground">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {(item.mode || item.location) && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {item.mode && (
              <span className="flex items-center gap-1">
                <MonitorPlay className="h-3.5 w-3.5" />
                {item.mode}
              </span>
            )}
            {item.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {item.location}
              </span>
            )}
          </div>
        )}

        {item.brands && item.brands.length > 0 && (
          <p className="text-xs">
            <span className="text-muted-foreground">Brands: </span>
            <span className="text-foreground">{item.brands.join(", ")}</span>
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {item.tags.slice(0, 4).map((t) => (
            <Badge key={t} variant="secondary" className="text-[11px] font-normal">
              {t}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="outline" className="w-full" onClick={onEnquire}>
          <Mail className="h-4 w-4 mr-2" />
          I'm interested
        </Button>
      </CardFooter>
    </Card>
  );
};

export default Directory;
