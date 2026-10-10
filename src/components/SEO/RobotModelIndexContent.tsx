import { modelIndexGroups, type ModelIndexEntry } from "../../lib/seo/robotModelIndex";

export default function RobotModelIndexContent({ entries }: { entries: ModelIndexEntry[] }) {
  const groups = modelIndexGroups(entries);
  const robots = entries.filter((entry) => entry.kind === "robot").length;
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground"><a href="/">Home</a> / Model index</nav>
      <h1 className="text-3xl font-bold">Industrial robot, tool and external-axis model index</h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">Compare industrial robot arms, collaborative robots, SCARA robots, end-of-arm tooling, linear tracks and positioners by manufacturer and model. This index links to {robots.toLocaleString("en-IN")} robot models and {entries.length - robots} tools and external axes in the RobotVerse specifications directory.</p>
      <p className="mt-3 max-w-3xl text-muted-foreground">A model specification is a reference, not a current stock listing. Confirm payload, reach, controller version, mounting and application suitability with the manufacturer. For replacement parts, match the complete part number and hardware revision before ordering.</p>
      <div className="mt-4 flex flex-wrap gap-4 text-primary underline">
        <a href="/directory">Browse the specifications directory</a><a href="/robots">Browse robot listings</a><a href="/parts">Browse robot spare parts</a>
      </div>
      <nav aria-label="Manufacturers in the model index" className="my-8 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {groups.map((group) => <a key={group.brand} href={`#${group.anchor}`} className="text-primary hover:underline">{group.brand} ({group.models.length})</a>)}
      </nav>
      {groups.map((group) => (
        <section key={group.brand} aria-labelledby={group.anchor} className="mt-8 border-t pt-5">
          <h2 id={group.anchor} className="scroll-mt-24 text-xl font-semibold">{group.brand} models</h2>
          <ul className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {group.models.map((entry) => <li key={`${entry.kind}:${entry.id}`}><a href={entry.path} className="text-primary hover:underline">{entry.name}</a><span className="ml-1 text-muted-foreground">· {entry.kind}</span></li>)}
          </ul>
        </section>
      ))}
    </>
  );
}
import * as React from "react";
