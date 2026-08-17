import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Mail, ChevronDown, ChevronUp, Users, Trophy } from "lucide-react";

interface Row {
  id: string;
  auction_title: string;
  status: string;
  admin_status: string | null;
  winner_id: string | null;
  current_highest_bid: number;
  end_time: string;
  seller_id: string;
  total_bids?: number;
}

interface BidRow {
  id: string;
  bidder_id: string;
  bid_amount: number;
  is_winning_bid: boolean;
  is_auto_bid: boolean;
  created_at: string;
  profile?: {
    full_name: string | null;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
  } | null;
}

const PLATFORM_FEE_PCT = 5;
const GST_PCT = 18;

function BiddersList({ auctionId, winnerId }: { auctionId: string; winnerId: string | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bids, setBids] = useState<BidRow[]>([]);

  const load = async () => {
    setLoading(true);
    const { data: bidRows, error } = await supabase
      .from("auction_bids")
      .select("*")
      .eq("auction_id", auctionId)
      .order("bid_amount", { ascending: false });
    if (error) {
      toast({ title: "Failed to load bids", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const ids = [...new Set((bidRows || []).map((b: any) => b.bidder_id))];
    let profileMap: Record<string, any> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, company_name, email, phone, location")
        .in("user_id", ids);
      (profs || []).forEach((p: any) => { profileMap[p.user_id] = p; });
    }
    setBids((bidRows || []).map((b: any) => ({ ...b, profile: profileMap[b.bidder_id] || null })));
    setLoading(false);
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && bids.length === 0) load();
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/60">
      <Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2 text-xs" onClick={toggle}>
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-primary" /> Bidder details
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </Button>
      {open && (
        <div className="mt-2 space-y-2">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
          ) : bids.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No bids placed.</p>
          ) : (
            bids.map((b, i) => {
              const isWinner = b.bidder_id === winnerId;
              return (
                <div key={b.id} className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-foreground truncate">
                        {b.profile?.full_name || "Unknown bidder"}
                      </span>
                      {isWinner && (
                        <Badge className="bg-success/20 text-success border-success/30/30 text-[10px]">
                          <Trophy className="w-3 h-3 mr-0.5" /> Winner
                        </Badge>
                      )}
                      {i === 0 && !isWinner && (
                        <Badge variant="outline" className="text-[10px]">Highest</Badge>
                      )}
                      {b.is_auto_bid && <Badge variant="secondary" className="text-[10px]">Auto</Badge>}
                    </div>
                    <span className="font-semibold text-primary whitespace-nowrap">
                      Rs. {Number(b.bid_amount).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
                    {b.profile?.company_name && <div><span className="text-foreground/70">Company:</span> {b.profile.company_name}</div>}
                    {b.profile?.email && <div><span className="text-foreground/70">Email:</span> {b.profile.email}</div>}
                    {b.profile?.phone && <div><span className="text-foreground/70">Phone:</span> {b.profile.phone}</div>}
                    {b.profile?.location && <div><span className="text-foreground/70">Location:</span> {b.profile.location}</div>}
                    <div className="sm:col-span-2"><span className="text-foreground/70">Bid at:</span> {new Date(b.created_at).toLocaleString()}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminAuctionWinners() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("auctions")
      .select("id, auction_title, status, admin_status, winner_id, current_highest_bid, end_time, seller_id, total_bids")
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
                <p className="text-xs text-muted-foreground">Ended: {new Date(a.end_time).toLocaleString()} · {a.total_bids ?? 0} bids</p>
              </div>
              {approved
                ? <Badge className="bg-success/15 text-success border-success/30/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>
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
              <BiddersList auctionId={a.id} winnerId={a.winner_id} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
