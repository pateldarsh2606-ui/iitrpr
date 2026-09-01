import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code + Deno.env.get("SUPABASE_ANON_KEY"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Email and verification code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (code.length !== 6) {
      return new Response(
        JSON.stringify({ error: "Please enter the 6-digit code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Find the most recent code for this email
    const { data: otpRecord, error: queryError } = await adminClient
      .from("otp_codes")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: "No verification code found. Please request a new code." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (new Date(otpRecord.expires_at).getTime() < Date.now()) {
      await adminClient.from("otp_codes").delete().eq("id", otpRecord.id);
      return new Response(
        JSON.stringify({ error: "This code has expired. Please request a new code." }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the code hash
    const submittedHash = await hashCode(code);
    if (submittedHash !== otpRecord.code_hash) {
      return new Response(
        JSON.stringify({ error: "Invalid verification code. Please check and try again." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Code is valid — create the auth user
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: otpRecord.password_hash,
      email_confirm: true,
      user_metadata: {
        full_name: otpRecord.full_name,
        department: otpRecord.department,
        entry_number: otpRecord.entry_number,
      },
    });

    if (createError) {
      if (createError.message.toLowerCase().includes("already registered") || createError.message.toLowerCase().includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "This email is already registered. Try signing in instead." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw createError;
    }

    if (!userData.user) {
      throw new Error("Failed to create account");
    }

    // Create the profile
    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: userData.user.id,
        full_name: otpRecord.full_name,
        department: otpRecord.department,
        entry_number: otpRecord.entry_number,
      }, { onConflict: "id" });

    if (profileError) {
      // Non-fatal — the trigger may have already created the profile
      console.error("Profile upsert error:", profileError.message);
    }

    // Delete the used code
    await adminClient.from("otp_codes").delete().eq("id", otpRecord.id);

    // Clean up any other expired codes
    await adminClient.from("otp_codes").delete().lt("expires_at", new Date().toISOString());

    return new Response(
      JSON.stringify({ success: true, message: "Account verified! You can now sign in." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
