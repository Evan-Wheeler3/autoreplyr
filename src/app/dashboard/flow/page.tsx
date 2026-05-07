import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FlowEditor } from './flow-editor'

export default async function FlowPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const { data: clientUser } = await db
    .from('client_users')
    .select('client_id')
    .eq('user_id', user.id)
    .single()

  if (!clientUser) redirect('/login')

  const { data: flow } = await db
    .from('flows')
    .select('*')
    .eq('client_id', clientUser.client_id)
    .single()

  const { data: client } = await db
    .from('clients')
    .select('business_name,owner_name,booking_link')
    .eq('id', clientUser.client_id)
    .single()

  if (!flow || !client) {
    return (
      <div className="p-8">
        <p className="text-gray-500">No flow configured yet. Contact support.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">SMS Flow</h1>
      <p className="text-sm text-gray-500 mb-8">
        Customize the messages your leads receive after a missed call.
        Use <code className="bg-gray-100 px-1 rounded">{'{business_name}'}</code>,{' '}
        <code className="bg-gray-100 px-1 rounded">{'{owner_name}'}</code>, and{' '}
        <code className="bg-gray-100 px-1 rounded">{'{booking_link}'}</code> as placeholders.
      </p>
      <FlowEditor flow={flow} client={client} clientId={clientUser.client_id} />
    </div>
  )
}
