import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import AutomationStudio3D from "@/features/automation3d/AutomationStudio3D";

export default function AutomationStudio3DPage() {
  const [params] = useSearchParams();
  // Automation Studio links here with ?process=<steps>&title=<process name>
  const process = params.get("process") || undefined;
  const title = params.get("title") || undefined;

  return (
    <>
      <Helmet>
        <title>Automation Studio 3D: Simulate Your Robot Cell | RobotVerse</title>
        <meta
          name="description"
          content="Describe any production process and watch an industrial robot cell run it in 3D: machine tending, welding, painting, polishing, assembly, filling, labeling, packing and palletizing, with cycle time and reach check."
        />
        <link rel="canonical" href="https://www.robotverse.in/automation-studio/3d" />
      </Helmet>
      <EnhancedHeader />
      <div className="border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
          <Link to="/automation-studio" className="inline-flex items-center gap-1 hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> Automation Studio
          </Link>
          <span>/</span>
          <span className="text-foreground">3D Robot Cell Simulator</span>
        </div>
      </div>
      <AutomationStudio3D
        key={process || "default"}
        initialProcess={process}
        title={title ? `Robot cell: ${title}` : "Robot Cell Simulator"}
      />
    </>
  );
}
