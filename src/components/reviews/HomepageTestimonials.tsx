import { useFeaturedTestimonials } from '@/hooks/useReviews';
import { StarRating } from './StarRating';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { format } from 'date-fns';
import { BevelBox, SectionHead, pad2 } from '@/components/console/ConsoleUI';

const dealTypeLabels: Record<string, string> = {
  robot: 'Robot deal',
  spare_parts: 'Spare parts',
  service: 'Service',
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
    <section className="border-t border-border bg-background px-4 py-14 md:py-20">
      <div className="container mx-auto max-w-6xl">
        <SectionHead
          index="006"
          label="Testimonials"
          title="Trusted by industry leaders"
          subtitle="Feedback from buyers and sellers who completed deals on RobotVerse."
          action={
            totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-none"
                  aria-label="Previous testimonials"
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[4.5rem] text-center font-mono text-xs tabular-nums text-muted-foreground">
                  {pad2(currentPage + 1)} / {pad2(totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-none"
                  aria-label="Next testimonials"
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage === totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : undefined
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-5">
          {visible.map((t, i) => {
            const initials = (t.reviewer_name || 'A').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

            return (
              <BevelBox key={t.id} className="h-full" innerClassName="flex flex-col p-6">
                <div className="mb-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <span className="tabular-nums">{pad2(currentPage * perPage + i + 1)}</span>
                  <span>{dealTypeLabels[t.deal_type] || t.deal_type}</span>
                </div>

                <Quote className="mb-3 h-5 w-5 text-primary" aria-hidden />
                <p className="mb-5 min-h-[60px] text-[15px] leading-relaxed text-foreground">
                  {t.feedback_text || 'Great experience!'}
                </p>

                <div className="mb-5">
                  <StarRating rating={t.overall_rating} size="sm" />
                </div>

                <div className="mt-auto flex items-center gap-3 border-t border-border pt-4">
                  <Avatar className="h-9 w-9 rounded-none">
                    <AvatarImage src={t.reviewer_avatar_url || undefined} className="rounded-none" />
                    <AvatarFallback className="rounded-none bg-muted font-mono text-xs text-foreground">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{t.reviewer_name || 'Anonymous'}</p>
                    {t.reviewer_company && (
                      <p className="truncate text-xs text-muted-foreground">{t.reviewer_company}</p>
                    )}
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {format(new Date(t.created_at), 'MMM yyyy')}
                  </span>
                </div>
              </BevelBox>
            );
          })}
        </div>
      </div>
    </section>
  );
}
