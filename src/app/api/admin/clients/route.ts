import { createAdminClient } from '@/lib/supabase/server'
import { getTemplate } from '@/lib/industry-templates'
import { sendWelcomeEmail } from '@/lib/email'
import { NextResponse } from 'next/server'
import type { Industry } from '@/types'

export async function POST(req: Request) {
  const body = await req.json()
  const {
    business_name,
    owner_name,
    owner_email,
    owner_notify_number,
    twilio_number,
    industry,
    booking_link,
    status,
  } = body

  if (
    !business_name || !owner_name || !owner_email ||
    !owner_notify_number || !twilio_number || !industry
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = createAdminClient()

  // Create client record
  const { data: client, error: clientErr } = await db
    .from('clients')
    .insert({
      business_name,
      owner_name,
      owner_email,
      owner_notify_number,
      twilio_number,
      industry,
      booking_link: booking_link || null,
      status: status ?? 'active',
    })
    .select()
    .single()

  if (clientErr || !client) {
    return NextResponse.json({ error: clientErr?.message ?? 'Failed to create client' }, { status: 500 })
  }

  // Create default flow from industry template
  const template = getTemplate(industry as Industry)
  await db.from('flows').insert({
    client_id: client.id,
    ...template,
  })

  // Create Supabase auth user for client
  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
  const { data: authUser, error: authErr } = await db.auth.admin.createUser({
    email: owner_email,
    password: tempPassword,
    email_confirm: true,
  })

  if (!authErr && authUser.user) {
    // Link in client_users
    await db.from('client_users').insert({
      client_id: client.id,
      user_id: authUser.user.id,
    })

    // Send welcome email
    try {
      await sendWelcomeEmail({
        toEmail: owner_email,
        ownerName: owner_name,
        businessName: business_name,
        tempPassword,
      })
    } catch {
      // Non-fatal — client is created, email just failed
    }
  }

  return NextResponse.json({ client })
}
