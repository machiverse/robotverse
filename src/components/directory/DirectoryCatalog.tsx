import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import DirectoryItemDialog from "./DirectoryItemDialog";
import ItemImage from "./ItemImage";
import type { CatalogItem, CatalogKind, PhotoMap } from "./directoryTypes";

const PAGE_SIZE = 24;
const ALL = "__all";

type SortKey = "brand" | "payload" | "reach" | "weight";

const LABELS: Record<CatalogKind, { noun: string; typeLabel: string; allTypes: string; reachLabel: string }> = {
  robots: { noun: "robots", typeLabel: "Robot type", allTypes: "All robot types", reachLabel: "Reach" },
  tools: { noun: "tools", typeLabel: "Tool category", allTypes: "All tool categories", reachLabel: "Reach" },
  axes: { noun: "external axes", typeLabel: "Axis category", allTypes: "All axis categories", reachLabel: "Stroke" },
};

const fetchCatalog = async (kind: CatalogKind): Promise<CatalogItem[]> => {
  const res = await fetch(`/directory/${kind}.json`);
  if (!res.ok) throw new Error(`Failed to load ${kind}`);
  return res.json();
};

const fetchPhotos = async (): Promise<PhotoMap> => {
  const res = await fetch("/directory/photos.json");
  return res.ok ? res.json() : {};
};

const fmt = (v: number | undefined, unit: string) => (v === undefined ? "—" : `${v.toLocaleString("en-IN")} ${unit}`);

