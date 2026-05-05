'use client'

import { useState, useEffect } from 'react'
import { NAItem } from '@/lib/store'

const MEMBERS = ['建部', '大森', '李', '土海', '安部']

type DraftRow = {
  assignee: string
  action: string
  deadline: string  // YYYY-MM-DD
}

const emptyRow = (): DraftRow => ({ assignee: '', action: '', deadline: '' })

// YYYY-MM-DD or 自由テキストを表示用に整形
function formatDeadline(s: string): string {
  if (!s) return ''
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${Number(m[2])}/${Number(m[3])}`
  return s
}

// YYYY-MM-DD 形式のときだけ過去判定
function isOverdue(deadline: string): boolean {
  const m = deadline.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!m) return false
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

export default function NATab() {
  const [pending, setPending] = useState<NAItem[]>([])
  const [completed, setCompleted] = useState<NAItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDoneModal, setShowDoneModal] = useState(false)
  const [draft, setDraft] = useState<DraftRow[]>([emptyRow()])
  const [saving, setSaving] = useState(false)

  const loadPending = () =>
    fetch('/api/na?filter=pending').then(r => r.json()).then(data => setPending(data))
  const loadCompleted = () =>
    fetch('/api/na?filter=completed').then(r => r.json()).then(data => setCompleted(data))

  useEffect(() => {
    Promise.all([loadPending(), loadCompleted()]).then(() => setLoading(false))
  }, [])

  const openAdd = () => {
    setDraft([emptyRow()])
    setShowAddModal(true)
  }

  const updateRow = (idx: number, field: keyof DraftRow, value: string) => {
    setDraft(prev => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  const addRow = () => setDraft(prev => [...prev, emptyRow()])
  const removeRow = (idx: number) => setDraft(prev => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    const filled = draft.filter(r => r.assignee || r.action || r.deadline)
    if (filled.length === 0) {
      setShowAddModal(false)
      return
    }
    setSaving(true)
    await Promise.all(filled.map(r =>
      fetch('/api/na', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignee: r.assignee,
          action: r.action,
          quantity: '',
          deadline: r.deadline,
          isValid: Boolean(r.assignee && r.action && r.deadline),
          raw: '',
        }),
      })
    ))
    setSaving(false)
    setShowAddModal(false)
    await Promise.all([loadPending(), loadCompleted()])
  }

  const handleComplete = async (id: string) => {
    // 楽観更新
    setPending(prev => prev.filter(i => i.id !== id))
    await fetch('/api/na', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, completed: true }),
    })
    loadCompleted()
  }

  const handleUncomplete = async (id: string) => {
    setCompleted(prev => prev.filter(i => i.id !== id))
    await fetch('/api/na', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, completed: false }),
    })
    loadPending()
  }

  const handleDelete = async (id: string) => {
    setPending(prev => prev.filter(i => i.id !== id))
    setCompleted(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/na?id=${id}`, { method: 'DELETE' })
  }

  const byMember = MEMBERS.reduce<Record<string, NAItem[]>>((acc, m) => {
    acc[m] = pending.filter(i => i.assignee === m)
    return acc
  }, {})

  if (loading) return <div className="text-center py-20 text-gray-400">読み込み中...</div>

  return (
    <div className="space-y-6">
      {/* 上部ボタン */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-base font-semibold text-gray-800">NA管理</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDoneModal(true)}
            className="border px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            完了済み ({completed.length})
          </button>
          <button
            onClick={openAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + 新しいNAを追加
          </button>
        </div>
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
                {byMember[member].map(item => {
                  const overdue = isOverdue(item.deadline)
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg text-sm border ${
                        !item.isValid ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => handleComplete(item.id)}
                          className="mt-1 w-4 h-4 rounded cursor-pointer"
                          aria-label="完了にする"
                        />
                        <div className="space-y-0.5 flex-1">
                          <p className="font-medium text-gray-800">{item.action || '(施策未入力)'}</p>
                          {item.deadline && (
                            <p className="text-xs">
                              <span className="text-gray-500">期日: </span>
                              <span className={overdue ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                                {formatDeadline(item.deadline)}
                                {overdue && ' (期限超過)'}
                              </span>
                            </p>
                          )}
                          {!item.isValid && (
                            <p className="text-red-500 text-xs">担当・施策・期日のいずれかが不足</p>
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
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">NAをまとめて追加</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                  <div className="col-span-3">担当者</div>
                  <div className="col-span-5">施策</div>
                  <div className="col-span-3">期日</div>
                  <div className="col-span-1"></div>
                </div>
                {draft.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <select
                      value={row.assignee}
                      onChange={e => updateRow(idx, 'assignee', e.target.value)}
                      className="col-span-3 border rounded-lg px-2 py-2 text-sm"
                    >
                      <option value="">選択</option>
                      {MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <input
                      type="text"
                      value={row.action}
                      onChange={e => updateRow(idx, 'action', e.target.value)}
                      placeholder="例: スカウト100通送信"
                      className="col-span-5 border rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      type="date"
                      value={row.deadline}
                      onChange={e => updateRow(idx, 'deadline', e.target.value)}
                      className="col-span-3 border rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => removeRow(idx)}
                      disabled={draft.length === 1}
                      className="col-span-1 text-gray-300 hover:text-red-400 disabled:opacity-30 disabled:hover:text-gray-300"
                      aria-label="行削除"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addRow}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + 行を追加
              </button>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="border px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40"
              >
                {saving ? '保存中...' : 'まとめて登録'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 完了済みモーダル */}
      {showDoneModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">完了済みタスク ({completed.length}件)</h3>
              <button
                onClick={() => setShowDoneModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {completed.length === 0 ? (
                <p className="text-center text-gray-400 py-8">完了済みタスクはありません</p>
              ) : (
                <div className="space-y-2">
                  {completed.map(item => (
                    <div key={item.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50 text-sm">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={true}
                          onChange={() => handleUncomplete(item.id)}
                          className="mt-1 w-4 h-4 rounded cursor-pointer"
                          aria-label="未完了に戻す"
                        />
                        <div className="flex-1 space-y-0.5">
                          <p className="font-medium text-gray-700 line-through">{item.action || '(施策未入力)'}</p>
                          <p className="text-xs text-gray-500">
                            {item.assignee && `担当: ${item.assignee}　`}
                            {item.deadline && `期日: ${formatDeadline(item.deadline)}　`}
                            {item.completedAt && `完了: ${new Date(item.completedAt).toLocaleDateString('ja-JP')}`}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-gray-300 hover:text-red-400 text-lg leading-none"
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
          </div>
        </div>
      )}
    </div>
  )
}
