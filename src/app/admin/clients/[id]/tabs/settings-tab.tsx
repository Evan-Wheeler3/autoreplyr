'use client'

import { useState } from 'react'
import type { Client } from '@/types'

const INDUSTRIES = [
  { value: 'hvac', label: 'HVAC' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'pest_control', label: 'Pest Control' },
]

export function SettingsTab({ client }: { client: Client }) {
  const [form, setForm] = useState({
    business_name: client.business_name,
    owner_name: client.owner_name,
    owner_email: client.owner_email,
    owner_notify_number: client.owner_notify_number,
    twilio_number: client.twilio_number,
    industry: client.industry,
    booking_link: client.booking_link ?? '',
    status: client.status,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    const res = await fetch(`/api/admin/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, booking_link: form.booking_link || null }),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed to save')
    } else {
      setSaved(true)
    }
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 max-w-xl">
      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <Field label="Business Name">
        <input value={form.business_name} onChange={(e) => set('business_name', e.target.value)} className={cls} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Owner Name">
          <input value={form.owner_name} onChange={(e) => set('owner_name', e.target.value)} className={cls} />
        </Field>
        <Field label="Owner Email">
          <input type="email" value={form.owner_email} onChange={(e) => set('owner_email', e.target.value)} className={cls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Notify Number">
          <input value={form.owner_notify_number} onChange={(e) => set('owner_notify_number', e.target.value)} className={cls} />
        </Field>
        <Field label="Twilio Number">
          <input value={form.twilio_number} onChange={(e) => set('twilio_number', e.target.value)} className={cls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Industry">
          <select value={form.industry} onChange={(e) => set('industry', e.target.value)} className={cls}>
            {INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className={cls}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
      </div>
      <Field label="Booking Link">
        <input type="url" value={form.booking_link} onChange={(e) => set('booking_link', e.target.value)} className={cls} placeholder="https://..." />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && <p className="text-green-600 text-sm">Saved!</p>}
      </div>
    </div>
  )
}

const cls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}
