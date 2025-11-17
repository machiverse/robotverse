import { useState, useEffect } from 'react';
import { generateAllSEOElements, type RobotSEOData, type SEOElements } from '@/utils/seo';

interface UseRobotSEOResult {
  seoElements: SEOElements | null;
  generateSEO: (robotData: RobotSEOData) => void;
  updatePageSEO: () => void;
}

export const useRobotSEO = (): UseRobotSEOResult => {
  const [seoElements, setSeoElements] = useState<SEOElements | null>(null);

  const generateSEO = (robotData: RobotSEOData) => {
    try {
      const elements = generateAllSEOElements(robotData);
      setSeoElements(elements);
    } catch (error) {
      console.error('Error generating SEO elements:', error);
      setSeoElements(null);
    }
  };

  const updatePageSEO = () => {
    if (!seoElements) return;

    // Update page title
    document.title = seoElements.pageTitle;
    
    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', seoElements.metaDescription);
    
    // Update or create canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', window.location.href);
    
    // Add Open Graph tags
    const updateMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };
    
    updateMetaTag('og:title', seoElements.pageTitle);
    updateMetaTag('og:description', seoElements.metaDescription);
    updateMetaTag('og:type', 'product');
    updateMetaTag('og:url', window.location.href);
    updateMetaTag('og:site_name', 'RobotVerse');
    
    // Add Twitter Card tags
    const updateTwitterTag = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };
    
    updateTwitterTag('twitter:card', 'summary_large_image');
    updateTwitterTag('twitter:title', seoElements.pageTitle);
    updateTwitterTag('twitter:description', seoElements.metaDescription);
    updateTwitterTag('twitter:site', '@RobotVerse');
    
    // Add structured data
    let structuredDataScript = document.querySelector('script[type="application/ld+json"]#robot-schema');
    if (!structuredDataScript) {
      structuredDataScript = document.createElement('script');
      structuredDataScript.setAttribute('type', 'application/ld+json');
      structuredDataScript.setAttribute('id', 'robot-schema');
      document.head.appendChild(structuredDataScript);
    }
    structuredDataScript.textContent = JSON.stringify([
      seoElements.structuredData,
      seoElements.breadcrumbSchema
    ]);
  };

  // Auto-update page SEO when seoElements changes
  useEffect(() => {
    if (seoElements) {
      updatePageSEO();
    }
    
    // Cleanup function
    return () => {
      const robotSchema = document.querySelector('script[type="application/ld+json"]#robot-schema');
      if (robotSchema) {
        robotSchema.remove();
      }
    };
  }, [seoElements]);

  return {
    seoElements,
    generateSEO,
    updatePageSEO
  };
};