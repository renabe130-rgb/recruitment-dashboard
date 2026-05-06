'use client'

import { useState, useEffect, useCallback } from 'react'

type FinalStageStep = 'finalInterview' | 'offered' | 'offerAccepted'
type FinalStageCandidate = {
  candidacyId: string
  month: string
  candidateName: string
  groupName: string
  currentStep: FinalStageStep
  nextSchedule: string | null
  offerDeadline: string | null
  joinDate: string | null
  notes: string
  source: 'herp' | 'manual'
}

type CalendarEvent = {
  date: string  // YYYY-MM-DD
  type: 'interview' | 'deadline' | 'join'
  candidateName: string
  groupName: string
  detail: string
}

const DAYS = ['日', '月', '火', '水', '木', '金', '土']

const TYPE_STYLE: Record<CalendarEvent['type'], { bg: string; text: string; label: string }> = {
  interview: { bg: 'bg-blue-100',  text: 'text-blue-800',  label: '最終選考' },
  deadline:  { bg: 'bg-amber-100', text: 'text-amber-800', label: '承諾期限' },
  join:      { bg: 'bg-green-100', text: 'text-green-800', label: '入社' },
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isoToDateKey(iso: string): string {
  const d = new Date(iso)
  return dateKey(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function ymdToDateKey(s: string): string {
  // s = "YYYY-MM-DD"
  const [y, m, d] = s.split('-').map(Number)
  return dateKey(y, m, d)
}

function buildEvents(candidates: FinalStageCandidate[]): CalendarEvent[] {
  const events: CalendarEvent[] = []
  candidates.forEach(c => {
    if (c.nextSchedule) {
      const d = new Date(c.nextSchedule)
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      events.push({
        date: isoToDateKey(c.nextSchedule),
        type: 'interview',
        candidateName: c.candidateName,
        groupName: c.groupName,
        detail: `${hh}:${mm}`,
      })
    }
    if (c.offerDeadline) {
      const d = new Date(c.offerDeadline)
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      events.push({
        date: isoToDateKey(c.offerDeadline),
        type: 'deadline',
        candidateName: c.candidateName,
        groupName: c.groupName,
        detail: `${hh}:${mm}`,
      })
    }
    if (c.joinDate) {
      events.push({
        date: ymdToDateKey(c.joinDate),
        type: 'join',
        candidateName: c.candidateName,
        groupName: c.groupName,
        detail: '',
      })
    }
  })
  return events
}

export default function CalendarTab() {
  const [candidates, setCandidates] = useState<FinalStageCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1  // 1-12

  const reload = useCallback(() => {
    setLoading(true)
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    fetch(`/api/final-stage?month=${monthStr}`)
      .then(r => r.json())
      .then(data => { setCandidates(data); setLoading(false) })
  }, [year, month])

  useEffect(() => { reload() }, [reload])

  const events = buildEvents(candidates)
  const eventsByDate: Record<string, CalendarEvent[]> = {}
  events.forEach(e => {
    if (!eventsByDate[e.date]) eventsByDate[e.date] = []
    eventsByDate[e.date].push(e)
  })

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => setCurrentDate(new Date(year, month - 2, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month, 1))
  const today = new Date()

  // 該当月内に何の日付もない候補者（参考表示）
  const noDateCandidates = candidates.filter(c => !c.nextSchedule && !c.offerDeadline && !c.joinDate)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">‹</button>
          <h3 className="font-semibold text-gray-800 text-lg">
            {year}年 {month}月 ／ 採用カレンダー
          </h3>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">›</button>
        </div>

        {/* 凡例 */}
        <div className="flex gap-3 text-xs mb-3 text-gray-600">
          {(['interview', 'deadline', 'join'] as const).map(t => (
            <span key={t} className="inline-flex items-center gap-1">
              <span className={`inline-block w-3 h-3 rounded ${TYPE_STYLE[t].bg}`} />
              {TYPE_STYLE[t].label}
            </span>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-10">読み込み中...</p>
        ) : (
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
              const k = day ? dateKey(year, month, day) : null
              const dayEvents = k ? (eventsByDate[k] ?? []) : []
              const isToday = day && today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day

              return (
                <div
                  key={i}
                  className={`min-h-20 p-1.5 ${day ? 'bg-white' : 'bg-gray-50'} ${
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
                      {dayEvents.slice(0, 4).map((e, ei) => {
                        const style = TYPE_STYLE[e.type]
                        const titleText = `${TYPE_STYLE[e.type].label} / ${e.candidateName}（${e.groupName}）${e.detail ? ' ' + e.detail : ''}`
                        return (
                          <div
                            key={ei}
                            className={`text-[10px] ${style.bg} ${style.text} rounded px-1 py-0.5 mb-0.5 truncate`}
                            title={titleText}
                          >
                            {e.candidateName}
                          </div>
                        )
                      })}
                      {dayEvents.length > 4 && (
                        <div className="text-[10px] text-gray-500">+{dayEvents.length - 4}件</div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 月内の予定日が未設定の候補者 */}
      {!loading && noDateCandidates.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h4 className="font-semibold text-gray-700 mb-3">日程未設定（カレンダーに乗らない候補者）</h4>
          <div className="space-y-1">
            {noDateCandidates.map(c => (
              <div key={c.candidacyId} className="flex items-center gap-2 py-1 text-sm">
                <span className="w-2 h-2 bg-yellow-400 rounded-full shrink-0" />
                <span className="text-gray-800">{c.candidateName}</span>
                <span className="text-xs text-gray-400">（{c.groupName}）</span>
                <span className="ml-auto text-xs text-gray-500">
                  {c.currentStep === 'finalInterview' ? '最終選考' : c.currentStep === 'offered' ? '内定' : '承諾'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
