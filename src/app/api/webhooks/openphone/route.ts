import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const OPENPHONE_API = 'https://api.openphone.com/v1'

// ---- pure flow utilities (mirrored from worker/src) ----

function scoreIntent(
  transcript: Array<{ direction: string; body: string }>,
  triggers: string[]
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

function buildSummary(transcript: Array<{ direction: string; body: string }>): string {
  return transcript
    .filter((m) => m.direction === 'inbound')
    .map((m) => m.body)
    .join('; ')
    .slice(0, 200)
}

function fill(
  template: string,
  vars: { business_name?: string; owner_name?: string; booking_link?: string }
): string {
  return template
    .replace(/\{business_name\}/g, vars.business_name ?? '')
    .replace(/\{owner_name\}/g, vars.owner_name ?? '')
    .replace(/\{booking_link\}/g, vars.booking_link ?? '')
}

// ---- OpenPhone API ----

async function opSend(
  apiKey: string,
  fromPhoneNumberId: string,
  to: string,
  content: string
): Promise<void> {
  const res = await fetch(`${OPENPHONE_API}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromPhoneNumberId, to: [to], content }),
  })
  if (!res.ok) {
    throw new Error(`OpenPhone API ${res.status}: ${await res.text()}`)
  }
}

// ---- DB row types ----

interface ClientRow {
  id: string
  business_name: string
  owner_name: string
  owner_notify_number: string
  openphone_number_id: string
  openphone_api_key: string
  booking_link: string | null
  status: string
}

interface FlowRow {
  id: string
  client_id: string
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

type DB = ReturnType<typeof createAdminClient>

// ---- call.completed handler ----

async function handleMissedCall(
  call: Record<string, unknown>,
  db: DB
): Promise<void> {
  // Only act on incoming calls that were not answered
  if (call.direction !== 'incoming' || call.status === 'completed') return

  const phoneNumberId = call.phoneNumberId as string
  const callerNumber = call.from as string
  if (!phoneNumberId || !callerNumber) return

  const { data: clientData } = await db
    .from('clients')
    .select('id,business_name,owner_name,owner_notify_number,openphone_number_id,openphone_api_key,booking_link,status')
    .eq('openphone_number_id', phoneNumberId)
    .eq('status', 'active')
    .single()
  const client = clientData as ClientRow | null

  if (!client?.openphone_api_key) return

  const { data: flowData } = await db
    .from('flows')
    .select('*')
    .eq('client_id', client.id)
    .single()
  const flow = flowData as FlowRow | null

  if (!flow) return

  // Deduplicate — don't open a second lead if one is already in progress
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
  const lead = leadData as LeadRow | null

  if (!lead) return

  const opening = fill(flow.opening_message, {
    business_name: client.business_name,
    owner_name: client.owner_name,
    booking_link: client.booking_link ?? '',
  })

  await opSend(client.openphone_api_key, phoneNumberId, callerNumber, opening)

  const entry = { direction: 'outbound', body: opening, sent_at: new Date().toISOString() }

  await db.from('messages').insert({
    lead_id: lead.id,
    client_id: client.id,
    direction: 'outbound',
    body: opening,
  })

  await db.from('leads').update({ transcript: [entry] }).eq('id', lead.id)
}

// ---- message.received handler ----

async function handleInboundSms(
  message: Record<string, unknown>,
  db: DB
): Promise<void> {
  const phoneNumberId = message.phoneNumberId as string
  const callerNumber = message.from as string
  const body = (message.body as string) ?? ''
  if (!phoneNumberId || !callerNumber) return

  const { data: clientData2 } = await db
    .from('clients')
    .select('id,business_name,owner_name,owner_notify_number,openphone_number_id,openphone_api_key,booking_link,status')
    .eq('openphone_number_id', phoneNumberId)
    .eq('status', 'active')
    .single()
  const client = clientData2 as ClientRow | null

  if (!client?.openphone_api_key) return

  const { data: leadData2 } = await db
    .from('leads')
    .select('*')
    .eq('client_id', client.id)
    .eq('caller_number', callerNumber)
    .eq('status', 'in_progress')
    .single()
  const lead = leadData2 as LeadRow | null

  if (!lead) return

  const { data: flowData2 } = await db
    .from('flows')
    .select('*')
    .eq('client_id', client.id)
    .single()
  const flow = flowData2 as FlowRow | null

  if (!flow) return

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
  const normalizedBody = body.trim().toUpperCase()

  const send = (content: string) =>
    opSend(client.openphone_api_key, phoneNumberId, callerNumber, content)

  const logOut = async (content: string) => {
    await db.from('messages').insert({
      lead_id: lead.id,
      client_id: client.id,
      direction: 'outbound',
      body: content,
    })
    return { direction: 'outbound', body: content, sent_at: new Date().toISOString() }
  }

  if (currentIndex === -1) {
    if (normalizedBody === 'STOP') {
      await db.from('leads').update({
        status: 'lost',
        completed_at: new Date().toISOString(),
        transcript: updatedTranscript,
      }).eq('id', lead.id)
      return
    }

    if (normalizedBody !== 'YES') {
      const nudge = 'Reply YES to continue or STOP to opt out.'
      await send(nudge)
      const outEntry = await logOut(nudge)
      await db.from('leads').update({ transcript: [...updatedTranscript, outEntry] }).eq('id', lead.id)
      return
    }

    const question = flow.questions[0]
    await send(question.message)
    const outEntry = await logOut(question.message)
    await db.from('leads').update({
      current_question_index: 1,
      transcript: [...updatedTranscript, outEntry],
    }).eq('id', lead.id)
    return
  }

  if (currentIndex < totalQuestions) {
    const question = flow.questions[currentIndex]
    await send(question.message)
    const outEntry = await logOut(question.message)
    await db.from('leads').update({
      current_question_index: currentIndex + 1,
      transcript: [...updatedTranscript, outEntry],
    }).eq('id', lead.id)
    return
  }

  // All questions answered — score and close
  const allTranscript = [...updatedTranscript]
  const intent = scoreIntent(allTranscript, flow.high_intent_triggers)
  const summary = buildSummary(allTranscript)

  let replyMessage: string
  let newStatus: string

  if (intent === 'high') {
    replyMessage = fill(flow.high_intent_message, {
      business_name: client.business_name,
      owner_name: client.owner_name,
      booking_link: client.booking_link ?? '',
    })
    newStatus = 'qualified'
    const ownerAlert = `New lead from ${callerNumber}: ${summary}. Urgency: HIGH.`
    await opSend(client.openphone_api_key, phoneNumberId, client.owner_notify_number, ownerAlert)
  } else if (intent === 'medium') {
    replyMessage = fill(flow.standard_message, {
      business_name: client.business_name,
      owner_name: client.owner_name,
      booking_link: client.booking_link ?? '',
    })
    newStatus = 'qualified'
  } else {
    replyMessage = flow.low_intent_message
    newStatus = 'lost'
  }

  await send(replyMessage)
  const outEntry = await logOut(replyMessage)
  await db.from('leads').update({
    status: newStatus,
    intent_level: intent,
    completed_at: new Date().toISOString(),
    transcript: [...allTranscript, outEntry],
  }).eq('id', lead.id)
}

// ---- Route handler ----

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const { type, data } = body as { type?: string; data?: { object?: Record<string, unknown> } }
  if (!type || !data?.object) {
    return NextResponse.json({ ok: true })
  }

  const db = createAdminClient()

  try {
    if (type === 'call.completed') {
      await handleMissedCall(data.object, db)
    } else if (type === 'message.received') {
      await handleInboundSms(data.object, db)
    }
  } catch (err) {
    // Log errors but always return 200 so OpenPhone doesn't retry
    await db.from('errors').insert({
      context: `openphone_webhook_${type}`,
      error_message: err instanceof Error ? err.message : String(err),
    })
  }

  return NextResponse.json({ ok: true })
}
