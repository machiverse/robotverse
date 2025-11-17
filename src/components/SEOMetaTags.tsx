import { useEffect } from 'react';
import { SEOElements } from '@/utils/seo';

interface SEOMetaTagsProps {
  seoElements: SEOElements;
  robotData?: {
    brand?: string;
    model?: string;
    category?: string;
    payload?: string;
    reach?: string;
    applications?: string[];
    price?: string;
    availability?: 'available' | 'sold' | 'pending';
    condition?: 'new' | 'used' | 'refurbished';
    year?: string;
    location?: string;
  };
}

const SEOMetaTags = ({ seoElements, robotData }: SEOMetaTagsProps) => {
  useEffect(() => {
    // Enhanced page title with robot-specific keywords
    const robotTitle = robotData 
      ? `${robotData.brand} ${robotData.model} Industrial Robot - ${robotData.condition?.toUpperCase()} | ${robotData.payload} Payload | Available in ${robotData.location}`
      : seoElements.pageTitle;
    
    document.title = robotTitle;
    
    // Enhanced meta description with robot specifications
    const robotDescription = robotData 
      ? `${robotData.condition?.toUpperCase()} ${robotData.brand} ${robotData.model} industrial robot for sale. ${robotData.payload} payload, ${robotData.reach} reach. Perfect for ${robotData.applications?.join(', ')} applications. ${robotData.availability === 'available' ? 'Available now' : 'Contact for availability'} in ${robotData.location}. Price: ${robotData.price || 'Contact for quote'}.`
      : seoElements.metaDescription;
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', robotDescription);
    
    // Add robot-specific keywords meta tag
    const robotKeywords = robotData 
      ? `${robotData.brand} robot, ${robotData.model}, industrial robot, ${robotData.condition} robot, ${robotData.category}, robotic automation, ${robotData.applications?.join(', ')}, robot for sale, industrial automation, ${robotData.location} robots, ${robotData.payload} payload robot, ${robotData.reach} reach robot`
      : 'industrial robots, robotic automation, robot marketplace';
    
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', robotKeywords);
    
    // Enhanced Open Graph tags for better social sharing
    const updateMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };
    
    updateMetaTag('og:title', robotTitle);
    updateMetaTag('og:description', robotDescription);
    updateMetaTag('og:type', 'product');
    updateMetaTag('og:url', window.location.href);
    updateMetaTag('og:site_name', 'RobotVerse - Industrial Robot Marketplace');
    
    // Add product-specific Open Graph tags
    if (robotData) {
      updateMetaTag('product:brand', robotData.brand || '');
      updateMetaTag('product:condition', robotData.condition || '');
      updateMetaTag('product:availability', robotData.availability || '');
      updateMetaTag('product:price:amount', robotData.price?.replace(/[^\d.]/g, '') || '');
      updateMetaTag('product:price:currency', 'INR');
    }
    
    // Enhanced Twitter Card tags
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
    updateTwitterTag('twitter:title', robotTitle);
    updateTwitterTag('twitter:description', robotDescription);
    updateTwitterTag('twitter:site', '@RobotVerse');
    
    // Enhanced structured data with robot-specific schema
    const enhancedStructuredData = robotData ? {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": `${robotData.brand} ${robotData.model}`,
      "description": robotDescription,
      "brand": {
        "@type": "Brand",
        "name": robotData.brand
      },
      "model": robotData.model,
      "category": "Industrial Robot",
      "condition": robotData.condition,
      "availability": robotData.availability === 'available' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "offers": {
        "@type": "Offer",
        "price": robotData.price?.replace(/[^\d.]/g, '') || "0",
        "priceCurrency": "INR",
        "availability": robotData.availability === 'available' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": {
          "@type": "Organization",
          "name": "RobotVerse"
        }
      },
      "additionalProperty": [
        {
          "@type": "PropertyValue",
          "name": "Payload",
          "value": robotData.payload
        },
        {
          "@type": "PropertyValue",
          "name": "Reach",
          "value": robotData.reach
        },
        {
          "@type": "PropertyValue",
          "name": "Applications",
          "value": robotData.applications?.join(', ')
        },
        {
          "@type": "PropertyValue",
          "name": "Year",
          "value": robotData.year
        }
      ]
    } : seoElements.structuredData;
    
    // Add FAQ schema for common robot questions
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": `Is this ${robotData?.brand} ${robotData?.model} robot available?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Yes, this ${robotData?.condition} ${robotData?.brand} robot is currently ${robotData?.availability} in ${robotData?.location}.`
          }
        },
        {
          "@type": "Question",
          "name": `What applications is this industrial robot suitable for?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `This robot is perfect for ${robotData?.applications?.join(', ')} with ${robotData?.payload} payload capacity and ${robotData?.reach} reach.`
          }
        }
      ]
    };
    
    // Robot marketplace breadcrumb schema
    const robotBreadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": window.location.origin
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Industrial Robots",
          "item": `${window.location.origin}/robots`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": robotData?.brand || "Robot Brand",
          "item": `${window.location.origin}/robots/${robotData?.brand?.toLowerCase()}`
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": `${robotData?.brand} ${robotData?.model}`,
          "item": window.location.href
        }
      ]
    };
    
    let structuredDataScript = document.querySelector('script[type="application/ld+json"]#robot-schema');
    if (!structuredDataScript) {
      structuredDataScript = document.createElement('script');
      structuredDataScript.setAttribute('type', 'application/ld+json');
      structuredDataScript.setAttribute('id', 'robot-schema');
      document.head.appendChild(structuredDataScript);
    }
    
    structuredDataScript.textContent = JSON.stringify([
      enhancedStructuredData,
      robotBreadcrumbSchema,
      ...(robotData ? [faqSchema] : [])
    ]);
    
    // Add canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', window.location.href);
    
    // Add robots meta tag
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute('content', robotData?.availability === 'available' ? 'index,follow' : 'index,nofollow');
    
    // Add language and geo tags
    let languageMeta = document.querySelector('meta[http-equiv="content-language"]');
    if (!languageMeta) {
      languageMeta = document.createElement('meta');
      languageMeta.setAttribute('http-equiv', 'content-language');
      document.head.appendChild(languageMeta);
    }
    languageMeta.setAttribute('content', 'en-IN');
    
    let geoMeta = document.querySelector('meta[name="geo.region"]');
    if (!geoMeta) {
      geoMeta = document.createElement('meta');
      geoMeta.setAttribute('name', 'geo.region');
      document.head.appendChild(geoMeta);
    }
    geoMeta.setAttribute('content', 'IN');
    
    // Cleanup function
    return () => {
      const elementsToClean = [
        'script[type="application/ld+json"]#robot-schema',
        'meta[name="keywords"]'
      ];
      
      elementsToClean.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          element.remove();
        }
      });
    };
  }, [seoElements, robotData]);

  return null;
};

export default SEOMetaTags;
