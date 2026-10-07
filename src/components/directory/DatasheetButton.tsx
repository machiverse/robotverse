import { useEffect, useState } from "react";
import { FileText, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { CatalogItem, CatalogKind } from "./directoryTypes";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://cmahwgetrqczytnijbuk.supabase.co";

/** Datasheets already found, per catalogue: { id: pdf url }. Loaded once per page visit. */
const indexes: Partial<Record<CatalogKind, Promise<Record<string, string>>>> = {};
const loadIndex = (kind: CatalogKind) =>
  (indexes[kind] ??= fetch(`${SUPABASE_URL}/storage/v1/object/public/robot-images/directory/datasheets/index-${kind}.json`, { cache: "no-cache" })
    .then((r) => (r.ok ? (r.json() as Promise<Record<string, string>>) : {}))
    .catch(() => ({})));

const webSearchUrl = (item: CatalogItem) =>
  `https://www.google.com/search?q=${encodeURIComponent(`"${item.m}" ${item.b.split(" ")[0]} datasheet filetype:pdf`)}`;

/**
 * "Datasheet (PDF)": opens the manufacturer's datasheet for this model. Models found before open
 * straight away; otherwise the datasheet is searched for on click (manufacturer sites first) and
 * remembered for everyone. If none exists, a web search for it is offered.
 */
export default function DatasheetButton({ kind, item, className }: { kind: CatalogKind; item: CatalogItem; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "searching" | "none">("idle");

  useEffect(() => {
    let live = true;
    setUrl(null);
    setState("idle");
    loadIndex(kind).then((ix) => live && ix[item.id] && setUrl(ix[item.id]));
    return () => {
      live = false;
    };
  }, [kind, item.id]);

  if (url)
    return (
      <Button asChild className={className}>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <FileText className="mr-2 h-4 w-4" /> Datasheet (PDF)
        </a>
      </Button>
    );

  if (state === "none")
    return (
      <Button variant="outline" asChild className={className}>
        <a href={webSearchUrl(item)} target="_blank" rel="noopener noreferrer">
          <Search className="mr-2 h-4 w-4" /> No datasheet found — search the web
        </a>
      </Button>
    );

  const find = async () => {
    // Open the tab now (inside the click) so the browser does not block it, then point it at the PDF.
    const tab = window.open("about:blank", "_blank");
    setState("searching");
    try {
      const { data, error } = await supabase.functions.invoke("directory-datasheet", { body: { action: "find", kind, id: item.id } });
      const found = !error && typeof data?.url === "string" ? (data.url as string) : null;
      if (found) {
        setUrl(found);
        setState("idle");
        if (tab) tab.location.href = found;
        indexes[kind] = loadIndex(kind).then((ix) => ({ ...ix, [item.id]: found }));
      } else {
        setState("none");
        tab?.close();
      }
    } catch {
      setState("none");
      tab?.close();
    }
  };

  return (
    <Button variant="outline" onClick={find} disabled={state === "searching"} className={className}>
      {state === "searching" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
      {state === "searching" ? "Finding the datasheet…" : "Datasheet (PDF)"}
    </Button>
  );
}
