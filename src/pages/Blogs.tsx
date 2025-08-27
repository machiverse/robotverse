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
  TrendingUp,
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

      // Apply sorting
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

      // Fetch author info for each blog
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
            } : null
          };
        })
      );

      setBlogs(blogsWithAuthors as Blog[]);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBlogs = blogs.filter(blog => {
    const matchesSearch = blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         blog.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         blog.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTag = selectedTag === "all" || blog.tags.includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  const generateExcerpt = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + "...";
  };

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">RobotVerse Blog</h1>
              <p className="text-lg text-muted-foreground mt-2">
                Insights, tutorials, and updates from the robotics community
              </p>
            </div>
            
            {user ? (
              <Link to="/blogs/create">
                <Button className="flex items-center gap-2 font-semibold">
                  <PlusCircle className="h-4 w-4" />
                  Write Article
                </Button>
              </Link>
            ) : (
              <div className="relative group">
                <Button disabled className="flex items-center gap-2 font-semibold opacity-50 cursor-not-allowed">
                  <PlusCircle className="h-4 w-4" />
                  Write Article
                </Button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  Sign in to publish blogs
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-popover rotate-45"></div>
                </div>
              </div>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 bg-card p-6 rounded-lg shadow-sm border">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search blogs by title, content, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 font-medium"
              />
            </div>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48 font-medium">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Latest
                  </div>
                </SelectItem>
                <SelectItem value="most_viewed">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Most Viewed
                  </div>
                </SelectItem>
                <SelectItem value="most_liked">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Most Liked
                  </div>
                </SelectItem>
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
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Blog Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="h-96">
                <CardHeader>
                  <Skeleton className="h-48 w-full rounded-md" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No blogs found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || (selectedTag && selectedTag !== "all")
                ? "Try adjusting your search or filter criteria." 
                : "Be the first to share your insights with the community!"
              }
            </p>
            <Link to="/blogs/create">
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Write First Article
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBlogs.map((blog) => (
              <Card key={blog.id} className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/20 bg-card">
                <Link to={`/blogs/${blog.id}`}>
                  {blog.image_url && (
                    <div className="aspect-[16/10] overflow-hidden rounded-t-lg">
                      <img
                        src={blog.image_url}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  )}
                  
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                        {blog.title}
                      </h3>
                      
                      <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                        {blog.excerpt || generateExcerpt(blog.content)}
                      </p>
                      
                      {blog.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {blog.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs font-medium">
                              {tag}
                            </Badge>
                          ))}
                          {blog.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs font-medium">
                              +{blog.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-sm font-medium pt-4 border-t border-border">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span className="truncate font-medium">
                            {blog.profiles?.full_name || blog.profiles?.company_name || 'Anonymous'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span className="font-bold text-foreground">{blog.view_count || 0}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">
                              {formatDistanceToNow(new Date(blog.published_at || blog.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
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