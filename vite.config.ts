import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import seoStatic from "./seoStatic";
import robotResourcesStatic from "./robotResourcesStatic";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    outDir: 'dist',
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    // Per-page HTML, static sitemaps and llms-full.txt for crawlers (production build only; never fails the build).
    seoStatic(loadEnv(mode, process.cwd(), "")),
    robotResourcesStatic(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
  },
}));
