import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, Building2, Receipt, Handshake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Public trust signals — POSITIVE, FACTUAL ONLY.
 * Reads from `user_trust`. Renders nothing for unverified users.
 * Never renders warnings, flags, blocked status or any negative indicator.
 *
 * Colour rule: OEM manufacturer colours are shape-only (rails/dots) and are
 * NOT used behind badge text; badges use semantic shadcn variants.
 */
export interface UserTrust {
  user_id: string;
  kyc_verified: boolean;
  gst_verified: boolean;
  company_verified: boolean;
  completed_transactions: number;
  trust_tier: "unverified" | "basic" | "verified" | "premium";
}

export function useUserTrust(userId?: string | null) {
  return useQuery<UserTrust | null>({
    queryKey: ["user-trust", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await (supabase as any)
        .from("user_trust")
        .select("user_id, kyc_verified, gst_verified, company_verified, completed_transactions, trust_tier")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return null;
      return (data as UserTrust) ?? null;
    },
  });
}

export function hasAnyTrustSignal(t?: UserTrust | null): boolean {
  if (!t) return false;
  return !!(t.kyc_verified || t.gst_verified || t.company_verified || (t.completed_transactions ?? 0) > 0);
}

interface TrustBadgesProps {
  userId?: string | null;
  /** compact = icon-only pills sized for listing cards */
  compact?: boolean;
  className?: string;
}

const TrustBadges: React.FC<TrustBadgesProps> = ({ userId, compact = false, className }) => {
  const { data } = useUserTrust(userId);
  if (!hasAnyTrustSignal(data)) return null;
  const t = data!;

  const pill = (icon: React.ReactNode, label: string, title: string) => (
    <Badge
      key={label}
      variant="secondary"
      title={title}
      className={cn("gap-1 font-medium whitespace-nowrap", compact ? "px-1.5 py-0 text-[10px] h-5" : "text-xs")}
    >
      {icon}
      {compact ? null : <span>{label}</span>}
      {compact && label.match(/^\d/) ? <span>{label}</span> : null}
    </Badge>
  );

  const ic = compact ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} aria-label="Verification signals">
      {t.company_verified && pill(<Building2 className={ic} />, "Verified Company", "Company registration verified by RobotVerse")}
      {t.gst_verified && pill(<Receipt className={ic} />, "GST Verified", "GST registration verified by RobotVerse")}
      {t.kyc_verified && pill(<BadgeCheck className={ic} />, "KYC Verified", "Identity verified by RobotVerse")}
      {(t.completed_transactions ?? 0) > 0 &&
        pill(
          <Handshake className={ic} />,
          compact ? `${t.completed_transactions}` : `${t.completed_transactions} completed transaction${t.completed_transactions === 1 ? "" : "s"}`,
          "Transactions completed on RobotVerse",
        )}
    </div>
  );
};

export default TrustBadges;
