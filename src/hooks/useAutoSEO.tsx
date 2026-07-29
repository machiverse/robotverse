import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  generateRobotSEO,
  generateRobotListingSEO,
  generateSparePartSEO,
  generateServiceSEO,
  generateRoboBookSEO,
  generateLogisticsSEO,
  generateFinancingSEO,
  generateHomeSEO,
  generateBrandSEO,
  generateKeywordBlock,
  generateImageAlt,
  generateInternalLinks
} from '@/utils/autoSeo';

type ContentType = 'robot' | 'robot-listing' | 'spare-part' | 'service' | 'robobook' | 'logistics' | 'financing' | 'home' | 'brand';

interface UseAutoSEOProps {
  type: ContentType;
  data?: any;
  brand?: string;
  category?: string;
}

/**
 * Hook for automatic SEO generation
 * Automatically generates all SEO metadata based on content type and data
 */
export const useAutoSEO = ({ type, data, brand, category }: UseAutoSEOProps) => {
  const location = useLocation();
  
  const seoData = useMemo(() => {
    switch (type) {
      case 'robot':
        return data ? generateRobotSEO(data) : null;
      case 'robot-listing':
        return generateRobotListingSEO(brand, category);
      case 'spare-part':
        return data ? generateSparePartSEO(data) : null;
      case 'service':
        return data ? generateServiceSEO(data) : null;
      case 'robobook':
        return data ? generateRoboBookSEO(data) : null;
      case 'logistics':
        return generateLogisticsSEO(data);
      case 'financing':
        return generateFinancingSEO(data);
      case 'home':
        return generateHomeSEO();
      case 'brand':
        return brand ? generateBrandSEO(brand, data?.count) : null;
      default:
        return null;
    }
  }, [type, data, brand, category]);
  
  // Generate keyword block for page content
  const keywordBlock = useMemo(() => {
    if (!data) return '';
    return generateKeywordBlock(type, data);
  }, [type, data]);
  
  // Generate alt text for images
  const getImageAlt = (index: number = 0) => {
    if (!data) return 'RobotVerse';
    return generateImageAlt(type, data, index);
  };
  
  // Update page title on mount/change
  useEffect(() => {
    if (seoData?.title) {
      document.title = seoData.title;
    }
  }, [seoData]);
  
  // Log SEO data for debugging (remove in production)
  useEffect(() => {
    if (seoData) {
      console.log('🔍 Auto-SEO Generated:', {
        type,
        title: seoData.title,
        keywords: seoData.keywords,
        url: seoData.canonicalUrl
      });
    }
  }, [seoData, type]);
  
  // Generate internal linking suggestions
  const internalLinks = useMemo(() => {
    if (!data) return [];
    return generateInternalLinks(type, data);
  }, [type, data]);
  
  return {
    seoData,
    keywordBlock,
    getImageAlt,
    internalLinks,
    // Helper to check if SEO data is ready
    isReady: !!seoData
  };
};

/**
 * Hook to track page views for SEO analytics
 */
export const useSEOPageView = (pageName: string) => {
  const location = useLocation();
  
  useEffect(() => {
    // Track page view
    console.log(`📊 Page View: ${pageName} - ${location.pathname}`);
    
    // Send to analytics (implement your analytics tracking here)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: location.pathname,
        page_title: pageName
      });
    }
  }, [location, pageName]);
};

export default useAutoSEO;
