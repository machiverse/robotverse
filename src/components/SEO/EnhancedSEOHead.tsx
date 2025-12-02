/**
 * Enhanced SEO Head Component
 * Comprehensive SEO with schemas, internal links, and technical optimizations
 */

import { useEffect } from 'react';
import {
  generateSEOTitle,
  generateMetaDescription,
  generateCanonicalURL,
  generateRobotsMeta,
  generateOpenGraphTags,
  generateTwitterCardTags,
  generateJSONLDScript,
  generatePreloadHints
} from '@/utils/seo/technicalSEO';

interface EnhancedSEOHeadProps {
  title: string;
  description: string;
  keywords?: string[];
  canonicalPath: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  schemas?: object[];
  noIndex?: boolean;
  additionalMeta?: Record<string, string>;
}

export const EnhancedSEOHead = ({
  title,
  description,
  keywords = [],
  canonicalPath,
  ogImage,
  ogType = 'website',
  schemas = [],
  noIndex = false,
  additionalMeta = {}
}: EnhancedSEOHeadProps) => {
  const fullTitle = generateSEOTitle(title);
  const fullDescription = generateMetaDescription(description);
  const canonicalUrl = generateCanonicalURL(canonicalPath);
  const robotsMeta = generateRobotsMeta({ index: !noIndex, follow: true });
  
  const ogTags = generateOpenGraphTags({
    title: fullTitle,
    description: fullDescription,
    url: canonicalUrl,
    image: ogImage,
    type: ogType
  });
  
  const twitterTags = generateTwitterCardTags({
    title: fullTitle,
    description: fullDescription,
    image: ogImage
  });

  useEffect(() => {
    // Update document title
    document.title = fullTitle;
    
    // Helper to update meta tags
    const updateMeta = (attr: string, value: string, content: string) => {
      let tag = document.querySelector(`meta[${attr}="${value}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, value);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };
    
    // Primary meta
    updateMeta('name', 'description', fullDescription);
    updateMeta('name', 'keywords', keywords.join(', '));
    updateMeta('name', 'robots', robotsMeta);
    
    // Open Graph
    Object.entries(ogTags).forEach(([key, value]) => {
      updateMeta('property', key, value as string);
    });
    
    // Twitter Cards
    Object.entries(twitterTags).forEach(([key, value]) => {
      updateMeta('name', key, value as string);
    });
    
    // Additional meta
    Object.entries(additionalMeta).forEach(([key, value]) => {
      updateMeta('name', key, value);
    });
    
    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
    
    // Preload hints
    generatePreloadHints().forEach(hint => {
      const existing = document.querySelector(`link[href="${hint.href}"]`);
      if (!existing) {
        const link = document.createElement('link');
        link.rel = hint.rel;
        link.href = hint.href;
        document.head.appendChild(link);
      }
    });
    
    // JSON-LD Schema
    if (schemas.length > 0) {
      let schemaScript = document.querySelector('script#enhanced-schema');
      if (!schemaScript) {
        schemaScript = document.createElement('script');
        schemaScript.setAttribute('type', 'application/ld+json');
        schemaScript.setAttribute('id', 'enhanced-schema');
        document.head.appendChild(schemaScript);
      }
      schemaScript.textContent = generateJSONLDScript(schemas);
    }
    
    return () => {
      const schema = document.querySelector('script#enhanced-schema');
      if (schema) schema.remove();
    };
  }, [fullTitle, fullDescription, keywords, canonicalUrl, robotsMeta, ogTags, twitterTags, schemas, additionalMeta]);
  
  return null;
};

export default EnhancedSEOHead;
