import { useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { useTalentJobs, ROBOT_BRANDS, JOB_CATEGORIES, JOB_TYPES } from "@/hooks/useRobotTalent";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Clock, Briefcase, IndianRupee, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const TalentJobsList = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<any>({});
  const [citySearch, setCitySearch] = useState("");
  const { data: jobs, isLoading } = useTalentJobs(filters);

  const applyCity = () => setFilters((f: any) => ({ ...f, city: citySearch || undefined }));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Select onValueChange={v => setFilters((f: any) => ({ ...f, category: v === 'all' ? undefined : v }))}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {JOB_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select onValueChange={v => setFilters((f: any) => ({ ...f, brand: v === 'all' ? undefined : v }))}>
          <SelectTrigger><SelectValue placeholder="Robot Brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {ROBOT_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select onValueChange={v => setFilters((f: any) => ({ ...f, type: v === 'all' ? undefined : v }))}>
          <SelectTrigger><SelectValue placeholder="Job Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Input placeholder="City" value={citySearch} onChange={e => setCitySearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyCity()} />
          <Button size="icon" variant="outline" onClick={applyCity}><Search className="h-4 w-4" /></Button>
        </div>
        <Select onValueChange={v => { const r = v === 'all' ? {} : { expMin: parseInt(v) }; setFilters((f: any) => ({ ...f, ...r })); }}>
          <SelectTrigger><SelectValue placeholder="Experience" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Experience</SelectItem>
            <SelectItem value="0">0-2 years</SelectItem>
            <SelectItem value="3">3-5 years</SelectItem>
            <SelectItem value="5">5+ years</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Job Cards */}
      {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}

      {!isLoading && jobs?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No jobs found. Try adjusting your filters.</p>
        </div>
      )}

      {jobs?.map((job: any) => (
        <Card key={job.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/robot-talent/jobs/${job.id}`)}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-foreground truncate">{job.title}</h3>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                  {job.company_type && <span className="capitalize">{job.company_type}</span>}
                  {job.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.city}</span>}
                  {(job.salary_min || job.salary_max) && (
                    <span className="flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" />
                      {job.salary_min && `${(job.salary_min / 100000).toFixed(1)}L`}
                      {job.salary_min && job.salary_max && ' - '}
                      {job.salary_max && `${(job.salary_max / 100000).toFixed(1)}L`}
                    </span>
                  )}
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(job.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {job.robot_brand && <Badge variant="outline">{job.robot_brand}</Badge>}
                  <Badge variant="secondary" className="capitalize">{job.job_type?.replace('-', ' ')}</Badge>
                  <Badge variant="secondary">{job.category}</Badge>
                  {job.skills_required?.slice(0, 3).map((s: string) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                </div>
              </div>
              {job.is_featured && <Badge className="bg-primary text-primary-foreground shrink-0">Featured</Badge>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TalentJobsList;
