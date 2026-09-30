import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { parseImportBatch } from './importExpensesCore.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-import-token, x-idempotency-key',
}

const MAX_ROWS = 200
const SERVICE_VERSION = 2

function newRequestId(): string {
  return crypto.randomUUID()
}

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  requestId: string,
): Response {
  return new Response(JSON.stringify({ ...body, request_id: requestId }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
    },
  })
}

function hasSupabaseGatewayAuth(req: Request): boolean {
  const auth = req.headers.get('authorization')?.trim() ?? ''
  const apikey = req.headers.get('apikey')?.trim() ?? ''
  if (auth.toLowerCase().startsWith('bearer ') && auth.length > 12) return true
  if (apikey.length > 20) return true
  return false
}

function resolveIdempotencyKey(req: Request, body: Record<string, unknown>): string | null {
  const header = req.headers.get('x-idempotency-key')?.trim()
  if (header) return header.slice(0, 200)
  const fromBody = body.import_id ?? body.idempotency_key
  if (typeof fromBody === 'string' && fromBody.trim()) {
    return fromBody.trim().slice(0, 200)
  }
  return null
}

Deno.serve(async (req) => {
  const requestId = newRequestId()

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { ...corsHeaders, 'X-Request-Id': requestId },
    })
  }

  if (req.method === 'GET') {
    return jsonResponse(
      200,
      {
        ok: true,
        service: 'import-expenses',
        version: SERVICE_VERSION,
        hint: 'POST JSON { transactions: [...] } with x-import-token and Authorization/apikey',
      },
      requestId,
    )
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'method_not_allowed' }, requestId)
  }

  if (!hasSupabaseGatewayAuth(req)) {
    return jsonResponse(
      401,
      {
        ok: false,
        error: 'missing_gateway_auth',
        hint: 'Send Authorization: Bearer <anon JWT> and/or apikey: <anon JWT>',
      },
      requestId,
    )
  }

  const importToken = req.headers.get('x-import-token')?.trim()
  if (!importToken) {
    return jsonResponse(401, { ok: false, error: 'missing_import_token' }, requestId)
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
    return jsonResponse(401, { ok: false, error: 'invalid_import_token' }, requestId)
  }

  let body: { transactions?: unknown[]; source?: string; import_id?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { ok: false, error: 'invalid_json' }, requestId)
  }

  const idempotencyKey = resolveIdempotencyKey(req, body as Record<string, unknown>)

  if (!Array.isArray(body.transactions) || body.transactions.length === 0) {
    return jsonResponse(400, { ok: false, error: 'transactions_required' }, requestId)
  }

  const parsed = parseImportBatch(body.transactions, {
    source: body.source,
    idempotencyKey,
    maxRows: MAX_ROWS,
  })

  if (!parsed.ok) {
    return jsonResponse(
      400,
      { ok: false, error: 'validation_failed', details: parsed.errors },
      requestId,
    )
  }

  const rpcRows = parsed.rows.map((row) => ({
    id: crypto.randomUUID(),
    type: row.type,
    amount_kobo: row.amountKobo,
    occurred_at: row.occurredAtIso,
    category: row.category,
    account: row.account,
    counterparty: row.counterparty,
    description: row.description,
    import_idempotency_key: idempotencyKey,
    import_row_key: idempotencyKey ? row.importRowKey : null,
  }))

  const { data: rpcResult, error: rpcError } = await admin.rpc('import_expenses_batch', {
    p_user_id: profile.id,
    p_idempotency_key: idempotencyKey,
    p_request_id: requestId,
    p_rows: rpcRows,
  })

  if (rpcError) {
    const msg = rpcError.message ?? 'import_failed'
    const status = msg.includes('INVALID_BATCH') ? 400 : 500
    console.error(
      JSON.stringify({
        request_id: requestId,
        user_id: profile.id,
        error: msg.slice(0, 200),
      }),
    )
    return jsonResponse(status, { ok: false, error: 'import_failed' }, requestId)
  }

  const result = (rpcResult ?? {}) as Record<string, unknown>
  return jsonResponse(
    200,
    {
      ok: true,
      imported: Number(result.imported ?? 0),
      skipped: Number(result.skipped ?? 0),
      duplicate: Boolean(result.duplicate),
    },
    requestId,
  )
})
