'use client'

import { useState, useEffect, Fragment } from 'react'

const ACCEPT_MONTH_COL = 9
const HIDE_COLS = new Set([0, 6, 11, 14])  // 空列, 求人票, 期中追加, 採用

function parseYearMonth(s: string): number {
  if (!s) return 0
  const m = s.match(/(\d{4})\D+(\d{1,2})/)
  if (!m) return 0
  return Number(m[1]) * 100 + Number(m[2])
}

function ymLabel(ym: number): string {
  const y = Math.floor(ym / 100)
  const m = ym % 100
  return `${y}年${m}月`
}

export default function PlanTab() {
  const [rows, setRows] = useState<string[][]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [showPast, setShowPast] = useState(false)

  useEffect(() => {
    fetch('/api/sheets')
      .then(r => r.json())
      .then(res => {
        setRows(res.rows ?? [])
        setMessage(res.message ?? '')
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="text-center py-20 text-gray-400">読み込み中...</div>

  if (message && rows.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <h3 className="font-semibold text-gray-700 mb-2">スプレッドシート未接続</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">{message}</p>
      </div>
    )
  }

  if (rows.length === 0) return <div className="text-center py-20 text-gray-400">データがありません</div>

  const headers = rows[0]
  const body = rows.slice(1)
  const visibleColIndices = headers.map((_, i) => i).filter(i => !HIDE_COLS.has(i))

  const now = new Date()
  const currentYM = now.getFullYear() * 100 + (now.getMonth() + 1)

  const enriched = body.map((row, originalIndex) => ({
    row,
    originalIndex,
    ym: parseYearMonth(row[ACCEPT_MONTH_COL] ?? ''),
  }))

  const future = enriched.filter(e => e.ym >= currentYM).sort((a, b) => a.ym - b.ym)
  const past   = enriched.filter(e => e.ym > 0 && e.ym < currentYM).sort((a, b) => b.ym - a.ym)
  const undated = enriched.filter(e => e.ym === 0)

  const renderTable = (items: typeof enriched, withMonthDivider: boolean) => {
    let lastYM = -1
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100 sticky top-0">
            {visibleColIndices.map(ci => (
              <th key={ci} className="text-left px-3 py-2 font-semibold text-gray-700 whitespace-nowrap text-xs">
                {headers[ci] || ' '}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(({ row, originalIndex, ym }) => {
            const showDivider = withMonthDivider && ym !== lastYM
            lastYM = ym
            return (
              <Fragment key={originalIndex}>
                {showDivider && (
                  <tr className="bg-blue-50">
                    <td colSpan={visibleColIndices.length} className="px-3 py-1.5 text-xs font-semibold text-blue-700">
                      {ymLabel(ym)}
                    </td>
                  </tr>
                )}
                <tr className="border-b border-gray-50 hover:bg-gray-50">
                  {visibleColIndices.map(ci => (
                    <td key={ci} className="px-3 py-2 text-gray-700 whitespace-nowrap text-xs">
                      {row[ci] ?? ''}
                    </td>
                  ))}
                </tr>
              </Fragment>
            )
          })}
        </tbody>
      </table>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <h3 className="font-semibold text-gray-800">今月以降の採用計画</h3>
          <span className="text-xs text-gray-400">{future.length}件</span>
        </div>
        <div className="overflow-x-auto">
          {future.length > 0 ? renderTable(future, true) : <p className="p-6 text-sm text-gray-400 text-center">該当なし</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setShowPast(!showPast)}
          className="w-full px-4 py-3 border-b border-gray-100 flex items-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <span className="text-gray-500 text-sm">{showPast ? '▲' : '▼'}</span>
          <h3 className="font-semibold text-gray-700">過去の採用計画</h3>
          <span className="text-xs text-gray-400">{past.length}件</span>
        </button>
        {showPast && (
          <div className="overflow-x-auto">
            {past.length > 0 ? renderTable(past, true) : <p className="p-6 text-sm text-gray-400 text-center">該当なし</p>}
          </div>
        )}
      </div>

      {undated.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <h3 className="font-semibold text-gray-700">内定承諾月 未定</h3>
            <span className="text-xs text-gray-400">{undated.length}件</span>
          </div>
          <div className="overflow-x-auto">
            {renderTable(undated, false)}
          </div>
        </div>
      )}
    </div>
  )
}
