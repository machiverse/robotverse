import React, { useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, Clock, FileText, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMyModerationStatus, isRestricting, type MyModerationStatus } from "@/components/moderation/ModerationGate";

const APPEAL_WINDOW_DAYS = 14;
const caseRef = (id: string) => `RV-${id.slice(0, 8).toUpperCase()}`;
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

const actionLabel: Record<MyModerationStatus["action"], string> = {
  warning: "Notice issued",
  suspension: "Account suspended",
  permanent_block: "Account permanently closed",
  reinstated: "Account reinstated",
};

const appealLabel: Record<MyModerationStatus["appeal_status"], string> = {
  none: "No appeal submitted",
  submitted: "Appeal submitted — awaiting review",
  under_review: "Appeal under review",
  upheld: "Appeal reviewed — original decision upheld",
  overturned: "Appeal reviewed — decision overturned",
};

/**
 * Blocked / suspended user status page.
 * Data source: `my_moderation_status` view only. This page never receives
 * reason_notes or evidence_urls — they are not selectable by non-admins.
 */
const AccountStatus: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const { data, isLoading } = useMyModerationStatus();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [appealText, setAppealText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: reasons } = useQuery({
    queryKey: ["block-reasons-labels"],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase as any).from("block_reasons").select("code, label");
      return (data ?? []) as { code: string; label: string }[];
    },
  });
  const reasonLabel = (code: string | null) => reasons?.find((r) => r.code === code)?.label ?? "Platform policy";

  const primary = useMemo(() => {
    if (!data?.length) return null;
    return data.find(isRestricting) ?? data[0];
  }, [data]);

  if (loading || (user && isLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Skeleton className="h-64 w-full max-w-xl" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!primary) return <Navigate to="/" replace />;

  const daysSince = (Date.now() - new Date(primary.actioned_at).getTime()) / 86400000;
  const canAppeal = primary.appeal_status === "none" && daysSince <= APPEAL_WINDOW_DAYS && primary.action !== "reinstated";
  const restricted = isRestricting(primary);

  const submitAppeal = async () => {
    if (appealText.trim().length < 20) {
      toast({ title: "Please add more detail", description: "Your appeal needs at least 20 characters.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any).rpc("submit_moderation_appeal", { _case_id: primary.case_id, _appeal_text: appealText.trim() });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not submit appeal", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Appeal submitted", description: "A team member not involved in the original decision will review it." });
    setAppealText("");
    qc.invalidateQueries({ queryKey: ["my-moderation-status"] });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-xl border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2.5">
              {restricted ? <ShieldAlert className="h-5 w-5 text-foreground" /> : <FileText className="h-5 w-5 text-foreground" />}
            </div>
            <div>
              <CardTitle className="text-xl">{actionLabel[primary.action]}</CardTitle>
              <CardDescription>Signed in as {user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Reason</dt>
              <dd className="font-medium">{reasonLabel(primary.reason_code)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Case reference</dt>
              <dd className="font-medium tabular-nums">{caseRef(primary.case_id)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Date of decision</dt>
              <dd className="font-medium">{fmt(primary.actioned_at)}</dd>
            </div>
            {primary.action === "suspension" && primary.suspension_until && (
              <div>
                <dt className="text-muted-foreground">Suspended until</dt>
                <dd className="font-medium flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{fmt(primary.suspension_until)}</dd>
              </div>
            )}
          </dl>

          <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Appeal status</span>
              <Badge variant="outline">{appealLabel[primary.appeal_status]}</Badge>
            </div>
            {primary.appeal_submitted_at && (
              <p className="text-xs text-muted-foreground">Submitted {fmt(primary.appeal_submitted_at)}</p>
            )}
            {primary.appeal_decided_at && (
              <p className="text-xs text-muted-foreground">Decided {fmt(primary.appeal_decided_at)}</p>
            )}
          </div>

          {primary.action === "permanent_block" && (
            <p className="text-sm text-muted-foreground">
              Your account and listings are no longer accessible, and any active enquiries or quotes have been closed.
            </p>
          )}
          {primary.action === "suspension" && (
            <p className="text-sm text-muted-foreground">
              Access will be restored automatically on the date above provided no further issues arise.
            </p>
          )}

          {canAppeal ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Submit an appeal</h3>
              <p className="text-xs text-muted-foreground">
                You may appeal within {APPEAL_WINDOW_DAYS} days of the decision. Appeals are reviewed by a member of our team who was not involved in the original decision.
              </p>
              <Textarea
                value={appealText}
                onChange={(e) => setAppealText(e.target.value)}
                rows={5}
                maxLength={4000}
                placeholder="Explain why you believe this decision should be reviewed, and include any supporting information."
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground tabular-nums">{appealText.trim().length} / 4000</span>
                <Button onClick={submitAppeal} disabled={submitting || appealText.trim().length < 20}>
                  {submitting ? "Submitting…" : "Submit appeal"}
                </Button>
              </div>
            </div>
          ) : primary.appeal_status === "none" && primary.action !== "reinstated" ? (
            <p className="text-xs text-muted-foreground">
              The {APPEAL_WINDOW_DAYS}-day appeal window for this case has closed. You can still write to support@robotverse.in quoting your case reference.
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Data held about your account is handled in accordance with our <Link to="/privacy" className="underline">Privacy Policy</Link>. Questions: support@robotverse.in
          </p>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountStatus;
