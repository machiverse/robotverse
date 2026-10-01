import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import CellBuilder from "@/features/automation3d/CellBuilder";

export default function AutomationStudioBuildPage() {
  return (
    <>
      <Helmet>
        <title>Build Your Robot Cell in 3D | Automation Studio | RobotVerse</title>
        <meta
          name="description"
          content="Drag robots from the RobotVerse marketplace and the industrial robot directory, add grippers, welding torches, tool changers, sensors and safety fencing, and watch your robot cell run in 3D."
        />
        <link rel="canonical" href="https://www.robotverse.in/automation-studio/build" />
      </Helmet>
      <EnhancedHeader />
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-2 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Link to="/automation-studio" className="inline-flex items-center gap-1 hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> Automation Studio
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground">Build your own robot cell</span>
        </div>
        <Link to="/automation-studio?mode=ai" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <Sparkles className="h-3.5 w-3.5" /> Prefer to describe your job? Let our intelligence design it
        </Link>
      </div>
      <CellBuilder />
    </>
  );
}
