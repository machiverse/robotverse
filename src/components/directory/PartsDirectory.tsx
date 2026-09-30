import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Cpu, LayoutGrid, Loader2, Mail, Package, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mailto } from "./directoryTypes";
import { COMPONENT_GUIDE } from "./robotBom";

export interface Part {
  id: string;
  category: string;
  subcategory: string;
  component_type: string;
  brand: string;
  model: string;
  name: string;
  description: string | null;
  specs: Record<string, string>;
  applications: string[];
  compatible_with: string[];
  image_url: string | null;
  thumb_url: string | null;
}

const ALL = "all";
const PAGE = 24;
const CATEGORY_ORDER = ["Robot Parts", "Devices", "Tools", "Software"];

// The table is new and not in the generated types yet, so it is read through a loose client.
type Query = {
  select: (c: string) => Query;
  order: (col: string) => Query;
  range: (from: number, to: number) => Promise<{ data: unknown[] | null; error: unknown }>;
};
const fetchParts = async (): Promise<Part[]> => {
  const out: Part[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await (supabase as unknown as { from: (t: string) => Query })
      .from("directory_parts")
      .select("id, category, subcategory, component_type, brand, model, name, description, specs, applications, compatible_with, image_url, thumb_url")
      .order("id")
      .range(from, from + 999);
    if (error || !data) break;
    out.push(...(data as Part[]));
    if (data.length < 1000) break;
  }
  return out;
};

const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b));
const enquiry = (p: Part) =>
  mailto(
    `Enquiry: ${p.name}`,
    `Hello RobotVerse team,\n\nI'm interested in the ${p.name} (${p.component_type}).\n\nQuantity:\nName:\nCompany:\nPhone:\n\nThank you.`,
  );

/**
 * OEM parts & components for robots — controllers, drives, motors, reducers, sensors, cameras,
 * safety devices, EOAT, welding and process tools, software — grouped like the Spare Parts menu.
 */
