import type { RobotResource } from "../../lib/seo/robotResources";

interface RobotResourceContentProps {
  resource: RobotResource;
}

/** Visible guide content, shared by the website and static SEO renderer. */
export function RobotResourceContent({ resource }: RobotResourceContentProps) {
  return (
    <article className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li><a href="/" className="underline-offset-4 hover:text-primary hover:underline">Home</a></li>
          <li aria-hidden="true">/</li>
          <li><a href="/robot-guides" className="underline-offset-4 hover:text-primary hover:underline">Robot guides</a></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">{resource.heading}</li>
        </ol>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{resource.heading}</h1>
      <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{resource.intro}</p>

      <div className="mt-10 space-y-10">
        {resource.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-semibold sm:text-2xl">{section.heading}</h2>
            <div className="mt-4 space-y-4 text-muted-foreground">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="leading-relaxed">{paragraph}</p>
              ))}
            </div>
            {section.links && section.links.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="font-medium text-primary underline underline-offset-4 hover:no-underline">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <section className="mt-12 border-t pt-8">
        <h2 className="text-xl font-semibold sm:text-2xl">Frequently asked questions</h2>
        <dl className="mt-5 space-y-6">
          {resource.faq.map((faq) => (
            <div key={faq.question}>
              <dt className="font-semibold">{faq.question}</dt>
              <dd className="mt-2 leading-relaxed text-muted-foreground">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  );
}

export default RobotResourceContent;
import * as React from "react";
