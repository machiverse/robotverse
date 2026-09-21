import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ---------------------------------- data --------------------------------- */

const INDUSTRIES = [
  { label: "Stone & Granite", emoji: "🪨" },
  { label: "Metal Fabrication", emoji: "🔧" },
  { label: "Automotive", emoji: "🚗" },
  { label: "Packaging", emoji: "📦" },
  { label: "Food & Beverage", emoji: "🥫" },
  { label: "Pharma", emoji: "💊" },
  { label: "Construction", emoji: "🏗️" },
  { label: "Electronics", emoji: "🔌" },
];

const STEPS = ["Upload & Describe", "Analysis", "Results", "Automation Preview"];

const ANALYSIS_MESSAGES = [
  "Analyzing uploaded images...",
  "Detecting process stations...",
  "Matching robots to processes...",
  "Selecting EOAT...",
  "Generating layout...",
  "Calculating ROI...",
];

type Automation = "full" | "semi";

interface ProcessCard {
  index: string;
  name: string;
  automation: Automation;
  current: string[];
  automated: string[];
  robot: { model: string; payload: string; reach: string; controller: string; stock: string };
  eoat: string[];
}

const PROCESSES: ProcessCard[] = [
  {
    index: "01",
    name: "Block Handling & Loading",
    automation: "full",
    current: [
      "Overhead crane with 2 operators per block",
      "Manual slinging, high pinch-point risk",
      "6-9 minutes cycle per block",
    ],
    automated: [
      "Heavy-payload robot with vacuum lift head",
      "Auto block detection via 3D area scanner",
      "2.5 minute cycle, single supervisor",
    ],
    robot: { model: "FANUC M-2000iA/900L", payload: "900 kg", reach: "4683 mm", controller: "R-30iB Plus", stock: "In Stock" },
    eoat: ["Vacuum Pad Gripper", "Load Cell", "Anti-Drop Check Valve"],
  },
  {
    index: "02",
    name: "Surface Polishing",
    automation: "full",
    current: [
      "Hand-held polisher, 4 operators per shift",
      "Finish quality varies between operators",
      "High silica dust exposure",
    ],
    automated: [
      "Force-controlled robotic polishing head",
      "Constant contact pressure, repeatable gloss",
      "Enclosed wet cell, no dust exposure",
    ],
    robot: { model: "ABB IRB 6700-235/2.65", payload: "235 kg", reach: "2650 mm", controller: "OmniCore C90XT", stock: "In Stock" },
    eoat: ["Active Force Compliance Head", "Pad Changer", "Coolant Nozzle"],
  },
  {
    index: "03",
    name: "Edge Profiling & Chamfering",
    automation: "semi",
    current: [
      "CNC edge machine loaded by hand",
      "Profile templates swapped manually",
      "Rework rate around 8%",
    ],
    automated: [
      "Robot load/unload with profile recipe library",
      "Operator retained for first-article approval",
      "Rework target below 2%",
    ],
    robot: { model: "KUKA KR 210 R2700-2", payload: "210 kg", reach: "2700 mm", controller: "KR C5", stock: "4-6 Weeks" },
    eoat: ["Dual Clamp Gripper", "Tool Changer", "Force/Torque Sensor" ],
  },
  {
    index: "04",
    name: "Quality Inspection",
    automation: "full",
    current: [
      "Visual inspection under work lamp",
      "No dimensional record per slab",
      "Defects found late, after polishing",
    ],
    automated: [
      "Line-scan vision + laser profilometer",
      "Full dimensional record per part ID",
      "Inline reject before value is added",
    ],
    robot: { model: "Yaskawa GP25-12", payload: "25 kg", reach: "1730 mm", controller: "YRC1000", stock: "In Stock" },
    eoat: ["Vision Camera Mount", "Laser Profilometer", "LED Ring Light"],
  },
  {
    index: "05",
    name: "Palletizing & Crating",
    automation: "full",
    current: [
      "3 operators stacking onto A-frames",
      "Transit damage claims each month",
      "Pattern depends on who is on shift",
    ],
    automated: [
      "Palletizing robot with pattern generator",
      "Consistent layer and separator placement",
      "Auto label and pack-list print",
    ],
    robot: { model: "FANUC M-410iC/315", payload: "315 kg", reach: "3143 mm", controller: "R-30iB Plus", stock: "2-3 Weeks" },
    eoat: ["Clamp + Vacuum Combi Tool", "Separator Feeder", "Label Applicator"],
  },
  {
    index: "06",
    name: "Inter-Station Material Transport",
    automation: "semi",
    current: [
      "Forklift moves between all stations",
      "Average 11 minutes queue per move",
      "Mixed pedestrian and forklift traffic",
    ],
    automated: [
      "AMR fleet on fixed loop with call buttons",
      "Queue time reduced to under 3 minutes",
      "Forklift retained for yard work only",
    ],
    robot: { model: "AMR 1500 Heavy Deck", payload: "1500 kg", reach: "Loop route", controller: "Fleet Manager", stock: "6-8 Weeks" },
    eoat: ["Roller Deck Top", "Safety Scanner Pair", "Charge Dock"],
  },
];

