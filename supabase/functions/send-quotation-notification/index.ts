import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuotationNotificationRequest {
  buyerEmail: string;
  buyerName: string;
  sellerName: string;
  sellerCompany: string;
  quotationNumber: string;
  totalAmount: number;
  validUntil: string;
  items: Array<{
    name: string;
    quantity: number;
    total: number;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
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
    const data: QuotationNotificationRequest = await req.json();
    
    console.log("Sending quotation notification to:", data.buyerEmail);

    // Format items for email
    const itemsHtml = data.items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.total.toLocaleString()}</td>
      </tr>
    `).join('');

    // Email to buyer
    const buyerEmailResponse = await resend.emails.send({
      from: "RoboVerse Quotations <support@robotverse.in>",
      to: [data.buyerEmail],
      subject: `New Quotation Received - ${data.quotationNumber} from ${data.sellerCompany || data.sellerName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">🤖 RoboVerse</h1>
              <p style="color: #6b7280; margin-top: 5px;">Your Robotics Marketplace</p>
            </div>
            
            <h2 style="color: #1f2937; margin-bottom: 20px;">New Quotation Received!</h2>
            
            <p style="color: #374151; line-height: 1.6;">
              Dear ${data.buyerName},
            </p>
            
            <p style="color: #374151; line-height: 1.6;">
              You have received a new quotation from <strong>${data.sellerCompany || data.sellerName}</strong>.
            </p>
            
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1d4ed8; margin: 0 0 15px 0;">Quotation Details</h3>
              <p style="margin: 5px 0;"><strong>Quotation Number:</strong> ${data.quotationNumber}</p>
              <p style="margin: 5px 0;"><strong>From:</strong> ${data.sellerCompany || data.sellerName}</p>
              <p style="margin: 5px 0;"><strong>Valid Until:</strong> ${new Date(data.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            
            <div style="margin: 20px 0;">
              <h3 style="color: #1f2937; margin-bottom: 15px;">Items</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>
            
            <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;">Total Amount</p>
              <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold;">₹${data.totalAmount.toLocaleString()}</p>
            </div>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>📌 Next Steps:</strong> Log in to your RoboVerse dashboard to view the complete quotation, download the PDF, and respond to the seller.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://robot-verse.lovable.app/dashboard" 
                 style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                View Quotation in Dashboard
              </a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                This email was sent by RoboVerse - Your Trusted Robotics Marketplace
              </p>
              <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0 0;">
                support@robotverse.in | www.robotverse.in
              </p>
            </div>
          </div>
        </div>
      `,
    });

    if (buyerEmailResponse.error) {
      console.error("Error sending buyer email:", buyerEmailResponse.error);
      throw new Error(buyerEmailResponse.error.message);
    }

    console.log("Buyer email sent successfully:", buyerEmailResponse.data?.id);

    return new Response(
      JSON.stringify({
        success: true,
        buyerEmailId: buyerEmailResponse.data?.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in send-quotation-notification function:", error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
