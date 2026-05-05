import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

async function sendOneEmail(to: string, subject: string, html: string): Promise<boolean> {
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
      to,
      subject,
      content: "auto",
      html,
    });
    console.log("Email sent to:", to);
    return true;
  } catch (e) {
    console.error("Failed to send email to", to, e);
    return false;
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
  return `<span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background:${c.bg};color:${c.text};border:1px solid ${c.text}20;">${urgency.toUpperCase()}</span>`;
}

const emailWrapper = (content: string) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"><div style="max-width:640px;margin:0 auto;padding:32px 16px;"><div style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 50%,#06b6d4 100%);padding:32px 40px;border-radius:16px 16px 0 0;text-align:center;"><div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 14px;margin-bottom:16px;"><span style="font-size:28px;">🤖</span></div><h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">RobotVerse</h1><p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:1px;text-transform:uppercase;">Industrial Robotics Marketplace</p></div><div style="background:#ffffff;padding:36px 40px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">${content}</div><div style="text-align:center;padding:24px 16px;"><p style="margin:0 0 8px;color:#64748b;font-size:13px;">© ${new Date().getFullYear()} RobotVerse</p><p style="margin:0;color:#94a3b8;font-size:12px;"><a href="https://robotverse.in" style="color:#3b82f6;text-decoration:none;">Visit Website</a> · <a href="mailto:support@robotverse.in" style="color:#3b82f6;text-decoration:none;">Contact Support</a></p></div></div></body></html>`;

const sectionCard = (title: string, icon: string, border: string, content: string) => `<div style="border:1px solid #e2e8f0;border-left:4px solid ${border};border-radius:8px;padding:20px 24px;margin-bottom:20px;"><h3 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1e293b;"><span style="margin-right:8px;">${icon}</span>${title}</h3>${content}</div>`;

const infoRow = (label: string, value: string) => `<div style="display:flex;padding:6px 0;border-bottom:1px solid #f1f5f9;"><span style="min-width:120px;color:#64748b;font-size:14px;font-weight:500;">${label}</span><span style="color:#1e293b;font-size:14px;font-weight:600;">${value}</span></div>`;

const ctaButton = (text: string, url: string) => `<div style="text-align:center;margin:28px 0 8px;"><a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#3b82f6);color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">${text}</a></div>`;

const SITE_URL = 'https://robotverse.in';

function buildSellerEmailHtml(data: QuoteEmailRequest): string {
  const ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  return emailWrapper(`<div style="text-align:center;margin-bottom:28px;"><h2 style="margin:0;color:#1e293b;font-size:22px;">📩 New Quote Request Received</h2><p style="margin:8px 0 0;color:#64748b;font-size:14px;">A buyer is interested in your listing</p></div>${sectionCard('Buyer', '👤', '#3b82f6', infoRow('Name', data.buyerName || 'A Buyer') + (data.buyerCompany ? infoRow('Company', data.buyerCompany) : ''))}${sectionCard('Item', '📦', '#10b981', infoRow('Item', data.itemName || 'N/A') + infoRow('Type', data.itemType || 'N/A') + (data.itemModel ? infoRow('Model', data.itemModel) : '') + infoRow('Urgency', getUrgencyBadge(data.urgency || 'medium')))}${data.requirements ? sectionCard('Message', '💬', '#8b5cf6', `<p style="margin:0;color:#374151;font-size:14px;line-height:1.7;background:#f8fafc;padding:14px;border-radius:6px;">${data.requirements}</p>`) : ''}${ctaButton('Open Dashboard & Respond', 'https://robotverse.in/dashboard')}<div style="background:#f8fafc;border-radius:8px;padding:16px;margin-top:24px;text-align:center;"><p style="margin:0;color:#64748b;font-size:13px;">⏰ ${ts} IST</p></div>`);
}

function buildAdminEmailHtml(data: QuoteEmailRequest): string {
  const ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  return emailWrapper(`<div style="text-align:center;margin-bottom:28px;"><h2 style="margin:0;color:#1e293b;font-size:22px;">🔔 New Quote Request Alert</h2></div>${sectionCard('Buyer', '👤', '#3b82f6', infoRow('Name', data.buyerName || 'N/A') + infoRow('Email', data.buyerEmail || 'N/A') + (data.buyerPhone ? infoRow('Phone', data.buyerPhone) : '') + (data.buyerCompany ? infoRow('Company', data.buyerCompany) : ''))}${sectionCard('Item', '📦', '#10b981', infoRow('Item', data.itemName || 'N/A') + infoRow('Type', data.itemType || 'N/A') + infoRow('Urgency', getUrgencyBadge(data.urgency || 'medium')))}${sectionCard('Seller', '🏭', '#f59e0b', infoRow('Name', data.sellerName || 'N/A') + infoRow('Email', data.sellerEmail || 'N/A'))}<div style="background:#f8fafc;border-radius:8px;padding:16px;margin-top:24px;text-align:center;"><p style="margin:0;color:#64748b;font-size:13px;">⏰ ${ts} IST</p></div>`);
}

