import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { analyzeDescription, processesFromSkills } from "@/utils/processAnalyzer";
import MediaAnalyzer from "@/features/automation3d/MediaAnalyzer";
import type { MediaAnalysis } from "@/features/automation3d/mediaAnalysis";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import StudioChooser from "@/components/automation/StudioChooser";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
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
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  File as FileIcon,
  Loader2,
  Check,
  ArrowLeft,
  Box,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { pushEvent } from "@/lib/analytics";
import {
  INDUSTRIES,
  buildInventory,
  getBlueprint,
} from "@/data/automationStudioIndustries";

const RobotCell3D = lazy(() => import("@/features/automation3d/AutomationStudio3D"));
import { processKind, PROCESS_PROFILES } from "@/features/automation3d/processProfiles";
import { JOB_NOTES, PLAYBOOK } from "@/features/automation3d/engineerPlaybook";
import { kitGuide } from "@/features/automation3d/jobKit";
import { processToText, PRESETS } from "@/features/automation3d/robotSim.js";
import AiSolutionPanel from "@/features/automation3d/AiSolutionPanel";
import { requestSolution, solutionProcesses, type AiSolution } from "@/features/automation3d/aiSolution";
import { engineSolution } from "@/features/automation3d/solutionEngine";
import BriefAssistant from "@/features/automation3d/BriefAssistant";
import EquipmentPicker from "@/features/automation3d/EquipmentPicker";
import { proposalHtml, proposalSummary } from "@/features/automation3d/studioProposal";
import LeadDialog from "@/components/leads/LeadDialog";
import QuickPlan from "@/features/automation3d/QuickPlan";
import AutomationDesign from "@/features/automation3d/AutomationDesign";
import { planConveyorAutomation, proposeAutomation } from "@/features/automation3d/conveyorAutomation";
import { BevelBox, ConsoleButton, ConsoleLink } from "@/components/console/ConsoleUI";
import { Eyebrow, KitButton, Readouts } from "@/features/automation3d/StudioKit";

const simLink = (text: string, title?: string) =>
  `/automation-studio/3d?process=${encodeURIComponent(text)}${title ? `&title=${encodeURIComponent(title)}` : ""}`;

const SimFallback = () => (
  <div className="flex h-[480px] items-center justify-center rounded-xl border border-border bg-[#1a2433] text-sm text-white/70">
    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading 3D robot cell…
  </div>
);

/* ---------------------------------- data --------------------------------- */

const STEPS = ["Describe the work", "We plan it", "Your plan", "See your cell"];

const ANALYSIS_MESSAGES = [
  "Analyzing uploaded images...",
  "Detecting process stations...",
  "Matching robots to processes...",
  "Selecting EOAT...",
  "Generating layout...",
  "Calculating ROI...",
];

