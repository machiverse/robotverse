import { askStudioClaude, claudeImage, requireStudioUser, StudioError } from "../_shared/studioClaude.ts";

function check(value: unknown, message: string) { if (!value) throw new Error(message); }

Deno.test("Claude receives ordered frames through Messages and reads JSON text", async () => {
  const originalFetch = globalThis.fetch;
  const existing = Deno.env.get("ANTHROPIC_API_KEY");
  // Use a test-only credential; never print or inspect a real configured key.
  Deno.env.set("ANTHROPIC_API_KEY", "test-only-not-a-real-credential");
  globalThis.fetch = async (input, init) => {
    check(String(input) === "https://api.anthropic.com/v1/messages", "Wrong Claude endpoint");
    const body = JSON.parse(String(init?.body));
    check(body.model === "claude-sonnet-4-6", "Wrong model");
    check(body.messages[0].content[0].source.media_type === "image/jpeg", "Frame was not converted");
    check(body.messages[0].content[1].text === "Analyse OP10 then OP20", "Prompt order changed");
    return new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: '{"tasks":["CNC Turning","CNC Turning"]}' }] }));
  };
  try {
    const result = await askStudioClaude("Industrial engineer", "Analyse OP10 then OP20", ["data:image/jpeg;base64,YQ=="]);
    check(result.tasks.length === 2, "Repeated operations were dropped");
  } finally {
    globalThis.fetch = originalFetch;
    if (existing === undefined) Deno.env.delete("ANTHROPIC_API_KEY"); else Deno.env.set("ANTHROPIC_API_KEY", existing);
  }
});

Deno.test("Paid Claude analysis refuses a missing user session", async () => {
  try {
    await requireStudioUser(new Request("http://localhost"));
    throw new Error("Unauthenticated request allowed");
  } catch (error) {
    check(error instanceof StudioError && error.status === 401, "Expected sign-in rejection");
  }
});

Deno.test("Unsupported image formats are rejected", () => {
  try {
    claudeImage("data:image/svg+xml;base64,YQ==");
    throw new Error("SVG accepted");
  } catch (error) {
    check(error instanceof StudioError && error.status === 400, "Expected image validation");
  }
});

Deno.test("Organization keys send the configured Anthropic workspace header", async () => {
  const originalFetch = globalThis.fetch;
  const existingKey = Deno.env.get("ANTHROPIC_API_KEY");
  const existingWorkspace = Deno.env.get("ANTHROPIC_WORKSPACE_ID");
  Deno.env.set("ANTHROPIC_API_KEY", "test-only-not-a-real-credential");
  Deno.env.set("ANTHROPIC_WORKSPACE_ID", "  wrk_test_studio  ");
  globalThis.fetch = async (_input, init) => {
    const headers = new Headers(init?.headers);
    check(headers.get("anthropic-workspace-id") === "wrk_test_studio", "Missing workspace header");
    return Response.json({ content: [{ type: "text", text: '{"ok":true}' }] });
  };
  try {
    const result = await askStudioClaude("Engineer", "Analyse job");
    check(result.ok === true, "Analysis did not complete");
  } finally {
    globalThis.fetch = originalFetch;
    if (existingKey === undefined) Deno.env.delete("ANTHROPIC_API_KEY"); else Deno.env.set("ANTHROPIC_API_KEY", existingKey);
    if (existingWorkspace === undefined) Deno.env.delete("ANTHROPIC_WORKSPACE_ID"); else Deno.env.set("ANTHROPIC_WORKSPACE_ID", existingWorkspace);
  }
});

Deno.test("Missing workspace is actionable and never exposes provider messages", async () => {
  const originalFetch = globalThis.fetch;
  const existingKey = Deno.env.get("ANTHROPIC_API_KEY");
  const existingWorkspace = Deno.env.get("ANTHROPIC_WORKSPACE_ID");
  Deno.env.set("ANTHROPIC_API_KEY", "test-only-not-a-real-credential");
  Deno.env.delete("ANTHROPIC_WORKSPACE_ID");
  let calls = 0;
  globalThis.fetch = async (_input, init) => {
    calls++;
    check(!new Headers(init?.headers).has("anthropic-workspace-id"), "Invented workspace");
    return Response.json({ error: { message: "This API key is not scoped to a workspace; include the anthropic-workspace-id header. private-provider-detail" } }, { status: 400 });
  };
  try {
    let caught = false;
    try { await askStudioClaude("Engineer", "Analyse job"); }
    catch (error) {
      caught = true;
      check(error instanceof StudioError && error.status === 503, "Wrong configuration status");
      check(error instanceof Error && error.message.includes("ANTHROPIC_WORKSPACE_ID"), "Missing corrective action");
      check(error instanceof Error && !error.message.includes("private-provider-detail"), "Provider detail exposed");
    }
    check(caught && calls === 1, "Rejection retried or not raised");
  } finally {
    globalThis.fetch = originalFetch;
    if (existingKey === undefined) Deno.env.delete("ANTHROPIC_API_KEY"); else Deno.env.set("ANTHROPIC_API_KEY", existingKey);
    if (existingWorkspace === undefined) Deno.env.delete("ANTHROPIC_WORKSPACE_ID"); else Deno.env.set("ANTHROPIC_WORKSPACE_ID", existingWorkspace);
  }
});