import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORT_EMAIL = "support@robotverse.in";
const AUCTIONS_URL = "https://robotverse.in/auctions";

const fmtInr = (n: number) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;

function timeRemaining(endIso: string): string {
  const ms = new Date(endIso).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${d}d ${h}h ${m}m`;
}

function confirmationHtml(o: {
  bidderName: string;
  robotName: string;
  auctionId: string;
  bidAmount: number;
  bidTime: string;
  endTime: string;
  timeLeft: string;
  auctionUrl: string;
}) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#f9fafb;padding:24px">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.05)">
      <div style="background:linear-gradient(135deg,#059669,#047857);color:#fff;padding:24px">
        <h1 style="margin:0;font-size:22px">Your Bid Has Been Successfully Placed</h1>
      </div>
      <div style="padding:24px;color:#111827;font-size:14px;line-height:1.6">
        <p>Hi ${o.bidderName || "Bidder"},</p>
        <p>Congratulations — you are currently the highest bidder on <strong>${o.robotName}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Robot</strong></td><td style="padding:8px">${o.robotName}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Auction ID</strong></td><td style="padding:8px">${o.auctionId}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Current Highest Bid</strong></td><td style="padding:8px;color:#059669;font-weight:bold">${fmtInr(o.bidAmount)}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Bid Time</strong></td><td style="padding:8px">${o.bidTime}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Auction Ends</strong></td><td style="padding:8px">${o.endTime}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Time Remaining</strong></td><td style="padding:8px">${o.timeLeft}</td></tr>
        </table>
        <div style="text-align:center;margin:24px 0">
          <a href="${o.auctionUrl}" style="background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">View Auction</a>
        </div>
        <p style="color:#6b7280;font-size:12px">Stay tuned — other participants may place higher bids before the auction ends.</p>
      </div>
    </div>
  </div>`;
}

