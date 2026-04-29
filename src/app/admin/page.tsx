import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { statusBadge, intentBadge } from '@/components/ui/badge'

export default async function AdminDashboard() {
  const db = createAdminClient()

  const [
    { data: clients },
    { data: allLeads },
    { data: recentLeads },
  ] = await Promise.all([
    db.from('clients').select('id, status').eq('status', 'active'),
    db.from('leads').select('id, started_at'),
    db
      .from('leads')
      .select('id, caller_number, started_at, status, intent_level, client_id, clients(business_name)')
      .order('started_at', { ascending: false })
      .limit(10),
  ])

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const leadsThisMonth = (allLeads ?? []).filter(
    (l) => l.started_at >= startOfMonth
  ).length

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Active Clients" value={clients?.length ?? 0} />
        <StatCard label="Leads This Month" value={leadsThisMonth} />
        <StatCard label="Total Leads" value={allLeads?.length ?? 0} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Leads</h2>
          <Link href="/admin/clients" className="text-sm text-blue-600 hover:underline">
            View all clients →
          </Link>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Caller</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Client</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Date</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Intent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(recentLeads ?? []).map((lead) => {
              const client = (lead.clients as unknown) as { business_name: string } | null
              return (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono">{lead.caller_number}</td>
                  <td className="px-5 py-3 text-gray-600">{client?.business_name ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(lead.started_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">{statusBadge(lead.status)}</td>
                  <td className="px-5 py-3">{intentBadge(lead.intent_level)}</td>
                </tr>
              )
            })}
            {(recentLeads ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                  No leads yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}
