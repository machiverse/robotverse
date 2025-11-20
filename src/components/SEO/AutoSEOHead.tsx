import { Helmet } from 'react-helmet-async';

interface AutoSEOHeadProps {
  title: string;
  description: string;
  keywords: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
  canonicalUrl: string;
  schemaMarkup?: object;
  additionalMeta?: Array<{ name?: string; property?: string; content: string }>;
}

/**
 * Comprehensive Auto-SEO Head Component
 * Automatically generates all SEO tags, Open Graph, Twitter Cards, and Schema.org markup
 */
export const AutoSEOHead = ({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogImage,
  twitterCard = 'summary_large_image',
  canonicalUrl,
  schemaMarkup,
  additionalMeta = []
}: AutoSEOHeadProps) => {
  const fullTitle = title.includes('RobotVerse') ? title : `${title} | RobotVerse`;
  const fullDescription = description || 'India\'s leading marketplace for used industrial robots, spare parts, and automation services.';
  const keywordString = keywords.join(', ');
  
  const defaultOgImage = ogImage || 'https://www.robotverse.in/robotverse-logo.jpg';
  
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={fullDescription} />
      <meta name="keywords" content={keywordString} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={ogTitle || fullTitle} />
      <meta property="og:description" content={ogDescription || fullDescription} />
      <meta property="og:image" content={defaultOgImage} />
      <meta property="og:site_name" content="RobotVerse" />
      <meta property="og:locale" content="en_IN" />
      
      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={ogTitle || fullTitle} />
      <meta name="twitter:description" content={ogDescription || fullDescription} />
      <meta name="twitter:image" content={defaultOgImage} />
      
      {/* Additional Meta Tags */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />
      
      {/* Mobile Meta Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="mobile-web-app-capable" content="yes" />
      
      {/* Geographic Meta Tags */}
      <meta name="geo.region" content="IN" />
      <meta name="geo.placename" content="India" />
      
      {/* Additional custom meta tags */}
      {additionalMeta.map((meta, index) => (
        meta.name ? (
          <meta key={index} name={meta.name} content={meta.content} />
        ) : (
          <meta key={index} property={meta.property} content={meta.content} />
        )
      ))}
      
      {/* Schema.org structured data */}
      {schemaMarkup && (
        <script type="application/ld+json">
          {JSON.stringify(schemaMarkup)}
        </script>
      )}
      
      {/* Organization Schema - Global */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "RobotVerse",
          "url": "https://www.robotverse.in",
          "logo": "https://www.robotverse.in/robotverse-logo.png",
          "description": "India's leading marketplace for industrial robots, spare parts, and automation services",
          "address": {
            "@type": "PostalAddress",
            "addressCountry": "IN"
          },
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "Customer Service",
            "availableLanguage": ["English", "Hindi"]
          }
        })}
      </script>
      
      {/* WebSite Schema - Global */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "RobotVerse",
          "url": "https://www.robotverse.in",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://www.robotverse.in/search?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        })}
      </script>
    </Helmet>
  );
};

export default AutoSEOHead;
