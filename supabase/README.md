# Supabase setup (project `wnvndwxwdyenhhulypem`)

## 1. Email sign-in (no confirmation)

In [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **Providers** → **Email**:

- Enable **Email** provider
- Turn **Confirm email** **OFF** (users can sign in immediately after sign-up)

You can disable **Anonymous sign-ins** if you only want registered users.

## 2. Create tables

Open **SQL Editor** → **New query**.

**Easiest (recommended):** paste and run the entire file **`supabase/SETUP_ALL.sql`** once.

**Or run in order:**

1. `supabase/migrations/001_gratitude_expenses_schema.sql`
2. `supabase/migrations/002_profiles_and_auth.sql` ← creates `profiles` (required before 003)
3. `supabase/migrations/003_chatgpt_import_token.sql`

If you see `relation "public.profiles" does not exist`, you skipped step 2 — run **002** or use **SETUP_ALL.sql**.

For ChatGPT uploads, deploy the Edge Function (see `docs/CHATGPT_SETUP.md`).

This creates:

| Table | Purpose |
| ----- | ------- |
| `public.transactions` | All transaction rows (amounts in kobo) |
| `public.user_settings` | Monthly budget and theme per user |
| `public.profiles` | Display name and email per account |

Row Level Security limits each signed-in user to their own rows.

## 3. App environment

Copy `.env.example` to `.env.local` and set:

- `VITE_SUPABASE_URL` = `https://wnvndwxwdyenhhulypem.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = your **anon public** key only

Never put the **service role** or **secret** keys in the frontend or in git.

Restart the dev server after changing env vars.