function buildBuyerConfirmationHtml(data: QuoteEmailRequest): string {
  return emailWrapper(`<div style="text-align:center;margin-bottom:28px;"><h2 style="margin:0;color:#1e293b;font-size:22px;">✅ Quote Request Sent!</h2></div><p style="color:#374151;font-size:15px;">Hi <strong>${data.buyerName}</strong>, your quote request for <strong style="color:#1e40af;">${data.itemName}</strong> has been sent to <strong>${data.sellerCompany || data.sellerName || 'the seller'}</strong>.</p>${sectionCard('Summary', '📋', '#3b82f6', infoRow('Item', data.itemName || 'N/A') + infoRow('Type', data.itemType || 'N/A') + infoRow('Urgency', getUrgencyBadge(data.urgency || 'medium')))}${ctaButton('Track Your Requests', 'https://robotverse.in/dashboard/my-requests')}`);
}

function buildBuyerQuoteReceivedHtml(data: QuoteEmailRequest): string {
  return emailWrapper(`<div style="text-align:center;margin-bottom:28px;"><h2 style="margin:0;color:#1e293b;font-size:22px;">🎉 You've Received a Quote!</h2></div><p style="color:#374151;font-size:15px;">Hi <strong>${data.buyerName}</strong>, a seller has submitted a quotation for your request.</p><div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #93c5fd;border-radius:12px;padding:28px;text-align:center;margin:24px 0;"><p style="margin:0 0 4px;color:#64748b;font-size:13px;text-transform:uppercase;">Quoted Price</p><p style="margin:0;font-size:36px;font-weight:800;color:#1e40af;">${data.quoteCurrency || '₹'} ${data.quotePrice || 'N/A'}</p><p style="margin:8px 0 0;color:#64748b;font-size:13px;">for ${data.itemName || 'your request'}</p></div>${data.quoteDescription ? sectionCard('Seller Note', '💬', '#10b981', `<p style="margin:0;color:#374151;font-size:14px;line-height:1.7;background:#f8fafc;padding:14px;border-radius:6px;">${data.quoteDescription}</p>`) : ''}${ctaButton('View Full Quote', 'https://robotverse.in/dashboard/my-requests')}`);
}

function buildAdminQuoteSubmittedHtml(data: QuoteEmailRequest): string {
  const ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  return emailWrapper(`<div style="text-align:center;margin-bottom:28px;"><h2 style="margin:0;color:#1e293b;font-size:22px;">💰 Seller Quote Submitted</h2></div>${sectionCard('Seller', '🏭', '#f59e0b', infoRow('Name', data.sellerName || 'N/A') + infoRow('Company', data.sellerCompany || 'N/A'))}${sectionCard('Quote', '💵', '#10b981', infoRow('Item', data.itemName || 'N/A') + infoRow('Price', `${data.quoteCurrency || '₹'} ${data.quotePrice || 'N/A'}`))}${sectionCard('Buyer', '👤', '#3b82f6', infoRow('Name', data.buyerName || 'N/A') + infoRow('Email', data.buyerEmail || 'N/A'))}<div style="background:#f8fafc;border-radius:8px;padding:16px;margin-top:24px;text-align:center;"><p style="margin:0;color:#64748b;font-size:13px;">⏰ ${ts} IST</p></div>`);
}

async function processEmails(data: QuoteEmailRequest) {
  const adminEmail = Deno.env.get("SMTP_FROM") || "support@robotverse.in";

  console.log("Background: processing emails for", data.type, data.itemName);

  if (data.type === 'seller_quote_response') {
    if (data.buyerEmail) {
      await sendOneEmail(data.buyerEmail, `Your Quote for ${data.itemName || 'Your Request'} - RobotVerse`, buildBuyerQuoteReceivedHtml(data));
    }
    await sendOneEmail(adminEmail, `Quote Submitted - ${data.itemName || 'Item'}`, buildAdminQuoteSubmittedHtml(data));
  } else {
    // Seller first (priority)
    if (data.sellerEmail) {
      await sendOneEmail(data.sellerEmail, `New Quote Request for ${data.itemName || 'Your Listing'} - RobotVerse`, buildSellerEmailHtml(data));
    }
    await sendOneEmail(adminEmail, `New Quote Request - ${data.itemName || 'Item'}`, buildAdminEmailHtml(data));
    if (data.buyerEmail) {
      await sendOneEmail(data.buyerEmail, `Quote Request Sent - ${data.itemName || 'Item'} - RobotVerse`, buildBuyerConfirmationHtml(data));
    }
  }
  console.log("Background: all emails processed");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  {
    const _authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: _userData, error: _userErr } = await _authClient.auth.getUser();
    if (_userErr || !_userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  try {
    const data: QuoteEmailRequest = await req.json();
    console.log("Received request:", data.type, data.itemName);

    // Use waitUntil to process emails in background, return immediately
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(processEmails(data));
    } else {
      // Fallback: fire and forget without awaiting
      processEmails(data).catch(e => console.error("Email processing error:", e));
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email processing initiated" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
