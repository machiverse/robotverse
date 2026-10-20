import { useState, type ReactNode } from "react";
import { Bell, IndianRupee, Mail, Tag } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import LeadDialog from "@/components/leads/LeadDialog";
import type { LeadKind } from "../../../supabase/functions/_shared/leads";
import type { CatalogItem, CatalogKind } from "./directoryTypes";

type DirectoryLead = Extract<LeadKind, "enquiry" | "notify" | "used_price" | "sell" | "datasheet" | "training" | "parts">;

const COPY: Record<DirectoryLead, { label: string; title: (n: string) => string; intro: string; icon: ReactNode; share: boolean; action: string }> = {
  enquiry: { label: "Enquire", title: (n) => `Enquire about the ${n}`, intro: "Tell us what you need — price, availability, a used or new unit — and we reply on WhatsApp.", icon: <Mail className="mr-1.5 h-4 w-4" />, share: true, action: "Send enquiry" },
  notify: { label: "Notify me when available", title: (n) => `Notify me when a ${n} is available`, intro: "We tell you on WhatsApp when this model is listed, used or new.", icon: <Bell className="mr-1.5 h-4 w-4" />, share: true, action: "Notify me" },
  used_price: { label: "Get a used price", title: (n) => `Used price for the ${n}`, intro: "We check recent listings and dealers and send you a used price range for this model.", icon: <IndianRupee className="mr-1.5 h-4 w-4" />, share: true, action: "Get a price" },
  sell: { label: "Sell this model", title: (n) => `Sell your ${n}`, intro: "Tell us about your robot (year, controller, hours, condition). We help you list, consign or auction it.", icon: <Tag className="mr-1.5 h-4 w-4" />, share: false, action: "Send details" },
  datasheet: { label: "Request the datasheet", title: (n) => `Datasheet for the ${n}`, intro: "We do not have the maker's datasheet on file yet. We will find it and send it to you.", icon: <Mail className="mr-1.5 h-4 w-4" />, share: false, action: "Request datasheet" },
  training: { label: "List your training", title: () => "List your training on RobotVerse", intro: "Tell us about your course, program or workshop and we list it in the Directory.", icon: <Mail className="mr-1.5 h-4 w-4" />, share: false, action: "Send details" },
  parts: { label: "Enquire", title: (n) => `Enquire about ${n}`, intro: "Tell us the part, quantity and robot it is for, and we reply on WhatsApp.", icon: <Mail className="mr-1.5 h-4 w-4" />, share: false, action: "Send enquiry" },
};

const TYPE: Record<CatalogKind, string> = { robots: "robot", tools: "tool", axes: "axis" };

export interface DirectoryLeadButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  lead: DirectoryLead;
  /** The Directory model the request is about, if any. */
  catalog?: CatalogKind;
  item?: CatalogItem;
  /** A name when there is no catalogue item (a part, a training program, a general requirement). */
  subject?: string;
  label?: string;
  title?: string;
  intro?: string;
  defaultMessage?: string;
  /** Keep the click from reaching a clickable card behind the button. */
  stopPropagation?: boolean;
}

/** A Directory button that opens the enquiry form; the request is saved in the CRM. */
export default function DirectoryLeadButton({ lead, catalog, item, subject, label, title, intro, defaultMessage, stopPropagation, ...button }: DirectoryLeadButtonProps) {
  const [open, setOpen] = useState(false);
  const copy = COPY[lead];
  const name = item?.n ?? subject ?? "this";
  return (
    <>
      <Button
        {...button}
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          setOpen(true);
        }}
      >
        {copy.icon}
        {label ?? copy.label}
      </Button>
      <span onClick={(e) => stopPropagation && e.stopPropagation()}>
        <LeadDialog
          open={open}
          onOpenChange={setOpen}
          kind={lead}
          source={`directory-${catalog ?? lead}`}
          title={title ?? copy.title(name)}
          intro={intro ?? copy.intro}
          item={item ? { type: catalog ? TYPE[catalog] : undefined, id: item.id, name: item.n, brand: item.b, model: item.m } : subject ? { name: subject } : undefined}
          details={
            item
              ? { type: item.t ?? item.c, payloadKg: item.p, reachMm: item.r, axes: item.a, repeatabilityMm: item.e, applications: item.ap ?? [] }
              : undefined
          }
          canShare={copy.share && catalog === "robots"}
          defaultMessage={defaultMessage}
          action={copy.action}
        />
      </span>
    </>
  );
}
