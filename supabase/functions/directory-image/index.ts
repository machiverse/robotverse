// supabase/functions/directory-image/index.ts
//
// Directory images served from RobotVerse's own storage.
//
// Every robot, end-of-arm tool and external axis image is copied once into the
// public "robot-images" bucket (directory/<kind>/<RobotVerse ID>[-sm]) and served
// from there. The website asks storage first and only calls this function for
// an image that has not been copied yet; the function copies it and returns it.
//
//   GET ?kind=robots&id=RVRobot0001&size=sm&file=ABB-CRB-1300-10-1-15.png
//        -> the image (copied into storage on first request)
//   GET ?warm=1&kind=robots&offset=0&limit=25
//        -> copies a batch of catalogue images in advance; returns progress JSON
//
// Source priority: a real OEM photo from /directory/photos.json, then the product
// render from the original library. No database tables are used.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://www.robotverse.in").replace(/\/$/, "");
const BUCKET = "robot-images";
const RENDER_HOST = "https://cdn.robodk.com";
const KINDS = new Set(["robots", "tools", "axes"]);
const MAX_BYTES = 6_000_000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const admin = () => createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

const renderUrl = (kind: string, file: string) =>
  kind === "tools" ? `${RENDER_HOST}/robotlib/tools/${encodeURIComponent(file)}` : `${RENDER_HOST}/robot/img/${encodeURIComponent(file)}`;

const objectPath = (kind: string, id: string, size: string) => `directory/${kind}/${id}${size === "sm" ? "-sm" : ""}`;
const publicUrl = (path: string) => `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/${BUCKET}/${path}`;

const validId = (id: string) => /^RV(Robot|Tool|Axis|Axes)[0-9]{3,6}$/i.test(id);
const validFile = (f: string) => /^[\w.\-+%()' ]{1,160}\.(png|jpe?g|webp)$/i.test(f);

// Real OEM photos listed on the website (RobotVerse ID -> URL), cached per worker.
let photoCache: { at: number; map: Record<string, string> } | null = null;
async function photos(): Promise<Record<string, string>> {
  if (photoCache && Date.now() - photoCache.at < 10 * 60_000) return photoCache.map;
  try {
    const r = await fetch(`${SITE_URL}/directory/photos.json`);
    const map = r.ok ? await r.json() : {};
    photoCache = { at: Date.now(), map: map && typeof map === "object" ? map : {} };
  } catch {
    photoCache = { at: Date.now(), map: {} };
  }
  return photoCache.map;
}

async function exists(path: string): Promise<boolean> {
  const r = await fetch(publicUrl(path), { method: "HEAD" });
  return r.ok;
}

/** Download the best source image and store it; returns the bytes and type, or null. */
async function copy(kind: string, id: string, size: string, file: string | null) {
  const sources: string[] = [];
  const photo = (await photos())[id];
  if (typeof photo === "string" && /^https:\/\//.test(photo)) sources.push(photo);
  if (file && validFile(file)) sources.push(renderUrl(kind, file));

  for (const src of sources) {
    try {
      const r = await fetch(src, { headers: { "User-Agent": "RobotVerse-Directory/1.0 (+https://www.robotverse.in)" } });
      const type = r.headers.get("content-type") || "";
      if (!r.ok || !type.startsWith("image/")) continue;
      const bytes = new Uint8Array(await r.arrayBuffer());
      if (!bytes.length || bytes.length > MAX_BYTES) continue;
      const { error } = await admin().storage.from(BUCKET).upload(objectPath(kind, id, size), bytes, {
        contentType: type,
        cacheControl: "31536000",
        upsert: false,
      });
      // "already exists" means another request copied it first: fine.
      if (error && !/exist|duplicate/i.test(error.message)) console.error("directory-image upload", id, error.message);
      return { bytes, type };
    } catch (e) {
      console.error("directory-image fetch", src, e instanceof Error ? e.message : e);
    }
  }
  return null;
}

type Item = { id: string; img?: string; th?: string };

async function warm(kind: string, offset: number, limit: number) {
  const r = await fetch(`${SITE_URL}/directory/${kind}.json`);
  if (!r.ok) throw new Error(`Could not read ${kind}.json from the website (${r.status})`);
  const items: Item[] = await r.json();
  const slice = items.slice(offset, offset + limit);
  let copied = 0;
  let present = 0;
  let failed = 0;
  for (const it of slice) {
    if (!validId(it.id)) continue;
    for (const size of ["sm", "lg"]) {
      const file = size === "sm" ? it.th || it.img : it.img || it.th;
      const path = objectPath(kind, it.id, size);
      if (await exists(path)) {
        present++;
        continue;
      }
      (await copy(kind, it.id, size, file ?? null)) ? copied++ : failed++;
    }
  }
  const next = offset + slice.length;
  return { kind, total: items.length, offset, processed: slice.length, copied, alreadyStored: present, failed, next: next < items.length ? next : null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") || "";
  if (!KINDS.has(kind)) return new Response("Unknown kind", { status: 400, headers: cors });

  try {
    if (url.searchParams.get("warm")) {
      const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 25));
      return new Response(JSON.stringify(await warm(kind, offset, limit)), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const id = url.searchParams.get("id") || "";
    const size = url.searchParams.get("size") === "sm" ? "sm" : "lg";
    if (!validId(id)) return new Response("Bad id", { status: 400, headers: cors });
    const path = objectPath(kind, id, size);

    // Already stored: send the browser to the storage copy.
    if (await exists(path)) {
      return new Response(null, { status: 302, headers: { ...cors, Location: publicUrl(path), "Cache-Control": "public, max-age=86400" } });
    }

    const got = await copy(kind, id, size, url.searchParams.get("file"));
    if (!got) return new Response("No image", { status: 404, headers: { ...cors, "Cache-Control": "public, max-age=3600" } });
    return new Response(got.bytes, {
      headers: { ...cors, "Content-Type": got.type, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch (e) {
    console.error("directory-image", e);
    return new Response("Error", { status: 500, headers: cors });
  }
});
