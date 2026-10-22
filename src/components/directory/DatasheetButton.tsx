import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import LeadDialog from "@/components/leads/LeadDialog";
import { callDatasheets, loadDatasheetIndex, rememberDatasheet, savedDatasheetIndex, type DatasheetIndex, type DatasheetItem, type DatasheetKind } from "./datasheetClient";
import { isOfficialUrl, isStoredDatasheet, OEM_SITES } from "../../../supabase/functions/_shared/datasheetPolicy";
export type { DatasheetItem, DatasheetKind } from "./datasheetClient";

type Lookup = { url: string | null; status: "found" | "not_found" | "unsupported" | "error" };
type State = { key: string; url: string | null; status: "idle" | "searching" | "none" | "error" };

const searchUrl = (item: DatasheetItem) => {
  const sites = (OEM_SITES[item.b] ?? []).map((domain) => `site:${domain}`).join(" OR ");
  return `https://www.google.com/search?q=${encodeURIComponent(`${sites} "${item.m}" ${item.b} datasheet filetype:pdf`)}`;
};
const usable = (url: string | undefined, item: DatasheetItem): url is string => !!url && (isStoredDatasheet(url) || isOfficialUrl(url, item.b));

/** What the button shows for a model, from the datasheet list: the PDF, "no datasheet", or not checked yet. */
function fromIndex(key: string, index: DatasheetIndex | null, item: DatasheetItem): State {
  const url = index?.links[item.id];
  if (usable(url, item)) return { key, url, status: "idle" };
  if (index?.none.has(item.id)) return { key, url: null, status: "none" };
  return { key, url: null, status: "idle" };
}

/** A short message in the new tab while a datasheet not collected yet is looked up. */
function showWaiting(tab: Window, item: DatasheetItem) {
  try {
    const doc = tab.document;
    doc.title = `${item.b} ${item.m} datasheet`;
    const note = doc.createElement("p");
    note.textContent = `Finding the official ${item.b} ${item.m} datasheet…`;
    note.style.cssText = "font: 16px system-ui, sans-serif; margin: 48px auto; max-width: 520px; color: #475569; text-align: center";
    doc.body.replaceChildren(note);
  } catch { /* The tab is not ours to write to: it stays blank until the PDF opens. */ }
}

export default function DatasheetButton({ kind, item, className }: { kind: DatasheetKind; item: DatasheetItem; className?: string }) {
  const key = `${kind}:${item.id}`;
  const current = useRef(key);
  // Start from the list this browser saw last, so the PDF link is there before anything loads.
  const [result, setResult] = useState<State>(() => fromIndex(key, savedDatasheetIndex(kind), item));
  const state = result.key === key ? result : fromIndex(key, savedDatasheetIndex(kind), item);

  useEffect(() => {
    current.current = key;
    let live = true;
    loadDatasheetIndex(kind).then((index) => {
      if (!live) return;
      const next = fromIndex(key, index, item);
      setResult((previous) => (previous.key === key && previous.status === "searching" ? previous : next));
    }).catch(() => { /* A click can retry when the background list is unavailable. */ });
    return () => { live = false; current.current = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- item is identified by its key
  }, [key, kind]);

  // No maker datasheet on file: "datasheet on request" is a lead; the web search stays as a link.
  const [ask, setAsk] = useState(false);

  if (state.url) return (
    <Button asChild className={className}>
      <a href={state.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.b} ${item.m} official datasheet PDF`}>
        <FileText className="mr-2 h-4 w-4" /> Datasheet (PDF)
      </a>
    </Button>
  );

  if (state.status === "none") return (
    <>
      <Button variant="outline" className={className} onClick={() => setAsk(true)}>
        <FileText className="mr-2 h-4 w-4" /> Datasheet on request
      </Button>
      <a href={searchUrl(item)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 self-center text-xs text-muted-foreground hover:text-primary hover:underline">
        <Search className="h-3 w-3" /> Search the web
      </a>
      <LeadDialog
        open={ask}
        onOpenChange={setAsk}
        kind="datasheet"
        source={`directory-${kind}`}
        title={`Datasheet for the ${item.b} ${item.m}`}
        intro="We do not have the maker's datasheet on file yet. We will find it and send it to you on WhatsApp or email."
        item={{ type: kind, id: item.id, name: `${item.b} ${item.m}`, brand: item.b, model: item.m }}
        action="Request datasheet"
      />
    </>
  );

  const find = async () => {
    // Reserve a tab during the click so async lookup does not trigger popup blockers.
    const tab = window.open("about:blank", "_blank");
    if (tab) { tab.opener = null; showWaiting(tab, item); }
    const go = (url: string) => { if (tab && !tab.closed) tab.location.replace(url); };
    setResult({ key, url: null, status: "searching" });
    try {
      // The list is usually loaded already: open our stored copy straight away.
      const index = await loadDatasheetIndex(kind).catch(() => null);
      if (current.current !== key) { tab?.close(); return; }
      const listed = fromIndex(key, index, item);
      if (listed.url) { setResult(listed); go(listed.url); return; }
      if (listed.status === "none") { setResult(listed); go(searchUrl(item)); return; }
      // Not collected yet: look it up now. A model whose PDFs are still downloading asks to retry shortly.
      let found: Lookup;
      for (let attempt = 1; ; attempt++) {
        try {
          found = await callDatasheets<Lookup>({ action: "find", kind, id: item.id });
          break;
        } catch (error) {
          if (attempt >= 6 || !/still being collected/i.test(error instanceof Error ? error.message : "")) throw error;
          await new Promise((resolve) => setTimeout(resolve, 2000));
          if (current.current !== key) { tab?.close(); return; }
        }
      }
      if (current.current !== key) { tab?.close(); return; }
      if (found.status === "found" && usable(found.url ?? undefined, item)) {
        setResult({ key, url: found.url, status: "idle" });
        rememberDatasheet(kind, item.id, found.url!);
        go(found.url!);
      } else if (found.status === "not_found" || found.status === "unsupported") {
        setResult({ key, url: null, status: "none" });
        go(searchUrl(item));
      } else throw new Error("Datasheet lookup unavailable");
    } catch {
      if (current.current === key) setResult({ key, url: null, status: "error" });
      tab?.close();
    }
  };

  return (
    <Button variant="outline" onClick={find} disabled={state.status === "searching"} className={className} aria-live="polite">
      {state.status === "searching" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : state.status === "error" ? <RefreshCw className="mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
      {state.status === "searching" ? "Finding the datasheet…" : state.status === "error" ? "Lookup unavailable — retry" : "Datasheet (PDF)"}
    </Button>
  );
}
