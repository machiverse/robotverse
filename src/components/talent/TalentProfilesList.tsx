import { useState } from "react";
import { useTalentProfiles, ROBOT_BRANDS } from "@/hooks/useRobotTalent";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, Search, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const TalentProfilesList = () => {
  const [filters, setFilters] = useState<any>({});
  const [citySearch, setCitySearch] = useState("");
  const { data: profiles, isLoading } = useTalentProfiles(filters);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex gap-1">
          <Input placeholder="Search city" value={citySearch} onChange={e => setCitySearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && setFilters((f: any) => ({ ...f, city: citySearch || undefined }))} />
          <Button size="icon" variant="outline" onClick={() => setFilters((f: any) => ({ ...f, city: citySearch || undefined }))}><Search className="h-4 w-4" /></Button>
        </div>
        <Select onValueChange={v => setFilters((f: any) => ({ ...f, brand: v === 'all' ? undefined : v }))}>
          <SelectTrigger><SelectValue placeholder="Robot Brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {ROBOT_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select onValueChange={v => setFilters((f: any) => ({ ...f, expMin: v === 'all' ? undefined : parseInt(v) }))}>
          <SelectTrigger><SelectValue placeholder="Experience" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            <SelectItem value="0">0+ years</SelectItem>
            <SelectItem value="3">3+ years</SelectItem>
            <SelectItem value="5">5+ years</SelectItem>
            <SelectItem value="10">10+ years</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Skill filter" onChange={e => setFilters((f: any) => ({ ...f, skill: e.target.value || undefined }))} />
      </div>

      {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}

      {!isLoading && profiles?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No talent profiles found.</p>
        </div>
      )}

      {profiles?.map((p: any) => (
        <Card key={p.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{p.headline || p.preferred_role || 'Robot Professional'}</h3>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                  {p.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.city}</span>}
                  <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{p.total_experience_years || 0} yrs exp</span>
                  {p.projects_completed > 0 && <span>{p.projects_completed} projects</span>}
                  {p.availability && <Badge variant="outline" className="text-xs capitalize">{p.availability}</Badge>}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {p.robot_brands?.slice(0, 3).map((b: string) => <Badge key={b} variant="secondary">{b}</Badge>)}
                  {p.skills?.slice(0, 4).map((s: string) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                </div>
              </div>
              {(p.expected_salary_min || p.expected_salary_max) && (
                <div className="text-right text-sm text-muted-foreground shrink-0">
                  <span className="font-medium text-foreground">
                    ₹{p.expected_salary_min ? `${(p.expected_salary_min / 100000).toFixed(1)}L` : ''}
                    {p.expected_salary_min && p.expected_salary_max ? ' - ' : ''}
                    {p.expected_salary_max ? `${(p.expected_salary_max / 100000).toFixed(1)}L` : ''}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TalentProfilesList;
