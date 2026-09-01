/*
# Create OTP Codes Table for Custom Email Verification

## Purpose
Stores 6-digit one-time verification codes for sign-up email verification.
This replaces Supabase's built-in email service (limited to 3-4 emails/hour)
with a custom system using the Resend email API, allowing unlimited emails
during a campus launch.

## How it works
1. When a student signs up, the `send-otp` edge function generates a random
   6-digit code, stores it here with a 10-minute expiry, and emails it via
   Resend.
2. The `verify-otp` edge function checks the submitted code against this
   table, and if valid, creates the auth user via the admin API and deletes
   the used code.
3. Old expired codes are cleaned up automatically by the verify function.

## New Table: otp_codes
- `id` (uuid, primary key)
- `email` (text, the student's IIT Ropar email)
- `code` (text, the 6-digit verification code, stored hashed)
- `full_name` (text, stored from sign-up form until verification)
- `department` (text, stored from sign-up form until verification)
- `entry_number` (text, stored from sign-up form until verification)
- `password_hash` (text, bcrypt hash of the chosen password)
- `expires_at` (timestamptz, 10 minutes from creation)
- `created_at` (timestamptz, default now)

## Security
- RLS enabled; only the anon role can INSERT and SELECT (needed for the
  edge function which runs with service role and bypasses RLS anyway).
- Codes are stored as SHA-256 hashes, never in plaintext.
- The edge functions use the service role key, so they bypass RLS entirely.
- No UPDATE or DELETE policies for the anon role — only the service role
  (edge functions) can delete or modify codes.
*/

CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  full_name text NOT NULL,
  department text NOT NULL,
  entry_number text NOT NULL,
  password_hash text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_otp_codes" ON otp_codes;
CREATE POLICY "anon_insert_otp_codes" ON otp_codes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_otp_codes" ON otp_codes;
CREATE POLICY "anon_select_otp_codes" ON otp_codes FOR SELECT
  TO anon, authenticated USING (true);
