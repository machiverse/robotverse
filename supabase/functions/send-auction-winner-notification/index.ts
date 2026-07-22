import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_FEE_PCT = 2; // 2% platform fee
const GST_PCT = 18; // 18% GST on platform fee
const SUPPORT_EMAIL = "support@robotverse.in";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { auction_id } = await req.json();
    if (!auction_id) {
      return new Response(JSON.stringify({ error: "auction_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load auction + related robot
    const { data: auction, error: aErr } = await admin
      .from("auctions")
      .select("*, robots(name, model, brand, location)")
      .eq("id", auction_id)
      .single();
    if (aErr || !auction) throw new Error(aErr?.message || "Auction not found");

    if (!auction.winner_id) throw new Error("Auction has no winner yet");

    // Load winner + seller profiles
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, full_name, company_name, email, phone, location")
      .in("user_id", [auction.winner_id, auction.seller_id]);

    const winner = profiles?.find((p: any) => p.user_id === auction.winner_id) || {};
    const seller = profiles?.find((p: any) => p.user_id === auction.seller_id) || {};

    // Winner email fallback via auth admin
    let winnerEmail = (winner as any).email;
    if (!winnerEmail) {
      const { data: authUser } = await admin.auth.admin.getUserById(auction.winner_id);
      winnerEmail = authUser?.user?.email || "";
    }

    const winAmount = Number(auction.current_highest_bid || 0);
    const platformFee = +((winAmount * PLATFORM_FEE_PCT) / 100).toFixed(2);
    const gst = +((platformFee * GST_PCT) / 100).toFixed(2);
    const totalPayable = +(winAmount + platformFee + gst).toFixed(2);

    const fmt = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#f9fafb;padding:24px">
        <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.05)">
          <div style="background:linear-gradient(135deg,#059669,#047857);color:#fff;padding:24px">
            <h1 style="margin:0;font-size:22px">🏆 Auction Winner Confirmed</h1>
            <p style="margin:6px 0 0;opacity:.9">Admin-approved winner notification</p>
          </div>
          <div style="padding:24px;color:#111827">
            <h2 style="margin:0 0 8px;font-size:18px">${auction.auction_title}</h2>
            <p style="margin:0 0 16px;color:#6b7280;font-size:13px">
              Auction ID: ${auction.id}<br/>
              Item: ${auction.robots?.brand || ""} ${auction.robots?.name || ""} ${auction.robots?.model || ""}<br/>
              Location: ${auction.robots?.location || auction.item_location || "-"}
            </p>

            <h3 style="border-bottom:1px solid #e5e7eb;padding-bottom:6px;font-size:15px">Winner Details</h3>
            <p style="margin:6px 0;font-size:14px">
              <strong>Name:</strong> ${(winner as any).full_name || "-"}<br/>
              <strong>Company:</strong> ${(winner as any).company_name || "-"}<br/>
              <strong>Email:</strong> ${winnerEmail || "-"}<br/>
              <strong>Phone:</strong> ${(winner as any).phone || "-"}<br/>
              <strong>Location:</strong> ${(winner as any).location || "-"}
            </p>

            <h3 style="border-bottom:1px solid #e5e7eb;padding-bottom:6px;font-size:15px">Seller Details</h3>
            <p style="margin:6px 0;font-size:14px">
              <strong>Name:</strong> ${(seller as any).full_name || "-"}<br/>
              <strong>Company:</strong> ${(seller as any).company_name || "-"}<br/>
              <strong>Email:</strong> ${(seller as any).email || "-"}<br/>
              <strong>Phone:</strong> ${(seller as any).phone || "-"}
            </p>

            <h3 style="border-bottom:1px solid #e5e7eb;padding-bottom:6px;font-size:15px">Payment Breakdown</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:8px 0">Winning Bid</td><td style="text-align:right">${fmt(winAmount)}</td></tr>
              <tr><td style="padding:8px 0">Platform Fee (${PLATFORM_FEE_PCT}%)</td><td style="text-align:right">${fmt(platformFee)}</td></tr>
              <tr><td style="padding:8px 0">GST on Fee (${GST_PCT}%)</td><td style="text-align:right">${fmt(gst)}</td></tr>
              <tr style="border-top:2px solid #111827;font-weight:bold">
                <td style="padding:10px 0">Total Payable</td>
                <td style="text-align:right;padding:10px 0">${fmt(totalPayable)}</td>
              </tr>
            </table>

            <h3 style="border-bottom:1px solid #e5e7eb;padding-bottom:6px;font-size:15px;margin-top:20px">Terms & Conditions</h3>
            <ol style="font-size:13px;color:#374151;padding-left:18px;line-height:1.6">
              <li>Winning bid is legally binding once admin-approved.</li>
              <li>Total payable includes a ${PLATFORM_FEE_PCT}% platform fee and ${GST_PCT}% GST on the fee.</li>
              <li>Payment must be routed via RobotVerse mediated escrow / bank details shared by the Key Account Manager (+91 86109 25352).</li>
              <li>Handover, inspection and logistics are governed by the auction listing terms.</li>
              <li>Disputes resolved via platform mediation only. Direct off-platform settlement is not permitted.</li>
              <li>Cancellation after admin approval attracts full platform fee + GST liability.</li>
            </ol>

            <div style="background:#f3f4f6;padding:12px;border-radius:8px;margin-top:16px;font-size:12px;color:#6b7280">
              Key Account Manager: +91 86109 25352 · ${SUPPORT_EMAIL} · www.robotverse.in
            </div>
          </div>
        </div>
      </div>
    `;

    const smtpHost = Deno.env.get("SMTP_HOST") || "";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER") || "";
    const smtpPass = Deno.env.get("SMTP_PASS") || "";
    const smtpFrom = Deno.env.get("SMTP_FROM") || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error("SMTP credentials not configured");
    }

    const client = new SmtpClient();
    await client.connectTLS({ hostname: smtpHost, port: smtpPort, username: smtpUser, password: smtpPass });

    const recipients = [SUPPORT_EMAIL];
    if (winnerEmail) recipients.push(winnerEmail);

    for (const to of recipients) {
      await client.send({
        from: smtpFrom,
        to,
        subject: `Auction Winner Approved - ${auction.auction_title} - ${fmt(totalPayable)}`,
        content: "Please view this email in an HTML-compatible client.",
        html,
      });
    }
    await client.close();

    // Persist admin status
    await admin.from("auctions").update({ admin_status: "winner_approved" }).eq("id", auction_id);

    return new Response(
      JSON.stringify({
        success: true,
        recipients,
        breakdown: { winAmount, platformFee, gst, totalPayable },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("send-auction-winner-notification error:", msg);
    return new Response(JSON.stringify({ error: msg, success: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
