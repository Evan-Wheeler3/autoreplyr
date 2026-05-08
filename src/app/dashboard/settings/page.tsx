import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
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

  const { data: client } = await db
    .from('clients')
    .select('id,business_name,owner_name,owner_email,owner_notify_number,industry,booking_link,voip_provider,provider_phone_number,subscription_status,oauth_access_token')
    .eq('id', clientUser.client_id)
    .single()

  if (!client) redirect('/login')

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <SettingsForm client={client} />
    </div>
  )
}
