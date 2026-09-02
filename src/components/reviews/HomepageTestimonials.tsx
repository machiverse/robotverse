import { useFeaturedTestimonials } from '@/hooks/useReviews';
import { StarRating } from './StarRating';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { format } from 'date-fns';

const dealTypeLabels: Record<string, string> = {
  robot: '🤖 Robot Deal',
  spare_parts: '🔧 Spare Parts',
  service: '🛠️ Service',
};

export function HomepageTestimonials() {
  const { testimonials, loading } = useFeaturedTestimonials();
  const [currentPage, setCurrentPage] = useState(0);
  const perPage = 3;
  const totalPages = Math.ceil(testimonials.length / perPage);

  if (loading) return null;
  if (testimonials.length === 0) return null;

  const visible = testimonials.slice(currentPage * perPage, (currentPage + 1) * perPage);

  return (
    <section className="py-10 md:py-14 px-4 bg-muted/20">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 text-primary border-primary/30 px-4 py-1">
            Customer Testimonials
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Trusted by Industry Leaders
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real feedback from buyers and sellers who've successfully completed deals on RobotVerse.
          </p>
        </div>

        {/* Testimonial cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((t) => {
            const initials = (t.reviewer_name || 'A').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

            return (
              <Card key={t.id} className="bg-card border-border hover:border-primary/30 transition-colors group">
                <CardContent className="p-6 space-y-4">
                  <Quote className="h-8 w-8 text-primary/20 group-hover:text-primary/40 transition-colors" />

                  <p className="text-sm text-muted-foreground leading-relaxed italic min-h-[60px]">
                    "{t.feedback_text || 'Great experience!'}"
                  </p>

                  <StarRating rating={t.overall_rating} size="sm" />

                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={t.reviewer_avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{t.reviewer_name || 'Anonymous'}</p>
                      {t.reviewer_company && (
                        <p className="text-xs text-muted-foreground truncate">{t.reviewer_company}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {dealTypeLabels[t.deal_type] || t.deal_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(t.created_at), 'MMM yyyy')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
