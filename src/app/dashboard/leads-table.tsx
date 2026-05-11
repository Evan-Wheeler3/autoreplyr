'use client'

import { useState } from 'react'
import type { Lead, LeadStatus } from '@/types'
import { statusBadge, intentBadge } from '@/components/ui/badge'
import { TranscriptModal } from '@/components/ui/transcript-modal'

export function DashboardLeadsTable({ leads: initialLeads }: { leads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [selected, setSelected] = useState<Lead | null>(null)

  function handleUpdate(id: string, updates: { status: LeadStatus; notes: string }) {
    setLeads((prev) =>
      prev.map((l) => l.id === id ? { ...l, ...updates } : l)
    )
    setSelected((prev) => prev?.id === id ? { ...prev, ...updates } : prev)
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-5 py-3 text-gray-500 font-medium">Caller</th>
            <th className="text-left px-5 py-3 text-gray-500 font-medium">Date</th>
            <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
            <th className="text-left px-5 py-3 text-gray-500 font-medium">Intent</th>
            <th className="text-left px-5 py-3 text-gray-500 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelected(lead)}
            >
              <td className="px-5 py-3 font-mono">{lead.caller_number}</td>
              <td className="px-5 py-3 text-gray-500">
                {new Date(lead.started_at).toLocaleDateString()}
              </td>
              <td className="px-5 py-3">{statusBadge(lead.status)}</td>
              <td className="px-5 py-3">{intentBadge(lead.intent_level)}</td>
              <td className="px-5 py-3 text-gray-400 max-w-[180px] truncate text-xs">
                {lead.notes ?? '—'}
              </td>
            </tr>
          ))}
          {leads.length === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                No leads yet. Your SMS system is live and waiting for missed calls.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selected && (
        <TranscriptModal
          lead={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}
    </>
  )
}
