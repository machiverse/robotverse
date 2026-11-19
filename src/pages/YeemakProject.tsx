import weldingPage from "@/features/projects/yeemak/spot-welding.html?raw";

/** Isolate the supplied document's globals and styles from the marketplace. */
export default function YeemakProject() {
  return (
    <iframe
      title="Yeemak — Electrical Box Robotic Spot Welding Cell"
      srcDoc={weldingPage}
      sandbox="allow-scripts"
      className="fixed inset-0 z-50 h-dvh w-full border-0 bg-background"
    />
  );
}