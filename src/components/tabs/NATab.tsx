'use client'

import { useState, useEffect } from 'react'
import { NAItem } from '@/lib/store'

const MEMBERS = ['建部', '大森', '李', '土海', '安部']

export default function NATab() {
  const [items, setItems] = useState<NAItem[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [formatting, setFormatting] = useState(false)
  const [preview, setPreview] = useState<Omit<NAItem, 'id' | 'createdAt'>[] | null>(null)

  const load = () =>
    fetch('/api/na').then(r => r.json()).then(data => { setItems(data); setLoading(false) })

  useEffect(() => { load() }, [])

  const handleFormat = async () => {
    if (!inputText.trim()) return
    setFormatting(true)
    const res = await fetch('/api/ai-format', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: inputText }),
    })
    const data = await res.json()
    setPreview(data.items ?? [])
    setFormatting(false)
  }

  const handleSave = async () => {
    if (!preview) return
    await Promise.all(preview.map(item =>
      fetch('/api/na', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, raw: inputText }),
      })
    ))
    setInputText('')
    setPreview(null)
    load()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/na?id=${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const byMember = MEMBERS.reduce<Record<string, NAItem[]>>((acc, m) => {
    acc[m] = items.filter(i => i.assignee === m)
    return acc
  }, {})

  if (loading) return <div className="text-center py-20 text-gray-400">読み込み中...</div>

  return (
    <div className="space-y-6">
      {/* 入力エリア */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-3">NAを追加</h3>
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder={'例:\nスカウトを100通送信（安部〆切4/10）\nエージェント面談を3件設定（建部〆切4/15）'}
          className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 h-28"
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleFormat}
            disabled={!inputText.trim() || formatting}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-40 hover:bg-blue-700"
          >
            {formatting ? 'AI整形中...' : 'AI整形'}
          </button>
          {preview && (
            <button
              onClick={() => setPreview(null)}
              className="border px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              キャンセル
            </button>
          )}
        </div>

        {/* プレビュー */}
        {preview && (
          <div className="mt-4 border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600">
              整形結果を確認してください
            </div>
            <div className="divide-y">
              {preview.map((item, i) => (
                <div key={i} className={`p-4 ${!item.isValid ? 'bg-red-50' : ''}`}>
                  <div className="flex items-start gap-2">
                    {!item.isValid && (
                      <span className="text-red-500 text-xs bg-red-100 px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                        要修正
                      </span>
                    )}
                    <div className="text-sm space-y-0.5">
                      <div><span className="text-gray-500">担当:</span> <strong>{item.assignee || '未設定'}</strong></div>
                      <div><span className="text-gray-500">内容:</span> {item.action}</div>
                      <div><span className="text-gray-500">量:</span> {item.quantity || '未設定'}</div>
                      <div><span className="text-gray-500">期日:</span> {item.deadline || '未設定'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-gray-50">
              <button
                onClick={handleSave}
                className="w-full bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700"
              >
                登録する
              </button>
            </div>
          </div>
        )}
      </div>

      {/* メンバー別NA一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MEMBERS.map(member => (
          <div key={member} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">
                {member[0]}
              </div>
              <h4 className="font-semibold text-gray-800">{member}</h4>
              <span className="ml-auto text-xs text-gray-400">{byMember[member].length}件</span>
            </div>

            {byMember[member].length === 0 ? (
              <p className="text-gray-400 text-sm">NAなし</p>
            ) : (
              <div className="space-y-2">
                {byMember[member].map(item => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg text-sm border ${
                      !item.isValid ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 flex-1">
                        <p className="font-medium text-gray-800">{item.action}</p>
                        <p className="text-gray-500 text-xs">
                          {item.quantity && `量: ${item.quantity}　`}
                          {item.deadline && `期日: ${item.deadline}`}
                        </p>
                        {!item.isValid && (
                          <p className="text-red-500 text-xs">量・期日・担当のいずれかが不足しています</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-gray-300 hover:text-red-400 text-lg leading-none shrink-0"
                        aria-label="削除"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
