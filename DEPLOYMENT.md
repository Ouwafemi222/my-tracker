# Deploying two live websites (Simple + Pro)

One codebase, **two deployments**, **two URLs**. Use the same Supabase project on both so users sign in once and see the same data.

| Deployment | Env mode | Product name |
| ---------- | -------- | -------------- |
| **Simple** | `simple` | Gratitude Expenses |
| **Pro** | `pro` | Personal Finance Gratitude Expenses Pro |

## 1. Environment files

Copy examples and fill in keys:

```bash
cp .env.simple.example .env.simple
cp .env.pro.example .env.pro
```

**Simple** (`.env.simple`):

- `VITE_APP_VARIANT=simple`
- `VITE_PRO_APP_URL` = public URL of your **Pro** site (used by “Upgrade to My Tracker Pro”)

**Pro** (`.env.pro`):

- `VITE_APP_VARIANT=pro`

Both need the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### Vercel environment variables (important)

In **Project → Settings → Environment Variables**, add (for **Production**, **Preview**, and **Development**):

| Name | Example value |
| ---- | ------------- |
| `VITE_SUPABASE_URL` | `https://wnvndwxwdyenhhulypem.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` (anon public key) |

**Do not** wrap values in quotes. **Redeploy** after saving — Vite bakes env vars in at **build** time.

Simple site also needs `VITE_APP_VARIANT=simple` and `VITE_PRO_APP_URL=https://your-pro-project.vercel.app`.

Pro site needs `VITE_APP_VARIANT=pro`.

A blank white page usually means `VITE_SUPABASE_URL` is missing or malformed (must start with `https://`).

## 2. Build commands

```bash
npm install

# Simple tracker (main site)
npm run build:simple

# Pro tracker
npm run build:pro
```

Output is `dist/` each time — upload **separate** `dist` folders to **separate** hosts or projects.

## 3. Local testing (two ports)

Terminal 1 — Simple:

```bash
npm run dev:simple
# default http://localhost:5173 — set VITE_PRO_APP_URL=http://localhost:5174 in .env.simple
```

Terminal 2 — Pro:

```bash
npm run dev:pro
# vite --port 5174 is configured in dev:pro script
```

Sign in on Simple → click **Upgrade to My Tracker Pro** → opens Pro URL.

## 4. Hosting examples

- **Netlify / Vercel**: create **two projects** from the same GitHub repo.
  - Project A: build command `npm run build:simple`, env vars from `.env.simple`
  - Project B: build command `npm run build:pro`, env vars from `.env.pro`
- Set Simple’s `VITE_PRO_APP_URL` to Project B’s URL **before** building Simple.

## 5. Feature split

**Simple:** daily overview, record, activity, settings, profile, upgrade CTA.

**Pro:** everything above plus weekly/monthly/custom ranges, charts, monthly budget, CSV export.

## 6. Git branches (optional)

You can still keep `version-1` / `version-2` in git for history; **production** should use `VITE_APP_VARIANT` builds from the main branch instead of two unrelated codebases.
