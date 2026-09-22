import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sparkles,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  File as FileIcon,
  Loader2,
  Check,
  Bot,
  Layers,
  LayoutGrid,
  ArrowRight,
  ArrowLeft,
  ShoppingCart,
  Download,
  MessageSquare,
  TrendingUp,
  Wallet,
  Clock,
  ShieldCheck,
  Gauge,
  HardHat,
  Cable,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  INDUSTRIES,
  buildInventory,
  buildStats,
  getBlueprint,
} from "@/data/automationStudioIndustries";

/* ---------------------------------- data --------------------------------- */

const STEPS = ["Upload & Describe", "Analysis", "Results", "Automation Preview"];

const ANALYSIS_MESSAGES = [
  "Analyzing uploaded images...",
  "Detecting process stations...",
  "Matching robots to processes...",
  "Selecting EOAT...",
  "Generating layout...",
  "Calculating ROI...",
];

const ROI_CARDS = [
  { icon: TrendingUp, field: "throughput" as const, label: "Throughput Increase" },
  { icon: Wallet, field: "labor" as const, label: "Labor Cost Reduction" },
  { icon: Clock, field: "payback" as const, label: "Estimated Payback" },
  { icon: ShieldCheck, field: "defect" as const, label: "Target Defect Rate" },
];

/* --------------------------------- helpers -------------------------------- */

interface StudioFile {
  id: string;
  file: File;
  preview?: string;
}

const formatSize = (bytes: number) => {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

const fileIcon = (type: string) => {
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("video/")) return Video;
  if (type === "application/pdf") return FileText;
  return FileIcon;
};

const ACCEPT = ".jpg,.jpeg,.png,.mp4,.pdf,.doc,.docx";

/* ------------------------------ step indicator ---------------------------- */

const StepIndicator = ({ step }: { step: number }) => (
  <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
    {STEPS.map((label, i) => {
      const n = i + 1;
      const done = step > n;
      const active = step === n;
      return (
        <div key={label} className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
              done && "border-emerald-500 bg-emerald-500 text-white",
              active && "border-primary bg-primary text-primary-foreground",
              !done && !active && "border-border bg-muted text-muted-foreground",
            )}
          >
            {done ? <Check className="h-4 w-4" /> : n}
          </div>
          <span
            className={cn(
              "hidden text-xs font-medium sm:inline",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
          {n < STEPS.length && <span className="h-px w-4 bg-border sm:w-8" />}
        </div>
      );
    })}
  </div>
);

const StepShell = ({ children }: { children: React.ReactNode }) => (
  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">{children}</div>
);

/* --------------------------------- layout svg ----------------------------- */

const PREVIEW_STATIONS = [
  "S1 Loading",
  "S2 Welding",
  "S3 Finishing",
  "S4 Inspection",
  "S5 Palletizing",
  "S6 Transport",
];

interface VisualStation {
  label: string;
  eoat: string;
  cycle: string;
  automation: "full" | "semi";
}

const previewVisualStations: VisualStation[] = PREVIEW_STATIONS.map((label, index) => ({
  label,
  eoat: ["Vacuum Gripper", "Welding Torch", "Grinding Head", "Vision Camera", "Pallet Fork", "AMR Deck"][index],
  cycle: index === 1 ? "2.5 min" : `${3 + index} min`,
  automation: index === 2 || index === 5 ? "semi" : "full",
}));

const placeStations = (stations: VisualStation[]) => stations.slice(0, 6).map((station, i) => ({
    ...station,
    x: 40 + (i % 3) * 190,
    y: i < 3 ? 70 : 240,
}));

