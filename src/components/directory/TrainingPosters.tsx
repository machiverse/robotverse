import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ImagePlus,
  IndianRupee,
  Loader2,
  Mail,
  MapPin,
  MonitorPlay,
  Phone,
  Sparkles,
  Upload,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { analyzePoster, EMPTY_INFO, listPosters, posterToDataUrl, submitPoster, type PosterInfo, type TrainingPoster } from "./trainingApi";
import type { EnquiryListing } from "./TrainingEnquiryDialog";

const MAX_POSTERS = 5;

interface Props {
  onEnquire: (listing: EnquiryListing) => void;
}

// Newest training / workshop posters (max 5) in an auto-playing carousel, plus
// "Add your poster": AI reads the poster and fills in the details.
export default function TrainingPosters({ onEnquire }: Props) {
  const [posters, setPosters] = useState<TrainingPoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [paused, setPaused] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    listPosters()
      .then((p) => setPosters(p.slice(0, MAX_POSTERS)))
      .catch(() => setPosters([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // Auto-advance every 6 s unless the visitor is hovering or a dialog is open.
  useEffect(() => {
    if (!api || paused || adding || posters.length < 2) return;
    const t = window.setInterval(() => (api.canScrollNext() ? api.scrollNext() : api.scrollTo(0)), 6000);
    return () => window.clearInterval(t);
  }, [api, paused, adding, posters.length]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <p className="font-semibold">Upcoming training & workshop posters</p>
            <p className="text-xs text-muted-foreground">The {MAX_POSTERS} newest posters from institutes and trainers</p>
          </div>
          <Button size="sm" onClick={() => setAdding(true)}>
            <ImagePlus className="mr-1.5 h-4 w-4" /> Add your poster
          </Button>
        </div>

        {loading ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading posters…
          </div>
        ) : posters.length === 0 ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-56 w-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/40"
          >
            <Upload className="h-8 w-8 text-primary" />
            <span className="font-medium text-foreground">No posters yet. Be the first to add one.</span>
            <span>Upload a workshop or course poster and we read the details for you.</span>
          </button>
        ) : (
          <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <Carousel setApi={setApi} opts={{ loop: posters.length > 1 }} className="w-full">
              <CarouselContent className="ml-0">
                {posters.map((p) => (
                  <CarouselItem key={p.id} className="pl-0">
                    <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                      <a
                        href={p.image}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex max-h-[420px] items-center justify-center bg-muted/40 p-3"
                        title="Open the full poster"
                      >
                        <img src={p.image} alt={p.info.title || "Training poster"} className="max-h-[396px] w-auto rounded object-contain" loading="lazy" />
                      </a>
                      <PosterDetails poster={p} onEnquire={onEnquire} />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {posters.length > 1 && (
                <>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </>
              )}
            </Carousel>
            {posters.length > 1 && (
              <div className="flex justify-center gap-1.5 pb-3">
                {posters.map((p, i) => (
                  <button
                    key={p.id}
                    aria-label={`Show poster ${i + 1}`}
                    onClick={() => api?.scrollTo(i)}
                    className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30")}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
      <AddPosterDialog
        open={adding}
        onOpenChange={setAdding}
        onPublished={() => {
          setAdding(false);
          load();
        }}
      />
    </Card>
  );
}

function PosterDetails({ poster, onEnquire }: { poster: TrainingPoster; onEnquire: Props["onEnquire"] }) {
  const i = poster.info;
  const facts: [typeof CalendarDays, string][] = (
    [
      [CalendarDays, i.dates],
      [Clock, i.duration],
      [MonitorPlay, i.mode],
      [MapPin, i.location],
      [IndianRupee, i.fee],
      [Phone, i.contact],
    ] as [typeof CalendarDays, string][]
  ).filter(([, v]) => v);
  return (
    <div className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap gap-1.5">
        {i.kind && <Badge variant="secondary">{i.kind}</Badge>}
        <Badge variant="outline" className="text-[10px]">
          Added {new Date(poster.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </Badge>
      </div>
      <div>
        <h3 className="text-lg font-bold leading-snug">{i.title || "Training program"}</h3>
        {(i.organizer || poster.company) && <p className="text-sm text-muted-foreground">{i.organizer || poster.company}</p>}
      </div>
      {i.summary && <p className="text-sm text-muted-foreground">{i.summary}</p>}
      <div className="grid gap-1.5 text-sm">
        {facts.map(([Icon, v]) => (
          <span key={v} className="flex items-start gap-2">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{v}</span>
          </span>
        ))}
      </div>
      {i.topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {i.topics.map((t) => (
            <Badge key={t} variant="outline" className="text-[11px] font-normal">
              {t}
            </Badge>
          ))}
        </div>
      )}
      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        <Button
          onClick={() =>
            onEnquire({ id: `Poster ${poster.id}`, title: i.title || "Training program", provider: i.organizer, dates: i.dates, location: i.location })
          }
        >
          <Mail className="mr-1.5 h-4 w-4" /> Enquire
        </Button>
        {/^https?:\/\//.test(i.registration) && (
          <Button variant="outline" asChild>
            <a href={i.registration} target="_blank" rel="noopener noreferrer nofollow">
              Register
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

const FIELDS: [keyof PosterInfo, string, string?][] = [
  ["title", "Training title *"],
  ["organizer", "Organizer / institute"],
  ["kind", "Type", "Workshop, Program, Online Course…"],
  ["mode", "Mode", "Online, Classroom…"],
  ["dates", "Dates"],
  ["duration", "Duration"],
  ["location", "Venue / city"],
  ["fee", "Fee"],
  ["contact", "Contact on poster"],
  ["registration", "Registration link"],
];

function AddPosterDialog({ open, onOpenChange, onPublished }: { open: boolean; onOpenChange: (o: boolean) => void; onPublished: () => void }) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [info, setInfo] = useState<PosterInfo>(EMPTY_INFO);
  const [phase, setPhase] = useState<"idle" | "reading" | "ready" | "publishing" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (open) return;
    setImage(null);
    setInfo(EMPTY_INFO);
    setPhase("idle");
    setError(null);
  }, [open]);

  async function pick(file?: File) {
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await posterToDataUrl(file);
      setImage(dataUrl);
      setPhase("reading");
      try {
        setInfo(await analyzePoster(dataUrl));
      } catch (e) {
        setError(`${e instanceof Error ? e.message : e}. Please fill in the details below.`);
      }
      setPhase("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  }

  async function publish() {
    if (!image || !info.title.trim()) return;
    setPhase("publishing");
    setError(null);
    try {
      await submitPoster(image, info, {
        name: (user?.user_metadata?.full_name as string) || "",
        email: user?.email ?? "",
        phone,
        company: info.organizer,
      });
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("ready");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add your training or workshop poster</DialogTitle>
          <DialogDescription>
            Upload the poster and AI reads the title, dates, venue, fee and contact for you. Check the details, then publish. The {MAX_POSTERS}{" "}
            newest posters are shown in the Directory.
          </DialogDescription>
        </DialogHeader>

        {phase === "done" ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="font-semibold">Your poster is live</p>
            <p className="text-sm text-muted-foreground">The RobotVerse team has been notified at support@robotverse.in.</p>
            <Button className="mt-2" onClick={onPublished}>
              See it in the carousel
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  pick(e.dataTransfer.files?.[0]);
                }}
                className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/30 text-center text-xs text-muted-foreground hover:border-primary"
              >
                {image ? (
                  <img src={image} alt="Poster preview" className="h-full w-full object-contain" />
                ) : (
                  <span className="flex flex-col items-center gap-1.5 px-3">
                    <Upload className="h-7 w-7 text-primary" />
                    <span className="font-medium text-foreground">Upload poster</span>
                    JPG, PNG or WebP
                  </span>
                )}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  pick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {image && (
                <Button variant="ghost" size="sm" className="mt-1 w-full" onClick={() => inputRef.current?.click()}>
                  Change poster
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {phase === "reading" && (
                <p className="flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Reading the poster…
                </p>
              )}
              {phase === "ready" && !error && (
                <p className="flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" /> Details filled in from your poster. Edit anything that is wrong.
                </p>
              )}
              {error && <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">{error}</p>}

              <fieldset disabled={!image || phase === "reading" || phase === "publishing"} className="grid gap-2 sm:grid-cols-2">
                {FIELDS.map(([key, label, placeholder]) => (
                  <div key={key} className={cn("space-y-1", (key === "title" || key === "registration" || key === "location") && "sm:col-span-2")}>
                    <Label htmlFor={`poster-${key}`} className="text-xs">
                      {label}
                    </Label>
                    <Input
                      id={`poster-${key}`}
                      value={info[key] as string}
                      placeholder={placeholder}
                      onChange={(e) => setInfo((v) => ({ ...v, [key]: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="poster-topics" className="text-xs">
                    Topics (comma separated)
                  </Label>
                  <Input
                    id="poster-topics"
                    value={info.topics.join(", ")}
                    onChange={(e) => setInfo((v) => ({ ...v, topics: e.target.value.split(",").map((t) => t.trimStart()) }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="poster-summary" className="text-xs">
                    Short description
                  </Label>
                  <Textarea id="poster-summary" rows={2} value={info.summary} onChange={(e) => setInfo((v) => ({ ...v, summary: e.target.value }))} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="poster-phone" className="text-xs">
                    Your phone (only shared with the RobotVerse team)
                  </Label>
                  <Input id="poster-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 text-sm" />
                </div>
              </fieldset>
            </div>
          </div>
        )}

        {phase !== "done" && (
          <DialogFooter className="items-center gap-2">
            {!user && (
              <p className="mr-auto text-xs text-muted-foreground">
                <Link to="/auth" className="text-primary underline">
                  Sign in
                </Link>{" "}
                to publish your poster.
              </p>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={publish} disabled={!user || !image || !info.title.trim() || phase === "reading" || phase === "publishing"}>
              {phase === "publishing" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish poster
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
