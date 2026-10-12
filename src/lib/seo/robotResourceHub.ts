import { ROBOT_RESOURCES } from "./robotResources";
import { MODEL_INDEX_PATH, MODEL_INDEX_TITLE } from "./robotModelIndex";

export const RESOURCE_HUB_PATH = "/robot-guides";
export const RESOURCE_HUB_TITLE = "Industrial Robots & Spare Parts Guides | RobotVerse";
export const RESOURCE_HUB_DESCRIPTION = "Learn how to select industrial robots, check robot spare-part compatibility and compare manufacturer specifications, tooling and external axes on RobotVerse.";
export function resourceHubStructuredData() {
  const url = `https://www.robotverse.in${RESOURCE_HUB_PATH}`;
  return { "@context": "https://schema.org", "@graph": [
    { "@type": "CollectionPage", "@id": `${url}#page`, url, name: RESOURCE_HUB_TITLE, description: RESOURCE_HUB_DESCRIPTION, mainEntity: { "@id": `${url}#guides` } },
    { "@type": "ItemList", "@id": `${url}#guides`, itemListElement: [
      ...ROBOT_RESOURCES.map((resource, index) => ({ "@type": "ListItem", position: index + 1, name: resource.heading, url: `https://www.robotverse.in/robot-guides/${resource.slug}` })),
      { "@type": "ListItem", position: ROBOT_RESOURCES.length + 1, name: MODEL_INDEX_TITLE, url: `https://www.robotverse.in${MODEL_INDEX_PATH}` },
    ] },
  ] };
}
