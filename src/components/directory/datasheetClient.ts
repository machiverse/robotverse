import { supabase } from "@/integrations/supabase/client";
import { isSafePdfLink } from "../../../supabase/functions/_shared/datasheetPolicy";

export type DatasheetKind = "robots" | "tools" | "axes" | "parts";
export type DatasheetItem = { id: string; b: string; m: string };
type Index = Record<string, string>;
const indexes: Partial<Record<DatasheetKind, { promise: Promise<Index>; expires: number }>> = {};

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

/** Refresh periodically; failed reads are retryable, never cached forever. */
export function loadDatasheetIndex(kind: DatasheetKind): Promise<Index> {
  const cached = indexes[kind];
  if (cached && cached.expires > Date.now()) return cached.promise;
  const promise = callDatasheets<{ index: Index }>({ action: "index", kind }).then((data) => {
    if (!data?.index || typeof data.index !== "object" || Array.isArray(data.index)) throw new Error("Invalid datasheet index");
    return Object.fromEntries(Object.entries(data.index).filter(([, value]) => isSafePdfLink(value)));
  });
  indexes[kind] = { promise, expires: Date.now() + 60_000 };
  promise.catch(() => { if (indexes[kind]?.promise === promise) delete indexes[kind]; });
  return promise;
}

export function rememberDatasheet(kind: DatasheetKind, id: string, url: string) {
  const previous = indexes[kind]?.promise ?? Promise.resolve({});
  indexes[kind] = { expires: Date.now() + 60_000, promise: previous.catch(() => ({})).then((index) => ({ ...index, [id]: url })) };
}
