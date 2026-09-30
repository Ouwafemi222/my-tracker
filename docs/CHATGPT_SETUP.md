# Connect ChatGPT to upload expenses

Your Custom GPT (or automation) can POST structured transactions to your account.

## 1. Database

Run in Supabase SQL Editor:

`supabase/migrations/003_chatgpt_import_token.sql`

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

Also add a static header in the action (if the UI allows):

- `Authorization`: `Bearer YOUR_SUPABASE_ANON_KEY`

(Supabase requires `Authorization` on Edge Functions; use the **anon public** key from Supabase → API.)

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
