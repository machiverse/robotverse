// Batch SEO operations for robot listings
import { supabase } from '@/integrations/supabase/client';
import { generateAllSEOElements, type RobotSEOData } from './seo';

interface RobotWithProfile {
  id: string;
  brand?: string;
  model?: string;
  payload_capacity?: number;
  controller_type?: string;
  year_manufactured?: number;
  condition?: string;
  reach?: number;
  location?: string;
  state?: string;
  price?: number;
  currency?: string;
  applications?: string[];
  images?: string[];
  profiles?: {
    full_name?: string;
    company_name?: string;
  };
}

// Generate SEO data for a batch of robots
export const generateBatchRobotSEO = async (robots: RobotWithProfile[]) => {
  const seoData = robots.map(robot => {
    const robotSEOData: RobotSEOData = {
      id: robot.id,
      brand: robot.brand,
      model: robot.model,
      payload_capacity: robot.payload_capacity,
      controller_type: robot.controller_type,
      year_manufactured: robot.year_manufactured,
      condition: robot.condition,
      reach: robot.reach,
      location: robot.location,
      state: robot.state,
      price: robot.price,
      currency: robot.currency,
      seller_name: robot.profiles?.full_name,
      company_name: robot.profiles?.company_name,
      applications: robot.applications || [],
      images: robot.images || []
    };
    
    try {
      return {
        robotId: robot.id,
        seoElements: generateAllSEOElements(robotSEOData)
      };
    } catch (error) {
      console.error(`Error generating SEO for robot ${robot.id}:`, error);
      return null;
    }
  }).filter(Boolean);
  
  return seoData;
};

// Get robots that need SEO updates
export const getRobotsNeedingSEO = async (limit: number = 50) => {
  try {
    const { data, error } = await supabase
      .from('robots')
      .select(`
        id,
        brand,
        model,
        payload_capacity,
        controller_type,
        year_manufactured,
        condition,
        reach,
        location,
        state,
        price,
        currency,
        applications,
        images,
        created_at,
        profiles!seller_id (
          full_name,
          company_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching robots for SEO:', error);
    return [];
  }
};

// Utility to check if a robot has good SEO potential
export const hasGoodSEOData = (robot: RobotWithProfile): boolean => {
  return !!(
    robot.brand &&
    robot.model &&
    robot.payload_capacity &&
    robot.controller_type &&
    robot.location
  );
};

// Generate page metadata for robot listing pages
export const generateRobotListingPageSEO = (
  category?: string,
  brand?: string,
  location?: string,
  count?: number
) => {
  const baseTitle = "Industrial Robots for Sale";
  const baseSiteTitle = "RobotVerse";
  
  let title = baseTitle;
  let description = "Browse verified industrial robots for sale from trusted sellers. Find ABB, KUKA, Fanuc, Yaskawa and other leading brands with warranty and support.";
  
  if (category) {
    title = `${category} Robots for Sale`;
    description = `Buy ${category.toLowerCase()} robots from verified sellers. Professional grade automation equipment with warranty and technical support.`;
  }
  
  if (brand) {
    title = `${brand} Industrial Robots for Sale`;
    description = `Find ${brand} industrial robots for sale. Genuine ${brand} automation equipment from verified sellers with warranty and technical support.`;
  }
  
  if (location) {
    title += ` in ${location}`;
    description = description.replace("from verified sellers", `from verified sellers in ${location}`);
  }
  
  if (count !== undefined && count > 0) {
    title = `${count}+ ${title}`;
  }
  
  // Ensure title is under 60 characters for SEO
  const fullTitle = `${title} | ${baseSiteTitle}`;
  const finalTitle = fullTitle.length > 60 ? `${title.substring(0, 50)}... | ${baseSiteTitle}` : fullTitle;
  
  // Ensure description is under 160 characters
  const finalDescription = description.length > 160 ? description.substring(0, 157) + '...' : description;
  
  return {
    title: finalTitle,
    description: finalDescription,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": title,
      "description": finalDescription,
      "url": window.location.href,
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": count || 0
      }
    }
  };
};