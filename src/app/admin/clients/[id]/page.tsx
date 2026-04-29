import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ClientDetailTabs } from './client-detail-tabs'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createAdminClient()

  const [
    { data: client },
    { data: flow },
    { data: leads },
  ] = await Promise.all([
    db.from('clients').select('*').eq('id', id).single(),
    db.from('flows').select('*').eq('client_id', id).single(),
    db
      .from('leads')
      .select('*')
      .eq('client_id', id)
      .order('started_at', { ascending: false }),
  ])

  if (!client) notFound()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const leadsThisMonth = (leads ?? []).filter((l) => l.started_at >= startOfMonth).length

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{client.business_name}</h1>
        <p className="text-gray-500 text-sm mt-1">{client.owner_email}</p>
      </div>

      <ClientDetailTabs
        client={client}
        flow={flow}
        leads={leads ?? []}
        leadsThisMonth={leadsThisMonth}
      />
    </div>
  )
}
