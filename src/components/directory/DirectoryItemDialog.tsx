import { Link } from "react-router-dom";
import { directorySlug } from "@/lib/seo/seoText";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageIcon, Mail } from "lucide-react";
import ItemImage from "./ItemImage";
import RobotComponents from "./RobotComponents";
import { enquiryMailto, oemPhotoSearchUrl, type CatalogItem, type CatalogKind, type Photo } from "./directoryTypes";

interface Props {
  kind: CatalogKind;
  item: CatalogItem | null;
  photo?: Photo;
  onOpenChange: (open: boolean) => void;
}

const row = (label: string, value: string | number | undefined, unit = "") =>
  value === undefined || value === "" ? null : (
    <div key={label} className="flex justify-between gap-4 border-b border-border/60 py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
        {unit && ` ${unit}`}
      </dd>
    </div>
  );

const KIND_TYPE = { robots: "robot", tools: "tool", axes: "axis" } as const;

const DirectoryItemDialog = ({ kind, item, photo, onOpenChange }: Props) => {
  if (!item) return <Dialog open={false} onOpenChange={onOpenChange} />;

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {item.id}
            </Badge>
            {(item.t || item.c) && <Badge variant="outline">{item.t || item.c}</Badge>}
            {item.ap?.includes("Collaborative") && <Badge variant="outline">Cobot</Badge>}
          </div>
          <DialogTitle className="text-xl">{item.n}</DialogTitle>
          <DialogDescription>Brand: {item.b}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          <figure>
            <div className="h-64 overflow-hidden rounded-lg border border-border">
              <ItemImage key={item.id} kind={kind} item={item} photo={photo} large />
            </div>
          </figure>

          <dl>
            {row("RobotVerse ID", item.id)}
            {row("Brand", item.b)}
            {row("Model", item.m)}
            {row(kind === "robots" ? "Robot type" : "Category", item.t || item.c)}
            {row(kind === "tools" ? "Moving axes" : "Axes", item.a)}
            {row("Payload", item.p, "kg")}
            {row(kind === "axes" ? "Stroke / reach" : "Reach", item.r, "mm")}
            {row("Repeatability", item.e, "mm")}
            {row("Weight", item.w, "kg")}
          </dl>
        </div>

        {item.ap && item.ap.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Applications</h3>
            <div className="flex flex-wrap gap-1.5">
              {item.ap.map((a) => (
                <Badge key={a} variant="secondary" className="font-normal">
                  {a}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {kind === "robots" && <RobotComponents robot={item} />}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button variant="outline" asChild>
            <Link to={`/directory/${KIND_TYPE[kind]}/${directorySlug(item.n)}`}>Full specifications page</Link>
          </Button>
          <Button asChild>
            <a href={enquiryMailto(item)}>
              <Mail className="mr-2 h-4 w-4" />
              Enquire about this
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={oemPhotoSearchUrl(item)} target="_blank" rel="noopener noreferrer">
              <ImageIcon className="mr-2 h-4 w-4" />
              Find OEM photos
            </a>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Specifications are indicative. Please confirm with the manufacturer before purchase.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default DirectoryItemDialog;
