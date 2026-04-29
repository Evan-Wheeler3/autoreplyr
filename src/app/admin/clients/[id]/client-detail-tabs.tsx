'use client'

import { useState } from 'react'
import type { Client, Flow, Lead } from '@/types'
import { SettingsTab } from './tabs/settings-tab'
import { FlowTab } from './tabs/flow-tab'
import { LeadsTab } from './tabs/leads-tab'
import { StatsTab } from './tabs/stats-tab'

interface Props {
  client: Client
  flow: Flow | null
  leads: Lead[]
  leadsThisMonth: number
}

const TABS = ['Settings', 'Flow', 'Leads', 'Stats'] as const
type Tab = typeof TABS[number]

export function ClientDetailTabs({ client, flow, leads, leadsThisMonth }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Settings')

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab
                ? 'bg-white border border-b-white border-gray-200 text-blue-600 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Settings' && <SettingsTab client={client} />}
      {activeTab === 'Flow' && <FlowTab client={client} flow={flow} />}
      {activeTab === 'Leads' && <LeadsTab leads={leads} />}
      {activeTab === 'Stats' && <StatsTab leads={leads} leadsThisMonth={leadsThisMonth} />}
    </div>
  )
}
