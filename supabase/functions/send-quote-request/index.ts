import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuoteRequest {
  supplierEmail: string;
  supplierName: string;
  supplierCompany: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerCompany?: string;
  itemType: string;
  itemName: string;
  itemId: string;
  itemModel?: string;
  itemCategory?: string;
  robotName?: string;
  robotModel?: string;
  robotId?: string;
  urgency: string;
  requirements: string;
  additionalInfo?: string;
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
    const quoteRequest: QuoteRequest = await req.json();

    // Email to supplier
    const supplierEmailResponse = await resend.emails.send({
      from: "RoboVerse Quote Request <quotes@resend.dev>",
      to: [quoteRequest.supplierEmail],
      subject: `New Quote Request - ${quoteRequest.itemType}: ${quoteRequest.itemName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #2563eb; margin-bottom: 20px; text-align: center;">
              🤖 New Quote Request - RoboVerse
            </h1>
            
            <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1d4ed8; margin: 0 0 10px 0;">Customer Information</h2>
              <p><strong>Name:</strong> ${quoteRequest.customerName}</p>
              <p><strong>Email:</strong> ${quoteRequest.customerEmail}</p>
              ${quoteRequest.customerPhone ? `<p><strong>Phone:</strong> ${quoteRequest.customerPhone}</p>` : ''}
              ${quoteRequest.customerCompany ? `<p><strong>Company:</strong> ${quoteRequest.customerCompany}</p>` : ''}
              <p><strong>Urgency:</strong> <span style="text-transform: capitalize; font-weight: bold; color: ${
                quoteRequest.urgency === 'urgent' ? '#dc2626' : 
                quoteRequest.urgency === 'high' ? '#ea580c' : 
                quoteRequest.urgency === 'medium' ? '#d97706' : '#16a34a'
              };">${quoteRequest.urgency}</span></p>
            </div>
            
            <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #15803d; margin: 0 0 10px 0;">${quoteRequest.itemType} Details</h2>
              <p><strong>Name:</strong> ${quoteRequest.itemName}</p>
              ${quoteRequest.itemModel ? `<p><strong>Model:</strong> ${quoteRequest.itemModel}</p>` : ''}
              ${quoteRequest.itemCategory ? `<p><strong>Category:</strong> ${quoteRequest.itemCategory}</p>` : ''}
              <p><strong>Item ID:</strong> ${quoteRequest.itemId}</p>
            </div>
            
            ${quoteRequest.robotName ? `
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #92400e; margin: 0 0 10px 0;">Related Robot</h2>
              <p><strong>Robot:</strong> ${quoteRequest.robotName}</p>
              <p><strong>Model:</strong> ${quoteRequest.robotModel}</p>
              <p><strong>Robot ID:</strong> ${quoteRequest.robotId}</p>
            </div>
            ` : ''}
            
            <div style="background-color: #fefce8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #a16207; margin: 0 0 10px 0;">Requirements & Specifications</h2>
              <p style="white-space: pre-wrap; line-height: 1.6;">${quoteRequest.requirements}</p>
            </div>
            
            ${quoteRequest.additionalInfo ? `
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #374151; margin: 0 0 10px 0;">Additional Information</h2>
              <p style="white-space: pre-wrap; line-height: 1.6;">${quoteRequest.additionalInfo}</p>
            </div>
            ` : ''}
            
            <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-top: 30px;">
              <p style="margin: 0; font-size: 16px;">
                Please respond to the customer directly at: 
                <a href="mailto:${quoteRequest.customerEmail}" style="color: #fbbf24; text-decoration: underline;">
                  ${quoteRequest.customerEmail}
                </a>
              </p>
              <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
                Thank you for being part of the RoboVerse marketplace!
              </p>
            </div>
          </div>
        </div>
      `,
    });

    // Email to customer (confirmation)
    const customerEmailResponse = await resend.emails.send({
      from: "RoboVerse <noreply@resend.dev>",
      to: [quoteRequest.customerEmail],
      subject: `Quote Request Confirmation - ${quoteRequest.itemType}: ${quoteRequest.itemName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #2563eb; margin-bottom: 20px; text-align: center;">
              🤖 Quote Request Sent Successfully!
            </h1>
            
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              Hi ${quoteRequest.customerName},
            </p>
            
            <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
              Your quote request for <strong>${quoteRequest.itemName}</strong> has been successfully sent to 
              <strong>${quoteRequest.supplierCompany || quoteRequest.supplierName}</strong>.
            </p>
            
            <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1d4ed8; margin: 0 0 10px 0;">What happens next?</h3>
              <ul style="color: #374151; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li>The supplier will receive your detailed requirements</li>
                <li>They will review your request and prepare a customized quote</li>
                <li>You should receive a response within 24-48 hours</li>
                <li>The supplier will contact you directly at ${quoteRequest.customerEmail}</li>
              </ul>
            </div>
            
            <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #15803d; margin: 0 0 10px 0;">Your Request Summary</h3>
              <p><strong>${quoteRequest.itemType}:</strong> ${quoteRequest.itemName}</p>
              ${quoteRequest.itemModel ? `<p><strong>Model:</strong> ${quoteRequest.itemModel}</p>` : ''}
              <p><strong>Urgency:</strong> ${quoteRequest.urgency.charAt(0).toUpperCase() + quoteRequest.urgency.slice(1)}</p>
              ${quoteRequest.robotName ? `<p><strong>For Robot:</strong> ${quoteRequest.robotName} - ${quoteRequest.robotModel}</p>` : ''}
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
              If you don't hear back within 48 hours, please feel free to contact the supplier directly or 
              explore other options in our marketplace.
            </p>
            
            <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-top: 30px;">
              <p style="margin: 0; font-size: 16px;">
                Thank you for using RoboVerse!
              </p>
              <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
                Your trusted robotics marketplace
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("Emails sent successfully:", {
      supplierEmailId: supplierEmailResponse.data?.id,
      customerEmailId: customerEmailResponse.data?.id
    });

    return new Response(
      JSON.stringify({
        success: true,
        supplierEmailId: supplierEmailResponse.data?.id,
        customerEmailId: customerEmailResponse.data?.id
      }),
      {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-quote-request function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
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