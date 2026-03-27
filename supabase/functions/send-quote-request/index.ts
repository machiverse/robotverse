import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuoteEmailRequest {
  type: 'quote_request' | 'seller_quote_response';
  itemName?: string;
  itemType?: string;
  itemModel?: string;
  itemCategory?: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerCompany?: string;
  sellerName?: string;
  sellerCompany?: string;
  sellerEmail?: string;
  sellerId?: string;
  urgency?: string;
  requirements?: string;
  additionalInfo?: string;
  quotePrice?: string;
  quoteDescription?: string;
  quoteCurrency?: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  const client = new SMTPClient({
    connection: {
      hostname: Deno.env.get("SMTP_HOST") || "smtppro.zoho.in",
      port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
      tls: true,
      auth: {
        username: Deno.env.get("SMTP_USER") || "",
        password: Deno.env.get("SMTP_PASS") || "",
      },
    },
  });
  try {
    await client.send({
      from: `"RobotVerse" <${Deno.env.get("SMTP_FROM") || "support@robotverse.in"}>`,
      to: to,
      subject: subject,
      content: "auto",
      html: html,
    });
  } finally {
    await client.close();
  }
}

function getUrgencyBadge(urgency: string): string {
  const colors: Record<string, { bg: string; text: string }> = {
    urgent: { bg: '#fef2f2', text: '#dc2626' },
    high: { bg: '#fff7ed', text: '#ea580c' },
    medium: { bg: '#fefce8', text: '#ca8a04' },
    low: { bg: '#f0fdf4', text: '#16a34a' },
  };
  const c = colors[urgency] || colors.low;
  return `<span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:0.5px;background:${c.bg};color:${c.text};border:1px solid ${c.text}20;">${urgency.toUpperCase()}</span>`;
}

const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 50%,#06b6d4 100%);padding:32px 40px;border-radius:16px 16px 0 0;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 14px;margin-bottom:16px;">
        <span style="font-size:28px;">🤖</span>
      </div>
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">RobotVerse</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:1px;text-transform:uppercase;">Industrial Robotics Marketplace</p>
    </div>
    <!-- Body -->
    <div style="background:#ffffff;padding:36px 40px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
      ${content}
    </div>
    <!-- Footer -->
    <div style="text-align:center;padding:24px 16px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:13px;">© ${new Date().getFullYear()} RobotVerse — India's Leading Robotics Marketplace</p>
      <p style="margin:0;color:#94a3b8;font-size:12px;">
        <a href="https://robot-verse.lovable.app" style="color:#3b82f6;text-decoration:none;">Visit Website</a>
        &nbsp;·&nbsp;
        <a href="mailto:support@robotverse.in" style="color:#3b82f6;text-decoration:none;">Contact Support</a>
      </p>
    </div>
  </div>
</body>
</html>`;

const sectionCard = (title: string, iconEmoji: string, borderColor: string, content: string) => `
<div style="border:1px solid #e2e8f0;border-left:4px solid ${borderColor};border-radius:8px;padding:20px 24px;margin-bottom:20px;">
  <h3 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1e293b;">
    <span style="margin-right:8px;">${iconEmoji}</span>${title}
  </h3>
  ${content}
