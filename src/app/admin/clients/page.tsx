import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { statusBadge } from '@/components/ui/badge'
import { INDUSTRY_LABELS } from '@/lib/industry-templates'
import type { Industry } from '@/types'

export default async function ClientsPage() {
  const db = createAdminClient()

  const { data: clients } = await db
    .from('clients')
    .select('id, business_name, industry, status, created_at, owner_email')
    .order('created_at', { ascending: false })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: leadsThisMonth } = await db
    .from('leads')
    .select('id, client_id, started_at')
    .gte('started_at', startOfMonth)

  const leadCountByClient: Record<string, number> = {}
  for (const lead of leadsThisMonth ?? []) {
    leadCountByClient[lead.client_id] = (leadCountByClient[lead.client_id] ?? 0) + 1
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <Link
          href="/admin/clients/new"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add client
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Business</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Industry</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Leads (month)</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(clients ?? []).map((client) => (
              <tr key={client.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-5 py-3">
                  <Link href={`/admin/clients/${client.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                    {client.business_name}
                  </Link>
                  <p className="text-xs text-gray-400">{client.owner_email}</p>
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {INDUSTRY_LABELS[client.industry as Industry] ?? client.industry}
                </td>
                <td className="px-5 py-3">{statusBadge(client.status)}</td>
                <td className="px-5 py-3 text-gray-700">
                  {leadCountByClient[client.id] ?? 0}
                </td>
                <td className="px-5 py-3 text-gray-500">
                  {new Date(client.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {(clients ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                  No clients yet.{' '}
                  <Link href="/admin/clients/new" className="text-blue-600 hover:underline">
                    Add one →
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
