import { supabase } from "@/integrations/supabase/client";
import { datasheetLinksPath, isSafePdfLink } from "../../../supabase/functions/_shared/datasheetPolicy";

export type DatasheetKind = "robots" | "tools" | "axes" | "parts";
export type DatasheetItem = { id: string; b: string; m: string };
/** Each model's datasheet PDF, and the models with no official datasheet. */
export type DatasheetIndex = { links: Record<string, string>; none: Set<string> };
const indexes: Partial<Record<DatasheetKind, { promise: Promise<DatasheetIndex>; expires: number }>> = {};
const empty = (): DatasheetIndex => ({ links: {}, none: new Set() });

export async function callDatasheets<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("directory-datasheet", { body });
  if (error) {
    let detail = error.message;
    try {
      const response = (error as { context?: Response }).context;
      const failure = await response?.json();
      if (typeof failure?.error === "string") detail = failure.error;
      else if (typeof failure?.note === "string") detail = failure.note;
    } catch { /* Preserve the original network message. */ }
    throw new Error(detail);
  }
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

function parse(found: unknown, none: unknown): DatasheetIndex {
  if (!found || typeof found !== "object" || Array.isArray(found)) throw new Error("Invalid datasheet index");
  return {
    links: Object.fromEntries(Object.entries(found).filter(([, value]) => isSafePdfLink(value))),
    none: new Set(Array.isArray(none) ? none.filter((id): id is string => typeof id === "string") : []),
  };
}

/** The collector's public list: a static file, so there is no function start-up to wait for. */
async function fromStorage(kind: DatasheetKind) {
  const { data } = supabase.storage.from("robot-images").getPublicUrl(datasheetLinksPath(kind));
  const response = await fetch(`${data.publicUrl}?t=${Math.floor(Date.now() / 60_000)}`);
  if (!response.ok) throw new Error(`Datasheet list unavailable (HTTP ${response.status})`);
  const body = await response.json();
  return parse(body?.found, body?.none);
}

/** The same list from the function, which also keeps the collection running. */
async function fromFunction(kind: DatasheetKind) {
  const data = await callDatasheets<{ index?: unknown; none?: unknown }>({ action: "index", kind });
  return parse(data?.index, data?.none);
}

/** The first source to answer wins; it fails only when every source fails. */
function first<T>(sources: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let failed = 0;
    for (const source of sources) source.then(resolve, (error) => { if (++failed === sources.length) reject(error); });
  });
}

// The last list seen in this browser, so a returning visitor's button is a direct link at once.
const saved: Partial<Record<DatasheetKind, DatasheetIndex | null>> = {};
const savedKey = (kind: DatasheetKind) => `robotverse:datasheets:${kind}`;
export function savedDatasheetIndex(kind: DatasheetKind): DatasheetIndex | null {
  if (kind in saved) return saved[kind] ?? null;
  let index: DatasheetIndex | null = null;
  try {
    const raw = JSON.parse(localStorage.getItem(savedKey(kind)) ?? "null");
    if (raw && Date.now() - Number(raw.at) < 7 * 86400_000) index = parse(raw.found, raw.none);
  } catch { /* Storage blocked or corrupt: load from the network. */ }
  return (saved[kind] = index);
}
function save(kind: DatasheetKind, index: DatasheetIndex) {
  saved[kind] = index;
  try { localStorage.setItem(savedKey(kind), JSON.stringify({ at: Date.now(), found: index.links, none: [...index.none] })); }
  catch { /* Storage full or blocked: the in-memory copy still works. */ }
}

/** Refresh periodically; failed reads are retryable, never cached forever. */
export function loadDatasheetIndex(kind: DatasheetKind): Promise<DatasheetIndex> {
  const cached = indexes[kind];
  if (cached && cached.expires > Date.now()) return cached.promise;
  const promise = first([fromStorage(kind), fromFunction(kind)]).then((index) => {
    save(kind, index);
    return index;
  });
  indexes[kind] = { promise, expires: Date.now() + 60_000 };
  promise.catch(() => { if (indexes[kind]?.promise === promise) delete indexes[kind]; });
  return promise;
}

export function rememberDatasheet(kind: DatasheetKind, id: string, url: string) {
  const previous = indexes[kind]?.promise ?? Promise.resolve(savedDatasheetIndex(kind) ?? empty());
  indexes[kind] = {
    expires: Date.now() + 60_000,
    promise: previous.catch(empty).then((index) => ({ links: { ...index.links, [id]: url }, none: new Set([...index.none].filter((other) => other !== id)) })),
  };
}
