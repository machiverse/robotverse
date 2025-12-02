/**
 * RobotVerse Enhanced SEO System
 * Central export point for all SEO utilities
 */

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

// Enhanced Schema Generators
export {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateEnhancedProductSchema,
  generateFAQSchema,
  generateBreadcrumbSchema,
  generateArticleSchema,
  generateVideoSchema,
  generateItemListSchema,
  generateServiceSchema,
  generateLocalBusinessSchema,
  generatePageSchemas
} from './enhancedSchemas';

// Internal Linking Engine
export {
  generateRobotInternalLinks,
  generateSparePartInternalLinks,
  generateServiceInternalLinks,
  generateBlogInternalLinks,
  generateListingInternalLinks,
  generateHomepageInternalLinks,
  renderInternalLinksHTML
} from './internalLinking';

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
