import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLeadsTable } from '../leads-table'

export default async function AllLeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const { data: clientUser } = await db
    .from('client_users')
    .select('client_id')
    .eq('user_id', user.id)
    .single()

  if (!clientUser) redirect('/dashboard')

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('client_id', clientUser.client_id)
    .order('started_at', { ascending: false })

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">All Leads</h1>

      <div className="bg-white rounded-xl border border-gray-200">
        <DashboardLeadsTable leads={leads ?? []} />
      </div>
    </div>
  )
}
