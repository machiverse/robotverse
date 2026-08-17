import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, Search, Gavel, Trophy, Download, RefreshCw, ArrowLeft,
  Mail, MailCheck, MailX, MailWarning, ChevronRight, Eye,
} from "lucide-react";

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
  email_status?: "sent" | "failed" | "pending" | "none";
  email_types?: string[];
}

interface AuctionSummary {
  auction_id: string;
  auction_title: string;
  status: string;
  winner_id: string | null;
  current_highest_bid: number;
  bid_count: number;
  bidder_count: number;
  total_value: number;
  latest_bid_at: string;
}

const emailBadge = (s?: string) => {
  switch (s) {
    case "sent":
      return <Badge className="bg-success/15 text-success border-success/30 text-[10px]"><MailCheck className="w-3 h-3 mr-0.5" />Sent</Badge>;
    case "failed":
      return <Badge className="bg-red-500/15 text-red-500 border-red-500/30 text-[10px]"><MailX className="w-3 h-3 mr-0.5" />Failed</Badge>;
    case "pending":
      return <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px]"><MailWarning className="w-3 h-3 mr-0.5" />Pending</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] text-muted-foreground"><Mail className="w-3 h-3 mr-0.5" />None</Badge>;
  }
};

type SortKey = "created_at" | "bid_amount" | "bidder_name" | "auction_title" | "email_status";
type SortDir = "asc" | "desc";

const LS_KEY = "adminAllBids.prefs.v1";

const loadPrefs = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
};

