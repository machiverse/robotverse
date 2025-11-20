import { useEffect } from 'react';

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
 * Comprehensive Auto-SEO Head Component (Native Implementation)
 * Automatically generates all SEO tags without external dependencies
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
  
  useEffect(() => {
    // Update document title
    document.title = fullTitle;
    
    // Update or create meta tags
    const updateMetaTag = (selector: string, content: string, attribute: 'name' | 'property' = 'name') => {
      let tag = document.querySelector(selector);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, selector.replace('meta[name="', '').replace('meta[property="', '').replace('"]', ''));
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };
    
    // Primary meta tags
    updateMetaTag('meta[name="description"]', fullDescription);
    updateMetaTag('meta[name="keywords"]', keywordString);
    
    // Open Graph tags
    updateMetaTag('meta[property="og:type"]', 'website', 'property');
    updateMetaTag('meta[property="og:url"]', canonicalUrl, 'property');
    updateMetaTag('meta[property="og:title"]', ogTitle || fullTitle, 'property');
    updateMetaTag('meta[property="og:description"]', ogDescription || fullDescription, 'property');
    updateMetaTag('meta[property="og:image"]', defaultOgImage, 'property');
    updateMetaTag('meta[property="og:site_name"]', 'RobotVerse', 'property');
    
    // Twitter Card tags
    updateMetaTag('meta[name="twitter:card"]', twitterCard);
    updateMetaTag('meta[name="twitter:url"]', canonicalUrl);
    updateMetaTag('meta[name="twitter:title"]', ogTitle || fullTitle);
    updateMetaTag('meta[name="twitter:description"]', ogDescription || fullDescription);
    updateMetaTag('meta[name="twitter:image"]', defaultOgImage);
    
    // Robots directives
    updateMetaTag('meta[name="robots"]', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    
    // Update canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
    
    // Add schema markup
    if (schemaMarkup) {
      let schemaScript = document.querySelector('script[type="application/ld+json"]#page-schema');
      if (!schemaScript) {
        schemaScript = document.createElement('script');
        schemaScript.setAttribute('type', 'application/ld+json');
        schemaScript.setAttribute('id', 'page-schema');
        document.head.appendChild(schemaScript);
      }
      schemaScript.textContent = JSON.stringify(schemaMarkup);
    }
    
    // Additional meta tags
    additionalMeta.forEach((meta, index) => {
      if (meta.name) {
        updateMetaTag(`meta[name="${meta.name}"]`, meta.content);
      } else if (meta.property) {
        updateMetaTag(`meta[property="${meta.property}"]`, meta.content, 'property');
      }
    });
    
  }, [fullTitle, fullDescription, keywordString, ogTitle, ogDescription, defaultOgImage, canonicalUrl, twitterCard, schemaMarkup, additionalMeta]);
  
  return null; // This component doesn't render anything
};

export default AutoSEOHead;
