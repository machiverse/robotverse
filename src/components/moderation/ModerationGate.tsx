import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Reads the caller's OWN restriction status through the `my_moderation_status`
 * view (which exposes only action / reason_code / dates / appeal fields —
 * never reason_notes or evidence_urls) and routes restricted users to
 * /account-status. Additive: returns null and never blocks rendering.
 */
export interface MyModerationStatus {
  case_id: string;
  action: "warning" | "suspension" | "permanent_block" | "reinstated";
  reason_code: string | null;
  suspension_until: string | null;
  appeal_status: "none" | "submitted" | "under_review" | "upheld" | "overturned";
  appeal_submitted_at: string | null;
  appeal_decided_at: string | null;
  actioned_at: string;
}

export const isRestricting = (r: MyModerationStatus) =>
  r.action === "permanent_block" ||
  (r.action === "suspension" && (!r.suspension_until || new Date(r.suspension_until) > new Date()));

export function useMyModerationStatus() {
  const { user } = useAuth();
  return useQuery<MyModerationStatus[]>({
    queryKey: ["my-moderation-status", user?.id],
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("my_moderation_status")
        .select("case_id, action, reason_code, suspension_until, appeal_status, appeal_submitted_at, appeal_decided_at, actioned_at")
        .order("actioned_at", { ascending: false });
      if (error) return [];
      return (data as MyModerationStatus[]) ?? [];
    },
  });
}

const EXEMPT_PREFIXES = ["/account-status", "/auth", "/reset-password"];

const ModerationGate: React.FC = () => {
  const { user } = useAuth();
  const { data } = useMyModerationStatus();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !data?.length) return;
    const restricted = data.some(isRestricting);
    if (!restricted) return;
    if (EXEMPT_PREFIXES.some((p) => location.pathname.startsWith(p))) return;
    navigate("/account-status", { replace: true });
  }, [user, data, location.pathname, navigate]);

  return null;
};

export default ModerationGate;
