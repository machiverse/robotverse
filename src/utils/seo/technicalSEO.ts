/**
 * Technical SEO Utilities for RobotVerse
 * Performance optimization, meta tags, and technical SEO helpers
 */

const BASE_URL = 'https://www.robotverse.in';

/**
 * Generate SEO-friendly URL slug
 */
export const generateSEOSlug = (text: string, maxLength: number = 60): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, maxLength)
    .replace(/-$/, '')
    .trim();
};

/**
 * Generate canonical URL
 */
export const generateCanonicalURL = (path: string): string => {
  // Remove query parameters for canonical
  const cleanPath = path.split('?')[0];
  // Remove trailing slash
  const normalizedPath = cleanPath.replace(/\/$/, '');
  return `${BASE_URL}${normalizedPath}`;
};

/**
 * Generate SEO title (max 60 chars)
 */
export const generateSEOTitle = (
  primary: string,
  secondary?: string,
  suffix: string = 'RobotVerse'
): string => {
  const maxLength = 60;
  const suffixPart = ` | ${suffix}`;
  const availableLength = maxLength - suffixPart.length;
  
  let title = primary;
  if (secondary && (title.length + secondary.length + 3) <= availableLength) {
    title = `${primary} - ${secondary}`;
  }
  
  if (title.length > availableLength) {
    title = title.substring(0, availableLength - 3) + '...';
  }
  
  return `${title}${suffixPart}`;
};

/**
 * Generate meta description (max 160 chars)
 */
export const generateMetaDescription = (text: string, maxLength: number = 160): string => {
  // Clean HTML tags
  const cleaned = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  
  if (cleaned.length <= maxLength) return cleaned;
  
  // Find last complete word within limit
  const truncated = cleaned.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return truncated.substring(0, lastSpace) + '...';
};

/**
 * Generate image alt text
 */
export const generateImageAlt = (
  type: 'robot' | 'part' | 'service' | 'blog',
  data: any,
  index: number = 0
): string => {
  switch (type) {
    case 'robot':
      return `${data.brand || 'Industrial'} ${data.model || data.name} robot - Image ${index + 1} - RobotVerse`;
    case 'part':
      return `${data.brand || ''} ${data.name} spare part for industrial robots - RobotVerse`;
    case 'service':
      return `${data.service_type || 'Robot'} service - Professional industrial robot services`;
    case 'blog':
      return `${data.title || 'Article'} - RobotVerse Blog`;
    default:
      return 'RobotVerse - Industrial Robot Marketplace India';
  }
};

/**
 * Generate robots meta tag content
 */
export const generateRobotsMeta = (options: {
  index?: boolean;
  follow?: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
  maxImagePreview?: 'none' | 'standard' | 'large';
  maxSnippet?: number;
  maxVideoPreview?: number;
} = {}): string => {
  const {
    index = true,
    follow = true,
    noarchive = false,
    nosnippet = false,
    maxImagePreview = 'large',
    maxSnippet = -1,
    maxVideoPreview = -1
  } = options;
  
  const directives: string[] = [];
  
  directives.push(index ? 'index' : 'noindex');
  directives.push(follow ? 'follow' : 'nofollow');
  
  if (noarchive) directives.push('noarchive');
  if (nosnippet) directives.push('nosnippet');
  
  directives.push(`max-image-preview:${maxImagePreview}`);
  directives.push(`max-snippet:${maxSnippet}`);
  directives.push(`max-video-preview:${maxVideoPreview}`);
  
  return directives.join(', ');
};

/**
 * Generate hreflang tags for international SEO
 */
export const generateHreflangTags = (path: string): Array<{lang: string, href: string}> => {
  return [
    { lang: 'en-in', href: `${BASE_URL}${path}` },
    { lang: 'x-default', href: `${BASE_URL}${path}` }
  ];
};

/**
 * Preload hints for critical resources
 */
export const generatePreloadHints = (): Array<{rel: string, href: string, as?: string, type?: string}> => {
  return [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com' },
    { rel: 'preconnect', href: 'https://cmahwgetrqczytnijbuk.supabase.co' },
    { rel: 'dns-prefetch', href: 'https://www.google-analytics.com' }
  ];
};

/**
 * Generate structured breadcrumb data
 */
