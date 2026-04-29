import { createAdminClient } from '@/lib/supabase/server'
import { sendWeeklyReport } from '@/lib/email'
import { NextResponse } from 'next/server'
import type { Lead } from '@/types'

// Called by Vercel Cron on Monday at 8am UTC
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/weekly-report", "schedule": "0 8 * * 1" }] }
export async function GET(req: Request) {
  // Simple auth: Vercel Cron passes an Authorization header
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()

  const { data: clients } = await db
    .from('clients')
    .select('id, business_name, owner_email, owner_name')
    .eq('status', 'active')

  if (!clients?.length) return NextResponse.json({ ok: true, sent: 0 })

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  let sent = 0
  for (const client of clients) {
    try {
      const { data: leads } = await db
        .from('leads')
        .select('*')
        .eq('client_id', client.id)
        .gte('started_at', sevenDaysAgo)

      const allLeads = (leads ?? []) as Lead[]
      const highIntentLeads = allLeads.filter((l) => l.intent_level === 'high')

      await sendWeeklyReport({
        toEmail: client.owner_email,
        ownerName: client.owner_name,
        businessName: client.business_name,
        leadsThisWeek: allLeads,
        highIntentLeads,
      })

      sent++
    } catch {
      // Non-fatal — continue to next client
    }
  }

  return NextResponse.json({ ok: true, sent })
}
