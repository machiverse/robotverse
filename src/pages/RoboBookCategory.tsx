import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Grid, List, Search, Eye, Heart, MessageCircle, ChevronRight, Home, BookOpen, Calendar, MoreVertical, Edit, Trash2, Clock, FileEdit, CheckCircle2 } from "lucide-react";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import EnhancedHeader from "@/components/EnhancedHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import EditPostModal from "@/components/EditPostModal";
import { toast } from "sonner";
import { SEOHead } from "@/components/SEOHead";
import { ROBOBOOK_CATEGORIES } from "@/constants/navigationMenus";
import { format } from "date-fns";

const RoboBookCategory = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const categoryName = category ? decodeURIComponent(category).replace(/-/g, ' ') : '';
  const matchedCategory = ROBOBOOK_CATEGORIES.find(rc => 
    rc.toLowerCase() === categoryName.toLowerCase() ||
    rc.toLowerCase().replace(/\s+/g, '-') === category?.toLowerCase()
  );
  const displayName = matchedCategory || categoryName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"published" | "scheduled" | "drafts">("published");
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [deletingPost, setDeletingPost] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refetch = () => {
    // bump a dependency by toggling loading + re-running effect via key
    setPosts([]);
    setLoading(true);
    // re-trigger by updating a state that useEffect depends on — reuse user?.id trick isn't possible; call fetch directly
    fetchAndSet();
  };

  const fetchAndSet = async () => {
    try {
      setLoading(true);
      let communityQuery = supabase
        .from("community_posts")
        .select(`*, profiles:author_id (full_name, company_name, avatar_url)`)
        .order("created_at", { ascending: false });

      if (user?.id) {
        communityQuery = communityQuery.or(
          `status.eq.published,and(author_id.eq.${user.id},status.in.(scheduled,draft))`
        );
      } else {
        communityQuery = communityQuery.eq("status", "published");
      }

      const [postsResult, blogsResult] = await Promise.all([
        communityQuery,
        supabase
          .from("blogs")
          .select(`*, profiles:author_id (full_name, company_name, avatar_url)`)
          .eq("status", "published")
          .order("created_at", { ascending: false })
      ]);

      const allPosts = [
        ...(postsResult.data || []).map(p => ({ ...p, source: 'community' })),
        ...(blogsResult.data || []).map(b => ({ ...b, source: 'blog' }))
      ];

      const filteredPosts = allPosts.filter(post => {
        const tags = post.tags || [];
        const postType = (post as any).post_type?.toLowerCase() || '';
        const searchCat = categoryName.toLowerCase();
        return tags.some((tag: string) => tag.toLowerCase().includes(searchCat)) ||
               postType.includes(searchCat) ||
               searchCat.includes(postType);
      });

      filteredPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setPosts(filteredPosts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (categoryName) fetchAndSet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryName, user?.id]);


  const isMine = (post: any) => user?.id && post.author_id === user.id && post.source === 'community';
  const myDraftsCount = posts.filter(p => isMine(p) && p.status === 'draft').length;
  const myScheduledCount = posts.filter(p => isMine(p) && p.status === 'scheduled').length;

  const tabFilteredPosts = posts.filter(post => {
    if (tab === 'drafts') return isMine(post) && post.status === 'draft';
    if (tab === 'scheduled') return isMine(post) && post.status === 'scheduled';
    // published tab: everyone's published + blogs
    return post.status === 'published' || post.source === 'blog';
  });

  const filteredPosts = tabFilteredPosts.filter(post => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return post.title?.toLowerCase().includes(search) || 
           post.content?.toLowerCase().includes(search) ||
           post.excerpt?.toLowerCase().includes(search);
  });

  const handleDelete = async () => {
    if (!deletingPost || !user) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', deletingPost.id)
        .eq('author_id', user.id);
      if (error) throw error;
      toast.success('Post deleted');
      setDeletingPost(null);
      fetchAndSet();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };


  const getDescription = () => {
    const desc: Record<string, string> = {
      "industry news": "Latest news and updates from the robotics industry worldwide.",
      "robot reviews": "In-depth reviews of industrial robots from various manufacturers.",
      "how-to guides": "Step-by-step guides for robot programming, maintenance and operation.",
      "case studies": "Real-world case studies of successful robot implementations.",
      "technology trends": "Emerging trends and technologies in industrial automation.",
      "expert insights": "Expert opinions and insights on robotics and automation.",
      "product launches": "New robot and automation product announcements.",
      "events & exhibitions": "Robotics trade shows, exhibitions and industry events."
    };
    return desc[categoryName.toLowerCase()] || `Browse ${displayName.toLowerCase()} articles and posts.`;
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${displayName} | RoboBook | RobotVerse`}
        description={`${getDescription()} Read articles, guides and news about industrial robots.`}
        keywords={`${displayName}, robotics blog, robot articles, automation news, ${displayName.toLowerCase()}`}
        canonical={`/robobook/${category}`}
      />

      <EnhancedHeader />

      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary flex items-center"><Home className="w-4 h-4 mr-1" />Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/robobook" className="hover:text-primary">RoboBook</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">{displayName}</span>
        </nav>
      </div>

      <div className="relative bg-gradient-hero border-b border-border">
        <div className="absolute inset-0 bg-gradient-primary opacity-10"></div>
        <div className="relative container mx-auto px-4 py-12">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-4">
              <BookOpen className="w-10 h-10 text-primary mr-3" />
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">{displayName}</h1>
            </div>
            <p className="text-lg text-muted-foreground">{getDescription()}</p>
            <p className="mt-4 text-sm text-muted-foreground">{filteredPosts.length} articles</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8 bg-card border-border">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search articles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <div className="flex space-x-2">
                <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}><Grid className="w-4 h-4" /></Button>
                <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}><List className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {user && (
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-6">
            <TabsList className="grid grid-cols-3 w-full max-w-lg">
              <TabsTrigger value="published">Published</TabsTrigger>
              <TabsTrigger value="scheduled">My Scheduled{myScheduledCount ? ` (${myScheduledCount})` : ''}</TabsTrigger>
              <TabsTrigger value="drafts">My Drafts{myDraftsCount ? ` (${myDraftsCount})` : ''}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}


        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading articles...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold mb-2">No {displayName} Articles Found</h3>
            <p className="text-muted-foreground mb-4">Check back later for new content.</p>
            <Button variant="outline" onClick={() => navigate('/robobook')}>Browse All Articles</Button>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {filteredPosts.map((post) => (
              <Card 
                key={post.id} 
                className="group bg-card border-border hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                onClick={() => navigate(post.source === 'blog' ? `/blogs/${post.id}` : `/robobook/${post.id}`)}
              >
                {(post.image_url || post.media_url) && (
                  <div className="relative aspect-video overflow-hidden">
                    <ResponsiveImage
                      src={post.image_url || post.media_url}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar className="h-8 w-8">
                      {post.profiles?.avatar_url ? (
                        <AvatarImage src={post.profiles.avatar_url} />
                      ) : (
                        <AvatarFallback>{post.profiles?.full_name?.charAt(0) || 'A'}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{post.profiles?.full_name || 'Anonymous'}</p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(post.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                    {isMine(post) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingPost(post); }}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); setDeletingPost(post); }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {isMine(post) && post.status && post.status !== 'published' && (
                    <div className="mb-2">
                      {post.status === 'scheduled' && (
                        <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                          <Clock className="h-3 w-3 mr-1" />
                          Scheduled{post.scheduled_publish_at ? ` · ${format(new Date(post.scheduled_publish_at), 'MMM d, h:mm a')}` : ''}
                        </Badge>
                      )}
                      {post.status === 'draft' && (
                        <Badge variant="outline" className="border-muted-foreground/30 bg-muted text-muted-foreground">
                          <FileEdit className="h-3 w-3 mr-1" /> Draft
                        </Badge>
                      )}
                    </div>
                  )}

                  <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{post.title}</h3>
                  
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{post.excerpt}</p>
                  )}


                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center"><Eye className="w-4 h-4 mr-1" />{post.view_count || 0}</span>
                      <span className="flex items-center"><Heart className="w-4 h-4 mr-1" />{post.like_count || 0}</span>
                      <span className="flex items-center"><MessageCircle className="w-4 h-4 mr-1" />{post.comment_count || 0}</span>
                    </div>
                  </div>

                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {post.tags.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {editingPost && (
        <EditPostModal
          post={editingPost}
          open={!!editingPost}
          onOpenChange={(o) => !o && setEditingPost(null)}
          onPostUpdated={() => { setEditingPost(null); fetchAndSet(); }}
        />
      )}

      <AlertDialog open={!!deletingPost} onOpenChange={(o) => !o && setDeletingPost(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RoboBookCategory;
