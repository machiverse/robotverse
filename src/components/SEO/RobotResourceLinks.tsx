export default function RobotResourceLinks() {
  return (
    <section aria-labelledby="robot-resource-links" className="mt-8 border-t border-border pt-6" data-robot-resource-links="true">
      <h2 id="robot-resource-links" className="text-base font-semibold">Industrial robot guides and model specifications</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Check robot payload, reach and application requirements, compare controller and spare-part compatibility, and find manufacturer models in the robotics directory.</p>
      <nav aria-label="Industrial robot resources" className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-primary">
        <a href="/robot-guides/industrial-robots" className="hover:underline">Industrial robot selection guide</a>
        <a href="/robot-guides/robot-spare-parts" className="hover:underline">Robot spare-parts compatibility guide</a>
        <a href="/robot-guides/robot-directory" className="hover:underline">Robot specifications and datasheets guide</a>
        <a href="/robot-guides/model-index" className="hover:underline">Robot, tool and axis model index</a>
      </nav>
    </section>
  );
}
import * as React from "react";
