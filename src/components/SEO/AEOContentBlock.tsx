/**
 * AEO/GEO Content Block — renders FAQ, summary, highlights, and JSON-LD
 * blocks from seo_metadata directly into the DOM so AI crawlers
 * (GPTBot, PerplexityBot, ClaudeBot, Google-Extended) can read them
 * without needing to execute heavy JS.
 *
 * Drop this near the bottom of any detail or landing page.
 */

import { Helmet } from "react-helmet-async";

type FAQItem = { question: string; answer: string };
type Highlight = { title?: string; text?: string } | string;

interface Props {
  summary?: string | null;
  highlights?: Highlight[] | null;
  faq?: FAQItem[] | null;
  jsonld?: Record<string, unknown> | unknown[] | null;
  /** When true, the visible block is hidden via sr-only but still in the DOM. */
  visuallyHidden?: boolean;
  className?: string;
}

export function AEOContentBlock({
  summary,
  highlights,
  faq,
  jsonld,
  visuallyHidden = false,
  className = "",
}: Props) {
  const hasAny = !!summary || (highlights && highlights.length > 0) || (faq && faq.length > 0);
  if (!hasAny && !jsonld) return null;

  const faqSchema = faq && faq.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((q) => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: { "@type": "Answer", text: q.answer },
        })),
      }
    : null;

  return (
    <>
      <Helmet>
        {faqSchema && (
          <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        )}
        {jsonld && (
          <script type="application/ld+json">{JSON.stringify(jsonld)}</script>
        )}
      </Helmet>

      <section
        aria-label="Overview and frequently asked questions"
        className={`${visuallyHidden ? "sr-only" : "mt-12 space-y-8"} ${className}`}
        data-aeo-block="true"
      >
        {summary && (
          <div>
            <h2 className="text-2xl font-semibold mb-3">Overview</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {summary}
            </p>
          </div>
        )}

        {highlights && highlights.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-3">Key highlights</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              {highlights.map((h, i) => {
                const item = typeof h === "string" ? { text: h } : h;
                return (
                  <li key={i}>
                    {item.title && <strong className="text-foreground">{item.title}: </strong>}
                    {item.text}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {faq && faq.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-3">Frequently asked questions</h2>
            <div className="space-y-4">
              {faq.map((q, i) => (
                <details key={i} className="rounded-lg border border-border p-4">
                  <summary className="cursor-pointer font-medium">{q.question}</summary>
                  <p className="mt-2 text-muted-foreground whitespace-pre-line">{q.answer}</p>
                </details>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default AEOContentBlock;
