import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import NotFound from "./NotFound";
import RobotResourceHubContent from "@/components/SEO/RobotResourceHubContent";
import { resourceHubStructuredData } from "@/lib/seo/robotResourceHub";
import RobotResourceContent from "@/components/SEO/RobotResourceContent";
import RobotModelIndexContent from "@/components/SEO/RobotModelIndexContent";
import { getRobotResource, resourceStructuredData } from "@/lib/seo/robotResources";
import { modelIndexEntries, modelIndexStructuredData, type ModelIndexEntry } from "@/lib/seo/robotModelIndex";

export default function RobotResourcePage() {
  const { slug = "" } = useParams();
  const isHub = !slug;
  const isIndex = slug === "model-index";
  const resource = getRobotResource(`/robot-guides/${slug}`);
  const [entries, setEntries] = useState<ModelIndexEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isIndex) return;
    let live = true;
    setFailed(false);
    Promise.all(["robots", "tools", "axes"].map(async (kind) => {
      const response = await fetch(`/directory/${kind}.json`);
      if (!response.ok) throw new Error("Catalogue unavailable");
      return response.json();
    })).then(([robots, tools, axes]) => { if (live) setEntries(modelIndexEntries({ robots, tools, axes })); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [isIndex]);

  if (!resource && !isIndex && !isHub) return <NotFound />;
  const schema = isHub ? resourceHubStructuredData() : resource ? resourceStructuredData(resource) : entries ? modelIndexStructuredData(entries) : null;
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        {/* The new-route branch in useCanonicalHead owns metadata, avoiding duplicate tags. */}
        {schema && <script type="application/ld+json" data-robot-resource-schema="true">{JSON.stringify(schema).replace(/</g, "\\u003c")}</script>}
      </Helmet>
      <EnhancedHeader />
      <main className="container mx-auto max-w-6xl px-4 py-10">
        {isHub ? <RobotResourceHubContent /> : resource ? <RobotResourceContent resource={resource} /> : entries ? <RobotModelIndexContent entries={entries} /> : (
          <div><h1 className="text-3xl font-bold">Industrial robot, tool and external-axis model index</h1>
            <p className="mt-4" role="status">{failed ? "The model index could not load. Please reload or browse the specifications directory." : "Loading the manufacturer model index…"}</p>
            <a href="/directory" className="mt-3 inline-block text-primary underline">Browse the robotics directory</a>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
