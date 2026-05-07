import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  const { data: clientUser } = await db
    .from('client_users')
    .select('client_id')
    .eq('user_id', user.id)
    .single()

  if (!clientUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const {
    opening_message,
    questions,
    high_intent_triggers,
    high_intent_message,
    standard_message,
    low_intent_message,
  } = await req.json()

  const { error } = await db
    .from('flows')
    .update({
      opening_message,
      questions,
      high_intent_triggers,
      high_intent_message,
      standard_message,
      low_intent_message,
      updated_at: new Date().toISOString(),
    })
    .eq('client_id', clientUser.client_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
