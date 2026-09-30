import { Link } from "react-router-dom";
import { ArrowRight, Bot, Sparkles } from "lucide-react";
import { SKILL_LIBRARY } from "@/utils/processAnalyzer";

export default function StudioStart() {
  return (
    <section aria-label="Choose your automation workflow" className="my-6 grid gap-4 md:grid-cols-2">
      {[
        { mode: "guided", icon: Sparkles, title: "Automate my process", text: "Describe the work you do today. Review suggested processes, robots and tooling, then explore your production line in 3D.", action: "Start guided planning" },
        { mode: "custom", icon: Bot, title: "Design my own automation", text: `Choose from ${SKILL_LIBRARY.length} supported skills, arrange your process, select robots and EOAT, and preview your design in 3D.`, action: "Open custom designer" },
      ].map(({ mode, icon: Icon, title, text, action }) => (
        <Link key={mode} to={`/automation-studio/3d?mode=${mode}`} className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Icon className="mb-4 h-6 w-6 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{text}</p>
          <span className="mt-5 flex items-center gap-2 text-sm font-medium text-primary">{action}<ArrowRight className="h-4 w-4" aria-hidden /></span>
        </Link>
      ))}
    </section>
  );
}
