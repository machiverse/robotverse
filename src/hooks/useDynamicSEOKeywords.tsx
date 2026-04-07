import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DynamicSEOKeywords {
  robotKeywords: string[];
  partsKeywords: string[];
  servicesKeywords: string[];
  loading: boolean;
}

/**
 * Fetches real brands, models, categories, locations from DB
 * to generate dynamic SEO keywords for listing pages.
 */
export const useDynamicSEOKeywords = (type: 'robots' | 'parts' | 'services'): string[] => {
  const [keywords, setKeywords] = useState<string[]>([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        if (type === 'robots') {
          const { data } = await supabase
            .from('robots')
            .select('brand, model, robot_type, applications, location')
            .eq('availability', 'available')
            .limit(500);

          if (data) {
            const brands = [...new Set(data.map(r => r.brand).filter(Boolean))];
            const models = [...new Set(data.map(r => r.model).filter(Boolean))];
            const types = [...new Set(data.map(r => r.robot_type).filter(Boolean))];
            const locations = [...new Set(data.map(r => r.location).filter(Boolean))];
            const apps = [...new Set(data.flatMap(r => (r.applications as string[]) || []).filter(Boolean))];

            const kw: string[] = [
              // Brand keywords
              ...brands.map(b => `${b} robot for sale`),
              ...brands.map(b => `used ${b} robot India`),
              ...brands.map(b => `${b} industrial robot price`),
              // Model keywords
              ...models.slice(0, 15).map(m => `${m} robot`),
              // Type keywords
              ...types.map(t => `${t} robot`),
              ...types.map(t => `used ${t} for sale India`),
              // Application keywords
              ...apps.slice(0, 10).map(a => `${a} robot India`),
              // Location keywords
              ...locations.slice(0, 10).map(l => `industrial robot ${l}`),
              // General
              'used industrial robots for sale',
              'refurbished robots India',
              'robot automation equipment',
              'industrial robot marketplace India',
              'RobotVerse'
            ];
            setKeywords([...new Set(kw)].slice(0, 30));
          }
        } else if (type === 'parts') {
          const { data } = await supabase
            .from('spare_parts')
            .select('name, brand, category, subcategory, compatible_robots, location')
            .eq('availability', 'available')
            .limit(500);

          if (data) {
            const brands = [...new Set(data.map(p => p.brand).filter(Boolean))];
            const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
            const subcategories = [...new Set(data.map(p => p.subcategory).filter(Boolean))];
            const locations = [...new Set(data.map(p => p.location).filter(Boolean))];
            const compatRobots = [...new Set(data.flatMap(p => (p.compatible_robots as string[]) || []).filter(Boolean))];

            const kw: string[] = [
              // Brand keywords
              ...brands.map(b => `${b} spare parts India`),
              ...brands.map(b => `${b} robot parts`),
              // Category keywords
              ...categories.map(c => `robot ${c}`),
              ...categories.map(c => `${c} spare parts`),
              // Subcategory keywords
              ...subcategories.slice(0, 10).map(s => `${s} robot parts`),
              // Compatible robots
              ...compatRobots.slice(0, 10).map(r => `${r} spare parts`),
              // Location keywords
              ...locations.slice(0, 8).map(l => `robot parts ${l}`),
              // General
              'industrial robot spare parts India',
              'genuine robot parts',
              'robot replacement parts',
              'robot components suppliers',
              'RobotVerse parts'
            ];
            setKeywords([...new Set(kw)].slice(0, 30));
          }
        } else if (type === 'services') {
          const { data } = await supabase
            .from('services')
            .select('name, category, location, brand_specializations')
            .eq('status', 'active')
            .limit(500);

          if (data) {
            const categories = [...new Set(data.map(s => s.category).filter(Boolean))];
            const locations = [...new Set(data.map(s => s.location).filter(Boolean))];
            const brands = [...new Set(data.flatMap(s => (s.brand_specializations as string[]) || []).filter(Boolean))];

            const kw: string[] = [
              // Category keywords
              ...categories.map(c => `robot ${c} service India`),
              ...categories.map(c => `${c} for industrial robots`),
              // Brand keywords
              ...brands.slice(0, 10).map(b => `${b} robot repair`),
              ...brands.slice(0, 10).map(b => `${b} robot service India`),
              // Location keywords
              ...locations.slice(0, 10).map(l => `robot service ${l}`),
              ...locations.slice(0, 10).map(l => `robot repair ${l}`),
              // General
              'robot repair maintenance services India',
              'robot installation service',
              'robot programming services',
              'industrial robot technician',
              'robot calibration service',
              'RobotVerse services'
            ];
            setKeywords([...new Set(kw)].slice(0, 30));
          }
        }
      } catch (err) {
        console.error('Dynamic SEO keyword fetch error:', err);
      }
    };

    fetch();
  }, [type]);

  return keywords;
};
