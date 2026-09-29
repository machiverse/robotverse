import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { OemDot, OemRail } from "@/components/oem/OemAccents";
import { useDebouncedUrlParam, useUrlParam } from "@/hooks/useUrlState";
import {
  Bot,
  Check,
  Eye,
  Grid,
  List,
  Mail,
  MoveHorizontal,
  Search,
  SlidersHorizontal,
  Users,
  Wrench,
} from "lucide-react";
import DirectoryItemDialog from "./DirectoryItemDialog";
import ItemImage from "./ItemImage";
import { enquiryMailto, mailto, type CatalogItem, type CatalogKind, type PhotoMap } from "./directoryTypes";

const PAGE_SIZE = 24;
const ALL = "all";

type Range = { value: string; label: string; min: number; max: number };

const PAYLOAD_RANGES: Range[] = [
  { value: "0-5", label: "Up to 5 kg", min: 0, max: 5 },
  { value: "5-20", label: "5 – 20 kg", min: 5, max: 20 },
  { value: "20-50", label: "20 – 50 kg", min: 20, max: 50 },
  { value: "50-150", label: "50 – 150 kg", min: 50, max: 150 },
  { value: "150-500", label: "150 – 500 kg", min: 150, max: 500 },
  { value: "500+", label: "Over 500 kg", min: 500, max: Infinity },
];

const REACH_RANGES: Range[] = [
  { value: "0-500", label: "Up to 500 mm", min: 0, max: 500 },
  { value: "500-1000", label: "500 – 1,000 mm", min: 500, max: 1000 },
  { value: "1000-2000", label: "1,000 – 2,000 mm", min: 1000, max: 2000 },
  { value: "2000-3000", label: "2,000 – 3,000 mm", min: 2000, max: 3000 },
  { value: "3000+", label: "Over 3,000 mm", min: 3000, max: Infinity },
];

const WEIGHT_RANGES: Range[] = [
  { value: "0-2", label: "Up to 2 kg", min: 0, max: 2 },
  { value: "2-10", label: "2 – 10 kg", min: 2, max: 10 },
  { value: "10+", label: "Over 10 kg", min: 10, max: Infinity },
];

const CONFIG: Record<
  CatalogKind,
  { title: string; short: string; noun: string; icon: typeof Bot; typeLabel: string; reachLabel: string }
> = {
  robots: { title: "Industrial Robots", short: "Robots", noun: "robots", icon: Bot, typeLabel: "Robot Type", reachLabel: "Reach" },
  tools: { title: "End-of-Arm Tools", short: "Tools", noun: "tools", icon: Wrench, typeLabel: "Tool Category", reachLabel: "Reach" },
  axes: { title: "External Axes", short: "Axes", noun: "external axes", icon: MoveHorizontal, typeLabel: "Axis Category", reachLabel: "Stroke" },
};

// URL keys used by the filters, so a filtered view can be shared as a link.
const FILTER_KEYS = ["q", "type", "brand", "payload", "reach", "weight", "app", "cobot"] as const;

const fetchCatalog = async (kind: CatalogKind): Promise<CatalogItem[]> => {
  const res = await fetch(`/directory/${kind}.json`);
  if (!res.ok) throw new Error(`Failed to load ${kind}`);
  return res.json();
};

type PhotoRow = { catalog_id: string; image_url: string | null; thumb_url: string | null; source_page_url: string | null };

/** Real photos: harvested rows stored in our database, plus any listed in photos.json. */
const fetchPhotos = async (kind: CatalogKind): Promise<PhotoMap> => {
  const map: PhotoMap = {};
  try {
    const res = await fetch("/directory/photos.json");
    const json = res.ok ? ((await res.json()) as Record<string, string>) : {};
    for (const [id, url] of Object.entries(json)) if (typeof url === "string") map[id] = { img: url };
  } catch {
    /* no static photos */
  }
  // The table is new; until it exists (or on any error) the renders are shown.
  // Not in the generated types until Lovable regenerates them after the migration.
  type Query = {
    select: (c: string) => Query;
    eq: (col: string, v: string) => Query;
    in: (col: string, v: string[]) => Query;
    limit: (n: number) => Promise<{ data: unknown[] | null }>;
  };
  const table = (supabase as unknown as { from: (t: string) => Query }).from("directory_robot_images");
  const { data } = await table
    .select("catalog_id, image_url, thumb_url, source_page_url")
    .eq("kind", kind)
    .in("status", ["found", "manual"])
    .limit(5000);
  for (const r of (data ?? []) as unknown as PhotoRow[]) {
    if (r.image_url) map[r.catalog_id] = { img: r.image_url, sm: r.thumb_url ?? undefined, page: r.source_page_url };
  }
  return map;
};

