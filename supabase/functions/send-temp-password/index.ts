import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TempPasswordRequest {
  patientName: string;
  patientEmail: string;
  tempPassword: string;
  doctorName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientName, patientEmail, tempPassword, doctorName }: TempPasswordRequest = await req.json();

    console.log('Sending temporary password email to:', patientEmail);

    const emailResponse = await resend.emails.send({
      from: "Doc+ <onboarding@resend.dev>",
      to: [patientEmail],
      subject: "Welcome to Doc+ - Your Temporary Login Credentials",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; font-size: 32px; margin: 0;">Doc+</h1>
            <p style="color: #64748b; margin: 5px 0;">Your offline medical assistant</p>
          </div>
          
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #1e293b; margin-top: 0;">Welcome to Doc+, ${patientName}!</h2>
            <p style="color: #475569; line-height: 1.6;">
              Dr. ${doctorName} has registered you as a patient on the Doc+ platform. 
              You can now access your medical records and communicate with your healthcare provider.
            </p>
          </div>

          <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">Your Temporary Login Credentials</h3>
            <p style="color: #7f1d1d; margin: 10px 0;"><strong>Email:</strong> ${patientEmail}</p>
            <p style="color: #7f1d1d; margin: 10px 0;"><strong>Temporary Password:</strong> <code style="background: #fecaca; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${tempPassword}</code></p>
            <p style="color: #7f1d1d; font-size: 14px; margin-top: 15px;">
              <strong>Important:</strong> Please change your password after your first login for security reasons.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get("SITE_URL") || "https://doc-plus.com"}/signin" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Login to Doc+
            </a>
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">
              If you have any questions, please contact Dr. ${doctorName} or our support team.
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin: 10px 0 0 0;">
              This is an automated message from Doc+ Medical Platform.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-temp-password function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);