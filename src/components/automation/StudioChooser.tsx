import { Link } from "react-router-dom";
import { ArrowRight, Box, Brain, GripVertical, MessageSquareText, MousePointerClick, Play, Wrench } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";

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
    eyebrow: "You know the robot",
    title: "Build it yourself",
    line: "Pick a robot, add its tool, watch it work.",
    Picture: BuildPicture,
    steps: [
      { icon: GripVertical, label: "Drag a robot" },
      { icon: Wrench, label: "Add the tool" },
      { icon: Play, label: "Run in 3D" },
    ],
    cta: "Start building",
  },
  {
    to: "/automation-studio?mode=ai",
    eyebrow: "Not sure where to start",
    title: "Describe your job",
    line: "Tell us how the work is done. We design the cell.",
    Picture: AiPicture,
    steps: [
      { icon: MessageSquareText, label: "Describe the work" },
      { icon: Brain, label: "We plan it" },
      { icon: Box, label: "See your cell" },
    ],
    cta: "Describe my job",
  },
] as const;

const FACTS = [
  { value: "1,500+", label: "robot models" },
  { value: "200+", label: "end-of-arm tools" },
  { value: "22", label: "jobs to simulate" },
  { value: "Live", label: "3D, free to use" },
];

/** Automation Studio entry: build a cell yourself, or describe the job and let us design it. */
export default function StudioChooser() {
  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <main className="container mx-auto max-w-6xl px-4 pb-16">
        <header className="pb-8 pt-12 text-center sm:pt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Automation Studio</p>
          <h1 className="mx-auto mt-3 max-w-[20ch] text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-[2.6rem]">
            See your robot cell before you buy it
          </h1>
          <p className="mt-3 text-base text-muted-foreground">Two ways to begin. Both end in a live 3D cell.</p>
        </header>

        <section className="grid gap-5 md:grid-cols-2" aria-label="Choose how to start">
          {PATHS.map((p) => (
            <Link
              key={p.to}
              to={p.to}
              className="group flex flex-col rounded-2xl border border-border bg-card p-3 shadow-[0_1px_2px_rgb(0_0_0/0.06),0_4px_12px_-6px_rgb(0_0_0/0.12)] transition-[transform,border-color,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-[0_1px_2px_rgb(0_0_0/0.06),0_10px_24px_-10px_rgb(0_0_0/0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 motion-reduce:transform-none"
            >
              <div className="aspect-[16/7] overflow-hidden rounded-xl bg-muted/50 p-2">
                <p.Picture />
              </div>
              <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
                <p className="text-xs font-medium text-muted-foreground">{p.eyebrow}</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">{p.title}</h2>
                <p className="mt-1.5 text-[15px] text-muted-foreground">{p.line}</p>

                <ol className="mt-5 grid grid-cols-3 gap-2">
                  {p.steps.map((s, i) => (
                    <li key={s.label} className="flex flex-col items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-3 text-center">
                      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-background text-primary ring-1 ring-border">
                        <s.icon className="h-4 w-4" aria-hidden />
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {i + 1}
                        </span>
                      </span>
                      <span className="text-xs font-medium leading-tight">{s.label}</span>
                    </li>
                  ))}
                </ol>

                <span className="mt-6 inline-flex items-center gap-1.5 self-start rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
                  {p.cta}
                  <ArrowRight className="h-4 w-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </section>

        <section aria-label="What is inside" className="mt-10 grid grid-cols-2 divide-border overflow-hidden rounded-2xl border border-border sm:grid-cols-4 sm:divide-x">
          {FACTS.map((f) => (
            <div key={f.label} className="px-4 py-5 text-center">
              <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{f.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{f.label}</p>
            </div>
          ))}
        </section>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          <MousePointerClick className="mr-1.5 inline h-4 w-4 align-[-3px] text-primary" aria-hidden />
          Already have your steps?{" "}
          <Link to="/automation-studio/3d" className="font-medium text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none">
            Type them into the 3D simulator
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          <Brain className="mr-1.5 inline h-4 w-4 align-[-3px] text-primary" aria-hidden />
          New to robot automation?{" "}
          <Link to="/automation-studio/playbook" className="font-medium text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none">
            See how an automation engineer thinks
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
