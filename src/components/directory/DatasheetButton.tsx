import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { callDatasheets, loadDatasheetIndex, rememberDatasheet, type DatasheetItem, type DatasheetKind } from "./datasheetClient";
import { isOfficialUrl, OEM_SITES } from "../../../supabase/functions/_shared/datasheetPolicy";
export type { DatasheetItem, DatasheetKind } from "./datasheetClient";

type Lookup = { url: string | null; status: "found" | "not_found" | "unsupported" | "error" };
type State = { key: string; url: string | null; status: "idle" | "searching" | "none" | "error" };

export default function DatasheetButton({ kind, item, className }: { kind: DatasheetKind; item: DatasheetItem; className?: string }) {
  const key = `${kind}:${item.id}`;
  const current = useRef(key);
  const [result, setResult] = useState<State>({ key, url: null, status: "idle" });
  const state = result.key === key ? result : { key, url: null, status: "idle" as const };

  useEffect(() => {
    current.current = key;
    let live = true;
    loadDatasheetIndex(kind).then((index) => {
      const url = index[item.id];
      if (live && url && isOfficialUrl(url, item.b)) setResult({ key, url, status: "idle" });
    }).catch(() => { /* A click can retry when the background index is unavailable. */ });
    return () => { live = false; current.current = ""; };
  }, [key, kind, item.id, item.b]);

  if (state.url) return (
    <Button asChild className={className}>
      <a href={state.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.b} ${item.m} official datasheet PDF`}>
        <FileText className="mr-2 h-4 w-4" /> Datasheet (PDF)
      </a>
    </Button>
  );

  if (state.status === "none") {
    const sites = (OEM_SITES[item.b] ?? []).map((domain) => `site:${domain}`).join(" OR ");
    const query = `${sites} "${item.m}" ${item.b} datasheet filetype:pdf`;
    return (
      <Button variant="outline" asChild className={className}>
        <a href={`https://www.google.com/search?q=${encodeURIComponent(query)}`} target="_blank" rel="noopener noreferrer">
          <Search className="mr-2 h-4 w-4" /> Search manufacturer datasheet
        </a>
      </Button>
    );
  }

  const find = async () => {
    // Reserve a tab during the click so async lookup does not trigger popup blockers.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    setResult({ key, url: null, status: "searching" });
    try {
      const found = await callDatasheets<Lookup>({ action: "find", kind, id: item.id });
      if (current.current !== key) { tab?.close(); return; }
      if (found.status === "found" && found.url && isOfficialUrl(found.url, item.b)) {
        setResult({ key, url: found.url, status: "idle" });
        rememberDatasheet(kind, item.id, found.url);
        if (tab && !tab.closed) tab.location.replace(found.url);
      } else if (found.status === "not_found" || found.status === "unsupported") {
        setResult({ key, url: null, status: "none" });
        tab?.close();
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
