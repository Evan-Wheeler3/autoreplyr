import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLeadsTable } from './leads-table'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const { data: clientUser } = await db
    .from('client_users')
    .select('client_id')
    .eq('user_id', user.id)
    .single()

  if (!clientUser) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Your account is not linked to a client yet. Contact your admin.</p>
      </div>
    )
  }

  const clientId = clientUser.client_id

  // Use RLS client for actual data (respects client isolation)
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('client_id', clientId)
    .order('started_at', { ascending: false })
    .limit(20)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const allLeads = leads ?? []
  const leadsThisMonth = allLeads.filter((l) => l.started_at >= startOfMonth)

  const statusCounts = {
    new: allLeads.filter((l) => l.status === 'new').length,
    in_progress: allLeads.filter((l) => l.status === 'in_progress').length,
    qualified: allLeads.filter((l) => l.status === 'qualified').length,
    booked: allLeads.filter((l) => l.status === 'booked').length,
    lost: allLeads.filter((l) => l.status === 'lost').length,
  }

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Overview</h1>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <StatCard label="Leads This Month" value={leadsThisMonth.length} />
        <StatCard label="Total Leads" value={allLeads.length} />
      </div>

      <div className="grid grid-cols-5 gap-3 mb-8">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{count}</p>
            <p className="text-xs text-gray-500 mt-1 capitalize">{status.replace('_', ' ')}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Recent Leads</h2>
        </div>
        <DashboardLeadsTable leads={allLeads} />
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
