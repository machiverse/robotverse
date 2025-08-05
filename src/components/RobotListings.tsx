import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import EnhancedHeader from '@/components/EnhancedHeader'; // or Header as needed

interface RobotSummary {
  id: string;
  name: string;
  model: string;
  robot_type: string;
  price: number | null;
  currency: string;
  images: string[];
  availability: string;
  category_tags: string[];
}

const RobotListings = () => {
  const [robots, setRobots] = useState<RobotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRobots = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('robots')
          .select('id, name, model, robot_type, price, currency, images, availability, category_tags')
          .eq('availability', 'available')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRobots(data || []);
      } catch (err) {
        console.error('Error fetching robots:', err);
        setError('Failed to fetch robots.');
      } finally {
        setLoading(false);
      }
    };

    fetchRobots();
  }, []);

  const formatPrice = (price: number | null, currency: string) => {
    if (price === null) return 'Price on Request';
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return `${symbol}${price.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8 flex justify-center items-center h-64">
          <Loader2 className="w-10 h-10 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8 text-center text-red-600">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Robot Listings</h1>
        {robots.length === 0 ? (
          <p className="text-muted-foreground">No robots available at the moment.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {robots.map((robot) => (
              <Card
                key={robot.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/robots/${robot.id}`)}
              >
                <CardHeader>
                  <div className="relative aspect-video bg-muted rounded overflow-hidden">
                    {robot.images && robot.images.length > 0 ? (
                      <img
                        src={robot.images[0]}
                        alt={`${robot.name} preview`}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>
                  <CardTitle className="mt-2 text-lg">{robot.name}</CardTitle>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-muted-foreground">{robot.model}</span>
                    <Badge variant={robot.availability === 'available' ? 'default' : 'secondary'}>
                      {robot.availability}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold mb-2">
                    {formatPrice(robot.price, robot.currency)}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {robot.category_tags.map((tag, idx) => (
                      <Badge variant="outline" key={idx}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <div className="p-4 pt-0">
                  <Button variant="ghost" className="w-full" onClick={() => navigate(`/robots/${robot.id}`)}>
                    View Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RobotListings;
