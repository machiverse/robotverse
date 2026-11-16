import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

export { corsHeaders };
export class StudioError extends Error {
  constructor(message: string, public status = 500) { super(message); }
}

/** Paid analysis requires a real user session; never accept the public anon token. */
export async function requireStudioUser(req: Request) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new StudioError("Sign in to use Claude process analysis.", 401);
  const client = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new StudioError("Sign in to use Claude process analysis.", 401);
}

export function claudeImage(url: string) {
  const match = /^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/=]+)$/.exec(url);
  if (match) return { type: "image", source: { type: "base64", media_type: match[1], data: match[2] } };
  if (/^https:\/\//.test(url)) return { type: "image", source: { type: "url", url } };
  throw new StudioError("Use a JPEG, PNG, GIF or WebP photo.", 400);
}

/** One bounded request; no automatic provider switch or duplicate charge on errors. */
export async function askStudioClaude(system: string, prompt: string, images: string[] = [], maxTokens = 8000) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new StudioError("Claude analysis is not configured.", 503);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: AbortSignal.timeout(110_000),
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6", max_tokens: maxTokens, temperature: 0.2, system,
      messages: [{ role: "user", content: [...images.map(claudeImage), { type: "text", text: prompt }] }],
    }),
  });
  if (!response.ok) {
    // Never log provider response bodies: credential failures may contain sensitive values.
    console.error("Claude analysis failed", response.status);
    const message = response.status === 429 ? "Claude is busy or its usage limit was reached. Try again shortly."
      : response.status === 401 || response.status === 403 ? "Claude could not authorize analysis. Check the saved key and Anthropic account access."
      : response.status === 402 ? "Add credit to the Anthropic account to continue analysis."
      : `Claude could not complete analysis (${response.status}). Please try again.`;
    throw new StudioError(message, response.status === 429 ? 429 : 502);
  }
  const data = await response.json();
  if (data.stop_reason === "max_tokens") throw new StudioError("Claude's analysis was incomplete. Try a shorter brief or fewer photos.", 502);
  const raw = (data.content ?? []).filter((part: { type: string }) => part.type === "text").map((part: { text: string }) => part.text).join("\n");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  try {
    const result = JSON.parse(raw.slice(start, end + 1));
    if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error();
    return result;
  } catch {
    throw new StudioError("Could not read Claude's analysis. Please try again.", 502);
  }
}