import { directorySlug } from "./seoText";

export const MODEL_INDEX_PATH = "/robot-guides/model-index";
export const MODEL_INDEX_TITLE = "Industrial Robot, Tool & Axis Model Index | RobotVerse";
export const MODEL_INDEX_DESCRIPTION = "Browse industrial robot models, end-of-arm tools and external axes by manufacturer. Open model specifications, payload, reach and related spare-parts guides.";
export type ModelIndexEntry = { id: string; name: string; brand: string; model: string; kind: "robot" | "tool" | "axis"; path: string };
type CatalogueItem = { id: string; n: string; b: string; m: string };

export function modelIndexEntries(catalogues: { robots: CatalogueItem[]; tools: CatalogueItem[]; axes: CatalogueItem[] }): ModelIndexEntry[] {
  return ([['robots', 'robot'], ['tools', 'tool'], ['axes', 'axis']] as const).flatMap(([file, kind]) =>
    catalogues[file].map((item) => ({ id: item.id, name: item.n, brand: item.b, model: item.m, kind, path: `/directory/${kind}/${directorySlug(item.n)}` })))
    .sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
}

export function modelIndexGroups(entries: ModelIndexEntry[]) {
  const grouped = new Map<string, ModelIndexEntry[]>();
  for (const entry of entries) grouped.set(entry.brand, [...(grouped.get(entry.brand) ?? []), entry]);
  return [...grouped].map(([brand, models]) => ({ brand, models, anchor: `manufacturer-${directorySlug(brand)}` }));
}

export function modelIndexStructuredData(entries: ModelIndexEntry[]) {
  const canonical = `https://www.robotverse.in${MODEL_INDEX_PATH}`;
  return { "@context": "https://schema.org", "@graph": [
    { "@type": "CollectionPage", "@id": `${canonical}#page`, url: canonical, name: MODEL_INDEX_TITLE, description: MODEL_INDEX_DESCRIPTION,
      mainEntity: { "@id": `${canonical}#models` } },
    { "@type": "ItemList", "@id": `${canonical}#models`, numberOfItems: entries.length,
      itemListElement: entries.map((entry, position) => ({ "@type": "ListItem", position: position + 1, name: entry.name, url: `https://www.robotverse.in${entry.path}` })) },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.robotverse.in/" },
      { "@type": "ListItem", position: 2, name: "Model index", item: canonical },
    ] },
  ] };
}
