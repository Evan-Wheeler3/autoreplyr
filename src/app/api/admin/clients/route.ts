import { createAdminClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json()
  const {
    business_name,
    owner_name,
    owner_email,
    owner_notify_number,
    industry,
    voip_tier,
    // OpenPhone
    openphone_api_key,
    openphone_number_id,
    // Twilio
    twilio_number,
    ring_through_number,
    // Shared
    booking_link,
    status,
  } = body

  if (!business_name || !owner_name || !owner_email || !owner_notify_number || !industry || !voip_tier) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (voip_tier === 'openphone' && (!openphone_api_key || !openphone_number_id)) {
    return NextResponse.json({ error: 'OpenPhone API key and Phone Number ID are required' }, { status: 400 })
  }

  if (voip_tier === 'twilio' && !twilio_number) {
    return NextResponse.json({ error: 'Twilio number is required for ported number clients' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: client, error: clientErr } = await db
    .from('clients')
    .insert({
      business_name,
      owner_name,
      owner_email,
      owner_notify_number,
      industry,
      voip_tier,
      openphone_api_key: openphone_api_key || null,
      openphone_number_id: openphone_number_id || null,
      twilio_number: twilio_number || null,
      ring_through_number: ring_through_number || null,
      booking_link: booking_link || null,
      status: status ?? 'active',
    })
    .select()
    .single()

  if (clientErr || !client) {
    return NextResponse.json({ error: clientErr?.message ?? 'Failed to create client' }, { status: 500 })
  }

  await db.from('flows').insert({ client_id: client.id })

  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
  const { data: authUser, error: authErr } = await db.auth.admin.createUser({
    email: owner_email,
    password: tempPassword,
    email_confirm: true,
  })

  if (!authErr && authUser.user) {
    await db.from('client_users').insert({
      client_id: client.id,
      user_id: authUser.user.id,
    })

    try {
      await sendWelcomeEmail({
        toEmail: owner_email,
        ownerName: owner_name,
        businessName: business_name,
        tempPassword,
      })
    } catch {
      // Non-fatal
    }
  }

  return NextResponse.json({ client })
}
