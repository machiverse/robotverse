/**
 * Automation Studio — photo / video analysis of manual work.
 *
 * Photos are downscaled in the browser; videos are sampled into a few still
 * frames. The frames go to the "automation-media-analyze" edge function
 * (Gemini vision), which answers with the studio's own skill names so the
 * planner and 3D simulator can use them directly.
 */

import { supabase } from "@/integrations/supabase/client";
import { SKILL_LIBRARY } from "@/utils/processAnalyzer";

export interface MediaAnalysis {
  summary: string;
  workpiece: { name?: string; material?: string; size?: string; weight_kg?: number | null } | null;
  manual_steps: string[];
  tasks: string[];
  description: string;
  observations: string[];
  confidence: "high" | "medium" | "low";
}

const MAX_SIDE = 896;
const VIDEO_FRAMES = 4;

function drawToDataUrl(source: CanvasImageSource, w: number, h: number): string {
  const k = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * k);
  canvas.height = Math.round(h * k);
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

function imageFrame(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(drawToDataUrl(img, img.naturalWidth, img.naturalHeight));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file.name}`));
    };
    img.src = url;
  });
}

/** Still frames spread across the video (10% … 90%). */
function videoFrames(file: File, count = VIDEO_FRAMES): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    const frames: string[] = [];
    const fail = () => {
      URL.revokeObjectURL(url);
      if (frames.length) resolve(frames);
      else reject(new Error(`Could not read video ${file.name}. Try MP4 (H.264).`));
    };
    const timer = window.setTimeout(fail, 20000);
    video.onerror = () => {
      window.clearTimeout(timer);
      fail();
    };
    video.onloadedmetadata = () => {
      const d = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
      const times = Array.from({ length: count }, (_, i) => d * (0.1 + (0.8 * i) / Math.max(1, count - 1)));
      const next = () => {
        if (!times.length) {
          window.clearTimeout(timer);
          URL.revokeObjectURL(url);
          resolve(frames);
          return;
        }
        video.currentTime = Math.min(times.shift()!, Math.max(0, d - 0.05));
      };
      video.onseeked = () => {
        try {
          frames.push(drawToDataUrl(video, video.videoWidth, video.videoHeight));
        } catch {
          /* a frame that cannot be drawn is skipped */
        }
        next();
      };
      next();
    };
  });
}

/** Still frames from the photos and videos the user uploaded (max 6). */
export async function framesFromFiles(files: File[]): Promise<string[]> {
  const out: string[] = [];
  for (const f of files) {
    if (out.length >= 6) break;
    if (f.type.startsWith("image/")) out.push(await imageFrame(f));
    else if (f.type.startsWith("video/")) out.push(...(await videoFrames(f, Math.min(VIDEO_FRAMES, 6 - out.length))));
  }
  return out.slice(0, 6);
}

export const isMediaFile = (f: File) => f.type.startsWith("image/") || f.type.startsWith("video/");

/** Ask the vision model which robot tasks the pictured manual work needs. */
export async function analyzeMedia(frames: string[], note = ""): Promise<MediaAnalysis> {
  const { data, error } = await supabase.functions.invoke("automation-media-analyze", {
    body: { images: frames, note, skills: SKILL_LIBRARY.map((s) => s.template.name) },
  });
  if (error) {
    // The function body carries a readable message when it answered with an error status.
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") msg = (await ctx.json()).error || msg;
    } catch {
      /* keep the generic message */
    }
    throw new Error(msg || "Photo analysis is not available right now.");
  }
  if (!data || data.error) throw new Error(data?.error || "No analysis returned.");
  return data as MediaAnalysis;
}