const ROI_CARDS = [
  { field: "throughput" as const, label: "Throughput increase" },
  { field: "labor" as const, label: "Labour cost reduction" },
  { field: "payback" as const, label: "Estimated payback" },
  { field: "defect" as const, label: "Target defect rate" },
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

const ACCEPT = ".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,.pdf,.doc,.docx";

/* ------------------------------ step indicator ---------------------------- */

/** One rail of four numbered steps; finished steps can be opened again. */
const StepIndicator = ({ step, onStep }: { step: number; onStep: (n: number) => void }) => (
  <ol className="flex border-b border-border" aria-label="Progress">
    {STEPS.map((label, i) => {
      const n = i + 1;
      const done = step > n;
      const active = step === n;
      // The analysis step (2) runs on its own; the others can be revisited once reached.
      const reachable = done && n !== 2;
      const body = (
        <>
          <span
            aria-hidden
            className={cn("absolute inset-x-0 -bottom-px h-0.5 transition-colors duration-150", active ? "bg-primary" : done ? "bg-foreground/40" : "bg-transparent")}
          />
          <span className={cn("font-mono text-[11px] tabular-nums", active ? "text-primary" : "text-muted-foreground")}>
            {done ? <Check className="inline h-3.5 w-3.5 align-[-2px]" aria-label="done" /> : String(n).padStart(2, "0")}
          </span>
          <span className={cn("truncate font-mono text-[11px] uppercase tracking-[0.14em]", active ? "text-foreground" : "text-muted-foreground", !active && "hidden sm:inline")}>
            {label}
          </span>
        </>
      );
      return (
        <li key={label} className={cn("min-w-0", active ? "flex-1" : "shrink-0 sm:flex-1")}>
          {reachable ? (
            <button
              type="button"
              onClick={() => onStep(n)}
              className="relative flex w-full min-w-0 items-center gap-2.5 py-3 pl-1 pr-3 text-left transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            >
              {body}
            </button>
          ) : (
            <div className="relative flex min-w-0 items-center gap-2.5 py-3 pl-1 pr-3" aria-current={active ? "step" : undefined}>
              {body}
            </div>
          )}
        </li>
      );
    })}
  </ol>
);

const StepShell = ({ children }: { children: React.ReactNode }) => (
  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">{children}</div>
);

/* ---------------------------------- page ---------------------------------- */

/** Entry: choose "build your own cell" or "describe your job" (?mode=ai). */
export default function AutomationStudio() {
  const [params] = useSearchParams();
  return params.get("mode") === "ai" ? <AutomationStudioAI /> : <StudioChooser />;
}

function AutomationStudioAI() {
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
  const inputRef = useRef<HTMLInputElement>(null);

  const blueprint = getBlueprint(industry);
  // AI reading of uploaded photos / video: its tasks are used while the description it wrote is unchanged.
  const [media, setMedia] = useState<{ result: MediaAnalysis; frame: string; text: string } | null>(null);
  // AI solution engineer's answer for the current brief (any kind of automation work).
  const [ai, setAi] = useState<{ brief: string; solution: AiSolution | null; loading: boolean; error: string | null }>({
    brief: "", solution: null, loading: false, error: null,
  });
  const aiCurrent = ai.brief === description.trim() ? ai : null;
  const runAi = useCallback((brief: string, ind: string | null) => {
    const text = brief.trim();
    if (text.length < 8) return Promise.resolve();
    setAi({ brief: text, solution: null, loading: true, error: null });
    return requestSolution(text, ind).then(
      (solution) => setAi((cur) => (cur.brief === text ? { brief: text, solution, loading: false, error: null } : cur)),
      (e: Error) => setAi((cur) => (cur.brief === text ? { brief: text, solution: null, loading: false, error: e.message } : cur)),
    );
  }, []);
  // Built-in solution engine: instant, offline answer for the same brief.
  const engine = useMemo(() => (description.trim().length >= 8 ? engineSolution(description, industry) : null), [description, industry]);
  const processes = useMemo(() => {
    if (aiCurrent?.solution) {
      const fromAi = solutionProcesses(aiCurrent.solution);
      if (fromAi.length) return fromAi;
    }
    if (media && description === media.text) {
      const fromMedia = processesFromSkills(media.result.tasks);
      if (fromMedia.length) return fromMedia;
    }
    return analyzeDescription(description, industry);
  }, [description, industry, media, aiCurrent?.solution]);
  // The automation skills read the same brief: the conveyor automation they design runs on the 3D line's infeed.
  const autoSim = useMemo(() => {
    if (description.trim().length < 8) return null;
    const p = proposeAutomation(description);
    return p.setup ? planConveyorAutomation({ setup: p.setup, destination: p.destination, robots: p.cells.length }).sim : null;
  }, [description]);
  // A question from the plan: add it to the brief and go back to step 1 for the user to answer.
  const askInBrief = (q: string) => {
    setDescription((d) => `${d.trim()} ${q} Answer: `);
    setStep(1);
    window.setTimeout(() => {
      const el = document.getElementById("as-description") as HTMLTextAreaElement | null;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
    }, 50);
  };
  const inventory = buildInventory({ ...blueprint, processes });
  const roiCards = ROI_CARDS.map((c) => ({ ...c, value: blueprint.roi[c.field] }));
  // The end of the study: talk to an engineer, ask for a quote, or print the proposal.
  const [lead, setLead] = useState<"engineer" | "quote" | null>(null);
  const proposal = { brief: description, industry: blueprint, processes, inventory };
  const printProposal = () => {
    const w = window.open("", "_blank");
    if (!w) return toast({ title: "Allow pop-ups to download the proposal", description: "Your browser blocked the proposal window." });
    w.document.write(proposalHtml(proposal));
    w.document.close();
    pushEvent("studio_proposal_download", { industry: blueprint.label, stations: processes.length });
  };

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const next = Array.from(incoming).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setFiles((prev) => [...prev, ...next]);
  }, []);

  // Step 2: the AI solution engineer designs the solution for the brief; the
  // skills-library plan is the fallback if it is slow or unavailable.
  useEffect(() => {
    if (step !== 2) return;
    setMsgIndex(0);
    let live = true;
    const interval = window.setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, ANALYSIS_MESSAGES.length - 1));
    }, 1300);
    const started = Date.now();
    const finish = () => {
      if (!live) return;
      // Keep the analysis screen up for a moment so the steps read naturally.
      window.setTimeout(() => {
        if (!live) return;
        setStep(3);
        // Conversion event: a visitor reached a finished plan.
        pushEvent("studio_plan_complete", { industry: industry ?? "general", brief_length: description.trim().length });
      }, Math.max(0, 2500 - (Date.now() - started)));
    };
    const cap = window.setTimeout(finish, 45000);
    const text = description.trim();
    if (text.length >= 8) {
      const ready = ai.brief === text && (ai.solution || ai.loading);
      (ready && ai.solution ? Promise.resolve() : runAi(text, industry)).finally(finish);
    } else window.setTimeout(finish, 6000);
    return () => {
      live = false;
      window.clearInterval(interval);
      window.clearTimeout(cap);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const reset = () => {
    setStep(1);
    setFiles([]);
    setDescription("");
    setIndustry(null);
  };

  /* ---------------------------- unauthenticated ---------------------------- */

  if (!user) {
    const signIn = "/auth?redirect=" + encodeURIComponent("/automation-studio?mode=ai");
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <main>
          {/* Value first: the free plan is the hero; sign-in comes after the visitor has seen it work. */}
          <section className="border-b border-border">
            {/* Phones: headline, then the free plan, then the details. Wide screens: plan on the right. */}
            <div className="container mx-auto grid gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:gap-y-0 lg:py-16">
              <div className="lg:col-start-1 lg:row-start-1">
                <Eyebrow index="002" label="Describe your job" />
                <h1 className="mt-6 max-w-[16ch] text-balance text-4xl font-semibold uppercase leading-[1.02] tracking-[-0.02em] md:text-[52px]">
                  A robot cell plan for your job
                </h1>
                <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted-foreground md:text-lg">
                  Describe the work in plain words. The studio sizes every robot and tool, checks safety and payback, and builds the line in 3D.
                </p>
              </div>
              <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
                <QuickPlan onSignIn={() => navigate(signIn)} />
              </div>
              <div className="lg:col-start-1 lg:row-start-2">
                <ol className="max-w-md border-t border-border lg:mt-8">
                  {["Stations, robot sizes and tools", "Safety level, layout and risks", "Budget, payback and a live 3D line"].map((x, i) => (
                    <li key={x} className="flex items-baseline gap-4 border-b border-border py-3 text-sm">
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      {x}
                    </li>
                  ))}
                </ol>
                <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                  <ConsoleLink to={signIn}>Sign in for the full plan</ConsoleLink>
                  <ConsoleLink to="/automation-studio/build">Build a cell yourself</ConsoleLink>
                </div>
              </div>
            </div>
          </section>

          <section className="container mx-auto px-4 py-14">
            <Eyebrow index="003" label="Live demo" />
            <div className="mt-6 mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold uppercase tracking-[-0.01em] md:text-3xl">Watch a robot cell run</h2>
                <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">Pick a job or type your own steps. The robot plans and runs it in real time.</p>
              </div>
              <ConsoleLink to="/automation-studio/3d">Full screen</ConsoleLink>
            </div>
            <Suspense fallback={<SimFallback />}>
              <RobotCell3D variant="embedded" initialProcess={PRESETS["Painting"]} />
            </Suspense>
          </section>

          <section className="border-t border-border">
            <div className="container mx-auto px-4 py-14">
              <Eyebrow index="004" label="Signed in, you also get" />
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Photos and video", "Upload pictures of the manual work; the studio reads the steps from them."],
                  ["The engineer's plan", "Decision matrix, motion check, line balance, ISO 13849 safety level and FMEA."],
                  ["Real robots and tools", "Each station matched to robots and tools from the marketplace and Directory."],
                  ["Quote and proposal", "A printable proposal, and a quote from engineers and matched sellers."],
                ].map(([title, body], i) => (
                  <BevelBox key={title} cut={12} innerClassName="p-5">
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="mt-6 text-base font-semibold uppercase tracking-[-0.005em]">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </BevelBox>
                ))}
              </div>
              <div className="mt-10">
                <ConsoleButton to={signIn}>Sign in to plan your cell</ConsoleButton>
              </div>
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
        <header className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Eyebrow index="002" label="Automation Studio · plan a cell" rule={false} />
            <h1 className="mt-4 text-3xl font-semibold uppercase leading-[1.05] tracking-[-0.02em] md:text-4xl">
              {step === 1 ? "Describe the work" : step === 2 ? "Planning your cell" : step === 3 ? "Your automation plan" : "Your cell in 3D"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {step > 1 && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> New analysis
              </button>
            )}
            <ConsoleLink to="/automation-studio/3d">3D simulator</ConsoleLink>
          </div>
        </header>

        <div className="mb-8">
          <StepIndicator step={step} onStep={setStep} />
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <StepShell>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
              <BevelBox cut={14} innerClassName="p-5 sm:p-6">
                <Eyebrow index="01" label="The job" />
                <label htmlFor="as-description" className="mt-5 block text-lg font-semibold leading-snug">
                  What does the operator do today?
                </label>
                <p className="mt-1 max-w-[65ch] text-sm text-muted-foreground">
                  The part and its weight, each step, and how many a day or an hour. Plain words are fine.
                </p>
                <Textarea
                  id="as-description"
                  rows={7}
                  placeholder={blueprint.placeholder}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-3 resize-y rounded-none text-base sm:text-sm"
                />
                <BriefAssistant value={description} onChange={setDescription} />

                <div className="mt-6 border-t border-border pt-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Photos, video or drawings · optional</p>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Add photos, a video or drawings of the work"
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
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), inputRef.current?.click())}
                    className={cn(
                      "mt-3 flex cursor-pointer items-center gap-4 border border-dashed p-4 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/30",
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-border text-muted-foreground">
                      <Upload className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 text-sm">
                      <span className="font-medium">Drop files here, or click to choose</span>
                      <span className="block text-xs text-muted-foreground">The studio reads the manual steps from photos and video · JPG, PNG, MP4, PDF, DOCX</span>
                    </span>
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
                    <ul className="mt-3 border-t border-border">
                      {files.map((f) => {
                        const Icon = fileIcon(f.file.type);
                        return (
                          <li key={f.id} className="flex items-center gap-3 border-b border-border py-2">
                            {f.preview ? (
                              <img src={f.preview} alt="" className="h-10 w-10 object-cover" />
                            ) : (
                              <span className="flex h-10 w-10 items-center justify-center bg-muted text-muted-foreground">
                                <Icon className="h-4 w-4" />
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{f.file.name}</span>
                              <span className="font-mono text-[11px] text-muted-foreground">{formatSize(f.file.size)}</span>
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
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

                  {files.some((f) => f.file.type.startsWith("image/") || f.file.type.startsWith("video/")) && (
                    <div className="mt-4 border-l-2 border-primary bg-primary/5 p-3">
                      <p className="mb-2 text-sm font-medium">Let the studio read the steps from your photos or video</p>
                      <MediaAnalyzer
                        files={files.map((f) => f.file)}
                        onResult={(result, frames) => {
                          const text = result.description || result.summary;
                          setDescription(text);
                          setMedia({ result, frame: frames[0], text });
                          toast({
                            title: "Photo / video analysed",
                            description: `${result.tasks.length} robot task${result.tasks.length === 1 ? "" : "s"} found. Click "Analyze my process" to continue.`,
                          });
                        }}
                      />
                    </div>
                  )}
                </div>
              </BevelBox>

              <div className="lg:sticky lg:top-28">
                <BevelBox cut={14} innerClassName="p-5">
                  <Eyebrow index="02" label="Industry · optional" />
                  <ul className="mt-4 border-t border-border" role="list">
                    {INDUSTRIES.map((ind, i) => {
                      const on = industry === ind.key;
                      return (
                        <li key={ind.key}>
                          <button
                            type="button"
                            onClick={() => setIndustry(on ? null : ind.key)}
                            aria-pressed={on}
                            className={cn(
                              "relative flex w-full items-center gap-3 border-b border-border py-2.5 pl-3 pr-2 text-left text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                              on ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                            )}
                          >
                            <span aria-hidden className={cn("absolute inset-y-0 left-0 w-0.5", on ? "bg-primary" : "bg-transparent")} />
                            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                            <span className="flex-1">{ind.label}</span>
                            {on && <Check className="h-4 w-4 text-primary" aria-hidden />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">Adds that industry's rules: hygiene, cleanroom, dust, heat, standards.</p>
                  <KitButton
                    className="mt-5 w-full [&>span]:w-full"
                    onClick={() => setStep(2)}
                    disabled={description.trim().length < 8 && !industry}
                    aria-describedby="analyze-hint"
                  >
                    Analyze my process
                  </KitButton>
                  <p id="analyze-hint" className="mt-2 text-xs text-muted-foreground">
                    {description.trim().length < 8 && !industry ? "Describe the work (a sentence is enough) or choose an industry." : "Takes about ten seconds."}
                  </p>
                </BevelBox>
              </div>
            </div>
          </StepShell>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <StepShell>
            <BevelBox cut={14} className="mx-auto max-w-3xl" innerClassName="p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
                <Eyebrow label="Analysis log · RobotVerse solution engine + AI" />
              </div>
              <p className="mt-5 text-xl font-semibold leading-snug" aria-live="polite">
                {engine?.reasoning?.length ? "Designing your automation solution…" : ANALYSIS_MESSAGES[msgIndex]}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Usually a few seconds. Keep this page open.</p>
              {engine?.reasoning?.length ? (
                <ol className="mt-6 border-t border-border">
                  {engine.reasoning.slice(0, Math.min(engine.reasoning.length, msgIndex * 2 + 2)).map((r, i) => (
                    <li key={i} className="grid grid-cols-[2rem_1fr] gap-x-2 border-b border-border py-2.5 text-sm animate-in fade-in duration-200 motion-reduce:animate-none">
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      <span className="min-w-0">
                        <span className="font-medium">{r.title}</span>
                        <span className="block text-muted-foreground">{r.detail}</span>
                      </span>
                    </li>
                  ))}
                  <li className="flex items-center gap-2 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-primary">
                    <span aria-hidden className="h-1.5 w-1.5 animate-pulse bg-primary motion-reduce:animate-none" /> AI engineer refining the design for your brief
                  </li>
                </ol>
              ) : (
                <ol className="mt-6 border-t border-border">
                  {ANALYSIS_MESSAGES.map((m, i) => (
                    <li key={m} className="flex items-center gap-3 border-b border-border py-2.5 text-sm">
                      <span className="w-5 font-mono text-[11px] tabular-nums text-muted-foreground">
                        {i < msgIndex ? <Check className="h-3.5 w-3.5 text-success" aria-label="done" /> : String(i + 1).padStart(2, "0")}
                      </span>
                      <span className={i <= msgIndex ? "text-foreground" : "text-muted-foreground"}>{m}</span>
                    </li>
                  ))}
                </ol>
              )}
            </BevelBox>
          </StepShell>
        )}

        {/* Step 3 */}
        {step === 3 && (() => {
          // Figures from this brief's own plan (AI engineer, else the built-in engine) — never fixed numbers.
          const sol = aiCurrent?.solution ?? engine;
          const cr = (v: number) => (v >= 1e7 ? `₹${(v / 1e7).toFixed(2)} Cr` : `₹${Math.round(v / 1e5)} L`);
          const weeks = sol
            ? sol.implementation
                .map((ph) => (ph.weeks.match(/\d+/g) ?? []).map(Number))
                .reduce(([lo, hi], w) => [lo + (w[0] ?? 0), hi + (w[w.length - 1] ?? 0)], [0, 0])
            : [0, 0];
          const numbers: [string, string][] = sol
            ? [
                ["Investment", sol.budget_inr.low && sol.budget_inr.high ? `${cr(sol.budget_inr.low)} – ${cr(sol.budget_inr.high)}` : "On quotation"],
                ["Payback", sol.roi.payback_months ? (/month/i.test(sol.roi.payback_months) ? sol.roi.payback_months : `${sol.roi.payback_months} months`) : "—"],
                ["Throughput", [sol.throughput.target, sol.throughput.takt_s ? `takt ${sol.throughput.takt_s} s` : ""].filter(Boolean).join(" · ") || "—"],
                ["Labour", sol.roi.labour_saved || "—"],
                ["Quality", sol.roi.quality_gain || "—"],
                ["Timeline", weeks[1] ? `${weeks[0]}–${weeks[1]} weeks to production` : "—"],
              ]
            : [];
          const full = processes.filter((x) => x.automation === "full").length;
          const robots = new Set(processes.map((x) => x.robot.model)).size;
          return (
            <StepShell>
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
                {/* The plan at a glance and the next step: first on phones, beside the plan on wide screens. */}
                <aside className="lg:sticky lg:top-28 lg:order-last" aria-label="Plan summary">
                  <BevelBox cut={14} innerClassName="p-5">
                    <Eyebrow label="Plan summary" />
                    {numbers.length > 0 && (
                      <dl className="mt-4 border-t border-border">
                        {numbers.map(([label, value]) => (
                          <div key={label} className="border-b border-border py-2.5">
                            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
                            <dd className="mt-0.5 text-sm font-medium leading-snug">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <KitButton className="mt-5 w-full [&>span]:w-full" onClick={() => setStep(4)}>
                      See your cell in 3D
                    </KitButton>
                    <KitButton variant="outline" className="mt-2 w-full [&>span]:w-full" onClick={() => setLead("quote")}>
                      Get a quote
                    </KitButton>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.14em]">
                      <button type="button" onClick={() => setStep(1)} className="text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        Edit the brief
                      </button>
                      <Link to="/ai-assistant" className="text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        Ask RobotVerse AI
                      </Link>
                    </div>
                    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Indicative figures for this brief. An engineer confirms them with a site visit and supplier quotes.</p>
                  </BevelBox>
                </aside>

                <div className="min-w-0 space-y-10">
                  {description.trim().length >= 8 && (
                    <AiSolutionPanel
                      solution={aiCurrent?.solution ?? null}
                      fallback={engine}
                      loading={aiCurrent?.loading}
                      error={aiCurrent?.error ?? (!aiCurrent ? "The brief changed since the last analysis." : null)}
                      onRetry={() => runAi(description, industry)}
                      onBuild={() => {
                        setSimIndex(-1);
                        setVisualTab("robot");
                        setStep(4);
                      }}
                      onAsk={askInBrief}
                    />
                  )}
                  {description.trim().length >= 8 && <AutomationDesign text={description} onAsk={askInBrief} />}
                  {(sol?.stations.length ?? 0) > 0 && <EquipmentPicker key={description.trim()} stations={sol!.stations} briefKey={description.trim()} />}

                  {/* Each station today and with a robot. */}
                  <section aria-label="Today and with robots">
                    <Eyebrow index={String(processes.length).padStart(2, "0")} label="Today and with robots" />
                    <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {full} fully automatable · {processes.length - full} semi · {robots} robot model{robots === 1 ? "" : "s"} matched
                    </p>
                    <ol className="mt-4 border-t border-border">
                      {processes.map((p) => (
                        <li key={p.index} className="border-b border-border py-5">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                            <p className="font-semibold">
                              <span className="mr-2 font-mono text-[11px] font-normal tabular-nums text-muted-foreground">{p.index}</span>
                              {p.name}
                            </p>
                            <div className="flex items-center gap-4">
                              <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                <span aria-hidden className={cn("h-1.5 w-1.5", p.automation === "full" ? "bg-success" : "bg-warning")} />
                                {p.automation === "full" ? "Fully automatable" : "Semi-automatable"}
                              </span>
                              <Link
                                to={simLink(processToText(processKind(p), p.name), p.name)}
                                className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                Simulate in 3D
                              </Link>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-x-8 gap-y-3 md:grid-cols-2">
                            {(
                              [
                                ["Today", p.current, "bg-muted-foreground/50"],
                                ["With a robot", p.automated, "bg-primary"],
                              ] as const
                            ).map(([label, items, bullet]) => (
                              <div key={label}>
                                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
                                <ul className="mt-1.5 space-y-1 text-sm">
                                  {items.map((x) => (
                                    <li key={x} className="flex gap-2.5">
                                      <span aria-hidden className={cn("mt-2 h-1 w-1 shrink-0", bullet)} />
                                      <span className={label === "Today" ? "text-muted-foreground" : ""}>{x}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                          <dl className="mt-4 grid gap-x-8 gap-y-2 text-xs sm:grid-cols-3">
                            <div>
                              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Cycle</dt>
                              <dd className="mt-0.5 tabular-nums">
                                {p.cycleTimeCurrent} → <span className="font-medium">{p.cycleTimeAutomated}</span> <span className="text-success">{p.cycleImprovement}</span>
                              </dd>
                            </div>
                            <div>
                              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Safety risk</dt>
                              <dd className="mt-0.5">
                                <span className={p.safetyRiskCurrent === "High" ? "text-destructive" : p.safetyRiskCurrent === "Medium" ? "text-warning" : ""}>{p.safetyRiskCurrent}</span> →{" "}
                                <span className="font-medium text-success">{p.safetyRiskAutomated}</span>
                              </dd>
                            </div>
                            <div>
                              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Typical robot</dt>
                              <dd className="mt-0.5">
                                <span className="font-medium">{p.robot.model}</span> <span className="text-muted-foreground">· {p.robot.payload} · {p.robot.reach}</span>{" "}
                                {/* An example model for this station, not stock on hand: link to live listings. */}
                                <Link
                                  to={`/robots?search=${encodeURIComponent(p.robot.model.replace(/^(FANUC|ABB|KUKA|Yaskawa|Kawasaki)\s+/i, ""))}`}
                                  className="whitespace-nowrap text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                  Find used / new
                                </Link>
                              </dd>
                            </div>
                          </dl>
                          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                            <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Tooling</span> {p.eoat.join(" · ")} ·{" "}
                            <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Integration</span> {p.integrationNote}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
              </div>
            </StepShell>
          );
        })()}

        {/* Step 4 */}
        {step === 4 && (
          <StepShell>
            <section aria-label="Automation preview">
                <Eyebrow index="01" label="Four views of the same line" />
                <p className="mt-3 max-w-[75ch] text-sm text-muted-foreground">
                  The same robots, stations and conveyors seen as working cells, as a floor plan, as the material path and as the full production line.
                </p>
                <Tabs value={visualTab} onValueChange={setVisualTab} className="mt-4">
                  <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
                    {(
                      [
                        ["robot", "Robot cell 3D"],
                        ["layout", "Factory layout"],
                        ["flow", "Material flow"],
                        ["cell", `Production line (${processes.length})`],
                      ] as const
                    ).map(([v, label]) => (
                      <TabsTrigger
                        key={v}
                        value={v}
                        className="relative shrink-0 rounded-none px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors duration-150 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-transparent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:bg-primary"
                      >
                        {label}
                      </TabsTrigger>
                    ))}
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
                          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                            <p className="max-w-[75ch] text-sm text-muted-foreground">
                              Watch the whole line, or choose one station to see it on its own.
                              {autoSim && " The infeed runs the conveyor automation designed from your words: sensors, PLC handshake and grip check are live in the I/O panel."}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                              <ConsoleLink to={full ? lineHref : simLink(text, current.name)}>Full screen</ConsoleLink>
                              <ConsoleButton to={`/automation-studio/build#job=${encodeURIComponent(processes.slice(0, 6).map((p) => p.name).join("|"))}`}>
                                Build it with real robots
                              </ConsoleButton>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Station to simulate">
                            <button
                              role="tab"
                              aria-selected={full}
                              onClick={() => setSimIndex(-1)}
                              className={cn(
                                "flex items-center gap-2 border px-3 py-2 text-left text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                full ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground",
                              )}
                            >
                              <Box className="h-3.5 w-3.5" aria-hidden /> Full line · all robots
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
                                    "flex items-center gap-2 border px-3 py-2 text-left text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                    active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground",
                                  )}
                                >
                                  <span aria-hidden className="h-1.5 w-1.5" style={{ backgroundColor: PROCESS_PROFILES[k].color }} />
                                  <span className="font-mono tabular-nums">{String(i + 1).padStart(2, "0")}</span>
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
                                description={description.trim() || undefined}
                                referenceImage={media?.frame}
                                mediaAnalysis={media && description === media.text ? media.result : null}
                                automation={autoSim}
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
                          {!full && (
                            <div className="border border-border p-5">
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">How an engineer thinks about this station</p>
                                <span className="text-xs tabular-nums text-muted-foreground">
                                  typical cycle {PLAYBOOK[kind].cycle[0]}–{PLAYBOOK[kind].cycle[1]} s
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">{PLAYBOOK[kind].key}</p>
                              <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
                                {(
                                  [
                                    ["Ask first", PLAYBOOK[kind].ask],
                                    ["Rules of thumb", PLAYBOOK[kind].rules],
                                    ["Around the robot", PLAYBOOK[kind].around],
                                  ] as const
                                ).map(([t, items]) => (
                                  <div key={t} className="border-t border-border pt-3">
                                    <p className="font-semibold">{t}</p>
                                    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-muted-foreground">
                                      {items.map((x) => (
                                        <li key={x}>{x}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                              {JOB_NOTES[current.name] && (
                                <p className="mt-3 text-xs">
                                  <b>For {current.name.toLowerCase()}:</b> <span className="text-muted-foreground">{JOB_NOTES[current.name].join(". ")}.</span>
                                </p>
                              )}
                              {(() => {
                                // Everything besides the robot: tool, accessories, components, other equipment and software.
                                const g = kitGuide(current.name);
                                const rows: [string, string[]][] = [["Tool", [g.tool]], ["Accessories", g.accessories], ["Components", g.components], ["Also needed", g.also], ["Software", g.software]];
                                return (
                                  <dl className="mt-3 space-y-1 text-xs">
                                    {rows
                                      .filter(([, v]) => v.length)
                                      .map(([k, v]) => (
                                        <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-2">
                                          <dt className="font-semibold">{k}</dt>
                                          <dd className="text-muted-foreground">{v.join(" · ")}</dd>
                                        </div>
                                      ))}
                                  </dl>
                                );
                              })()}
                              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                                <Link to={`/automation-studio/build#job=${encodeURIComponent(current.name)}`} className="font-medium text-primary hover:underline">
                                  Build this cell with real robots →
                                </Link>
                                <Link to="/automation-studio/playbook" className="text-muted-foreground hover:text-primary hover:underline">
                                  Full engineer's playbook
                                </Link>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </TabsContent>
                  {(
                    [
                      ["layout", "layout", "top", "Factory layout", "Floor plan of your line: robot zones, operator aisle, material in/out and overall dimensions"],
                      ["flow", "flow", "iso", "Material flow", "The path each part takes from raw material in, through every robot, to finished goods out"],
                      ["cell", "none", "iso", "3D production line", `${processes.length} tasks · every robot running its cycle on one line`],
                    ] as const
                  ).map(([tab, overlay, view, title, subtitle]) => (
                    <TabsContent key={tab} value={tab} className="mt-4">
                      {processes.length > 0 && (
                        <Suspense fallback={<SimFallback />}>
                          <RobotCell3D
                            key={`${tab}-${processes.map((p) => p.name).join("|")}`}
                            variant="embedded"
                            showEditor={false}
                            processes={processes}
                            description={description.trim() || undefined}
                            referenceImage={media?.frame}
                            mediaAnalysis={media && description === media.text ? media.result : null}
                            automation={autoSim}
                            overlay={overlay}
                            initialView={view}
                            title={title}
                            subtitle={subtitle}
                          />
                        </Suspense>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
            </section>

            <section aria-label="Robots needed" className="mt-12">
              <Eyebrow index="02" label="Robots needed · typical models" />
              <div className="mt-4 overflow-x-auto border border-border">
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
              </div>
            </section>

            <section aria-label="Typical results" className="mt-12">
              <Eyebrow index="03" label={`Typical results in ${blueprint.label.toLowerCase()}`} />
              <Readouts className="mt-4" items={roiCards.map((r) => ({ label: r.label, value: r.value }))} />
            </section>

            {/* Next steps: one primary action, the rest quieter. */}
            <section aria-label="Next steps" className="mt-12">
              <BevelBox cut={14} innerClassName="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
                <div className="max-w-[60ch]">
                  <Eyebrow index="04" label="Next step" rule={false} />
                  <p className="mt-3 text-lg font-semibold leading-snug">Get robots, tooling and an integration price for this line</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    A conceptual plan, not an engineering design: an engineer checks it against your parts, site and ISO 10218 safety before any quote.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-3">
                  <KitButton onClick={() => setLead("quote")}>Get a quote for this cell</KitButton>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.14em]">
                    <button type="button" onClick={printProposal} className="text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      Download proposal
                    </button>
                    <button type="button" onClick={() => setLead("engineer")} className="text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      Talk to an engineer
                    </button>
                    <Link to="/ai-assistant" className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      Ask RobotVerse AI
                    </Link>
                  </div>
                </div>
              </BevelBox>
            </section>

            <div className="mt-8 flex flex-wrap justify-between gap-x-6 gap-y-3 font-mono text-[11px] uppercase tracking-[0.14em]">
              <button type="button" onClick={() => setStep(3)} className="inline-flex items-center gap-2 text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to the plan
              </button>
              <button type="button" onClick={reset} className="text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                Start a new analysis
              </button>
            </div>
          </StepShell>
        )}

        {/* Quote and engineer requests, from the plan or the 3D step. */}
        <LeadDialog
          open={lead !== null}
          onOpenChange={(o) => !o && setLead(null)}
          kind={lead ?? "engineer"}
          source="automation-studio"
          title={lead === "quote" ? "Get a quote for this cell" : "Talk to an automation engineer"}
          intro={
            lead === "quote"
              ? "We send the plan to our engineers and matched sellers, and come back with robots, tooling and an integration price."
              : "An automation engineer reviews this plan with you on WhatsApp or a call — free."
          }
          item={{ type: "automation_plan", name: `${blueprint.label} automation plan · ${processes.length} station${processes.length === 1 ? "" : "s"}` }}
          details={proposalSummary(proposal)}
          action={lead === "quote" ? "Request quote" : "Request a call"}
        />
      </main>
      <Footer />
    </div>
  );
}
