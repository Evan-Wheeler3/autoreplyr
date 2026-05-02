import type { Env, Client, Flow, Lead } from './types'
import { SupabaseClient } from './supabase'
import { TwilioClient } from './twilio'
import { scoreIntent, buildSummary } from './intent'
import { fill } from './template'

function twimlOk(): Response {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  })
}

function twimlDial(ringThroughNumber: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial action="/no-answer" timeout="20">${ringThroughNumber}</Dial></Response>`
  return new Response(xml, { headers: { 'Content-Type': 'text/xml' } })
}

function ok200(): Response {
  return new Response('OK', { status: 200 })
}

async function parseFormBody(req: Request): Promise<Record<string, string>> {
  const text = await req.text()
  const params: Record<string, string> = {}
  for (const pair of text.split('&')) {
    const [k, v] = pair.split('=')
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? '')
  }
  return params
}

async function sendLeadSms(
  client: Client,
  flow: Flow,
  callerNumber: string,
  twilioNumber: string,
  db: SupabaseClient,
  twilio: TwilioClient
): Promise<void> {
  const lead = await db.insert<Lead>('leads', {
    client_id: client.id,
    caller_number: callerNumber,
    status: 'in_progress',
    current_question_index: -1,
    transcript: [],
  })

  if (!lead) return

  const openingMessage = fill(flow.opening_message, {
    business_name: client.business_name,
    owner_name: client.owner_name,
    booking_link: client.booking_link ?? '',
  })

  await twilio.sendSmsWithRetry(callerNumber, twilioNumber, openingMessage, (err) =>
    db.logError('send_opening_sms', err, client.id, lead.id)
  )

  await db.insert('messages', {
    lead_id: lead.id,
    client_id: client.id,
    direction: 'outbound',
    body: openingMessage,
  })

  await db.update('leads', { id: `eq.${lead.id}` }, {
    transcript: [{ direction: 'outbound', body: openingMessage, sent_at: new Date().toISOString() }],
  })
}

// Fires when an incoming call arrives on a ported number.
// If the client has a ring_through_number, Twilio dials it and waits for answer.
// If not, SMS fires immediately.
async function handleIncomingCall(
  params: Record<string, string>,
  db: SupabaseClient,
  twilio: TwilioClient
): Promise<Response> {
  const twilioNumber = params['To'] ?? params['Called']
  const callerNumber = params['From'] ?? params['Caller']

  if (!twilioNumber || !callerNumber) return twimlOk()

  const client = await db.select<Client>('clients', {
    twilio_number: `eq.${twilioNumber}`,
    status: 'eq.active',
    select: 'id,business_name,owner_name,owner_notify_number,twilio_number,ring_through_number,booking_link,status',
  })

  if (!client) return twimlOk()

  const flow = await db.select<Flow>('flows', { client_id: `eq.${client.id}` })
  if (!flow) return twimlOk()

  if (client.ring_through_number) {
    // Ring the owner's phone — /no-answer fires if they don't pick up
    return twimlDial(client.ring_through_number)
  }

  // No ring-through configured — fire SMS immediately
  await sendLeadSms(client, flow, callerNumber, twilioNumber, db, twilio)
  return twimlOk()
}

// Fires when a Dial completes without being answered.
// DialCallStatus will be 'no-answer', 'busy', 'failed', or 'canceled'.
// Only send SMS if the call was not answered.
async function handleNoAnswer(
  params: Record<string, string>,
  db: SupabaseClient,
  twilio: TwilioClient
): Promise<void> {
  const dialStatus = params['DialCallStatus']
  if (dialStatus === 'completed') return

  const twilioNumber = params['To'] ?? params['Called']
  const callerNumber = params['From'] ?? params['Caller']

  if (!twilioNumber || !callerNumber) return

  const client = await db.select<Client>('clients', {
    twilio_number: `eq.${twilioNumber}`,
    status: 'eq.active',
    select: 'id,business_name,owner_name,owner_notify_number,twilio_number,ring_through_number,booking_link,status',
  })

  if (!client) return

  const flow = await db.select<Flow>('flows', { client_id: `eq.${client.id}` })
  if (!flow) return

  await sendLeadSms(client, flow, callerNumber, twilioNumber, db, twilio)
}

async function handleInboundSms(
  params: Record<string, string>,
  db: SupabaseClient,
  twilio: TwilioClient
): Promise<void> {
  const callerNumber = params['From']
  const twilioNumber = params['To']
  const body = params['Body'] ?? ''

  if (!callerNumber || !twilioNumber) return

  const client = await db.select<Client>('clients', {
    twilio_number: `eq.${twilioNumber}`,
    status: 'eq.active',
  })

  if (!client) return

  const lead = await db.select<Lead>('leads', {
    client_id: `eq.${client.id}`,
    caller_number: `eq.${callerNumber}`,
    status: `eq.in_progress`,
  })

  if (!lead) return

  const flow = await db.select<Flow>('flows', { client_id: `eq.${client.id}` })
  if (!flow) return

  await db.insert('messages', {
    lead_id: lead.id,
    client_id: client.id,
    direction: 'inbound',
    body,
  })

  const newEntry = { direction: 'inbound', body, sent_at: new Date().toISOString() }
  const updatedTranscript = [...(lead.transcript ?? []), newEntry]

  await db.update('leads', { id: `eq.${lead.id}` }, { transcript: updatedTranscript })

  const totalQuestions = flow.questions.length
  const currentIndex = lead.current_question_index ?? -1
  const normalizedBody = body.trim().toUpperCase()

  if (currentIndex === -1) {
    if (normalizedBody === 'STOP') {
      await db.update('leads', { id: `eq.${lead.id}` }, {
        status: 'lost',
        completed_at: new Date().toISOString(),
        transcript: updatedTranscript,
      })
      return
    }

    if (normalizedBody !== 'YES') {
      const nudge = 'Reply YES to continue or STOP to opt out.'
      await twilio.sendSmsWithRetry(callerNumber, twilioNumber, nudge, (err) =>
        db.logError('send_optin_nudge', err, client.id, lead.id)
      )
      await db.insert('messages', { lead_id: lead.id, client_id: client.id, direction: 'outbound', body: nudge })
      const nudgeEntry = { direction: 'outbound', body: nudge, sent_at: new Date().toISOString() }
      await db.update('leads', { id: `eq.${lead.id}` }, { transcript: [...updatedTranscript, nudgeEntry] })
      return
    }

    const question = flow.questions[0]
    await twilio.sendSmsWithRetry(callerNumber, twilioNumber, question.message, (err) =>
      db.logError('send_question', err, client.id, lead.id)
    )
    await db.insert('messages', { lead_id: lead.id, client_id: client.id, direction: 'outbound', body: question.message })
    const outEntry = { direction: 'outbound', body: question.message, sent_at: new Date().toISOString() }
    await db.update('leads', { id: `eq.${lead.id}` }, {
      current_question_index: 1,
      transcript: [...updatedTranscript, outEntry],
    })
    return
  }

  if (currentIndex < totalQuestions) {
    const question = flow.questions[currentIndex]
    await twilio.sendSmsWithRetry(callerNumber, twilioNumber, question.message, (err) =>
      db.logError('send_question', err, client.id, lead.id)
    )
    await db.insert('messages', {
      lead_id: lead.id,
      client_id: client.id,
      direction: 'outbound',
      body: question.message,
    })
    const outEntry = { direction: 'outbound', body: question.message, sent_at: new Date().toISOString() }
    await db.update('leads', { id: `eq.${lead.id}` }, {
      current_question_index: currentIndex + 1,
      transcript: [...updatedTranscript, outEntry],
    })
  } else {
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
      await twilio.sendSmsWithRetry(
        client.owner_notify_number,
        twilioNumber,
        ownerAlert,
        (err) => db.logError('send_owner_alert', err, client.id, lead.id)
      )
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

    await twilio.sendSmsWithRetry(callerNumber, twilioNumber, replyMessage, (err) =>
      db.logError('send_outcome_sms', err, client.id, lead.id)
    )
    await db.insert('messages', {
      lead_id: lead.id,
      client_id: client.id,
      direction: 'outbound',
      body: replyMessage,
    })
    const outEntry = { direction: 'outbound', body: replyMessage, sent_at: new Date().toISOString() }
    await db.update('leads', { id: `eq.${lead.id}` }, {
      status: newStatus,
      intent_level: intent,
      completed_at: new Date().toISOString(),
      transcript: [...allTranscript, outEntry],
    })
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method !== 'POST') return ok200()

    const db = new SupabaseClient(env)
    const twilio = new TwilioClient(env)

    try {
      const params = await parseFormBody(request)

      if (url.pathname === '/incoming-call') {
        return await handleIncomingCall(params, db, twilio)
      }

      if (url.pathname === '/no-answer') {
        await handleNoAnswer(params, db, twilio)
        return twimlOk()
      }

      if (url.pathname === '/sms') {
        await handleInboundSms(params, db, twilio)
        return twimlOk()
      }

      return ok200()
    } catch (err) {
      try {
        await db.logError('unhandled_exception', err)
      } catch {
        // Swallow silently
      }
      return twimlOk()
    }
  },
}
