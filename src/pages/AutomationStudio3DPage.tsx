import { Helmet } from "react-helmet-async";
import AutomationStudio3D from "@/features/automation3d/AutomationStudio3D";

export default function AutomationStudio3DPage() {
  return (
    <>
      <Helmet>
        <title>Automation Studio 3D: Simulate Your Robot Cell | RobotVerse</title>
        <meta
          name="description"
          content="Describe your production process and watch an industrial robot cell run it in 3D: machine tending, palletizing, pick and place and welding, with cycle time and reach check."
        />
        <link rel="canonical" href="https://www.robotverse.in/automation-studio/3d" />
      </Helmet>
      <AutomationStudio3D />
    </>
  );
}
