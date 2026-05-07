/**
 * Shared missed-call flow logic.
 *
 * All provider webhook handlers call the two exported functions here instead
 * of duplicating the lead-creation / conversation logic.
 *
 * handleMissedCall  — fired when a provider reports a missed inbound call.
 * handleInboundSMS  — fired when the caller replies via SMS.
 *
 * Both functions accept a `sendSMS` callback so the caller supplies the
 * provider-specific send implementation without this module knowing about it.
 */

import { createAdminClient } from '@/lib/supabase/server'

type DB = ReturnType<typeof createAdminClient>

// ── DB row shapes ──────────────────────────────────────────────────────────

export interface ClientRow {
  id: string
  business_name: string
  owner_name: string
  owner_email: string
  owner_notify_number: string
  provider_phone_number: string | null
  provider_phone_number_id: string | null
  booking_link: string | null
  subscription_status: string
  grace_period_ends_at: string | null
}

interface FlowRow {
  id: string
  opening_message: string
  questions: Array<{ id: number; message: string; field: string }>
  high_intent_triggers: string[]
  high_intent_message: string
  standard_message: string
  low_intent_message: string
}

interface LeadRow {
  id: string
  client_id: string
  caller_number: string
  status: string
  current_question_index: number
  transcript: Array<{ direction: string; body: string; sent_at: string }>
}

// ── helpers ────────────────────────────────────────────────────────────────

export function isSubscriptionActive(client: Pick<ClientRow, 'subscription_status' | 'grace_period_ends_at'>): boolean {
  if (client.subscription_status === 'active') return true
  if (client.subscription_status === 'past_due') {
    const graceEnds = client.grace_period_ends_at
    return !!graceEnds && new Date(graceEnds) > new Date()
  }
  return false
}

function fill(
  template: string,
  vars: { business_name: string; owner_name: string; booking_link: string },
): string {
  return template
    .replace(/\{business_name\}/g, vars.business_name)
    .replace(/\{owner_name\}/g, vars.owner_name)
    .replace(/\{booking_link\}/g, vars.booking_link)
}

function scoreIntent(
  transcript: Array<{ direction: string; body: string }>,
  triggers: string[],
): 'high' | 'medium' | 'low' {
  const inboundText = transcript
    .filter((m) => m.direction === 'inbound')
    .map((m) => m.body.toLowerCase())
    .join(' ')

  if (triggers.map((t) => t.toLowerCase()).some((t) => inboundText.includes(t))) {
    return 'high'
  }

  const msgs = transcript.filter((m) => m.direction === 'inbound')
  const avgLen = msgs.length > 0
    ? msgs.reduce((s, m) => s + m.body.length, 0) / msgs.length
    : 0
  const words = inboundText.split(/\s+/).filter(Boolean).length

  return words > 5 && avgLen > 8 ? 'medium' : 'low'
}

function summary(transcript: Array<{ direction: string; body: string }>): string {
  return transcript
    .filter((m) => m.direction === 'inbound')
    .map((m) => m.body)
    .join('; ')
    .slice(0, 200)
}

// ── exported functions ─────────────────────────────────────────────────────

/**
 * Find a client by their VoIP provider + business phone number.
 * Returns null if not found or subscription is not active.
 */
export async function findActiveClient(
  db: DB,
  voipProvider: string,
  businessNumber: string,
): Promise<ClientRow | null> {
  const { data } = await db
    .from('clients')
    .select(
      'id,business_name,owner_name,owner_email,owner_notify_number,' +
      'provider_phone_number,provider_phone_number_id,booking_link,' +
      'subscription_status,grace_period_ends_at',
    )
    .eq('voip_provider', voipProvider)
    .eq('provider_phone_number', businessNumber)
    .single()

  if (!data) return null
  const row = data as unknown as ClientRow
  if (!isSubscriptionActive(row)) return null
  return row
}

/**
 * Called when a provider signals a missed inbound call.
 *
 * @param sendSMS  Provider-specific SMS sender.
 *                 Receives (to, message) — the "from" context is already
 *                 embedded in the closure by the caller.
 */
export async function handleMissedCall(
  db: DB,
  client: ClientRow,
  callerNumber: string,
  sendSMS: (to: string, message: string) => Promise<void>,
): Promise<void> {
  const { data: flowData } = await db
    .from('flows')
    .select('*')
    .eq('client_id', client.id)
    .single()

  const flow = flowData as FlowRow | null
  if (!flow) return

  // Dedup — don't re-open a lead already in progress with this caller
  const { data: existing } = await db
    .from('leads')
    .select('id')
    .eq('client_id', client.id)
    .eq('caller_number', callerNumber)
    .eq('status', 'in_progress')
    .maybeSingle()

  if (existing) return

  const { data: leadData } = await db
    .from('leads')
    .insert({
      client_id: client.id,
      caller_number: callerNumber,
      status: 'in_progress',
      current_question_index: -1,
      transcript: [],
    })
    .select()
    .single()

  if (!leadData) return

  const opening = fill(flow.opening_message, {
    business_name: client.business_name,
    owner_name: client.owner_name,
    booking_link: client.booking_link ?? '',
  })

  await sendSMS(callerNumber, opening)

  const entry = { direction: 'outbound', body: opening, sent_at: new Date().toISOString() }

  await Promise.all([
    db.from('messages').insert({
      lead_id: leadData.id,
      client_id: client.id,
      direction: 'outbound',
      body: opening,
    }),
    db.from('leads').update({ transcript: [entry] }).eq('id', leadData.id),
  ])
}