</div>`;

const infoRow = (label: string, value: string) =>
  `<div style="display:flex;padding:6px 0;border-bottom:1px solid #f1f5f9;">
    <span style="min-width:120px;color:#64748b;font-size:14px;font-weight:500;">${label}</span>
    <span style="color:#1e293b;font-size:14px;font-weight:600;">${value}</span>
  </div>`;

const ctaButton = (text: string, url: string) =>
  `<div style="text-align:center;margin:28px 0 8px;">
    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#3b82f6);color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(59,130,246,0.35);">${text}</a>
  </div>`;

// ─── SELLER EMAIL: New quote request notification ───
function buildSellerEmailHtml(data: QuoteEmailRequest): string {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  return emailWrapper(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#eff6ff;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;margin-bottom:12px;">📩</div>
      <h2 style="margin:0;color:#1e293b;font-size:22px;font-weight:700;">New Quote Request Received</h2>
      <p style="margin:8px 0 0;color:#64748b;font-size:14px;">A buyer is interested in your listing</p>
    </div>

    ${sectionCard('Buyer Information', '👤', '#3b82f6',
      infoRow('Name', data.buyerName || 'A Buyer') +
      (data.buyerCompany ? infoRow('Company', data.buyerCompany) : '') +
      `<p style="margin:10px 0 0;color:#94a3b8;font-size:12px;font-style:italic;">📌 Contact details are available in your dashboard after using credits.</p>`
    )}

    ${sectionCard('Requested Item', '📦', '#10b981',
      infoRow('Item', data.itemName || 'N/A') +
      infoRow('Type', data.itemType || 'N/A') +
      (data.itemModel ? infoRow('Model', data.itemModel) : '') +
      (data.itemCategory ? infoRow('Category', data.itemCategory) : '') +
      `<div style="margin-top:10px;">${infoRow('Urgency', getUrgencyBadge(data.urgency || 'medium'))}</div>`
    )}

    ${data.requirements ? sectionCard('Buyer Message', '💬', '#8b5cf6',
      `<p style="margin:0;color:#374151;font-size:14px;line-height:1.7;white-space:pre-wrap;background:#f8fafc;padding:14px;border-radius:6px;">${data.requirements}</p>`
    ) : ''}

    ${ctaButton('Open Dashboard & Respond', 'https://robot-verse.lovable.app/dashboard')}

    <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-top:24px;text-align:center;">
      <p style="margin:0;color:#64748b;font-size:13px;">⏰ Received on ${timestamp} IST</p>
      <p style="margin:6px 0 0;color:#94a3b8;font-size:12px;">Respond quickly to increase your conversion rate!</p>
    </div>
  `);
}

// ─── ADMIN EMAIL: Full details ───
function buildAdminEmailHtml(data: QuoteEmailRequest): string {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  return emailWrapper(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#fef3c7;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;margin-bottom:12px;">🔔</div>
      <h2 style="margin:0;color:#1e293b;font-size:22px;font-weight:700;">New Quote Request Alert</h2>
      <p style="margin:8px 0 0;color:#64748b;font-size:14px;">Admin notification — full details below</p>
    </div>

    ${sectionCard('Buyer Details (Full)', '👤', '#3b82f6',
      infoRow('Name', data.buyerName || 'N/A') +
      infoRow('Email', data.buyerEmail || 'N/A') +
      (data.buyerPhone ? infoRow('Phone', data.buyerPhone) : '') +
      (data.buyerCompany ? infoRow('Company', data.buyerCompany) : '')
    )}

    ${sectionCard('Requested Item', '📦', '#10b981',
      infoRow('Item', data.itemName || 'N/A') +
      infoRow('Type', data.itemType || 'N/A') +
      (data.itemModel ? infoRow('Model', data.itemModel) : '') +
      (data.itemCategory ? infoRow('Category', data.itemCategory) : '') +
      `<div style="margin-top:10px;">${infoRow('Urgency', getUrgencyBadge(data.urgency || 'medium'))}</div>`
    )}

    ${sectionCard('Seller (Receiver)', '🏭', '#f59e0b',
      infoRow('Name', data.sellerName || 'N/A') +
      infoRow('Company', data.sellerCompany || 'N/A') +
      infoRow('Email', data.sellerEmail || 'N/A')
    )}

    ${data.requirements ? sectionCard('Requirements', '📝', '#8b5cf6',
      `<p style="margin:0;color:#374151;font-size:14px;line-height:1.7;white-space:pre-wrap;background:#f8fafc;padding:14px;border-radius:6px;">${data.requirements}</p>`
    ) : ''}

    <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-top:24px;text-align:center;">
      <p style="margin:0;color:#64748b;font-size:13px;">⏰ ${timestamp} IST</p>
    </div>
  `);
}

// ─── BUYER EMAIL: Confirmation after request ───
function buildBuyerConfirmationHtml(data: QuoteEmailRequest): string {
  return emailWrapper(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;margin-bottom:12px;">✅</div>
      <h2 style="margin:0;color:#1e293b;font-size:22px;font-weight:700;">Quote Request Sent Successfully!</h2>
      <p style="margin:8px 0 0;color:#64748b;font-size:14px;">Your request has been delivered to the seller</p>
    </div>

    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi <strong>${data.buyerName}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      Your quote request for <strong style="color:#1e40af;">${data.itemName}</strong> has been successfully sent to 
      <strong>${data.sellerCompany || data.sellerName || 'the seller'}</strong>.
    </p>

    ${sectionCard('Your Request Summary', '📋', '#3b82f6',
      infoRow('Item', data.itemName || 'N/A') +
      infoRow('Type', data.itemType || 'N/A') +
      (data.itemModel ? infoRow('Model', data.itemModel) : '') +
      `<div style="margin-top:10px;">${infoRow('Urgency', getUrgencyBadge(data.urgency || 'medium'))}</div>`
    )}

    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin-bottom:20px;background:#fafbff;">
      <h3 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1e293b;">🔜 What Happens Next?</h3>
      <div style="display:flex;align-items:flex-start;margin-bottom:12px;">
        <div style="min-width:28px;height:28px;line-height:28px;text-align:center;background:#3b82f6;color:white;border-radius:50%;font-size:13px;font-weight:700;margin-right:12px;">1</div>
        <p style="margin:4px 0 0;color:#374151;font-size:14px;">The seller reviews your requirements</p>
      </div>
      <div style="display:flex;align-items:flex-start;margin-bottom:12px;">
        <div style="min-width:28px;height:28px;line-height:28px;text-align:center;background:#3b82f6;color:white;border-radius:50%;font-size:13px;font-weight:700;margin-right:12px;">2</div>
        <p style="margin:4px 0 0;color:#374151;font-size:14px;">They prepare a customized quotation for you</p>
      </div>
      <div style="display:flex;align-items:flex-start;">
        <div style="min-width:28px;height:28px;line-height:28px;text-align:center;background:#3b82f6;color:white;border-radius:50%;font-size:13px;font-weight:700;margin-right:12px;">3</div>
        <p style="margin:4px 0 0;color:#374151;font-size:14px;">You'll receive the quote via email & dashboard</p>
      </div>
    </div>

    ${ctaButton('Track Your Requests', 'https://robot-verse.lovable.app/dashboard/my-requests')}
  `);
}

