// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const browserOnlyStub = fileURLToPath(
  new URL("./src/lib/browser-only-stub.ts", import.meta.url),
);

// jspdf / html2canvas are browser-only (their package exports lack a "workerd"
// condition) and are dynamically imported at point of use in the browser.
// Resolve them to a throwing stub in every non-client environment so the
// server/workerd bundle never tries to resolve their browser-targeted exports.
const BROWSER_ONLY = new Set(["jspdf", "html2canvas"]);

function browserOnlyLibs(): Plugin {
  return {
    name: "robotverse:browser-only-libs",
    enforce: "pre",
    resolveId(id) {
      if (!BROWSER_ONLY.has(id)) return null;
      const envName = (this as { environment?: { name?: string } }).environment?.name;
      if (envName && envName !== "client") return browserOnlyStub;
      return null;
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [browserOnlyLibs()],
  },
});
