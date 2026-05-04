'use client'

import { useState, useEffect } from 'react'

export default function PlanTab() {
  const [rows, setRows] = useState<string[][]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

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
        <div className="text-4xl mb-4">📋</div>
        <h3 className="font-semibold text-gray-700 mb-2">Googleスプレッドシート未接続</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">{message}</p>
        <p className="text-xs text-gray-400 mt-4">
          サービスアカウントのJSONキーを<code className="bg-gray-100 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_KEY</code>に設定してください
        </p>
      </div>
    )
  }

  if (rows.length === 0) return <div className="text-center py-20 text-gray-400">データがありません</div>

  const headers = rows[0]
  const body = rows.slice(1)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {headers.map((h, i) => (
                <th key={i} className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className="border-b border-gray-50 hover:bg-gray-50">
                {headers.map((_, ci) => (
                  <td key={ci} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {row[ci] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
