import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  canonicalFor,
  classifyPath,
  INDEXABLE_ROBOTS,
  NOINDEX_ROBOTS,
  staticMeta,
} from "@/lib/seo/seoText";

/**
 * Keeps the document head in agreement with the `seo-render` edge function.
 * Both read the same builders in src/lib/seo/seoText.ts (mirrored server-side at
 * supabase/functions/_shared/seoText.ts); entity-specific routes additionally
 * ask the function for the exact snapshot values so the SPA head and the
 * crawlable snapshot can never diverge. No visible UI is touched.
 */

function setMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

function apply(head: {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  image?: string | null;
  ogType?: string;
}) {
  if (head.title) document.title = head.title;
  if (head.description) {
    setMeta("name", "description", head.description);
    setMeta("property", "og:description", head.description);
    setMeta("name", "twitter:description", head.description);
  }
  setMeta("property", "og:title", head.title);
  setMeta("name", "twitter:title", head.title);
  setMeta("property", "og:url", head.canonical);
  setMeta("property", "og:type", head.ogType || "website");
  setMeta("name", "robots", head.robots);
  if (head.image) {
    setMeta("property", "og:image", head.image);
    setMeta("name", "twitter:image", head.image);
  }
  setCanonical(head.canonical);
}

const ENTITY_KINDS = new Set([
  "robot",
  "part",
  "service",
  "robot-brand",
  "robot-city",
  "part-brand",
  "part-category",
  "service-city",
  "blog",
  "robobook-post",
]);

type Desired = Parameters<typeof apply>[0];

export function useCanonicalHead() {
  const location = useLocation();
  const desired = useRef<Desired | null>(null);

  useEffect(() => {
    let cancelled = false;
    const path = location.pathname;
    const match = classifyPath(path);
    const base = staticMeta(match.kind);

    desired.current = {
      title: base.title,
      description: base.description,
      canonical: canonicalFor(path),
      robots:
        match.kind === "private" || match.kind === "unknown" || match.kind === "gone"
          ? NOINDEX_ROBOTS
          : INDEXABLE_ROBOTS,
    };
    apply(desired.current);

    // Page-level SEO effects run after this one; re-assert the authoritative
    // values whenever they change the head so the SPA matches seo-render.
    const enforce = () => {
      if (desired.current) apply(desired.current);
    };
    const observer = new MutationObserver(enforce);
    observer.observe(document.head, { childList: true, subtree: true, attributes: true });

    if (ENTITY_KINDS.has(match.kind)) {
      // The function is a public GET endpoint; fetch it directly with the path.
      (async () => {
        try {
          const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seo-render?path=${encodeURIComponent(path)}`;
          const res = await fetch(url, {
            headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
          });
          if (!res.ok || cancelled) return;
          const snap = await res.json();
          if (cancelled || !snap?.title) return;
          desired.current = {
            title: snap.title,
            description: snap.description,
            canonical: snap.canonical,
            robots: snap.robots,
            image: snap.image,
            ogType: snap.ogType,
          };
          apply(desired.current);
        } catch {
          // keep the locally derived head values
        }
      })();
    }

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [location.pathname]);
}

export default useCanonicalHead;
