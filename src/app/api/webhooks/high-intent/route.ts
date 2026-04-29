import { createAdminClient } from '@/lib/supabase/server'
import { sendHighIntentAlert } from '@/lib/email'
import { NextResponse } from 'next/server'
import type { Lead } from '@/types'

// Called internally by the system (e.g. from a Supabase trigger or the Cloudflare worker)
// after a lead is scored as high intent, to send the email alert.
export async function POST(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { lead_id } = body

  if (!lead_id) return NextResponse.json({ error: 'Missing lead_id' }, { status: 400 })

  const db = createAdminClient()

  const { data: lead } = await db
    .from('leads')
    .select('*, clients(business_name, owner_email)')
    .eq('id', lead_id)
    .single()

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const client = lead.clients as { business_name: string; owner_email: string } | null
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  try {
    await sendHighIntentAlert({
      toEmail: client.owner_email,
      businessName: client.business_name,
      callerNumber: (lead as Lead).caller_number,
      transcript: (lead as Lead).transcript ?? [],
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
