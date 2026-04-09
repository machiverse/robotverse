import { useState } from "react";
import { useTrainingPrograms, ROBOT_BRANDS, JOB_CATEGORIES } from "@/hooks/useRobotTalent";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, GraduationCap, IndianRupee, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TalentTrainingList = () => {
  const [filters, setFilters] = useState<any>({});
  const { data: programs, isLoading } = useTrainingPrograms(filters);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleInquiry = async (programId: string) => {
    if (!user) { toast({ title: 'Please sign in first', variant: 'destructive' }); return; }
    const { error } = await supabase.from('training_inquiries' as any).insert({ program_id: programId, user_id: user.id });
    if (error?.code === '23505') { toast({ title: 'Already enquired' }); return; }
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Inquiry sent!' });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Select onValueChange={v => setFilters((f: any) => ({ ...f, brand: v === 'all' ? undefined : v }))}>
          <SelectTrigger><SelectValue placeholder="Robot Brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {ROBOT_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select onValueChange={v => setFilters((f: any) => ({ ...f, category: v === 'all' ? undefined : v }))}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {JOB_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select onValueChange={v => setFilters((f: any) => ({ ...f, mode: v === 'all' ? undefined : v }))}>
          <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}

      {!isLoading && programs?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No training programs found.</p>
        </div>
      )}

      {programs?.map((p: any) => (
        <Card key={p.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{p.course_name}</h3>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                  {p.robot_brand && <Badge variant="outline">{p.robot_brand}</Badge>}
                  {p.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.duration}</span>}
                  {p.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.city}</span>}
                  <Badge variant="secondary" className="capitalize">{p.mode}</Badge>
                  {p.certification && <span className="flex items-center gap-1"><Award className="h-3 w-3" />{p.certification}</span>}
                </div>
                {p.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{p.description}</p>}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {p.skills_covered?.slice(0, 4).map((s: string) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                </div>
              </div>
              <div className="text-right shrink-0 space-y-2">
                {p.fees && (
                  <div className="flex items-center gap-1 text-foreground font-semibold">
                    <IndianRupee className="h-4 w-4" />{p.fees.toLocaleString('en-IN')}
                  </div>
                )}
                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleInquiry(p.id); }}>Enquire</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TalentTrainingList;
