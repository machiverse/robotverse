import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuoteEmailRequest {
  type: 'quote_request' | 'seller_quote_response';
  // Quote request fields
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
  // Seller quote response fields
  quotePrice?: string;
  quoteDescription?: string;
  quoteCurrency?: string;
}

async function sendEmail(client: SMTPClient, to: string, subject: string, html: string) {
  await client.send({
    from: Deno.env.get("SMTP_FROM") || "support@robotverse.in",
    to: to,
    subject: subject,
    content: "auto",
    html: html,
  });
}

function createSMTPClient(): SMTPClient {
  return new SMTPClient({
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
}

function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'urgent': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#d97706';
    default: return '#16a34a';
  }
}

function buildAdminEmailHtml(data: QuoteEmailRequest): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h1 style="color: #2563eb; margin-bottom: 20px; text-align: center;">🤖 New Quote Request – RobotVerse</h1>
        
        <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1d4ed8; margin: 0 0 10px 0;">Buyer Information</h2>
          <p><strong>Name:</strong> ${data.buyerName || 'N/A'}</p>
          <p><strong>Email:</strong> ${data.buyerEmail || 'N/A'}</p>
          ${data.buyerPhone ? `<p><strong>Phone:</strong> ${data.buyerPhone}</p>` : ''}
          ${data.buyerCompany ? `<p><strong>Company:</strong> ${data.buyerCompany}</p>` : ''}
        </div>
        
        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #15803d; margin: 0 0 10px 0;">${data.itemType || 'Item'} Details</h2>
          <p><strong>Item:</strong> ${data.itemName || 'N/A'}</p>
          ${data.itemModel ? `<p><strong>Model:</strong> ${data.itemModel}</p>` : ''}
          ${data.itemCategory ? `<p><strong>Category:</strong> ${data.itemCategory}</p>` : ''}
          <p><strong>Urgency:</strong> <span style="color: ${getUrgencyColor(data.urgency || 'medium')}; font-weight: bold;">${(data.urgency || 'medium').toUpperCase()}</span></p>
        </div>

        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #92400e; margin: 0 0 10px 0;">Seller (Receiver)</h2>
          <p><strong>Name:</strong> ${data.sellerName || 'N/A'}</p>
          <p><strong>Company:</strong> ${data.sellerCompany || 'N/A'}</p>
          <p><strong>Email:</strong> ${data.sellerEmail || 'N/A'}</p>
        </div>
        
        ${data.requirements ? `
        <div style="background-color: #fefce8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #a16207; margin: 0 0 10px 0;">Requirements</h2>
          <p style="white-space: pre-wrap;">${data.requirements}</p>
        </div>` : ''}
        
        <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">
          Timestamp: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
        </p>
      </div>
    </div>
  `;
}

function buildSellerEmailHtml(data: QuoteEmailRequest): string {
  // PRIVACY: Only buyer name, NO email/phone
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h1 style="color: #2563eb; margin-bottom: 20px; text-align: center;">🤖 New Quote Request – RobotVerse</h1>
        
        <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1d4ed8; margin: 0 0 10px 0;">Buyer</h2>
          <p><strong>Name:</strong> ${data.buyerName || 'A Buyer'}</p>
        </div>
        
        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #15803d; margin: 0 0 10px 0;">${data.itemType || 'Item'} Details</h2>
          <p><strong>Item:</strong> ${data.itemName || 'N/A'}</p>
          ${data.itemModel ? `<p><strong>Model:</strong> ${data.itemModel}</p>` : ''}
          ${data.itemCategory ? `<p><strong>Category:</strong> ${data.itemCategory}</p>` : ''}
          <p><strong>Urgency:</strong> <span style="color: ${getUrgencyColor(data.urgency || 'medium')}; font-weight: bold;">${(data.urgency || 'medium').toUpperCase()}</span></p>
        </div>
        
        ${data.requirements ? `
        <div style="background-color: #fefce8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #a16207; margin: 0 0 10px 0;">Message</h2>
          <p style="white-space: pre-wrap;">${data.requirements}</p>
        </div>` : ''}
        
        <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-top: 30px;">
          <p style="margin: 0; font-size: 16px;">Log in to your RobotVerse dashboard to respond.</p>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Use credits to unlock buyer contact details.</p>
        </div>
      </div>
    </div>
  `;
}