const RobotArmSymbol = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`} className="stroke-primary" fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 30h32M10 30V20h20v10M20 20l8-14 14 9 10-10" />
    <circle cx="28" cy="6" r="4" className="fill-card" />
    <circle cx="42" cy="15" r="4" className="fill-card" />
    <path d="M52 5l7-4M52 5l7 5" strokeWidth="3" />
  </g>
);

const FactoryLayoutSvg = ({ stations }: { stations: VisualStation[] }) => {
  const placed = placeStations(stations);
  return (
    <svg viewBox="0 0 900 400" className="h-auto w-full" role="img" aria-label="Factory layout preview">
      <defs>
        <pattern id="factory-grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M28 0H0V28" fill="none" className="stroke-border" strokeWidth="1" />
        </pattern>
        <marker id="as-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" className="fill-accent-foreground" />
        </marker>
      </defs>
      <rect width="900" height="400" className="fill-muted" />
      <rect width="900" height="400" fill="url(#factory-grid)" opacity="0.9" />
      {placed.map((st) => (
        <g key={st.label}>
          <rect x={st.x} y={st.y} width="160" height="100" rx="8" className={st.automation === "full" ? "fill-card stroke-success" : "fill-card stroke-warning"} strokeWidth="2" />
          <RobotArmSymbol x={st.x + 14} y={st.y + 10} />
          <text x={st.x + 76} y={st.y + 30} className="fill-muted-foreground" fontSize="9">{st.eoat}</text>
          <text x={st.x + 14} y={st.y + 75} className="fill-foreground" fontSize="11" fontWeight="600">
            {st.label}
          </text>
          <text x={st.x + 14} y={st.y + 91} className="fill-muted-foreground" fontSize="9">EOAT: {st.eoat}</text>
        </g>
      ))}
      <g className="as-dashflow stroke-accent-foreground" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#as-arrow)" fill="none">
        {placed.slice(1).map((st, i) => {
          const prev = placed[i];
          return prev.y === st.y ? (
            <line key={st.label} x1={prev.x + 162} y1={prev.y + 45} x2={st.x - 2} y2={st.y + 45} />
          ) : (
            <line key={st.label} x1={prev.x + 80} y1={prev.y + 92} x2={prev.x + 80} y2={st.y - 2} />
          );
        })}
      </g>
      <g>
        <rect x="40" y="330" width="330" height="44" rx="6" className="fill-card stroke-border" />
        <circle cx="62" cy="352" r="8" className="fill-primary" />
        <text x="78" y="356" className="fill-muted-foreground" fontSize="11">Robot cell</text>
        <line x1="160" y1="352" x2="196" y2="352" className="stroke-accent-foreground" strokeWidth="2" strokeDasharray="6 4" />
        <text x="204" y="356" className="fill-muted-foreground" fontSize="11">Material flow</text>
      </g>
    </svg>
  );
};

const MaterialFlowSvg = ({ stations }: { stations: VisualStation[] }) => {
  const placed = placeStations(stations);
  const paths = placed.slice(1).map((station, index) => {
    const previous = placed[index];
    return previous.y === station.y
      ? `M${previous.x + 160},${previous.y + 50} L${station.x},${station.y + 50}`
      : `M${previous.x + 80},${previous.y + 100} C${previous.x + 80},${station.y - 30} ${station.x + 80},${previous.y + 130} ${station.x + 80},${station.y}`;
  });
  const circuit = paths.join(" ");
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
      <svg viewBox="0 0 900 410" className="h-auto w-full" role="img" aria-label="Animated material flow">
        <defs>
          <pattern id="flow-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" className="stroke-border" strokeWidth="1" /></pattern>
          <path id="material-circuit" d={circuit} />
        </defs>
        <rect width="900" height="410" className="fill-muted" />
        <rect width="900" height="410" fill="url(#flow-grid)" />
        {paths.map((path, index) => <path key={path} d={path} fill="none" className="as-dashflow stroke-primary" strokeWidth="3" strokeDasharray="8 6" />)}
        {placed.map((station, index) => (
          <g key={station.label}>
            <rect x={station.x} y={station.y} width="160" height="100" rx="8" className={station.automation === "full" ? "fill-card stroke-success" : "fill-card stroke-warning"} strokeWidth="2" />
            <text x={station.x + 80} y={station.y + 42} textAnchor="middle" className="fill-foreground" fontSize="11" fontWeight="600">{station.label}</text>
            <text x={station.x + 80} y={station.y + 63} textAnchor="middle" className="fill-primary" fontSize="11">{station.cycle}/cycle</text>
            {index < placed.length - 1 && <rect x={station.x + 164} y={station.y + 42} width="20" height="16" rx="3" className="fill-warning" opacity="0.8" />}
          </g>
        ))}
        {[0, 0.24, 0.5, 0.73].map((begin, index) => (
          <circle key={begin} r="6" className="fill-primary">
            <animateMotion dur={`${7 + index}s`} begin={`-${begin * 8}s`} repeatCount="indefinite"><mpath href="#material-circuit" /></animateMotion>
          </circle>
        ))}
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 text-sm">
        <span className="text-muted-foreground">Buffer zones shown between connected stations</span>
        <span className="font-semibold text-primary">Estimated: 47 parts/hour</span>
      </div>
    </div>
  );
};

const IsometricCellView = ({ stations }: { stations: VisualStation[] }) => (
  <div className="overflow-hidden rounded-lg border border-border bg-muted/40 px-3 py-10 sm:px-8 [perspective:1200px]">
    <div className="as-isometric-floor mx-auto grid aspect-[16/9] w-full max-w-4xl grid-cols-3 gap-5 border border-border p-6 [transform:rotateX(55deg)_rotateZ(-45deg)] [transform-style:preserve-3d]">
      {stations.slice(0, 6).map((station, index) => (
        <div key={station.label} className="relative flex min-h-28 items-center justify-center [transform:translateZ(20px)] [transform-style:preserve-3d]">
          <div className={cn("absolute inset-0 border-2 bg-card shadow-[8px_8px_0_hsl(var(--border))]", station.automation === "full" ? "border-success" : "border-warning")} />
          <span className="as-robot-pulse relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">R{index + 1}</span>
          <div className="absolute left-1/2 top-full z-20 mt-2 w-32 -translate-x-1/2 text-center [transform:rotateZ(45deg)_rotateX(-55deg)]">
            <p className="text-[10px] font-semibold text-foreground">{station.label}</p>
            <p className="text-[9px] text-muted-foreground">{station.eoat}</p>
          </div>
          {index < stations.length - 1 && <span className="as-cell-link absolute -right-5 top-1/2 h-px w-5 border-t-2 border-dashed border-primary" />}
        </div>
      ))}
    </div>
    <div className="mt-12 flex flex-wrap justify-center gap-5 text-xs text-muted-foreground">
      <span className="flex items-center gap-2"><span className="h-3 w-3 border-2 border-success" /> Fully automated</span>
      <span className="flex items-center gap-2"><span className="h-3 w-3 border-2 border-warning" /> Semi-automated</span>
      <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-primary" /> Robot position</span>
    </div>
  </div>
);

/* ---------------------------------- page ---------------------------------- */

export default function AutomationStudio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<StudioFile[]>([]);
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const blueprint = getBlueprint(industry);
  const processes = blueprint.processes;
  const inventory = buildInventory(blueprint);
  const stats = buildStats(blueprint);
  const stations: VisualStation[] = processes.map((process, index) => ({
    label: inventory[index]?.station ?? process.short,
    eoat: process.eoat[0],
    cycle: process.cycleTimeAutomated,
    automation: process.automation,
  }));
  const roiCards = ROI_CARDS.map((c) => ({ ...c, value: blueprint.roi[c.field] }));

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const next = Array.from(incoming).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setFiles((prev) => [...prev, ...next]);
  }, []);

  // Step 2 simulated analysis
  useEffect(() => {
    if (step !== 2) return;
    setMsgIndex(0);
    const interval = window.setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, ANALYSIS_MESSAGES.length - 1));
    }, 1300);
    const done = window.setTimeout(() => setStep(3), 8000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(done);
    };
  }, [step]);

  const reset = () => {
    setStep(1);
    setFiles([]);
    setDescription("");
    setIndustry(null);
  };

  /* ---------------------------- unauthenticated ---------------------------- */

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <main>
          <section className="border-b border-border bg-card/40">
            <div className="container mx-auto px-4 py-16 text-center">
              <Badge variant="secondary" className="mb-4 gap-1">
                <Sparkles className="h-3 w-3" /> New
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Automation Studio</h1>
              <p className="mx-auto mt-4 max-w-[58ch] text-base text-muted-foreground sm:text-lg">
                Upload your factory process. See the automation before you build it.
              </p>
              <Button
                size="lg"
                className="mt-8 whitespace-normal min-w-fit w-auto"
                onClick={() => navigate("/auth?redirect=/automation-studio")}
              >
                Sign In to Start
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </section>

          <section className="container mx-auto px-4 py-12">
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { icon: Sparkles, title: "AI Process Analysis", body: "Share photos, videos or drawings of your line and get each station broken down into automatable steps." },
                { icon: Bot, title: "Robot & EOAT Matching", body: "Every station is matched to real robot models with payload, reach, controller and the end-of-arm tooling required." },
                { icon: LayoutGrid, title: "Visual Factory Layout", body: "See a proposed cell layout, material flow and an inventory list you can quote from right away." },
              ].map((f) => (
                <Card key={f.title}>
                  <CardHeader>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{f.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-10 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">Preview: generated factory layout</CardTitle>
              </CardHeader>
              <CardContent>
                <FactoryLayoutSvg stations={previewVisualStations} />
              </CardContent>
            </Card>

            <div className="mt-10 text-center">
              <Button
                size="lg"
                className="whitespace-normal min-w-fit w-auto"
                onClick={() => navigate("/auth?redirect=/automation-studio")}
              >
                Sign In to Use Automation Studio
              </Button>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  /* ----------------------------- authenticated ----------------------------- */

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <main className="container mx-auto max-w-[1400px] px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="flex items-center justify-center gap-2 text-2xl font-bold sm:text-3xl">
            <Sparkles className="h-6 w-6 text-primary" /> Automation Studio
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload your factory process. See the automation before you build it.
          </p>
        </div>

        <div className="mb-10">
          <StepIndicator step={step} />
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <StepShell>
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Upload process media</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      addFiles(e.dataTransfer.files);
                    }}
                    onClick={() => inputRef.current?.click()}
                    className={cn(
                      "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                      dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                    )}
                  >
                    <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Drag and drop files here, or click to browse</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Images (JPG, PNG), video (MP4) and documents (PDF, DOCX)
                    </p>
                    <input
                      ref={inputRef}
                      type="file"
                      multiple
                      accept={ACCEPT}
                      className="hidden"
                      onChange={(e) => {
                        addFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </div>

                  {files.length > 0 && (
                    <ul className="space-y-2">
                      {files.map((f) => {
                        const Icon = fileIcon(f.file.type);
                        return (
                          <li key={f.id} className="flex items-center gap-3 rounded-md border border-border p-2">
                            {f.preview ? (
                              <img src={f.preview} alt="" className="h-10 w-10 rounded object-cover" />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-muted-foreground">
                                <Icon className="h-5 w-5" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{f.file.name}</p>
                              <p className="text-xs text-muted-foreground">{formatSize(f.file.size)}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              aria-label={`Remove ${f.file.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setFiles((prev) => prev.filter((x) => x.id !== f.id));
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div>
                    <label htmlFor="as-description" className="mb-2 block text-sm font-medium">
                      Describe your process
                    </label>
                    <Textarea
                      id="as-description"
                      rows={5}
                      placeholder={blueprint.placeholder}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Select your industry</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {INDUSTRIES.map((ind) => (
                      <button
                        key={ind.key}
                        type="button"
                        onClick={() => setIndustry(ind.key)}
                        aria-pressed={industry === ind.key}
                        className={cn(
                          "rounded-lg border p-3 text-left text-xs font-medium transition-colors",
                          industry === ind.key
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border hover:border-primary/50",
                        )}
                      >
                        <span className="mb-1 block text-lg" aria-hidden="true">{ind.emoji}</span>
                        {ind.label}
                      </button>
                    ))}
                  </div>
                  <Button
                    className="w-full whitespace-normal min-w-fit"
                    onClick={() => setStep(2)}
                  >
                    Analyze My Process
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </StepShell>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <StepShell>
            <div className="flex min-h-[340px] flex-col items-center justify-center text-center">
              <Loader2 className="mb-6 h-10 w-10 animate-spin text-primary" />
              <p className="text-lg font-semibold" aria-live="polite">
                {ANALYSIS_MESSAGES[msgIndex]}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                This usually takes a few seconds. Please keep this page open.
              </p>
              <Badge variant="secondary" className="mt-4 gap-1.5">
                <Bot className="h-3.5 w-3.5" /> Powered by RobotVerse AI
              </Badge>
              <ul className="mt-8 space-y-2 text-left">
                {ANALYSIS_MESSAGES.map((m, i) => (
                  <li key={m} className="flex items-center gap-2 text-sm">
                    {i < msgIndex ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-border" />
                    )}
                    <span className={i <= msgIndex ? "text-foreground" : "text-muted-foreground"}>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          </StepShell>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <StepShell>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-5">
                    <p className="text-2xl font-bold text-primary tabular-nums">{s.value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {processes.map((p) => (
                <Card key={p.index} className="overflow-hidden">
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                    <CardTitle className="text-base">
                      <span className="mr-2 text-muted-foreground">{p.index} —</span>
                      {p.name}
                    </CardTitle>
                    <Badge
                      className={cn(
                        "shrink-0 border-transparent",
                        p.automation === "full"
                          ? "bg-emerald-600 text-white hover:bg-emerald-600"
                          : "bg-amber-500 text-white hover:bg-amber-500",
                      )}
                    >
                      {p.automation === "full" ? "Fully Automatable" : "Semi-Automatable"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Current Process
                        </p>
                        <ul className="space-y-1.5">
                          {p.current.map((c) => (
                            <li key={c} className="flex gap-2 rounded bg-destructive/10 p-2 text-xs text-foreground">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Automated Solution
                        </p>
                        <ul className="space-y-1.5">
                          {p.automated.map((a) => (
                            <li key={a} className="flex gap-2 rounded bg-emerald-500/10 p-2 text-xs text-foreground">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="divide-y divide-border rounded-lg border border-border bg-muted/20 text-xs">
                      <div className="grid gap-2 p-3 sm:grid-cols-[110px_1fr] sm:items-center">
                        <span className="flex items-center gap-1.5 font-semibold"><Gauge className="h-3.5 w-3.5 text-primary" /> Cycle Time</span>
                        <div className="flex flex-wrap items-center gap-2"><span>{p.cycleTimeCurrent}</span><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-semibold">{p.cycleTimeAutomated}</span><Badge className="border-transparent bg-success text-primary-foreground hover:bg-success">{p.cycleImprovement}</Badge></div>
                      </div>
                      <div className="grid gap-2 p-3 sm:grid-cols-[110px_1fr] sm:items-center">
                        <span className="flex items-center gap-1.5 font-semibold"><HardHat className="h-3.5 w-3.5 text-primary" /> Safety</span>
                        <div className="flex items-center gap-2"><Badge className={cn("border-transparent text-primary-foreground", p.safetyRiskCurrent === "High" ? "bg-destructive hover:bg-destructive" : p.safetyRiskCurrent === "Medium" ? "bg-warning hover:bg-warning" : "bg-success hover:bg-success")}>{p.safetyRiskCurrent}</Badge><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /><Badge className="border-transparent bg-success text-primary-foreground hover:bg-success">{p.safetyRiskAutomated}</Badge></div>
                      </div>
                      <div className="grid gap-2 p-3 sm:grid-cols-[110px_1fr]">
                        <span className="flex items-center gap-1.5 font-semibold"><Cable className="h-3.5 w-3.5 text-primary" /> Integration</span>
                        <span className="leading-relaxed text-muted-foreground">{p.integrationNote}</span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
                          <Bot className="h-4 w-4" />
                          {p.robot.model}
                        </span>
                        <span className="text-xs text-muted-foreground">Payload {p.robot.payload}</span>
                        <span className="text-xs text-muted-foreground">Reach {p.robot.reach}</span>
                        <span className="text-xs text-muted-foreground">{p.robot.controller}</span>
                        <Badge variant={p.robot.stock === "In Stock" ? "default" : "secondary"} className="text-[10px]">
                          {p.robot.stock}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Layers className="h-3.5 w-3.5" /> EOAT
                        </span>
                        {p.eoat.map((e) => (
                          <Badge key={e} variant="outline" className="text-[10px]">
                            {e}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-6">
              <CardHeader><CardTitle className="text-base">Deep Analysis Summary</CardTitle></CardHeader>
              <CardContent className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Est. Investment", "₹1.2Cr — ₹1.8Cr"],
                  ["Annual Savings", "₹45L — ₹65L"],
                  ["Manpower", "From 24 workers → 8 operators"],
                  ["Capacity Increase", "+150% throughput"],
                  ["Timeline", "12-16 weeks deployment"],
                  ["Payback Period", "18-30 months"],
                ].map(([label, value]) => <div key={label} className="bg-card p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold text-foreground">{value}</p></div>)}
              </CardContent>
            </Card>

            <div className="mt-6 flex justify-center">
              <Button asChild variant="ghost" className="whitespace-normal min-w-fit w-auto">
                <Link to="/ai-assistant">
                  <Bot className="mr-2 h-4 w-4" /> Refine with RobotVerse AI
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap justify-between gap-3">
              <Button variant="outline" className="whitespace-normal min-w-fit w-auto" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Edit inputs
              </Button>
              <Button className="whitespace-normal min-w-fit w-auto" onClick={() => setStep(4)}>
                View Automation Preview <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </StepShell>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <StepShell>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Automation preview</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="layout">
                  <TabsList className="flex-wrap">
                    <TabsTrigger value="layout">Factory Layout</TabsTrigger>
                    <TabsTrigger value="flow">Material Flow</TabsTrigger>
                    <TabsTrigger value="cell">3D Cell View</TabsTrigger>
                  </TabsList>
                  <TabsContent value="layout" className="mt-4">
                    <FactoryLayoutSvg stations={stations} />
                  </TabsContent>
                  <TabsContent value="flow" className="mt-4">
                    <MaterialFlowSvg stations={stations} />
                  </TabsContent>
                  <TabsContent value="cell" className="mt-4">
                    <IsometricCellView stations={stations} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Inventory matched</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Robot Model</TableHead>
                      <TableHead>Controller</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Payload</TableHead>
                      <TableHead>Reach</TableHead>
                      <TableHead>Assigned Station</TableHead>
                      <TableHead>EOAT Required</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((r) => (
                      <TableRow key={r.model}>
                        <TableCell className="font-medium">{r.model}</TableCell>
                        <TableCell className="text-muted-foreground">{r.controller}</TableCell>
                        <TableCell className="tabular-nums">{r.qty}</TableCell>
                        <TableCell className="text-muted-foreground">{r.payload}</TableCell>
                        <TableCell className="text-muted-foreground">{r.reach}</TableCell>
                        <TableCell className="text-muted-foreground">{r.station}</TableCell>
                        <TableCell className="text-muted-foreground">{r.eoat}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {roiCards.map((r) => (
                <Card key={r.label}>
                  <CardContent className="p-5">
                    <r.icon className="mb-2 h-5 w-5 text-primary" />
                    <p className="text-xl font-bold">{r.value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{r.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-6">
              <CardContent className="flex flex-wrap items-center justify-center gap-3 p-6">
                <Button
                  className="whitespace-normal min-w-fit w-auto"
                  onClick={() => toast({ title: "Cart coming soon", description: "The matched robot list will be added to your cart once checkout goes live." })}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" /> Add All to Cart
                </Button>
                <Button
                  variant="outline"
                  className="whitespace-normal min-w-fit w-auto"
                  onClick={() => toast({ title: "Proposal PDF coming soon", description: "You will be able to download this study as a branded proposal." })}
                >
                  <Download className="mr-2 h-4 w-4" /> Download Proposal PDF
                </Button>
                <Button
                  variant="outline"
                  className="whitespace-normal min-w-fit w-auto"
                  onClick={() => toast({ title: "Request noted", description: "An automation engineer will be connected to this study shortly." })}
                >
                  <MessageSquare className="mr-2 h-4 w-4" /> Talk to an Engineer
                </Button>
                <Button asChild variant="outline" className="whitespace-normal min-w-fit w-auto">
                  <Link to="/ai-assistant">
                    <Bot className="mr-2 h-4 w-4" /> Discuss with RobotVerse AI
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <div className="mt-8 flex flex-wrap justify-between gap-3">
              <Button variant="outline" className="whitespace-normal min-w-fit w-auto" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to analysis
              </Button>
              <Button variant="ghost" className="whitespace-normal min-w-fit w-auto" onClick={reset}>
                Start new analysis
              </Button>
            </div>
          </StepShell>
        )}
      </main>
      <Footer />
    </div>
  );
}
