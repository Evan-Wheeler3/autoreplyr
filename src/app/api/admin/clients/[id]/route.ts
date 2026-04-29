import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const db = createAdminClient()
  const { error } = await db
    .from('clients')
    .update({
      business_name: body.business_name,
      owner_name: body.owner_name,
      owner_email: body.owner_email,
      owner_notify_number: body.owner_notify_number,
      twilio_number: body.twilio_number,
      industry: body.industry,
      booking_link: body.booking_link ?? null,
      status: body.status,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
