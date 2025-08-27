import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Calendar, 
  User, 
  Eye, 
  PlusCircle,
  Filter,
  Clock,
  Heart,
  BookOpen
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import EnhancedHeader from "@/components/EnhancedHeader";

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
  } | null;
}

const Blogs = () => {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [selectedTag, setSelectedTag] = useState("all");
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    fetchBlogs();
  }, [sortBy]);

  useEffect(() => {
    if (blogs.length > 0) {
      const tags = Array.from(new Set(blogs.flatMap(blog => blog.tags)));
      setAvailableTags(tags);
    }
  }, [blogs]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('blogs')
        .select('*')
        .eq('status', 'published');

      switch (sortBy) {
        case 'latest':
          query = query.order('published_at', { ascending: false });
          break;
        case 'most_viewed':
          query = query.order('view_count', { ascending: false });
          break;
        case 'most_liked':
          query = query.order('like_count', { ascending: false });
          break;
        default:
          query = query.order('published_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch author info per blog
      const blogsWithAuthors = await Promise.all(
        (data || []).map(async (blog) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company_name')
            .eq('user_id', blog.author_id)
            .maybeSingle();
          
          return {
            ...blog,
            profiles: profile ? {
              full_name: profile.full_name || 'Anonymous',
              company_name: profile.company_name || ''
            } : null,
          };
        })
      );
      setBlogs(blogsWithAuthors);
    } catch (error) {
      console.error("Error fetching blogs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBlogs = blogs.filter(blog => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = blog.title.toLowerCase().includes(term)
      || blog.content.toLowerCase().includes(term)
      || blog.tags.some(tag => tag.toLowerCase().includes(term));
    const matchesTag = selectedTag === "all" || blog.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const generateExcerpt = (content: string, maxLength=150) => {
    return content.length <= maxLength ? content : content.substring(0, maxLength).trim() + "...";
  };

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <main className="container mx-auto px-4 py-8">
        {/* Header & Controls */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">RobotVerse Blog</h1>
              <p className="text-lg text-muted-foreground mt-2">Insights, tutorials, and updates from the robotics community</p>
            </div>
            {user ? (
              <Link to="/blogs/create">
                <Button className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Write Article
                </Button>
              </Link>
            ) : (
              <Button className="opacity-50 cursor-not-allowed" disabled title="Sign in to write articles">
                <PlusCircle className="h-4 w-4" />
                Write Article
              </Button>
            )}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-4 bg-card p-6 rounded-lg shadow-sm border">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search blogs by title, content, or tags..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="font-medium pl-10"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48 font-medium">
                <Filter className="mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest"><Clock className="mr-2" /> Latest</SelectItem>
                <SelectItem value="most_viewed"><Eye className="mr-2" /> Most Viewed</SelectItem>
                <SelectItem value="most_liked"><Heart className="mr-2" /> Most Liked</SelectItem>
              </SelectContent>
            </Select>

            {availableTags.length > 0 && (
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-full md:w-48 font-medium">
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {availableTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Blog Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-96">
                <CardHeader>
                  <Skeleton className="h-48 w-full rounded-md" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="mb-4 h-6 w-2/3" />
                  <Skeleton className="mb-4 h-4" />
                  <Skeleton className="mb-6 h-4 w-5/6" />
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="mx-auto mb-6 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-semibold">No Blogs Found</h3>
            <p className="mb-6 text-muted-foreground">
              {searchTerm || (selectedTag !== 'all' && `No posts found for tag "${selectedTag}"`) || "Be the first to share your insights!"}
            </p>
            {user && (
              <Link to="/blogs/create">
                <Button>
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Write First Blog
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBlogs.map(blog => (
              <Card key={blog.id} className="group cursor-pointer border hover:shadow-lg hover:border-primary transition">
                <Link to={`/blogs/${blog.id}`}>
                  {blog.image_url && (
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img src={blog.image_url} alt={blog.title} className="w-full h-full object-cover"/>
                    </div>
                  )}
                  <CardContent>
                    <h3 className="mb-2 text-xl font-semibold line-clamp-2 group-hover:text-primary">{blog.title}</h3>
                    <p className="mb-4 line-clamp-3 text-muted-foreground">{blog.excerpt || generateExcerpt(blog.content)}</p>
                    {blog.tags.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {blog.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} className="text-xs" variant="secondary">{tag}</Badge>
                        ))}
                        {blog.tags.length > 3 && (
                          <Badge className="text-xs" variant="secondary">+{blog.tags.length - 3}</Badge>
                        )}
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{blog.profiles?.full_name || blog.profiles?.company_name || 'Anonymous'}</span>
                      <span>{formatDistanceToNow(new Date(blog.published_at || blog.created_at), { addSuffix: true })}</span>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Blogs;
