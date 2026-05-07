import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  // Verify the user owns this client record
  const { data: clientUser } = await db
    .from('client_users')
    .select('client_id')
    .eq('user_id', user.id)
    .single()

  if (!clientUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { owner_name, owner_notify_number, booking_link } = body

  const { error } = await db
    .from('clients')
    .update({
      owner_name: owner_name ?? undefined,
      owner_notify_number: owner_notify_number ?? undefined,
      booking_link: booking_link || null,
    })
    .eq('id', clientUser.client_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
