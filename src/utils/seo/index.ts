/**
 * RobotVerse Enhanced SEO System
 * Central export point for all SEO utilities
 */

// Master SEO - Keyword Mapping & Meta Generation
export {
  PAGE_KEYWORD_MAP,
  ROBOT_BRANDS_SEO,
  ROBOT_APPLICATIONS_SEO,
  INDIAN_CITIES_SEO,
  INDUSTRIES_SEO,
  generateOptimizedTitle,
  generateOptimizedDescription,
  getPageKeywords,
  getLocationKeywords,
  getBrandKeywords,
  getApplicationKeywords
} from './masterSEO';

// Modern Schema Generators
export {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateProductSchema,
  generateFAQSchema,
  generateBreadcrumbSchema,
  generateItemListSchema,
  generateServiceSchema,
  generateArticleSchema,
  generateLocalBusinessSchema,
  generateHowToSchema,
  generateAggregateOfferSchema,
  generatePageSchemas
} from './modernSchemas';

// Programmatic SEO Content Generation
export {
  INDIAN_CITIES,
  ROBOT_BRANDS,
  ROBOT_APPLICATIONS,
  INDUSTRIES,
  generateRobotDescription,
  generateRobotFAQs,
  generateSparePartDescription,
  generateSparePartFAQs,
  generateServiceDescription,
  generateArticleSummary,
  generateLocationSEOContent,
  generateComparisonContent,
  generatePriceRangeContent,
  extractLongTailKeywords
} from './programmaticSEO';

// Technical SEO Utilities
export {
  generateSEOSlug,
  generateCanonicalURL,
  generateSEOTitle,
  generateMetaDescription,
  generateImageAlt,
  generateRobotsMeta,
  generateHreflangTags,
  generatePreloadHints,
  generateBreadcrumbs,
  analyzeSEOQuality,
  generateOpenGraphTags,
  generateTwitterCardTags,
  generateJSONLDScript
} from './technicalSEO';

// Sitemap Utilities
export {
  generateStaticPagesSitemap,
  generateRobotsSitemapURLs,
  generatePartsSitemapURLs,
  generateServicesSitemapURLs,
  generateBlogsSitemapURLs,
  generateVideosSitemapURLs,
  generateLocationsSitemapURLs,
  generateSitemapXML,
  generateSitemapIndexXML,
  getSitemapIndexEntries,
  generateCompleteSitemap
} from './sitemapUtils';
