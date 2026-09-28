// Directory → Training & Workshops: calls to the "directory-training" edge function.
import { supabase } from "@/integrations/supabase/client";

export interface PosterInfo {
  title: string;
  organizer: string;
  kind: string;
  mode: string;
  location: string;
  dates: string;
  duration: string;
  fee: string;
  topics: string[];
  contact: string;
  registration: string;
  summary: string;
}

export interface TrainingPoster {
  id: string;
  image: string;
  info: PosterInfo;
  submittedAt: string;
  company?: string;
}

export interface EnquiryContact {
  name: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  mode: string;
  participants: string;
}

export const EMPTY_INFO: PosterInfo = {
  title: "",
  organizer: "",
  kind: "",
  mode: "",
  location: "",
  dates: "",
  duration: "",
  fee: "",
  topics: [],
  contact: "",
  registration: "",
  summary: "",
};

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("directory-training", { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") msg = (await ctx.json()).error || msg;
    } catch {
      /* keep the generic message */
    }
    throw new Error(msg || "Request failed");
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const listPosters = () => call<{ posters: TrainingPoster[] }>({ action: "list" }).then((r) => r.posters ?? []);
export const getPoster = (id: string) => call<{ poster: TrainingPoster }>({ action: "get", id }).then((r) => r.poster);
export const posterPath = (id: string) => `/directory/training/poster/${id}`;
export const posterShareUrl = (id: string) =>
  `${typeof window !== "undefined" ? window.location.origin : "https://www.robotverse.in"}${posterPath(id)}`;
export const analyzePoster = (image: string) => call<{ info: PosterInfo }>({ action: "analyze", image }).then((r) => r.info);
export const submitPoster = (image: string, info: PosterInfo, contact: Partial<EnquiryContact>) =>
  call<{ ok: boolean; id: string; image: string }>({ action: "submit", image, info, contact });
export const sendEnquiry = (
  listing: { id?: string; title: string; provider?: string; dates?: string; location?: string },
  contact: EnquiryContact,
  message: string,
) => call<{ ok: boolean }>({ action: "enquire", listing, contact, message });

/** Poster photo shrunk to at most 1600 px as a JPEG data URL (keeps uploads small). */
export function posterToDataUrl(file: File, maxSide = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Please choose an image (JPG, PNG or WebP)."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image."));
    };
    img.src = url;
  });
}
