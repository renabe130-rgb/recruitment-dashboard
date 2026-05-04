'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import KPITab from '@/components/tabs/KPITab'
import ScheduleTab from '@/components/tabs/ScheduleTab'
import PlanTab from '@/components/tabs/PlanTab'
import NATab from '@/components/tabs/NATab'
import CalendarTab from '@/components/tabs/CalendarTab'

const TABS = [
  { id: 'kpi', label: 'KPI進捗' },
  { id: 'schedule', label: '採用スケジュール' },
  { id: 'plan', label: '採用計画' },
  { id: 'na', label: 'NA管理' },
  { id: 'calendar', label: '採用カレンダー' },
]

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('kpi')
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <h1 className="text-lg font-bold text-gray-800">採用ダッシュボード</h1>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              ログアウト
            </button>
          </div>

          {/* タブナビ */}
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* コンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'kpi' && <KPITab />}
        {activeTab === 'schedule' && <ScheduleTab />}
        {activeTab === 'plan' && <PlanTab />}
        {activeTab === 'na' && <NATab />}
        {activeTab === 'calendar' && <CalendarTab />}
      </main>
    </div>
  )
}
