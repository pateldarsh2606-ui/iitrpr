import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@iitrpr\.ac\.in$/;
const CODE_EXPIRY_MINUTES = 10;
const RATE_LIMIT_SECONDS = 55;

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code + Deno.env.get("SUPABASE_ANON_KEY"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += (bytes[i] % 10).toString();
  }
  return code;
}

async function sendEmail(email: string, code: string, fullName: string): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    throw new Error("Email service is not configured. Please contact support.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Prom Match <onboarding@resend.dev>",
      to: [email],
      subject: "Your Prom Match verification code",
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#fdf2f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="420" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#ec4899,#f43f5e);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">Prom Match</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">IIT Ropar</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 20px;">
              <p style="margin:0 0 8px;color:#1f2937;font-size:16px;font-weight:600;">Hi ${fullName},</p>
              <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.6;">
                Welcome to Prom Match! Use the code below to verify your email and activate your account.
              </p>
              <div style="text-align:center;margin:0 0 28px;">
                <div style="display:inline-block;padding:16px 40px;background:#fdf2f8;border:2px dashed #ec4899;border-radius:14px;">
                  <span style="font-size:34px;font-weight:700;letter-spacing:8px;color:#be185d;">${code}</span>
                </div>
              </div>
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6;">
                This code expires in ${CODE_EXPIRY_MINUTES} minutes. If you didn't create an account on Prom Match, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 36px;">
              <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                Prom Match &middot; IIT Ropar<br>
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to send email: ${errText}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, full_name, department, entry_number, password } = await req.json();

    if (!email || !full_name || !department || !entry_number || !password) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return new Response(
        JSON.stringify({ error: "Only @iitrpr.ac.in emails are allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if user already exists in auth.users
    const { data: existingUsers } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    const existing = existingUsers?.users?.find((u) => u.email === email);
    if (existing) {
      return new Response(
        JSON.stringify({ error: "This email is already registered. Try signing in instead." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit: check if a code was sent recently for this email
    const { data: recentCode } = await adminClient
      .from("otp_codes")
      .select("created_at")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentCode) {
      const elapsed = (Date.now() - new Date(recentCode.created_at).getTime()) / 1000;
      if (elapsed < RATE_LIMIT_SECONDS) {
        const wait = Math.ceil(RATE_LIMIT_SECONDS - elapsed);
        return new Response(
          JSON.stringify({ error: `Please wait ${wait}s before requesting another code.` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate and store the code
    const code = generateCode();
    const codeHash = await hashCode(code);

    // Clean up old codes for this email, then insert the new one
    await adminClient.from("otp_codes").delete().eq("email", email);
    await adminClient.from("otp_codes").delete().lt("expires_at", new Date().toISOString());

    const { error: insertError } = await adminClient.from("otp_codes").insert({
      email,
      code_hash: codeHash,
      full_name: full_name.trim(),
      department,
      entry_number: entry_number.trim().toUpperCase(),
      password_hash: password,
      expires_at: new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString(),
    });

    if (insertError) {
      throw new Error("Failed to store verification code");
    }

    // Send the email
    await sendEmail(email, code, full_name.trim());

    return new Response(
      JSON.stringify({ success: true, message: `Verification code sent to ${email}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
