import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Search, Gavel, Trophy, Download, RefreshCw } from "lucide-react";

interface BidRow {
  id: string;
  auction_id: string;
  bidder_id: string;
  bid_amount: number;
  is_winning_bid: boolean;
  is_auto_bid: boolean;
  max_auto_bid: number | null;
  created_at: string;
  bidder_name: string | null;
  bidder_company: string | null;
  bidder_email: string | null;
  bidder_phone: string | null;
  bidder_location: string | null;
  auction?: {
    auction_title: string;
    status: string;
    winner_id: string | null;
    current_highest_bid: number;
  } | null;
  profile?: {
    full_name: string | null;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
  } | null;
}

export default function AdminAllBids() {
  const [rows, setRows] = useState<BidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("auction_bids")
      .select("*, auction:auctions(auction_title, status, winner_id, current_highest_bid)")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      toast({ title: "Failed to load bids", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const bids = (data || []) as any[];
    const ids = [...new Set(bids.map((b) => b.bidder_id))];
    let profileMap: Record<string, any> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, company_name, email, phone, location")
        .in("user_id", ids);
      (profs || []).forEach((p: any) => { profileMap[p.user_id] = p; });
    }
    setRows(bids.map((b) => ({ ...b, profile: profileMap[b.bidder_id] || null })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const hay = [
        r.bidder_name, r.bidder_company, r.bidder_email, r.bidder_phone, r.bidder_location,
        r.profile?.full_name, r.profile?.company_name, r.profile?.email, r.profile?.phone, r.profile?.location,
        r.auction?.auction_title, String(r.bid_amount),
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  const exportCsv = () => {
    const header = ["Bid At","Auction","Bidder","Company","Email","Phone","Location","Amount (INR)","Auto Bid","Max Auto","Winner","Auction Status"];
    const lines = filtered.map((r) => [
      new Date(r.created_at).toISOString(),
      r.auction?.auction_title || "",
      r.bidder_name || r.profile?.full_name || "",
      r.bidder_company || r.profile?.company_name || "",
      r.bidder_email || r.profile?.email || "",
      r.bidder_phone || r.profile?.phone || "",
      r.bidder_location || r.profile?.location || "",
      r.bid_amount,
      r.is_auto_bid ? "Yes" : "No",
      r.max_auto_bid ?? "",
      r.auction?.winner_id === r.bidder_id ? "Yes" : "No",
      r.auction?.status || "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auction-bids-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalAmount = filtered.reduce((sum, r) => sum + Number(r.bid_amount || 0), 0);
  const uniqueBidders = new Set(filtered.map((r) => r.bidder_id)).size;
  const uniqueAuctions = new Set(filtered.map((r) => r.auction_id)).size;

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Gavel className="h-6 w-6 text-primary" /> All Auction Bids</h2>
          <p className="text-sm text-muted-foreground">Full monitoring of every bid placed on the platform — bidder identity, contact, amount and auction context.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}><Download className="h-4 w-4 mr-1.5" /> Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Bids</p><p className="text-2xl font-bold">{filtered.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Unique Bidders</p><p className="text-2xl font-bold">{uniqueBidders}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Auctions</p><p className="text-2xl font-bold">{uniqueAuctions}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Value</p><p className="text-2xl font-bold text-primary">Rs. {totalAmount.toLocaleString("en-IN")}</p></CardContent></Card>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by bidder, company, email, phone, auction..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Bid At</th>
                <th className="text-left px-3 py-2 font-medium">Auction</th>
                <th className="text-left px-3 py-2 font-medium">Bidder</th>
                <th className="text-left px-3 py-2 font-medium">Company</th>
                <th className="text-left px-3 py-2 font-medium">Contact</th>
                <th className="text-left px-3 py-2 font-medium">Location</th>
                <th className="text-right px-3 py-2 font-medium">Amount</th>
                <th className="text-left px-3 py-2 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No bids found.</td></tr>
              ) : filtered.map((r) => {
                const name = r.bidder_name || r.profile?.full_name || "Unknown";
                const company = r.bidder_company || r.profile?.company_name || "—";
                const email = r.bidder_email || r.profile?.email || "";
                const phone = r.bidder_phone || r.profile?.phone || "";
                const loc = r.bidder_location || r.profile?.location || "—";
                const isWinner = r.auction?.winner_id === r.bidder_id;
                return (
                  <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 max-w-[220px] truncate" title={r.auction?.auction_title || ""}>{r.auction?.auction_title || "—"}</td>
                    <td className="px-3 py-2 font-medium text-foreground">{name}</td>
                    <td className="px-3 py-2">{company}</td>
                    <td className="px-3 py-2">
                      <div>{email || <span className="text-muted-foreground">no email</span>}</div>
                      <div className="text-muted-foreground">{phone || "—"}</div>
                    </td>
                    <td className="px-3 py-2">{loc}</td>
                    <td className="px-3 py-2 text-right font-semibold text-primary whitespace-nowrap">Rs. {Number(r.bid_amount).toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {isWinner && <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[10px]"><Trophy className="w-3 h-3 mr-0.5" />Winner</Badge>}
                        {r.is_winning_bid && !isWinner && <Badge variant="outline" className="text-[10px]">Highest</Badge>}
                        {r.is_auto_bid && <Badge variant="secondary" className="text-[10px]">Auto</Badge>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
