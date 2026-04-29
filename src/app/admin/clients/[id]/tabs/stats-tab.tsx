import type { Lead } from '@/types'

export function StatsTab({ leads, leadsThisMonth }: { leads: Lead[]; leadsThisMonth: number }) {
  const statusCounts = countBy(leads, 'status')
  const intentCounts = countBy(leads.filter((l) => l.intent_level), 'intent_level')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const messagesThisMonth = leads
    .filter((l) => l.started_at >= startOfMonth)
    .reduce((sum, l) => sum + (l.transcript?.length ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Leads This Month" value={leadsThisMonth} />
        <StatCard label="Total Leads" value={leads.length} />
        <StatCard label="Messages This Month" value={messagesThisMonth} note="for cost monitoring" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <BreakdownCard title="Leads by Status" counts={statusCounts} />
        <BreakdownCard title="Leads by Intent" counts={intentCounts} />
      </div>
    </div>
  )
}

function countBy(arr: Lead[], key: keyof Lead): Record<string, number> {
  const out: Record<string, number> = {}
  for (const item of arr) {
    const v = String(item[key] ?? 'unknown')
    out[v] = (out[v] ?? 0) + 1
  }
  return out
}

function StatCard({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
    </div>
  )
}

function BreakdownCard({ title, counts }: { title: string; counts: Record<string, number> }) {
  const entries = Object.entries(counts)
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      {entries.length === 0 && <p className="text-gray-400 text-sm">No data yet.</p>}
      <div className="space-y-2">
        {entries.map(([key, count]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm text-gray-600 capitalize">{key.replace('_', ' ')}</span>
            <span className="text-sm font-medium text-gray-900">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
