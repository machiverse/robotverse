import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { BevelBox, ConsoleButton, ConsoleLink } from "@/components/console/ConsoleUI";
import { PixelArrow } from "@/components/hero/HeroConsole";
import { BLOCKS } from "@/features/automation3d/ProcessBuilder";
import { Eyebrow, KitButton, Readouts } from "@/features/automation3d/StudioKit";
import { cn } from "@/lib/utils";

/* The pictures on this page are stills from the studio's own 3D simulator (public/automation-studio). */
const LiveCell = lazy(() => import("@/features/automation3d/LiveCell"));

/** The line in the hero still; "Run it live" starts the same line from the same camera. */
const HERO = {
  jobs: ["MIG/MAG Welding", "Painting & Coating", "Palletizing"],
  camera: { position: [-1.6, 1.8, 3.3] as [number, number, number], target: [1.9, 0.85, -0.2] as [number, number, number] },
};

/* ---------------------------------------------------------------- content */

const PATHS = [
  {
    to: "/automation-studio/build",
    tag: "Build",
    eyebrow: "You know the robot",
    title: "Build it yourself",
    line: "Pick real robots and tools from the marketplace and Directory, place the cell equipment, and watch the program run.",
    image: "/automation-studio/build.webp",
    alt: "A cobot cell with an infeed conveyor, work table and pallet, built in the studio",
    steps: ["Drag a robot onto the floor", "Add its gripper, torch or tool", "Choose the job and run it in 3D"],
    cta: "Start building",
  },
  {
    to: "/automation-studio?mode=ai",
    tag: "Plan",
    eyebrow: "Not sure where to start",
    title: "Describe your job",
    line: "Tell us how the work is done today. We size the robots, tools, safety and budget, then build the cell.",
    image: "/automation-studio/plan.webp",
    alt: "A robot line laid out on the factory floor with its zones, aisle and dimensions",
    steps: ["Describe the work in plain words", "Get the engineering plan", "See your line in 3D"],
    cta: "Describe my job",
  },
] as const;

/** Jobs as the simulator shows them: each opens that job, live, in the 3D simulator. */
const SHOWCASE = [
  {
    job: "MIG/MAG Welding",
    title: "Arc welding",
    line: "Torch, wire feed and seam on a steel bracket, in a fenced cell.",
    image: "/automation-studio/job-weld.webp",
  },
  {
    job: "Fruit & Vegetable Picking",
    title: "Fruit picking",
    line: "A gentle gripper places apples into a field crate on a pallet.",
    image: "/automation-studio/job-fruit.webp",
  },
  {
    job: "Palletizing",
    title: "Palletizing",
    line: "Cartons stacked layer by layer, ready for the stretch wrapper.",
    image: "/automation-studio/job-pallet.webp",
  },
  {
    job: "CNC Machining",
    motion: "overhead",
    title: "Overhead track",
    line: "One robot hangs from a rail and tends two CNC machines.",
    image: "/automation-studio/job-overhead.webp",
  },
] as const;

const FACTS = [
  { label: "Robot models", value: "1,500+" },
  { label: "End-of-arm tools", value: "250" },
  { label: "Ready jobs", value: String(BLOCKS.length) },
  { label: "3D cell", value: "Live · free" },
];

const simHref = (job: string, motion?: string) =>
  `/automation-studio/3d?line=${encodeURIComponent(job)}${motion ? `&motion=${motion}` : ""}`;

/* ---------------------------------------------------------------- stage */

