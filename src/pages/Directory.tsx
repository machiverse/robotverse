import { useSearchParams } from "react-router-dom";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import BackButton from "@/components/navigation/BackButton";
import { UniversalSEOHead } from "@/components/SEO/UniversalSEOHead";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Bot, GraduationCap, Mail, MoveHorizontal, Plus, Wrench } from "lucide-react";
import DirectoryCatalog from "@/components/directory/DirectoryCatalog";
import TrainingDirectory from "@/components/directory/TrainingDirectory";
import { listTrainingMailto, mailto } from "@/components/directory/directoryTypes";
import { TRAINING_LISTINGS } from "@/data/directoryTraining";

const TABS = [
  { id: "robots", label: "Industrial Robots", short: "Robots", icon: Bot, count: "1,513" },
  { id: "tools", label: "End-of-Arm Tools", short: "Tools", icon: Wrench, count: "171" },
  { id: "axes", label: "External Axes", short: "Axes", icon: MoveHorizontal, count: "101" },
  { id: "training", label: "Training & Workshops", short: "Training", icon: GraduationCap, count: String(TRAINING_LISTINGS.length) },
] as const;

type TabId = (typeof TABS)[number]["id"];
const isTab = (v: string | null): v is TabId => TABS.some((t) => t.id === v);

const generalEnquiry = mailto(
  "RobotVerse Directory enquiry",
  "Hello RobotVerse team,\n\nI'm looking for:\n\nName:\nCompany:\nPhone:\n\nThank you.",
);

const Directory = () => {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const tab: TabId = isTab(tabParam) ? tabParam : "robots";

  return (
    <div className="min-h-screen bg-background">
      <UniversalSEOHead
        title="Robotics Directory | Industrial Robots, End-of-Arm Tools & Training | RobotVerse"
        description="Browse 1,500+ industrial robots from 99 brands, end-of-arm tools, linear tracks and positioners, plus robotics training courses and workshops. Compare payload, reach and axes, and enquire with RobotVerse."
        keywords={[
          "industrial robot directory",
          "robot specifications payload reach",
          "robot end of arm tools",
          "robot grippers tool changers",
          "robot linear track positioner",
          "robotics training courses India",
          "robot programming workshop",
          "FANUC ABB KUKA Yaskawa robots",
        ]}
        canonicalUrl="https://robotverse.in/directory"
      />
      <EnhancedHeader />
      <BackButton fallbackPath="/" label="Back" />

      <main className="container mx-auto px-4 py-8">
        <section className="mx-auto mb-8 max-w-3xl text-center">
          <h1 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">Robotics Directory</h1>
          <p className="text-base text-muted-foreground md:text-lg">
            Every industrial robot, end-of-arm tool and external axis in one place, with specifications and RobotVerse
            IDs, plus robotics training courses, programs and workshops.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <a href={generalEnquiry}>
                <Mail className="mr-2 h-4 w-4" />
                Send an enquiry
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={listTrainingMailto}>
                <Plus className="mr-2 h-4 w-4" />
                List your training program
              </a>
            </Button>
          </div>
        </section>

        <Tabs value={tab} onValueChange={(v) => setParams(v === "robots" ? {} : { tab: v }, { replace: true })}>
          <TabsList className="mb-6 grid h-auto w-full grid-cols-2 gap-1 p-1 md:grid-cols-4">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="flex items-center gap-2 py-2.5">
                <t.icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.short}</span>
                <span className="text-xs text-muted-foreground">({t.count})</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="robots">
            <DirectoryCatalog kind="robots" />
          </TabsContent>
          <TabsContent value="tools">
            <DirectoryCatalog kind="tools" />
          </TabsContent>
          <TabsContent value="axes">
            <DirectoryCatalog kind="axes" />
          </TabsContent>
          <TabsContent value="training">
            <TrainingDirectory />
          </TabsContent>
        </Tabs>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Robot, tool and axis data and images: RoboDK robot library. Specifications are indicative; confirm with the
          manufacturer before purchase. All enquiries go to support@robotverse.in.
        </p>
      </main>

      <Footer />
    </div>
  );
};

export default Directory;
