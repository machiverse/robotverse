import assert from "node:assert/strict";
import { DatasheetFiles } from "../supabase/functions/_shared/datasheetFiles";

const objects = new Map<string, Blob>();
const legacy = "directory/datasheets/robots/RVRobot0001.json";
objects.set(legacy, new Blob(['{"url":"legacy-file-preserved"}']));
const files = new DatasheetFiles({
  async download(path) {
    return objects.has(path) ? { data: objects.get(path)!, error: null } : { data: null, error: { message: "Object not found", statusCode: 404 } };
  },
  async upload(path, body, options) {
    if (!options.upsert && objects.has(path)) return { error: { message: "The resource already exists", statusCode: 409 } };
    objects.set(path, body);
    return { error: null };
  },
});
const prefix = DatasheetFiles.prefix;
await Promise.all([
  files.write(`${prefix}robots/model-a.json`, { url: "https://manufacturer.test/a.pdf" }),
  files.write(`${prefix}robots/model-b.json`, { url: "https://manufacturer.test/b.pdf" }),
]);
assert.deepEqual(await files.read(`${prefix}robots/model-a.json`), { url: "https://manufacturer.test/a.pdf" });
assert.deepEqual(await files.read(`${prefix}robots/model-b.json`), { url: "https://manufacturer.test/b.pdf" });
assert.equal(await objects.get(legacy)!.text(), '{"url":"legacy-file-preserved"}');
assert.equal(await files.read(`${prefix}missing.json`), null);
await files.write(`${prefix}claims/run/0.json`, { claimed: true }, false);
await assert.rejects(() => files.write(`${prefix}claims/run/0.json`, { claimed: true }, false), /already exists/);
await assert.rejects(() => files.write(legacy, { changed: true }), /Invalid datasheet/);
await assert.rejects(() => files.write(`${prefix}../other.json`, {}), /Invalid datasheet/);
const denied = new DatasheetFiles({
  async download() { return { data: null, error: { message: "Unauthorized", statusCode: 403 } }; },
  async upload() { return { error: { message: "Unauthorized", statusCode: 403 } }; },
});
await assert.rejects(() => denied.read(`${prefix}robots/model-a.json`), /Unauthorized/);
await assert.rejects(() => denied.write(`${prefix}robots/model-a.json`, {}), /Unauthorized/);
console.log("datasheet file storage: isolated writes, persistence, concurrent results, legacy preservation, duplicate claims, and access errors passed");
