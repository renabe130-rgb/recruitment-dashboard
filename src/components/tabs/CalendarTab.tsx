'use client'

import { useState, useEffect } from 'react'

type Person = { name: string; jobType: string; date: string | null }

const DAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function CalendarTab() {
  const [scheduleData, setScheduleData] = useState<{ finalInterview: Person[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    fetch('/api/herp?type=schedule')
      .then(r => r.json())
      .then(res => { setScheduleData(res.data); setLoading(false) })
  }, [])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const candidates = scheduleData?.finalInterview?.filter(p => p.date) ?? []

  const eventsByDate: Record<string, Person[]> = {}
  candidates.forEach(p => {
    if (!p.date) return
    const d = new Date(p.date)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate().toString()
      if (!eventsByDate[key]) eventsByDate[key] = []
      eventsByDate[key].push(p)
    }
  })

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  if (loading) return <div className="text-center py-20 text-gray-400">読み込み中...</div>

  const noDateCandidates = scheduleData?.finalInterview?.filter(p => !p.date) ?? []

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">‹</button>
          <h3 className="font-semibold text-gray-800 text-lg">
            {year}年 {month + 1}月 ／ 最終選考カレンダー
          </h3>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">›</button>
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
          {DAYS.map((d, i) => (
            <div
              key={d}
              className={`text-center py-2 text-xs font-semibold ${
                i === 0 ? 'bg-red-50 text-red-500' : i === 6 ? 'bg-blue-50 text-blue-500' : 'bg-gray-50 text-gray-600'
              }`}
            >
              {d}
            </div>
          ))}

          {cells.map((day, i) => {
            const events = day ? (eventsByDate[day.toString()] ?? []) : []
            const isToday =
              day &&
              new Date().getFullYear() === year &&
              new Date().getMonth() === month &&
              new Date().getDate() === day

            return (
              <div
                key={i}
                className={`min-h-16 p-1.5 ${day ? 'bg-white' : 'bg-gray-50'} ${
                  isToday ? 'ring-2 ring-blue-400 ring-inset' : ''
                }`}
              >
                {day && (
                  <>
                    <div className={`text-xs font-medium mb-1 ${
                      i % 7 === 0 ? 'text-red-500' : i % 7 === 6 ? 'text-blue-500' : 'text-gray-700'
                    }`}>
                      {day}
                    </div>
                    {events.map((e, ei) => (
                      <div
                        key={ei}
                        className="text-xs bg-blue-100 text-blue-800 rounded px-1 py-0.5 mb-0.5 truncate"
                        title={`${e.name}（${e.jobType}）`}
                      >
                        {e.name}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {noDateCandidates.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h4 className="font-semibold text-gray-700 mb-3">日程調整中</h4>
          <div className="space-y-2">
            {noDateCandidates.map((p, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <span className="w-2 h-2 bg-yellow-400 rounded-full shrink-0" />
                <span className="text-sm text-gray-700">{p.name}</span>
                <span className="text-xs text-gray-400">（{p.jobType}）</span>
                <span className="ml-auto text-xs text-yellow-600 font-medium">日程調整中</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
