import { Link } from "react-router-dom";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { BevelBox, ConsoleLink } from "@/components/console/ConsoleUI";
import { PixelArrow } from "@/components/hero/HeroConsole";
import { BLOCKS } from "@/features/automation3d/ProcessBuilder";
import { Eyebrow, Readouts } from "@/features/automation3d/StudioKit";

/* ---------------------------------------------------------------- pictures */

/** A simple 6-axis arm on a base, drawn in the current text colour. */
const Arm = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinecap="round" strokeLinejoin="round">
    <rect x="-16" y="-6" width="32" height="8" rx="2" className="fill-current opacity-30" />
    <path d="M0 -6 L0 -26 L22 -44 L40 -34" className="stroke-current" strokeWidth="7" fill="none" />
    <circle cx="0" cy="-26" r="5" className="fill-background stroke-current" strokeWidth="2.5" />
    <circle cx="22" cy="-44" r="4.5" className="fill-background stroke-current" strokeWidth="2.5" />
    <path d="M40 -34 l6 4 M40 -34 l2 7" className="stroke-primary" strokeWidth="3" />
  </g>
);

/** Parts dragged from a list into the robot cell. */
function BuildPicture() {
  const chips = [
    { y: 30, label: "Robot" },
    { y: 62, label: "Gripper" },
    { y: 94, label: "Fence" },
  ];
  return (
    <svg viewBox="0 0 320 140" className="h-full w-full text-foreground" role="img" aria-label="Parts dragged into a robot cell">
      {chips.map((c, i) => (
        <g key={c.label}>
          <rect x="14" y={c.y - 11} width="78" height="22" rx="6" className={i === 1 ? "fill-primary/15 stroke-primary" : "fill-background stroke-border"} strokeWidth="1.5" />
          <circle cx="27" cy={c.y} r="3" className={i === 1 ? "fill-primary" : "fill-current opacity-40"} />
          <text x="37" y={c.y + 4} className="fill-current text-[11px] font-medium">{c.label}</text>
        </g>
      ))}
      <path d="M96 62 C 130 62, 140 70, 168 70" className="stroke-primary" strokeWidth="2" strokeDasharray="4 4" fill="none" />
      <path d="M162 65 l7 5 -7 5" className="stroke-primary" strokeWidth="2" fill="none" />
      <rect x="176" y="16" width="130" height="108" rx="10" className="fill-muted stroke-border" strokeWidth="1.5" strokeDasharray="5 4" />
      <rect x="186" y="96" width="44" height="10" rx="2" className="fill-current opacity-15" />
      <Arm x={258} y={108} />
    </svg>
  );
}

/** A described job turned into a designed robot cell. */
function AiPicture() {
  return (
    <svg viewBox="0 0 320 140" className="h-full w-full text-foreground" role="img" aria-label="A described job turned into a robot cell">
      <g>
        <rect x="14" y="30" width="96" height="58" rx="10" className="fill-background stroke-border" strokeWidth="1.5" />
        <path d="M30 88 l-6 14 16 -14" className="fill-background stroke-border" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="26" y="44" width="70" height="5" rx="2.5" className="fill-current opacity-30" />
        <rect x="26" y="56" width="56" height="5" rx="2.5" className="fill-current opacity-30" />
        <rect x="26" y="68" width="40" height="5" rx="2.5" className="fill-current opacity-30" />
      </g>
      <path d="M114 60 H136" className="stroke-primary" strokeWidth="2" strokeDasharray="4 4" />
      <circle cx="156" cy="60" r="18" className="fill-primary/15 stroke-primary" strokeWidth="2" />
      <path d="M149 60 l5 5 9 -11" className="stroke-primary" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M176 60 H196" className="stroke-primary" strokeWidth="2" strokeDasharray="4 4" />
      <rect x="200" y="16" width="106" height="108" rx="10" className="fill-muted stroke-border" strokeWidth="1.5" />
      <rect x="210" y="96" width="34" height="10" rx="2" className="fill-current opacity-15" />
      <rect x="276" y="92" width="22" height="14" rx="2" className="fill-current opacity-15" />
      <Arm x={262} y={108} s={0.9} />
    </svg>
  );
}

/* ---------------------------------------------------------------- content */

const PATHS = [
  {
    to: "/automation-studio/build",
    tag: "Build",
    eyebrow: "You know the robot",
    title: "Build it yourself",
    line: "Pick real robots and tools from the marketplace and Directory, place the cell equipment, and watch the program run.",
    Picture: BuildPicture,
    steps: ["Drag a robot onto the floor", "Add its gripper, torch or tool", "Choose the job and run it in 3D"],
    cta: "Start building",
  },
  {
    to: "/automation-studio?mode=ai",
    tag: "Plan",
    eyebrow: "Not sure where to start",
    title: "Describe your job",
    line: "Tell us how the work is done today. We size the robots, tools, safety and budget, then build the cell.",
    Picture: AiPicture,
    steps: ["Describe the work in plain words", "Get the engineering plan", "See your line in 3D"],
    cta: "Describe my job",
  },
] as const;

const FACTS = [
  { label: "Robot models", value: "1,500+" },
  { label: "End-of-arm tools", value: "250" },
  { label: "Ready jobs", value: String(BLOCKS.length) },
  { label: "3D cell", value: "Live · free" },
];

/** Automation Studio entry: build a cell yourself, or describe the job and let us design it. */
export default function StudioChooser() {
  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <main className="container mx-auto max-w-6xl px-4 pb-20">
        <header className="pb-10 pt-12 sm:pt-16">
          <Eyebrow index="001" label="Automation Studio" />
          <h1 className="mt-6 max-w-[18ch] text-balance text-4xl font-semibold uppercase leading-[1.02] tracking-[-0.02em] text-foreground md:text-[52px]">
            See your robot cell before you buy it
          </h1>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground md:text-lg">
            Two ways in, one result: a robot cell you can watch run, with the robots, tools and budget behind it.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-2" aria-label="Choose how to start">
          {PATHS.map((p, i) => (
            <Link
              key={p.to}
              to={p.to}
              className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
            >
              <BevelBox cut={14} innerClassName="flex flex-col">
                <div className="relative aspect-[16/7] border-b border-border bg-muted/40 p-3 [background-image:linear-gradient(hsl(var(--border)/0.6)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.6)_1px,transparent_1px)] [background-size:24px_24px]">
                  <span className="absolute left-4 top-3 font-mono text-[11px] tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span className="absolute right-4 top-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{p.tag}</span>
                  <p.Picture />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{p.eyebrow}</p>
                  <h2 className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[-0.01em]">{p.title}</h2>
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
        </section>

        <Readouts items={FACTS} className="mt-8" />

        <nav aria-label="More in the studio" className="mt-10 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:gap-10">
          <ConsoleLink to="/automation-studio/3d">Type your steps into the 3D simulator</ConsoleLink>
          <ConsoleLink to="/automation-studio/playbook">How an automation engineer thinks</ConsoleLink>
        </nav>
      </main>
      <Footer />
    </div>
  );
}
