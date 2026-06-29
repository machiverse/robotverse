// image-seo: Generate accessible alt text, caption, and a structured filename
// slug for any image URL, then upsert into public.seo_image_metadata.
//
// Body: { image_url, content_type, content_id, context? }
// Uses Lovable AI Gateway (Gemini vision) — set LOVABLE_API_KEY in secrets.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  image_url: string;
  content_type: string;
  content_id: string;
  context?: string;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function analyzeImage(imageUrl: string, context: string): Promise<{
  alt: string;
  caption: string;
  keywords: string[];
  dominant_colors: string[];
}> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You generate accessible alt text, captions, and SEO keywords for industrial-robot marketplace images. Respond ONLY with compact JSON matching the requested schema.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Context: ${context || "industrial robot marketplace listing"}\n\n` +
                `Return JSON: {"alt":"<=125 char accessible alt", "caption":"<=180 char caption", "keywords":["5-8 SEO keywords"], "dominant_colors":["#hex","#hex"]}`,
            },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI gateway ${res.status}: ${txt.slice(0, 200)}`);
  }

  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  const cleaned = raw.replace(/```json|```/g, "").trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {};
  }
  return {
    alt: (parsed.alt ?? "").toString().slice(0, 125),
    caption: (parsed.caption ?? "").toString().slice(0, 180),
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 8) : [],
    dominant_colors: Array.isArray(parsed.dominant_colors) ? parsed.dominant_colors.slice(0, 5) : [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body.image_url || !body.content_type || !body.content_id) {
      return new Response(JSON.stringify({ error: "image_url, content_type, content_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const analysis = await analyzeImage(body.image_url, body.context ?? "");
    const filename_slug = slugify(`${body.content_type}-${analysis.alt || body.content_id}`);

    const { data, error } = await supabase
      .from("seo_image_metadata")
      .upsert(
        {
          image_url: body.image_url,
          content_type: body.content_type,
          content_id: body.content_id,
          alt_text: analysis.alt,
          caption: analysis.caption,
          keywords: analysis.keywords,
          dominant_colors: analysis.dominant_colors,
          filename_slug,
          status: "generated",
          generated_at: new Date().toISOString(),
        },
        { onConflict: "image_url" }
      )
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, metadata: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error("image-seo error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