// ─── BUYER EMAIL: Quote received from seller ───
function buildBuyerQuoteReceivedHtml(data: QuoteEmailRequest): string {
  return emailWrapper(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#dbeafe;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;margin-bottom:12px;">🎉</div>
      <h2 style="margin:0;color:#1e293b;font-size:22px;font-weight:700;">You've Received a Quote!</h2>
      <p style="margin:8px 0 0;color:#64748b;font-size:14px;">A seller has responded to your request</p>
    </div>

    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi <strong>${data.buyerName}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      Great news! A seller has submitted a quotation for your request.
    </p>

    <!-- Price Highlight -->
    <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #93c5fd;border-radius:12px;padding:28px;text-align:center;margin:24px 0;">
      <p style="margin:0 0 4px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Quoted Price</p>
      <p style="margin:0;font-size:36px;font-weight:800;color:#1e40af;letter-spacing:-1px;">
        ${data.quoteCurrency || '₹'} ${data.quotePrice || 'N/A'}
      </p>
      <p style="margin:8px 0 0;color:#64748b;font-size:13px;">for ${data.itemName || 'your request'}</p>
    </div>

    ${sectionCard('Quote Details', '📋', '#3b82f6',
      infoRow('Item', data.itemName || 'N/A') +
      (data.itemType ? infoRow('Type', data.itemType) : '') +
      infoRow('Price', `${data.quoteCurrency || '₹'} ${data.quotePrice || 'N/A'}`)
    )}

    ${data.quoteDescription ? sectionCard('Seller\'s Note', '💬', '#10b981',
      `<p style="margin:0;color:#374151;font-size:14px;line-height:1.7;white-space:pre-wrap;background:#f8fafc;padding:14px;border-radius:6px;">${data.quoteDescription}</p>`
    ) : ''}

    ${ctaButton('View Full Quote Details', 'https://robot-verse.lovable.app/dashboard/my-requests')}

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-top:24px;text-align:center;">
      <p style="margin:0;color:#15803d;font-size:13px;font-weight:600;">💡 Tip: Compare quotes from multiple sellers to get the best deal!</p>
    </div>
  `);
}

// ─── ADMIN EMAIL: Seller submitted quote ───
function buildAdminQuoteSubmittedHtml(data: QuoteEmailRequest): string {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  return emailWrapper(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;margin-bottom:12px;">💰</div>
      <h2 style="margin:0;color:#1e293b;font-size:22px;font-weight:700;">Seller Quote Submitted</h2>
      <p style="margin:8px 0 0;color:#64748b;font-size:14px;">A seller has responded to a buyer request</p>
    </div>

    ${sectionCard('Seller', '🏭', '#f59e0b',
      infoRow('Name', data.sellerName || 'N/A') +
      infoRow('Company', data.sellerCompany || 'N/A')
    )}

    ${sectionCard('Quote', '💵', '#10b981',
      infoRow('Item', data.itemName || 'N/A') +
      infoRow('Price', `${data.quoteCurrency || '₹'} ${data.quotePrice || 'N/A'}`)
    )}

    ${sectionCard('Buyer', '👤', '#3b82f6',
      infoRow('Name', data.buyerName || 'N/A') +
      infoRow('Email', data.buyerEmail || 'N/A')
    )}

    <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-top:24px;text-align:center;">
      <p style="margin:0;color:#64748b;font-size:13px;">⏰ ${timestamp} IST</p>
    </div>
  `);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const data: QuoteEmailRequest = await req.json();
    const results: Record<string, boolean> = {};
    const adminEmail = Deno.env.get("SMTP_FROM") || "support@robotverse.in";

    console.log("Processing email request:", { type: data.type, itemName: data.itemName, sellerEmail: data.sellerEmail, buyerEmail: data.buyerEmail });

    if (data.type === 'seller_quote_response') {
      if (data.buyerEmail) {
        try {
          await sendEmail(data.buyerEmail,
            `📋 Your Quote for ${data.itemName || 'Your Request'} — RobotVerse`,
            buildBuyerQuoteReceivedHtml(data)
          );
          results.buyerEmail = true;
          console.log("Buyer quote email sent to:", data.buyerEmail);
        } catch (e) {
          console.error('Failed to send buyer quote email:', e);
          results.buyerEmail = false;
        }
      }

      try {
        await sendEmail(adminEmail,
          `💰 Quote Submitted – ${data.itemName || 'Item'} by ${data.sellerName || 'Seller'}`,
          buildAdminQuoteSubmittedHtml(data)
        );
        results.adminEmail = true;
      } catch (e) {
        console.error('Failed to send admin notification:', e);
        results.adminEmail = false;
      }

    } else {
      // 1. Seller notification FIRST
      if (data.sellerEmail) {
        try {
          await sendEmail(data.sellerEmail,
            `📩 New Quote Request for ${data.itemName || 'Your Listing'} — RobotVerse`,
            buildSellerEmailHtml(data)
          );
          results.sellerEmail = true;
          console.log("Seller email sent to:", data.sellerEmail);
        } catch (e) {
          console.error('Failed to send seller email:', e);
          results.sellerEmail = false;
        }
      }

      // 2. Admin notification
      try {
        await sendEmail(adminEmail,
          `🔔 New Quote Request – ${data.itemName || 'Item'}`,
          buildAdminEmailHtml(data)
        );
        results.adminEmail = true;
      } catch (e) {
        console.error('Failed to send admin email:', e);
        results.adminEmail = false;
      }

      // 3. Buyer confirmation
      if (data.buyerEmail) {
        try {
          await sendEmail(data.buyerEmail,
            `✅ Quote Request Sent – ${data.itemName || 'Item'} — RobotVerse`,
            buildBuyerConfirmationHtml(data)
          );
          results.buyerEmail = true;
          console.log("Buyer confirmation sent to:", data.buyerEmail);
        } catch (e) {
          console.error('Failed to send buyer confirmation:', e);
          results.buyerEmail = false;
        }
      }
    }

    console.log("Email results:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in send-quote-request:", error);
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
