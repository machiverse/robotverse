import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  jsonLd?: object | object[];
  noindex?: boolean;
}

const DEFAULT_SEO: SEOProps = {
  title: 'RobotVerse | Buy & Sell Used Industrial Robots in India - FANUC, ABB, KUKA, Yaskawa',
  description: 'India\'s marketplace for new, used, and refurbished industrial robots, spare parts, financing, logistics, and automation services. Browse verified FANUC, ABB, KUKA, and Yaskawa robots by brand, payload, reach, and application.',
  keywords: 'industrial robots, automation equipment, robot marketplace, FANUC robots, ABB robots, KUKA robots, Yaskawa robots, robot spare parts, automation services, robot financing, robot logistics',
  ogImage: '/og-image.jpg',
  ogType: 'website',
  twitterCard: 'summary_large_image',
};

export const SEOHead: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  canonical,
  ogTitle,
  ogDescription,
  ogImage,
  ogType,
  twitterCard,
  twitterTitle,
  twitterDescription,
  twitterImage,
  jsonLd,
  noindex = false,
}) => {
  const location = useLocation();

  useEffect(() => {
    const fullTitle = title || DEFAULT_SEO.title;
    const finalDescription = description || DEFAULT_SEO.description;
    const finalKeywords = keywords || DEFAULT_SEO.keywords;
    const finalCanonical = canonical || `${window.location.origin}${location.pathname}`;
    const finalOgTitle = ogTitle || title || DEFAULT_SEO.title;
    const finalOgDescription = ogDescription || description || DEFAULT_SEO.description;
    const finalOgImage = ogImage || DEFAULT_SEO.ogImage;
    const finalOgType = ogType || DEFAULT_SEO.ogType;
    const finalTwitterCard = twitterCard || DEFAULT_SEO.twitterCard;

    // Update title
    document.title = fullTitle!;

    // Update or create meta tags
    const updateOrCreateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Basic meta tags
    updateOrCreateMetaTag('description', finalDescription!);
    updateOrCreateMetaTag('keywords', finalKeywords!);
    
    // Robots meta tag
    if (noindex) {
      updateOrCreateMetaTag('robots', 'noindex, nofollow');
    } else {
      updateOrCreateMetaTag('robots', 'index, follow');
    }

    // Open Graph tags
    updateOrCreateMetaTag('og:title', finalOgTitle!, true);
    updateOrCreateMetaTag('og:description', finalOgDescription!, true);
    updateOrCreateMetaTag('og:image', `${window.location.origin}${finalOgImage}`, true);
    updateOrCreateMetaTag('og:url', finalCanonical, true);
    updateOrCreateMetaTag('og:type', finalOgType!, true);
    updateOrCreateMetaTag('og:site_name', 'RobotVerse', true);

    // Twitter Card tags
    updateOrCreateMetaTag('twitter:card', finalTwitterCard!);
    updateOrCreateMetaTag('twitter:title', twitterTitle || finalOgTitle!);
    updateOrCreateMetaTag('twitter:description', twitterDescription || finalOgDescription!);
    updateOrCreateMetaTag('twitter:image', `${window.location.origin}${twitterImage || finalOgImage}`);
    updateOrCreateMetaTag('twitter:site', '@RobotVerse');

    // Canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', finalCanonical);

    // JSON-LD structured data
    if (jsonLd) {
      const schemas = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      let scriptTag = document.querySelector('script[type="application/ld+json"]#dynamic-schema');
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.setAttribute('type', 'application/ld+json');
        scriptTag.setAttribute('id', 'dynamic-schema');
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(schemas.length === 1 ? schemas[0] : schemas);
    }

    // Cleanup function
    return () => {
      const dynamicSchema = document.querySelector('script[type="application/ld+json"]#dynamic-schema');
      if (dynamicSchema) {
        dynamicSchema.remove();
      }
    };
  }, [title, description, keywords, canonical, ogTitle, ogDescription, ogImage, ogType, 
      twitterCard, twitterTitle, twitterDescription, twitterImage, jsonLd, noindex, location.pathname]);

  return null;
};
