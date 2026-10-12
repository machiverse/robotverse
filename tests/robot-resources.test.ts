import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { addResourceNavigation, renderResourcePage, resourceSitemap, resourceSnapshots } from "../robotResourcesStatic";
import { getRobotResource, ROBOT_RESOURCES, resourceStructuredData } from "../src/lib/seo/robotResources";
import { modelIndexEntries, modelIndexGroups, MODEL_INDEX_PATH } from "../src/lib/seo/robotModelIndex";
import { classifyPath, directorySlug } from "../src/lib/seo/seoText";

const [template, robots, tools, axes] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  ...["robots", "tools", "axes"].map(async (kind) => JSON.parse(await readFile(new URL(`../public/directory/${kind}.json`, import.meta.url), "utf8"))),
]);
const entries = modelIndexEntries({ robots, tools, axes });
assert.equal(entries.length, robots.length + tools.length + axes.length);
assert.equal(robots.length, 1546, "Cover every robot in the current checkout");
assert.equal(new Set(entries.map((entry) => entry.path)).size, entries.length);
for (const [catalogue, kind] of [[robots, "robot"], [tools, "tool"], [axes, "axis"]] as const) {
  for (const item of catalogue) assert.ok(entries.some((entry) => entry.kind === kind && entry.id === item.id && entry.path === `/directory/${kind}/${directorySlug(item.n)}`));
}
const groups = modelIndexGroups(entries);
assert.equal(new Set(groups.map((group) => group.anchor)).size, groups.length, "Manufacturer navigation must have unique targets");
assert.equal(groups.flatMap((group) => group.models).length, entries.length);

const snapshots = resourceSnapshots(entries);
assert.equal(snapshots.length, 5);
for (const snapshot of snapshots) {
  const html = renderResourcePage(template, snapshot);
  assert.ok(html.includes(`<link rel="canonical" href="https://www.robotverse.in${snapshot.path}" />`));
  assert.ok(html.includes('<meta name="robots" content="index,follow" />'));
  assert.ok(html.includes('<div id="root"><main'), "Readable content must be available without JavaScript");
  const schema = /<script type="application\/ld\+json" data-robot-resource-schema="true" data-rh="true">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(schema, "Each new page has its own removable structured data");
  assert.deepEqual(JSON.parse(schema[1]), snapshot.schema);
  if (snapshot.path === MODEL_INDEX_PATH) {
    const paths = [...html.matchAll(/href="(\/directory\/(?:robot|tool|axis)\/[^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(new Set(paths), new Set(entries.map((entry) => entry.path)), "Static model index must expose every existing model URL");
  }
}
for (const resource of ROBOT_RESOURCES) {
  assert.equal(getRobotResource(`/robot-guides/${resource.slug}/?source=test`), resource);
  const schema = resourceStructuredData(resource);
  const faq = schema["@graph"].find((node) => node["@type"] === "FAQPage");
  assert.deepEqual(faq.mainEntity.map((question) => ({ question: question.name, answer: question.acceptedAnswer.text })), resource.faq);
  for (const link of resource.sections.flatMap((section) => section.links ?? [])) {
    assert.ok(getRobotResource(link.href) || link.href === MODEL_INDEX_PATH || !["unknown", "gone", "private"].includes(classifyPath(link.href).kind), link.href);
  }
}
for (const path of ["/robots", "/parts", "/directory", "/robot-guides/unknown", "/dashboard"]) assert.equal(getRobotResource(path), null);

const augmented = addResourceNavigation(template);
assert.equal(/<head>[\s\S]*?<\/head>/.exec(augmented)[0], /<head>[\s\S]*?<\/head>/.exec(template)[0], "Adding navigation must retain the entire existing SEO head");
assert.equal(addResourceNavigation(augmented), augmented, "Repeated builds must not duplicate navigation");
assert.ok(augmented.includes('<noscript data-robot-resource-navigation="true">'));
const urls = [...resourceSitemap(entries).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.equal(urls.length, entries.length + snapshots.length);
assert.equal(new Set(urls).size, urls.length);
for (const entry of entries) assert.ok(urls.includes(`https://www.robotverse.in${entry.path}`));
assert.ok(urls.every((url) => url.startsWith("https://www.robotverse.in/directory/") || url.startsWith("https://www.robotverse.in/robot-guides")));
console.log(`robot resources: ${robots.length} robots, ${entries.length} unique models, ${groups.length} manufacturers, 5 crawlable pages, matching schema and unchanged existing head passed`);