/** The hero: a still of a real line from the simulator, which turns into the running simulator in place. */
function Stage() {
  const [live, setLive] = useState(false);
  const chip = "rounded-[3px] bg-black/55 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm";
  const caption = live
    ? "Drag to look around, scroll to zoom. Every move is planned by the simulator, not animated by hand."
    : "Two cobots share a line: the first welds the part, the second coats it and stacks it on a pallet.";
  return (
    <figure>
      <BevelBox console cut={16} innerClassName="relative">
        <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[16/9] lg:aspect-[12/5]">
          <img
            src="/automation-studio/hero.webp"
            alt="Two cobots in a welding and palletizing line, in the studio's 3D factory"
            width={1920}
            height={800}
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-[40%_55%]"
          />
          {live && (
            <Suspense fallback={null}>
              <LiveCell jobs={HERO.jobs} camera={HERO.camera} className="absolute inset-0" />
            </Suspense>
          )}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 sm:left-4 sm:top-4">
            <span className={cn(chip, "inline-flex items-center gap-2")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-emerald-400" : "bg-white/60")} />
              {live ? "Live 3D" : "Studio render"}
            </span>
            <span className={cn(chip, "hidden sm:inline")}>Weld → Coat → Pallet</span>
          </div>
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-3 sm:inset-x-4 sm:bottom-4">
            {/* Over the picture on wider screens; below it on phones, where it would cover the robots. */}
            <p aria-hidden className="hidden max-w-[46ch] text-sm leading-snug text-white/85 sm:block">
              {caption}
            </p>
            {live ? (
              <KitButton variant="outline" size="sm" arrow={false} className="pointer-events-auto" onClick={() => setLive(false)}>
                Stop live view
              </KitButton>
            ) : (
              <KitButton size="sm" className="pointer-events-auto" onClick={() => setLive(true)} aria-label="Run this line live in 3D">
                Run it live
              </KitButton>
            )}
          </div>
        </div>
      </BevelBox>
      <figcaption className="mt-3 text-sm leading-snug text-muted-foreground sm:sr-only">{caption}</figcaption>
    </figure>
  );
}

/* ---------------------------------------------------------------- page */

/** Automation Studio entry: build a cell yourself, or describe the job and let us design it. */
export default function StudioChooser() {
  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <main className="container mx-auto max-w-6xl px-4 pb-20">
        <header className="grid gap-6 pb-8 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12">
          <div>
            <Eyebrow index="001" label="Automation Studio" />
            <h1 className="mt-6 max-w-[18ch] text-balance text-4xl font-semibold uppercase leading-[1.02] tracking-[-0.02em] text-foreground md:text-[56px]">
              See your robot cell before you buy it
            </h1>
            <p className="mt-4 max-w-[58ch] text-base leading-relaxed text-muted-foreground md:text-lg">
              Real robots, real tools and the parts they handle, running in a 3D factory. Build the cell yourself or describe the job, and get the robots and budget behind it.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 lg:pb-1">
            <ConsoleButton to="/automation-studio/build">Start building</ConsoleButton>
            <ConsoleLink to="/automation-studio?mode=ai">Describe my job</ConsoleLink>
          </div>
        </header>

        <Stage />

        <Readouts items={FACTS} className="mt-6" />

        <section className="mt-16 sm:mt-20" aria-labelledby="ways-in">
          <Eyebrow index="002" label="Two ways in" />
          <h2 id="ways-in" className="sr-only">
            Choose how to start
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {PATHS.map((p, i) => (
              <Link
                key={p.to}
                to={p.to}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                <BevelBox cut={14} innerClassName="flex flex-col">
                  <div className="relative aspect-[16/8] overflow-hidden border-b border-border bg-muted">
                    <img
                      src={p.image}
                      alt={p.alt}
                      width={1200}
                      height={600}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.02]"
                    />
                    <span className="absolute left-3 top-3 rounded-[3px] bg-black/55 px-2 py-1 font-mono text-[10px] tabular-nums text-white/90 backdrop-blur-sm">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="absolute right-3 top-3 rounded-[3px] bg-black/55 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
                      {p.tag}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{p.eyebrow}</p>
                    <h3 className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[-0.01em]">{p.title}</h3>
                    <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">{p.line}</p>
                    <ol className="mt-5 border-t border-border">
                      {p.steps.map((step, n) => (
                        <li key={step} className="flex items-baseline gap-4 border-b border-border py-2.5 text-sm">
                          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{String(n + 1).padStart(2, "0")}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                    <span className="mt-6 inline-flex items-center gap-2.5 self-start font-mono text-xs uppercase tracking-[0.16em] text-primary">
                      <PixelArrow />
                      {p.cta}
                    </span>
                  </div>
                </BevelBox>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-16 sm:mt-20" aria-labelledby="jobs-in-3d">
          <Eyebrow index="003" label="Jobs in 3D" />
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="jobs-in-3d" className="text-balance text-2xl font-semibold uppercase leading-tight tracking-[-0.01em] md:text-[32px]">
                Every job with its real tools and parts
              </h2>
              <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                {BLOCKS.length} jobs, each with the gripper, torch or head it really uses and the product it really handles. Open one and it runs.
              </p>
            </div>
            <ConsoleLink to="/automation-studio/3d">Open the simulator</ConsoleLink>
          </div>
          <ul className="-mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
            {SHOWCASE.map((s) => (
              <li key={s.title} className="w-[78%] shrink-0 snap-start sm:w-auto">
                <Link
                  to={simHref(s.job, "motion" in s ? s.motion : undefined)}
                  className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                >
                  <BevelBox cut={10} innerClassName="flex h-full flex-col">
                    <div className="relative aspect-[3/2] overflow-hidden bg-muted">
                      <img
                        src={s.image}
                        alt={`${s.title}: ${s.line}`}
                        width={1200}
                        height={800}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="flex flex-1 flex-col border-t border-border p-4">
                      <h3 className="text-[15px] font-semibold uppercase tracking-[-0.005em]">{s.title}</h3>
                      <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{s.line}</p>
                      <span className="mt-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
                        <PixelArrow />
                        Run in 3D
                      </span>
                    </div>
                  </BevelBox>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <nav aria-label="More in the studio" className="mt-14 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:gap-10">
          <ConsoleLink to="/automation-studio/3d">Type your steps into the 3D simulator</ConsoleLink>
          <ConsoleLink to="/automation-studio/playbook">How an automation engineer thinks</ConsoleLink>
        </nav>
      </main>
      <Footer />
    </div>
  );
}
