import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Yeastar P-Series Event 30012 = Call End Details
// Sent for every call that ends. We filter for missed inbound calls.
// https://help.yeastar.com/en/p-series-cloud-edition/event-list/30012-call-end-details.html

interface YeastarCallEvent {
  event: number // 30012
  callid?: string
  from?: string        // caller number
  to?: string          // dialed number (client's business number)
  callDirection?: number // 0 = inbound, 1 = outbound, 2 = internal
  callStatus?: number  // 0 = answered, 3 = unanswered/missed
  duration?: number    // 0 for missed calls
  [key: string]: unknown
}

const YEASTAR_API_BASE = process.env.YEASTAR_API_BASE ?? ''

async function yeastarSendSMS(
  clientApiKey: string,
  fromNumber: string,
  toNumber: string,
  content: string,
): Promise<void> {
  // Yeastar P-Series SMS API — POST /api/v1.0.0/sms/send
  // Auth: token in X-Authorization header (API key)
  const url = `${YEASTAR_API_BASE}/api/v1.0.0/sms/send`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Authorization': clientApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromNumber, to: toNumber, message: content }),
  })
  if (!res.ok) {
    throw new Error(`Yeastar SMS API ${res.status}: ${await res.text()}`)
  }
}

function scoreIntent(
  transcript: Array<{ direction: string; body: string }>,
  triggers: string[],
): 'high' | 'medium' | 'low' {
  const inboundText = transcript
    .filter((m) => m.direction === 'inbound')
    .map((m) => m.body.toLowerCase())
    .join(' ')
  const lowTriggers = triggers.map((t) => t.toLowerCase())
  if (lowTriggers.some((t) => inboundText.includes(t))) return 'high'
  const msgs = transcript.filter((m) => m.direction === 'inbound')
  const words = inboundText.split(/\s+/).filter(Boolean).length
  const avgLen = msgs.length > 0
    ? msgs.reduce((s, m) => s + m.body.length, 0) / msgs.length
    : 0
  if (words > 5 && avgLen > 8) return 'medium'
  return 'low'
}

function fill(
  template: string,
  vars: { business_name?: string; owner_name?: string; booking_link?: string },
): string {
  return template
    .replace(/\{business_name\}/g, vars.business_name ?? '')
    .replace(/\{owner_name\}/g, vars.owner_name ?? '')
    .replace(/\{booking_link\}/g, vars.booking_link ?? '')
}

export async function POST(req: Request) {
  let body: YeastarCallEvent
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  // Only handle Event 30012 (Call End Details)
  if (body.event !== 30012) {
    return NextResponse.json({ ok: true })
  }

  // Only missed inbound calls (direction=0, status=3 unanswered, duration=0)
  const isMissedInbound =
    body.callDirection === 0 &&
    (body.callStatus === 3 || body.duration === 0)

  if (!isMissedInbound) {
    return NextResponse.json({ ok: true })
  }

  const callerNumber = body.from
  const businessNumber = body.to
  if (!callerNumber || !businessNumber) {
    return NextResponse.json({ ok: true })
  }

  const db = createAdminClient()

  try {
    // Find the client by their VoIP phone number
    const { data: clientData } = await db
      .from('clients')
      .select('id,business_name,owner_name,owner_notify_number,provider_phone_number,provider_api_key,booking_link,subscription_status,grace_period_ends_at')
      .eq('voip_provider', 'yeastar')
      .eq('provider_phone_number', businessNumber)
      .single()

    if (!clientData) return NextResponse.json({ ok: true })

    // Subscription check — support grace period
    if (clientData.subscription_status === 'cancelled') {
      return NextResponse.json({ ok: true })
    }
    if (clientData.subscription_status === 'past_due') {
      const graceEnds = clientData.grace_period_ends_at
      if (!graceEnds || new Date(graceEnds) < new Date()) {
        return NextResponse.json({ ok: true })
      }
    }

    if (!clientData.provider_api_key) return NextResponse.json({ ok: true })

    const { data: flowData } = await db
      .from('flows')
      .select('*')
      .eq('client_id', clientData.id)
      .single()

    if (!flowData) return NextResponse.json({ ok: true })

    // Deduplicate — skip if lead already in progress with this caller
    const { data: existing } = await db
      .from('leads')
      .select('id')
      .eq('client_id', clientData.id)
      .eq('caller_number', callerNumber)
      .eq('status', 'in_progress')
      .maybeSingle()

    if (existing) return NextResponse.json({ ok: true })

    const { data: leadData } = await db
      .from('leads')
      .insert({
        client_id: clientData.id,
        caller_number: callerNumber,
        status: 'in_progress',
        current_question_index: -1,
        transcript: [],
      })
      .select()
      .single()

    if (!leadData) return NextResponse.json({ ok: true })

    const opening = fill(flowData.opening_message, {
      business_name: clientData.business_name,
      owner_name: clientData.owner_name,
      booking_link: clientData.booking_link ?? '',
    })

    await yeastarSendSMS(
      clientData.provider_api_key,
      businessNumber,
      callerNumber,
      opening,
    )

    const entry = { direction: 'outbound', body: opening, sent_at: new Date().toISOString() }

    await db.from('messages').insert({
      lead_id: leadData.id,
      client_id: clientData.id,
      direction: 'outbound',
      body: opening,
    })

    await db.from('leads').update({ transcript: [entry] }).eq('id', leadData.id)
  } catch (err) {
    await db.from('errors').insert({
      context: 'yeastar_webhook',
      error_message: err instanceof Error ? err.message : String(err),
    })
  }

  return NextResponse.json({ ok: true })
}
