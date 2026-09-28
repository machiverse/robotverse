import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AlertTriangle, Camera, Loader2, Sparkles, Video, X } from "lucide-react";
import { analyzeMedia, framesFromFiles, isMediaFile, type MediaAnalysis } from "./mediaAnalysis";

interface Props {
  /** Called with the analysis and the still frames it was made from. */
  onResult: (result: MediaAnalysis, frames: string[]) => void;
  /** Files already chosen elsewhere (e.g. Automation Studio step 1). */
  files?: File[];
  className?: string;
}

// Upload photos or a video of manual work; AI finds the tasks a robot line takes over.
export default function MediaAnalyzer({ onResult, files: external, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MediaAnalysis | null>(null);
  const list = useMemo(() => (external ? external.filter(isMediaFile) : files), [external, files]);

  useEffect(() => {
    const urls = list.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : ""));
    setPreviews(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [list]);

  async function run() {
    setError(null);
    setResult(null);
    try {
      setBusy(list.some((f) => f.type.startsWith("video/")) ? "Reading video frames…" : "Preparing photos…");
      const frames = await framesFromFiles(list);
      if (!frames.length) throw new Error("No photo or video frame could be read.");
      setBusy("AI is studying the manual work…");
      const r = await analyzeMedia(frames, note);
      if (!r.tasks.length && !r.description) throw new Error("No automatable task was found. Try a clearer photo of the work.");
      setResult(r);
      onResult(r, frames);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {!external && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files).filter(isMediaFile)].slice(0, 6));
          }}
          className="flex w-full flex-col items-center gap-1 rounded-md border-2 border-dashed border-border bg-background px-3 py-4 text-center text-xs text-muted-foreground transition-colors hover:border-primary"
        >
          <span className="flex items-center gap-1.5 text-primary">
            <Camera className="h-4 w-4" /> <Video className="h-4 w-4" />
          </span>
          <span className="font-medium text-foreground">Upload a photo or video of the manual work</span>
          <span>JPG, PNG, MP4 · up to 6 files</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files || []).filter(isMediaFile);
              setFiles((prev) => [...prev, ...picked].slice(0, 6));
              e.target.value = "";
            }}
          />
        </button>
      )}

      {list.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {list.map((f, i) => (
              <div key={`${f.name}-${i}`} className="relative h-12 w-12 overflow-hidden rounded border border-border bg-muted" title={f.name}>
                {previews[i] ? (
                  <img src={previews[i]} alt={f.name} className="h-full w-full object-cover" />
                ) : (
                  <Video className="m-3.5 h-5 w-5 text-muted-foreground" />
                )}
                {!external && (
                  <button
                    type="button"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute right-0 top-0 rounded-bl bg-black/60 p-0.5 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note, e.g. part weight 5 kg, 2 shifts"
            className="h-8 text-xs"
          />
          <Button size="sm" className="w-full" onClick={run} disabled={!!busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {busy || "Analyze with AI and build 3D"}
          </Button>
        </>
      )}

      {error && (
        <p className="flex gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span>
            {error} You can also describe the work in words above; the studio plans it the same way.
          </span>
        </p>
      )}

      {result && (
        <div className="space-y-1.5 rounded-md border border-primary/30 bg-primary/5 p-2.5 text-[11px]">
          <p className="flex items-center justify-between gap-2 font-semibold text-foreground">
            AI found in your media
            <Badge variant="outline" className="h-4 px-1 text-[9px] font-normal">
              {result.confidence} confidence
            </Badge>
          </p>
          <p>{result.summary}</p>
          {result.workpiece?.name && (
            <p className="text-muted-foreground">
              Part: {result.workpiece.name}
              {result.workpiece.material && result.workpiece.material !== "unknown" ? ` · ${result.workpiece.material}` : ""}
              {result.workpiece.weight_kg ? ` · ~${result.workpiece.weight_kg} kg` : ""}
            </p>
          )}
          {result.manual_steps.length > 0 && (
            <div>
              <p className="font-semibold text-muted-foreground">Manual work today</p>
              <ol className="list-inside list-decimal">
                {result.manual_steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}
          {result.tasks.length > 0 && (
            <p>
              <span className="font-semibold text-muted-foreground">Robot tasks: </span>
              {result.tasks.join(" → ")}
            </p>
          )}
          {result.observations.length > 0 && (
            <p className="text-muted-foreground">Seen: {result.observations.join("; ")}</p>
          )}
        </div>
      )}
    </div>
  );
}
