import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { Boxes, ChevronRight, Loader2, Mail, ShoppingCart, Wrench } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import ItemImage from "@/components/directory/ItemImage";
import DatasheetButton from "@/components/directory/DatasheetButton";
import { enquiryMailto, type CatalogItem, type CatalogKind } from "@/components/directory/directoryTypes";
import { DIRECTORY_FILE, DIRECTORY_TYPES, directoryItemSeo, directorySlug, type DirectoryType } from "@/lib/seo/seoText";
import { encodeLine } from "@/features/automation3d/builderExtras";

const cache: Partial<Record<CatalogKind, Promise<CatalogItem[]>>> = {};
const load = (kind: CatalogKind) =>
  (cache[kind] ??= fetch(`/directory/${kind}.json`).then((r) => (r.ok ? (r.json() as Promise<CatalogItem[]>) : []), () => []));

const brandSlug = (b: string) => directorySlug(b.split(" ")[0]);

/** One robot, tool or external-axis model from the Directory: full specs, Q&A, and where to buy or use it. */
export default function DirectoryModelPage() {
  const { type = "robot", slug = "" } = useParams();
  const t = (DIRECTORY_TYPES as readonly string[]).includes(type) ? (type as DirectoryType) : null;
  const kind = t ? DIRECTORY_FILE[t] : null;
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  useEffect(() => {
    if (!kind) return setItems([]);
    let live = true;
    load(kind).then((l) => live && setItems(l));
    return () => {
      live = false;
    };
  }, [kind]);

  const item = useMemo(() => items?.find((i) => directorySlug(i.n) === slug.toLowerCase()) ?? null, [items, slug]);
  const seo = t && item ? directoryItemSeo(t, item) : null;
  const sameBrand = useMemo(() => {
    if (!item || !items) return [];
    const near = items.filter((i) => i.b === item.b && i.id !== item.id);
    // Closest payloads first, so the links are useful alternatives.
    return near.sort((a, b) => Math.abs((a.p ?? 0) - (item.p ?? 0)) - Math.abs((b.p ?? 0) - (item.p ?? 0))).slice(0, 24);
  }, [item, items]);
  const builderLink =
    t === "robot" && item
      ? `/automation-studio/build#line=${encodeLine([{ job: "", choice: { robot: { source: "oem", id: item.id } as never } }])}`
      : "/automation-studio/build";
  const canonical = `https://www.robotverse.in/directory/${type}/${slug.toLowerCase()}`;

  if (items === null)
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <p className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading specifications…
        </p>
      </div>
    );

  if (!t || !kind || !item || !seo)
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Model not found | RobotVerse Directory</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <EnhancedHeader />
        <main className="container mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold">Model not found</h1>
          <p className="mt-2 text-muted-foreground">This model is not in the RobotVerse directory.</p>
          <Button asChild className="mt-6">
            <Link to="/directory">Browse the directory</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <EnhancedHeader />
      <main className="container mx-auto max-w-6xl px-4 pb-16">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 pt-5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/directory" className="hover:text-primary">Directory</Link>
          <ChevronRight className="h-3 w-3" />
          <span>{item.b}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{item.m}</span>
        </nav>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{seo.kindWord}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{item.n} specifications</h1>
            <p className="mt-3 max-w-[70ch] text-muted-foreground">{seo.description}</p>

            <table className="mt-6 w-full max-w-xl text-sm">
              <tbody className="divide-y divide-border">
                {seo.specs
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <tr key={k}>
                      <th scope="row" className="w-44 py-2 pr-4 text-left font-medium text-muted-foreground">{k}</th>
                      <td className="py-2 tabular-nums">{v}</td>
                    </tr>
                  ))}
              </tbody>
            </table>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild>
                <Link to={`/robots?search=${encodeURIComponent(item.m)}`}>
                  <ShoppingCart className="mr-2 h-4 w-4" /> Used {item.m} for sale
                </Link>
              </Button>
              {t === "robot" && (
                <Button variant="outline" asChild>
                  <Link to={builderLink}>
                    <Boxes className="mr-2 h-4 w-4" /> Try it in the 3D cell builder
                  </Link>
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link to={`/parts/brand/${brandSlug(item.b)}`}>
                  <Wrench className="mr-2 h-4 w-4" /> {item.b} spare parts
                </Link>
              </Button>
              <DatasheetButton kind={kind} item={item} />
              <Button variant="ghost" asChild>
                <a href={enquiryMailto(item)}>
                  <Mail className="mr-2 h-4 w-4" /> Enquire
                </a>
              </Button>
            </div>
          </div>
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted/40">
            <ItemImage kind={kind} item={item} large />
          </div>
        </div>

        <section aria-labelledby="faq" className="mt-12 max-w-3xl">
          <h2 id="faq" className="text-lg font-semibold">{item.n}: questions and answers</h2>
          <dl className="mt-4 space-y-4">
            {seo.faq.map((f) => (
              <div key={f.question}>
                <dt className="font-medium">{f.question}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        {sameBrand.length > 0 && (
          <section aria-labelledby="more" className="mt-12">
            <h2 id="more" className="text-lg font-semibold">Other {item.b} models</h2>
            <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {sameBrand.map((o) => (
                <li key={o.id}>
                  <Link to={`/directory/${type}/${directorySlug(o.n)}`} className="text-primary underline-offset-4 hover:underline">
                    {o.n}
                  </Link>
                  <span className="text-muted-foreground">
                    {o.p ? ` · ${o.p} kg` : ""}
                    {o.r ? ` · ${o.r} mm` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-10 text-xs text-muted-foreground">Specifications are indicative. Please confirm with the manufacturer before purchase.</p>
      </main>
      <Footer />
    </div>
  );
}
