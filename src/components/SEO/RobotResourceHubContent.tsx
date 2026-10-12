import { ROBOT_RESOURCES } from "../../lib/seo/robotResources";

export default function RobotResourceHubContent() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground"><a href="/">Home</a> / Robot guides</nav>
      <h1 className="text-3xl font-bold">Industrial robot and spare-parts resource guides</h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">A robot purchase starts with the process, workpiece and required cycle time. A replacement part starts with the exact model, controller and part number. These guides explain which details to compare before choosing industrial automation equipment or requesting a quotation.</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {ROBOT_RESOURCES.map((resource) => (
          <section key={resource.slug} className="rounded-xl border p-5">
            <h2 className="text-xl font-semibold"><a href={`/robot-guides/${resource.slug}`} className="text-primary hover:underline">{resource.heading}</a></h2>
            <p className="mt-3 text-sm text-muted-foreground">{resource.description}</p>
          </section>
        ))}
        <section className="rounded-xl border p-5">
          <h2 className="text-xl font-semibold"><a href="/robot-guides/model-index" className="text-primary hover:underline">Robot, tool and external-axis model index</a></h2>
          <p className="mt-3 text-sm text-muted-foreground">Find manufacturer model specifications for industrial robot arms, collaborative robots, SCARA robots, grippers, tracks and positioners. Browse model names by manufacturer and open their directory pages.</p>
        </section>
      </div>
      <section className="mt-10 max-w-3xl">
        <h2 className="text-xl font-semibold">Move from specifications to a purchase requirement</h2>
        <p className="mt-3 text-muted-foreground">Use the <a href="/directory" className="text-primary underline">robotics directory</a> for indicative manufacturer specifications, the <a href="/robots" className="text-primary underline">robot marketplace</a> for individual listings and the <a href="/parts" className="text-primary underline">spare-parts marketplace</a> for replacement components. Directory entries do not indicate current inventory. Ask the seller to confirm condition, compatibility, included equipment and available documentation.</p>
      </section>
    </>
  );
}
import * as React from "react";
