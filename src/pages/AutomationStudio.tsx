import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { analyzeDescription } from "@/utils/processAnalyzer";
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
  Play,
  Pause,
  Box,
  Maximize2,
  RotateCcw,
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
import { FactoryLayoutSvg, MaterialFlowSvg } from "@/components/automation-studio/StudioVisualizations";
import type { VisualStation } from "@/components/automation-studio/visualTypes";

const ProcessLine3D = lazy(() => import("@/features/automation3d/ProcessLine3D"));
const RobotCell3D = lazy(() => import("@/features/automation3d/AutomationStudio3D"));
import { processKind, PROCESS_PROFILES } from "@/features/automation3d/processProfiles";
import { processToText, PRESETS } from "@/features/automation3d/robotSim.js";

const simLink = (text: string, title?: string) =>
  `/automation-studio/3d?process=${encodeURIComponent(text)}${title ? `&title=${encodeURIComponent(title)}` : ""}`;

const SimFallback = () => (
  <div className="flex h-[480px] items-center justify-center rounded-xl border border-border bg-[#1a2433] text-sm text-white/70">
    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading 3D robot cell…
  </div>
);

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
  <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
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
          {n < STEPS.length && <span className={cn("h-px w-4 sm:w-10 lg:w-20", done ? "bg-emerald-500" : "bg-border")} />}
        </div>
      );
    })}
  </div>
);

const StepShell = ({ children }: { children: React.ReactNode }) => (
  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">{children}</div>
);

/* ------------------------------ visual preview ---------------------------- */

const PREVIEW_STATIONS = [
  "S1 Loading",
  "S2 Welding",
  "S3 Finishing",
  "S4 Inspection",
  "S5 Palletizing",
  "S6 Transport",
];

