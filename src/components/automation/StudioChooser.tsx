import { Link } from "react-router-dom";
import { ArrowRight, Bot, Box, Brain, Factory, GripVertical, MessageSquareText, ShieldCheck, Sparkles, Store, Wrench } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PATHS = [
  {
    to: "/automation-studio/build",
    badge: "Drag & drop",
    icon: GripVertical,
    title: "Build your own robot cell",
    lead: "You know the robot you want. Pick it, tool it and watch it work.",
    points: [
      { icon: Store, text: "Robots from the RobotVerse marketplace and 1,500+ models in the Directory" },
      { icon: Wrench, text: "Grippers, welding torches, spindles, tool changers, F/T sensors and cameras" },
      { icon: ShieldCheck, text: "Choose the job and the safety type — fenced cell or open cobot cell" },
      { icon: Box, text: "Every drop updates the live 3D cell; add up to 6 robots for a full line" },
    ],
    cta: "Start building",
  },
  {
    to: "/automation-studio?mode=ai",
    badge: "RobotVerse intelligence",
    icon: Brain,
    title: "Describe your job — we design the automation",
    lead: "Not sure what to automate or which robot fits? Tell us how the work is done today.",
    points: [
      { icon: MessageSquareText, text: "Describe the job in your own words, or upload photos and videos of the work" },
      { icon: Sparkles, text: "We split it into robot tasks and pick robots, tooling and the cell layout" },
      { icon: Bot, text: "Matching robots and EOAT from the marketplace and the Directory, with budget and ROI" },
      { icon: Box, text: "A ready-made 3D robot cell simulation of your process" },
    ],
    cta: "Describe my job",
  },
] as const;

/** Automation Studio entry: build a cell yourself, or let RobotVerse intelligence design it. */
export default function StudioChooser() {
  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <main>
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
          <div className="container mx-auto px-4 py-10 text-center sm:py-14">
            <Badge variant="secondary" className="mb-3 gap-1">
              <Sparkles className="h-3 w-3" /> Robot cell design + live 3D simulation
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">Automation Studio</h1>
            <p className="mx-auto mt-3 max-w-[62ch] text-base text-muted-foreground sm:text-lg">
              Plan your robot cell before you buy anything. How would you like to start?
            </p>
          </div>
        </section>

        <section className="container mx-auto grid gap-5 px-4 py-8 md:grid-cols-2">
          {PATHS.map((p) => (
            <Link
              key={p.to}
              to={p.to}
              className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <p.icon className="h-6 w-6" />
                </span>
                <Badge variant="outline">{p.badge}</Badge>
              </div>
              <h2 className="mt-4 text-xl font-semibold">{p.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{p.lead}</p>
              <ul className="mt-4 space-y-2.5">
                {p.points.map((pt) => (
                  <li key={pt.text} className="flex gap-2.5 text-sm">
                    <pt.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{pt.text}</span>
                  </li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-1.5 self-start rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors group-hover:bg-primary/90">
                {p.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </section>

        <section className="container mx-auto px-4 pb-12">
          <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm sm:flex-row">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Factory className="h-4 w-4 text-primary" /> Already have your process steps? Type them straight into the 3D simulator.
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link to="/automation-studio/3d">
                <Box className="mr-1.5 h-4 w-4" /> Open 3D simulator
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
