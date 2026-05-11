import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { LeadStatus } from '@/types'

const VALID_STATUSES: LeadStatus[] = ['new', 'in_progress', 'qualified', 'booked', 'lost']

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Verify the lead belongs to this user's client
  const db = createAdminClient()
  const { data: clientUser } = await db
    .from('client_users')
    .select('client_id')
    .eq('user_id', user.id)
    .single()

  if (!clientUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: lead } = await db
    .from('leads')
    .select('id, client_id')
    .eq('id', id)
    .eq('client_id', clientUser.client_id)
    .single()

  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if ('status' in body) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    updates.status = body.status
  }

  if ('notes' in body) {
    updates.notes = body.notes ?? null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await db
    .from('leads')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
