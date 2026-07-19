import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Mail } from "lucide-react";

interface Row {
  id: string;
  auction_title: string;
  status: string;
  admin_status: string | null;
  winner_id: string | null;
  current_highest_bid: number;
  end_time: string;
  seller_id: string;
}

const PLATFORM_FEE_PCT = 5;
const GST_PCT = 18;

export default function AdminAuctionWinners() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("auctions")
      .select("id, auction_title, status, admin_status, winner_id, current_highest_bid, end_time, seller_id")
      .not("winner_id", "is", null)
      .order("end_time", { ascending: false });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke("send-auction-winner-notification", {
        body: { auction_id: id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Winner approved", description: "Notification email sent to support & winner." });
      load();
    } catch (e: any) {
      toast({ title: "Approval failed", description: e.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Auction Winners</h2>
        <p className="text-sm text-muted-foreground">
          Approve auction winners. On approval, an email with full details, payment + {PLATFORM_FEE_PCT}% platform fee + {GST_PCT}% GST and terms is sent to support@robotverse.in and the winner.
        </p>
      </div>
      {rows.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No auctions with winners yet.</CardContent></Card>
      )}
      {rows.map((a) => {
        const win = Number(a.current_highest_bid || 0);
        const fee = +(win * PLATFORM_FEE_PCT / 100).toFixed(2);
        const gst = +(fee * GST_PCT / 100).toFixed(2);
        const total = win + fee + gst;
        const approved = a.admin_status === "winner_approved";
        return (
          <Card key={a.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">{a.auction_title}</CardTitle>
                <p className="text-xs text-muted-foreground">Ended: {new Date(a.end_time).toLocaleString()}</p>
              </div>
              {approved
                ? <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>
                : <Badge variant="secondary">Pending</Badge>}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Winning Bid</p><p className="font-semibold">Rs. {win.toLocaleString("en-IN")}</p></div>
                <div><p className="text-xs text-muted-foreground">Platform Fee</p><p className="font-semibold">Rs. {fee.toLocaleString("en-IN")}</p></div>
                <div><p className="text-xs text-muted-foreground">GST</p><p className="font-semibold">Rs. {gst.toLocaleString("en-IN")}</p></div>
                <div><p className="text-xs text-muted-foreground">Total Payable</p><p className="font-semibold text-primary">Rs. {total.toLocaleString("en-IN")}</p></div>
              </div>
              <Button onClick={() => approve(a.id)} disabled={busyId === a.id} size="sm">
                {busyId === a.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                {approved ? "Resend Winner Email" : "Approve & Notify"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