export default function AdminAllBids() {
  const initial = loadPrefs();
  const [rows, setRows] = useState<BidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [auctionFilter, setAuctionFilter] = useState<string>("all");
  const [highestFilter, setHighestFilter] = useState<string>("all");
  const [emailFilter, setEmailFilter] = useState<string>("all");
  const [selectedAuction, setSelectedAuction] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>(initial.sortKey || "created_at");
  const [sortDir, setSortDir] = useState<SortDir>(initial.sortDir || "desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(initial.pageSize || 25);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ sortKey, sortDir, pageSize }));
    } catch {}
  }, [sortKey, sortDir, pageSize]);

  useEffect(() => { setPage(1); }, [q, auctionFilter, highestFilter, emailFilter, selectedAuction, sortKey, sortDir, pageSize]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir(k === "bid_amount" || k === "created_at" ? "desc" : "asc"); }
  };
  const sortIndicator = (k: SortKey) => sortKey === k ? (sortDir === "asc" ? " ▲" : " ▼") : "";


  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("auction_bids")
      .select("*, auction:auctions(auction_title, status, winner_id, current_highest_bid)")
      .order("created_at", { ascending: false })
      .limit(2000);
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

    // Fetch email log statuses per bid
    const bidIds = bids.map((b) => b.id);
    let emailMap: Record<string, { status: string; types: string[] }> = {};
    if (bidIds.length) {
      // chunk to keep URL size safe
      const chunk = 200;
      for (let i = 0; i < bidIds.length; i += chunk) {
        const slice = bidIds.slice(i, i + chunk);
        const { data: logs } = await supabase
          .from("bid_email_log")
          .select("bid_id, status, email_type")
          .in("bid_id", slice);
        (logs || []).forEach((l: any) => {
          const cur = emailMap[l.bid_id] || { status: "sent", types: [] };
          // precedence: failed > pending > sent
          const rank = (s: string) => (s === "failed" ? 3 : s === "pending" ? 2 : s === "sent" ? 1 : 0);
          const next = rank(l.status) > rank(cur.status) ? l.status : cur.status;
          const types = cur.types.includes(l.email_type) ? cur.types : [...cur.types, l.email_type];
          emailMap[l.bid_id] = { status: next, types };
        });
      }
    }

    setRows(bids.map((b) => ({
      ...b,
      profile: profileMap[b.bidder_id] || null,
      email_status: (emailMap[b.id]?.status as any) || "none",
      email_types: emailMap[b.id]?.types || [],
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Group into auctions for the list view
  const auctions: AuctionSummary[] = useMemo(() => {
    const map = new Map<string, AuctionSummary>();
    rows.forEach((r) => {
      const key = r.auction_id;
      if (!map.has(key)) {
        map.set(key, {
          auction_id: key,
          auction_title: r.auction?.auction_title || "(untitled)",
          status: r.auction?.status || "—",
          winner_id: r.auction?.winner_id || null,
          current_highest_bid: Number(r.auction?.current_highest_bid || 0),
          bid_count: 0,
          bidder_count: 0,
          total_value: 0,
          latest_bid_at: r.created_at,
        });
      }
      const s = map.get(key)!;
      s.bid_count += 1;
      s.total_value += Number(r.bid_amount || 0);
      if (new Date(r.created_at) > new Date(s.latest_bid_at)) s.latest_bid_at = r.created_at;
    });
    // compute unique bidders
    const bidders: Record<string, Set<string>> = {};
    rows.forEach((r) => {
      bidders[r.auction_id] = bidders[r.auction_id] || new Set();
      bidders[r.auction_id].add(r.bidder_id);
    });
    map.forEach((v, k) => { v.bidder_count = bidders[k]?.size || 0; });
    return [...map.values()].sort((a, b) => +new Date(b.latest_bid_at) - +new Date(a.latest_bid_at));
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (selectedAuction && r.auction_id !== selectedAuction) return false;
      if (auctionFilter !== "all" && r.auction_id !== auctionFilter) return false;
      if (highestFilter === "highest" && !r.is_winning_bid) return false;
      if (highestFilter === "outbid" && r.is_winning_bid) return false;
      if (highestFilter === "winner" && r.auction?.winner_id !== r.bidder_id) return false;
      if (emailFilter !== "all" && r.email_status !== emailFilter) return false;
      if (s) {
        const hay = [
          r.bidder_name, r.bidder_company, r.bidder_email, r.bidder_phone, r.bidder_location,
          r.profile?.full_name, r.profile?.company_name, r.profile?.email, r.profile?.phone, r.profile?.location,
          r.auction?.auction_title, String(r.bid_amount), r.auction_id, r.id,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, q, auctionFilter, highestFilter, emailFilter, selectedAuction]);

  // Sort per selected key/dir (drill-down still defaults to amount desc if user hasn't changed sort)
  const displayRows = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "bid_amount": av = Number(a.bid_amount); bv = Number(b.bid_amount); break;
        case "bidder_name": av = (a.bidder_name || a.profile?.full_name || "").toLowerCase(); bv = (b.bidder_name || b.profile?.full_name || "").toLowerCase(); break;
        case "auction_title": av = (a.auction?.auction_title || "").toLowerCase(); bv = (b.auction?.auction_title || "").toLowerCase(); break;
        case "email_status": av = a.email_status || ""; bv = b.email_status || ""; break;
        case "created_at":
        default: av = +new Date(a.created_at); bv = +new Date(b.created_at); break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(displayRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(
    () => displayRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [displayRows, currentPage, pageSize]
  );


  const exportCsv = () => {
    const header = ["Bid At","Auction","Auction ID","Bidder","Company","Email","Phone","Location","Amount (INR)","Auto Bid","Max Auto","Winner","Highest","Auction Status","Email Status","Email Types"];
    const lines = displayRows.map((r) => [
      new Date(r.created_at).toISOString(),
      r.auction?.auction_title || "",
      r.auction_id,
      r.bidder_name || r.profile?.full_name || "",
      r.bidder_company || r.profile?.company_name || "",
      r.bidder_email || r.profile?.email || "",
      r.bidder_phone || r.profile?.phone || "",
      r.bidder_location || r.profile?.location || "",
      r.bid_amount,
      r.is_auto_bid ? "Yes" : "No",
      r.max_auto_bid ?? "",
      r.auction?.winner_id === r.bidder_id ? "Yes" : "No",
      r.is_winning_bid ? "Yes" : "No",
      r.auction?.status || "",
      r.email_status || "none",
      (r.email_types || []).join("|"),
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

  const totalAmount = displayRows.reduce((sum, r) => sum + Number(r.bid_amount || 0), 0);
  const uniqueBidders = new Set(displayRows.map((r) => r.bidder_id)).size;
  const uniqueAuctions = new Set(displayRows.map((r) => r.auction_id)).size;

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  const currentAuction = selectedAuction ? auctions.find((a) => a.auction_id === selectedAuction) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gavel className="h-6 w-6 text-primary" />
            {selectedAuction ? "Auction Bids — Highest to Lowest" : "All Auction Bids"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {selectedAuction
              ? currentAuction?.auction_title
              : "Full monitoring of every bid placed on the platform — bidder identity, contact, amount, notification delivery."}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedAuction && (
            <Button variant="outline" size="sm" onClick={() => setSelectedAuction(null)}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to auctions
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!displayRows.length}><Download className="h-4 w-4 mr-1.5" /> Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Bids Shown</p><p className="text-2xl font-bold">{displayRows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Unique Bidders</p><p className="text-2xl font-bold">{uniqueBidders}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Auctions</p><p className="text-2xl font-bold">{uniqueAuctions}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Value</p><p className="text-2xl font-bold text-primary">Rs. {totalAmount.toLocaleString("en-IN")}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="relative md:col-span-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search bidder, email, auction ID, bid ID..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={auctionFilter} onValueChange={setAuctionFilter}>
          <SelectTrigger><SelectValue placeholder="Filter by auction" /></SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="all">All auctions</SelectItem>
            {auctions.map((a) => (
              <SelectItem key={a.auction_id} value={a.auction_id}>
                {a.auction_title.slice(0, 50)} ({a.bid_count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={highestFilter} onValueChange={setHighestFilter}>
          <SelectTrigger><SelectValue placeholder="Bid status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All bids</SelectItem>
            <SelectItem value="highest">Highest / winning bids only</SelectItem>
            <SelectItem value="outbid">Outbid only</SelectItem>
            <SelectItem value="winner">Declared winner</SelectItem>
          </SelectContent>
        </Select>
        <Select value={emailFilter} onValueChange={setEmailFilter}>
          <SelectTrigger><SelectValue placeholder="Notification status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All notifications</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="none">No email logged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Auctions overview list — hidden in drill-down */}
      {!selectedAuction && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <div className="px-4 py-2 border-b border-border/60 flex items-center justify-between">
              <p className="text-sm font-medium">Auctions with bids ({auctions.length})</p>
              <p className="text-xs text-muted-foreground">Click a row to view all bids highest → lowest</p>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Auction</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-right px-3 py-2 font-medium">Bids</th>
                  <th className="text-right px-3 py-2 font-medium">Bidders</th>
                  <th className="text-right px-3 py-2 font-medium">Highest Bid</th>
                  <th className="text-left px-3 py-2 font-medium">Latest</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {auctions.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No auction bids yet.</td></tr>
                ) : auctions.map((a) => (
                  <tr
                    key={a.auction_id}
                    className="border-t border-border/60 hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => setSelectedAuction(a.auction_id)}
                  >
                    <td className="px-3 py-2 max-w-[280px]">
                      <div className="font-medium text-foreground truncate">{a.auction_title}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{a.auction_id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px] uppercase">{a.status}</Badge></td>
                    <td className="px-3 py-2 text-right font-semibold">{a.bid_count}</td>
                    <td className="px-3 py-2 text-right">{a.bidder_count}</td>
                    <td className="px-3 py-2 text-right font-semibold text-primary whitespace-nowrap">Rs. {Number(a.current_highest_bid).toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{new Date(a.latest_bid_at).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Bids table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="px-4 py-2 border-b border-border/60 flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">
              {selectedAuction ? "All bids on this auction" : "All bids (filtered)"} — {displayRows.length}
            </p>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                {selectedAuction && <th className="text-left px-3 py-2 font-medium">Rank</th>}
                <th className="text-left px-3 py-2 font-medium cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("created_at")}>Bid At{sortIndicator("created_at")}</th>
                {!selectedAuction && <th className="text-left px-3 py-2 font-medium cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("auction_title")}>Auction{sortIndicator("auction_title")}</th>}
                <th className="text-left px-3 py-2 font-medium cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("bidder_name")}>Bidder{sortIndicator("bidder_name")}</th>
                <th className="text-left px-3 py-2 font-medium">Company</th>
                <th className="text-left px-3 py-2 font-medium">Contact</th>
                <th className="text-left px-3 py-2 font-medium">Location</th>
                <th className="text-right px-3 py-2 font-medium cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("bid_amount")}>Amount{sortIndicator("bid_amount")}</th>
                <th className="text-left px-3 py-2 font-medium cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("email_status")}>Notification{sortIndicator("email_status")}</th>
                <th className="text-left px-3 py-2 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr><td colSpan={selectedAuction ? 9 : 9} className="px-3 py-8 text-center text-muted-foreground">No bids match the current filters.</td></tr>
              ) : pagedRows.map((r, idx) => {
                const name = r.bidder_name || r.profile?.full_name || "Unknown";
                const company = r.bidder_company || r.profile?.company_name || "—";
                const email = r.bidder_email || r.profile?.email || "";
                const phone = r.bidder_phone || r.profile?.phone || "";
                const loc = r.bidder_location || r.profile?.location || "—";
                const isWinner = r.auction?.winner_id === r.bidder_id;
                const globalIdx = (currentPage - 1) * pageSize + idx;
                return (
                  <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30">
                    {selectedAuction && (
                      <td className="px-3 py-2 font-semibold text-muted-foreground">#{globalIdx + 1}</td>
                    )}
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>

                    {!selectedAuction && (
                      <td className="px-3 py-2 max-w-[220px]">
                        <button
                          className="truncate text-left text-foreground hover:text-primary hover:underline"
                          onClick={() => setSelectedAuction(r.auction_id)}
                          title={r.auction?.auction_title || ""}
                        >
                          {r.auction?.auction_title || "—"}
                        </button>
                      </td>
                    )}
                    <td className="px-3 py-2 font-medium text-foreground">{name}</td>
                    <td className="px-3 py-2">{company}</td>
                    <td className="px-3 py-2">
                      <div>{email || <span className="text-muted-foreground">no email</span>}</div>
                      <div className="text-muted-foreground">{phone || "—"}</div>
                    </td>
                    <td className="px-3 py-2">{loc}</td>
                    <td className="px-3 py-2 text-right font-semibold text-primary whitespace-nowrap">Rs. {Number(r.bid_amount).toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        {emailBadge(r.email_status)}
                        {(r.email_types || []).length > 0 && (
                          <span className="text-[10px] text-muted-foreground">{r.email_types!.join(", ")}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {isWinner && <Badge className="bg-success/20 text-success border-success/30 text-[10px]"><Trophy className="w-3 h-3 mr-0.5" />Winner</Badge>}
                        {r.is_winning_bid && !isWinner && <Badge variant="outline" className="text-[10px]">Highest</Badge>}
                        {r.is_auto_bid && <Badge variant="secondary" className="text-[10px]">Auto</Badge>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-border/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Rows per page</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100, 200].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">
                {displayRows.length === 0 ? "0" : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, displayRows.length)}`} of {displayRows.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(1)}>« First</Button>
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Prev</Button>
              <span className="px-2 text-muted-foreground">Page {currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next</Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}>Last »</Button>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
