import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-import-token',
}

const VALID_TYPES = new Set([
  'earned_income',
  'other_income',
  'expense',
  'internal_transfer',
])

function parseNairaToKobo(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value * 100)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().replace(/,/g, '').replace(/₦/g, '')
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
    const [whole, frac = ''] = trimmed.split('.')
    const kobo = Number(whole) * 100 + Number((frac + '00').slice(0, 2))
    return kobo > 0 ? kobo : null
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const importToken = req.headers.get('x-import-token')?.trim()
  if (!importToken) {
    return new Response(JSON.stringify({ error: 'Missing x-import-token header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey)

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('import_token', importToken)
    .maybeSingle()

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: 'Invalid import token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: { transactions?: unknown[]; source?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!Array.isArray(body.transactions) || body.transactions.length === 0) {
    return new Response(JSON.stringify({ error: 'transactions array is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (body.transactions.length > 200) {
    return new Response(JSON.stringify({ error: 'Max 200 transactions per request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const rows: Record<string, unknown>[] = []
  const errors: string[] = []

  for (let i = 0; i < body.transactions.length; i++) {
    const t = body.transactions[i] as Record<string, unknown>
    const type = String(t.type ?? '')
    if (!VALID_TYPES.has(type)) {
      errors.push(`Row ${i + 1}: invalid type`)
      continue
    }
    let kobo: number | null = null
    if (typeof t.amount_kobo === 'number' && t.amount_kobo > 0) {
      kobo = Math.round(t.amount_kobo)
    } else {
      kobo =
        parseNairaToKobo(t.amount_naira) ??
        parseNairaToKobo(t.amount)
    }
    if (kobo === null) {
      errors.push(`Row ${i + 1}: invalid amount`)
      continue
    }
    const occurredAt = String(t.occurred_at ?? t.date ?? '')
    if (!occurredAt || Number.isNaN(Date.parse(occurredAt))) {
      errors.push(`Row ${i + 1}: invalid occurred_at (use ISO date-time)`)
      continue
    }
    rows.push({
      id: crypto.randomUUID(),
      user_id: profile.id,
      type,
      amount_kobo: kobo,
      occurred_at: new Date(occurredAt).toISOString(),
      category: String(t.category ?? 'Other expense').slice(0, 120),
      account: String(t.account ?? 'Cash').slice(0, 120),
      counterparty: String(t.counterparty ?? t.sender ?? t.recipient ?? '').slice(0, 200),
      description: String(t.description ?? body.source ?? 'ChatGPT import').slice(0, 500),
    })
  }

  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid transactions', details: errors }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { error: insertError } = await admin.from('transactions').insert(rows)
  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({
      ok: true,
      imported: rows.length,
      skipped: errors.length,
      details: errors.length ? errors : undefined,
      user_id: profile.id,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