function buildBuyerConfirmationHtml(data: QuoteEmailRequest): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h1 style="color: #2563eb; margin-bottom: 20px; text-align: center;">✅ Quote Request Sent!</h1>
        
        <p style="font-size: 16px; color: #374151;">Hi ${data.buyerName},</p>
        <p style="color: #374151; line-height: 1.6;">
          Your quote request for <strong>${data.itemName}</strong> has been sent to 
          <strong>${data.sellerCompany || data.sellerName}</strong>.
        </p>
        
        <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1d4ed8; margin: 0 0 10px 0;">What happens next?</h3>
          <ul style="color: #374151; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>The seller will review your request</li>
            <li>They will prepare a customized quote</li>
            <li>You'll receive the quote via email once submitted</li>
          </ul>
        </div>
        
        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #15803d; margin: 0 0 10px 0;">Your Request Summary</h3>
          <p><strong>${data.itemType}:</strong> ${data.itemName}</p>
          ${data.itemModel ? `<p><strong>Model:</strong> ${data.itemModel}</p>` : ''}
          <p><strong>Urgency:</strong> ${(data.urgency || 'medium').charAt(0).toUpperCase() + (data.urgency || 'medium').slice(1)}</p>
        </div>
        
        <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-top: 30px;">
          <p style="margin: 0; font-size: 16px;">Thank you for using RobotVerse!</p>
        </div>
      </div>
    </div>
  `;
}

function buildBuyerQuoteReceivedHtml(data: QuoteEmailRequest): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h1 style="color: #2563eb; margin-bottom: 20px; text-align: center;">📋 Your Quote for ${data.itemName}</h1>
        
        <p style="font-size: 16px; color: #374151;">Hi ${data.buyerName},</p>
        <p style="color: #374151; line-height: 1.6;">
          Great news! A seller has submitted a quote for your request.
        </p>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #15803d; margin: 0 0 15px 0;">Quote Details</h2>
          <p><strong>Item:</strong> ${data.itemName}</p>
          ${data.itemType ? `<p><strong>Type:</strong> ${data.itemType}</p>` : ''}
          <p style="font-size: 24px; font-weight: bold; color: #2563eb; margin: 15px 0;">
            ${data.quoteCurrency || '₹'} ${data.quotePrice || 'N/A'}
          </p>
          ${data.quoteDescription ? `
          <div style="background-color: white; padding: 12px; border-radius: 6px; margin-top: 10px;">
            <p style="margin: 0; color: #374151; white-space: pre-wrap;">${data.quoteDescription}</p>
          </div>` : ''}
        </div>
        
        <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-top: 30px;">
          <p style="margin: 0; font-size: 16px;">Log in to your RobotVerse dashboard to view full details.</p>
          <a href="https://robot-verse.lovable.app/dashboard/my-requests" style="display: inline-block; margin-top: 12px; background: white; color: #2563eb; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">View My Requests</a>
        </div>
      </div>
    </div>
  `;
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

    if (data.type === 'seller_quote_response') {
      // Seller submitted a quote → email buyer
      if (data.buyerEmail) {
        try {
          await sendEmail(
            data.buyerEmail,
            `Your Quote for ${data.itemName || 'Your Request'}`,
            buildBuyerQuoteReceivedHtml(data)
          );
          results.buyerEmail = true;
        } catch (e) {
          console.error('Failed to send buyer quote email:', e);
          results.buyerEmail = false;
        }
      }

      // Also notify admin
      try {
        await sendEmail(
          adminEmail,
          `Quote Submitted – ${data.itemName || 'Item'} by ${data.sellerName || 'Seller'}`,
          `<div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Seller Quote Submitted</h2>
            <p><strong>Seller:</strong> ${data.sellerName} (${data.sellerCompany})</p>
            <p><strong>Item:</strong> ${data.itemName}</p>
            <p><strong>Price:</strong> ${data.quoteCurrency || '₹'} ${data.quotePrice}</p>
            <p><strong>Buyer:</strong> ${data.buyerName} (${data.buyerEmail})</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
          </div>`
        );
        results.adminEmail = true;
      } catch (e) {
        console.error('Failed to send admin notification:', e);
        results.adminEmail = false;
      }

    } else {
      // Quote request flow (default)
      
      // 1. Admin notification (full details)
      try {
        await sendEmail(
          adminEmail,
          `New Quote Request – ${data.itemName || 'Item'}`,
          buildAdminEmailHtml(data)
        );
        results.adminEmail = true;
      } catch (e) {
        console.error('Failed to send admin email:', e);
        results.adminEmail = false;
      }

      // 2. Seller notification (buyer name ONLY, no email/phone)
      if (data.sellerEmail) {
        try {
          await sendEmail(
            data.sellerEmail,
            `New Quote Request – ${data.itemName || 'Item'}`,
            buildSellerEmailHtml(data)
          );
          results.sellerEmail = true;
        } catch (e) {
          console.error('Failed to send seller email:', e);
          results.sellerEmail = false;
        }
      }

      // 3. Buyer confirmation
      if (data.buyerEmail) {
        try {
          await sendEmail(
            data.buyerEmail,
            `Quote Request Confirmation – ${data.itemName || 'Item'}`,
            buildBuyerConfirmationHtml(data)
          );
          results.buyerEmail = true;
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
