'use client'

import { useState } from 'react'
import type { Lead, LeadStatus, TranscriptEntry } from '@/types'

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'booked', label: 'Booked' },
  { value: 'lost', label: 'Lost' },
]

interface TranscriptModalProps {
  lead: Lead
  onClose: () => void
  onUpdate?: (id: string, updates: { status: LeadStatus; notes: string }) => void
}

export function TranscriptModal({ lead, onClose, onUpdate }: TranscriptModalProps) {
  const [status, setStatus] = useState<LeadStatus>(lead.status)
  const [notes, setNotes] = useState(lead.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const transcript: TranscriptEntry[] = lead.transcript ?? []

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError('')

    const res = await fetch(`/api/dashboard/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    })

    if (res.ok) {
      setSaved(true)
      onUpdate?.(lead.id, { status, notes })
      setTimeout(() => setSaved(false), 2000)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
    }
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <p className="font-semibold text-gray-900 font-mono">{lead.caller_number}</p>
            <p className="text-xs text-gray-500">
              {new Date(lead.started_at).toLocaleDateString()} · {transcript.length} messages
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Transcript */}
        <div className="overflow-y-auto p-4 flex flex-col gap-3 flex-1">
          {transcript.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">No messages yet.</p>
          )}
          {transcript.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  msg.direction === 'outbound'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                }`}
              >
                <p>{msg.body}</p>
                <p className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-blue-200' : 'text-gray-400'}`}>
                  {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CRM controls */}
        <div className="border-t border-gray-200 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 w-16 shrink-0">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] focus:border-transparent"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes about this lead..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] focus:border-transparent resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#1B2A4A] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#243761] transition-colors disabled:opacity-50"
          >
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
