# Astro Palm

AI palmistry web app — *Your future, written in your hands.*
Next.js 14 (App Router) · Tailwind · Framer Motion · Supabase (Auth, Postgres, Storage) · OpenAI GPT-4o Vision · Razorpay · Vercel.

## Setup

1. `npm install`
2. Copy `.env.example` → `.env.local` and fill in the keys.
3. In Supabase → SQL Editor, run `supabase/migrations/001_init.sql` (tables, RLS, triggers, storage bucket, credit functions).
4. Supabase → Authentication → URL Configuration: set **Site URL** to your deployed URL and add `https://<your-domain>/auth/callback` and `http://localhost:3000/auth/callback` to **Redirect URLs**.
5. (Google sign-in) Supabase → Authentication → Providers → Google: add a Google Cloud OAuth client ID/secret.
6. `npm run dev`

## How usage is enforced

- Free tier: 1 reading + 1 chat question per account (lifetime).
- Each ₹99 payment adds 1 credit = 1 reading + unlimited chat on that reading.
- All limits are enforced server-side in Postgres functions (`create_reading`, `consume_free_chat`, `complete_payment`) executed with the service role; clients can only read their own rows (RLS).
- Credits are only added after the Razorpay HMAC signature is verified server-side.