export const generateBreadcrumbs = (
  type: 'robot' | 'part' | 'service' | 'blog' | 'video',
  data: any
): Array<{name: string, url: string}> => {
  const breadcrumbs: Array<{name: string, url: string}> = [
    { name: 'Home', url: '/' }
  ];
  
  switch (type) {
    case 'robot':
      breadcrumbs.push({ name: 'Robots', url: '/robots' });
      if (data.brand) {
        breadcrumbs.push({ 
          name: data.brand, 
          url: `/robots?brand=${encodeURIComponent(data.brand)}` 
        });
      }
      breadcrumbs.push({ 
        name: data.model || data.name, 
        url: `/robots/${data.id}` 
      });
      break;
      
    case 'part':
      breadcrumbs.push({ name: 'Spare Parts', url: '/parts' });
      if (data.main_category) {
        breadcrumbs.push({ 
          name: data.main_category, 
          url: `/parts?category=${encodeURIComponent(data.main_category)}` 
        });
      }
      breadcrumbs.push({ 
        name: data.name, 
        url: `/parts/${data.id}` 
      });
      break;
      
    case 'service':
      breadcrumbs.push({ name: 'Services', url: '/services' });
      breadcrumbs.push({ 
        name: data.service_name || data.name, 
        url: `/services/${data.id}` 
      });
      break;
      
    case 'blog':
      breadcrumbs.push({ name: 'Blog', url: '/blogs' });
      breadcrumbs.push({ 
        name: data.title, 
        url: `/blogs/${data.id}` 
      });
      break;
      
    case 'video':
      breadcrumbs.push({ name: 'Videos', url: '/robobook?type=video' });
      breadcrumbs.push({ 
        name: data.title, 
        url: `/robobook/${data.id}` 
      });
      break;
  }
  
  return breadcrumbs;
};

/**
 * Check and suggest improvements for page SEO
 */
export const analyzeSEOQuality = (page: {
  title?: string;
  description?: string;
  h1?: string;
  content?: string;
  images?: Array<{src: string, alt?: string}>;
  internalLinks?: number;
  externalLinks?: number;
}): Array<{type: 'error' | 'warning' | 'success', message: string}> => {
  const results: Array<{type: 'error' | 'warning' | 'success', message: string}> = [];
  
  // Title checks
  if (!page.title) {
    results.push({ type: 'error', message: 'Missing page title' });
  } else if (page.title.length > 60) {
    results.push({ type: 'warning', message: `Title too long (${page.title.length}/60 chars)` });
  } else if (page.title.length < 30) {
    results.push({ type: 'warning', message: 'Title may be too short' });
  } else {
    results.push({ type: 'success', message: 'Title length is optimal' });
  }
  
  // Description checks
  if (!page.description) {
    results.push({ type: 'error', message: 'Missing meta description' });
  } else if (page.description.length > 160) {
    results.push({ type: 'warning', message: `Description too long (${page.description.length}/160 chars)` });
  } else if (page.description.length < 70) {
    results.push({ type: 'warning', message: 'Description may be too short' });
  } else {
    results.push({ type: 'success', message: 'Description length is optimal' });
  }
  
  // H1 check
  if (!page.h1) {
    results.push({ type: 'error', message: 'Missing H1 heading' });
  } else {
    results.push({ type: 'success', message: 'H1 heading present' });
  }
  
  // Image alt checks
  if (page.images) {
    const missingAlts = page.images.filter(img => !img.alt).length;
    if (missingAlts > 0) {
      results.push({ type: 'warning', message: `${missingAlts} images missing alt text` });
    } else {
      results.push({ type: 'success', message: 'All images have alt text' });
    }
  }
  
  // Internal links check
  if (page.internalLinks !== undefined) {
    if (page.internalLinks < 3) {
      results.push({ type: 'warning', message: 'Add more internal links (minimum 4-10 recommended)' });
    } else {
      results.push({ type: 'success', message: `${page.internalLinks} internal links found` });
    }
  }
  
  return results;
};

/**
 * Generate Open Graph meta tags
 */
export const generateOpenGraphTags = (data: {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  siteName?: string;
  locale?: string;
}): Record<string, string> => {
  return {
    'og:title': data.title,
    'og:description': data.description,
    'og:url': data.url,
    'og:image': data.image || `${BASE_URL}/robotverse-logo.jpg`,
    'og:type': data.type || 'website',
    'og:site_name': data.siteName || 'RobotVerse',
    'og:locale': data.locale || 'en_IN'
  };
};

/**
 * Generate Twitter Card meta tags
 */
export const generateTwitterCardTags = (data: {
  title: string;
  description: string;
  image?: string;
  card?: 'summary' | 'summary_large_image';
  site?: string;
}): Record<string, string> => {
  return {
    'twitter:card': data.card || 'summary_large_image',
    'twitter:site': data.site || '@RobotVerse',
    'twitter:title': data.title,
    'twitter:description': data.description,
    'twitter:image': data.image || `${BASE_URL}/robotverse-logo.jpg`
  };
};

/**
 * Generate JSON-LD script tag content
 */
export const generateJSONLDScript = (schemas: object[]): string => {
  if (schemas.length === 1) {
    return JSON.stringify(schemas[0]);
  }
  return JSON.stringify(schemas);
};
