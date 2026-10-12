import * as React from "react";
import fs from "node:fs/promises";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import type { Plugin } from "vite";
import { renderPage } from "./seoStatic";
import { classifyPath } from "./src/lib/seo/seoText";
import { ROBOT_RESOURCES, resourceStructuredData } from "./src/lib/seo/robotResources";
import { MODEL_INDEX_PATH, MODEL_INDEX_TITLE, MODEL_INDEX_DESCRIPTION, modelIndexEntries, modelIndexStructuredData, type ModelIndexEntry } from "./src/lib/seo/robotModelIndex";
import { RESOURCE_HUB_PATH, RESOURCE_HUB_TITLE, RESOURCE_HUB_DESCRIPTION, resourceHubStructuredData } from "./src/lib/seo/robotResourceHub";
import RobotResourceContent from "./src/components/SEO/RobotResourceContent";
import RobotResourceHubContent from "./src/components/SEO/RobotResourceHubContent";
import RobotModelIndexContent from "./src/components/SEO/RobotModelIndexContent";
import RobotResourceLinks from "./src/components/SEO/RobotResourceLinks";

const SITE = "https://www.robotverse.in";
type ResourceSnapshot = { path: string; title: string; description: string; schema: unknown; content: React.ReactNode };

export function resourceSnapshots(entries: ModelIndexEntry[]): ResourceSnapshot[] {
  return [
    { path: RESOURCE_HUB_PATH, title: RESOURCE_HUB_TITLE, description: RESOURCE_HUB_DESCRIPTION, schema: resourceHubStructuredData(), content: <RobotResourceHubContent /> },
    ...ROBOT_RESOURCES.map((resource) => ({ path: `/robot-guides/${resource.slug}`, title: resource.title, description: resource.description, schema: resourceStructuredData(resource), content: <RobotResourceContent resource={resource} /> })),
    { path: MODEL_INDEX_PATH, title: MODEL_INDEX_TITLE, description: MODEL_INDEX_DESCRIPTION, schema: modelIndexStructuredData(entries), content: <RobotModelIndexContent entries={entries} /> },
  ];
}

/** New pages use the same visible React content as the browser, without a network dependency. */
export function renderResourcePage(template: string, snapshot: ResourceSnapshot): string {
  const html = renderPage(template, { title: snapshot.title, description: snapshot.description, canonical: `${SITE}${snapshot.path}`, robots: "index,follow", jsonld: snapshot.schema });
  const content = renderToStaticMarkup(<><main className="container mx-auto max-w-6xl px-4 py-10">{snapshot.content}</main><footer className="container mx-auto px-4 py-8"><RobotResourceLinks /></footer></>);
  if (!html.includes('<div id="root"></div>')) throw new Error("Robot resource snapshot requires the empty Vite root");
  return html.replace('<div id="root"></div>', `<div id="root">${content}</div>`)
    .replace("data-seo-page", 'data-robot-resource-schema="true" data-rh="true"');
}

/** Only adds visible no-JavaScript navigation; every existing head tag is retained. */
export function addResourceNavigation(html: string): string {
  if (html.includes("data-robot-resource-navigation")) return html;
  const navigation = renderToStaticMarkup(<footer className="container mx-auto px-4 py-8"><RobotResourceLinks /></footer>);
  return html.replace("</body>", `<noscript data-robot-resource-navigation="true">${navigation}</noscript>\n</body>`);
}

export function resourceSitemap(entries: ModelIndexEntry[]): string {
  const paths = [...new Set([RESOURCE_HUB_PATH, ...ROBOT_RESOURCES.map((resource) => `/robot-guides/${resource.slug}`), MODEL_INDEX_PATH, ...entries.map((entry) => entry.path)])];
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    paths.map((pathname) => `  <url><loc>${SITE}${pathname}</loc></url>`).join("\n") + "\n</urlset>\n";
}

export default function robotResourcesStatic(): Plugin {
  let root = "";
  let outDir = "";
  return {
    name: "robotverse-robot-resources-static",
    apply: "build",
    configResolved(config) {
      root = config.root;
      outDir = path.resolve(root, config.build.outDir);
    },
    // Finish after the existing live snapshot plugin, preserving all of its output.
    closeBundle: { order: "post", sequential: true, async handler() {
      const [template, robots, tools, axes] = await Promise.all([
        fs.readFile(path.join(outDir, "index.html"), "utf8"),
        ...["robots", "tools", "axes"].map(async (kind) => JSON.parse(await fs.readFile(path.join(root, "public", "directory", `${kind}.json`), "utf8"))),
      ]);
      const entries = modelIndexEntries({ robots, tools, axes });
      if (!entries.length || entries.some((entry) => !entry.name || !entry.brand || !entry.path.split("/").pop())) throw new Error("Robot resource catalogue is incomplete");
      if (new Set(entries.map((entry) => entry.path)).size !== entries.length) throw new Error("Robot resource model paths must be unique");
      for (const snapshot of resourceSnapshots(entries)) {
        const dir = path.join(outDir, snapshot.path.slice(1));
        await fs.mkdir(dir, { recursive: true });
        const html = renderResourcePage(template, snapshot);
        await fs.writeFile(path.join(dir, "index.html"), html);
        // Vite preview and hosts with extension fallback serve the canonical slashless URL.
        // Directory indexes also support hosts that resolve /path/ to /path/index.html.
        await fs.writeFile(`${dir}.html`, html);
      }
      await fs.writeFile(path.join(outDir, "sitemap-robot-resources.xml"), resourceSitemap(entries));

      const addNavigation = async (dir: string): Promise<void> => {
        for (const file of await fs.readdir(dir, { withFileTypes: true })) {
          const filename = path.join(dir, file.name);
          if (file.isDirectory() && file.name !== "assets" && file.name !== "robot-guides") await addNavigation(filename);
          else if (file.isFile() && file.name === "index.html") {
            const route = `/${path.relative(outDir, dir).split(path.sep).filter(Boolean).join("/")}`;
            if (["private", "unknown", "gone"].includes(classifyPath(route).kind)) continue;
            await fs.writeFile(filename, addResourceNavigation(await fs.readFile(filename, "utf8")));
          }
        }
      };
      await addNavigation(outDir);
      console.log(`[robot-resources] 5 static resource pages, ${entries.length} catalogue model links and a separate sitemap`);
    } },
  };
}
