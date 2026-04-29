import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const db = createAdminClient()

  // Check if flow exists
  const { data: existing } = await db
    .from('flows')
    .select('id')
    .eq('client_id', id)
    .single()

  const flowData = {
    client_id: id,
    opening_message: body.opening_message,
    questions: body.questions ?? [],
    high_intent_triggers: body.high_intent_triggers ?? [],
    high_intent_action: body.high_intent_action ?? 'notify_owner',
    high_intent_message: body.high_intent_message,
    standard_message: body.standard_message,
    low_intent_message: body.low_intent_message,
    updated_at: new Date().toISOString(),
  }

  let error
  if (existing) {
    ;({ error } = await db.from('flows').update(flowData).eq('client_id', id))
  } else {
    ;({ error } = await db.from('flows').insert(flowData))
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
