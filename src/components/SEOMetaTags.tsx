import { useEffect } from 'react';
import { SEOElements } from '@/utils/seo';

interface SEOMetaTagsProps {
  seoElements: SEOElements;
}

const SEOMetaTags = ({ seoElements }: SEOMetaTagsProps) => {
  useEffect(() => {
    // Update page title
    document.title = seoElements.pageTitle;
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', seoElements.metaDescription);
    
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
    
    // Cleanup function to remove meta tags when component unmounts
    return () => {
      // Keep basic meta tags but clean up robot-specific ones
      const robotSchema = document.querySelector('script[type="application/ld+json"]#robot-schema');
      if (robotSchema) {
        robotSchema.remove();
      }
    };
  }, [seoElements]);

  return null; // This component doesn't render anything
};

export default SEOMetaTags;