export default function PartsDirectory() {
  const { data: parts = [], isLoading } = useQuery({ queryKey: ["directory", "parts"], queryFn: fetchParts, staleTime: 5 * 60 * 1000 });
  // A robot's component list links here with ?q=<model> or ?type=<component type>.
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [cat, setCat] = useState(ALL);
  const [sub, setSub] = useState(ALL);
  const [type, setType] = useState(params.get("type") ?? ALL);
  const [view, setView] = useState<"parts" | "guide">("parts");
  const [brand, setBrand] = useState(ALL);
  const [visible, setVisible] = useState(PAGE);
  const [open, setOpen] = useState<Part | null>(null);

  const cats = useMemo(() => {
    const present = uniq(parts.map((p) => p.category));
    return [...CATEGORY_ORDER.filter((c) => present.includes(c)), ...present.filter((c) => !CATEGORY_ORDER.includes(c))];
  }, [parts]);
  const inCat = parts.filter((p) => cat === ALL || p.category === cat);
  const subs = uniq(inCat.map((p) => p.subcategory));
  const inSub = inCat.filter((p) => sub === ALL || p.subcategory === sub);
  const types = uniq(inSub.map((p) => p.component_type));
  const inType = inSub.filter((p) => type === ALL || p.component_type === type);
  const brands = uniq(inType.map((p) => p.brand));

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return inType
      .filter((p) => brand === ALL || p.brand === brand)
      .filter((p) => {
        if (!words.length) return true;
        const hay = `${p.name} ${p.brand} ${p.model} ${p.component_type} ${p.subcategory} ${Object.values(p.specs ?? {}).join(" ")} ${p.applications.join(" ")} ${p.compatible_with.join(" ")}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .sort((a, b) => Number(!!b.thumb_url) - Number(!!a.thumb_url) || a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model));
  }, [inType, brand, q]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    parts.forEach((p) => m.set(p.component_type, (m.get(p.component_type) ?? 0) + 1));
    return m;
  }, [parts]);
  const reset = (level: "cat" | "sub" | "type") => {
    if (level === "cat") setSub(ALL);
    if (level !== "type") setType(ALL);
    setBrand(ALL);
    setVisible(PAGE);
  };

  if (isLoading)
    return (
      <p className="flex items-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading parts & components…
      </p>
    );

  const openType = (t: string) => {
    setCat(ALL);
    setSub(ALL);
    setType(t);
    setBrand(ALL);
    setQ(counts.get(t) ? "" : t);
    setVisible(PAGE);
    setView("parts");
  };

  const toggle = (
    <div className="mb-4 inline-flex rounded-md border border-border p-0.5 text-sm" role="tablist" aria-label="Parts view">
      {([["parts", "Browse parts", LayoutGrid], ["guide", "Robot components A–Z", BookOpen]] as const).map(([k, label, Icon]) => (
        <button
          key={k}
          role="tab"
          aria-selected={view === k}
          onClick={() => setView(k)}
          className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 ${view === k ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          <Icon className="h-4 w-4" /> {label}
        </button>
      ))}
    </div>
  );

  if (view === "guide")
    return (
      <div>
        {toggle}
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          Every major component inside an industrial robot, cobot, SCARA or delta robot — what it does, where it is used and the signs it
          needs replacing. Open any robot in the Robots tab to see its own component list.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {COMPONENT_GUIDE.map((g) => {
            const n = counts.get(g.type) ?? 0;
            return (
              <button key={g.type} onClick={() => openType(g.type)} className="rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary">
                <span className="flex items-baseline justify-between gap-2">
                  <b>{g.type}</b>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">{n ? `${n} OEM parts` : "Being collected"}</span>
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">{g.what}</span>
                <span className="mt-2 block text-xs"><span className="text-muted-foreground">Used in:</span> {g.where}</span>
                {g.signs && <span className="mt-0.5 block text-xs"><span className="text-muted-foreground">Replace when:</span> {g.signs}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );

  return (
    <div>
    {toggle}
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4 rounded-lg border border-border p-4 lg:self-start">
        <h2 className="flex items-center gap-2 font-semibold">
          <Search className="h-4 w-4" /> Filter parts
        </h2>
        <Input placeholder="Search model, brand, spec…" value={q} onChange={(e) => (setQ(e.target.value), setVisible(PAGE))} />
        <Filter label="Category" value={cat} onChange={(v) => (setCat(v), reset("cat"))} options={cats} />
        <Filter label="Sub-category" value={sub} onChange={(v) => (setSub(v), reset("sub"))} options={subs} />
        <Filter label="Component type" value={type} onChange={(v) => (setType(v), reset("type"))} options={types} />
        <Filter label="Manufacturer" value={brand} onChange={(v) => (setBrand(v), setVisible(PAGE))} options={brands} />
      </aside>

      <section>
        <p className="mb-4 text-sm text-muted-foreground">
          Showing <b className="text-foreground">{list.length.toLocaleString()}</b> of {parts.length.toLocaleString()} OEM parts & components
        </p>
        {parts.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <Package className="mx-auto mb-2 h-8 w-8" />
              OEM parts are being collected from manufacturer websites — check back shortly.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.slice(0, visible).map((p) => (
                <Card key={p.id} className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md" onClick={() => setOpen(p)}>
                  <div className="relative flex aspect-[4/3] items-center justify-center border-b border-border bg-white">
                    <PartImage p={p} />
                    <Badge variant="secondary" className="absolute left-2 top-2 text-xs">
                      {p.component_type}
                    </Badge>
                  </div>
                  <CardContent className="space-y-1.5 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{p.brand}</p>
                    <h3 className="line-clamp-2 font-semibold leading-snug">{p.name}</h3>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(p.specs ?? {})
                        .slice(0, 3)
                        .map(([k, v]) => (
                          <span key={k} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                            {k}: <b>{v}</b>
                          </span>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {visible < list.length && (
              <div className="mt-6 text-center">
                <Button variant="outline" onClick={() => setVisible((v) => v + PAGE)}>
                  Show more ({(list.length - visible).toLocaleString()} left)
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{open.component_type}</Badge>
                  <Badge variant="outline">{open.subcategory}</Badge>
                </div>
                <DialogTitle className="text-xl">{open.name}</DialogTitle>
                <DialogDescription>
                  Brand: {open.brand} · Model: {open.model}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex h-64 items-center justify-center overflow-hidden rounded-lg border border-border bg-white">
                  <PartImage p={open} large />
                </div>
                <div className="space-y-3 text-sm">
                  {open.description && <p className="text-muted-foreground">{open.description}</p>}
                  {Object.keys(open.specs ?? {}).length > 0 && (
                    <dl className="divide-y divide-border rounded-md border border-border">
                      {Object.entries(open.specs).map(([k, v]) => (
                        <div key={k} className="grid grid-cols-2 gap-2 px-3 py-1.5">
                          <dt className="text-muted-foreground">{k}</dt>
                          <dd className="font-medium">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {open.applications.length > 0 && (
                    <p>
                      <b>Applications:</b> {open.applications.join(", ")}
                    </p>
                  )}
                  {open.compatible_with.length > 0 && (
                    <p>
                      <b>Works with:</b> {open.compatible_with.join(", ")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <a href={enquiry(open)}>
                    <Mail className="mr-2 h-4 w-4" /> Send enquiry
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={`/parts?search=${encodeURIComponent(open.model)}`}>Find in RobotVerse spare parts</a>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block space-y-1 text-sm font-medium">
      <span>{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All ({options.length})</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function PartImage({ p, large = false }: { p: Part; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = large ? p.image_url || p.thumb_url : p.thumb_url || p.image_url;
  if (!src || failed)
    return (
      <div className="flex flex-col items-center gap-1 text-primary">
        <Cpu className={large ? "h-14 w-14" : "h-10 w-10"} strokeWidth={1.5} />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60">{p.brand}</span>
      </div>
    );
  return <img src={src} alt={p.name} loading="lazy" onError={() => setFailed(true)} className="max-h-full max-w-full object-contain p-3" />;
}
