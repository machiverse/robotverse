import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Calendar, 
  User, 
  Eye, 
  ArrowLeft,
  Edit,
  Trash2,
  Share2,
  BookOpen
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow, format } from "date-fns";
import EnhancedHeader from "@/components/EnhancedHeader";
import BlogComments from "@/components/BlogComments";

interface Blog {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  image_url?: string;
  status: string;
  author_id: string;
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  profiles?: {
    full_name: string;
    company_name?: string;
    user_id: string;
  } | null;
}

const BlogDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [relatedBlogs, setRelatedBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchBlog();
      incrementViewCount();
    }
  }, [id]);

  useEffect(() => {
    if (blog) {
      fetchRelatedBlogs();
    }
  }, [blog]);

  const fetchBlog = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        setBlog(null);
        return;
      }

      // Fetch author profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company_name')
        .eq('user_id', data.author_id)
        .maybeSingle();

      setBlog({
        ...data,
        profiles: profile ? {
          full_name: profile.full_name || 'Anonymous',
          company_name: profile.company_name || '',
          user_id: data.author_id
        } : null
      } as Blog);
    } catch (error) {
      console.error('Error fetching blog:', error);
      toast.error('Failed to load blog post');
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async () => {
    try {
      await supabase.rpc('increment_blog_view_count', { p_blog_id: id });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const fetchRelatedBlogs = async () => {
    if (!blog) return;

    try {
      setRelatedLoading(true);
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('status', 'published')
        .neq('id', blog.id)
        .limit(3)
        .order('published_at', { ascending: false });

      if (error) throw error;

      // Fetch author info for each related blog
      const blogsWithAuthors = await Promise.all(
        (data || []).map(async (relatedBlog) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company_name')
            .eq('user_id', relatedBlog.author_id)
            .maybeSingle();
          
          return {
            ...relatedBlog,
            profiles: profile ? {
              full_name: profile.full_name || 'Anonymous',
              company_name: profile.company_name || ''
            } : null
          };
        })
      );

      setRelatedBlogs(blogsWithAuthors as Blog[]);
    } catch (error) {
      console.error('Error fetching related blogs:', error);
    } finally {
      setRelatedLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('blogs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Blog post deleted successfully');
      navigate('/blogs');
    } catch (error) {
      console.error('Error deleting blog:', error);
      toast.error('Failed to delete blog post');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: blog?.title,
        text: blog?.excerpt,
        url: window.location.href,
      });
    } catch (error) {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const generateExcerpt = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + "...";
  };

  // Remove authentication requirement for viewing articles

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-8 w-32 mb-6" />
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-64 w-full mb-6" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-md mx-auto">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Blog Post Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The blog post you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/blogs">
              <Button>Back to Blogs</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isAuthor = user?.id === blog.author_id;

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Link to="/blogs">
              <Button variant="ghost" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Blogs
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleShare} className="flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              
              {isAuthor && (
                <>
                  <Link to={`/blogs/${blog.id}/edit`}>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this blog post? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>

          {/* Article Header */}
          <article className="space-y-8">
            <header className="space-y-6 text-center">
              <h1 className="text-5xl font-bold leading-tight tracking-tight">{blog.title}</h1>
              
              <div className="flex flex-wrap items-center justify-center gap-6 text-lg font-semibold text-muted-foreground">
                 <div className="flex items-center gap-3">
                   <User className="h-5 w-5" />
                   {user ? (
                     <span className="font-bold text-foreground">{blog.profiles?.full_name || blog.profiles?.company_name || 'Community Member'}</span>
                   ) : (
                     <span className="font-bold text-muted-foreground">Community Member</span>
                   )}
                 </div>
                
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5" />
                  <span className="font-bold text-foreground">{format(new Date(blog.published_at || blog.created_at), 'MMMM d, yyyy')}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5" />
                  <span className="font-bold text-primary text-xl">{blog.view_count || 0} views</span>
                </div>
              </div>

              {blog.tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-3 pt-4">
                  {blog.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-sm font-semibold px-3 py-1">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </header>

            {/* Featured Image */}
            {blog.image_url && (
              <div className="aspect-video overflow-hidden rounded-xl shadow-lg mx-auto max-w-4xl">
                <img
                  src={blog.image_url}
                  alt={blog.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Article Content */}
            <div className="prose prose-xl max-w-none mx-auto leading-relaxed">
              <div 
                className="text-lg leading-8 text-foreground space-y-4"
                dangerouslySetInnerHTML={{ 
                  __html: blog.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>')
                    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold mt-6 mb-3">$1</h2>')
                    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold mt-4 mb-2">$1</h3>')
                    .replace(/^• (.+)$/gm, '<li class="ml-6">$1</li>')
                    .replace(/^\d+\. (.+)$/gm, '<li class="ml-6 list-decimal">$1</li>')
                    .replace(/\n/g, '<br>')
                }}
              />
            </div>

            {/* Article Footer */}
            <footer className="pt-8 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground">
                  <span className="font-bold">Published</span> {formatDistanceToNow(new Date(blog.published_at || blog.created_at), { addSuffix: true })}
                  {blog.updated_at !== blog.created_at && (
                    <span> • <span className="font-bold">Updated</span> {formatDistanceToNow(new Date(blog.updated_at), { addSuffix: true })}</span>
                  )}
                </div>
              </div>
            </footer>
          </article>

          {/* Related Articles */}
          {relatedBlogs.length > 0 && (
            <section className="mt-20">
              <h2 className="text-3xl font-bold mb-8 text-center">Related Articles</h2>
              
              {relatedLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="h-64">
                      <CardContent className="p-4 space-y-3">
                        <Skeleton className="h-32 w-full rounded-md" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {relatedBlogs.map((relatedBlog) => (
                    <Card key={relatedBlog.id} className="group hover:shadow-lg transition-shadow">
                      <Link to={`/blogs/${relatedBlog.id}`}>
                        {relatedBlog.image_url && (
                          <div className="aspect-video overflow-hidden rounded-t-lg">
                            <img
                              src={relatedBlog.image_url}
                              alt={relatedBlog.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                              {relatedBlog.title}
                            </h3>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {relatedBlog.excerpt || generateExcerpt(relatedBlog.content)}
                            </p>
                            
                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                             <span>
                               {user ? (relatedBlog.profiles?.full_name || relatedBlog.profiles?.company_name || 'Community Member') : 'Community Member'}
                             </span>
                              <span>
                                {formatDistanceToNow(new Date(relatedBlog.published_at || relatedBlog.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Link>
                    </Card>
                  ))}
                </div>
              )}
            </section>
           )}

          {/* Comments Section - Only show for authenticated users */}
          {user && <BlogComments blogId={blog.id} />}
         </div>
       </main>
     </div>
  );
};

export default BlogDetails;