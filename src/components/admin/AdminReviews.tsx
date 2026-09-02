import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StarRating } from '@/components/reviews/StarRating';
import { useAdminReviews } from '@/hooks/useReviews';
import { Star, Eye, EyeOff, Flag, Trash2, Award, RefreshCw, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminReviews() {
  const { reviews, loading, stats, updateReviewStatus, toggleFeatured, refetch } = useAdminReviews();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  const filtered = reviews.filter(r => {
    const matchesSearch = !search || 
      r.reviewer_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.feedback_text?.toLowerCase().includes(search.toLowerCase()) ||
      r.reviewer_company?.toLowerCase().includes(search.toLowerCase());
    
    const matchesTab = tab === 'all' || r.status === tab || (tab === 'featured' && r.is_featured);
    return matchesSearch && matchesTab;
  });

  const statusColors: Record<string, string> = {
    published: 'bg-success/20 text-success',
    hidden: 'bg-yellow-500/20 text-yellow-400',
    flagged: 'bg-red-500/20 text-red-400',
    removed: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Reviews</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{stats.published}</p>
            <p className="text-xs text-muted-foreground">Published</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.hidden}</p>
            <p className="text-xs text-muted-foreground">Hidden</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.flagged}</p>
            <p className="text-xs text-muted-foreground">Flagged</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <p className="text-2xl font-bold text-foreground">{stats.averageRating}</p>
            </div>
            <p className="text-xs text-muted-foreground">Avg Rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reviews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="flagged">Flagged</TabsTrigger>
          <TabsTrigger value="hidden">Hidden</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading reviews...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No reviews found.</p>
          ) : (
            filtered.map(review => (
              <Card key={review.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-sm">{review.reviewer_name || 'Anonymous'}</span>
                        {review.reviewer_company && (
                          <span className="text-xs text-muted-foreground">• {review.reviewer_company}</span>
                        )}
                        <Badge className={statusColors[review.status] || ''}>{review.status}</Badge>
                        {review.is_featured && <Badge className="bg-yellow-500/20 text-yellow-400">★ Featured</Badge>}
                        <Badge variant="secondary" className="text-xs">{review.deal_type}</Badge>
                      </div>

                      <StarRating rating={review.overall_rating} size="sm" showValue />

                      {review.feedback_text && (
                        <p className="text-sm text-muted-foreground">"{review.feedback_text}"</p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {format(new Date(review.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {review.status !== 'published' && (
                        <Button size="icon" variant="ghost" title="Publish" onClick={() => updateReviewStatus(review.id, 'published')}>
                          <Eye className="h-4 w-4 text-success" />
                        </Button>
                      )}
                      {review.status !== 'hidden' && (
                        <Button size="icon" variant="ghost" title="Hide" onClick={() => updateReviewStatus(review.id, 'hidden', 'Hidden by admin')}>
                          <EyeOff className="h-4 w-4 text-yellow-400" />
                        </Button>
                      )}
                      {review.status !== 'flagged' && (
                        <Button size="icon" variant="ghost" title="Flag" onClick={() => updateReviewStatus(review.id, 'flagged')}>
                          <Flag className="h-4 w-4 text-red-400" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" title={review.is_featured ? 'Unfeature' : 'Feature'} onClick={() => toggleFeatured(review.id, review.is_featured)}>
                        <Award className={`h-4 w-4 ${review.is_featured ? 'text-yellow-400' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button size="icon" variant="ghost" title="Remove" onClick={() => updateReviewStatus(review.id, 'removed', 'Removed by admin')}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
