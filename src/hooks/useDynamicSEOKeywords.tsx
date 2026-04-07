import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches real brands, models, categories, locations from DB
 * to generate dynamic SEO keywords for listing pages.
 */
export const useDynamicSEOKeywords = (type: 'robots' | 'parts' | 'services'): string[] => {
  const [keywords, setKeywords] = useState<string[]>([]);

  useEffect(() => {
    const fetchKeywords = async () => {
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
            const apps = [...new Set(data.flatMap(r => (r.applications as string[] | null) || []).filter(Boolean))];

            const kw: string[] = [
              ...brands.map(b => `${b} robot for sale`),
              ...brands.map(b => `used ${b} robot India`),
              ...brands.map(b => `${b} industrial robot price`),
              ...models.slice(0, 15).map(m => `${m} robot`),
              ...types.map(t => `${t} robot`),
              ...types.map(t => `used ${t} for sale India`),
              ...apps.slice(0, 10).map(a => `${a} robot India`),
              ...locations.slice(0, 10).map(l => `industrial robot ${l}`),
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
            .select('name, brand, category, main_category, compatible_robots, location')
            .limit(500);

          if (data) {
            const brands = [...new Set(data.map(p => p.brand).filter(Boolean))];
            const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
            const mainCategories = [...new Set(data.map(p => p.main_category).filter(Boolean))];
            const locations = [...new Set(data.map(p => p.location).filter(Boolean))];
            const compatRobots = [...new Set(data.flatMap(p => (p.compatible_robots as string[] | null) || []).filter(Boolean))];

            const kw: string[] = [
              ...brands.map(b => `${b} spare parts India`),
              ...brands.map(b => `${b} robot parts`),
              ...categories.map(c => `robot ${c}`),
              ...mainCategories.slice(0, 8).map(c => `${c} spare parts`),
              ...compatRobots.slice(0, 10).map(r => `${r} spare parts`),
              ...locations.slice(0, 8).map(l => `robot parts ${l}`),
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
            .select('name, service_type, location, specializations')
            .limit(500);

          if (data) {
            const serviceTypes = [...new Set(data.map(s => s.service_type).filter(Boolean))];
            const locations = [...new Set(data.map(s => s.location).filter(Boolean))];
            const specs = [...new Set(data.flatMap(s => (s.specializations as string[] | null) || []).filter(Boolean))];

            const kw: string[] = [
              ...serviceTypes.map(t => `robot ${t} service India`),
              ...serviceTypes.map(t => `${t} for industrial robots`),
              ...specs.slice(0, 10).map(s => `${s} robot service`),
              ...locations.slice(0, 10).map(l => `robot service ${l}`),
              ...locations.slice(0, 10).map(l => `robot repair ${l}`),
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

    fetchKeywords();
  }, [type]);

  return keywords;
};