const INVENTORY = [
  { model: "FANUC M-2000iA/900L", controller: "R-30iB Plus", qty: 1, payload: "900 kg", reach: "4683 mm", station: "S1 Block Loading", eoat: "Vacuum Pad Gripper" },
  { model: "ABB IRB 6700-235", controller: "OmniCore C90XT", qty: 2, payload: "235 kg", reach: "2650 mm", station: "S2 Polishing", eoat: "Force Compliance Head" },
  { model: "KUKA KR 210 R2700-2", controller: "KR C5", qty: 1, payload: "210 kg", reach: "2700 mm", station: "S3 Edge Profiling", eoat: "Dual Clamp Gripper" },
  { model: "Yaskawa GP25-12", controller: "YRC1000", qty: 1, payload: "25 kg", reach: "1730 mm", station: "S4 Inspection", eoat: "Vision Camera Mount" },
  { model: "FANUC M-410iC/315", controller: "R-30iB Plus", qty: 1, payload: "315 kg", reach: "3143 mm", station: "S5 Palletizing", eoat: "Clamp + Vacuum Combi" },
  { model: "AMR 1500 Heavy Deck", controller: "Fleet Manager", qty: 2, payload: "1500 kg", reach: "Loop route", station: "Transport Loop", eoat: "Roller Deck Top" },
];

const ROI = [
  { icon: TrendingUp, value: "2-3×", label: "Throughput Increase" },
  { icon: Wallet, value: "60-70%", label: "Labor Cost Reduction" },
  { icon: Clock, value: "18-30 mo", label: "Estimated Payback" },
  { icon: ShieldCheck, value: "<2%", label: "Target Defect Rate" },
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

const FactoryLayoutSvg = () => (
  <svg viewBox="0 0 900 400" className="h-auto w-full" role="img" aria-label="Factory layout preview">
    <rect x="0" y="0" width="900" height="400" className="fill-muted" />
    <g className="stroke-border" strokeWidth="1">
      {Array.from({ length: 17 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 56} y1="0" x2={i * 56} y2="400" />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 56} x2="900" y2={i * 56} />
      ))}
    </g>
    {[
      { x: 40, y: 70, label: "S1 Block Loading", r: "R1" },
      { x: 230, y: 70, label: "S2 Polishing", r: "R2" },
      { x: 420, y: 70, label: "S3 Edge Profiling", r: "R3" },
      { x: 610, y: 70, label: "S4 Inspection", r: "R4" },
      { x: 610, y: 240, label: "S5 Palletizing", r: "R5" },
      { x: 230, y: 240, label: "Transport Loop", r: "R6" },
    ].map((s) => (
      <g key={s.label}>
        <rect x={s.x} y={s.y} width="160" height="90" rx="8" className="fill-card stroke-primary" strokeWidth="2" />
        <circle cx={s.x + 32} cy={s.y + 34} r="16" className="fill-primary" />
        <text x={s.x + 32} y={s.y + 39} textAnchor="middle" className="fill-primary-foreground" fontSize="12" fontWeight="700">
          {s.r}
        </text>
        <text x={s.x + 56} y={s.y + 39} className="fill-foreground" fontSize="12" fontWeight="600">
          {s.label.split(" ")[0]}
        </text>
        <text x={s.x + 16} y={s.y + 72} className="fill-muted-foreground" fontSize="11">
          {s.label.split(" ").slice(1).join(" ")}
        </text>
      </g>
    ))}
    <defs>
      <marker id="as-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" className="fill-accent-foreground" />
      </marker>
    </defs>
    <g className="stroke-accent-foreground" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#as-arrow)" fill="none">
      <line x1="200" y1="115" x2="228" y2="115" />
      <line x1="390" y1="115" x2="418" y2="115" />
      <line x1="580" y1="115" x2="608" y2="115" />
      <line x1="690" y1="160" x2="690" y2="238" />
      <line x1="608" y1="285" x2="392" y2="285" />
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
                <FactoryLayoutSvg />
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
                      placeholder="Example: We cut granite blocks into slabs, polish them by hand, profile the edges on a CNC, then stack onto A-frames for dispatch."
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
                        key={ind.label}
                        type="button"
                        onClick={() => setIndustry(ind.label)}
                        aria-pressed={industry === ind.label}
                        className={cn(
                          "rounded-lg border p-3 text-left text-xs font-medium transition-colors",
                          industry === ind.label
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
              {[
                { value: "6", label: "Processes Found" },
                { value: "4", label: "Fully Automatable" },
                { value: "2", label: "Semi-Automatable" },
                { value: "8", label: "Robots Matched" },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-5">
                    <p className="text-2xl font-bold text-primary tabular-nums">{s.value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {PROCESSES.map((p) => (
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

            <div className="mt-8 flex flex-wrap justify-between gap-3">
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
                    <FactoryLayoutSvg />
                  </TabsContent>
                  <TabsContent value="flow" className="mt-4">
                    <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                      Material flow view will trace each part through the six stations with cycle time, buffer size
                      and queue points per transfer.
                    </div>
                  </TabsContent>
                  <TabsContent value="cell" className="mt-4">
                    <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                      3D cell view will show robot reach envelopes, fencing, and operator access zones for each
                      matched robot.
                    </div>
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
                    {INVENTORY.map((r) => (
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
              {ROI.map((r) => (
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
