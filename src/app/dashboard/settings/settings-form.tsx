'use client'

import { useState } from 'react'

interface ClientData {
  id: string
  business_name: string
  owner_name: string
  owner_email: string
  owner_notify_number: string
  industry: string
  booking_link: string | null
  voip_provider: string | null
  provider_phone_number: string | null
  subscription_status: string
}

const PROVIDER_LABELS: Record<string, string> = {
  openphone: 'OpenPhone / Quo',
  yeastar: 'Yeastar / 4-Voice',
  ringcentral: 'RingCentral',
  aircall: 'Aircall',
  dialpad: 'Dialpad',
  zoom_phone: 'Zoom Phone',
  goto_connect: 'GoTo Connect',
  '8x8': '8x8',
  nextiva: 'Nextiva',
  justcall: 'JustCall',
  kixie: 'Kixie',
  cloudtalk: 'CloudTalk',
  microsoft_teams: 'Microsoft Teams Phone',
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    past_due: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export function SettingsForm({ client }: { client: ClientData }) {
  const [form, setForm] = useState({
    owner_name: client.owner_name,
    owner_notify_number: client.owner_notify_number,
    booking_link: client.booking_link ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError('')

    const res = await fetch('/api/dashboard/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id, ...form }),
    })

    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-8">
      {/* Subscription status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Subscription</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <div className="mt-1"><StatusBadge status={client.subscription_status} /></div>
          </div>
          {client.subscription_status !== 'active' && (
            <a
              href="mailto:evan@velza.com?subject=AutoReplyr billing"
              className="text-sm text-blue-600 underline"
            >
              Contact support
            </a>
          )}
        </div>
      </div>

      {/* Phone system info (read-only) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Phone System</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Provider</span>
            <span className="text-gray-900 font-medium">
              {client.voip_provider ? (PROVIDER_LABELS[client.voip_provider] ?? client.voip_provider) : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Business number</span>
            <span className="text-gray-900 font-medium">{client.provider_phone_number ?? '—'}</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          To change your phone system, contact <a href="mailto:evan@velza.com" className="underline">evan@velza.com</a>.
        </p>
      </div>

      {/* Editable settings */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Account details</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
          <input
            value={client.business_name}
            disabled
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500"
          />
          <p className="text-xs text-gray-400 mt-1">Contact support to change your business name.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
          <input
            value={form.owner_name}
            onChange={set('owner_name')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alert phone number</label>
          <input
            value={form.owner_notify_number}
            onChange={set('owner_notify_number')}
            type="tel"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">You&apos;ll receive a text here when a high-intent lead responds.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Booking link <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            value={form.booking_link}
            onChange={set('booking_link')}
            type="url"
            placeholder="https://calendly.com/..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] focus:border-transparent"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-[#1B2A4A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#243761] transition-colors disabled:opacity-50"
        >
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
