# Connect ChatGPT to upload expenses

Your Custom GPT (or automation) can POST structured transactions to your account.

## 1. Database

Run in Supabase SQL Editor (in order):

1. `supabase/SETUP_ALL.sql` (if not already done), **or** migrations `001` → `002` → `003`
2. `supabase/migrations/004_import_idempotency.sql` (idempotent imports + atomic batch RPC)

## 2. Deploy the Edge Function

Install [Supabase CLI](https://supabase.com/docs/guides/cli), then:

```bash
supabase login
supabase link --project-ref wnvndwxwdyenhhulypem
supabase functions deploy import-expenses --no-verify-jwt
```

`--no-verify-jwt` allows ChatGPT to call the function using your **import token** header (the function still validates `x-import-token`).

## 3. Create your upload key (website)

1. Sign in to **Gratitude Expenses** → **Settings**
2. Open **ChatGPT auto-upload**
3. Click **Create upload key** and copy it once (store in ChatGPT’s secret config)

## 4. Custom GPT Action

1. ChatGPT → **Explore GPTs** → your expense GPT → **Edit**
2. **Actions** → **Create new action**
3. Import schema from `docs/chatgpt-import-openapi.yaml` (or paste URL if hosted)
4. Set **Authentication** to **API Key**:
   - Type: **Custom**
   - Header: `x-import-token`
   - Value: your upload key from step 3

Also add headers (plugin / action must send **both** for reliable gateway access):

- `Authorization`: `Bearer YOUR_SUPABASE_ANON_KEY`
- `apikey`: `YOUR_SUPABASE_ANON_KEY` (same anon JWT, no `Bearer` prefix)

Use the **anon public** key from Supabase → Project Settings → API.

### Idempotent retries (recommended for large spreadsheets)

Send a stable batch key so retries do not duplicate rows:

- Header: `x-idempotency-key: sep-2026-1-19-v1` **or** JSON field `"import_id": "sep-2026-1-19-v1"`
- Per row: `"row_id": "sep-01-lunch"` (stable within the spreadsheet)

Re-posting the **same** idempotency key returns `{ "ok": true, "duplicate": true, ... }` without inserting again.

### Plugin / MCP bridge (ChatGPT hosted)

If you see **“Import outcome unknown”**, the bridge often timed out (30s) or aborted on redirects **before** Supabase responded. That does **not** prove rows were saved—check **Activity** on the website first.

- URL must be exactly `https://wnvndwxwdyenhhulypem.supabase.co/functions/v1/import-expenses` (HTTPS, no trailing redirect).
- Split large sheets into batches of **≤25 rows** per call to stay under bridge timeouts.
- Optional: `GET` the same URL for a quick health check (`{ "ok": true, "service": "import-expenses" }`).

## 5. GPT instructions (add to system prompt)

After you extract expenses from the user’s email, call `importExpenses` with JSON like:

```json
{
  "source": "Daily email summary",
  "transactions": [
    {
      "type": "expense",
      "amount_naira": 4500,
      "occurred_at": "2026-03-30T09:30:00+01:00",
      "category": "Transport",
      "account": "Opay",
      "description": "Uber to office"
    }
  ]
}
```

Rules:

- `amount_naira` must be positive
- Use `expense`, `earned_income`, `other_income`, or `internal_transfer`
- Internal transfers must not be counted as income elsewhere
- Use ISO dates in Africa/Lagos (`+01:00`)

## 6. Test

Ask your GPT: “Import today’s expenses from my email summary.”  
Then refresh **Overview** on the website.

## Security

- Regenerate the upload key if it leaks
- Never put the Supabase **service role** key in ChatGPT
- Only the **anon** key goes in `Authorization`; your personal **import token** identifies your account
