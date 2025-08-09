import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuoteRequest {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceProviderEmail: string;
  serviceProviderName: string;
  serviceName: string;
  serviceType: string;
  message: string;
  urgency: string;
  preferredDate?: string;
  location?: string;
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
    const quoteData: QuoteRequest = await req.json();

    console.log("Processing quote request:", {
      service: quoteData.serviceName,
      customer: quoteData.customerEmail,
      provider: quoteData.serviceProviderEmail
    });

    // Send email to service provider
    const providerEmailResponse = await resend.emails.send({
      from: "RobotVerse <noreply@resend.dev>",
      to: [quoteData.serviceProviderEmail],
      subject: `New Service Quote Request - ${quoteData.serviceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🤖 New Quote Request</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">RobotVerse Service Platform</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #4f46e5; margin-top: 0;">Service Request Details</h2>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">📋 Service Information</h3>
              <p><strong>Service:</strong> ${quoteData.serviceName}</p>
              <p><strong>Category:</strong> ${quoteData.serviceType}</p>
              <p><strong>Urgency:</strong> ${quoteData.urgency}</p>
              ${quoteData.preferredDate ? `<p><strong>Preferred Date:</strong> ${quoteData.preferredDate}</p>` : ''}
              ${quoteData.location ? `<p><strong>Location:</strong> ${quoteData.location}</p>` : ''}
            </div>

            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0369a1; margin-top: 0;">👤 Customer Details</h3>
              <p><strong>Name:</strong> ${quoteData.customerName}</p>
              <p><strong>Email:</strong> ${quoteData.customerEmail}</p>
              ${quoteData.customerPhone ? `<p><strong>Phone:</strong> ${quoteData.customerPhone}</p>` : ''}
            </div>

            <div style="background: #fefce8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #eab308;">
              <h3 style="color: #a16207; margin-top: 0;">💬 Customer Message</h3>
              <p style="line-height: 1.6; color: #374151;">${quoteData.message}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="mailto:${quoteData.customerEmail}?subject=Re: Quote Request - ${quoteData.serviceName}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                📧 Reply to Customer
              </a>
            </div>

            <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
              <p>This request was sent through <strong>RobotVerse</strong> - Your Robotics Service Platform</p>
              <p>Please respond promptly to maintain your service rating</p>
            </div>
          </div>
        </div>
      `,
    });

    // Send confirmation email to customer
    const customerEmailResponse = await resend.emails.send({
      from: "RobotVerse <noreply@resend.dev>",
      to: [quoteData.customerEmail],
      subject: `Quote Request Submitted - ${quoteData.serviceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">✅ Quote Request Sent!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">We've forwarded your request to the service provider</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #059669; margin-top: 0;">Request Summary</h2>
            
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0369a1; margin-top: 0;">🔧 Service Details</h3>
              <p><strong>Service:</strong> ${quoteData.serviceName}</p>
              <p><strong>Provider:</strong> ${quoteData.serviceProviderName}</p>
              <p><strong>Category:</strong> ${quoteData.serviceType}</p>
            </div>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="color: #d97706; margin-top: 0;">⏱️ What's Next?</h3>
              <ul style="color: #374151; line-height: 1.6; padding-left: 20px;">
                <li>The service provider will review your request</li>
                <li>They'll contact you within 24-48 hours</li>
                <li>You'll receive a detailed quote via email</li>
                <li>You can then negotiate terms directly</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #6b7280; margin-bottom: 15px;">Need to make changes to your request?</p>
              <a href="mailto:support@robotverse.com" 
                 style="background: #6366f1; color: white; padding: 10px 25px; text-decoration: none; border-radius: 20px; font-weight: bold; display: inline-block;">
                💬 Contact Support
              </a>
            </div>

            <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
              <p>Thank you for using <strong>RobotVerse</strong></p>
              <p>Your trusted robotics service marketplace</p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("Emails sent successfully:", {
      providerEmail: providerEmailResponse,
      customerEmail: customerEmailResponse
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Quote request sent successfully",
      providerEmailId: providerEmailResponse.data?.id,
      customerEmailId: customerEmailResponse.data?.id
    }), {
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