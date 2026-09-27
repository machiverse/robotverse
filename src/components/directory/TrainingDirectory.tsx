import { useMemo, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, GraduationCap, MapPin, MonitorPlay, Mail, Plus, Search } from "lucide-react";
import { TRAINING_LISTINGS, type TrainingListing } from "@/data/directoryTraining";
import { listTrainingMailto, mailto } from "./directoryTypes";

const KINDS = ["All", "OEM Academy", "Online Course", "Program", "Workshop"] as const;

const enquireMailto = (t: TrainingListing) =>
  mailto(
    `Training enquiry: ${t.title} (${t.id})`,
    `Hello RobotVerse team,\n\nI'm interested in "${t.title}" by ${t.provider} (RobotVerse ID ${t.id}).\n\nName:\nPhone:\nPreferred mode (online / classroom):\nCity:\n\nThank you.`,
  );

const learnMoreUrl = (t: TrainingListing) =>
  t.link ?? `https://www.google.com/search?q=${encodeURIComponent(`${t.title} ${t.provider} training`)}`;

const TrainingDirectory = () => {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TRAINING_LISTINGS.filter(
      (t) =>
        (kind === "All" || t.kind === kind) &&
        (!q || `${t.id} ${t.title} ${t.provider} ${t.location} ${t.topics.join(" ")}`.toLowerCase().includes(q)),
    );
  }, [query, kind]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Run a robotics course, program or workshop?</h2>
          <p className="text-sm text-muted-foreground">
            Get listed for free. Send us your details and we'll add your training to the Directory.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <a href={listTrainingMailto}>
            <Plus className="mr-2 h-4 w-4" />
            List your training
          </a>
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by topic, brand, provider or city"
            className="pl-9"
            aria-label="Search training"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <Badge
              key={k}
              variant={kind === k ? "default" : "outline"}
              className="cursor-pointer px-3 py-1"
              onClick={() => setKind(k)}
            >
              {k}
            </Badge>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No training matches this search.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="flex h-full flex-col transition-all hover:border-primary/40 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {t.id}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {t.kind}
                      </Badge>
                    </div>
                    <CardTitle className="text-base leading-snug">{t.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{t.provider}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3 pb-3">
                <p className="text-sm text-muted-foreground">{t.description}</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MonitorPlay className="h-3.5 w-3.5" />
                    {t.mode}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {t.location}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {t.topics.map((topic) => (
                    <Badge key={topic} variant="secondary" className="text-[11px] font-normal">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="gap-2">
                <Button size="sm" className="flex-1" asChild>
                  <a href={enquireMailto(t)}>
                    <Mail className="mr-1.5 h-4 w-4" />
                    Enquire
                  </a>
                </Button>
                <Button size="sm" variant="outline" className="flex-1" asChild>
                  <a href={learnMoreUrl(t)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    {t.link ? "Visit website" : "Learn more"}
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainingDirectory;
