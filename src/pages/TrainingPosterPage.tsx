import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import EnhancedHeader from "@/components/EnhancedHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays, Clock, IndianRupee, Loader2, Mail, MapPin, MonitorPlay, Phone } from "lucide-react";
import PosterShare from "@/components/directory/PosterShare";
import TrainingEnquiryDialog, { type EnquiryListing } from "@/components/directory/TrainingEnquiryDialog";
import { getPoster, posterShareUrl, type TrainingPoster } from "@/components/directory/trainingApi";

// Public, shareable page for one training / workshop poster: /directory/training/poster/:id
export default function TrainingPosterPage() {
  const { id = "" } = useParams();
  const [poster, setPoster] = useState<TrainingPoster | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [enquiry, setEnquiry] = useState<EnquiryListing | null>(null);

  useEffect(() => {
    let live = true;
    setState("loading");
    getPoster(id)
      .then((p) => {
        if (!live) return;
        setPoster(p);
        setState("ready");
      })
      .catch(() => live && setState("missing"));
    return () => {
      live = false;
    };
  }, [id]);

  const i = poster?.info;
  const title = i?.title ? `${i.title}${i.organizer ? ` by ${i.organizer}` : ""}` : "Training poster";
  const description = i
    ? [i.summary, i.dates, i.location, i.fee && `Fee: ${i.fee}`].filter(Boolean).join(" · ").slice(0, 300)
    : "Robotics training and workshop poster on the RobotVerse Directory.";
  const facts = i
    ? ([
        [CalendarDays, "Dates", i.dates],
        [Clock, "Duration", i.duration],
        [MonitorPlay, "Mode", i.mode],
        [MapPin, "Venue", i.location],
        [IndianRupee, "Fee", i.fee],
        [Phone, "Contact", i.contact],
      ] as const).filter(([, , v]) => v)
    : [];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`${title} | Robotics Training | RobotVerse`}</title>
        <meta name="description" content={description} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        {poster && <meta property="og:image" content={poster.image} />}
        {poster && <meta property="og:url" content={posterShareUrl(poster.id)} />}
        <meta name="twitter:card" content="summary_large_image" />
        {poster && <link rel="canonical" href={posterShareUrl(poster.id)} />}
        {poster && i && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Event",
              name: i.title,
              description,
              image: poster.image,
              organizer: i.organizer ? { "@type": "Organization", name: i.organizer } : undefined,
              location: i.location ? { "@type": "Place", name: i.location, address: i.location } : undefined,
              eventAttendanceMode: /online/i.test(i.mode)
                ? "https://schema.org/OnlineEventAttendanceMode"
                : "https://schema.org/OfflineEventAttendanceMode",
              url: posterShareUrl(poster.id),
            })}
          </script>
        )}
      </Helmet>
      <EnhancedHeader />
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
          <Link to="/directory?tab=training" className="inline-flex items-center gap-1 hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> Training & Workshops
          </Link>
          <span>/</span>
          <span className="truncate text-foreground">{i?.title || "Poster"}</span>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {state === "loading" && (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading poster…
          </div>
        )}
        {state === "missing" && (
          <div className="mx-auto max-w-md py-16 text-center">
            <p className="mb-2 text-lg font-semibold">This poster is no longer available.</p>
            <p className="mb-6 text-sm text-muted-foreground">It may have been removed by the organizer or the RobotVerse team.</p>
            <Button asChild>
              <Link to="/directory?tab=training">See all training & workshops</Link>
            </Button>
          </div>
        )}
        {state === "ready" && poster && i && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <a href={poster.image} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-border bg-muted/30 p-3">
              <img src={poster.image} alt={i.title || "Training poster"} className="mx-auto max-h-[80vh] w-auto rounded-lg object-contain" />
            </a>
            <div className="space-y-5">
              <div className="flex flex-wrap gap-1.5">
                {i.kind && <Badge variant="secondary">{i.kind}</Badge>}
                <Badge variant="outline">
                  Added {new Date(poster.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </Badge>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{i.title || "Training program"}</h1>
                {(i.organizer || poster.company) && <p className="mt-1 text-lg text-muted-foreground">{i.organizer || poster.company}</p>}
              </div>
              {i.summary && <p className="text-muted-foreground">{i.summary}</p>}
              {facts.length > 0 && (
                <dl className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
                  {facts.map(([Icon, label, value]) => (
                    <div key={label} className="flex gap-2.5">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="text-sm font-medium">{value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              )}
              {i.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {i.topics.map((t) => (
                    <Badge key={t} variant="outline" className="font-normal">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="lg"
                  onClick={() =>
                    setEnquiry({ id: `Poster ${poster.id}`, title: i.title || "Training program", provider: i.organizer, dates: i.dates, location: i.location })
                  }
                >
                  <Mail className="mr-2 h-4 w-4" /> Enquire
                </Button>
                {/^https?:\/\//.test(i.registration) && (
                  <Button size="lg" variant="outline" asChild>
                    <a href={i.registration} target="_blank" rel="noopener noreferrer nofollow">
                      Register
                    </a>
                  </Button>
                )}
              </div>
              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-semibold">Share this training</p>
                <PosterShare poster={poster} />
              </div>
            </div>
          </div>
        )}
      </main>
      <TrainingEnquiryDialog listing={enquiry} onOpenChange={(open) => !open && setEnquiry(null)} />
    </div>
  );
}
