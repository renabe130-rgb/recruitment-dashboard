'use client'

import { useState, useEffect } from 'react'

type Person = { name: string; jobType: string; date: string | null }
type ScheduleData = {
  finalInterview: Person[]
  offerMeeting: Person[]
  offerAcceptance: Person[]
  joining: Person[]
}

const SECTIONS = [
  { key: 'finalInterview', label: '最終面接予定者' },
  { key: 'offerMeeting', label: 'オファー面談予定者' },
  { key: 'offerAcceptance', label: '内定承諾予定者' },
  { key: 'joining', label: '入社予定者' },
]

function formatDate(date: string | null) {
  if (!date) return <span className="text-yellow-600 text-xs font-medium">日程調整中</span>
  const d = new Date(date)
  return <span className="text-gray-700 text-sm">{d.getMonth() + 1}/{d.getDate()}（{['日','月','火','水','木','金','土'][d.getDay()]}）</span>
}

export default function ScheduleTab() {
  const [data, setData] = useState<ScheduleData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/herp?type=schedule')
      .then(r => r.json())
      .then(res => { setData(res.data); setLoading(false) })
  }, [])

  if (loading) return <div className="text-center py-20 text-gray-400">読み込み中...</div>
  if (!data) return null

  return (
    <div className="space-y-6">
      {SECTIONS.map(({ key, label }) => {
        const people = data[key as keyof ScheduleData] ?? []
        return (
          <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="font-semibold text-gray-800">{label}</h3>
              <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {people.length}名
              </span>
            </div>

            {people.length === 0 ? (
              <p className="text-gray-400 text-sm">該当者なし</p>
            ) : (
              <div className="space-y-2">
                {people.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="font-medium text-gray-800">{p.name}</span>
                      <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{p.jobType}</span>
                    </div>
                    <div>{formatDate(p.date)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