function outbidHtml(o: {
  bidderName: string;
  robotName: string;
  highestBid: number;
  previousBid: number;
  endTime: string;
  timeLeft: string;
}) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#f9fafb;padding:24px">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.05)">
      <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;padding:24px">
        <h1 style="margin:0;font-size:22px">You've Been Outbid — Increase Your Bid</h1>
      </div>
      <div style="padding:24px;color:#111827;font-size:14px;line-height:1.6">
        <p>Hi ${o.bidderName || "Bidder"},</p>
        <p>Another participant has placed a higher bid than yours on <strong>${o.robotName}</strong>. Increase your bid now to stay in the lead before the auction ends.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Robot</strong></td><td style="padding:8px">${o.robotName}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Your Previous Bid</strong></td><td style="padding:8px">${fmtInr(o.previousBid)}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Current Highest Bid</strong></td><td style="padding:8px;color:#dc2626;font-weight:bold">${fmtInr(o.highestBid)}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Auction Ends</strong></td><td style="padding:8px">${o.endTime}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Time Remaining</strong></td><td style="padding:8px">${o.timeLeft}</td></tr>
        </table>
        <div style="text-align:center;margin:24px 0">
          <a href="${AUCTIONS_URL}" style="background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Increase My Bid</a>
        </div>
        <p style="color:#6b7280;font-size:12px">Don't miss out — the auction is still live.</p>
      </div>
    </div>
  </div>`;
}

async function sendEmail(client: SMTPClient, from: string, to: string, subject: string, html: string) {
  await client.send({
    from,
    to,
    subject,
    content: "auto",
    html,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const { bid_id, auction_id } = await req.json();
    if (!bid_id || !auction_id) {
      return new Response(JSON.stringify({ error: "bid_id and auction_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the new bid
    const { data: newBid, error: bErr } = await admin
      .from("auction_bids")
      .select("*")
      .eq("id", bid_id)
      .single();
    if (bErr || !newBid) throw new Error(bErr?.message || "Bid not found");

    // Fetch auction with robot
    const { data: auction, error: aErr } = await admin
      .from("auctions")
      .select("*, robots(name, model, brand)")
      .eq("id", auction_id)
      .single();
    if (aErr || !auction) throw new Error(aErr?.message || "Auction not found");

    // Confirm this bid is the current highest
    if (Number(newBid.bid_amount) < Number(auction.current_highest_bid || 0)) {
      return new Response(JSON.stringify({ skipped: "not_highest" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const robotName =
      [auction.robots?.brand, auction.robots?.name, auction.robots?.model].filter(Boolean).join(" ") ||
      auction.auction_title;
    const endIso = auction.end_time;
    const endHuman = new Date(endIso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const bidHuman = new Date(newBid.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const timeLeft = timeRemaining(endIso);
    const auctionUrl = `${AUCTIONS_URL}/${auction.id}`;
    const highest = Number(newBid.bid_amount);

    // Resolve winner email (fallback to auth)
    let winnerEmail = newBid.bidder_email as string | null;
    if (!winnerEmail) {
      const { data: authUser } = await admin.auth.admin.getUserById(newBid.bidder_id);
      winnerEmail = authUser?.user?.email || null;
    }

    // Fetch previous bidders (distinct, excluding new highest bidder)
    const { data: prevBids } = await admin
      .from("auction_bids")
      .select("bidder_id, bid_amount, bidder_email, bidder_name, created_at")
      .eq("auction_id", auction_id)
      .neq("bidder_id", newBid.bidder_id)
      .order("bid_amount", { ascending: false });

    const outbidMap = new Map<string, { email: string | null; name: string | null; prevBid: number }>();
    for (const b of prevBids || []) {
      if (!outbidMap.has(b.bidder_id)) {
        outbidMap.set(b.bidder_id, {
          email: (b as any).bidder_email,
          name: (b as any).bidder_name,
          prevBid: Number(b.bid_amount),
        });
      }
    }

    // Fill missing emails from auth
    for (const [uid, info] of outbidMap) {
      if (!info.email) {
        const { data: authUser } = await admin.auth.admin.getUserById(uid);
        info.email = authUser?.user?.email || null;
      }
    }

    // SMTP setup
    const smtpHost = Deno.env.get("SMTP_HOST") || "";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER") || "";
    const smtpPass = Deno.env.get("SMTP_PASS") || "";
    const smtpFrom = Deno.env.get("SMTP_FROM") || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) throw new Error("SMTP credentials not configured");

    const doSend = async () => {
      const client = new SmtpClient();
      await client.connectTLS({ hostname: smtpHost, port: smtpPort, username: smtpUser, password: smtpPass });

      // Confirmation email
      if (winnerEmail) {
        const subject = "Your Bid Has Been Successfully Placed";
        const html = confirmationHtml({
          bidderName: newBid.bidder_name || "Bidder",
          robotName,
          auctionId: auction.id,
          bidAmount: highest,
          bidTime: bidHuman,
          endTime: endHuman,
          timeLeft,
          auctionUrl,
        });
        const { data: logRow } = await admin
          .from("bid_email_log")
          .insert({
            auction_id,
            bid_id,
            recipient_user_id: newBid.bidder_id,
            recipient_email: winnerEmail,
            email_type: "bid_confirmation",
            subject,
            bid_amount: highest,
            highest_bid_amount: highest,
          })
          .select("id")
          .single();
        try {
          await sendEmail(client, smtpFrom, winnerEmail, subject, html);
          if (logRow) await admin.from("bid_email_log").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", logRow.id);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (logRow) await admin.from("bid_email_log").update({ status: "failed", error_message: msg }).eq("id", logRow.id);
        }
      }

      // Outbid emails
      for (const [uid, info] of outbidMap) {
        if (!info.email) continue;
        const subject = "You've Been Outbid - Increase Your Bid";
        const html = outbidHtml({
          bidderName: info.name || "Bidder",
          robotName,
          highestBid: highest,
          previousBid: info.prevBid,
          endTime: endHuman,
          timeLeft,
        });
        const { data: logRow } = await admin
          .from("bid_email_log")
          .insert({
            auction_id,
            bid_id,
            recipient_user_id: uid,
            recipient_email: info.email,
            email_type: "outbid_notification",
            subject,
            bid_amount: info.prevBid,
            highest_bid_amount: highest,
          })
          .select("id")
          .single();
        try {
          await sendEmail(client, smtpFrom, info.email, subject, html);
          if (logRow) await admin.from("bid_email_log").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", logRow.id);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (logRow) await admin.from("bid_email_log").update({ status: "failed", error_message: msg }).eq("id", logRow.id);
        }
      }

      await client.close();
    };

    // Run in background so pg_net call returns quickly
    // @ts-ignore EdgeRuntime available at runtime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(doSend());
    } else {
      await doSend();
    }

    return new Response(JSON.stringify({ success: true, outbid_count: outbidMap.size, confirmation_sent: !!winnerEmail }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("send-bid-notifications error:", msg);
    return new Response(JSON.stringify({ error: msg, success: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
