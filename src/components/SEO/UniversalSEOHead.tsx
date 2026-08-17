/**
 * Universal SEO Head Component for RobotVerse
 * Drop-in replacement for all SEO needs with modern optimization
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  PAGE_KEYWORD_MAP,
  generateOptimizedTitle,
  generateOptimizedDescription,
  getPageKeywords,
  getLocationKeywords,
  getBrandKeywords,
  getApplicationKeywords
} from '@/utils/seo/masterSEO';

const BASE_URL = 'https://www.robotverse.in';
const DEFAULT_OG_IMAGE = `${BASE_URL}/robotverse-logo.jpg`;
const LOGO_URL = `${BASE_URL}/robotverse-logo.jpg`;

interface UniversalSEOHeadProps {
  // Page type for automatic keyword/meta generation
  pageType?: keyof typeof PAGE_KEYWORD_MAP;
  
  // Override automatic generation
  title?: string;
  description?: string;
  keywords?: string[];
  
  // Dynamic data for template replacement
  dynamicData?: Record<string, string>;
  
  // Open Graph
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  
  // Twitter Card
  twitterCard?: 'summary' | 'summary_large_image';
  
  // Technical SEO
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  
  // Schema.org JSON-LD
  schemas?: object[];
  
  // Additional meta tags
  additionalMeta?: Array<{name?: string; property?: string; content: string}>;
  
  // Location/Brand for additional keywords
  location?: string;
  brand?: string;
  applications?: string[];
}

export const UniversalSEOHead = ({
  pageType = 'home',
  title,
  description,
  keywords,
  dynamicData,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  canonicalUrl,
  noIndex = false,
  noFollow = false,
  schemas = [],
  additionalMeta = [],
  location,
  brand,
  applications
}: UniversalSEOHeadProps) => {
  const { pathname } = useLocation();
  
  // Generate SEO content
  const finalTitle = title || generateOptimizedTitle(pageType, dynamicData);
  const finalDescription = description || generateOptimizedDescription(pageType, dynamicData);
  
  // Build comprehensive keyword list
  const baseKeywords = keywords || getPageKeywords(pageType, dynamicData);
  const locationKeywords = getLocationKeywords(location);
  const brandKeywords = getBrandKeywords(brand);
  const applicationKeywords = getApplicationKeywords(applications);
  
  const allKeywords = [
    ...new Set([
      ...baseKeywords,
      ...locationKeywords,
      ...brandKeywords,
      ...applicationKeywords,
      'RobotVerse',
      'industrial robots India',
      'robot marketplace'
    ])
  ].filter(Boolean);
  
  const finalCanonical = canonicalUrl || `${BASE_URL}${pathname}`;
  const finalOgImage = ogImage || DEFAULT_OG_IMAGE;
  const robotsContent = `${noIndex ? 'noindex' : 'index'}, ${noFollow ? 'nofollow' : 'follow'}, max-image-preview:large, max-snippet:-1, max-video-preview:-1`;
  
  useEffect(() => {
    // Update document title
    document.title = finalTitle;
    
    // Helper to update/create meta tags
    const updateMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let tag = document.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };
    
    // Primary meta tags
    updateMeta('name', 'description', finalDescription);
    updateMeta('name', 'keywords', allKeywords.slice(0, 20).join(', '));
    updateMeta('name', 'robots', robotsContent);
    updateMeta('name', 'author', 'RobotVerse');
    updateMeta('name', 'publisher', 'RobotVerse');
    updateMeta('name', 'generator', 'RobotVerse Platform');
    
    // Geo meta tags for India
    updateMeta('name', 'geo.region', 'IN');
    updateMeta('name', 'geo.placename', 'India');
    updateMeta('name', 'geo.position', '20.5937;78.9629');
    updateMeta('name', 'ICBM', '20.5937, 78.9629');
    
    // Language
    updateMeta('name', 'language', 'English');
    updateMeta('name', 'content-language', 'en-IN');
    
    // Open Graph tags
    updateMeta('property', 'og:title', ogTitle || finalTitle);
    updateMeta('property', 'og:description', ogDescription || finalDescription);
    updateMeta('property', 'og:image', finalOgImage);
    updateMeta('property', 'og:image:width', '1200');
    updateMeta('property', 'og:image:height', '630');
    updateMeta('property', 'og:image:alt', finalTitle);
    updateMeta('property', 'og:url', finalCanonical);
    updateMeta('property', 'og:type', ogType);
    updateMeta('property', 'og:site_name', 'RobotVerse');
    updateMeta('property', 'og:locale', 'en_IN');
    
    // Twitter Card tags
    updateMeta('name', 'twitter:card', twitterCard);
    updateMeta('name', 'twitter:site', '@RobotVerseIndia');
    updateMeta('name', 'twitter:creator', '@RobotVerseIndia');
    updateMeta('name', 'twitter:title', ogTitle || finalTitle);
    updateMeta('name', 'twitter:description', ogDescription || finalDescription);
    updateMeta('name', 'twitter:image', finalOgImage);
    updateMeta('name', 'twitter:image:alt', finalTitle);
    
    // Mobile & App meta
    updateMeta('name', 'mobile-web-app-capable', 'yes');
    updateMeta('name', 'apple-mobile-web-app-capable', 'yes');
    updateMeta('name', 'apple-mobile-web-app-status-bar-style', 'default');
    updateMeta('name', 'apple-mobile-web-app-title', 'RobotVerse');
    updateMeta('name', 'application-name', 'RobotVerse');
    updateMeta('name', 'msapplication-TileColor', '#0066FF');
    updateMeta('name', 'theme-color', '#0066FF');
    
    // Additional meta tags
    additionalMeta.forEach(meta => {
      if (meta.name) {
        updateMeta('name', meta.name, meta.content);
      } else if (meta.property) {
        updateMeta('property', meta.property, meta.content);
      }
    });
    
    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.href = finalCanonical;
    
    // Alternate language (hreflang)
    let hreflang = document.querySelector('link[rel="alternate"][hreflang="en-in"]') as HTMLLinkElement;
    if (!hreflang) {
      hreflang = document.createElement('link');
      hreflang.setAttribute('rel', 'alternate');
      hreflang.setAttribute('hreflang', 'en-in');
      document.head.appendChild(hreflang);
    }
    hreflang.href = finalCanonical;
    
    let hreflangDefault = document.querySelector('link[rel="alternate"][hreflang="x-default"]') as HTMLLinkElement;
    if (!hreflangDefault) {
      hreflangDefault = document.createElement('link');
      hreflangDefault.setAttribute('rel', 'alternate');
      hreflangDefault.setAttribute('hreflang', 'x-default');
      document.head.appendChild(hreflangDefault);
    }
    hreflangDefault.href = finalCanonical;
    
    // Preconnect hints for performance
    const preconnectUrls = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://cmahwgetrqczytnijbuk.supabase.co'
    ];
    
    preconnectUrls.forEach(url => {
      if (!document.querySelector(`link[rel="preconnect"][href="${url}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = url;
        document.head.appendChild(link);
      }
    });
    
    // JSON-LD Schema
    if (schemas.length > 0) {
      // Remove existing schema
      const existingSchema = document.querySelector('script#universal-seo-schema');
      if (existingSchema) existingSchema.remove();
      
      const schemaScript = document.createElement('script');
      schemaScript.type = 'application/ld+json';
      schemaScript.id = 'universal-seo-schema';
      schemaScript.textContent = JSON.stringify(
        schemas.length === 1 ? schemas[0] : schemas
      );
      document.head.appendChild(schemaScript);
    }
    
    // Cleanup on unmount
    return () => {
      const schema = document.querySelector('script#universal-seo-schema');
      if (schema) schema.remove();
    };
  }, [finalTitle, finalDescription, allKeywords, finalCanonical, finalOgImage, ogTitle, ogDescription, ogType, twitterCard, robotsContent, schemas, additionalMeta]);
  
  return null;
};

export default UniversalSEOHead;