/**
 * Called when an inbound SMS arrives from a caller who is mid-flow.
 *
 * @param sendSMS  Provider-specific SMS sender.
 */
export async function handleInboundSMS(
  db: DB,
  client: ClientRow,
  callerNumber: string,
  body: string,
  sendSMS: (to: string, message: string) => Promise<void>,
): Promise<void> {
  const { data: leadData } = await db
    .from('leads')
    .select('*')
    .eq('client_id', client.id)
    .eq('caller_number', callerNumber)
    .eq('status', 'in_progress')
    .single()

  const lead = leadData as LeadRow | null
  if (!lead) return

  const { data: flowData } = await db
    .from('flows')
    .select('*')
    .eq('client_id', client.id)
    .single()

  const flow = flowData as FlowRow | null
  if (!flow) return

  // Persist inbound message
  await db.from('messages').insert({
    lead_id: lead.id,
    client_id: client.id,
    direction: 'inbound',
    body,
  })

  const inboundEntry = { direction: 'inbound', body, sent_at: new Date().toISOString() }
  const updatedTranscript = [...(lead.transcript ?? []), inboundEntry]
  await db.from('leads').update({ transcript: updatedTranscript }).eq('id', lead.id)

  const totalQuestions = flow.questions.length
  const currentIndex = lead.current_question_index ?? -1
  const normalized = body.trim().toUpperCase()

  const logAndSend = async (content: string) => {
    await sendSMS(callerNumber, content)
    await db.from('messages').insert({
      lead_id: lead.id,
      client_id: client.id,
      direction: 'outbound',
      body: content,
    })
    return { direction: 'outbound' as const, body: content, sent_at: new Date().toISOString() }
  }

  // ── Step 0: waiting for YES / STOP ────────────────────────────────────
  if (currentIndex === -1) {
    if (normalized === 'STOP') {
      await db.from('leads').update({
        status: 'lost',
        completed_at: new Date().toISOString(),
        transcript: updatedTranscript,
      }).eq('id', lead.id)
      return
    }

    if (normalized !== 'YES') {
      const nudge = 'Reply YES to continue or STOP to opt out.'
      const outEntry = await logAndSend(nudge)
      await db.from('leads').update({ transcript: [...updatedTranscript, outEntry] }).eq('id', lead.id)
      return
    }

    if (totalQuestions === 0) {
      // No questions — score and close immediately
      await closeLead(db, lead, flow, client, updatedTranscript, logAndSend)
      return
    }

    const q = flow.questions[0]
    const outEntry = await logAndSend(q.message)
    await db.from('leads').update({
      current_question_index: 1,
      transcript: [...updatedTranscript, outEntry],
    }).eq('id', lead.id)
    return
  }

  // ── Steps 1…N: answering questions ───────────────────────────────────
  if (currentIndex < totalQuestions) {
    const q = flow.questions[currentIndex]
    const outEntry = await logAndSend(q.message)
    await db.from('leads').update({
      current_question_index: currentIndex + 1,
      transcript: [...updatedTranscript, outEntry],
    }).eq('id', lead.id)
    return
  }

  // ── All questions answered — score and close ──────────────────────────
  await closeLead(db, lead, flow, client, updatedTranscript, logAndSend)
}

async function closeLead(
  db: DB,
  lead: LeadRow,
  flow: FlowRow,
  client: ClientRow,
  transcript: Array<{ direction: string; body: string; sent_at: string }>,
  logAndSend: (content: string) => Promise<{ direction: 'outbound'; body: string; sent_at: string }>,
) {
  const intent = scoreIntent(transcript, flow.high_intent_triggers)
  const vars = {
    business_name: client.business_name,
    owner_name: client.owner_name,
    booking_link: client.booking_link ?? '',
  }

  let replyMessage: string
  let newStatus: 'qualified' | 'lost'

  if (intent === 'high') {
    replyMessage = fill(flow.high_intent_message, vars)
    newStatus = 'qualified'
    // Alert the business owner
    const alert = `New lead from ${lead.caller_number}: ${summary(transcript)}. Urgency: HIGH.`
    // Owner alert is fire-and-forget — don't let a send failure block the lead close
    db.from('messages').insert({
      lead_id: lead.id,
      client_id: client.id,
      direction: 'outbound',
      body: alert,
    })
  } else if (intent === 'medium') {
    replyMessage = fill(flow.standard_message, vars)
    newStatus = 'qualified'
  } else {
    replyMessage = flow.low_intent_message
    newStatus = 'lost'
  }

  const outEntry = await logAndSend(replyMessage)
  await db.from('leads').update({
    status: newStatus,
    intent_level: intent,
    completed_at: new Date().toISOString(),
    transcript: [...transcript, outEntry],
  }).eq('id', lead.id)
}