const previewVisualStations: VisualStation[] = PREVIEW_STATIONS.map((label, index) => ({
  label,
  eoat: ["Vacuum Gripper", "Welding Torch", "Grinding Head", "Vision Camera", "Pallet Fork", "AMR Deck"][index],
  cycle: index === 1 ? "2.5 min" : `${3 + index} min`,
  automation: index === 2 || index === 5 ? "semi" : "full",
  model: ["KUKA KR 120", "ABB IRB 2600", "Kawasaki RS020N", "Yaskawa GP12", "FANUC M-410iC", "AMR 1500"][index],
  payload: ["120 kg", "15 kg", "20 kg", "12 kg", "315 kg", "1500 kg"][index],
  reach: ["2700 mm", "1850 mm", "1725 mm", "1440 mm", "3143 mm", "Loop route"][index],
}));

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
  const [visualTab, setVisualTab] = useState("robot");
  // -1 = the whole line with every robot; otherwise one station
  const [simIndex, setSimIndex] = useState(-1);
  const [visualPlaying, setVisualPlaying] = useState(true);
  const [visualSpeed, setVisualSpeed] = useState<"0.5" | "1" | "2">("1");
  const inputRef = useRef<HTMLInputElement>(null);

  const blueprint = getBlueprint(industry);
  const processes = useMemo(() => analyzeDescription(description, industry), [description, industry]);
  const inventory = buildInventory({ ...blueprint, processes });
  const stats = buildStats({ ...blueprint, processes });
  const stations: VisualStation[] = processes.map((process, index) => ({
    label: inventory[index]?.station ?? process.short,
    eoat: process.eoat[0],
    cycle: process.cycleTimeAutomated,
    automation: process.automation,
    model: process.robot.model,
    payload: process.robot.payload,
    reach: process.robot.reach,
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
          <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
            <div className="container mx-auto grid gap-8 px-4 py-12 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <Badge variant="secondary" className="mb-4 gap-1">
                  <Sparkles className="h-3 w-3" /> AI + 3D simulation
                </Badge>
                <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">Automation Studio</h1>
                <p className="mt-3 max-w-[60ch] text-base text-muted-foreground sm:text-lg">
                  Upload or describe your factory process. Get every station matched to a robot and tooling, a factory
                  layout, ROI, and a live 3D robot cell that runs your process before you buy anything.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button size="lg" onClick={() => navigate("/auth?redirect=/automation-studio")}>
                    Sign In to Analyze My Process <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/automation-studio/3d">
                      <Box className="mr-2 h-4 w-4" /> Try the 3D Simulator
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center lg:w-[360px]">
                {[
                  ["13", "process types simulated"],
                  ["6-axis", "robot with live IK"],
                  ["Free", "no install needed"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xl font-bold text-foreground">{v}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="container mx-auto px-4 py-10">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Live robot cell demo</h2>
                <p className="text-sm text-muted-foreground">
                  Pick a template or type your own steps. The robot runs it in real time.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/automation-studio/3d">
                  <Maximize2 className="mr-2 h-4 w-4" /> Full screen
                </Link>
              </Button>
            </div>
            <Suspense fallback={<SimFallback />}>
              <RobotCell3D variant="embedded" initialProcess={PRESETS["Painting"]} />
            </Suspense>
          </section>

          <section className="container mx-auto px-4 pb-12">
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { icon: Sparkles, title: "AI Process Analysis", body: "Share photos, videos or drawings of your line and get each station broken down into automatable steps." },
                { icon: Bot, title: "Robot & EOAT Matching", body: "Every station is matched to real robot models with payload, reach, controller and the end-of-arm tooling required." },
                { icon: Box, title: "3D Robot Cell Simulation", body: "Watch welding, painting, polishing, assembly, filling, labeling, packing and palletizing run in a live 3D cell." },
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
                <FactoryLayoutSvg stations={previewVisualStations} playing speed="1" />
              </CardContent>
            </Card>

            <div className="mt-10 text-center">
              <Button size="lg" onClick={() => navigate("/auth?redirect=/automation-studio")}>
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
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-primary">
              <Sparkles className="h-6 w-6" /> Automation Studio
            </h1>
            <p className="mt-2 text-muted-foreground">
              Upload your factory process. See the automation, robots, ROI and a live 3D robot cell before you build it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="mr-2 h-4 w-4" /> New analysis
              </Button>
            )}
            <Button asChild variant={step === 1 ? "default" : "outline"}>
              <Link to="/automation-studio/3d">
                <Box className="mr-2 h-4 w-4" /> 3D Robot Cell Simulator
              </Link>
            </Button>
          </div>
        </div>

        <Card className="mb-8">
          <CardContent className="space-y-3 p-4">
            <StepIndicator step={step} />
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

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
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to={simLink(processToText(processKind(p), p.name), p.name)}>
                        <Box className="mr-2 h-4 w-4" /> Simulate this station in 3D
                      </Link>
                    </Button>
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
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="whitespace-normal min-w-fit w-auto gap-2"
                    onClick={() => setVisualPlaying((value) => !value)}
                    aria-pressed={!visualPlaying}
                  >
                    {visualPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {visualPlaying ? "Pause" : "Play"}
                  </Button>
                  <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1" aria-label="Animation speed">
                    {(["1", "2", "0.5"] as const).map((speed) => (
                      <Button
                        key={speed}
                        type="button"
                        variant={visualSpeed === speed ? "default" : "ghost"}
                        size="sm"
                        className="h-7 min-w-10 px-2 text-xs"
                        onClick={() => setVisualSpeed(speed)}
                        aria-pressed={visualSpeed === speed}
                      >
                        {speed}x
                      </Button>
                    ))}
                  </div>
                </div>
                <Tabs value={visualTab} onValueChange={setVisualTab}>
                  <TabsList className="h-auto flex-wrap">
                    <TabsTrigger value="robot" className="gap-1.5">
                      <Box className="h-3.5 w-3.5" /> Robot Cell 3D
                    </TabsTrigger>
                    <TabsTrigger value="layout">Factory Layout</TabsTrigger>
                    <TabsTrigger value="flow">Material Flow</TabsTrigger>
                    <TabsTrigger value="cell">3D Production Line ({processes.length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="robot" className="mt-4 space-y-3">
                    {processes.length > 0 && (() => {
                      const full = simIndex < 0;
                      const current = processes[Math.min(Math.max(simIndex, 0), processes.length - 1)];
                      const kind = processKind(current);
                      const text = processToText(kind, current.name);
                      const lineHref = `/automation-studio/3d?line=${encodeURIComponent(processes.map((p) => p.name).join("|"))}`;
                      return (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm text-muted-foreground">
                              Watch your whole line with every robot, or choose one station to see it on its own.
                            </p>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={full ? lineHref : simLink(text, current.name)}>
                                <Maximize2 className="mr-2 h-4 w-4" /> Open full screen
                              </Link>
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Station to simulate">
                            <button
                              role="tab"
                              aria-selected={full}
                              onClick={() => setSimIndex(-1)}
                              className={cn(
                                "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-xs font-semibold transition-colors",
                                full ? "border-amber-500 bg-amber-500/10 text-foreground" : "border-border hover:border-amber-500/60",
                              )}
                            >
                              <Box className="h-3.5 w-3.5 text-amber-500" /> Full line (all robots)
                            </button>
                            {processes.map((p, i) => {
                              const k = processKind(p);
                              const active = !full && i === Math.min(simIndex, processes.length - 1);
                              return (
                                <button
                                  key={p.index}
                                  role="tab"
                                  aria-selected={active}
                                  onClick={() => setSimIndex(i)}
                                  className={cn(
                                    "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-xs transition-colors",
                                    active ? "border-primary bg-primary/10 text-foreground" : "border-border hover:border-primary/50",
                                  )}
                                >
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PROCESS_PROFILES[k].color }} />
                                  <span className="font-semibold">{String(i + 1).padStart(2, "0")}</span>
                                  <span className="max-w-[180px] truncate">{p.name}</span>
                                </button>
                              );
                            })}
                          </div>
                          <Suspense fallback={<SimFallback />}>
                            {full ? (
                              <RobotCell3D
                                key={`line-${processes.map((p) => p.name).join("|")}`}
                                variant="embedded"
                                showEditor={false}
                                processes={processes}
                                title="Your automated line"
                                subtitle={`${processes.length} tasks from your description · robots, tools and multitasking planned from the robot skills knowledge base`}
                              />
                            ) : (
                              <RobotCell3D
                                key={`${simIndex}-${current.name}`}
                                variant="embedded"
                                showEditor={false}
                                initialProcess={text}
                                title={`Station ${String(simIndex + 1).padStart(2, "0")}: ${current.name}`}
                                subtitle={`${PROCESS_PROFILES[kind].label} · ${current.robot.model} · ${current.eoat[0] ?? "EOAT"}`}
                              />
                            )}
                          </Suspense>
                        </>
                      );
                    })()}
                  </TabsContent>
                  <TabsContent value="layout" className="mt-4">
                    <FactoryLayoutSvg stations={stations} playing={visualPlaying} speed={visualSpeed} active={visualTab === "layout"} />
                  </TabsContent>
                  <TabsContent value="flow" className="mt-4">
                    <MaterialFlowSvg stations={stations} playing={visualPlaying} speed={visualSpeed} active={visualTab === "flow"} />
                  </TabsContent>
                  <TabsContent value="cell" className="mt-4">
                    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading 3D production line…</div>}>
                      <ProcessLine3D processes={processes} playing={visualPlaying && visualTab === "cell"} speed={visualSpeed} />
                    </Suspense>
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