const inRange = (v: number | undefined, ranges: Range[], key: string) => {
  if (key === ALL) return true;
  const r = ranges.find((x) => x.value === key);
  return !r || (v !== undefined && v >= r.min && v < r.max);
};

const num = (v: number | undefined) => (v === undefined ? "—" : v.toLocaleString("en-IN"));

const requestMailto = (noun: string) =>
  mailto(
    `Can't find the right ${noun} – RobotVerse Directory`,
    `Hello RobotVerse team,\n\nI'm looking for:\n(type, payload, reach, brand, quantity)\n\nName:\nCompany:\nPhone:\n\nThank you.`,
  );

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
  withDot?: boolean;
}

const FilterSelect = ({ label, value, onChange, allLabel, options, withDot }: FilterSelectProps) => (
  <div>
    <p className="mb-1 text-xs font-semibold">{label}</p>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full" aria-label={label}>
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="flex items-center gap-2">
              {withDot && <OemDot brand={o.label} />}
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const DirectoryCatalog = ({ kind }: { kind: CatalogKind }) => {
  const cfg = CONFIG[kind];
  const Icon = cfg.icon;
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["directory", kind],
    queryFn: () => fetchCatalog(kind),
    staleTime: Infinity,
  });
  const { data: photos = {} } = useQuery({
    queryKey: ["directory", "photos", kind],
    queryFn: () => fetchPhotos(kind),
    staleTime: 10 * 60 * 1000,
  });

  const [, setSearchParams] = useSearchParams();
  const [query, setQuery] = useDebouncedUrlParam("q", "");
  const [type, setType] = useUrlParam<string>("type", ALL);
  const [brand, setBrand] = useUrlParam<string>("brand", ALL);
  const [payload, setPayload] = useUrlParam<string>("payload", ALL);
  const [reach, setReach] = useUrlParam<string>("reach", ALL);
  const [weight, setWeight] = useUrlParam<string>("weight", ALL);
  const [app, setApp] = useUrlParam<string>("app", ALL);
  const [cobot, setCobot] = useUrlParam<string>("cobot", "");
  const [sort, setSort] = useUrlParam<string>("sort", "brand");
  const [view, setView] = useUrlParam<"grid" | "list">("view", "grid");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<CatalogItem | null>(null);

  const cobotOnly = cobot === "1";
  const typeOf = (i: CatalogItem) => i.t ?? i.c ?? "";

  const brands = useMemo(() => Array.from(new Set(data.map((i) => i.b))).sort((a, b) => a.localeCompare(b)), [data]);
  const types = useMemo(() => Array.from(new Set(data.map((i) => i.t ?? i.c ?? "").filter(Boolean))).sort(), [data]);
  const apps = useMemo(() => Array.from(new Set(data.flatMap((i) => i.ap ?? []))).sort(), [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = data.filter((i) => {
      if (brand !== ALL && i.b !== brand) return false;
      if (type !== ALL && (i.t ?? i.c) !== type) return false;
      if (app !== ALL && !i.ap?.includes(app)) return false;
      if (!inRange(i.p, PAYLOAD_RANGES, payload)) return false;
      if (!inRange(i.r, REACH_RANGES, reach)) return false;
      if (!inRange(i.w, WEIGHT_RANGES, weight)) return false;
      if (cobotOnly && !i.ap?.includes("Collaborative")) return false;
      if (!q) return true;
      return `${i.id} ${i.n} ${i.b} ${i.t ?? i.c ?? ""} ${(i.ap || []).join(" ")}`.toLowerCase().includes(q);
    });
    const by = (f: (i: CatalogItem) => number | undefined) => (a: CatalogItem, b: CatalogItem) =>
      (f(b) ?? -Infinity) - (f(a) ?? -Infinity);
    if (sort === "payload") out.sort(by((i) => i.p));
    if (sort === "reach") out.sort(by((i) => i.r));
    if (sort === "weight") out.sort(by((i) => i.w));
    if (sort === "name") out.sort((a, b) => a.n.localeCompare(b.n));
    return out;
  }, [data, query, brand, type, app, payload, reach, weight, cobotOnly, sort]);

  // Reset paging whenever the result set changes
  const resultKey = `${query}|${brand}|${type}|${app}|${payload}|${reach}|${weight}|${cobot}|${sort}`;
  const [lastKey, setLastKey] = useState(resultKey);
  if (lastKey !== resultKey) {
    setLastKey(resultKey);
    setVisible(PAGE_SIZE);
  }

  const clearAll = () => {
    setQuery("");
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        FILTER_KEYS.forEach((k) => next.delete(k));
        return next;
      },
      { replace: true },
    );
  };

  const rangeLabel = (ranges: Range[], v: string) => ranges.find((r) => r.value === v)?.label ?? v;
  const active: { label: string; clear: () => void }[] = [
    query && { label: `Search: ${query}`, clear: () => setQuery("") },
    type !== ALL && { label: type, clear: () => setType(ALL) },
    brand !== ALL && { label: brand, clear: () => setBrand(ALL) },
    payload !== ALL && { label: `Payload ${rangeLabel(PAYLOAD_RANGES, payload)}`, clear: () => setPayload(ALL) },
    reach !== ALL && { label: `${cfg.reachLabel} ${rangeLabel(REACH_RANGES, reach)}`, clear: () => setReach(ALL) },
    weight !== ALL && { label: `Weight ${rangeLabel(WEIGHT_RANGES, weight)}`, clear: () => setWeight(ALL) },
    app !== ALL && { label: app, clear: () => setApp(ALL) },
    cobotOnly && { label: "Cobots only", clear: () => setCobot("") },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  const cobotCount = useMemo(() => data.filter((i) => i.ap?.includes("Collaborative")).length, [data]);

  const filterPanel = (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={`Search ${cfg.noun}...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          aria-label={`Search ${cfg.noun}`}
        />
      </div>
      <FilterSelect
        label={cfg.typeLabel}
        value={type}
        onChange={setType}
        allLabel={`All ${cfg.typeLabel === "Robot Type" ? "Robot Types" : "Categories"}`}
        options={types.map((t) => ({ value: t, label: t }))}
      />
      <FilterSelect
        label="Manufacturer"
        value={brand}
        onChange={setBrand}
        allLabel={`All Manufacturers (${brands.length})`}
        options={brands.map((b) => ({ value: b, label: b }))}
        withDot
      />
      {kind !== "tools" && (
        <>
          <FilterSelect
            label="Payload Range (kg)"
            value={payload}
            onChange={setPayload}
            allLabel="All Payloads"
            options={PAYLOAD_RANGES}
          />
          <FilterSelect
            label={`${cfg.reachLabel} Range (mm)`}
            value={reach}
            onChange={setReach}
            allLabel={`All ${cfg.reachLabel === "Reach" ? "Reaches" : "Strokes"}`}
            options={REACH_RANGES}
          />
        </>
      )}
      {kind === "tools" && (
        <FilterSelect label="Tool Weight" value={weight} onChange={setWeight} allLabel="All Weights" options={WEIGHT_RANGES} />
      )}
      {apps.length > 0 && (
        <FilterSelect
          label="Application"
          value={app}
          onChange={setApp}
          allLabel="All Applications"
          options={apps.map((a) => ({ value: a, label: a }))}
        />
      )}
      {kind === "robots" && (
        <div className="border-t pt-2">
          <button
            type="button"
            onClick={() => setCobot(cobotOnly ? "" : "1")}
            aria-pressed={cobotOnly}
            className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
              cobotOnly ? "border-primary/30 bg-primary/10 text-primary" : "border-input hover:bg-muted/50"
            }`}
          >
            <span className="flex items-center gap-2 text-left">
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border bg-background">
                {cobotOnly && <Check className="h-3 w-3" />}
              </span>
              Cobots only
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {cobotCount}
            </Badge>
          </button>
        </div>
      )}
    </div>
  );

  const activeFilters = active.length > 0 && (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-primary">Active Filters</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={clearAll}
          >
            Clear All
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {active.map((f) => (
            <Badge key={f.label} variant="secondary" className="text-xs">
              {f.label}
              <button className="ml-1.5 hover:text-destructive" onClick={f.clear} aria-label={`Remove ${f.label}`}>
                ×
              </button>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const actions = (item: CatalogItem) => (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setSelected(item);
        }}
      >
        <Eye className="mr-1 h-3 w-3" />
        Details
      </Button>
      <Button variant="outline" size="sm" asChild onClick={(e) => e.stopPropagation()}>
        <a href={enquiryMailto(item)}>
          <Mail className="mr-1 h-3 w-3" />
          Enquire
        </a>
      </Button>
    </div>
  );

  const unit = (v: number | undefined, u: string) => (v === undefined ? "—" : `${num(v)} ${u}`);
  const specs = (item: CatalogItem) =>
    kind === "tools"
      ? [
          { v: num(item.a), l: "Moving axes" },
          { v: unit(item.w, "kg"), l: "Weight" },
        ]
      : [
          { v: unit(item.p, "kg"), l: "Payload" },
          { v: unit(item.r, "mm"), l: cfg.reachLabel },
          { v: num(item.a), l: "Axes" },
          { v: item.e === undefined ? "—" : `±${item.e} mm`, l: "Repeatability" },
        ];

  const open = (item: CatalogItem) => setSelected(item);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* LEFT FILTER COLUMN (sticky) */}
      <aside className="hidden w-72 flex-shrink-0 lg:block">
        <div className="sticky top-20 space-y-4">
          {activeFilters}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-4 w-4" />
                Filter {cfg.short}
              </CardTitle>
            </CardHeader>
            <CardContent>{filterPanel}</CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 text-center">
              <p className="mb-1 text-sm font-semibold">Can't find what you need?</p>
              <p className="mb-3 text-xs text-muted-foreground">Send your requirement and we'll connect you with sellers.</p>
              <Button size="sm" className="w-full" asChild>
                <a href={requestMailto(cfg.noun)}>
                  <Mail className="mr-1 h-3 w-3" /> Send Requirement
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </aside>

      {/* RIGHT CONTENT COLUMN */}
      <div className="w-full min-w-0 flex-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon className="h-5 w-5" />
              {cfg.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mobile: search + filters sheet */}
            <div className="flex gap-2 lg:hidden">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={`Search ${cfg.noun}...`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                  aria-label={`Search ${cfg.noun}`}
                />
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="shrink-0">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Filters{active.length > 0 && ` (${active.length})`}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto">
                  <SheetHeader className="mb-4">
                    <SheetTitle>Filter {cfg.short}</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4">
                    {activeFilters}
                    {filterPanel}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground" aria-live="polite">
                {isLoading ? (
                  "Loading…"
                ) : (
                  <>
                    Showing <span className="font-semibold text-foreground">{filtered.length.toLocaleString("en-IN")}</span>{" "}
                    of {data.length.toLocaleString("en-IN")} {cfg.noun}
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">Sort by</span>
                  <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger className="w-44" aria-label="Sort by">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brand">Manufacturer A-Z</SelectItem>
                      <SelectItem value="name">Name A-Z</SelectItem>
                      {kind !== "tools" && <SelectItem value="payload">Payload High to Low</SelectItem>}
                      {kind !== "tools" && <SelectItem value="reach">{cfg.reachLabel} High to Low</SelectItem>}
                      <SelectItem value="weight">Weight High to Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant={view === "grid" ? "default" : "outline"}
                    onClick={() => setView("grid")}
                    aria-label="Grid view"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={view === "list" ? "default" : "outline"}
                    onClick={() => setView("list")}
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isError ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Icon className="mb-4 h-16 w-16 text-muted-foreground" />
            <p className="mb-4 text-lg font-semibold">Couldn't load the {cfg.noun} list.</p>
            <Button onClick={() => refetch()}>Try again</Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Icon className="mb-4 h-16 w-16 text-muted-foreground" />
            <p className="mb-2 text-lg font-semibold">No {cfg.noun} match the current filters.</p>
            <p className="mb-4 text-muted-foreground">Try clearing some filters or changing the search text.</p>
            <Button onClick={clearAll}>Clear Filters</Button>
          </div>
        ) : (
          <>
            {view === "grid" ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.slice(0, visible).map((item) => (
                  <Card
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => open(item)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && open(item)}
                    className="group relative cursor-pointer overflow-hidden border border-border shadow-none transition-colors duration-150 hover:border-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <OemRail brand={item.b} />
                    <div className="relative aspect-[4/3] overflow-hidden border-b border-border">
                      <ItemImage kind={kind} item={item} photo={photos[item.id]} />
                      <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                        {typeOf(item) && (
                          <Badge variant="secondary" className="text-xs">
                            {typeOf(item)}
                          </Badge>
                        )}
                        {item.ap?.includes("Collaborative") && (
                          <Badge className="gap-1 text-[10px]">
                            <Users className="h-3 w-3" />
                            Cobot
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="absolute right-2 top-2 bg-card/90 font-mono text-[10px]">
                        {item.id}
                      </Badge>
                    </div>
                    <CardContent className="space-y-3 p-4">
                      <div>
                        <h3 className="mb-1 line-clamp-2 text-sm font-bold transition-colors group-hover:text-primary">{item.n}</h3>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground line-clamp-1">
                          <OemDot brand={item.b} />
                          {item.b}
                          <span> · {item.m}</span>
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        {specs(item).map((s) => (
                          <div key={s.l}>
                            <p className="tabular font-medium text-foreground">{s.v}</p>
                            <p>{s.l}</p>
                          </div>
                        ))}
                      </div>
                      {item.ap && item.ap.length > 0 && (
                        <p className="border-t pt-2 text-xs text-muted-foreground line-clamp-1">{item.ap.join(" · ")}</p>
                      )}
                      {actions(item)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.slice(0, visible).map((item) => (
                  <Card
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => open(item)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && open(item)}
                    className="group relative flex cursor-pointer overflow-hidden border border-border shadow-none transition-colors duration-150 hover:border-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <OemRail brand={item.b} />
                    <div className="aspect-square w-32 flex-shrink-0 border-r border-border sm:w-40">
                      <ItemImage kind={kind} item={item} photo={photos[item.id]} />
                    </div>
                    <CardContent className="flex flex-1 flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {item.id}
                          </Badge>
                          {typeOf(item) && (
                            <Badge variant="secondary" className="text-[10px]">
                              {typeOf(item)}
                            </Badge>
                          )}
                          {item.ap?.includes("Collaborative") && <Badge className="text-[10px]">Cobot</Badge>}
                        </div>
                        <h3 className="line-clamp-1 text-base font-semibold group-hover:text-primary">{item.n}</h3>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <OemDot brand={item.b} />
                          {item.b} · {item.m}
                        </p>
                        <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          {specs(item).map((s) => (
                            <span key={s.l}>
                              {s.l}: <span className="tabular font-medium text-foreground">{s.v}</span>
                            </span>
                          ))}
                        </p>
                      </div>
                      <div className="w-full shrink-0 sm:w-56">{actions(item)}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {visible < filtered.length && (
              <div className="text-center">
                <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Load more ({(filtered.length - visible).toLocaleString("en-IN")} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <DirectoryItemDialog
        kind={kind}
        item={selected}
        photo={selected ? photos[selected.id] : undefined}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
};

export default DirectoryCatalog;
