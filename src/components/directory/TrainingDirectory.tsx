import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { OemDot, OemRail } from "@/components/oem/OemAccents";
import {
  CalendarDays,
  ExternalLink,
  GraduationCap,
  Mail,
  MapPin,
  MonitorPlay,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { TRAINING_LISTINGS, type TrainingListing } from "@/data/directoryTraining";
import { listTrainingMailto } from "./directoryTypes";
import TrainingPosters from "./TrainingPosters";
import TrainingEnquiryDialog, { type EnquiryListing } from "./TrainingEnquiryDialog";

const ALL = "all";
const KINDS = ["OEM Academy", "Online Course", "Program", "Workshop"] as const;
const MODES = ["Online", "Classroom", "Online + Classroom"] as const;

const toEnquiry = (t: TrainingListing): EnquiryListing => ({ id: t.id, title: t.title, provider: t.provider, location: t.location });

const learnMoreUrl = (t: TrainingListing) =>
  t.link ?? `https://www.google.com/search?q=${encodeURIComponent(`${t.title} ${t.provider} training`)}`;

const TrainingDirectory = () => {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<string>(ALL);
  const [mode, setMode] = useState<string>(ALL);
  const [enquiry, setEnquiry] = useState<EnquiryListing | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TRAINING_LISTINGS.filter(
      (t) =>
        (kind === ALL || t.kind === kind) &&
        (mode === ALL || t.mode === mode || (mode !== "Online + Classroom" && t.mode === "Online + Classroom")) &&
        (!q || `${t.id} ${t.title} ${t.provider} ${t.location} ${t.topics.join(" ")}`.toLowerCase().includes(q)),
    );
  }, [query, kind, mode]);

  const hasFilters = query || kind !== ALL || mode !== ALL;
  const clearAll = () => {
    setQuery("");
    setKind(ALL);
    setMode(ALL);
  };

  const filterPanel = (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topic, brand, city..."
          className="pl-9"
          aria-label="Search training"
        />
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold">Training Type</p>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-full" aria-label="Training type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Types</SelectItem>
            {KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold">Mode</p>
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="w-full" aria-label="Mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Modes</SelectItem>
            {MODES.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={clearAll}>
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="hidden w-72 flex-shrink-0 lg:block">
        <div className="sticky top-20 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-4 w-4" />
                Filter Training
              </CardTitle>
            </CardHeader>
            <CardContent>{filterPanel}</CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 text-center">
              <p className="mb-1 text-sm font-semibold">Run a course or workshop?</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Institutes, OEMs and trainers can list programs for free.
              </p>
              <Button size="sm" className="w-full" asChild>
                <a href={listTrainingMailto}>
                  <Plus className="mr-1 h-3 w-3" /> List Your Training
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </aside>

      <div className="w-full min-w-0 flex-1 space-y-6">
        <TrainingPosters onEnquire={setEnquiry} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-5 w-5" />
              Training & Workshops
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 lg:hidden">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search training..."
                  className="pl-9"
                  aria-label="Search training"
                />
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="shrink-0">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto">
                  <SheetHeader className="mb-4">
                    <SheetTitle>Filter Training</SheetTitle>
                  </SheetHeader>
                  {filterPanel}
                </SheetContent>
              </Sheet>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
                {TRAINING_LISTINGS.length} programs
              </p>
              <Button size="sm" variant="outline" className="lg:hidden" asChild>
                <a href={listTrainingMailto}>
                  <Plus className="mr-1 h-3 w-3" /> List Your Training
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <GraduationCap className="mb-4 h-16 w-16 text-muted-foreground" />
            <p className="mb-2 text-lg font-semibold">No training matches the current filters.</p>
            <Button onClick={clearAll}>Clear Filters</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((t) => (
              <Card
                key={t.id}
                className="group relative flex h-full flex-col overflow-hidden border border-border shadow-none transition-colors duration-150 hover:border-muted-foreground/40"
              >
                <OemRail brand={t.provider} />
                <CardContent className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {t.kind}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {t.id}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <h3 className="line-clamp-2 font-bold transition-colors group-hover:text-primary">{t.title}</h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <OemDot brand={t.provider} />
                      {t.provider}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                  <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <MonitorPlay className="h-3.5 w-3.5" />
                      {t.mode}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {t.location}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Batches & fees on enquiry
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {t.topics.map((topic) => (
                      <Badge key={topic} variant="outline" className="text-[11px] font-normal">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-auto grid grid-cols-2 gap-2 border-t pt-3">
                    <Button size="sm" onClick={() => setEnquiry(toEnquiry(t))}>
                      <Mail className="mr-1 h-3 w-3" />
                      Enquire
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={learnMoreUrl(t)} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1 h-3 w-3" />
                        {t.link ? "Website" : "Learn more"}
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <TrainingEnquiryDialog listing={enquiry} onOpenChange={(open) => !open && setEnquiry(null)} />
    </div>
  );
};

export default TrainingDirectory;
