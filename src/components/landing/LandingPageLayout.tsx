/**
 * Reusable layout for programmatic SEO landing pages.
 * Header → Hero → grid of listings → AEO content block → Footer.
 */

import { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import AEOContentBlock from "@/components/SEO/AEOContentBlock";
import { Skeleton } from "@/components/ui/skeleton";

const BASE_URL = "https://www.robotverse.in";

interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  jsonld?: Record<string, unknown> | unknown[];
  summary?: string;
  highlights?: Array<{ title?: string; text?: string } | string>;
  faq?: Array<{ question: string; answer: string }>;
  keywords?: string[];
}

interface Props {
  seo: SeoMeta;
  heroTitle: string;
  heroSubtitle?: string;
  loading?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}

export function LandingPageLayout({
  seo,
  heroTitle,
  heroSubtitle,
  loading = false,
  emptyMessage,
  children,
}: Props) {
  const canonicalAbs = seo.canonical.startsWith("http")
    ? seo.canonical
    : `${BASE_URL}${seo.canonical}`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        {seo.keywords && seo.keywords.length > 0 && (
          <meta name="keywords" content={seo.keywords.join(", ")} />
        )}
        <link rel="canonical" href={canonicalAbs} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={canonicalAbs} />
        <meta property="og:type" content="website" />
        {seo.ogImage && <meta property="og:image" content={seo.ogImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
      </Helmet>

      <Header />

      <main className="flex-1">
        <section className="border-b border-border bg-muted/30">
          <div className="container mx-auto px-4 py-10 md:py-14">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{heroTitle}</h1>
            {heroSubtitle && (
              <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-3xl">
                {heroSubtitle}
              </p>
            )}
          </div>
        </section>

        <section className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            children
          )}
          {!loading && emptyMessage && (
            <div className="mt-6 text-sm text-muted-foreground">{emptyMessage}</div>
          )}
        </section>

        <section className="container mx-auto px-4 pb-12">
          <AEOContentBlock
            summary={seo.summary}
            highlights={seo.highlights}
            faq={seo.faq}
            jsonld={seo.jsonld}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default LandingPageLayout;