const DirectoryCatalog = ({ kind }: { kind: CatalogKind }) => {
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["directory", kind],
    queryFn: () => fetchCatalog(kind),
    staleTime: Infinity,
  });

  const { data: photos = {} } = useQuery({ queryKey: ["directory", "photos"], queryFn: fetchPhotos, staleTime: Infinity });

  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [minPayload, setMinPayload] = useState("");
  const [minReach, setMinReach] = useState("");
  const [cobotOnly, setCobotOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("brand");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<CatalogItem | null>(null);

  const labels = LABELS[kind];
  const typeOf = (i: CatalogItem) => i.t ?? i.c ?? "";

  const brands = useMemo(() => Array.from(new Set(data.map((i) => i.b))).sort((a, b) => a.localeCompare(b)), [data]);
  const types = useMemo(() => Array.from(new Set(data.map(typeOf).filter(Boolean))).sort(), [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const minP = parseFloat(minPayload);
    const minR = parseFloat(minReach);
    const out = data.filter((i) => {
      if (brand !== ALL && i.b !== brand) return false;
      if (type !== ALL && typeOf(i) !== type) return false;
      if (!Number.isNaN(minP) && (i.p ?? -1) < minP) return false;
      if (!Number.isNaN(minR) && (i.r ?? -1) < minR) return false;
      if (cobotOnly && !i.ap?.includes("Collaborative")) return false;
      if (!q) return true;
      return `${i.id} ${i.n} ${i.b} ${typeOf(i)} ${(i.ap || []).join(" ")}`.toLowerCase().includes(q);
    });
    const num = (v?: number) => v ?? -Infinity;
    if (sort === "payload") out.sort((a, b) => num(b.p) - num(a.p));
    if (sort === "reach") out.sort((a, b) => num(b.r) - num(a.r));
    if (sort === "weight") out.sort((a, b) => num(b.w) - num(a.w));
    return out;
  }, [data, query, brand, type, minPayload, minReach, cobotOnly, sort]);

  useEffect(() => setVisible(PAGE_SIZE), [query, brand, type, minPayload, minReach, cobotOnly, sort]);

  const hasFilters = query || brand !== ALL || type !== ALL || minPayload || minReach || cobotOnly;
  const reset = () => {
    setQuery("");
    setBrand(ALL);
    setType(ALL);
    setMinPayload("");
    setMinReach("");
    setCobotOnly(false);
  };

  if (isError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-4">Couldn't load the {labels.noun} list.</p>
        <Button onClick={() => refetch()}>Try again</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${labels.noun} by name, brand, application or RV ID`}
              className="pl-9"
              aria-label={`Search ${labels.noun}`}
            />
          </div>
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger aria-label="Brand">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ALL}>All brands ({brands.length})</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger aria-label={labels.typeLabel}>
              <SelectValue placeholder={labels.typeLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{labels.allTypes}</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {kind !== "tools" && (
            <>
              <div className="w-36">
                <Label htmlFor={`${kind}-payload`} className="text-xs text-muted-foreground">
                  Min payload (kg)
                </Label>
                <Input id={`${kind}-payload`} type="number" min={0} value={minPayload} onChange={(e) => setMinPayload(e.target.value)} />
              </div>
              <div className="w-36">
                <Label htmlFor={`${kind}-reach`} className="text-xs text-muted-foreground">
                  Min {labels.reachLabel.toLowerCase()} (mm)
                </Label>
                <Input id={`${kind}-reach`} type="number" min={0} value={minReach} onChange={(e) => setMinReach(e.target.value)} />
              </div>
            </>
          )}
          {kind === "robots" && (
            <div className="flex items-center gap-2 pb-2">
              <Switch id="cobot-only" checked={cobotOnly} onCheckedChange={setCobotOnly} />
              <Label htmlFor="cobot-only" className="text-sm">
                Cobots only
              </Label>
            </div>
          )}
          <div className="w-44">
            <Label className="text-xs text-muted-foreground">Sort by</Label>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger aria-label="Sort by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brand">Brand (A–Z)</SelectItem>
                {kind !== "tools" && <SelectItem value="payload">Payload (high–low)</SelectItem>}
                {kind !== "tools" && <SelectItem value="reach">{labels.reachLabel} (high–low)</SelectItem>}
                <SelectItem value="weight">Weight (high–low)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={reset} className="mb-0.5">
              <X className="mr-1 h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {isLoading ? "Loading…" : `${filtered.length.toLocaleString("en-IN")} of ${data.length.toLocaleString("en-IN")} ${labels.noun}`}
      </p>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No {labels.noun} match these filters.</Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.slice(0, visible).map((item) => (
              <Card
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(item)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(item)}
                className="group cursor-pointer overflow-hidden transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="relative h-40 overflow-hidden">
                  <ItemImage kind={kind} item={item} photo={photos[item.id]} />
                  <Badge variant="secondary" className="absolute left-2 top-2 font-mono text-[10px]">
                    {item.id}
                  </Badge>
                </div>
                <CardContent className="space-y-2 p-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.b}</p>
                    <h3 className="font-semibold leading-snug text-foreground group-hover:text-primary line-clamp-2">{item.m}</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {typeOf(item) && <Badge variant="outline">{typeOf(item)}</Badge>}
                    {item.ap?.includes("Collaborative") && <Badge variant="outline">Cobot</Badge>}
                  </div>
                  {kind === "tools" ? (
                    <dl className="grid grid-cols-2 gap-x-2 text-xs">
                      <dt className="text-muted-foreground">Moving axes</dt>
                      <dd className="text-right font-medium">{item.a ?? "—"}</dd>
                      <dt className="text-muted-foreground">Weight</dt>
                      <dd className="text-right font-medium">{fmt(item.w, "kg")}</dd>
                    </dl>
                  ) : (
                    <dl className="grid grid-cols-2 gap-x-2 text-xs">
                      <dt className="text-muted-foreground">Axes</dt>
                      <dd className="text-right font-medium">{item.a ?? "—"}</dd>
                      <dt className="text-muted-foreground">Payload</dt>
                      <dd className="text-right font-medium">{fmt(item.p, "kg")}</dd>
                      <dt className="text-muted-foreground">{labels.reachLabel}</dt>
                      <dd className="text-right font-medium">{fmt(item.r, "mm")}</dd>
                    </dl>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {visible < filtered.length && (
            <div className="text-center">
              <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Show more ({(filtered.length - visible).toLocaleString("en-IN")} remaining)
              </Button>
            </div>
          )}
        </>
      )}

      <DirectoryItemDialog kind={kind} item={selected} photo={selected ? photos[selected.id] : undefined} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
};

export default DirectoryCatalog;
